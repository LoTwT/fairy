import { inputFor } from "./static-fixtures.ts"

export const effectsPackageSmoke = `import assert from "node:assert/strict"
import {
  parseEffectRuleSet,
  prepareEffects,
  calculateStaticDamage,
} from "@randomplay/core"

const ruleSet = {
  schemaVersion: 1,
  ruleSetId: "smoke",
  revision: "1",
  effects: [
    {
      kind: "contribution",
      effectId: "agent:1311:core:attack-conversion",
      source: {
        identity: { kind: "agent", entityId: "1311" },
        section: "core-passive",
        references: [
          {
            sourceId: "nanoka-zzz",
            version: "3.1",
            locale: "zh",
            resourcePath: "zzz/3.1/zh/character/1311.json",
            pointer: "/passive/level/1311507/desc/0",
          },
        ],
      },
      config: {
        kind: "compare-number",
        unit: "count",
        operator: "gte",
        left: { kind: "configuration-number", unit: "count", field: "coreSkillLevel" },
        right: { kind: "literal", unit: "count", value: 1 },
      },
      parameters: {
        ratio: {
          kind: "by-rank",
          unit: "ratio",
          rank: "coreSkillLevel",
          values: { 1: 0.22, 2: 0.24, 3: 0.26, 4: 0.28, 5: 0.3, 6: 0.32, 7: 0.35 },
        },
        cap: { kind: "constant", unit: "attack-points", value: 1200 },
      },
      activation: { kind: "supplied" },
      beneficiary: { kind: "holder-and-trigger-actor" },
      when: { kind: "constant", value: true },
      scope: "entity",
      operation: {
        kind: "stat-adjustment",
        stat: "attack",
        stage: "final-fixed",
        value: {
          kind: "minimum",
          unit: "attack-points",
          operands: [
            {
              kind: "multiply",
              unit: "attack-points",
              coefficient: { kind: "parameter", unit: "ratio", name: "ratio" },
              value: {
                kind: "stat",
                unit: "attack-points",
                entity: { role: "holder" },
                stat: "attack",
                stage: "initial",
                at: "evaluation",
              },
            },
            { kind: "parameter", unit: "attack-points", name: "cap" },
          ],
        },
      },
    },
    {
      kind: "modification",
      effectId: "agent:1311:mindscape-2:core-enhancement",
      source: {
        identity: { kind: "agent", entityId: "1311" },
        section: "mindscape-2",
        references: [
          {
            sourceId: "nanoka-zzz",
            version: "3.1",
            locale: "zh",
            resourcePath: "zzz/3.1/zh/character/1311.json",
            pointer: "/talent/2/desc",
          },
        ],
      },
      config: {
        kind: "compare-number",
        unit: "count",
        operator: "gte",
        left: { kind: "configuration-number", unit: "count", field: "mindscapeRank" },
        right: { kind: "literal", unit: "count", value: 2 },
      },
      parameters: {},
      phase: "configuration",
      target: { kind: "effect", effectId: "agent:1311:core:attack-conversion" },
      modifications: [
        {
          field: "parameter",
          name: "ratio",
          unit: "ratio",
          change: { operator: "add", value: { kind: "literal", unit: "ratio", value: 0.19 } },
        },
        {
          field: "parameter",
          name: "cap",
          unit: "attack-points",
          change: { operator: "add", value: { kind: "literal", unit: "attack-points", value: 400 } },
        },
      ],
    },
  ],
  states: [],
  actions: [],
}

const parsed = parseEffectRuleSet(ruleSet)
assert.equal(parsed.ok, true)
const prepared = prepareEffects(parsed.value, [
  {
    kind: "agent",
    bindingId: "binding:astra",
    holderId: "entity:astra",
    sourceEntityId: "1311",
    eligible: true,
    configuration: { mindscapeRank: 2, coreSkillLevel: 7 },
  },
])
assert.equal(prepared.ok, true)
assert.equal(prepared.value.ruleSetId, "smoke")
assert.equal(prepared.value.revision, "1")
assert.deepEqual(prepared.value.stateParameters, [])

const staticDamage = calculateStaticDamage(${JSON.stringify(inputFor())})
assert.equal(staticDamage.ok, true)
assert.equal(staticDamage.value.nonCritical, 2000 * (794 / 1694))
assert.equal(staticDamage.value.critical, staticDamage.value.nonCritical * 1.5)

const rejected = parseEffectRuleSet({ schemaVersion: 2 })
assert.equal(rejected.ok, false)
`
