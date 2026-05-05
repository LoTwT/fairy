import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = join(import.meta.dirname, "../../..")
const snapshotId = "2026-05-05T0850Z"
const snapshotRoot = join(
  repoRoot,
  "data/source/raw/mihoyo/zzz-da",
  snapshotId,
)

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T
}

describe("Mihoyo Deadly Assault source snapshot", () => {
  it("passes offline hash, shape, and zh/en alignment verification", () => {
    execFileSync(
      "node",
      [
        "scripts/mihoyo-da-source.mjs",
        "verify",
        "--snapshot",
        snapshotId,
      ],
      {
        cwd: join(repoRoot, "packages/data"),
        stdio: ["ignore", "pipe", "pipe"],
      },
    )
  })

  it("records the required entry_page namespace header policy", () => {
    const manifest = readJson<{
      endpointPolicy: {
        requiredHeaders: Record<string, string>
        directHtmlPolicy: string
      }
      summary: {
        periodCount: number
        selectableBuffCount: number
        bossSlotCount: number
        blockingUnresolvedCount: number
      }
    }>(join(snapshotRoot, "fetch-manifest.json"))

    expect(manifest.endpointPolicy.requiredHeaders).toMatchObject({
      "x-rpc-wiki_app": "zzz",
    })
    expect(manifest.endpointPolicy.directHtmlPolicy).toContain("Nuxt page shell")
    expect(manifest.summary).toMatchObject({
      periodCount: 35,
      selectableBuffCount: 105,
      bossSlotCount: 105,
      blockingUnresolvedCount: 0,
    })
  })

  it("extracts latest-period selectable buffs and boss room texts from Mihoyo details", () => {
    const details = readJson<{
      periods: Array<{
        periodNumber: number
        title: string
        selectableBuffs: Array<{ name: string, effectTexts: string[] }>
        bossSlots: Array<{
          name: string
          weaknesses: string[]
          resistances: string[]
          detail: {
            fieldBuffTexts: string[]
            challengeTargetTexts: string[]
          }
        }>
      }>
    }>(join(snapshotRoot, "parsed/period-details.json"))
    const latest = details.periods[0]
    expect(latest).toBeDefined()

    expect(latest!).toMatchObject({
      periodNumber: 35,
      title: "危局强袭战（第35期）",
    })
    expect(latest!.selectableBuffs.map(buff => buff.name)).toEqual([
      "续变",
      "合击",
      "骤暝",
    ])
    expect(latest!.selectableBuffs.every(buff => buff.effectTexts.length > 0)).toBe(true)
    expect(latest!.bossSlots.map(boss => boss.name)).toEqual([
      "猎血清道夫",
      "太初梦魇·「始主」",
      "「亵渎者」",
    ])
    expect(latest!.bossSlots.every(boss => boss.detail.fieldBuffTexts.length > 0)).toBe(
      true,
    )
    expect(latest!.bossSlots.every(boss => boss.detail.challengeTargetTexts.length >= 4))
      .toBe(true)
  })

  it("aligns latest-period Mihoyo zh text with buhflipexplode English source anchors", () => {
    const alignment = readJson<{
      periods: Array<{
        title: string
        buffs: Array<{
          mihoyo: { name: string, effectTexts: string[] }
          buhflipexplode?: { buffId: string, name: string, effectText: string }
        }>
        bossSlots: Array<{
          mihoyo: { name: string, fieldBuffTexts: string[] }
          buhflipexplode?: { enemyId: string, name: string, descText: string }
        }>
      }>
      unresolved: Array<{ severity: string, reason: string }>
    }>(join(snapshotRoot, "alignment/mihoyo-buhflipexplode.json"))
    const latest = alignment.periods[0]
    expect(latest).toBeDefined()

    expect(latest!.title).toBe("危局强袭战（第35期）")
    expect(latest!.buffs.map(buff => [buff.mihoyo.name, buff.buhflipexplode?.name]))
      .toEqual([
        ["续变", "Metamorph"],
        ["合击", "Swift Strike"],
        ["骤暝", "Heartcrusher"],
      ])
    expect(latest!.bossSlots.map(slot => [slot.mihoyo.name, slot.buhflipexplode?.name]))
      .toEqual([
        ["猎血清道夫", "Sanguine Sweeper"],
        ["太初梦魇·「始主」", "Primordial Nightmare: \"The Creator\""],
        ["「亵渎者」", "The Defiler"],
      ])
    expect(latest!.buffs.every(buff =>
      buff.mihoyo.effectTexts.length > 0
      && (buff.buhflipexplode?.effectText.length ?? 0) > 0,
    )).toBe(true)
    expect(latest!.bossSlots.every(slot =>
      slot.mihoyo.fieldBuffTexts.length > 0
      && (slot.buhflipexplode?.descText.length ?? 0) > 0,
    )).toBe(true)
    expect(alignment.unresolved.every(issue => issue.severity !== "blocking"))
      .toBe(true)
    expect(alignment.unresolved.some(issue => issue.reason === "sourceConflict"))
      .toBe(true)
  })
})
