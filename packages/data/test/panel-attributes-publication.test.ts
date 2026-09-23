import { cp, mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises"
import * as fs from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { IntegratedSnapshotIndex } from "../src/integration/snapshot-types.ts"
import { verifyPanelAttributes } from "../scripts/panel-attributes/manifest.ts"
import {
  prepareDefinitions,
  verifyDefinitionsCopy,
} from "../scripts/prepare-definitions.ts"
import { preparePublication } from "../scripts/prepare-publication.ts"
import { generatePanelAttributes } from "../scripts/generate-panel-attributes.ts"
import { generateStaticEffects } from "../scripts/generate-static-effects.ts"
import { installCandidateOutputDirectory } from "../scripts/candidate-output.ts"

vi.mock("node:fs/promises", async (original) => ({
  ...(await original<typeof import("node:fs/promises")>()),
}))

const roots: string[] = []
afterEach(async () => {
  vi.restoreAllMocks()
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true })
})
const definitions = new URL("../definitions", import.meta.url)
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "fairy-panel-publication-"))
  roots.push(root)
  const index = JSON.parse(
    await readFile(
      new URL("../.generated/integrated/index.json", import.meta.url),
      "utf8",
    ),
  ) as IntegratedSnapshotIndex
  await cp(definitions, join(root, "definitions"), { recursive: true })
  return { root, index, attributes: join(root, "definitions/attributes") }
}

