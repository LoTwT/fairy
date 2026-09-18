import * as fs from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, dirname, join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { nanokaAgentsSnapshotEntity } from "../scripts/nanoka-integration/snapshot-entities.ts"
import { buildIntegratedSnapshot } from "../scripts/nanoka-integration/snapshot-build.ts"
import {
  generateCatalog,
  preparePublication,
  publicationFiles,
} from "../scripts/prepare-publication.ts"
import {
  generateCurrentDataset,
  withCurrentDataset,
} from "../scripts/nanoka-integration/current.ts"
import { sha256 } from "../scripts/nanoka-integration/files.ts"
import { outputExpansionLimit } from "../scripts/nanoka-integration/verify.ts"
import * as sourcePolicy from "../scripts/nanoka/policy.ts"
import {
  managedLegacyV2Fixture,
  publicationFixture,
} from "./fixtures/publication.ts"
import { syntheticSnapshotEntity } from "./fixtures/snapshot-entities.ts"
import {
  legacyV2Format,
  writeSyntheticRaw,
} from "./fixtures/synthetic-dataset.ts"

vi.mock("node:fs/promises", async (original) => ({
  ...(await original<typeof import("node:fs/promises")>()),
}))
vi.mock("../scripts/nanoka/policy.ts", async (original) => ({
  ...(await original<typeof import("../scripts/nanoka/policy.ts")>()),
}))
const temporaryDirectories: string[] = []
afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((path) => fs.rm(path, { recursive: true, force: true })),
  )
})
async function temporaryRoot() {
  const root = await fs.mkdtemp(join(tmpdir(), "fairy-publication-"))
  temporaryDirectories.push(root)
  return root
}
async function fixture() {
  const root = await temporaryRoot()
  return { root, ...(await publicationFixture(root)) }
}

/** 目录下全部文件的相对路径与内容，用于证明复制前后没有增删或改写。 */
async function directoryFiles(
  root: string,
  prefix = "",
): Promise<Record<string, Buffer>> {
  const files: Record<string, Buffer> = {}
  for (const entry of await fs.readdir(join(root, prefix), {
    withFileTypes: true,
  })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory())
      Object.assign(files, await directoryFiles(root, path))
    else files[path] = await fs.readFile(join(root, path))
  }
  return files
}

/** 逐个普通文件的字节摘要、inode 与 mtime；任一改写都会改变指纹。 */
async function fingerprints(root: string): Promise<string[]> {
  const entries = Object.entries(await directoryFiles(root)).toSorted(
    ([left], [right]) => (left < right ? -1 : left > right ? 1 : 0),
  )
  const result: string[] = []
  for (const [path, bytes] of entries) {
    const stat = await fs.stat(join(root, path), { bigint: true })
    result.push(`${path} ${sha256(bytes)} ${stat.ino} ${stat.mtimeNs}`)
  }
  return result
}

