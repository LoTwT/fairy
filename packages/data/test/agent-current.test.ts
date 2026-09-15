import { spawn, spawnSync } from "node:child_process"
import type { ChildProcess } from "node:child_process"
import { createHash } from "node:crypto"
import * as fs from "node:fs/promises"
import { tmpdir } from "node:os"
import { DatabaseSync } from "node:sqlite"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  generateNanokaAgents,
  updateNanokaAgents,
  recoverNanokaAgents,
  withNanokaCurrentDataset,
} from "../scripts/nanoka-integration/current.ts"
import type { CurrentCheckpoint } from "../scripts/nanoka-integration/current.ts"
import { buildNanokaAgents } from "../scripts/nanoka-integration/build.ts"
import * as formatting from "../scripts/nanoka-integration/format.ts"
import {
  outputExpansionLimit,
  verifyNanokaAgentArtifact,
} from "../scripts/nanoka-integration/verify.ts"
import { loadSourcePolicy } from "../scripts/nanoka/policy.ts"
import { agentInput } from "./fixtures/agent-source.ts"

vi.mock("node:fs/promises", async (original) => ({
  ...(await original<typeof import("node:fs/promises")>()),
}))
vi.mock("../scripts/nanoka-integration/format.ts", async (original) => ({
  ...(await original<
    typeof import("../scripts/nanoka-integration/format.ts")
  >()),
}))
const roots: string[] = []
const children: ChildProcess[] = []
afterEach(async () => {
  vi.restoreAllMocks()
  for (const processChild of children.splice(0)) {
    if (processChild.exitCode === null && processChild.signalCode === null) {
      const exited = new Promise((resolve) =>
        processChild.once("exit", resolve),
      )
      processChild.kill("SIGKILL")
      await exited
    }
  }
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true })
})
const digest = (content: Uint8Array) =>
  createHash("sha256").update(content).digest("hex")