describe("panel attribute publication", () => {
  it("validates all members, ignores unrelated categories and detects consumed source changes", async () => {
    const { index, attributes } = await fixture()
    const manifest = await verifyPanelAttributes(attributes, index)
    expect(manifest.members.agents).toHaveLength(58)
    expect(manifest.members.wEngines).toHaveLength(95)
    index.entities.monsters.memberIds = []
    await verifyPanelAttributes(attributes, index)
    index.entities.agents.members["1311"].files.data.sha256 = "0".repeat(64)
    await expect(verifyPanelAttributes(attributes, index)).rejects.toThrow(
      /source hashes/,
    )
    index.entities.agents.memberIds.pop()
    await expect(verifyPanelAttributes(attributes, index)).rejects.toThrow(
      /members/,
    )
  })

  it("rejects corrupt, missing, stale-rule or unexpected output and keeps frozen definitions independent", async () => {
    const { root, index, attributes } = await fixture()
    const frozen = join(root, "frozen")
    await prepareDefinitions(join(root, "definitions"), frozen, index)
    const file = join(attributes, "agents/1311.json")
    await writeFile(file, "{}")
    await expect(verifyPanelAttributes(attributes, index)).rejects.toThrow(
      /checksum/,
    )
    await verifyPanelAttributes(join(frozen, "attributes"), index)
    await expect(
      verifyDefinitionsCopy(frozen, join(root, "definitions")),
    ).rejects.toThrow(/mismatch/)
    await rm(file)
    await expect(verifyPanelAttributes(attributes, index)).rejects.toThrow(
      /membership/,
    )
    const manifestPath = join(attributes, "manifest.json")
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"))
    manifest.rulesVersion = "obsolete"
    await writeFile(manifestPath, JSON.stringify(manifest))
    await expect(verifyPanelAttributes(attributes, index)).rejects.toThrow(
      /rules version/,
    )
    await writeFile(join(frozen, "attributes/unexpected.json"), "{}")
    await expect(
      verifyPanelAttributes(join(frozen, "attributes"), index),
    ).rejects.toThrow(/membership/)
  })

  it.each(["replace", "add", "remove"] as const)(
    "rejects definitions changed during capture: %s",
    async (change) => {
      const { root, index } = await fixture()
      const source = join(root, "definitions")
      const next = join(root, "definitions-next")
      const frozen = join(root, "frozen")
      await cp(source, next, { recursive: true })
      if (change === "replace") {
        for (const path of [
          "effects/static-catalog.json",
          "effects/static.json",
        ]) {
          const file = join(next, path)
          const data = JSON.parse(await readFile(file, "utf8"))
          data.revision = "2"
          await writeFile(file, JSON.stringify(data))
        }
      } else if (change === "add") {
        await writeFile(join(next, "effects/added.json"), "{}")
      } else {
        await rm(join(next, "effects/static-catalog.json"))
      }
      const originalWriteFile = fs.writeFile
      let replaced = false
      vi.spyOn(fs, "writeFile").mockImplementation(async (path, ...args) => {
        await originalWriteFile(path, ...args)
        if (path === join(frozen, "effects/static-catalog.json")) {
          await fs.rename(source, join(root, "definitions-old"))
          await fs.rename(next, source)
          replaced = true
        }
      })
      await expect(prepareDefinitions(source, frozen, index)).rejects.toThrow(
        /definitions artifact.*mismatch/,
      )
      expect(replaced).toBe(true)
    },
  )

  it.each([
    ["integrated", false],
    ["integrated", true],
    [".integrated.fairy-state", false],
    [".integrated.fairy-state", true],
  ] as const)(
    "rejects candidate paths inside %s before reading sources or creating directories (alias: %s)",
    async (protectedName, alias) => {
      const root = await fs.realpath(
        await mkdtemp(join(tmpdir(), "fairy-candidate-path-")),
      )
      roots.push(root)
      const integrated = join(root, "integrated")
      const protectedRoot = join(root, protectedName)
      await mkdir(integrated)
      await mkdir(protectedRoot, { recursive: true })
      await writeFile(join(protectedRoot, "keep.txt"), "keep")
      const parent = alias ? join(root, "alias") : protectedRoot
      if (alias) await fs.symlink(protectedRoot, parent, "dir")
      const before = await fs.readdir(root, { recursive: true })
      for (const generate of [generatePanelAttributes, generateStaticEffects]) {
        await expect(
          generate(root, join(parent, "candidates", "new"), integrated),
        ).rejects.toThrow(/outside integrated and its control directory/)
        expect(await fs.readdir(root, { recursive: true })).toEqual(before)
        expect(await readFile(join(protectedRoot, "keep.txt"), "utf8")).toBe(
          "keep",
        )
      }
    },
  )

  it("rejects candidates that would create a control directory but allows sibling paths", async () => {
    const root = await fs.realpath(
      await mkdtemp(join(tmpdir(), "fairy-candidate-path-")),
    )
    roots.push(root)
    const integrated = join(root, "integrated")
    await mkdir(integrated)
    for (const generate of [generatePanelAttributes, generateStaticEffects]) {
      for (const name of [
        ".integrated.fairy-state",
        ".INTEGRATED.FAIRY-STATE",
        ".integrated.fairy-ſtate",
        ".integrated.fairy-ﬅate",
        ".integrated.fairy-ﬆate",
      ]) {
        const control = join(root, name)
        for (const output of [control, join(control, "candidates", "new")]) {
          await expect(generate(root, output, integrated)).rejects.toThrow(
            /outside integrated and its control directory/,
          )
          await expect(fs.lstat(control)).rejects.toMatchObject({
            code: "ENOENT",
          })
        }
      }
      // Sibling names are not descendants; they proceed to source validation.
      await expect(
        generate(root, join(root, "integrated-candidates", "new"), integrated),
      ).rejects.toThrow(/affixDriveDiscConfig|ENOENT/)
      expect(await fs.readdir(root)).toEqual(["integrated"])
    }
  })

  it.each(["integrated", ".integrated.fairy-state"])(
    "rejects a final %s symlink before touching its target",
    async (protectedName) => {
      const root = await fs.realpath(
        await mkdtemp(join(tmpdir(), "fairy-candidate-symlink-")),
      )
      roots.push(root)
      const integrated = join(root, "integrated")
      const target = join(root, "actual")
      await mkdir(target)
      await writeFile(join(target, "keep.txt"), "keep")
      if (protectedName !== "integrated") await mkdir(integrated)
      await fs.symlink(target, join(root, protectedName), "dir")
      const before = await fs.readdir(root, { recursive: true })
      for (const generate of [generatePanelAttributes, generateStaticEffects]) {
        await expect(
          generate(root, join(target, "candidates", "new"), integrated),
        ).rejects.toThrow(/must not be symbolic links/)
        expect(await fs.readdir(root, { recursive: true })).toEqual(before)
        expect(await readFile(join(target, "keep.txt"), "utf8")).toBe("keep")
      }
    },
  )

  it("preserves the first candidate when another installer encounters its empty reservation", async () => {
    const root = await mkdtemp(join(tmpdir(), "fairy-candidate-install-"))
    roots.push(root)
    const output = join(root, "output")
    const first = join(root, "attributes")
    const second = join(root, "effects")
    await mkdir(first)
    await mkdir(second)
    await writeFile(join(first, "manifest.json"), "attributes")
    await writeFile(join(second, "static.json"), "effects")
    const originalMkdir = fs.mkdir
    let contested = false
    vi.spyOn(fs, "mkdir").mockImplementation(async (path, ...args) => {
      const result = await originalMkdir(path, ...args)
      if (path === output) {
        expect(await fs.readdir(output)).toEqual([])
        await expect(
          installCandidateOutputDirectory(second, output),
        ).rejects.toMatchObject({ code: "EEXIST" })
        expect(await fs.readdir(output)).toEqual([])
        contested = true
      }
      return result
    })
    await installCandidateOutputDirectory(first, output)
    expect(contested).toBe(true)
    expect(await fs.readdir(output)).toEqual(["manifest.json"])
    expect(await readFile(join(output, "manifest.json"), "utf8")).toBe(
      "attributes",
    )
    expect(await readFile(join(second, "static.json"), "utf8")).toBe("effects")
  })

  it("cleans only an acquired output when moving a candidate fails", async () => {
    const root = await mkdtemp(join(tmpdir(), "fairy-candidate-install-"))
    roots.push(root)
    const candidate = join(root, "candidate")
    const output = join(root, "output")
    await mkdir(candidate)
    await writeFile(join(candidate, "first.json"), "first")
    await writeFile(join(candidate, "second.json"), "second")
    const originalRename = fs.rename
    let moved = 0
    vi.spyOn(fs, "rename").mockImplementation(async (...args) => {
      if (moved === 1) throw new Error("candidate move failed")
      await originalRename(...args)
      moved++
    })
    await expect(
      installCandidateOutputDirectory(candidate, output),
    ).rejects.toThrow("candidate move failed")
    expect(moved).toBe(1)
    await expect(fs.lstat(output)).rejects.toMatchObject({ code: "ENOENT" })
    expect(await fs.readdir(candidate)).toHaveLength(1)
  })

  it("can acquire sources despite obsolete definitions, and refuses replacing an existing candidate", async () => {
    const { root, attributes } = await fixture()
    await writeFile(join(attributes, "manifest.json"), "{}")
    await preparePublication(
      new URL("../.generated/integrated", import.meta.url).pathname,
      join(root, "new-source"),
    )
    const output = join(root, "candidate")
    await mkdir(output)
    await writeFile(join(output, "keep.txt"), "keep")
    await expect(generatePanelAttributes(root, output)).rejects.toThrow(
      /already exists/,
    )
    expect(await readFile(join(output, "keep.txt"), "utf8")).toBe("keep")
    await expect(
      generatePanelAttributes(root, join(root, "new-candidate")),
    ).rejects.toThrow(/affixDriveDiscConfig/)
  })
})
