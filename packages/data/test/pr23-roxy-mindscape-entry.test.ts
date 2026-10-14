import { describe, expect, it } from "vitest"
import { loadStaticCalculationData, resolveAgentAction } from "../src/index.ts"
import { calculateStaticDamageFromCatalog } from "../../core/src/effects/index.ts"
import type { StaticCatalogDamageInput } from "../../core/src/effects/types.ts"
import { calculateStaticActionDamage } from "../../core/src/static/calculate.ts"
import type {
  StaticActionCalculationInput,
  StaticActorConfiguration,
} from "../../core/src/static/types.ts"
import type { MindscapeRank } from "@randomplay/shared"
import {
  makeRoxyMindscapeRequest,
  roxyMindscapeOptions,
} from "./fixtures/roxy-mindscape-consumer.ts"

const loaded = await loadStaticCalculationData({
  agents: ["Roxy", "Qingyi"],
  wEngines: [],
})
const roxy = loaded.agents.find((entry) => entry.actions.entityId === "1621")!
const ultimateId = "action:agent:1621:action:0013"
const ultimateOption = roxyMindscapeOptions[3]
const targetId = "zzz-hp:skill:roxy-requiem-for-the-night-burial"
function nonempty<T>(items: readonly T[]): readonly [T, ...T[]] {
  const first = items[0]
  if (first === undefined) throw new Error("empty damage items")
  return [first, ...items.slice(1)]
}
const resolve = (actionId: string, mindscapeRank: MindscapeRank = 6) =>
  resolveAgentAction({
    agent: roxy.actions,
    actionId,
    mindscapeRank,
    levels: {
      basic: { mode: "effective", value: 12 },
      dodge: { mode: "effective", value: 12 },
      assist: { mode: "effective", value: 12 },
      special: { mode: "effective", value: 12 },
      chain: { mode: "effective", value: 12 },
    },
  })