async function writeJson(path: string, value: unknown) {
  await fs.mkdir(dirname(path), { recursive: true })
  await fs.writeFile(path, JSON.stringify(value))
}
async function editJson(path: string, mutate: (value: any) => void) {
  const value = JSON.parse(await fs.readFile(path, "utf8"))
  mutate(value)
  await writeJson(path, value)
}
async function source(rawRoot: string, version: string, ids = ["2", "10"]) {
  const root = join(rawRoot, version)
  await writeJson(join(root, "manifest.json"), {
    zzz: { live: version, latest: version, available: [version] },
  })
  await writeJson(
    join(root, "character.json"),
    Object.fromEntries(ids.map((id) => [id, agentInput().sourceRecord])),
  )
  for (const id of ids)
    for (const locale of agentInput().detailLocales)
      await writeJson(join(root, locale, "character", `${id}.json`), {
        ...agentInput().details[locale],
        id: Number(id),
      })
}
async function fixture() {
  const root = await fs.realpath(
    await fs.mkdtemp(join(tmpdir(), "fairy-agent-current-test-")),
  )
  roots.push(root)
  const rawRoot = join(root, "raw/nanoka")
  const version = "synthetic-1"
  await source(rawRoot, version)
  return {
    root,
    rawRoot,
    version,
    targetDirectory: join(root, "integrated"),
    policy: await loadSourcePolicy(),
  }
}
type Fixture = Awaited<ReturnType<typeof fixture>>
function control(input: Fixture) {
  return join(dirname(input.targetDirectory), ".integrated.fairy-state")
}
async function bytes(root: string): Promise<Record<string, Buffer>> {
  const result: Record<string, Buffer> = {}
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    if (entry.isDirectory())
      for (const [path, content] of Object.entries(
        await bytes(join(root, entry.name)),
      ))
        result[`${entry.name}/${path}`] = content
    else result[entry.name] = await fs.readFile(join(root, entry.name))
  }
  return result
}
async function fingerprints(root: string) {
  const result: Record<
    string,
    { ino: bigint; dev: bigint; mtimeNs: bigint; hash: string }
  > = {}
  for (const [path, content] of Object.entries(await bytes(root))) {
    const stat = await fs.stat(join(root, path), { bigint: true })
    result[path] = {
      ino: stat.ino,
      dev: stat.dev,
      mtimeNs: stat.mtimeNs,
      hash: digest(content),
    }
  }
  return result
}
async function verified(input: Fixture) {
  return withNanokaCurrentDataset(
    input.targetDirectory,
    async (directory, index) => ({ index, bytes: await bytes(directory) }),
  )
}
async function clean(input: Fixture) {
  expect((await fs.readdir(control(input))).toSorted()).toEqual([
    "lock.sqlite",
    "maintenance.json",
    "state.json",
  ])
  const result = await verified(input)
  const expected = [
    "index.json",
    ...Object.values(result.index.agents)
      .flatMap((agent) => [
        agent.files.stats,
        ...Object.values(agent.files.content),
      ])
      .map((file) => file.path),
  ].toSorted()
  expect(Object.keys(result.bytes).toSorted()).toEqual(expected)
  for (const agent of Object.values(result.index.agents))
    for (const file of [
      agent.files.stats,
      ...Object.values(agent.files.content),
    ])
      expect(digest(result.bytes[file.path])).toBe(file.sha256)
  const state = JSON.parse(
    await fs.readFile(join(control(input), "state.json"), "utf8"),
  )
  expect(state.current.indexSha256).toBe(digest(result.bytes["index.json"]))
  return result
}
const processScript = fileURLToPath(
  new URL("./fixtures/current-agent-process.ts", import.meta.url),
)
async function child(input: Fixture, extra: Record<string, unknown> = {}) {
  const path = join(input.root, `process-${crypto.randomUUID()}.json`)
  await writeJson(path, { ...input, ...extra })
  const process = spawn(
    globalThis.process.execPath,
    ["--disable-warning=ExperimentalWarning", processScript, path],
    { stdio: ["ignore", "pipe", "pipe", "ipc"] },
  )
  children.push(process)
  let stdout = ""
  let stderr = ""
  process.stdout!.on("data", (chunk) => {
    stdout += chunk
  })
  process.stderr!.on("data", (chunk) => {
    stderr += chunk
  })
  const done = new Promise<{
    code: number | null
    signal: NodeJS.Signals | null
    stdout: string
    stderr: string
  }>((resolve, reject) => {
    process.once("error", reject)
    process.once("close", (code, signal) =>
      resolve({ code, signal, stdout, stderr }),
    )
  })
  const paused = new Promise<void>((resolve, reject) => {
    if (!extra.pause) {
      resolve()
      return
    }
    const timer = setTimeout(
      () => reject(new Error(`checkpoint timeout: ${extra.pause}; ${stderr}`)),
      10000,
    )
    process.once("message", (message) => {
      clearTimeout(timer)
      expect(message).toEqual({ stage: extra.pause })
      resolve()
    })
    process.once("exit", () => {
      clearTimeout(timer)
      reject(new Error(`exited before ${extra.pause}: ${stderr}`))
    })
  })
  await paused
  return { process, done }
}
async function change(input: Fixture) {
  await editJson(
    join(input.rawRoot, input.version, "zh/character/2.json"),
    (value) => {
      value.name = "changed"
    },
  )
}

