import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"
import {
  calculationDataVersion,
  staticPanelRules,
} from "../.generated/calculation-data.ts"
import { resolveAgentAction } from "../src/skills/resolve.ts"
import { calculateStaticActionDamage } from "../../core/src/static/calculate.ts"
import type {
  StaticActionCalculationInput,
  StaticActorConfiguration,
} from "../../core/src/static/types.ts"
import type { StaticCalculationData } from "@randomplay/shared"

const json = async (path: string) =>
  JSON.parse(
    await readFile(
      new URL(`../.generated/definitions/${path}`, import.meta.url),
      "utf8",
    ),
  )

const emptyDiscs = {
  1: null,
  2: null,
  3: null,
  4: null,
  5: null,
  6: null,
} as const

async function fixture(
  extraInitialAnomalyMastery: number,
): Promise<StaticActionCalculationInput> {
  const attributes = await json("attributes/agents/1511.json")
  attributes.baseAttributes.anomalyMastery.value += extraInitialAnomalyMastery
  const actions = await json("skills/agents/1511.json")
  const data: StaticCalculationData = {
    version: calculationDataVersion,
    agents: [{ attributes, actions }],
    wEngines: [],
    driveDiscAffixes: await json("attributes/drive-disc-affixes.json"),
    definitions: await json("effects/static.json"),
    catalog: await json("effects/static-catalog.json"),
    panelRules: staticPanelRules,
  }
  const action = data.agents[0]!.actions.actions.find(
    (a) =>
      a.calculation.kind === "damage" &&
      a.skillCategory &&
      a.inputs.length === 0,
  )!
  return {
    data,
    actors: [
      {
        entityId: "entity:actor",
        teamId: "team:players",
        agentEntityId: "1511",
        mindscapeRank: 0,
        coreSkillLevel: 7,
        wEngine: null,
        driveDiscs: emptyDiscs,
        panel: { mode: "equipment" },
      } satisfies StaticActorConfiguration,
    ],
    actorId: "entity:actor",
    action: resolveAgentAction({
      agent: actions,
      actionId: action.actionId,
      mindscapeRank: 0,
      levels: {
        basic: { mode: "trained", value: 12 },
        dodge: { mode: "trained", value: 12 },
        assist: { mode: "trained", value: 12 },
        special: { mode: "trained", value: 12 },
        chain: { mode: "trained", value: 12 },
      },
    }),
    target: {
      entityId: "entity:target",
      teamId: "team:enemies",
      baseDefense: 1000,
      resistances: {
        "physical": 0,
        "fire": 0,
        "ice": 0,
        "electric": 0,
        "ether": 0,
        "auric-ink": 0,
        "wind": 0,
        "frost": 0,
        "lumiflux": 0,
      },
      isStunned: false,
      baseStunDamageMultiplier: 1,
    },
    selections: [],
  }
}

function statValue(
  panel: { stats: Record<string, unknown> },
  key: string,
): number {
  const stat = panel.stats[key] as { value: number }
  return stat.value
}

describe("南宫玉初始异常掌控转冲击力常驻转化", () => {
  it("初始异常掌控每超出 110 点使冲击力提升 1 点", async () => {
    const base = await fixture(0)
    const baseResult = calculateStaticActionDamage(base)
    expect(baseResult.ok, JSON.stringify(baseResult)).toBe(true)
    if (!baseResult.ok) return
    const basePanel = baseResult.value.panels[0]!
    const baseImpact = statValue(basePanel, "impact")
    const baseMastery = statValue(basePanel, "anomalyMastery")
    expect(baseMastery).toBeGreaterThan(110)

    const shifted = await fixture(50)
    const shiftedResult = calculateStaticActionDamage(shifted)
    expect(shiftedResult.ok, JSON.stringify(shiftedResult)).toBe(true)
    if (!shiftedResult.ok) return
    const shiftedPanel = shiftedResult.value.panels[0]!
    expect(statValue(shiftedPanel, "anomalyMastery") - baseMastery).toBe(50)
    expect(statValue(shiftedPanel, "impact") - baseImpact).toBe(50)

    // 基准快照：120 基础冲击力 + (126 − 110) 转化
    expect(baseImpact).toBe(136)
  })
})
