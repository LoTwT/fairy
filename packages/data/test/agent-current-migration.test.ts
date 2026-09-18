import * as fs from "node:fs/promises"
import { dirname, join } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  generateCurrentDataset,
  migrateCurrentDataset,
  recoverCurrentDataset,
  withCurrentDataset,
} from "../scripts/nanoka-integration/current.ts"
import {
  change,
  createCurrentDatasetHarness,
  currentProtocol,
  integratedSnapshotFormat,
  legacyProtocol,
} from "./fixtures/current-dataset.ts"
import { legacyV2Format } from "./fixtures/synthetic-dataset.ts"

/**
 * 旧格式迁移：稳定 v2 外壳与未完成旧事务的显式迁移边界。
 * 迁移只改写索引外壳与管理记录，实体文件字节、inode 与 mtime 全程保持。
 *
 * 迁移用例会与真实 CLI 子进程交换同一份制品字节，因此保留真实格式化调用，
 * 保证跨进程的字节比较仍然成立。
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
  bytes,
  fingerprints,
  verified,
  clean,
  staticArtifact,
  managedLegacyFixture,
  managedFixture,
  readState,
  child,
  digest,
  writeJson,
  editJson,
} = harness
afterEach(async () => {
  vi.restoreAllMocks()
  await harness.cleanup()
})

describe("migration to the multi-entity shell", () => {
  it("migrates a valid static v2 artifact without changing entity bytes and never implicitly", async () => {
    const input = await staticArtifact(await fixture(), "v2")
    const before = await fingerprints(input.targetDirectory)
    const beforeBytes = await bytes(input.targetDirectory)
    // 生成入口只登记当前格式：v2 制品必须走显式迁移。
    await expect(generateCurrentDataset(input)).rejects.toThrow(
      "MIGRATION_REQUIRED",
    )
    expect(await fingerprints(input.targetDirectory)).toEqual(before)
    await expect(
      fs.stat(join(control(input), "state.json")),
    ).rejects.toMatchObject({ code: "ENOENT" })
    const migrated = await migrateCurrentDataset(input)
    expect(migrated).toMatchObject({
      outcome: "migrated",
      format: integratedSnapshotFormat,
      memberCounts: { agents: 2 },
      entityFileCount: 6,
    })
    const after = await fingerprints(input.targetDirectory)
    for (const path of Object.keys(before).filter(
      (file) => file !== "index.json",
    ))
      expect(after[path]).toEqual(before[path])
    expect(after["index.json"].hash).not.toBe(before["index.json"].hash)
    expect((await bytes(input.targetDirectory))["index.json"]).not.toEqual(
      beforeBytes["index.json"],
    )
    const state = await readState(input)
    expect(state.protocol).toBe(currentProtocol)
    expect(state.phase).toBe("idle")
    expect(state.current.format).toBe(integratedSnapshotFormat)
    expect(state.current.entities).toEqual({
      agents: { rulesVersion: "nanoka-agent-reference/4" },
    })
    expect((await clean(input)).index.entities.agents.memberIds).toEqual([
      "2",
      "10",
    ])
    // 重复执行有明确且安全的结果。
    expect(await migrateCurrentDataset(input)).toMatchObject({
      outcome: "unchanged",
      format: integratedSnapshotFormat,
    })
    expect(await fingerprints(input.targetDirectory)).toEqual(after)
  })

  it("migrates a stable managed v2 dataset after verifying it under its original protocol", async () => {
    const input = await managedLegacyFixture()
    const before = await fingerprints(input.targetDirectory)
    expect(await recoverCurrentDataset(input)).toMatchObject({
      outcome: "unchanged",
      available: true,
      format: legacyV2Format,
    })
    await expect(
      withCurrentDataset(input.targetDirectory, async () => "unexpected"),
    ).rejects.toThrow("MIGRATION_REQUIRED")
    expect(await fingerprints(input.targetDirectory)).toEqual(before)
    expect((await migrateCurrentDataset(input)).outcome).toBe("migrated")
    const after = await fingerprints(input.targetDirectory)
    for (const path of Object.keys(before).filter(
      (file) => file !== "index.json",
    ))
      expect(after[path]).toEqual(before[path])
    const state = await readState(input)
    expect(state.protocol).toBe(currentProtocol)
    expect(state.current.format).toBe(integratedSnapshotFormat)
    await clean(input)
    expect((await recoverCurrentDataset(input)).outcome).toBe("unchanged")
    expect(await fingerprints(input.targetDirectory)).toEqual(after)
  })

  it.each(["empty", "non-empty"] as const)(
    "refuses to migrate a stable managed dataset whose site has an abnormal backup: %s",
    async (residue) => {
      const input = await managedLegacyFixture()
      const backup = join(control(input), "backup")
      await fs.mkdir(backup)
      if (residue === "non-empty")
        await fs.writeFile(join(backup, "unattributed"), "keep")
      const before = await bytes(input.root)
      await expect(migrateCurrentDataset(input)).rejects.toThrow(
        "稳定状态有异常备份，保留现场",
      )
      // 现场全部保留：记录、v2 数据集、异常备份及其中内容都不变，也不新增迁移工作材料。
      expect(await bytes(input.root)).toEqual(before)
      expect((await fs.readdir(control(input))).toSorted()).toEqual(
        ["backup", "lock.sqlite", "state.json"].toSorted(),
      )
      expect((await readState(input)).protocol).toBe(legacyProtocol)
      expect((await readState(input)).phase).toBe("idle")
      expect(await fs.readdir(backup)).toEqual(
        residue === "empty" ? [] : ["unattributed"],
      )
      // 独立恢复对同一现场给出同样的结论：两处共用一份稳定状态判断。
      await expect(recoverCurrentDataset(input)).rejects.toThrow(
        "稳定状态有异常备份，保留现场",
      )
      expect(await bytes(input.root)).toEqual(before)
    },
    30000,
  )

  it.each(["empty", "non-empty"] as const)(
    "never reports the v3 dataset unchanged while its site has an abnormal backup: %s",
    async (residue) => {
      const input = await managedFixture("v3")
      const backup = join(control(input), "backup")
      await fs.mkdir(backup)
      if (residue === "non-empty")
        await fs.writeFile(join(backup, "unattributed"), "keep")
      const before = await bytes(input.root)
      await expect(migrateCurrentDataset(input)).rejects.toThrow(
        "稳定状态有异常备份，保留现场",
      )
      expect(await bytes(input.root)).toEqual(before)
      expect((await readState(input)).phase).toBe("idle")
      // 人工清理异常现场后，幂等迁移与正常读取仍然可用。
      await fs.rm(backup, { recursive: true })
      expect(await migrateCurrentDataset(input)).toMatchObject({
        outcome: "unchanged",
        format: integratedSnapshotFormat,
      })
      expect((await verified(input)).index.format).toBe(
        integratedSnapshotFormat,
      )
      await clean(input)
    },
    30000,
  )

  it.each(["v2", "v3"] as const)(
    "cleans the residual work materials of a stable record before reporting a migration result: %s",
    async (shape) => {
      const input = await managedFixture(shape)
      const before = await bytes(input.targetDirectory)
      await fs.mkdir(join(control(input), "work", "candidate"), {
        recursive: true,
      })
      await fs.writeFile(
        join(control(input), "work", "candidate", "index.json"),
        "partial",
      )
      await fs.writeFile(join(control(input), "state.next"), "partial")
      expect((await migrateCurrentDataset(input)).outcome).toBe(
        shape === "v2" ? "migrated" : "unchanged",
      )
      // 残留工作材料按恢复契约清理，迁移不把待恢复现场报告为成功。
      const names = await fs.readdir(control(input))
      expect(names).not.toContain("work")
      expect(names).not.toContain("state.next")
      const after = await bytes(input.targetDirectory)
      for (const path of Object.keys(before))
        if (path !== "index.json") expect(after[path]).toEqual(before[path])
      await clean(input)
    },
    30000,
  )

  it("requires recovering an unfinished legacy transaction under its original protocol first", async () => {
    const input = await fixture()
    // before：稳定 v2 数据集；after：内容不同的 v2 数据集，已在目标位置。
    const beforeArtifact = join(input.root, "before-artifact")
    await staticArtifact(input, "v2")
    await fs.rename(input.targetDirectory, beforeArtifact)
    await change(input)
    await staticArtifact(input, "v2")
    await fs.mkdir(control(input))
    new DatabaseSync(join(control(input), "lock.sqlite")).close()
    await fs.mkdir(join(control(input), "backup"))
    for (const [from, to] of await Promise.all(
      Object.keys(await bytes(beforeArtifact)).map(
        async (path) =>
          [
            join(beforeArtifact, path),
            join(control(input), "backup", path),
          ] as const,
      ),
    )) {
      await fs.mkdir(dirname(to), { recursive: true })
      await fs.rename(from, to)
    }
    await fs.rm(beforeArtifact, { recursive: true, force: true })
    const beforeIndex = digest(
      await fs.readFile(join(control(input), "backup", "index.json")),
    )
    const afterIndex = digest(
      await fs.readFile(join(input.targetDirectory, "index.json")),
    )
    const descriptor = (indexSha256: string) => ({
      indexSha256,
      rulesVersion: "nanoka-agent-reference/4",
      policy: input.policy,
    })
    await writeJson(join(control(input), "state.json"), {
      protocol: legacyProtocol,
      targetDirectory: input.targetDirectory,
      phase: "prepared",
      before: descriptor(beforeIndex),
      after: descriptor(afterIndex),
    })
    // 未完成的旧事务不能靠迁移覆盖：先按原协议恢复。
    await expect(migrateCurrentDataset(input)).rejects.toThrow(
      "RECOVERY_REQUIRED",
    )
    const recovery = await recoverCurrentDataset(input)
    expect(recovery).toMatchObject({
      outcome: "committed",
      available: true,
      format: legacyV2Format,
    })
    const state = await readState(input)
    expect(state.protocol).toBe(legacyProtocol)
    expect(state.phase).toBe("idle")
    const committed = await fingerprints(input.targetDirectory)
    expect(committed["index.json"].hash).toBe(afterIndex)
    expect(await recoverCurrentDataset(input)).toMatchObject({
      outcome: "unchanged",
      format: legacyV2Format,
    })
    // 恢复稳定后才执行显式迁移。
    expect((await migrateCurrentDataset(input)).outcome).toBe("migrated")
    const after = await fingerprints(input.targetDirectory)
    for (const path of Object.keys(committed).filter(
      (file) => file !== "index.json",
    ))
      expect(after[path]).toEqual(committed[path])
    expect((await readState(input)).protocol).toBe(currentProtocol)
    await clean(input)
  })

  it.each(["damaged", "rules", "languages", "foreign", "unsupported"])(
    "refuses to migrate %s input and preserves the site",
    async (kind) => {
      const input = await managedLegacyFixture(
        kind === "rules" ? { rulesVersion: "nanoka-agent-reference/3" } : {},
      )
      if (kind === "rules")
        await editJson(join(input.targetDirectory, "index.json"), (index) => {
          index.rulesVersion = "nanoka-agent-reference/3"
        })
      if (kind === "damaged")
        await fs.appendFile(
          join(input.targetDirectory, "agents/2/data.json"),
          " ",
        )
      if (kind === "languages") {
        await editJson(join(input.targetDirectory, "index.json"), (index) => {
          index.source.detailLocales = ["en"]
          index.source.inputs = index.source.inputs.filter(
            (entry: { resource: string }) => !entry.resource.includes("/zh/"),
          )
          for (const memberId of Object.keys(index.agents))
            delete index.agents[memberId].files.content.zh
        })
        for (const id of ["2", "10"])
          await fs.rm(
            join(input.targetDirectory, `agents/${id}/details.zh.json`),
          )
        const trimmedIndex = digest(
          await fs.readFile(join(input.targetDirectory, "index.json")),
        )
        await editJson(join(control(input), "state.json"), (state) => {
          state.current.policy.languages = ["en"]
          state.current.indexSha256 = trimmedIndex
        })
      }
      if (kind === "foreign")
        await editJson(join(control(input), "state.json"), (state) => {
          state.targetDirectory = join(input.root, "elsewhere")
        })
      if (kind === "unsupported")
        await editJson(join(input.targetDirectory, "index.json"), (index) => {
          index.format = "fairy-nanoka-integrated/unknown"
        })
      const before = await bytes(input.root)
      await expect(migrateCurrentDataset(input)).rejects.toThrow()
      expect(await bytes(input.root)).toEqual(before)
      expect((await readState(input)).protocol).toBe(legacyProtocol)
    },
  )

  it.each([
    "copied",
    "converted",
    "journal-written",
    "prepared",
    "old-moved",
    "new-installed",
    "idle",
  ] as const)(
    "resumes or repeats migration after SIGKILL at %s",
    async (stage) => {
      const input = await managedLegacyFixture()
      const beforeBytes = await bytes(input.targetDirectory)
      const before = await fingerprints(input.targetDirectory)
      const running = await child(input, { mode: "migrate", pause: stage })
      running.process.kill("SIGKILL")
      expect((await running.done).signal).toBe("SIGKILL")
      const recovered = await child(input, { mode: "recover" })
      const result = await recovered.done
      expect(result, result.stderr).toMatchObject({ code: 0, stderr: "" })
      const committed = [
        "new-installed",
        "report-installed",
        "backup-cleaned",
        "work-cleaned",
        "idle",
      ].includes(stage)
      expect(JSON.parse(result.stdout).format).toBe(
        committed ? integratedSnapshotFormat : legacyV2Format,
      )
      const again = await child(input, { mode: "recover" })
      expect(JSON.parse((await again.done).stdout).outcome).toBe("unchanged")
      if (!committed) {
        // 未提交：原 v2 数据逐字节保留，重跑迁移即可完成。
        expect(await bytes(input.targetDirectory)).toEqual(beforeBytes)
        expect((await migrateCurrentDataset(input)).outcome).toBe("migrated")
      } else {
        expect((await migrateCurrentDataset(input)).outcome).toBe("unchanged")
      }
      const after = await fingerprints(input.targetDirectory)
      for (const path of Object.keys(before).filter(
        (file) => file !== "index.json",
      ))
        expect(after[path]).toEqual(before[path])
      await clean(input)
    },
    30000,
  )

  it("repeats migration after an interrupted rollback of the first attempt", async () => {
    const input = await managedLegacyFixture()
    const before = await bytes(input.targetDirectory)
    const writer = await child(input, { mode: "migrate", pause: "old-moved" })
    writer.process.kill("SIGKILL")
    await writer.done
    const recovery = await child(input, {
      mode: "recover",
      pause: "old-restored",
    })
    recovery.process.kill("SIGKILL")
    await recovery.done
    const again = await child(input, { mode: "recover" })
    expect((await again.done).code).toBe(0)
    expect(await bytes(input.targetDirectory)).toEqual(before)
    // 迁移事务已经写入新协议记录；回滚后是「新协议 + v2 数据集」，仍需显式迁移完成。
    const rolledBack = await readState(input)
    expect(rolledBack.protocol).toBe(currentProtocol)
    expect(rolledBack.current.format).toBe(legacyV2Format)
    expect((await migrateCurrentDataset(input)).outcome).toBe("migrated")
    await clean(input)
  })

  it.each([
    "initialization-partially-written",
    "initialization-written",
    "initialized",
    "copied",
    "converted",
    "journal-written",
    "prepared",
    "old-moved",
    "new-installed",
    "idle",
  ] as const)(
    "recovers or retries a first migration of an unmanaged static v2 artifact after SIGKILL at %s",
    async (stage) => {
      const input = await staticArtifact(await fixture(), "v2")
      const beforeBytes = await bytes(input.targetDirectory)
      const before = await fingerprints(input.targetDirectory)
      const running = await child(input, { mode: "migrate", pause: stage })
      const lockBefore = await fs.stat(join(control(input), "lock.sqlite"), {
        bigint: true,
      })
      running.process.kill("SIGKILL")
      expect((await running.done).signal).toBe("SIGKILL")
      // 首次迁移在登记归属之前被中断：还没有可归属的工作材料，独立恢复按既有边界拒绝接管。
      const unregistered = [
        "initialization-partially-written",
        "initialization-written",
      ].includes(stage)
      if (unregistered) {
        // 归属记录尚未发布；此时只有 state.next 等待重试，数据未被触碰。
        expect(await bytes(input.targetDirectory)).toEqual(beforeBytes)
        await expect(recoverCurrentDataset(input)).rejects.toThrow(
          "未登记的目标目录",
        )
        expect(await bytes(input.targetDirectory)).toEqual(beforeBytes)
        // 重试迁移接受本次记录的完整内容或字节前缀，继续完成。
        expect((await migrateCurrentDataset(input)).outcome).toBe("migrated")
      } else {
        const recovered = await child(input, { mode: "recover" })
        const result = await recovered.done
        expect(result, result.stderr).toMatchObject({ code: 0, stderr: "" })
        const committed = [
          "new-installed",
          "report-installed",
          "backup-cleaned",
          "work-cleaned",
          "idle",
        ].includes(stage)
        expect(JSON.parse(result.stdout).format).toBe(
          committed ? integratedSnapshotFormat : legacyV2Format,
        )
        // 重复恢复有明确结果，不重复清理。
        const again = await child(input, { mode: "recover" })
        expect(JSON.parse((await again.done).stdout).outcome).toBe("unchanged")
        if (committed) {
          expect((await migrateCurrentDataset(input)).outcome).toBe("unchanged")
        } else {
          // 未提交：原 v2 数据逐字节保留，重试迁移即可完成。
          expect(await bytes(input.targetDirectory)).toEqual(beforeBytes)
          expect((await migrateCurrentDataset(input)).outcome).toBe("migrated")
        }
      }
      // 实体文件字节、inode、mtime 全程保持；永久锁身份不变。
      const after = await fingerprints(input.targetDirectory)
      for (const path of Object.keys(before))
        if (path !== "index.json") expect(after[path]).toEqual(before[path])
      expect(
        (await fs.stat(join(control(input), "lock.sqlite"), { bigint: true }))
          .ino,
      ).toBe(lockBefore.ino)
      expect(await bytes(input.targetDirectory)).not.toEqual(beforeBytes)
      await clean(input)
    },
    30000,
  )
})
