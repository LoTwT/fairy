import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  deriveNanokaBangbooElement,
  type NanokaBangbooElementSource,
} from "./index"

const repoRoot = join(import.meta.dirname, "../../..")

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(join(repoRoot, path), "utf8")) as T
}

describe("nanoka Bangboo element source artifact gate", () => {
  it("derives Plugboo electric attribute from approved live skill damage text", () => {
    const plugboo = readJson<NanokaBangbooElementSource>("data/source/raw/nanoka/zzz/2.8/zh/bangboo/54008.json")
    const artifact = deriveNanokaBangbooElement(plugboo, {
      sourceVersion: "2.8",
      bangbooId: 54008,
    })

    expect(artifact).toMatchObject({
      sourceVersion: "2.8",
      bangbooId: 54008,
      attribute: "electric",
      runtimeCutoverReady: false,
    })
    expect(artifact.evidence).toHaveLength(20)
    expect(new Set(artifact.evidence.map(item => item.skillKey))).toEqual(new Set(["a", "c"]))
    expect(new Set(artifact.evidence.map(item => item.rawLabel))).toEqual(new Set(["电"]))
    expect(artifact.evidence[0]).toMatchObject({
      skillKey: "a",
      level: 1,
      sourceName: "电流狙击",
      sourcePath: "/skill/a/level/1/desc",
    })
  })

  it("derives physical Bangboo attributes from colored physical damage text without the 属性 suffix", () => {
    const birkblick = readJson<NanokaBangbooElementSource>("data/source/raw/nanoka/zzz/2.8/zh/bangboo/54020.json")
    const artifact = deriveNanokaBangbooElement(birkblick, {
      sourceVersion: "2.8",
      bangbooId: 54020,
    })

    expect(artifact).toMatchObject({
      sourceVersion: "2.8",
      bangbooId: 54020,
      attribute: "physical",
      runtimeCutoverReady: false,
    })
    expect(new Set(artifact.evidence.map(item => item.rawLabel))).toEqual(new Set(["物理"]))
  })

  it("fails loud when the source id, damage text, or element evidence is invalid", () => {
    const plugboo = readJson<NanokaBangbooElementSource>("data/source/raw/nanoka/zzz/2.8/zh/bangboo/54008.json")
    const missingId = structuredClone(plugboo)
    const missingDamageText = structuredClone(plugboo)
    const conflictingElement = structuredClone(plugboo)

    delete missingId.id
    missingDamageText.skill = { b: missingDamageText.skill!.b! }
    conflictingElement.skill!.c!.level!["1"]!.desc = "造成<color=#FFFFFF>火属性伤害</color>。"

    expect(() => deriveNanokaBangbooElement(plugboo, { sourceVersion: "2.8", bangbooId: 54009 })).toThrow("id mismatch")
    expect(() => deriveNanokaBangbooElement(missingId, { sourceVersion: "2.8", bangbooId: 54008 })).toThrow("id")
    expect(() => deriveNanokaBangbooElement(missingDamageText, { sourceVersion: "2.8", bangbooId: 54008 })).toThrow("Missing nanoka Bangboo element damage text")
    expect(() => deriveNanokaBangbooElement(conflictingElement, { sourceVersion: "2.8", bangbooId: 54008 })).toThrow("Conflicting nanoka Bangboo element evidence")
  })
})
