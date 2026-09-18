import * as fs from "node:fs/promises"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  generateCurrentDataset,
  migrateCurrentDataset,
  recoverCurrentDataset,
  updateCurrentDataset,
  withCurrentDataset,
} from "../scripts/nanoka-integration/current.ts"
import type { CurrentCheckpoint } from "../scripts/nanoka-integration/current.ts"
import * as formatting from "../scripts/nanoka-integration/format.ts"
import { buildIntegratedSnapshot } from "../scripts/nanoka-integration/snapshot-build.ts"
import { onboardedSnapshotEntities } from "../scripts/nanoka-integration/snapshot-entities.ts"
import {
  change,
  createCurrentDatasetHarness,
  integratedSnapshotFormat,
} from "./fixtures/current-dataset.ts"
import { writeSyntheticRaw } from "./fixtures/synthetic-dataset.ts"

/**
 * 常规更新与数据集验证：生成、更新、复验、硬链接复用、报告上限与损坏现场。
 * 通用协议用例使用最小合成类别集合（agents + widgets）；生产登记表
 * （agents + drive-discs）的协议覆盖保留在整库生命周期用例与 CLI、发布链路中。
 *
 * 本文件保留真实 oxfmt 覆盖：候选在硬链接复用前格式化，实际格式化失败不得破坏当前数据。
 */
vi.mock("node:fs/promises", async (original) => ({
  ...(await original<typeof import("node:fs/promises")>()),
}))
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
  child,
  digest,
  editJson,
  writeJson,
  restrictToEnglish,
  command,
} = harness
afterEach(async () => {
  vi.restoreAllMocks()
  await harness.cleanup()
})

/** 放大来源记录与详情，用于报告与预算上限用例；返回超过上限的字节数。 */
async function reportHeavySource(input: Awaited<ReturnType<typeof fixture>>) {
  for (const locale of input.policy.languages)
    await editJson(
      join(input.rawRoot, input.version, locale, "character/2.json"),
      (value) => {
        const skill = value.skill["g/~"]
        delete value.skill["g/~"]
        value.skill[`longkey${"X".repeat(2000)}`] = skill
        for (let i = 0; i < 1000; i++) skill.description[0][`future${i}`] = 0
      },
    )
  return (
    Object.values(await bytes(input.rawRoot)).reduce(
      (total, content) => total + content.length,
      0,
    ) + 1
  )
}

