import { describe, expect, it } from "vitest"
import {
  calculateStaticDamage,
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../core/src/effects/index.ts"
import type {
  MindscapeRank,
  StaticCatalogDamageInput,
  StaticDamageInput,
  StaticEffectCatalog,
} from "../../core/src/effects/types.ts"
import { resolveAgentAction } from "../src/skills/resolve.ts"
import type { AgentActions } from "../src/skills/types.ts"
import actionsJson from "../definitions/skills/agents/1221.json" with { type: "json" }
import definitionsJson from "../definitions/effects/static.json" with { type: "json" }
import catalogJson from "../definitions/effects/static-catalog.json" with { type: "json" }
import {
  makeYanagiPolarityRequest,
  yanagiPolarityMigrations,
} from "./fixtures/yanagi-polarity-consumer.ts"

const parsed = parseEffectRuleSet(definitionsJson)
if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues))
const catalog = catalogJson as unknown as StaticEffectCatalog
const input = (kind: "disorder" | "vortex" = "disorder") =>
  makeYanagiPolarityRequest(parsed.value, catalog, kind)
const optionIdFor = (migration: (typeof yanagiPolarityMigrations)[number]) =>
  `agents:yanagi:mindscape:${migration.rank}:${migration.blockId}:${migration.sourceEffectId}`
function rankInput(
  rank: MindscapeRank,
): ReturnType<typeof makeYanagiPolarityRequest> {
  const request = input()
  return {
    ...request,
    bindings: request.bindings.map((binding) =>
      binding.kind === "agent"
        ? {
            ...binding,
            configuration: { ...binding.configuration, mindscapeRank: rank },
          }
        : binding,
    ),
  }
}
function regular(
  request: ReturnType<typeof makeYanagiPolarityRequest>,
): StaticCatalogDamageInput {
  const { damage } = request
  return {
    ...request,
    damage: {
      kind: "regular",
      damageBonus: damage.damageBonus,
      defense: { ...damage.defense, attackerLevel: 60 },
      resistance: damage.resistance,
      damageTaken: damage.damageTaken,
      stunDamage: damage.stunDamage,
    },
  }
}

