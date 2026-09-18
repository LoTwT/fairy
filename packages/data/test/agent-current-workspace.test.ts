import { spawnSync } from "node:child_process"
import * as fs from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  migrateCurrentDataset,
  recoverCurrentDataset,
  updateCurrentDataset,
} from "../scripts/nanoka-integration/current.ts"
import {
  createCurrentDatasetHarness,
  currentProtocol,
  integratedSnapshotFormat,
} from "./fixtures/current-dataset.ts"
import { runDataCli } from "./fixtures/data-cli.ts"

/**
 * 工作区命令：显式 pnpm 脚本、工作区 format/format:check 与受管理数据的隔离。
 * 这些用例走真实 CLI 与真实 oxfmt，保持生产登记表（agents + drive-discs + w-engines）覆盖；
 * 同一份制品字节会在真实 CLI 与工作区命令之间比较，因此保留真实格式化调用。
 */
vi.mock("../scripts/nanoka-integration/format.ts", async (original) => ({
  ...(await original<
    typeof import("../scripts/nanoka-integration/format.ts")
  >()),
}))

const repository = fileURLToPath(new URL("../../..", import.meta.url))
const harness = createCurrentDatasetHarness()
const {
  fixture,
  control,
  bytes,
  fingerprints,
  clean,
  staticArtifact,
  managedLegacyFixture,
  readState,
  digest,
  editJson,
  command,
} = harness
afterEach(async () => {
  vi.restoreAllMocks()
  await harness.cleanup()
})