async function reportHeavySource(input: Fixture) {
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

async function cloneFixture() {
  const input = await fixture()
  const build = await buildNanokaAgents({
    ...input,
    temporaryParent: input.root,
  })
  await fs.rename(build.artifactDirectory, input.targetDirectory)
  await fs.rm(build.buildDirectory, { recursive: true })
  return input
}

describe("current Nanoka dataset", () => {
  it.each(["generate", "update", "recover", "read"] as const)(
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
          ? generateNanokaAgents(input)
          : mode === "update"
            ? updateNanokaAgents(input)
            : mode === "recover"
              ? recoverNanokaAgents(input)
              : withNanokaCurrentDataset(
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
    await updateNanokaAgents(input)
    await source(input.rawRoot, input.version)
    input.policy.requestPolicy.maximumResponseBytes = 5000
    const limit =
      input.policy.requestPolicy.maximumResponseBytes * outputExpansionLimit
    expect(
      (await fs.stat(join(input.targetDirectory, "agents/2/details.zh.json")))
        .size,
    ).toBeGreaterThan(limit)
    const candidate = await buildNanokaAgents({
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
    expect((await updateNanokaAgents(input)).outcome).toBe("committed")
    expect((await clean(input)).bytes).toEqual(
      await bytes(candidate.artifactDirectory),
    )
  })

  it.each([true, false])(
    "rejects an oversized report before commit, first=%s",
    async (initial) => {
      const input = await fixture()
      if (!initial) await updateNanokaAgents(input)
      const before = initial
        ? undefined
        : await fingerprints(input.targetDirectory)
      input.policy.fetchLimits.maximumBytesPerRun =
        await reportHeavySource(input)
      const candidate = await buildNanokaAgents({
        ...input,
        temporaryParent: input.root,
      })
      expect(
        (await fs.stat(candidate.maintenanceReportPath)).size,
      ).toBeGreaterThan(
        input.policy.fetchLimits.maximumBytesPerRun * outputExpansionLimit,
      )
      const stages: CurrentCheckpoint[] = []
      await expect(
        updateNanokaAgents({
          ...input,
          checkpoint: (stage) => {
            stages.push(stage)
          },
        }),
      ).rejects.toThrow(/maintenance.json.*字节数超过上限/)
      expect(stages).toContain("building")
      expect(stages).not.toContain("prepared")
      for (let i = 0; i < 2; i++)
        expect(await recoverNanokaAgents(input)).toMatchObject({
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
    expect(pending.length).toBeGreaterThan(legacyBudget * outputExpansionLimit)
    const before = await fingerprints(input.targetDirectory)
    const recovery = await child(input, { mode: "recover" })
    expect(await recovery.done).toMatchObject({ code: 0 })
    expect(await recoverNanokaAgents(input)).toMatchObject({
      outcome: "unchanged",
      available: true,
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
    const input = await fixture()
    const raw = await bytes(input.rawRoot)
    const first = await updateNanokaAgents(input)
    expect(first.outcome).toBe("committed")
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
    const second = await updateNanokaAgents(input)
    expect(second.outcome).toBe("unchanged")
    expect(second.reusedEntityFiles).toBe(Object.keys(before).length - 1)
    expect(second.changedEntityFiles).toBe(0)
    expect(formatted).toHaveBeenCalledTimes(2)
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
    ).toHaveLength(Object.keys(before).length - 1)
    expect(await bytes(input.rawRoot)).toEqual(raw)
    await clean(input)
  })

  it.each(["entities", "index"])(
    "preserves current data and recovers after actual oxfmt failure on %s",
    async (stage) => {
      const input = await fixture()
      await updateNanokaAgents(input)
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
      await expect(updateNanokaAgents(input)).rejects.toThrow(/oxfmt/)
      expect(formatted).toHaveBeenCalledTimes(stage === "index" ? 2 : 1)
      expect(links).not.toHaveBeenCalled()
      expect(await fingerprints(input.targetDirectory)).toEqual(before)
      expect(await fingerprints(input.rawRoot)).toEqual(rawBefore)
      expect(await fs.readFile(join(control(input), "state.json"))).toEqual(
        stateBefore,
      )
      await clean(input)
      formatted.mockRestore()
      expect((await recoverNanokaAgents(input)).outcome).toBe("unchanged")
      expect((await updateNanokaAgents(input)).outcome).toBe("unchanged")
      expect(await fingerprints(input.targetDirectory)).toEqual(before)
    },
  )

  it("adds, changes and legally removes members while reusing unchanged current inodes", async () => {
    const input = await fixture()
    await updateNanokaAgents(input)
    const before = await fingerprints(input.targetDirectory)
    await source(input.rawRoot, input.version, ["2", "10", "30"])
    await change(input)
    const added = await updateNanokaAgents(input)
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
    const removed = await updateNanokaAgents(input)
    expect(removed.removedEntityFiles).toBe(3)
    expect((await clean(input)).index.scope.agentIds).toEqual(["2", "30"])
  })

  it("records source byte and source record changes without rewriting equal entity output", async () => {
    const input = await fixture()
    await updateNanokaAgents(input)
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
    const result = await updateNanokaAgents(input)
    expect(result.outcome).toBe("committed")
    expect(result.changedEntityFiles).toBe(0)
    const after = await fingerprints(input.targetDirectory)
    for (const path of Object.keys(before).filter(
      (file) => file !== "index.json",
    ))
      expect(after[path]).toEqual(before[path])
    const { index } = await clean(input)
    expect(index.source.inputs).not.toEqual(oldIndex.source.inputs)
    expect(index.agents["2"].sourceRecord.new_key).toEqual([0, ""])
  })

  it("switches full source version and configuration order, while rejecting an incomplete language policy", async () => {
    const input = await fixture()
    await updateNanokaAgents(input)
    await source(input.rawRoot, "synthetic-2")
    input.version = "synthetic-2"
    expect((await updateNanokaAgents(input)).changedEntityFiles).toBe(0)
    expect((await clean(input)).index.source.version).toBe(input.version)
    input.policy.languages.reverse()
    await updateNanokaAgents(input)
    expect((await clean(input)).index.source.detailLocales).toEqual(
      input.policy.languages,
    )
    const beforeInvalidPolicy = await verified(input)
    input.policy.languages = ["en"]
    await expect(updateNanokaAgents(input)).rejects.toThrow("来源配置无效")
    expect(await verified(input)).toEqual(beforeInvalidPolicy)
    await clean(input)
  })

  it("reintegrates older rules using current code rather than relabeling old entity bytes", async () => {
    const input = await fixture()
    await updateNanokaAgents(input)
    const original = await bytes(input.targetDirectory)
    const data = join(input.targetDirectory, "agents/2/data.json")
    await editJson(data, (value) => {
      value.codeName = "old-rule-output"
    })
    const hash = digest(await fs.readFile(data))
    await editJson(join(input.targetDirectory, "index.json"), (value) => {
      value.rulesVersion = "nanoka-agent-reference/3"
      value.agents["2"].files.stats.sha256 = hash
    })
    const indexHash = digest(
      await fs.readFile(join(input.targetDirectory, "index.json")),
    )
    await editJson(join(control(input), "state.json"), (value) => {
      value.current.indexSha256 = indexHash
      value.current.rulesVersion = "nanoka-agent-reference/3"
    })
    expect((await verified(input)).index.rulesVersion).toBe(
      "nanoka-agent-reference/3",
    )
    expect((await updateNanokaAgents(input)).changedEntityFiles).toBe(1)
    expect((await clean(input)).bytes).toEqual(original)
  })

  it.each(["missing", "parse", "invalid", "index", "version"])(
    "rejects incomplete/illegal %s input and leaves the old dataset usable",
    async (kind) => {
      const input = await fixture()
      await updateNanokaAgents(input)
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
        await source(input.rawRoot, input.version)
        await fs.rm(join(input.rawRoot, input.version, "en/character/2.json"))
      }
      await expect(updateNanokaAgents(input)).rejects.toThrow("UPDATE_FAILED")
      expect(await verified(input)).toEqual(before)
      await clean(input)
    },
  )

  it.each(["content", "extra", "index", "state", "symlink"])(
    "preserves abnormal existing %s and never treats damage as unchanged",
    async (kind) => {
      const input = await fixture()
      await updateNanokaAgents(input)
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
      await expect(updateNanokaAgents(input)).rejects.toThrow()
      expect(await bytes(input.targetDirectory)).toEqual(before)
    },
  )

  it("does not adopt existing directories or delete unknown control material, and rejects raw overlap", async () => {
    const input = await fixture()
    await fs.mkdir(input.targetDirectory, { recursive: true })
    await fs.writeFile(join(input.targetDirectory, "keep"), "keep")
    await expect(updateNanokaAgents(input)).rejects.toThrow("未登记")
    expect(await fs.readFile(join(input.targetDirectory, "keep"), "utf8")).toBe(
      "keep",
    )
    await fs.writeFile(join(control(input), "foreign"), "keep")
    await expect(recoverNanokaAgents(input)).rejects.toThrow("未登记成员")
    await expect(
      updateNanokaAgents({
        ...input,
        targetDirectory: join(input.rawRoot, "current"),
      }),
    ).rejects.toThrow("raw")
    await expect(
      updateNanokaAgents({
        ...input,
        targetDirectory: join(input.root, "raw"),
      }),
    ).rejects.toThrow("raw")
  })

  it("serializes same-process readers and writers for the entire read callback", async () => {
    const input = await fixture()
    await updateNanokaAgents(input)
    await withNanokaCurrentDataset(input.targetDirectory, async () => {
      await expect(updateNanokaAgents(input)).rejects.toThrow("BUSY")
      await expect(recoverNanokaAgents(input)).rejects.toThrow("BUSY")
      await expect(verified(input)).rejects.toThrow("BUSY")
    })
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
      await updateNanokaAgents(input)
      const before = await bytes(input.targetDirectory)
      await change(input)
      await expect(
        updateNanokaAgents({
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
      expect((await recoverNanokaAgents(input)).outcome).toBe("unchanged")
    },
  )

  it("retains a committed dataset when report installation repeatedly fails, then recovers", async () => {
    const input = await fixture()
    await updateNanokaAgents(input)
    await change(input)
    const rename = fs.rename
    vi.spyOn(fs, "rename").mockImplementation(async (from, to) => {
      if (String(to) === join(control(input), "maintenance.json"))
        throw new Error("report unavailable")
      return rename(from, to)
    })
    await expect(updateNanokaAgents(input)).rejects.toThrow("仍需恢复")
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
    expect((await recoverNanokaAgents(input)).outcome).toBe("committed")
    await clean(input)
  })

  it("fails hard-link preparation without rewriting or losing current files", async () => {
    const input = await fixture()
    await updateNanokaAgents(input)
    const before = await fingerprints(input.targetDirectory)
    vi.spyOn(fs, "link").mockRejectedValue(new Error("link unsupported"))
    await expect(updateNanokaAgents(input)).rejects.toThrow("link unsupported")
    expect(await fingerprints(input.targetDirectory)).toEqual(before)
    await clean(input)
  })
})

describe("real process interruption and restart", () => {
  const checkpoints: CurrentCheckpoint[] = [
    "locked",
    "initialized",
    "building",
    "candidate-ready",
    "journal-written",
    "prepared",
    "old-moved",
    "new-installed",
    "report-installed",
    "backup-cleaned",
    "work-cleaned",
    "idle",
  ]
  for (const initial of [true, false])
    it.each(checkpoints.filter((stage) => initial || stage !== "initialized"))(
      `SIGKILL first=${initial} at %s`,
      async (stage) => {
        const input = await fixture()
        if (!initial) await updateNanokaAgents(input)
        const before = initial ? undefined : await bytes(input.targetDirectory)
        await change(input)
        const running = await child(input, { pause: stage })
        const competitor = await child(input)
        const conflict = await competitor.done
        expect(conflict.code).toBe(1)
        expect(conflict.stderr).toContain("BUSY")
        const reader = await child(input, { mode: "read" })
        expect((await reader.done).stderr).toContain("BUSY")
        running.process.kill("SIGKILL")
        expect((await running.done).signal).toBe("SIGKILL")
        // 新进程取到残留数据库的锁；没有删除或按 PID 解锁。
        const lockBefore = await fs.stat(join(control(input), "lock.sqlite"), {
          bigint: true,
        })
        const recovery = await child(input, { mode: "recover" })
        const recovered = await recovery.done
        expect(recovered, recovered.stderr).toMatchObject({
          code: 0,
          stderr: "",
        })
        const committed = [
          "new-installed",
          "report-installed",
          "backup-cleaned",
          "work-cleaned",
          "idle",
        ].includes(stage)
        if (committed) {
          expect(
            JSON.parse(
              (await clean(input)).bytes["agents/2/details.zh.json"].toString(),
            ).name,
          ).toBe("changed")
        } else if (initial) {
          expect(JSON.parse(recovered.stdout).available).toBe(false)
          await expect(fs.lstat(input.targetDirectory)).rejects.toMatchObject({
            code: "ENOENT",
          })
        } else expect((await clean(input)).bytes).toEqual(before)
        const again = await child(input, { mode: "recover" })
        expect(JSON.parse((await again.done).stdout).outcome).toBe("unchanged")
        expect(
          (await fs.stat(join(control(input), "lock.sqlite"), { bigint: true }))
            .ino,
        ).toBe(lockBefore.ino)
        await updateNanokaAgents(input)
        await clean(input)
      },
      20000,
    )

  it("rejects reads after interrupted commit until recovery, and recovers an interrupted rollback", async () => {
    const input = await fixture()
    await updateNanokaAgents(input)
    const before = await bytes(input.targetDirectory)
    await change(input)
    const writer = await child(input, { pause: "old-moved" })
    writer.process.kill("SIGKILL")
    await writer.done
    await expect(verified(input)).rejects.toThrow("RECOVERY_REQUIRED")
    const recovery = await child(input, {
      mode: "recover",
      pause: "old-restored",
    })
    recovery.process.kill("SIGKILL")
    await recovery.done
    const again = await child(input, { mode: "recover" })
    expect((await again.done).code).toBe(0)
    expect((await clean(input)).bytes).toEqual(before)
  })

  it("blocks a writer while another process is reading, then releases the dead reader's lock", async () => {
    const input = await fixture()
    await updateNanokaAgents(input)
    const reader = await child(input, { mode: "read", pause: "reading" })
    await expect(updateNanokaAgents(input)).rejects.toThrow("BUSY")
    reader.process.kill("SIGKILL")
    await reader.done
    expect((await updateNanokaAgents(input)).outcome).toBe("unchanged")
    await clean(input)
  })
})

const repository = fileURLToPath(new URL("../../..", import.meta.url))
function command(name: string, args: string[]) {
  return spawnSync(
    "pnpm",
    ["--silent", "--filter", "@randomplay/data", name, ...args],
    { cwd: repository, encoding: "utf8", timeout: 20000 },
  )
}
describe("current workspace commands", () => {
  it("initializes a fresh clone through the generation command without rewriting files", async () => {
    const input = await cloneFixture()
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
        reusedEntityFiles: 6,
        changedEntityFiles: 0,
      })
      expect(await fingerprints(input.targetDirectory)).toEqual(before)
    }
    await clean(input)
  }, 30000)

  it("formats workspace sources while preserving managed legacy integrated data", async () => {
    const input = await fixture()
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
    await updateNanokaAgents(input)
    const original = await clean(input)
    const legacyIndex = structuredClone(original.index)
    // 只在合成 fixture 中构造合法旧排版，并同步实体及控制记录摘要。
    for (const agent of Object.values(legacyIndex.agents))
      for (const reference of [
        agent.files.stats,
        ...Object.values(agent.files.content),
      ]) {
        const content = Buffer.from(
          `${JSON.stringify(JSON.parse(original.bytes[reference.path].toString()), null, 4)}\n`,
        )
        await fs.writeFile(join(input.targetDirectory, reference.path), content)
        reference.sha256 = digest(content)
      }
    const indexBytes = Buffer.from(`${JSON.stringify(legacyIndex, null, 4)}\n`)
    await fs.writeFile(join(input.targetDirectory, "index.json"), indexBytes)
    await editJson(join(control(input), "state.json"), (state) => {
      state.current.indexSha256 = digest(indexBytes)
    })
    await clean(input)
    expect((await recoverNanokaAgents(input)).outcome).toBe("unchanged")

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
    expect((await recoverNanokaAgents(input)).outcome).toBe("unchanged")
    expect(await fingerprints(input.targetDirectory)).toEqual(before)
    const checked = workspaceCommand("format:check")
    expect(checked.status).toBe(1)
    expect(checked.stdout + checked.stderr).toContain(
      "packages/data/integrated/",
    )

    expect((await updateNanokaAgents(input)).outcome).toBe("committed")
    expect((await clean(input)).bytes).toEqual(original.bytes)
    const rechecked = workspaceCommand("format:check")
    expect(rechecked.status, rechecked.stdout + rechecked.stderr).toBe(0)
    expect((await recoverNanokaAgents(input)).outcome).toBe("unchanged")
  }, 30000)

  it("generates, updates, verifies and recovers through explicit pnpm scripts", async () => {
    const input = await fixture()
    const args = [input.rawRoot, input.version, input.targetDirectory]
    for (const expected of ["committed", "unchanged"]) {
      const result = command("generate:integrated", args)
      expect(result, result.stderr).toMatchObject({ status: 0, stderr: "" })
      expect(JSON.parse(result.stdout).outcome).toBe(expected)
    }
    const verify = command("verify:nanoka:current", [input.targetDirectory])
    expect(verify.status, verify.stderr).toBe(0)
    expect(JSON.parse(verify.stdout).verified).toBe(true)
    const recover = command("recover:nanoka:agents", [input.targetDirectory])
    expect(recover.status, recover.stderr).toBe(0)
    expect(JSON.parse(recover.stdout).outcome).toBe("unchanged")
    await clean(input)
  }, 30000)
  it.each([
    "generate:integrated",
    "recover:nanoka:agents",
    "verify:nanoka:current",
  ])(
    "%s supports help and rejects invalid arguments before any input access",
    (name) => {
      for (const help of ["-h", "--help"]) {
        const result = command(name, [help])
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
        const result = command(name, args)
        expect(result).toMatchObject({ status: 1, stdout: "" })
        expect(result.stderr).toContain(`用法：${name}`)
        expect(result.stderr).not.toContain("ENOENT")
        expect(result.stderr).not.toContain("    at ")
      }
    },
    30000,
  )
})

it("expands a historical language configuration from complete new inputs, preserving surviving files", async () => {
  const input = await fixture()
  await updateNanokaAgents(input)
  // 合成此前只登记 en 的受管理制品；不放宽当前 raw 构建的完整语言策略。
  await editJson(join(input.targetDirectory, "index.json"), (index) => {
    index.source.detailLocales = ["en"]
    index.source.inputs = index.source.inputs.filter(
      (entry: { resource: string }) => !entry.resource.includes("/zh/"),
    )
    for (const agent of Object.values(index.agents) as any[])
      delete agent.files.content.zh
  })
  for (const id of ["2", "10"])
    await fs.rm(join(input.targetDirectory, `agents/${id}/details.zh.json`))
  const hash = digest(
    await fs.readFile(join(input.targetDirectory, "index.json")),
  )
  await editJson(join(control(input), "state.json"), (state) => {
    state.current.policy.languages = ["en"]
    state.current.indexSha256 = hash
  })
  const before = await fingerprints(input.targetDirectory)
  const historicalPolicy = structuredClone(input.policy)
  historicalPolicy.languages = ["en"]
  expect(await recoverNanokaAgents(input)).toMatchObject({
    outcome: "unchanged",
    available: true,
  })
  const historical = await verifyNanokaAgentArtifact({
    artifactDirectory: input.targetDirectory,
    policy: historicalPolicy,
    historicalLanguages: true,
  })
  expect(historical.source.detailLocales).toEqual(["en"])
  expect(historical.agents["2"].files.content.zh).toBeUndefined()
  await withNanokaCurrentDataset(
    input.targetDirectory,
    async (directory, index) => {
      const english = index.agents["2"].files.content.en
      if (!english) throw new Error("Expected historical English details")
      expect(digest(await fs.readFile(join(directory, english.path)))).toBe(
        english.sha256,
      )
      expect(index.agents["2"].files.content.zh).toBeUndefined()
    },
  )
  expect(await fingerprints(input.targetDirectory)).toEqual(before)
  await fs.rm(join(input.rawRoot, input.version, "zh/character/2.json"))
  await expect(updateNanokaAgents(input)).rejects.toThrow("zh/character/2.json")
  expect(await fingerprints(input.targetDirectory)).toEqual(before)
  await source(input.rawRoot, input.version)
  expect((await updateNanokaAgents(input)).changedEntityFiles).toBe(2)
  const after = await fingerprints(input.targetDirectory)
  for (const path of Object.keys(before).filter(
    (file) => file !== "index.json",
  ))
    expect(after[path]).toEqual(before[path])
  await clean(input)
})

it("recovers forward after partial backup deletion and rollback after failed candidate rename", async () => {
  const input = await fixture()
  await updateNanokaAgents(input)
  const before = await verified(input)
  await change(input)
  const rename = fs.rename
  vi.spyOn(fs, "rename").mockImplementation(async (from, to) => {
    if (
      String(from).endsWith("work/candidate") &&
      String(to) === input.targetDirectory
    )
      throw new Error("rename failed")
    return rename(from, to)
  })
  await expect(updateNanokaAgents(input)).rejects.toThrow("rename failed")
  expect(await verified(input)).toEqual(before)
  vi.restoreAllMocks()
  const remove = fs.rm
  vi.spyOn(fs, "rm").mockImplementation(async (path, options) => {
    if (String(path) === join(control(input), "backup")) {
      await remove(join(String(path), "agents/2/data.json"), { force: true })
      throw new Error("partial cleanup")
    }
    return remove(path, options)
  })
  await expect(updateNanokaAgents(input)).rejects.toThrow("仍需恢复")
  vi.restoreAllMocks()
  expect((await recoverNanokaAgents(input)).outcome).toBe("committed")
  expect((await clean(input)).bytes).not.toEqual(before.bytes)
})

it("resumes rollback even after its candidate has been deleted and another recovery process is killed", async () => {
  const input = await fixture()
  await updateNanokaAgents(input)
  const before = await verified(input)
  await change(input)
  const writer = await child(input, { pause: "prepared" })
  writer.process.kill("SIGKILL")
  await writer.done
  const recovery = await child(input, {
    mode: "recover",
    pause: "work-cleaned",
  })
  recovery.process.kill("SIGKILL")
  await recovery.done
  const again = await child(input, { mode: "recover" })
  expect((await again.done).code).toBe(0)
  expect(await verified(input)).toEqual(before)
  await clean(input)
})

it("preserves partial initial state writes and refuses foreign recovery paths", async () => {
  const input = await fixture()
  await fs.mkdir(control(input), { recursive: true })
  await fs.writeFile(join(control(input), "state.next"), "{partial")
  expect((await recoverNanokaAgents(input)).available).toBe(false)
  expect((await updateNanokaAgents(input)).outcome).toBe("committed")
  const before = await bytes(input.targetDirectory)
  await editJson(join(control(input), "state.json"), (value) => {
    value.targetDirectory = input.rawRoot
  })
  await expect(recoverNanokaAgents(input)).rejects.toThrow("归属")
  expect(await bytes(input.targetDirectory)).toEqual(before)
})

it.each(["backup-partially-cleaned", "work-partially-cleaned"])(
  "restarts after SIGKILL in actual partial cleanup: %s",
  async (pause) => {
    const input = await fixture()
    await updateNanokaAgents(input)
    const before = await verified(input)
    await change(input)
    if (pause === "work-partially-cleaned") {
      const writer = await child(input, { pause: "prepared" })
      writer.process.kill("SIGKILL")
      await writer.done
    }
    const interrupted = await child(input, {
      mode: pause === "work-partially-cleaned" ? "recover" : "update",
      pause,
    })
    interrupted.process.kill("SIGKILL")
    expect((await interrupted.done).signal).toBe("SIGKILL")
    const recovery = await child(input, { mode: "recover" })
    expect((await recovery.done).code).toBe(0)
    const after = await clean(input)
    if (pause === "work-partially-cleaned") expect(after).toEqual(before)
    else expect(after.bytes).not.toEqual(before.bytes)
    const repeated = await child(input, { mode: "recover" })
    expect(JSON.parse((await repeated.done).stdout).outcome).toBe("unchanged")
  },
)

it("refuses to recreate a missing permanent lock in an already managed directory", async () => {
  const input = await fixture()
  await updateNanokaAgents(input)
  const before = await bytes(input.targetDirectory)
  await fs.rm(join(control(input), "lock.sqlite"))
  await expect(updateNanokaAgents(input)).rejects.toThrow("缺失永久锁")
  await expect(recoverNanokaAgents(input)).rejects.toThrow("缺失永久锁")
  expect(await bytes(input.targetDirectory)).toEqual(before)
  await expect(
    fs.lstat(join(control(input), "lock.sqlite")),
  ).rejects.toMatchObject({ code: "ENOENT" })
})

describe("explicit generation initialization", () => {
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
      const input = await cloneFixture()
      const indexPath = join(input.targetDirectory, "index.json")
      if (damage === "format")
        await editJson(indexPath, (index) => {
          index.format = "unknown"
        })
      if (damage === "rules")
        await editJson(indexPath, (index) => {
          index.rulesVersion = "nanoka-agent-reference/999"
        })
      if (damage === "members")
        await editJson(indexPath, (index) => {
          index.scope.agentIds = ["2"]
        })
      if (damage === "languages")
        await editJson(indexPath, (index) => {
          index.source.detailLocales = ["en"]
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
      const input = await cloneFixture()
      if (
        ["damaged-record", "index-mismatch", "missing-lock"].includes(damage)
      ) {
        await generateNanokaAgents(input)
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
      const input = await cloneFixture()
      const before = await fingerprints(input.targetDirectory)
      const writer = await child(input, { mode: "generate", pause })
      const lockBefore = await fs.stat(join(control(input), "lock.sqlite"), {
        bigint: true,
      })
      for (const operation of [
        () => generateNanokaAgents(input),
        () => recoverNanokaAgents(input),
        () => verified(input),
      ])
        await expect(operation()).rejects.toThrow("BUSY")
      writer.process.kill("SIGKILL")
      expect((await writer.done).signal).toBe("SIGKILL")
      expect(await fingerprints(input.targetDirectory)).toEqual(before)
      if (pause !== "initialized") {
        await expect(recoverNanokaAgents(input)).rejects.toThrow(
          "未登记的目标目录",
        )
        await expect(verified(input)).rejects.toThrow("RECOVERY_REQUIRED")
      } else {
        expect((await recoverNanokaAgents(input)).available).toBe(true)
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
      expect((await recoverNanokaAgents(input)).outcome).toBe("unchanged")
    },
    20000,
  )

  it("initializes existing bytes before a changed-input update and recovers a prepared transaction", async () => {
    const input = await cloneFixture()
    const before = await fingerprints(input.targetDirectory)
    await change(input)
    const writer = await child(input, { mode: "generate", pause: "prepared" })
    writer.process.kill("SIGKILL")
    await writer.done
    expect((await recoverNanokaAgents(input)).outcome).toBe("rolled-back")
    expect(await fingerprints(input.targetDirectory)).toEqual(before)
    const result = await generateNanokaAgents(input)
    expect(result).toMatchObject({
      outcome: "committed",
      changedEntityFiles: 1,
      reusedEntityFiles: 5,
    })
    await clean(input)
  })
})