describe("Yanagi polarity legacy isolation", () => {
  it.each(yanagiPolarityMigrations)(
    "rejects $sourceEffectId on a legal nonzero $kind request",
    (migration) => {
      const input = makeYanagiPolarityRequest(
        parsed.value,
        catalog,
        migration.kind,
      )
      const baseline = calculateStaticDamageFromCatalog(input)
      expect(baseline.ok, JSON.stringify(baseline)).toBe(true)
      if (!baseline.ok) throw new Error(JSON.stringify(baseline.issues))
      expect(baseline.value.nonCritical).toBeCloseTo(4000)
      expect(baseline.value.evaluation.contributions).toHaveLength(0)
      const optionId = `agents:yanagi:mindscape:${migration.rank}:${migration.blockId}:${migration.sourceEffectId}`
      const result = calculateStaticDamageFromCatalog({
        ...input,
        selections: [{ optionId, bindingId: "binding:yanagi", layers: 1 }],
      })
      // 在未修复版本上先验证确有错误数值贡献，再由下方拒绝契约产生红测。
      // 这里的常数来自来源记录与独立手算，不读取生成规则作为期望值。
      if (result.ok) {
        expect(result.value.nonCritical).toBeCloseTo(
          4000 * (1 + migration.legacyIncrease),
        )
        expect(result.value.nonCritical).toBeGreaterThan(
          baseline.value.nonCritical,
        )
        expect(
          result.value.evaluation.contributions.some(
            (c) =>
              c.origin.effectId ===
                `agent:1221:zzz-hp:${migration.sourceEffectId}:${migration.blockId}:mindscape:${migration.rank}` &&
              c.value.value === migration.legacyIncrease,
          ),
        ).toBe(true)
      }
      expect(result.ok, JSON.stringify(result)).toBe(false)
      if (!result.ok) {
        expect(result.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              code: "INVALID_INPUT",
              message: expect.stringContaining(`semantic-conflict:`),
            }),
          ]),
        )
        expect(
          result.issues.some(
            (issue) =>
              issue.message.includes(optionId) &&
              issue.message.includes(migration.pointer),
          ),
        ).toBe(true)
      }
    },
  )

  it.each(
    yanagiPolarityMigrations.flatMap((migration) =>
      [0, 1, 2].flatMap((layers) =>
        (["disorder", "vortex"] as const).map((kind) => ({
          migration,
          identity: migration.sourceEffectId,
          layers,
          kind,
        })),
      ),
    ),
  )(
    "rejects $identity at $layers layers on $kind with its identity and source",
    ({ migration, layers, kind }) => {
      const optionId = optionIdFor(migration)
      const request = rankInput(migration.rank)
      const result = calculateStaticDamageFromCatalog({
        ...request,
        damage: { ...request.damage, kind },
        selections: [{ optionId, bindingId: "binding:yanagi", layers }],
      })
      expect(result.ok).toBe(false)
      if (result.ok) throw new Error("Legacy option must be rejected")
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "INVALID_INPUT",
            pointer: "/selections/0",
            message: expect.stringContaining(`semantic-conflict:`),
          }),
        ]),
      )
      expect(
        result.issues.some(
          (issue) =>
            issue.message.includes(optionId) &&
            issue.message.includes(migration.pointer),
        ),
      ).toBe(true)
    },
  )

  it.each(
    [3, 5, 6, 7].flatMap((mask) => [0, 1].map((layers) => ({ mask, layers }))),
  )(
    "rejects combination $mask including every selected identity at $layers layers",
    ({ mask, layers }) => {
      const selections = yanagiPolarityMigrations
        .filter((_, index) => (mask & (1 << index)) !== 0)
        .map((migration) => ({
          optionId: optionIdFor(migration),
          bindingId: "binding:yanagi" as const,
          layers,
        }))
      const result = calculateStaticDamageFromCatalog({
        ...input(),
        selections,
      })
      expect(result.ok).toBe(false)
      if (result.ok) throw new Error("Combination must be rejected")
      for (const [index, selection] of selections.entries())
        expect(
          result.issues.some(
            (issue) =>
              issue.code === "INVALID_INPUT" &&
              issue.pointer === `/selections/${index}` &&
              issue.message.includes(selection.optionId) &&
              issue.message.includes("semantic-conflict"),
          ),
        ).toBe(true)
    },
  )

  it.each(
    yanagiPolarityMigrations.flatMap((migration) =>
      [0, 1].map((layers) => ({
        migration,
        identity: migration.sourceEffectId,
        layers,
      })),
    ),
  )(
    "rejects the removed low-level rule $identity at $layers layers under the existing input contract",
    ({ migration, layers }) => {
      const request = regular(input())
      const { catalog: _catalog, actorSources: _actors, ...base } = request
      const { skillTargetIds: _targets, ...hit } = base.hit
      const effectId =
        `agent:1221:zzz-hp:${migration.sourceEffectId}:${migration.blockId}:mindscape:${migration.rank}` as const
      const low: StaticDamageInput = {
        ...base,
        hit: {
          ...hit,
          damageItems: [
            { itemId: "base", stat: "attack", damageMultiplier: 2 },
          ],
        },
        damage: {
          kind: "regular",
          damageBonus: [],
          defense: {
            attackerLevel: 60,
            targetBaseDefense: 0,
            defensePercentageAdjustments: [],
            penetrationValues: [],
          },
          resistance: base.damage.resistance,
          damageTaken: base.damage.damageTaken,
          stunDamage: base.damage.stunDamage,
        },
        selections: [],
      }
      const baseline = calculateStaticDamage(low)
      expect(baseline.ok, JSON.stringify(baseline)).toBe(true)
      if (baseline.ok) expect(baseline.value.nonCritical).toBe(2000)
      const result = calculateStaticDamage({
        ...low,
        selections: [{ effectId, bindingId: "binding:yanagi", layers }],
      })
      expect(result.ok).toBe(false)
      if (!result.ok && layers === 0) {
        expect(result.issues).toEqual([
          expect.objectContaining({
            code: "INVALID_INPUT",
            pointer: "/selections/0/layers",
          }),
        ])
        return
      }
      if (!result.ok)
        expect(result.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              code: "MISSING_REFERENCE",
              pointer: "/selections/0/effectId",
              message: expect.stringContaining(effectId),
              effectId,
              bindingId: "binding:yanagi",
            }),
          ]),
        )
    },
  )

  it.each(yanagiPolarityMigrations)(
    "keeps binding and cultivation identity for $sourceEffectId",
    (migration) => {
      const optionId = optionIdFor(migration)
      const selection = {
        optionId,
        bindingId: "binding:yanagi" as const,
        layers: 1,
      }
      expect(
        catalog.options.find((option) => option.optionId === optionId)!
          .variants[0]!.configuration,
      ).toEqual({ minimumMindscape: migration.rank })
      const wrongActor = {
        ...input(),
        actorSources: [
          { entityId: "entity:yanagi" as const, agentEntityId: "1011" },
        ],
      }
      const wrongBinding = {
        ...input(),
        bindings: input().bindings.map((binding) => ({
          ...binding,
          sourceEntityId: "1011",
        })),
      }
      for (const request of [wrongActor, wrongBinding]) {
        const result = calculateStaticDamageFromCatalog({
          ...request,
          selections: [selection],
        })
        expect(result.ok).toBe(false)
        if (!result.ok)
          expect(
            result.issues.some((issue) => issue.code === "CONTEXT_MISMATCH"),
          ).toBe(true)
      }
      const locked = calculateStaticDamageFromCatalog({
        ...rankInput(0),
        selections: [selection],
      })
      expect(locked.ok).toBe(false)
      if (!locked.ok)
        expect(
          locked.issues.some(
            (issue) =>
              issue.message.includes("semantic-conflict") &&
              issue.message.includes(optionId),
          ),
        ).toBe(true)
    },
  )

  it("retains the independent M6 special bonus and its cultivation refusal", () => {
    const optionId =
      "agents:yanagi:mindscape:6:blk-ms4qn0z7-6fc8g6:eff-ms4qn0z7-u05br2"
    const selections = [
      { optionId, bindingId: "binding:yanagi" as const, layers: 1 },
    ]
    const base = calculateStaticDamageFromCatalog(regular(input()))
    expect(base.ok).toBe(true)
    if (base.ok) expect(base.value.nonCritical).toBe(2000)
    const result = calculateStaticDamageFromCatalog({
      ...regular(input()),
      selections,
    })
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (result.ok) {
      expect(result.value.nonCritical).toBe(2400)
      expect(result.value.evaluation.contributions).toHaveLength(1)
    }
    const locked = calculateStaticDamageFromCatalog({
      ...regular(rankInput(2)),
      selections,
    })
    expect(locked.ok).toBe(false)
    if (!locked.ok)
      expect(
        locked.issues.some(
          (issue) =>
            issue.code === "CONTEXT_MISMATCH" &&
            issue.message.includes("not unlocked"),
        ),
      ).toBe(true)
  })

  it("retains Yanagi M1 proficiency and stance damage as nonzero controls", () => {
    for (const [optionId, expected] of [
      ["agents:yanagi:mindscape:1:blk-legacy:legacy-self-mastery", 7200],
      ["agents:yanagi:mindscape:0:blk-legacy:legacy-self-dmgBonus", 4400],
    ] as const) {
      const result = calculateStaticDamageFromCatalog({
        ...input(),
        selections: [{ optionId, bindingId: "binding:yanagi", layers: 1 }],
      })
      expect(result.ok, JSON.stringify(result)).toBe(true)
      if (result.ok) {
        expect(result.value.nonCritical).toBeCloseTo(expected)
        expect(result.value.evaluation.contributions.length).toBeGreaterThan(0)
      }
    }
  })

  it.each(
    ([0, 2, 6] as const).flatMap((rank) =>
      ["0017", "0022", "0023"].map((suffix) => ({ rank, suffix })),
    ),
  )(
    "keeps main direct action $suffix nonzero at M$rank without polarity damage",
    ({ rank, suffix }) => {
      const action = resolveAgentAction({
        agent: actionsJson as AgentActions,
        actionId: `action:agent:1221:action:${suffix}`,
        mindscapeRank: rank,
        levels: {
          chain: { mode: "effective", value: 12 },
          special: { mode: "effective", value: 12 },
        },
      })
      expect(action.ok).toBe(true)
      if (!action.ok || action.calculation.kind !== "damage")
        throw new Error("Main action must resolve")
      expect(action.calculation.segments.length).toBeGreaterThan(0)
      for (const segment of action.calculation.segments) {
        expect(segment.damageItems.length).toBeGreaterThan(0)
        expect(
          segment.damageItems.every((item) => item.stat === "attack"),
        ).toBe(true)
        const request = regular(rankInput(rank))
        const [firstItem, ...remainingItems] = segment.damageItems.map(
          (item) => ({
            ...item,
            mode: "direct" as const,
            role: "base" as const,
            statSource: { entityId: "entity:yanagi" as const },
          }),
        )
        if (!firstItem) throw new Error("Main action requires a damage item")
        const result = calculateStaticDamageFromCatalog({
          ...request,
          hit: {
            ...request.hit,
            actionId: action.actionId,
            skillCategory: action.skillCategory!,
            skillTargetIds: action.skillTargetIds,
            skillTags: action.skillTags,
            element: segment.element,
            damageItems: [firstItem, ...remainingItems],
          },
        })
        expect(result.ok, JSON.stringify(result)).toBe(true)
        if (result.ok) {
          expect(result.value.nonCritical).toBeGreaterThan(0)
          expect(result.value.evaluation.contributions).toHaveLength(0)
        }
      }
    },
  )

  it.each(["0018", "0024"])(
    "keeps polarity additive action %s unavailable",
    (suffix) => {
      const action = resolveAgentAction({
        agent: actionsJson as AgentActions,
        actionId: `action:agent:1221:action:${suffix}`,
        mindscapeRank: 6,
        levels: {
          chain: { mode: "effective", value: 12 },
          special: { mode: "effective", value: 12 },
        },
      })
      expect(action.ok).toBe(false)
      expect(
        actionsJson.actions.find((entry) =>
          entry.actionId.endsWith(`:${suffix}`),
        )!.calculation,
      ).toMatchObject({ kind: "unavailable" })
    },
  )
})
