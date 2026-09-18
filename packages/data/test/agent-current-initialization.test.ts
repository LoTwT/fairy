import * as fs from "node:fs/promises"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { afterEach, describe, expect, it, vi } from "vitest"
import { buildIntegratedSnapshot } from "../scripts/nanoka-integration/snapshot-build.ts"
import { nanokaAgentsSnapshotEntity } from "../scripts/nanoka-integration/snapshot-entities.ts"
import {
  generateCurrentDataset,
  migrateCurrentDataset,
  recoverCurrentDataset,
} from "../scripts/nanoka-integration/current.ts"
import {
  change,
  createCurrentDatasetHarness,
} from "./fixtures/current-dataset.ts"

/**
 * 显式生成初始化：已有完整制品的登记边界、损坏现场保留与 SIGKILL 后的重试。
 * 初始化与显式生成入口始终使用生产登记表（agents + drive-discs + w-engines），保留真实类别接入覆盖。
 *
 * 初始化用例会与真实 CLI 子进程交换同一份制品字节，因此保留真实格式化调用，
 * 保证跨进程的“未变更/复用”判定仍然成立。
 */
vi.mock("../scripts/nanoka-integration/format.ts", async (original) => ({
  ...(await original<
    typeof import("../scripts/nanoka-integration/format.ts")
  >()),
}))

const harness = createCurrentDatasetHarness()
const {
  fixture,
  control,
  fingerprints,
  verified,
  clean,
  staticArtifact,
  child,
  command,
  writeJson,
  editJson,
} = harness
afterEach(async () => {
  vi.restoreAllMocks()
  await harness.cleanup()
})

