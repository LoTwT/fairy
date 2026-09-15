import * as fs from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, dirname, join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  generateCatalog,
  preparePublication,
  publicationFiles,
} from "../scripts/prepare-publication.ts"
import {
  generateNanokaAgents,
  withNanokaCurrentDataset,
} from "../scripts/nanoka-integration/current.ts"
import { sha256 } from "../scripts/nanoka-integration/files.ts"
import { publicationFixture } from "./fixtures/publication.ts"

vi.mock("node:fs/promises", async (original) => ({
  ...(await original<typeof import("node:fs/promises")>()),
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
async function fixture() {
  const root = await fs.mkdtemp(join(tmpdir(), "fairy-publication-"))
  temporaryDirectories.push(root)
  return { root, ...(await publicationFixture(root)) }
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
    expect(catalog).toContain('[["Astra Yao","2"],["Soldier 0 - Anby","10"]]')
    expect(catalog).toContain('Object.freeze(["Astra Yao","Soldier 0 - Anby"])')
    expect(catalog).toContain(
      'import("@randomplay/data/integrated/agents/2/details.en.json", { with: { type: "json" } })',
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
    expect(await generateCatalog(join(generated, "integrated"), index)).toBe(
      catalog,
    )
    expect(await fs.readdir(dirname(artifactDirectory))).not.toContain(
      ".integrated.fairy-state",
    )
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
      index.agents["2"].files.content.en.sha256 = sha256(Buffer.from(bytes))
      await fs.writeFile(
        join(artifactDirectory, "index.json"),
        JSON.stringify(index),
      )
      await expect(
        preparePublication(artifactDirectory, join(root, "generated")),
      ).rejects.toThrow(/name/u)
    },
  )

  it("preserves whitespace, punctuation and special property names exactly", async () => {
    const { artifactDirectory, index } = await fixture()
    for (const [id, name] of [
      ["2", ' A\'s "Name"! '],
      ["10", "__proto__"],
    ]) {
      const path = join(artifactDirectory, `agents/${id}/details.en.json`)
      await fs.writeFile(path, JSON.stringify({ name }))
    }
    const catalog = await generateCatalog(artifactDirectory, index)
    expect(catalog).toContain(JSON.stringify(' A\'s "Name"! '))
    expect(catalog).toContain('["__proto__","10"]')
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

  it("copies managed bytes while holding the existing lease and never initializes broken control state", async () => {
    const { root, rawRoot, version } = await fixture()
    const targetDirectory = join(root, "managed")
    await generateNanokaAgents({ rawRoot, version, targetDirectory })
    const control = join(root, ".managed.fairy-state")
    const state = await fs.readFile(join(control, "state.json"))
    const lock = await fs.stat(join(control, "lock.sqlite"))
    const writeFile = fs.writeFile
    let lockedCopies = 0
    vi.spyOn(fs, "writeFile").mockImplementation(async (path, ...args) => {
      if (String(path).includes("/generated/integrated/")) {
        await expect(
          withNanokaCurrentDataset(targetDirectory, async () => undefined),
        ).rejects.toMatchObject({ code: "BUSY" })
        lockedCopies++
      }
      return writeFile(path, ...args)
    })
    await preparePublication(targetDirectory, join(root, "generated"))
    expect(lockedCopies).toBe(7)
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

  it("rejects root symlinks before bypassing a managed target's lease or recovery state", async () => {
    const { root, rawRoot, version } = await fixture()
    const targetDirectory = join(root, "managed")
    await generateNanokaAgents({ rawRoot, version, targetDirectory })
    const alias = join(root, "alias")
    await fs.symlink(targetDirectory, alias, "dir")
    await withNanokaCurrentDataset(targetDirectory, async () => {
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
            index.agents["2"].sourceRecord.injected = "unverified change"
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