describe("current workspace commands", () => {
  it("initializes a fresh clone through the generation command without rewriting files", async () => {
    const input = await staticArtifact(await fixture({ production: true }))
    const before = await fingerprints(input.targetDirectory)
    for (let run = 0; run < 2; run++) {
      const result = command("generate:integrated", [
        input.rawRoot,
        input.version,
        input.targetDirectory,
      ])
      expect(result.status, result.stderr).toBe(0)
      expect(JSON.parse(result.stdout)).toMatchObject({
        outcome: "unchanged",
        reusedEntityFiles: 18,
        changedEntityFiles: 0,
      })
      expect(await fingerprints(input.targetDirectory)).toEqual(before)
    }
    await clean(input)
  }, 30000)

  it("formats workspace sources while preserving managed integrated data", async () => {
    const input = await fixture({ production: true })
    const workspace = join(input.root, "workspace")
    input.targetDirectory = join(workspace, "packages/data/integrated")
    await fs.mkdir(dirname(input.targetDirectory), { recursive: true })
    for (const path of ["package.json", "oxfmt.config.ts", ".gitignore"])
      await fs.copyFile(join(repository, path), join(workspace, path))
    await fs.symlink(
      join(repository, "node_modules"),
      join(workspace, "node_modules"),
      "dir",
    )
    function workspaceCommand(name: "format" | "format:check") {
      // 独占测试工作区复用已安装依赖；禁止 pnpm 自动安装或校验依赖快照。
      const result = spawnSync(
        "pnpm",
        ["--config.verifyDepsBeforeRun=false", name],
        {
          cwd: workspace,
          encoding: "utf8",
          timeout: 20000,
        },
      )
      expect(result.error).toBeUndefined()
      expect(result.signal).toBeNull()
      return result
    }
    await updateCurrentDataset(input)
    const original = await clean(input)
    const legacyIndex = structuredClone(original.index)
    // 只在合成 fixture 中构造合法旧排版，并同步实体及控制记录摘要。
    for (const entity of Object.values(legacyIndex.entities))
      for (const memberId of entity.memberIds) {
        const member = entity.members[memberId]
        for (const reference of [
          member.files.data,
          ...Object.values(member.files.details),
        ]) {
          const content = Buffer.from(
            `${JSON.stringify(JSON.parse(original.bytes[reference.path].toString()), null, 4)}\n`,
          )
          await fs.writeFile(
            join(input.targetDirectory, reference.path),
            content,
          )
          reference.sha256 = digest(content)
        }
      }
    const indexBytes = Buffer.from(`${JSON.stringify(legacyIndex, null, 4)}\n`)
    await fs.writeFile(join(input.targetDirectory, "index.json"), indexBytes)
    await editJson(join(control(input), "state.json"), (state) => {
      state.current.indexSha256 = digest(indexBytes)
    })
    await clean(input)
    expect((await recoverCurrentDataset(input)).outcome).toBe("unchanged")

    // 真实 oxfmt 确实会改写此样本；探针副本不属于当前数据集。
    const probe = join(input.root, "legacy-probe.json")
    await fs.writeFile(probe, indexBytes)
    const rewritten = spawnSync(
      process.execPath,
      [
        join(repository, "node_modules/oxfmt/bin/oxfmt"),
        "--write",
        "--config",
        join(repository, "oxfmt.config.ts"),
        probe,
      ],
      { cwd: input.root, encoding: "utf8", timeout: 20000 },
    )
    expect(rewritten.status, rewritten.stderr).toBe(0)
    expect(await fs.readFile(probe)).not.toEqual(indexBytes)
    expect(JSON.parse(await fs.readFile(probe, "utf8"))).toEqual(legacyIndex)

    const sourcePath = join(workspace, "source.ts")
    await fs.writeFile(sourcePath, "export const value={answer:42};")
    const before = await fingerprints(input.targetDirectory)
    const controlBefore = await fingerprints(control(input))
    const formatted = workspaceCommand("format")
    expect(formatted.status, formatted.stderr).toBe(0)
    expect(await fs.readFile(sourcePath, "utf8")).toBe(
      "export const value = { answer: 42 }\n",
    )
    expect(await fingerprints(input.targetDirectory)).toEqual(before)
    expect(await fingerprints(control(input))).toEqual(controlBefore)
    await clean(input)
    expect((await recoverCurrentDataset(input)).outcome).toBe("unchanged")
    expect(await fingerprints(input.targetDirectory)).toEqual(before)
    const checked = workspaceCommand("format:check")
    expect(checked.status).toBe(1)
    expect(checked.stdout + checked.stderr).toContain(
      "packages/data/integrated/",
    )

    expect((await updateCurrentDataset(input)).outcome).toBe("committed")
    expect((await clean(input)).bytes).toEqual(original.bytes)
    const rechecked = workspaceCommand("format:check")
    expect(rechecked.status, rechecked.stdout + rechecked.stderr).toBe(0)
    expect((await recoverCurrentDataset(input)).outcome).toBe("unchanged")
  }, 30000)

  it("generates, updates, verifies, recovers and migrates through explicit pnpm scripts", async () => {
    const input = await fixture({ production: true })
    const args = [input.rawRoot, input.version, input.targetDirectory]
    for (const expected of ["committed", "unchanged"]) {
      const result = command("generate:integrated", args)
      expect(result, result.stderr).toMatchObject({ status: 0, stderr: "" })
      expect(JSON.parse(result.stdout).outcome).toBe(expected)
    }
    const verify = command("verify:nanoka:current", [input.targetDirectory])
    expect(verify.status, verify.stderr).toBe(0)
    expect(JSON.parse(verify.stdout)).toMatchObject({
      verified: true,
      format: integratedSnapshotFormat,
      categories: { agents: { memberCount: 2, detailLocales: ["zh", "en"] } },
    })
    const recover = command("recover:nanoka:current", [input.targetDirectory])
    expect(recover.status, recover.stderr).toBe(0)
    expect(JSON.parse(recover.stdout).outcome).toBe("unchanged")
    const migrate = command("migrate:nanoka:current", [input.targetDirectory])
    expect(migrate.status, migrate.stderr).toBe(0)
    expect(JSON.parse(migrate.stdout)).toMatchObject({
      outcome: "unchanged",
      format: integratedSnapshotFormat,
    })
    const snapshot = command("verify:nanoka:snapshot", [input.targetDirectory])
    expect(snapshot.status, snapshot.stderr).toBe(0)
    expect(JSON.parse(snapshot.stdout).verified).toBe(true)
    await clean(input)
  }, 30000)

  it("keeps read-only snapshot verification away from the managed record", async () => {
    const input = await managedLegacyFixture({ production: true })
    const before = await fingerprints(input.root)
    const legacy = command("verify:nanoka:snapshot", [input.targetDirectory])
    expect(legacy.status).toBe(1)
    expect(legacy.stdout).toBe("")
    expect(legacy.stderr).toContain("格式版本错误")
    expect(await fingerprints(input.root)).toEqual(before)
    // 显式生成入口按当前规则整库重建，不是只读路径：实体字节不变，记录切到新协议。
    const entityBytes = await bytes(input.targetDirectory)
    const generated = command("generate:integrated", [
      input.rawRoot,
      input.version,
      input.targetDirectory,
    ])
    expect(generated.status, generated.stderr).toBe(0)
    expect(JSON.parse(generated.stdout)).toMatchObject({
      outcome: "committed",
      format: integratedSnapshotFormat,
    })
    const state = await readState(input)
    expect(state.protocol).toBe(currentProtocol)
    expect(state.current.format).toBe(integratedSnapshotFormat)
    expect((await migrateCurrentDataset(input)).outcome).toBe("unchanged")
    const after = await bytes(input.targetDirectory)
    for (const path of Object.keys(entityBytes))
      if (path !== "index.json") expect(after[path]).toEqual(entityBytes[path])
    await clean(input)
  }, 30000)

  it.each([
    "generate:integrated",
    "verify:nanoka:current",
    "recover:nanoka:current",
    "migrate:nanoka:current",
    "verify:nanoka:snapshot",
  ] as const)(
    "%s supports help and rejects invalid arguments before any input access",
    (name) => {
      // 帮助与参数校验直接执行同一 Node 入口：这些用例只断言脚本自身的退出码与输出，
      // 包脚本映射与 pnpm 调用由本文件其他用例覆盖。
      for (const help of ["-h", "--help"]) {
        const result = runDataCli(name, [help])
        expect(result).toMatchObject({ status: 0, stderr: "" })
        expect(result.stdout).toContain(`用法：${name}`)
      }
      for (const args of [
        [],
        [""],
        ["--unknown"],
        ["--help", "x"],
        ["a", "b", "c", "d"],
      ]) {
        const result = runDataCli(name, args)
        expect(result).toMatchObject({ status: 1, stdout: "" })
        expect(result.stderr).toContain(`用法：${name}`)
        expect(result.stderr).not.toContain("ENOENT")
        expect(result.stderr).not.toContain("    at ")
      }
    },
    30000,
  )
})
