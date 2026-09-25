import type {
  Condition,
  ContributionOperation,
  ContributionRule,
  GeneralStatInput,
  RuleSet,
  StaticDamageInput,
  Unit,
} from "../../src/effects/index.ts"

export const literal = <U extends Unit>(unit: U, value: number) =>
  ({ kind: "literal", unit, value }) as const
export const always = { kind: "constant", value: true } as const
export const general = (baseValue: number): GeneralStatInput => ({
  baseValue,
  initialPercentage: [],
  initialFixed: [],
  finalPercentage: [],
  finalFixed: [],
})

export function rule(
  name: string,
  operation: ContributionOperation,
  when: Condition<"contribution"> = always,
): Extract<ContributionRule, { readonly scope: "hit" }> {
  return {
    kind: "contribution",
    effectId: `environment:static:${name}`,
    source: {
      identity: { kind: "environment", entityId: "static-tests" },
      section: "static-tests",
      references: [
        {
          sourceId: "fairy-spec",
          version: "1",
          locale: "zh",
          resourcePath: "docs/specs/effects/static-snapshot.md",
          pointer: "",
        },
      ],
    },
    config: always,
    parameters: {},
    activation: { kind: "supplied", maximumLayers: literal("count", 1) },
    scope: "hit",
    beneficiary: { kind: "holder" },
    when,
    operation,
  }
}

export function definitions(effects: RuleSet["effects"]): RuleSet {
  return {
    schemaVersion: 1,
    ruleSetId: "static-tests",
    revision: "1",
    effects,
    states: [],
    actions: [],
  }
}

export function inputFor(
  effects: readonly ContributionRule[] = [],
): StaticDamageInput {
  return {
    definitions: definitions(effects),
    bindings: [
      {
        kind: "environment",
        bindingId: "binding:static",
        holderId: "entity:attacker",
        sourceEntityId: "static-tests",
        eligible: true,
        configuration: {},
      },
    ],
    selections: effects.map((effect) => ({
      effectId: effect.effectId,
      bindingId: "binding:static",
      layers: 1,
    })),
    world: {
      entities: [
        {
          kind: "actor",
          entityId: "entity:attacker",
          teamId: "team:players",
          generalStats: {
            attack: general(1000),
            health: general(24000),
            impact: general(170),
            sheerForce: general(500),
            anomalyProficiency: general(300),
          },
          directStats: {
            criticalRate: { baseValue: 0.25, additions: [] },
            criticalDamage: { baseValue: 0.5, additions: [] },
            penetrationRatio: { baseValue: 0.1, additions: [] },
          },
        },
        {
          kind: "actor",
          entityId: "entity:enemy",
          teamId: "team:enemies",
          generalStats: {},
          directStats: {},
        },
      ],
      states: [],
      distances: [],
    },
    hit: {
      actorId: "entity:attacker",
      targetId: "entity:enemy",
      actionId: "action:basic",
      skillCategory: "basic",
      element: "fire",
      skillTags: [],
      damageItems: [{ itemId: "attack", damageMultiplier: 2, stat: "attack" }],
    },
    damage: {
      kind: "regular",
      damageBonus: [],
      defense: {
        attackerLevel: 60,
        targetBaseDefense: 1000,
        defensePercentageAdjustments: [],
        penetrationValues: [],
      },
      resistance: {
        targetResistance: 0,
        targetResistanceReductions: [],
        attackerResistanceIgnoreValues: [],
      },
      damageTaken: {
        targetDamageTakenIncreases: [],
        targetDamageTakenReductions: [],
      },
      stunDamage: {
        isTargetStunned: false,
        targetBaseStunDamageMultiplier: 1,
        targetStunDamageMultiplierAdjustments: [],
      },
    },
  }
}
