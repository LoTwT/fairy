import {
  cp,
  mkdtemp,
  readFile,
  rm,
  writeFile,
  readdir,
  mkdir,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import type { IntegratedSnapshotIndex } from "../src/integration/snapshot-types.ts"
import { verifyAgentActions } from "../scripts/skills/manifest.ts"
import { generateAgentActions } from "../scripts/generate-agent-actions.ts"

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true })
})
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "fairy-action-publication-"))
  roots.push(root)
  const index = JSON.parse(
    await readFile(
      new URL("../.generated/integrated/index.json", import.meta.url),
      "utf8",
    ),
  ) as IntegratedSnapshotIndex
  const actions = join(root, "skills")
  const catalog = join(root, "static-catalog.json")
  await cp(new URL("../definitions/skills", import.meta.url), actions, {
    recursive: true,
  })
  await cp(
    new URL("../definitions/effects/static-catalog.json", import.meta.url),
    catalog,
  )
  return { root, index, actions, catalog }
}

describe("action publication contract", () => {
  it("validates all members and rejects source or effect-target drift while ignoring unrelated categories", async () => {
    const { index, actions, catalog } = await fixture()
    const manifest = await verifyAgentActions(actions, index, catalog)
    expect(manifest.coverage).toEqual({
      agents: 58,
      actions: 1256,
      damage: 962,
      dazeOnly: 161,
      luminize: 4,
      unavailable: 129,
      individualHitActions: 1,
    })
    index.entities.monsters.memberIds = []
    await verifyAgentActions(actions, index, catalog)
    await writeFile(catalog, "{}")
    await expect(verifyAgentActions(actions, index, catalog)).rejects.toThrow(
      /static catalog hash/,
    )
    index.entities.agents.members["1031"]!.files.details.zh!.sha256 =
      "0".repeat(64)
    await expect(verifyAgentActions(actions, index, catalog)).rejects.toThrow(
      /source hashes/,
    )
  })
  it("rejects changed artifacts, membership and stale semantic registry metadata", async () => {
    const { index, actions, catalog } = await fixture()
    const path = join(actions, "agents/1031.json")
    await writeFile(path, "{}")
    await expect(verifyAgentActions(actions, index, catalog)).rejects.toThrow(
      /checksum/,
    )
    await rm(path)
    await expect(verifyAgentActions(actions, index, catalog)).rejects.toThrow(
      /membership/,
    )
    const manifestPath = join(actions, "manifest.json")
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"))
    manifest.registrySha256 = "0".repeat(64)
    await writeFile(manifestPath, JSON.stringify(manifest))
    await expect(verifyAgentActions(actions, index, catalog)).rejects.toThrow(
      /registry hash/,
    )
  })
  it("rejects protected candidate destinations before touching sources or control state", async () => {
    const root = await mkdtemp(join(tmpdir(), "fairy-action-output-"))
    roots.push(root)
    const integrated = join(root, "integrated")
    await mkdir(integrated)
    const before = await readdir(root, { recursive: true })
    for (const path of [
      join(integrated, "new"),
      join(root, ".integrated.fairy-state", "new"),
    ]) {
      await expect(
        generateAgentActions(root, path, integrated),
      ).rejects.toThrow(/outside integrated and its control directory/)
      expect(await readdir(root, { recursive: true })).toEqual(before)
    }
  })
})