describe("publication snapshot", () => {
  it("generates exact names, mapping and literal imports from English top-level names in index order", async () => {
    const { root, artifactDirectory, index, rawRoot } = await fixture()
    await fs.rm(rawRoot, { recursive: true })
    const generated = join(root, "generated")
    await preparePublication(artifactDirectory, generated)
    const catalog = await fs.readFile(join(generated, "catalog.ts"), "utf8")
    expect(catalog).toContain(
      'export type AgentName = "Astra Yao" | "Soldier 0 - Anby"',
    )
    expect(catalog).toContain(
      'export type DriveDiscName = "Example Drive Disc 930001" | "Example Drive Disc 930002"',
    )
    expect(catalog).toContain(
      'export type WEngineName = "Example W-Engine 940001" | "Example W-Engine 940002"',
    )
    expect(catalog).toContain(
      'export type BangbooName = "Exampleboo 950001" | "Exampleboo 950002"',
    )
    expect(catalog).toContain('export type MonsterId = "960001" | "960002"')
    expect(catalog).toContain('[["Astra Yao","2"],["Soldier 0 - Anby","10"]]')
    expect(catalog).toContain(
      '[["Example Drive Disc 930001","930001"],["Example Drive Disc 930002","930002"]]',
    )
    expect(catalog).toContain(
      '[["Example W-Engine 940001","940001"],["Example W-Engine 940002","940002"]]',
    )
    expect(catalog).toContain(
      '[["Exampleboo 950001","950001"],["Exampleboo 950002","950002"]]',
    )
    expect(catalog).toContain('Object.freeze(["Astra Yao","Soldier 0 - Anby"])')
    expect(catalog).toContain(
      'Object.freeze(["Example Drive Disc 930001","Example Drive Disc 930002"])',
    )
    expect(catalog).toContain(
      'Object.freeze(["Example W-Engine 940001","Example W-Engine 940002"])',
    )
    expect(catalog).toContain(
      'Object.freeze(["Exampleboo 950001","Exampleboo 950002"])',
    )
    expect(catalog).toContain('Object.freeze(["960001","960002"])')
    expect(catalog).toContain(
      'import("@randomplay/data/integrated/agents/2/details.en.json", { with: { type: "json" } })',
    )
    expect(catalog).toContain(
      'import("@randomplay/data/integrated/drive-discs/930001/data.json", { with: { type: "json" } })',
    )
    expect(catalog).toContain(
      'import("@randomplay/data/integrated/w-engines/940001/data.json", { with: { type: "json" } })',
    )
    expect(catalog).toContain(
      'import("@randomplay/data/integrated/bangboos/950001/data.json", { with: { type: "json" } })',
    )
    expect(catalog).toContain(
      'import("@randomplay/data/integrated/monsters/960001/data.json", { with: { type: "json" } })',
    )
    for (const path of publicationFiles(index))
      expect(await fs.readFile(join(generated, "integrated", path))).toEqual(
        await fs.readFile(join(artifactDirectory, path)),
      )
    // Later source changes cannot change either generated names or the captured bytes.
    await fs.writeFile(
      join(artifactDirectory, "agents/2/details.en.json"),
      "invalid later source",
    )
    await fs.writeFile(
      join(artifactDirectory, "drive-discs/930001/details.en.json"),
      "invalid later source",
    )
    await fs.writeFile(
      join(artifactDirectory, "w-engines/940001/details.en.json"),
      "invalid later source",
    )
    await fs.writeFile(
      join(artifactDirectory, "bangboos/950001/details.en.json"),
      "invalid later source",
    )
    expect(await generateCatalog(join(generated, "integrated"), index)).toBe(
      catalog,
    )
    expect(await fs.readdir(dirname(artifactDirectory))).not.toContain(
      ".integrated.fairy-state",
    )
  })

  it("publishes the complete file list of every registered category", async () => {
    const root = await temporaryRoot()
    const rawRoot = join(root, "raw")
    const version = "synthetic-multi-category"
    const output = join(root, "output")
    await fs.mkdir(output)
    await writeSyntheticRaw({
      rawRoot,
      version,
      agentIds: ["10", "2"],
      widgetIds: ["9001", "9002"],
    })
    const build = await buildIntegratedSnapshot({
      rawRoot,
      version,
      temporaryParent: output,
      entities: [nanokaAgentsSnapshotEntity, syntheticSnapshotEntity],
    })
    // 显式期望清单：两个类别各自的全部成员文件加根索引，顺序无关。
    const expected = [
      "index.json",
      "agents/2/data.json",
      "agents/2/details.zh.json",
      "agents/2/details.en.json",
      "agents/10/data.json",
      "agents/10/details.zh.json",
      "agents/10/details.en.json",
      "widgets/9001/data.json",
      "widgets/9001/details.zh.json",
      "widgets/9001/details.en.json",
      "widgets/9002/data.json",
      "widgets/9002/details.zh.json",
      "widgets/9002/details.en.json",
    ].toSorted()
    const files = publicationFiles(build.index)
    expect(files).toContain("index.json")
    expect(files).toHaveLength(expected.length)
    expect(files.toSorted()).toEqual(expected)
    // 清单没有多余项：它逐项等于制品实际文件集合，且每项都是可读的普通文件。
    expect(
      Object.keys(await directoryFiles(build.artifactDirectory)).toSorted(),
    ).toEqual(expected)
    for (const path of files)
      expect(
        await fs.readFile(join(build.artifactDirectory, path)),
      ).toBeInstanceOf(Buffer)
  })

  it.each([undefined, "", null, 12, "Soldier 0 - Anby"])(
    "rejects invalid or duplicate names: %s",
    async (name) => {
      const { root, artifactDirectory, index } = await fixture()
      const path = "agents/2/details.en.json"
      const details = JSON.parse(
        await fs.readFile(join(artifactDirectory, path), "utf8"),
      )
      if (name === undefined) delete details.name
      else details.name = name
      const bytes = JSON.stringify(details)
      await fs.writeFile(join(artifactDirectory, path), bytes)
      index.entities.agents.members["2"].files.details.en.sha256 = sha256(
        Buffer.from(bytes),
      )
      await fs.writeFile(
        join(artifactDirectory, "index.json"),
        JSON.stringify(index),
      )
      await expect(
        preparePublication(artifactDirectory, join(root, "generated")),
      ).rejects.toThrow(/name/u)
    },
  )

  it.each([undefined, "", null, 12, "Example Drive Disc 930002"])(
    "rejects invalid or duplicate drive disc names: %s",
    async (name) => {
      const { root, artifactDirectory, index } = await fixture()
      const path = "drive-discs/930001/details.en.json"
      const details = JSON.parse(
        await fs.readFile(join(artifactDirectory, path), "utf8"),
      )
      if (name === undefined) delete details.name
      else details.name = name
      const bytes = JSON.stringify(details)
      await fs.writeFile(join(artifactDirectory, path), bytes)
      index.entities["drive-discs"].members["930001"].files.details.en.sha256 =
        sha256(Buffer.from(bytes))
      await fs.writeFile(
        join(artifactDirectory, "index.json"),
        JSON.stringify(index),
      )
      await expect(
        preparePublication(artifactDirectory, join(root, "generated")),
      ).rejects.toThrow(/name/u)
    },
  )

  it.each([undefined, "", null, 12, "Example W-Engine 940002"])(
    "rejects invalid or duplicate WEngine names: %s",
    async (name) => {
      const { root, artifactDirectory, index } = await fixture()
      const path = "w-engines/940001/details.en.json"
      const details = JSON.parse(
        await fs.readFile(join(artifactDirectory, path), "utf8"),
      )
      if (name === undefined) delete details.name
      else details.name = name
      const bytes = JSON.stringify(details)
      await fs.writeFile(join(artifactDirectory, path), bytes)
      index.entities["w-engines"].members["940001"].files.details.en.sha256 =
        sha256(Buffer.from(bytes))
      await fs.writeFile(
        join(artifactDirectory, "index.json"),
        JSON.stringify(index),
      )
      await expect(
        preparePublication(artifactDirectory, join(root, "generated")),
      ).rejects.toThrow(/name/u)
    },
  )

  it.each([undefined, "", null, 12, "Exampleboo 950002"])(
    "rejects invalid or duplicate bangboo names: %s",
    async (name) => {
      const { root, artifactDirectory, index } = await fixture()
      const path = "bangboos/950001/details.en.json"
      const details = JSON.parse(
        await fs.readFile(join(artifactDirectory, path), "utf8"),
      )
      if (name === undefined) delete details.name
      else details.name = name
      const bytes = JSON.stringify(details)
      await fs.writeFile(join(artifactDirectory, path), bytes)
      index.entities["bangboos"].members["950001"].files.details.en.sha256 =
        sha256(Buffer.from(bytes))
      await fs.writeFile(
        join(artifactDirectory, "index.json"),
        JSON.stringify(index),
      )
      await expect(
        preparePublication(artifactDirectory, join(root, "generated")),
      ).rejects.toThrow(/name/u)
    },
  )

  it("keeps every mapping independent when categories share an English name", async () => {
    const { artifactDirectory, index } = await fixture()
    const shared = "Shared Name"
    for (const [path, id] of [
      ["agents/2/details.en.json", "2"],
      ["drive-discs/930001/details.en.json", "930001"],
      ["w-engines/940001/details.en.json", "940001"],
      ["bangboos/950001/details.en.json", "950001"],
    ]) {
      const details = JSON.parse(
        await fs.readFile(join(artifactDirectory, path), "utf8"),
      )
      details.name = shared
      await fs.writeFile(join(artifactDirectory, path), JSON.stringify(details))
      expect(details.id).toBe(Number(id))
    }
    const catalog = await generateCatalog(artifactDirectory, index)
    // 重名检查只在各类别内：跨类别同名不拒绝，各套 union 与映射仍按各类别成员独立生成。
    expect(catalog).toContain(
      'export type AgentName = "Shared Name" | "Soldier 0 - Anby"',
    )
    expect(catalog).toContain(
      'export type DriveDiscName = "Shared Name" | "Example Drive Disc 930002"',
    )
    expect(catalog).toContain(
      'export type WEngineName = "Shared Name" | "Example W-Engine 940002"',
    )
    expect(catalog).toContain(
      'export type BangbooName = "Shared Name" | "Exampleboo 950002"',
    )
    expect(catalog).toContain('[["Shared Name","2"],["Soldier 0 - Anby","10"]]')
    expect(catalog).toContain(
      '[["Shared Name","930001"],["Example Drive Disc 930002","930002"]]',
    )
    expect(catalog).toContain(
      '[["Shared Name","940001"],["Example W-Engine 940002","940002"]]',
    )
    expect(catalog).toContain(
      '[["Shared Name","950001"],["Exampleboo 950002","950002"]]',
    )
  })

  it("rejects catalog generation without the drive-discs, w-engines, bangboos or monsters category", async () => {
    const root = await temporaryRoot()
    // agents-only v3 制品过不了发布复制前的完整类别验证；这里直接验证目录生成对缺失类别的要求。
    const { artifactDirectory, index } = await publicationFixture(root, {
      driveDiscs: false,
    })
    await expect(generateCatalog(artifactDirectory, index)).rejects.toThrow(
      /no drive-discs category/u,
    )
    const { index: complete } = await fixture()
    const withoutWEngines = structuredClone(complete)
    delete (withoutWEngines.entities as Record<string, unknown>)["w-engines"]
    await expect(
      generateCatalog(artifactDirectory, withoutWEngines),
    ).rejects.toThrow(/no w-engines category/u)
    const withoutBangboos = structuredClone(complete)
    delete (withoutBangboos.entities as Record<string, unknown>)["bangboos"]
    await expect(
      generateCatalog(artifactDirectory, withoutBangboos),
    ).rejects.toThrow(/no bangboos category/u)
    const withoutMonsters = structuredClone(complete)
    delete (withoutMonsters.entities as Record<string, unknown>)["monsters"]
    await expect(
      generateCatalog(artifactDirectory, withoutMonsters),
    ).rejects.toThrow(/no monsters category/u)
  })

  it("keeps ID catalog generation unaffected by duplicate or placeholder monster names", async () => {
    const { artifactDirectory, index } = await fixture()
    // Monster 公开身份是来源 ID：名称重名、占位名与空名称都不参与目录生成，也不触发类内唯一校验。
    for (const [id, name] of [
      ["960001", "OfficialName_"],
      ["960002", "OfficialName_"],
    ]) {
      const details = JSON.parse(
        await fs.readFile(
          join(artifactDirectory, `monsters/${id}/details.en.json`),
          "utf8",
        ),
      )
      details.name = name
      const bytes = JSON.stringify(details)
      await fs.writeFile(
        join(artifactDirectory, `monsters/${id}/details.en.json`),
        bytes,
      )
      index.entities["monsters"].members[id].files.details.en.sha256 = sha256(
        Buffer.from(bytes),
      )
    }
    await fs.writeFile(
      join(artifactDirectory, "index.json"),
      JSON.stringify(index),
    )
    const catalog = await generateCatalog(artifactDirectory, index)
    expect(catalog).toContain('export type MonsterId = "960001" | "960002"')
    expect(catalog).toContain('Object.freeze(["960001","960002"])')
  })

  it("preserves whitespace, punctuation and special property names exactly", async () => {
    const { artifactDirectory, index } = await fixture()
    for (const [id, name] of [
      ["2", ' A\'s "Name"! '],
      ["10", "__proto__"],
    ]) {
      const path = join(artifactDirectory, `agents/${id}/details.en.json`)
      await fs.writeFile(path, JSON.stringify({ name }))
    }
    for (const [id, name] of [
      ["930001", ' D\'s "Disc"! '],
      ["930002", "__proto__"],
    ]) {
      const path = join(artifactDirectory, `drive-discs/${id}/details.en.json`)
      await fs.writeFile(path, JSON.stringify({ name }))
    }
    for (const [id, name] of [
      ["940001", ' W\'s "Engine"! '],
      ["940002", "__proto__"],
    ]) {
      const path = join(artifactDirectory, `w-engines/${id}/details.en.json`)
      await fs.writeFile(path, JSON.stringify({ name }))
    }
    for (const [id, name] of [
      ["950001", ' B\'s "Boo"! '],
      ["950002", "__proto__"],
    ]) {
      const path = join(artifactDirectory, `bangboos/${id}/details.en.json`)
      await fs.writeFile(path, JSON.stringify({ name }))
    }
    const catalog = await generateCatalog(artifactDirectory, index)
    expect(catalog).toContain(JSON.stringify(' A\'s "Name"! '))
    expect(catalog).toContain(JSON.stringify(' D\'s "Disc"! '))
    expect(catalog).toContain(JSON.stringify(' W\'s "Engine"! '))
    expect(catalog).toContain(JSON.stringify(' B\'s "Boo"! '))
    expect(catalog).toContain('["__proto__","10"]')
    expect(catalog).toContain('["__proto__","930002"]')
    expect(catalog).toContain('["__proto__","940002"]')
    expect(catalog).toContain('["__proto__","950002"]')
  })

  it("rejects incomplete, corrupt or unregistered static snapshots", async () => {
    const { root, artifactDirectory } = await fixture()
    const path = join(artifactDirectory, "agents/2/data.json")
    const bytes = await fs.readFile(path)
    await fs.rm(path)
    await expect(
      preparePublication(artifactDirectory, join(root, "missing")),
    ).rejects.toThrow()
    await fs.writeFile(path, "{")
    await expect(
      preparePublication(artifactDirectory, join(root, "corrupt")),
    ).rejects.toThrow()
    await fs.writeFile(path, bytes)
    await fs.writeFile(join(artifactDirectory, "unexpected.json"), "{}")
    await expect(
      preparePublication(artifactDirectory, join(root, "extra")),
    ).rejects.toThrow(/未登记/u)
  })

  it("bounds copy reads when a source file grows after initial verification", async () => {
    const { root, artifactDirectory } = await fixture()
    const policy = await sourcePolicy.loadSourcePolicy()
    // A controlled budget far above the synthetic fixture (largest file ~4 KiB) keeps the growth small.
    policy.fetchLimits.maximumBytesPerRun = 4096
    vi.spyOn(sourcePolicy, "loadSourcePolicy").mockResolvedValue(policy)
    const generated = join(root, "generated")
    const relativePath = "agents/2/data.json"
    const maximumBytes =
      policy.fetchLimits.maximumBytesPerRun * outputExpansionLimit
    const writeFile = fs.writeFile
    let injected = false
    vi.spyOn(fs, "writeFile").mockImplementation(async (path, ...args) => {
      await writeFile(path, ...args)
      if (path === join(generated, "integrated/index.json")) {
        await writeFile(
          join(artifactDirectory, relativePath),
          " ".repeat(maximumBytes + 1),
        )
        injected = true
      }
    })
    await expect(
      preparePublication(artifactDirectory, generated),
    ).rejects.toThrow("字节数超过上限")
    expect(injected).toBe(true)
    // The oversized bytes must never reach the snapshot, even if its final verifier would reject them.
    await expect(
      fs.stat(join(generated, "integrated", relativePath)),
    ).rejects.toMatchObject({ code: "ENOENT" })
    await expect(fs.stat(join(generated, "catalog.ts"))).rejects.toMatchObject({
      code: "ENOENT",
    })
  })

  it("copies managed bytes while holding the existing lease and never initializes broken control state", async () => {
    const { root, rawRoot, version, index } = await fixture()
    const targetDirectory = join(root, "managed")
    await generateCurrentDataset({ rawRoot, version, targetDirectory })
    const control = join(root, ".managed.fairy-state")
    const state = await fs.readFile(join(control, "state.json"))
    const lock = await fs.stat(join(control, "lock.sqlite"))
    const writeFile = fs.writeFile
    let lockedCopies = 0
    vi.spyOn(fs, "writeFile").mockImplementation(async (path, ...args) => {
      if (String(path).includes("/generated/integrated/")) {
        await expect(
          withCurrentDataset(targetDirectory, async () => undefined),
        ).rejects.toMatchObject({ code: "BUSY" })
        lockedCopies++
      }
      return writeFile(path, ...args)
    })
    await preparePublication(targetDirectory, join(root, "generated"))
    // 持锁复制覆盖发布清单的每个文件（index.json 加全部登记类别的实体文件）。
    expect(lockedCopies).toBe(publicationFiles(index).length)
    expect(await fs.readFile(join(control, "state.json"))).toEqual(state)
    expect((await fs.stat(join(control, "lock.sqlite"))).ino).toBe(lock.ino)
    await fs.writeFile(join(control, "state.next"), "incomplete")
    await expect(
      preparePublication(targetDirectory, join(root, "blocked")),
    ).rejects.toThrow()
    expect(await fs.readFile(join(control, "state.next"), "utf8")).toBe(
      "incomplete",
    )
  })

  it("refuses a managed v2 dataset with an explicit migration requirement without touching its bytes", async () => {
    const root = await temporaryRoot()
    const { targetDirectory, control } = await managedLegacyV2Fixture(root)
    const datasetBefore = await fingerprints(targetDirectory)
    const controlBefore = await fingerprints(control)
    await expect(
      preparePublication(targetDirectory, join(root, "generated")),
    ).rejects.toThrow(/MIGRATION_REQUIRED: .*显式迁移命令/u)
    // 拒绝路径不得迁移、改写数据集或改动控制目录：逐文件字节、inode 与 mtime 全部不变。
    expect(await fingerprints(targetDirectory)).toEqual(datasetBefore)
    expect(await fingerprints(control)).toEqual(controlBefore)
    expect(
      JSON.parse(await fs.readFile(join(targetDirectory, "index.json"), "utf8"))
        .format,
    ).toBe(legacyV2Format)
    expect((await fs.readdir(control)).toSorted()).toEqual([
      "lock.sqlite",
      "state.json",
    ])
  })

  it("rejects root symlinks before bypassing a managed target's lease or recovery state", async () => {
    const { root, rawRoot, version } = await fixture()
    const targetDirectory = join(root, "managed")
    await generateCurrentDataset({ rawRoot, version, targetDirectory })
    const alias = join(root, "alias")
    await fs.symlink(targetDirectory, alias, "dir")
    await withCurrentDataset(targetDirectory, async () => {
      await expect(
        preparePublication(alias, join(root, "locked")),
      ).rejects.toThrow(/symbolic link/u)
    })
    await fs.writeFile(
      join(root, ".managed.fairy-state/state.next"),
      "incomplete",
    )
    await expect(
      preparePublication(alias, join(root, "recovery")),
    ).rejects.toThrow(/symbolic link/u)
  })

  it("rejects a static source that acquires control state while being copied", async () => {
    const { root, artifactDirectory } = await fixture()
    const generated = join(root, "generated")
    const control = join(
      dirname(artifactDirectory),
      `.${basename(artifactDirectory)}.fairy-state`,
    )
    const writeFile = fs.writeFile
    let injected = false
    vi.spyOn(fs, "writeFile").mockImplementation(async (path, ...args) => {
      if (path === join(generated, "integrated/index.json")) {
        await fs.mkdir(control)
        injected = true
      }
      return writeFile(path, ...args)
    })
    await expect(
      preparePublication(artifactDirectory, generated),
    ).rejects.toThrow(/became managed/u)
    expect(injected).toBe(true)
    expect(await fs.readdir(control)).toEqual([])
  })

  it.each(["entity bytes", "index sourceRecord"])(
    "rejects changed %s in the copied snapshot",
    async (changed) => {
      const { root, artifactDirectory } = await fixture()
      const generated = join(root, "generated")
      const target = join(
        generated,
        "integrated",
        changed === "entity bytes" ? "agents/2/data.json" : "index.json",
      )
      const writeFile = fs.writeFile
      let injected = false
      vi.spyOn(fs, "writeFile").mockImplementation(async (path, ...args) => {
        if (path === target) {
          const bytes = Buffer.from(args[0] as Uint8Array)
          if (changed === "entity bytes")
            args[0] = Buffer.concat([bytes, Buffer.from(" ")])
          else {
            const index = JSON.parse(bytes.toString())
            index.entities.agents.members["2"].sourceRecord.injected =
              "unverified change"
            args[0] = JSON.stringify(index)
          }
          injected = true
        }
        return writeFile(path, ...args)
      })
      await expect(
        preparePublication(artifactDirectory, generated),
      ).rejects.toThrow(changed === "entity bytes" ? /摘要/u : /构建结果/u)
      expect(injected).toBe(true)
    },
  )
})