describe("current multi-entity dataset", () => {
  it.each(["generate", "update", "recover", "migrate", "read"] as const)(
    "rejects SQLite sidecars before opening the database and preserves the external hardlink: %s",
    async (mode) => {
      const input = await fixture()
      await fs.mkdir(control(input), { recursive: true })
      const database = new DatabaseSync(join(control(input), "lock.sqlite"))
      try {
        database.exec(
          "PRAGMA journal_mode=WAL; CREATE TABLE probe (value INTEGER)",
        )
      } finally {
        database.close()
      }
      const external = join(input.root, "external.json")
      const original = Buffer.from(`${" ".repeat(65534)}{}`)
      await fs.writeFile(external, original)
      await fs.link(external, join(control(input), "lock.sqlite-shm"))
      const before = await fingerprints(control(input))
      const externalBefore = await fs.stat(external, { bigint: true })
      const operation =
        mode === "generate"
          ? generateCurrentDataset(input)
          : mode === "update"
            ? updateCurrentDataset(input)
            : mode === "recover"
              ? recoverCurrentDataset(input)
              : mode === "migrate"
                ? migrateCurrentDataset(input)
                : withCurrentDataset(
                    input.targetDirectory,
                    async () => "unexpected read",
                  )
      await expect(operation).rejects.toThrow(
        /INVALID_STATE.*未登记成员.*lock.sqlite-shm/,
      )
      const after = await fs.readFile(external)
      expect(after.equals(original)).toBe(true)
      expect(after.length).toBe(65536)
      expect(digest(after)).toBe(digest(original))
      expect(await fs.stat(external, { bigint: true })).toMatchObject({
        size: externalBefore.size,
        ino: externalBefore.ino,
        dev: externalBefore.dev,
        mtimeNs: externalBefore.mtimeNs,
        nlink: externalBefore.nlink,
      })
      expect(await fingerprints(control(input))).toEqual(before)
      await expect(fs.lstat(input.targetDirectory)).rejects.toMatchObject({
        code: "ENOENT",
      })
    },
  )

  it("uses the saved budget for old files when the new dataset lowers its budget", async () => {
    const input = await fixture()
    for (const locale of input.policy.languages)
      await editJson(
        join(input.rawRoot, input.version, locale, "character/2.json"),
        (value) => {
          value.name = "x".repeat(200000)
        },
      )
    await updateCurrentDataset(input)
    await writeSyntheticRaw({
      rawRoot: input.rawRoot,
      version: input.version,
      agentIds: ["2", "10"],
      widgetIds: ["3", "7"],
    })
    input.policy.requestPolicy.maximumResponseBytes = 5000
    const limit =
      input.policy.requestPolicy.maximumResponseBytes *
      (await import("../scripts/nanoka-integration/artifact-files.ts"))
        .outputExpansionLimit
    expect(
      (await fs.stat(join(input.targetDirectory, "agents/2/details.zh.json")))
        .size,
    ).toBeGreaterThan(limit)
    const candidate = await buildIntegratedSnapshot({
      ...input,
      temporaryParent: input.root,
    })
    expect(
      (
        await fs.stat(
          join(candidate.artifactDirectory, "agents/2/details.zh.json"),
        )
      ).size,
    ).toBeLessThan(limit)
    expect((await updateCurrentDataset(input)).outcome).toBe("committed")
    expect((await clean(input)).bytes).toEqual(
      await bytes(candidate.artifactDirectory),
    )
  })

  it.each([true, false])(
    "rejects an oversized report before commit, first=%s",
    async (initial) => {
      const input = await fixture()
      if (!initial) await updateCurrentDataset(input)
      const before = initial
        ? undefined
        : await fingerprints(input.targetDirectory)
      input.policy.fetchLimits.maximumBytesPerRun =
        await reportHeavySource(input)
      const candidate = await buildIntegratedSnapshot({
        ...input,
        temporaryParent: input.root,
      })
      expect(
        (await fs.stat(candidate.maintenanceReportPath)).size,
      ).toBeGreaterThan(
        input.policy.fetchLimits.maximumBytesPerRun *
          (await import("../scripts/nanoka-integration/artifact-files.ts"))
            .outputExpansionLimit,
      )
      const stages: CurrentCheckpoint[] = []
      await expect(
        updateCurrentDataset({
          ...input,
          checkpoint: (stage) => {
            stages.push(stage)
          },
        }),
      ).rejects.toThrow(/maintenance.json.*字节数超过上限/)
      expect(stages).toContain("building")
      expect(stages).not.toContain("prepared")
      for (let i = 0; i < 2; i++)
        expect(await recoverCurrentDataset(input)).toMatchObject({
          outcome: "unchanged",
          available: !initial,
        })
      if (initial)
        await expect(fs.lstat(input.targetDirectory)).rejects.toMatchObject({
          code: "ENOENT",
        })
      else {
        expect(await fingerprints(input.targetDirectory)).toEqual(before)
        await clean(input)
      }
    },
  )

  it("recovers a legacy committed oversized report after process termination", async () => {
    const input = await fixture()
    const legacyBudget = await reportHeavySource(input)
    const writer = await child(input, { pause: "new-installed" })
    writer.process.kill("SIGKILL")
    expect((await writer.done).signal).toBe("SIGKILL")
    // Emulate the saved descriptor from the older updater, which committed before checking report size.
    await editJson(join(control(input), "state.json"), (state) => {
      state.after.policy.fetchLimits.maximumBytesPerRun = legacyBudget
    })
    const pending = await fs.readFile(
      join(control(input), "work/maintenance.json"),
    )
    expect(pending.length).toBeGreaterThan(
      legacyBudget *
        (await import("../scripts/nanoka-integration/artifact-files.ts"))
          .outputExpansionLimit,
    )
    const before = await fingerprints(input.targetDirectory)
    const recovery = await child(input, { mode: "recover" })
    expect(await recovery.done).toMatchObject({ code: 0 })
    expect(await recoverCurrentDataset(input)).toMatchObject({
      outcome: "unchanged",
      available: true,
      format: integratedSnapshotFormat,
    })
    expect(
      (await fs.readFile(join(control(input), "maintenance.json"))).equals(
        pending,
      ),
    ).toBe(true)
    expect(await fingerprints(input.targetDirectory)).toEqual(before)
    await clean(input)
  })

  it("creates a complete dataset, repeats without writes to current files, and preserves every inode and mtime", async () => {
    // 生产登记表的整库生命周期覆盖：两类别、12 个实体文件与真实 oxfmt 批次都按原语义验证。
    const input = await fixture({ production: true })
    const raw = await bytes(input.rawRoot)
    const first = await updateCurrentDataset(input)
    expect(first.outcome).toBe("committed")
    expect(first).toMatchObject({
      format: integratedSnapshotFormat,
      memberCounts: { "agents": 2, "drive-discs": 2 },
      entityFileCount: 12,
    })
    const before = await fingerprints(input.targetDirectory)
    const writes = vi.spyOn(fs, "writeFile")
    const format = formatting.formatGeneratedJson
    const formatted = vi
      .spyOn(formatting, "formatGeneratedJson")
      .mockImplementation(async (root, paths) => {
        expect(root.startsWith(`${control(input)}/work/`)).toBe(true)
        for (const path of paths)
          expect((await fs.stat(join(root, path))).nlink).toBe(1)
        await format(root, paths)
      })
    const second = await updateCurrentDataset(input)
    expect(second.outcome).toBe("unchanged")
    expect(second.reusedEntityFiles).toBe(Object.keys(before).length - 1)
    expect(second.changedEntityFiles).toBe(0)
    // 两个类别的成员文件各自成批，索引单独一批。
    expect(formatted).toHaveBeenCalledTimes(3)
    expect(await fingerprints(input.targetDirectory)).toEqual(before)
    expect(
      writes.mock.calls.filter(([path]) =>
        String(path).startsWith(`${input.targetDirectory}/`),
      ),
    ).toEqual([])
    expect(
      writes.mock.calls.filter(
        ([path]) =>
          String(path).startsWith(`${control(input)}/work/`) &&
          String(path).includes("/integrated/agents/"),
      ),
    ).toHaveLength(6)
    expect(await bytes(input.rawRoot)).toEqual(raw)
    await clean(input)
  })

  it.each(["entities", "index"])(
    "preserves current data and recovers after actual oxfmt failure on %s",
    async (stage) => {
      const input = await fixture()
      await updateCurrentDataset(input)
      const before = await fingerprints(input.targetDirectory)
      const rawBefore = await fingerprints(input.rawRoot)
      const stateBefore = await fs.readFile(join(control(input), "state.json"))
      const format = formatting.formatGeneratedJson
      const formatted = vi
        .spyOn(formatting, "formatGeneratedJson")
        .mockImplementation(async (root, paths) => {
          if ((stage === "index") === paths.includes("index.json"))
            await fs.writeFile(join(root, paths[0]), "{ invalid JSON")
          await format(root, paths)
        })
      const links = vi.spyOn(fs, "link")
      await expect(updateCurrentDataset(input)).rejects.toThrow(/oxfmt/)
      // 实体阶段首个类别批次即失败，后续批次不再执行；索引批次前有两个类别的成员批次。
      expect(formatted).toHaveBeenCalledTimes(stage === "index" ? 3 : 1)
      expect(links).not.toHaveBeenCalled()
      expect(await fingerprints(input.targetDirectory)).toEqual(before)
      expect(await fingerprints(input.rawRoot)).toEqual(rawBefore)
      expect(await fs.readFile(join(control(input), "state.json"))).toEqual(
        stateBefore,
      )
      await clean(input)
      formatted.mockRestore()
      expect((await recoverCurrentDataset(input)).outcome).toBe("unchanged")
      expect((await updateCurrentDataset(input)).outcome).toBe("unchanged")
      expect(await fingerprints(input.targetDirectory)).toEqual(before)
    },
  )

  it("adds, changes and legally removes members while reusing unchanged current inodes", async () => {
    const input = await fixture()
    await updateCurrentDataset(input)
    const before = await fingerprints(input.targetDirectory)
    await writeSyntheticRaw({
      rawRoot: input.rawRoot,
      version: input.version,
      agentIds: ["2", "10", "30"],
      widgetIds: ["3", "7"],
    })
    await change(input)
    const added = await updateCurrentDataset(input)
    expect(added.changedEntityFiles).toBe(4)
    const after = await fingerprints(input.targetDirectory)
    for (const path of Object.keys(before).filter(
      (file) => file !== "index.json" && file !== "agents/2/details.zh.json",
    ))
      expect(after[path]).toEqual(before[path])
    expect(after["agents/2/details.zh.json"].ino).not.toBe(
      before["agents/2/details.zh.json"].ino,
    )
    await editJson(
      join(input.rawRoot, input.version, "character.json"),
      (value) => {
        delete value["10"]
      },
    )
    const removed = await updateCurrentDataset(input)
    expect(removed.removedEntityFiles).toBe(3)
    expect((await clean(input)).index.entities.agents.memberIds).toEqual([
      "2",
      "30",
    ])
  })

  it("keeps both registered categories when only one changes and never drops a category", async () => {
    const input = await fixture({ widgetIds: ["3", "7"] })
    const first = await updateCurrentDataset(input)
    expect(first).toMatchObject({
      outcome: "committed",
      memberCounts: { agents: 2, widgets: 2 },
      entityFileCount: 12,
    })
    const before = await fingerprints(input.targetDirectory)
    // 只改一个合成类别的来源记录：另一个类别必须原样复用，且在索引中仍然完整。
    await editJson(
      join(input.rawRoot, input.version, "equipment.json"),
      (value) => {
        value["3"].label = "changed"
      },
    )
    const changed = await updateCurrentDataset(input)
    expect(changed).toMatchObject({
      outcome: "committed",
      memberCounts: { agents: 2, widgets: 2 },
      changedEntityFiles: 1,
      reusedEntityFiles: 11,
    })
    const after = await fingerprints(input.targetDirectory)
    for (const path of Object.keys(before).filter(
      (file) => file !== "index.json" && file !== "widgets/3/data.json",
    ))
      expect(after[path]).toEqual(before[path])
    let index = (await clean(input)).index
    expect(index.entities.agents.memberIds).toEqual(["2", "10"])
    expect(index.entities.widgets.memberIds).toEqual(["3", "7"])
    // 合法移除一个类别的成员：完整来源索引决定成员集合。
    await writeSyntheticRaw({
      rawRoot: input.rawRoot,
      version: input.version,
      agentIds: ["2", "10"],
      widgetIds: ["3"],
    })
    const removed = await updateCurrentDataset(input)
    expect(removed.removedEntityFiles).toBe(3)
    index = (await clean(input)).index
    expect(index.entities.widgets.memberIds).toEqual(["3"])
    expect(index.entities.agents.memberIds).toEqual(["2", "10"])
    // 缺失输入不是删除：候选失败，整库（含两个类别）保持可用。
    await fs.rm(join(input.rawRoot, input.version, "en/equipment/3.json"))
    const intact = await bytes(input.targetDirectory)
    await expect(updateCurrentDataset(input)).rejects.toThrow("UPDATE_FAILED")
    expect(await bytes(input.targetDirectory)).toEqual(intact)
    index = (await clean(input)).index
    expect(Object.keys(index.entities)).toEqual(["agents", "widgets"])
  })

  it("records source byte and source record changes without rewriting equal entity output", async () => {
    const input = await fixture()
    await updateCurrentDataset(input)
    const before = await fingerprints(input.targetDirectory)
    const oldIndex = (await verified(input)).index
    const detailPath = join(input.rawRoot, input.version, "en/character/2.json")
    await fs.appendFile(detailPath, "\n  ")
    await editJson(
      join(input.rawRoot, input.version, "character.json"),
      (value) => {
        value["2"].new_key = [0, ""]
      },
    )
    const result = await updateCurrentDataset(input)
    expect(result.outcome).toBe("committed")
    expect(result.changedEntityFiles).toBe(0)
    const after = await fingerprints(input.targetDirectory)
    for (const path of Object.keys(before).filter(
      (file) => file !== "index.json",
    ))
      expect(after[path]).toEqual(before[path])
    const { index } = await clean(input)
    expect(index.entities.agents.inputs).not.toEqual(
      oldIndex.entities.agents.inputs,
    )
    expect(index.source.inputs).toEqual(oldIndex.source.inputs)
    expect(index.entities.agents.members["2"].sourceRecord.new_key).toEqual([
      0,
      "",
    ])
  })

  it("switches full source version and configuration order, while rejecting an incomplete language policy", async () => {
    const input = await fixture()
    await updateCurrentDataset(input)
    await writeSyntheticRaw({
      rawRoot: input.rawRoot,
      version: "synthetic-2",
      agentIds: ["2", "10"],
      widgetIds: ["3", "7"],
    })
    input.version = "synthetic-2"
    expect((await updateCurrentDataset(input)).changedEntityFiles).toBe(0)
    expect((await clean(input)).index.source.version).toBe(input.version)
    input.policy.languages.reverse()
    await updateCurrentDataset(input)
    expect((await clean(input)).index.entities.agents.detailLocales).toEqual(
      input.policy.languages,
    )
    const beforeInvalidPolicy = await verified(input)
    input.policy.languages = ["en"]
    await expect(updateCurrentDataset(input)).rejects.toThrow("来源配置无效")
    expect(await verified(input)).toEqual(beforeInvalidPolicy)
    await clean(input)
  })

  it("verifies a recorded historical category rule but rebuilds candidates with current rules", async () => {
    const input = await fixture()
    await updateCurrentDataset(input)
    const original = await bytes(input.targetDirectory)
    // 历史契约：索引与记录同时登记旧规则版本，构成一份完整旧快照。
    await editJson(join(input.targetDirectory, "index.json"), (index) => {
      index.entities.agents.rulesVersion = "nanoka-agent-reference/3"
    })
    const hash = digest(
      await fs.readFile(join(input.targetDirectory, "index.json")),
    )
    await editJson(join(control(input), "state.json"), (state) => {
      state.current.entities.agents.rulesVersion = "nanoka-agent-reference/3"
      state.current.indexSha256 = hash
    })
    expect(await recoverCurrentDataset(input)).toMatchObject({
      outcome: "unchanged",
      available: true,
      format: integratedSnapshotFormat,
    })
    expect((await verified(input)).index.entities.agents.rulesVersion).toBe(
      "nanoka-agent-reference/3",
    )
    // 旧快照只用于复验：新候选必须按当前代码规则重建，不能用改标记代替。
    expect((await updateCurrentDataset(input)).outcome).toBe("committed")
    expect((await clean(input)).index.entities.agents.rulesVersion).toBe(
      "nanoka-agent-reference/4",
    )
    expect((await clean(input)).bytes).toEqual(original)
  })

  it("recovers a recorded historical language subset and expands it with complete new inputs", async () => {
    const input = await fixture()
    await updateCurrentDataset(input)
    await restrictToEnglish(input)
    const before = await fingerprints(input.targetDirectory)
    // 记录中的合法语言子集仍可复验与恢复，且不改写任何文件。
    expect(await recoverCurrentDataset(input)).toMatchObject({
      outcome: "unchanged",
      available: true,
      format: integratedSnapshotFormat,
    })
    expect(await fingerprints(input.targetDirectory)).toEqual(before)
    await fs.rm(join(input.rawRoot, input.version, "zh/character/2.json"))
    await expect(updateCurrentDataset(input)).rejects.toThrow(
      "zh/character/2.json",
    )
    expect(await fingerprints(input.targetDirectory)).toEqual(before)
    await writeSyntheticRaw({
      rawRoot: input.rawRoot,
      version: input.version,
      agentIds: ["2", "10"],
      widgetIds: ["3", "7"],
    })
    expect((await updateCurrentDataset(input)).changedEntityFiles).toBe(4)
    const after = await fingerprints(input.targetDirectory)
    for (const path of Object.keys(before).filter(
      (file) => file !== "index.json" && !file.endsWith("details.zh.json"),
    ))
      expect(after[path]).toEqual(before[path])
    const { index } = await clean(input)
    expect(index.entities.agents.detailLocales).toEqual(["zh", "en"])
    expect(index.entities.agents.memberIds).toEqual(["2", "10"])
  })

  it("refuses normal reads and current verification of a recorded historical language subset", async () => {
    // 当前验证命令走生产登记表，因此这里使用生产类别集合。
    const input = await fixture({ production: true })
    await updateCurrentDataset(input)
    await restrictToEnglish(input)
    const before = await fingerprints(input.targetDirectory)
    // 复验与恢复仍支持记录中的语言子集。
    expect(await recoverCurrentDataset(input)).toMatchObject({
      outcome: "unchanged",
      available: true,
      format: integratedSnapshotFormat,
    })
    // 普通读取在进入消费回调之前就要求完整语言配置。
    let callbackEntered = false
    await expect(
      withCurrentDataset(input.targetDirectory, async () => {
        callbackEntered = true
        return "unexpected"
      }),
    ).rejects.toThrow(/INCOMPLETE_LANGUAGES.*缺少 zh 详情/)
    expect(callbackEntered).toBe(false)
    // 当前验证命令同样明确失败，不返回 verified: true。
    const checked = command("verify:nanoka:current", [input.targetDirectory])
    expect(checked.status).toBe(1)
    expect(checked.stdout).toBe("")
    expect(checked.stderr).toContain("INCOMPLETE_LANGUAGES")
    expect(checked.stderr).not.toContain("verified")
    expect(await fingerprints(input.targetDirectory)).toEqual(before)
    // 完整语言配置恢复后可再次正常读取；整个过程不改写历史数据。
    await writeSyntheticRaw({
      rawRoot: input.rawRoot,
      version: input.version,
      agentIds: ["2", "10"],
    })
    expect((await updateCurrentDataset(input)).outcome).toBe("committed")
    expect((await verified(input)).index.entities.agents.detailLocales).toEqual(
      ["zh", "en"],
    )
    const checkedFull = command("verify:nanoka:current", [
      input.targetDirectory,
    ])
    expect(checkedFull.status, checkedFull.stderr).toBe(0)
    expect(JSON.parse(checkedFull.stdout).verified).toBe(true)
  })

  it("rejects a recorded category the current registry no longer registers", async () => {
    const input = await fixture({ widgetIds: ["3"] })
    await updateCurrentDataset(input)
    const before = await bytes(input.targetDirectory)
    // 只按代理人登记表复验：记录中的合成类别无法取得身份检查，明确拒绝且保留现场。
    await expect(
      recoverCurrentDataset({
        targetDirectory: input.targetDirectory,
        entities: onboardedSnapshotEntities,
      }),
    ).rejects.toThrow(/未在当前登记表中登记.*widgets/)
    await expect(
      withCurrentDataset(input.targetDirectory, async () => "unexpected", {
        entities: onboardedSnapshotEntities,
      }),
    ).rejects.toThrow(/未在当前登记表中登记.*widgets/)
    expect(await bytes(input.targetDirectory)).toEqual(before)
  })

  it.each(["missing", "parse", "invalid", "index", "version"])(
    "rejects incomplete/illegal %s input and leaves the old dataset usable",
    async (kind) => {
      const input = await fixture()
      await updateCurrentDataset(input)
      const before = await verified(input)
      const detailPath = join(
        input.rawRoot,
        input.version,
        "en/character/2.json",
      )
      if (kind === "missing") await fs.rm(detailPath)
      if (kind === "parse") await fs.writeFile(detailPath, "{")
      if (kind === "invalid")
        await editJson(detailPath, (value) => {
          value.id = 3
        })
      if (kind === "index")
        await writeJson(join(input.rawRoot, input.version, "character.json"), {
          "2": null,
        })
      if (kind === "version") {
        input.version = "incomplete-version"
        await writeSyntheticRaw({
          rawRoot: input.rawRoot,
          version: input.version,
          agentIds: ["2", "10"],
          widgetIds: ["3", "7"],
        })
        await fs.rm(join(input.rawRoot, input.version, "en/character/2.json"))
      }
      await expect(updateCurrentDataset(input)).rejects.toThrow("UPDATE_FAILED")
      expect(await verified(input)).toEqual(before)
      await clean(input)
    },
  )

  it.each(["content", "extra", "index", "state", "symlink"])(
    "preserves abnormal existing %s and never treats damage as unchanged",
    async (kind) => {
      const input = await fixture()
      await updateCurrentDataset(input)
      const data = join(input.targetDirectory, "agents/2/data.json")
      if (kind === "content") await fs.writeFile(data, "damaged")
      if (kind === "extra")
        await fs.mkdir(join(input.targetDirectory, "unexpected"))
      if (kind === "index")
        await fs.appendFile(join(input.targetDirectory, "index.json"), " ")
      if (kind === "state")
        await fs.writeFile(join(control(input), "state.json"), "{}")
      if (kind === "symlink") {
        await fs.rm(data)
        await fs.symlink(
          join(input.rawRoot, input.version, "character.json"),
          data,
        )
      }
      const before = await bytes(input.targetDirectory)
      await expect(updateCurrentDataset(input)).rejects.toThrow()
      expect(await bytes(input.targetDirectory)).toEqual(before)
    },
  )

  it("does not adopt existing directories or delete unknown control material, and rejects raw overlap", async () => {
    const input = await fixture()
    await fs.mkdir(input.targetDirectory, { recursive: true })
    await fs.writeFile(join(input.targetDirectory, "keep"), "keep")
    await expect(updateCurrentDataset(input)).rejects.toThrow("未登记")
    expect(await fs.readFile(join(input.targetDirectory, "keep"), "utf8")).toBe(
      "keep",
    )
    await fs.writeFile(join(control(input), "foreign"), "keep")
    await expect(recoverCurrentDataset(input)).rejects.toThrow("未登记成员")
    await expect(
      updateCurrentDataset({
        ...input,
        targetDirectory: join(input.rawRoot, "current"),
      }),
    ).rejects.toThrow("raw")
    await expect(
      updateCurrentDataset({
        ...input,
        targetDirectory: join(input.root, "raw"),
      }),
    ).rejects.toThrow("raw")
  })

  it("serializes same-process readers and writers for the entire read callback", async () => {
    const input = await fixture()
    await updateCurrentDataset(input)
    await withCurrentDataset(
      input.targetDirectory,
      async () => {
        await expect(updateCurrentDataset(input)).rejects.toThrow("BUSY")
        await expect(recoverCurrentDataset(input)).rejects.toThrow("BUSY")
        await expect(migrateCurrentDataset(input)).rejects.toThrow("BUSY")
        await expect(verified(input)).rejects.toThrow("BUSY")
      },
      { entities: input.entities },
    )
    await clean(input)
  })

  it.each([
    "candidate-ready",
    "journal-written",
    "prepared",
    "old-moved",
    "new-installed",
    "report-installed",
    "backup-cleaned",
    "work-cleaned",
    "idle",
  ] as const)(
    "recovers ordinary failure at %s without deleting committed data",
    async (stage) => {
      const input = await fixture()
      await updateCurrentDataset(input)
      const before = await bytes(input.targetDirectory)
      await change(input)
      await expect(
        updateCurrentDataset({
          ...input,
          checkpoint: (point) => {
            if (point === stage) throw new Error(`injected ${stage}`)
          },
        }),
      ).rejects.toThrow(`injected ${stage}`)
      const after = (await clean(input)).bytes
      if (
        [
          "candidate-ready",
          "journal-written",
          "prepared",
          "old-moved",
        ].includes(stage)
      )
        expect(after).toEqual(before)
      else expect(after).not.toEqual(before)
      expect((await recoverCurrentDataset(input)).outcome).toBe("unchanged")
    },
  )

  it("retains a committed dataset when report installation repeatedly fails, then recovers", async () => {
    const input = await fixture()
    await updateCurrentDataset(input)
    await change(input)
    const rename = fs.rename
    vi.spyOn(fs, "rename").mockImplementation(async (from, to) => {
      if (String(to) === join(control(input), "maintenance.json"))
        throw new Error("report unavailable")
      return rename(from, to)
    })
    await expect(updateCurrentDataset(input)).rejects.toThrow("仍需恢复")
    expect(
      JSON.parse(
        await fs.readFile(
          join(input.targetDirectory, "agents/2/details.zh.json"),
          "utf8",
        ),
      ).name,
    ).toBe("changed")
    await expect(verified(input)).rejects.toThrow("RECOVERY_REQUIRED")
    vi.restoreAllMocks()
    expect((await recoverCurrentDataset(input)).outcome).toBe("committed")
    await clean(input)
  })

  it("rejects candidate corruption after hard-link reuse before preparing a commit", async () => {
    const input = await fixture()
    await updateCurrentDataset(input)
    const before = await fingerprints(input.targetDirectory)
    await change(input)
    const link = fs.link
    let injected = false
    vi.spyOn(fs, "link").mockImplementation(async (from, to) => {
      if (!injected) {
        injected = true
        return link(join(input.targetDirectory, "index.json"), to)
      }
      return link(from, to)
    })
    const stages: CurrentCheckpoint[] = []
    await expect(
      updateCurrentDataset({
        ...input,
        checkpoint: (stage) => {
          stages.push(stage)
        },
      }),
    ).rejects.toThrow()
    expect(injected).toBe(true)
    expect(await fingerprints(input.targetDirectory)).toEqual(before)
    expect(stages).not.toContain("candidate-ready")
    expect(stages).not.toContain("prepared")
    await clean(input)
  })

  it("fails hard-link preparation without rewriting or losing current files", async () => {
    const input = await fixture()
    await updateCurrentDataset(input)
    const before = await fingerprints(input.targetDirectory)
    vi.spyOn(fs, "link").mockRejectedValue(new Error("link unsupported"))
    await expect(updateCurrentDataset(input)).rejects.toThrow(
      "link unsupported",
    )
    expect(await fingerprints(input.targetDirectory)).toEqual(before)
    await clean(input)
  })
})
