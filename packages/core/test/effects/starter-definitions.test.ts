import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { calculateFinalStat } from "../../src/formulas.ts"
import {
  advanceEffects,
  evaluateEffects,
  parseEffectRuleSet,
  prepareEffects,
  supplyEffectState,
} from "../../src/effects/index.ts"
import type {
  EffectState,
  EvaluationInput,
  PreparedEffects,
  SourceBinding,
  StateInput,
  RuleSet,
  WorldObservation,
} from "../../src/effects/index.ts"

/** data 导出的首批正式规则集；打包验收验证 dist 字节与该来源一致。 */
const definitionsPath = new URL(
  "../../../data/definitions/effects/starter.json",
  import.meta.url,
)
const starterDefinitions = JSON.parse(
  readFileSync(fileURLToPath(definitionsPath), "utf8"),
) as unknown

const automaticDefinitions = JSON.parse(
  readFileSync(
    new URL(
      "../../../data/definitions/effects/automatic.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as RuleSet
const combinedDefinitions = {
  ...(starterDefinitions as RuleSet),
  ruleSetId: "consumer:starter-and-automatic",
  revision: "1",
  effects: [
    ...(starterDefinitions as RuleSet).effects,
    ...automaticDefinitions.effects,
  ],
  states: [
    ...(starterDefinitions as RuleSet).states,
    ...automaticDefinitions.states,
  ],
  actions: [
    ...(starterDefinitions as RuleSet).actions,
    ...automaticDefinitions.actions,
  ],
}

function prepareStarter(
  bindings: readonly SourceBinding[],
  combined: boolean,
): PreparedEffects {
  const parsed = parseEffectRuleSet(
    combined ? combinedDefinitions : starterDefinitions,
  )
  expect(parsed.ok).toBe(true)
  if (!parsed.ok) {
    throw new Error("starter definitions must parse")
  }
  const prepared = prepareEffects(parsed.value, [
    ...bindings,
    {
      kind: "w-engine",
      bindingId: "binding:weapon",
      holderId: "entity:astra",
      sourceEntityId: "14131",
      eligible: true,
      configuration: { refinement: 1 },
    },
  ])
  expect(prepared.ok).toBe(true)
  if (!prepared.ok) {
    throw new Error("prepare must succeed")
  }
  return prepared.value
}

const holderWorld: WorldObservation = {
  entities: [
    {
      kind: "actor",
      entityId: "entity:astra",
      teamId: "team:one",
      generalStats: {
        attack: {
          baseValue: 3000,
          initialPercentage: [],
          initialFixed: [],
          finalPercentage: [],
          finalFixed: [],
        },
      },
      directStats: {},
    },
    {
      kind: "actor",
      entityId: "entity:attacker",
      teamId: "team:one",
      generalStats: {
        attack: {
          baseValue: 2000,
          initialPercentage: [],
          initialFixed: [],
          finalPercentage: [],
          finalFixed: [],
        },
      },
      directStats: {
        criticalRate: { baseValue: 0.05, additions: [] },
      },
    },
  ],
  states: [],
  distances: [],
}

function supplyAstraCoreState(
  prepared: PreparedEffects,
  sessionId: `session:${string}`,
): EffectState {
  const input: StateInput = {
    sessionId,
    atSeconds: 0,
    instances: [
      {
        instanceId: "instance:astra-core",
        effectId: "agent:1311:core:attack-conversion",
        bindingId: "binding:astra",
        beneficiaryIds: ["entity:astra", "entity:attacker"],
        stackKey: [],
        lifetime: { kind: "supplied" },
        layers: [
          {
            layerId: "layer:astra-core",
            startedAt: 0,
            expiresAt: null,
            trigger: null,
          },
        ],
      },
    ],
    snapshots: [],
    cooldowns: [],
    eventHistory: { processedIds: [], last: null },
  }
  const state = supplyEffectState(prepared, input)
  expect(state.ok).toBe(true)
  if (!state.ok) {
    throw new Error("state supply must succeed")
  }
  return state.value
}

describe.each([false, true])(
  "starter definitions cross-package acceptance (combined=%s)",
  (combined) => {
    it("keeps the rule set identity and revision", () => {
      const parsed = parseEffectRuleSet(starterDefinitions)
      expect(parsed.ok).toBe(true)
      if (!parsed.ok) {
        throw new Error("starter definitions must parse")
      }
      expect(parsed.value.ruleSetId).toBe("starter-effects")
      expect(parsed.value.revision).toBe("1")
      expect(parsed.value.effects).toHaveLength(3)
      expect(parsed.value.effects.map((effect) => effect.effectId)).toEqual([
        "agent:1311:core:attack-conversion",
        "agent:1311:mindscape-2:core-enhancement",
        "disc:31000:two-piece:critical-rate",
      ])
    })

    for (const mindscapeRank of [0, 1, 2, 3, 4, 5, 6]) {
      it(`astra core level 7 with initial attack 3000 at mindscape ${mindscapeRank}`, () => {
        const prepared = prepareStarter(
          [
            {
              kind: "agent",
              bindingId: "binding:astra",
              holderId: "entity:astra",
              sourceEntityId: "1311",
              eligible: true,
              configuration: { mindscapeRank, coreSkillLevel: 7 },
            } as never,
          ],
          combined,
        )
        const state = supplyAstraCoreState(
          prepared,
          `session:starter-${mindscapeRank}` as `session:${string}`,
        )
        const transition = advanceEffects(prepared, state, {
          event: {
            kind: "entry",
            eventId: "event:combined-entry",
            atSeconds: 0,
            sequence: 0,
            actorId: "entity:attacker",
            entryAction: "chain",
          },
          before: holderWorld,
          after: holderWorld,
          observedSnapshots: [],
        } as const)
        if (!transition.ok) throw new Error(JSON.stringify(transition.issues))
        expect(transition.value.requests).toHaveLength(combined ? 1 : 0)
        if (combined)
          expect(transition.value.requests[0]).toMatchObject({
            effectId: "w-engine:14131:energy-on-entry",
            bindingId: "binding:weapon",
            beneficiaryId: "entity:astra",
            baseAmount: { unit: "energy-points", value: 5 },
          })
        const result = evaluateEffects(prepared, transition.value.state, {
          kind: "panel",
          atSeconds: 0,
          world: holderWorld,
          observedSnapshots: [],
          entities: ["entity:attacker"],
          stats: ["attack"],
        } as EvaluationInput)
        expect(result.ok).toBe(true)
        if (!result.ok) {
          throw new Error("evaluation must succeed")
        }
        const core = result.value.contributions.find(
          (contribution) =>
            contribution.origin.effectId ===
            "agent:1311:core:attack-conversion",
        )
        expect(core).toBeDefined()
        const expectedContribution = mindscapeRank <= 1 ? 1050 : 1600
        expect(core!.value.value).toBeCloseTo(expectedContribution, 9)
        // 用 core 的属性公式从原始输入与获选贡献组装最终攻击力。
        const finalAttack = calculateFinalStat({
          initialStat: 2000,
          finalStatPercentageAdjustments: [],
          finalStatFixedValueAdjustments: [core!.value.value],
        })
        expect(finalAttack).toBeCloseTo(mindscapeRank <= 1 ? 3050 : 3600, 9)
        const panel = result.value.attributes.find(
          (attribute) =>
            attribute.entityId === "entity:attacker" &&
            attribute.stat === "attack",
        )
        expect(panel?.value.value).toBeCloseTo(finalAttack, 9)
      })
    }

    for (const setPieces of [0, 1, 2, 4]) {
      it(`woodpecker two-piece critical rate at ${setPieces} pieces`, () => {
        const prepared = prepareStarter(
          [
            {
              kind: "drive-disc",
              bindingId: "binding:woodpecker",
              holderId: "entity:attacker",
              sourceEntityId: "31000",
              eligible: true,
              configuration: { setPieces },
            } as never,
          ],
          combined,
        )
        const state = supplyEffectState(prepared, {
          sessionId: "session:starter-woodpecker",
          atSeconds: 0,
          instances: [],
          snapshots: [],
          cooldowns: [],
          eventHistory: { processedIds: [], last: null },
        })
        expect(state.ok).toBe(true)
        if (!state.ok) {
          throw new Error("state supply must succeed")
        }
        const result = evaluateEffects(prepared, state.value, {
          kind: "panel",
          atSeconds: 0,
          world: holderWorld,
          observedSnapshots: [],
          entities: ["entity:attacker"],
          stats: ["criticalRate"],
        } as EvaluationInput)
        expect(result.ok).toBe(true)
        if (!result.ok) {
          throw new Error("evaluation must succeed")
        }
        const twoPiece = result.value.contributions.filter(
          (contribution) =>
            contribution.origin.effectId ===
            "disc:31000:two-piece:critical-rate",
        )
        const expected = setPieces >= 2 ? 0.08 : 0
        expect(twoPiece).toHaveLength(expected === 0 ? 0 : 1)
        if (expected !== 0) {
          expect(twoPiece[0]!.value.value).toBeCloseTo(expected, 12)
        }
        const criticalRate = result.value.attributes.find(
          (attribute) => attribute.stat === "criticalRate",
        )
        expect(criticalRate?.value.value).toBeCloseTo(0.05 + expected, 12)
      })
    }

    it("keeps only starter-verified clauses in the formal rule set", () => {
      const parsed = parseEffectRuleSet(starterDefinitions)
      expect(parsed.ok).toBe(true)
      if (!parsed.ok) {
        throw new Error("starter definitions must parse")
      }
      for (const effect of parsed.value.effects) {
        expect(effect.effectId).not.toContain("1211")
        expect(effect.effectId).not.toContain("14131")
      }
      expect(parsed.value.states).toHaveLength(0)
      expect(parsed.value.actions).toHaveLength(0)
    })
  },
)