describe("Roxy real action identities and M4 consumption", () => {
  it("accounts for all 24 real actions without changing supported categories", () => {
    expect(roxy.actions.actions.map((action) => action.actionId)).toEqual(
      Array.from(
        { length: 24 },
        (_, index) =>
          `action:agent:1621:action:${String(index + 1).padStart(4, "0")}`,
      ),
    )
    expect(
      roxy.actions.actions.filter(
        (action) => action.calculation.kind === "damage",
      ),
    ).toHaveLength(17)
    expect(
      roxy.actions.actions
        .filter((action) => action.calculation.kind === "daze-only")
        .map((action) => action.actionId),
    ).toEqual(
      ["0002", "0004", "0005", "0006"].map(
        (suffix) => `action:agent:1621:action:${suffix}`,
      ),
    )
    expect(
      roxy.actions.actions
        .filter((action) => action.calculation.kind === "unavailable")
        .map((action) => action.actionId),
    ).toEqual(
      ["0022", "0023", "0024"].map(
        (suffix) => `action:agent:1621:action:${suffix}`,
      ),
    )
  })
  it.each(roxy.actions.actions)(
    "resolves and classifies $actionId / $rowName",
    (action) => {
      expect(action.inputs).toEqual([])
      const resolved = resolve(action.actionId)
      if (action.calculation.kind === "unavailable") {
        expect(resolved).toEqual({
          ok: false,
          issues: [
            {
              code: "unknown-category",
              message: "该动作的伤害增益分类尚未核实；培养类别不代替伤害分类。",
            },
          ],
        })
        return
      }
      expect(resolved.ok, JSON.stringify(resolved)).toBe(true)
      if (!resolved.ok) throw new Error(JSON.stringify(resolved.issues))
      expect(resolved.actionId).toBe(action.actionId)
      expect(resolved.calculation.kind).toBe(action.calculation.kind)
      expect(resolved.skillCategory).toBe(action.skillCategory)
      expect(resolved.skillTargetIds).toEqual(
        action.actionId === ultimateId ? [targetId] : [],
      )
      if (resolved.calculation.kind === "daze-only") {
        expect(resolved.dazeMultiplier).toBeGreaterThan(0)
        return
      }
      if (resolved.calculation.kind !== "damage")
        throw new Error("unexpected action kind")
      if (resolved.skillCategory === null)
        throw new Error("unverified damage category")
      expect(resolved.calculation.segments.length).toBeGreaterThan(0)
      const input = makeRoxyMindscapeRequest(loaded.definitions, loaded.catalog)
      for (const segment of resolved.calculation.segments) {
        expect(segment.damageItems.length).toBeGreaterThan(0)
        expect(segment.repeat).toBeGreaterThan(0)
        const request: StaticCatalogDamageInput = {
          ...input,
          hit: {
            ...input.hit,
            actionId: resolved.actionId,
            skillCategory: resolved.skillCategory,
            skillTargetIds: resolved.skillTargetIds,
            element: segment.element,
            damageItems: nonempty(
              segment.damageItems.map((item) => ({
                ...item,
                mode: "direct" as const,
                role: "base" as const,
                statSource: { entityId: "entity:roxy" as const },
              })),
            ),
          },
        }
        const closed = calculateStaticDamageFromCatalog(request)
        const selected = calculateStaticDamageFromCatalog({
          ...request,
          selections: [
            { optionId: ultimateOption, bindingId: "binding:roxy", layers: 1 },
          ],
        })
        expect(closed.ok, JSON.stringify(closed)).toBe(true)
        expect(selected.ok, JSON.stringify(selected)).toBe(true)
        if (!closed.ok || !selected.ok)
          throw new Error("real action calculation failed")
        expect(closed.value.expected).toBeGreaterThan(0)
        expect(selected.value.expected / closed.value.expected).toBeCloseTo(
          action.actionId === ultimateId ? 1.2 : 1,
          12,
        )
      }
    },
  )
  it("uses the original 42.633 ultimate multiplier and an additive 0.20 bonus", () => {
    const action = resolve(ultimateId)
    if (
      !action.ok ||
      action.calculation.kind !== "damage" ||
      action.skillCategory === null
    )
      throw new Error("ultimate unavailable")
    const segment = action.calculation.segments[0]!
    expect(segment.damageItems[0]!.damageMultiplier).toBeCloseTo(42.633, 12)
    const input = makeRoxyMindscapeRequest(loaded.definitions, loaded.catalog)
    const request: StaticCatalogDamageInput = {
      ...input,
      damage: { ...input.damage, damageBonus: [0.3] },
      hit: {
        ...input.hit,
        actionId: action.actionId,
        skillCategory: action.skillCategory,
        skillTargetIds: action.skillTargetIds,
        element: segment.element,
        damageItems: nonempty(
          segment.damageItems.map((item) => ({
            ...item,
            mode: "direct" as const,
            role: "base" as const,
            statSource: { entityId: "entity:roxy" as const },
          })),
        ),
      },
      selections: [
        {
          optionId: ultimateOption,
          bindingId: "binding:roxy" as const,
          layers: 1,
        },
      ],
    }
    const result = calculateStaticDamageFromCatalog(request)
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    expect(result.value.factors.nonCritical["damageBonus"]).toBe(1.5)
    expect(result.value.nonCritical).toBeCloseTo(
      1000 * 42.633 * 1.5 * 0.7 * 1.5,
      8,
    )
    expect(result.value.expected).toBeCloseTo(
      1000 * 42.633 * 1.5 * 0.7 * 1.5 * 1.125,
      8,
    )
  })
  const actor = (
    entityId: "entity:roxy" | "entity:other",
    agentEntityId: string,
    mindscapeRank: MindscapeRank,
  ): StaticActorConfiguration => ({
    entityId,
    teamId: "team:players",
    agentEntityId,
    coreSkillLevel: 7,
    mindscapeRank,
    wEngine: null,
    driveDiscs: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
    panel: { mode: "equipment" },
  })
  const highRequest = (): StaticActionCalculationInput => {
    const action = resolve(ultimateId)
    if (!action.ok) throw new Error(JSON.stringify(action.issues))
    return {
      data: loaded,
      actors: [
        actor("entity:roxy", "1621", 6),
        actor("entity:other", "1251", 0),
      ],
      actorId: "entity:roxy",
      action,
      target: {
        entityId: "entity:enemy",
        teamId: "team:enemies",
        baseDefense: 1000,
        resistances: {
          "physical": 0.1,
          "fire": 0.2,
          "ice": 0.2,
          "electric": 0.2,
          "ether": 0.2,
          "auric-ink": 0.2,
          "wind": 0.3,
          "frost": 0.2,
          "lumiflux": 0.2,
        },
        isStunned: true,
        baseStunDamageMultiplier: 1.5,
      },
      selections: [],
    }
  }
  it("carries the registered target through the full static action entry", () => {
    const input = highRequest()
    const closed = calculateStaticActionDamage(input)
    const selected = calculateStaticActionDamage({
      ...input,
      selections: [
        { holderId: "entity:roxy", optionId: ultimateOption, layers: 1 },
      ],
    })
    expect(closed.ok, JSON.stringify(closed)).toBe(true)
    expect(selected.ok, JSON.stringify(selected)).toBe(true)
    if (
      !closed.ok ||
      !selected.ok ||
      closed.value.kind !== "damage" ||
      selected.value.kind !== "damage"
    )
      throw new Error("wrong result")
    expect(closed.value.totals.expected).toBeGreaterThan(0)
    expect(
      selected.value.totals.expected / closed.value.totals.expected,
    ).toBeCloseTo(1.2, 12)
    expect(
      selected.value.segments[0]!.damage.evaluation.contributions.some(
        (value) =>
          value.origin.effectId === "agent:1621:nanoka:m4-ultimate-damage",
      ),
    ).toBe(true)
  })
  it("does not benefit Qingyi's real ultimate through the full entry", () => {
    const input = highRequest()
    const qingyi = loaded.agents.find(
      (entry) => entry.actions.entityId === "1251",
    )!
    const registered = qingyi.actions.actions.find(
      (action) =>
        action.skillCategory === "ultimate" &&
        action.calculation.kind === "damage" &&
        action.inputs.length === 0,
    )!
    expect(registered).toBeDefined()
    const action = resolveAgentAction({
      agent: qingyi.actions,
      actionId: registered.actionId,
      mindscapeRank: 0,
      levels: { chain: { mode: "effective", value: 12 } },
    })
    if (!action.ok) throw new Error(JSON.stringify(action.issues))
    const request = { ...input, actorId: "entity:other" as const, action }
    const closed = calculateStaticActionDamage(request)
    const selected = calculateStaticActionDamage({
      ...request,
      selections: [
        { holderId: "entity:roxy", optionId: ultimateOption, layers: 1 },
        {
          holderId: "entity:roxy",
          optionId: roxyMindscapeOptions[4],
          layers: 1,
        },
      ],
    })
    expect(closed.ok, JSON.stringify(closed)).toBe(true)
    expect(selected.ok, JSON.stringify(selected)).toBe(true)
    if (
      !closed.ok ||
      !selected.ok ||
      closed.value.kind !== "damage" ||
      selected.value.kind !== "damage"
    )
      throw new Error("wrong result")
    expect(closed.value.totals.expected).toBeGreaterThan(0)
    expect(selected.value.totals.expected).toBe(closed.value.totals.expected)
  })
  it("additional full entry combines own M1/M2/M6 with separate attribution", () => {
    const input = highRequest()
    const closed = calculateStaticActionDamage(input)
    const result = calculateStaticActionDamage({
      ...input,
      selections: [
        roxyMindscapeOptions[0],
        roxyMindscapeOptions[2],
        roxyMindscapeOptions[4],
      ].map((optionId) => ({
        holderId: "entity:roxy" as const,
        optionId,
        layers: 1,
      })),
    })
    expect(closed.ok, JSON.stringify(closed)).toBe(true)
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (
      !closed.ok ||
      !result.ok ||
      closed.value.kind !== "damage" ||
      result.value.kind !== "damage"
    )
      throw new Error("wrong result")
    expect(closed.value.totals.expected).toBeGreaterThan(0)
    expect(
      result.value.totals.expected / closed.value.totals.expected,
    ).toBeCloseTo((1 / 0.7) * (1.8 / 1.5), 12)
    const contributions =
      result.value.segments[0]!.damage.evaluation.contributions
    for (const slug of [
      "m1-hit-resistance-reduction",
      "m2-stun-damage",
      "m6-wind-resistance-ignore",
    ])
      expect(contributions).toContainEqual(
        expect.objectContaining({
          origin: expect.objectContaining({
            effectId: `agent:1621:nanoka:${slug}`,
            bindingId: "binding:entity:roxy:agent:1621",
            beneficiaryId: "entity:roxy",
          }),
        }),
      )
  })
})