describe("explicit generation initialization", () => {
  it("refuses an unregistered agents-only v3 dataset after the registry gains a category", async () => {
    const input = await fixture({ production: true })
    // 用 agents-only 登记构建合法制品并放到目标位置，不带本机管理记录（模拟登记表演进前的旧克隆）。
    const build = await buildIntegratedSnapshot({
      rawRoot: input.rawRoot,
      version: input.version,
      temporaryParent: input.root,
      entities: [nanokaAgentsSnapshotEntity],
    })
    await fs.rename(build.artifactDirectory, input.targetDirectory)
    await fs.rm(build.buildDirectory, { recursive: true })
    const before = await fingerprints(input.targetDirectory)
    // 初始化与迁移都不放宽：登记表演进后，缺 drive-discs 类别的静态 v3 制品明确拒绝且保留现场。
    await expect(generateCurrentDataset(input)).rejects.toThrow(
      "类别集合与本次期望的已接入类别不一致",
    )
    await expect(migrateCurrentDataset(input)).rejects.toThrow(
      "类别集合与本次期望的已接入类别不一致",
    )
    expect(await fingerprints(input.targetDirectory)).toEqual(before)
    // 按协议删除旧制品后重新生成：从 raw 完整重建当前七类别数据集。
    await fs.rm(input.targetDirectory, { recursive: true })
    expect((await generateCurrentDataset(input)).outcome).toBe("committed")
    const index = (await clean(input)).index
    expect(Object.keys(index.entities).toSorted()).toEqual([
      "agents",
      "bangboos",
      "boss",
      "drive-discs",
      "monsters",
      "shiyu",
      "w-engines",
    ])
  }, 30000)

  it.each([
    "format",
    "rules",
    "members",
    "languages",
    "digest",
    "missing",
    "extra",
    "empty-directory",
    "symlink",
  ])(
    "rejects invalid clone %s and preserves existing files",
    async (damage) => {
      const input = await staticArtifact(await fixture({ production: true }))
      const indexPath = join(input.targetDirectory, "index.json")
      if (damage === "format")
        await editJson(indexPath, (index) => {
          index.format = "unknown"
        })
      if (damage === "rules")
        await editJson(indexPath, (index) => {
          index.entities.agents.rulesVersion = "nanoka-agent-reference/999"
        })
      if (damage === "members")
        await editJson(indexPath, (index) => {
          index.entities.agents.memberIds = ["2"]
        })
      if (damage === "languages")
        await editJson(indexPath, (index) => {
          index.entities.agents.detailLocales = ["en"]
        })
      if (damage === "digest")
        await fs.appendFile(
          join(input.targetDirectory, "agents/2/data.json"),
          " ",
        )
      if (damage === "missing")
        await fs.rm(join(input.targetDirectory, "agents/2/details.en.json"))
      if (damage === "extra")
        await fs.writeFile(join(input.targetDirectory, "extra.json"), "{}")
      if (damage === "empty-directory")
        await fs.mkdir(join(input.targetDirectory, "extra"))
      if (damage === "symlink") {
        await fs.rename(
          join(input.targetDirectory, "agents/2/data.json"),
          join(input.root, "external.json"),
        )
        await fs.symlink(
          join(input.root, "external.json"),
          join(input.targetDirectory, "agents/2/data.json"),
        )
      }
      const before = await fingerprints(input.targetDirectory)
      const names = await fs.readdir(input.targetDirectory, { recursive: true })
      const result = command("generate:integrated", [
        input.rawRoot,
        input.version,
        input.targetDirectory,
      ])
      expect(result.status, result.stderr).toBe(1)
      expect(result.stdout).toBe("")
      expect(result.stderr).toContain("失败")
      expect(await fingerprints(input.targetDirectory)).toEqual(before)
      expect(
        await fs.readdir(input.targetDirectory, { recursive: true }),
      ).toEqual(names)
      await expect(
        fs.stat(join(control(input), "state.json")),
      ).rejects.toMatchObject({ code: "ENOENT" })
    },
    20000,
  )

  it.each([
    "damaged-record",
    "index-mismatch",
    "missing-lock",
    "orphan-work",
    "orphan-backup",
    "orphan-report",
    "orphan-prepared",
    "damaged-initial-record",
  ])(
    "does not reset an existing management failure: %s",
    async (damage) => {
      const input = await staticArtifact(await fixture({ production: true }))
      if (
        ["damaged-record", "index-mismatch", "missing-lock"].includes(damage)
      ) {
        await generateCurrentDataset(input)
        if (damage === "damaged-record")
          await fs.writeFile(join(control(input), "state.json"), "{broken")
        if (damage === "index-mismatch")
          await fs.appendFile(join(input.targetDirectory, "index.json"), " ")
        if (damage === "missing-lock")
          await fs.rm(join(control(input), "lock.sqlite"))
      } else {
        await fs.mkdir(control(input))
        const db = new DatabaseSync(join(control(input), "lock.sqlite"))
        db.close()
        if (damage === "orphan-work")
          await fs.mkdir(join(control(input), "work"))
        if (damage === "orphan-backup")
          await fs.mkdir(join(control(input), "backup"))
        if (damage === "orphan-report")
          await fs.writeFile(join(control(input), "maintenance.json"), "{}")
        if (damage === "orphan-prepared")
          await writeJson(join(control(input), "state.next"), {
            phase: "prepared",
          })
        if (damage === "damaged-initial-record")
          await fs.writeFile(join(control(input), "state.next"), "{broken")
      }
      const before = await fingerprints(input.root)
      const names = await fs.readdir(input.root, { recursive: true })
      const result = command("generate:integrated", [
        input.rawRoot,
        input.version,
        input.targetDirectory,
      ])
      expect(result.status, result.stderr).toBe(1)
      expect(result.stdout).toBe("")
      expect(await fingerprints(input.root)).toEqual(before)
      expect(await fs.readdir(input.root, { recursive: true })).toEqual(names)
    },
    20000,
  )

  it.each([
    "locked",
    "initialization-partially-written",
    "initialization-written",
    "initialized",
  ])(
    "retries initialization after SIGKILL at %s using the same permanent lock",
    async (pause) => {
      const input = await staticArtifact(await fixture({ production: true }))
      const before = await fingerprints(input.targetDirectory)
      const writer = await child(input, { mode: "generate", pause })
      const lockBefore = await fs.stat(join(control(input), "lock.sqlite"), {
        bigint: true,
      })
      for (const operation of [
        () => generateCurrentDataset(input),
        () => recoverCurrentDataset(input),
        () => verified(input),
      ])
        await expect(operation()).rejects.toThrow("BUSY")
      writer.process.kill("SIGKILL")
      expect((await writer.done).signal).toBe("SIGKILL")
      expect(await fingerprints(input.targetDirectory)).toEqual(before)
      if (pause !== "initialized") {
        await expect(recoverCurrentDataset(input)).rejects.toThrow(
          "未登记的目标目录",
        )
        await expect(verified(input)).rejects.toThrow("RECOVERY_REQUIRED")
      } else {
        expect((await recoverCurrentDataset(input)).available).toBe(true)
      }
      const retry = await child(input, { mode: "generate" })
      const result = await retry.done
      expect(result.code, result.stderr).toBe(0)
      expect(JSON.parse(result.stdout).outcome).toBe("unchanged")
      expect(await fingerprints(input.targetDirectory)).toEqual(before)
      expect(
        (await fs.stat(join(control(input), "lock.sqlite"), { bigint: true }))
          .ino,
      ).toBe(lockBefore.ino)
      await clean(input)
      expect((await recoverCurrentDataset(input)).outcome).toBe("unchanged")
    },
    20000,
  )

  it("initializes existing bytes before a changed-input update and recovers a prepared transaction", async () => {
    const input = await staticArtifact(await fixture({ production: true }))
    const before = await fingerprints(input.targetDirectory)
    await change(input)
    const writer = await child(input, { mode: "generate", pause: "prepared" })
    writer.process.kill("SIGKILL")
    await writer.done
    expect((await recoverCurrentDataset(input)).outcome).toBe("rolled-back")
    expect(await fingerprints(input.targetDirectory)).toEqual(before)
    const result = await generateCurrentDataset(input)
    expect(result).toMatchObject({
      outcome: "committed",
      changedEntityFiles: 1,
      reusedEntityFiles: 41,
    })
    await clean(input)
  }, 20000)
})
