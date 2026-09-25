import type { SourceBinding } from "../../src/effects/index.ts"

/** 测试夹具按运行时校验的目标形状构造；类型检查由规范附件与包内正式类型另行覆盖。 */
const always = { kind: "constant", value: true } as const
const literal = (unit: string, value: number) =>
  ({ kind: "literal", unit, value }) as const

function atLeast(field: string, value: number) {
  return {
    kind: "compare-number",
    unit: "count",
    operator: "gte",
    left: { kind: "configuration-number", unit: "count", field },
    right: literal("count", value),
  }
}

export const astraSource = {
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
}

export const astraCore = {
  kind: "contribution",
  effectId: "agent:1311:core:attack-conversion",
  source: astraSource,
  config: atLeast("coreSkillLevel", 1),
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
  when: always,
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
}

export const astraMindscapeTwo = {
  kind: "modification",
  effectId: "agent:1311:mindscape-2:core-enhancement",
  source: {
    ...astraSource,
    section: "mindscape-2",
    references: [{ ...astraSource.references[0], pointer: "/talent/2/desc" }],
  },
  config: atLeast("mindscapeRank", 2),
  parameters: {},
  phase: "configuration",
  target: { kind: "effect", effectId: astraCore.effectId },
  modifications: [
    {
      field: "parameter",
      name: "ratio",
      unit: "ratio",
      change: { operator: "add", value: literal("ratio", 0.19) },
    },
    {
      field: "parameter",
      name: "cap",
      unit: "attack-points",
      change: { operator: "add", value: literal("attack-points", 400) },
    },
  ],
}

export const woodpeckerTwoPiece = {
  kind: "contribution",
  effectId: "disc:31000:two-piece:critical-rate",
  source: {
    identity: { kind: "drive-disc", entityId: "31000" },
    section: "two-piece",
    references: [
      {
        sourceId: "nanoka-zzz",
        version: "3.1",
        locale: "zh",
        resourcePath: "zzz/3.1/zh/equipment/31000.json",
        pointer: "/desc2",
      },
    ],
  },
  config: atLeast("setPieces", 2),
  parameters: {},
  activation: { kind: "continuous" },
  beneficiary: { kind: "holder" },
  scope: "entity",
  when: always,
  operation: {
    kind: "stat-adjustment",
    stat: "criticalRate",
    stage: "direct",
    value: literal("ratio", 0.08),
  },
}

export const syntheticSource = {
  identity: { kind: "environment", entityId: "effect-spec-fixture" },
  section: "contract-validation",
  references: [
    {
      sourceId: "fairy-spec",
      version: "1",
      locale: "zh",
      resourcePath: "docs/specs/effects/execution.md",
      pointer: "",
    },
  ],
}

export const syntheticState = {
  stateId: "state:spec:linger",
  source: syntheticSource,
  parameters: {
    lingerSeconds: { kind: "constant", unit: "seconds", value: 2 },
  },
  input: "observed",
}

export const syntheticStateModification = {
  kind: "modification",
  effectId: "environment:spec:linger-extension",
  source: syntheticSource,
  config: always,
  parameters: {},
  phase: "configuration",
  target: { kind: "state", stateId: syntheticState.stateId },
  modifications: [
    {
      field: "parameter",
      name: "lingerSeconds",
      unit: "seconds",
      change: { operator: "add", value: literal("seconds", 5.5) },
    },
  ],
}

export const elegantVanityEnergy = {
  kind: "instant",
  effectId: "w-engine:14131:energy-on-entry",
  source: {
    identity: { kind: "w-engine", entityId: "14131" },
    section: "talent",
    references: [
      {
        sourceId: "nanoka-zzz",
        version: "3.1",
        locale: "zh",
        resourcePath: "zzz/3.1/zh/weapon/14131.json",
        pointer: "/talents/1/desc",
      },
    ],
  },
  config: atLeast("refinement", 1),
  parameters: {
    energy: {
      kind: "by-rank",
      unit: "energy-points",
      rank: "refinement",
      values: { 1: 5, 2: 5.5, 3: 6, 4: 6.5, 5: 7 },
    },
  },
  trigger: {
    eventKinds: ["entry"],
    when: {
      kind: "same-team",
      left: { role: "triggerActor" },
      right: { role: "holder" },
    },
    cooldown: {
      groupId: "elegant-vanity-energy",
      partition: "binding",
      seconds: literal("seconds", 5),
    },
  },
  beneficiary: { kind: "holder" },
  operation: {
    kind: "resource-generation",
    resource: "energy",
    amount: { kind: "parameter", unit: "energy-points", name: "energy" },
  },
}

export const starterRuleSet = {
  schemaVersion: 1,
  ruleSetId: "effects-test-fixtures",
  revision: "1",
  effects: [
    astraCore,
    astraMindscapeTwo,
    woodpeckerTwoPiece,
    syntheticStateModification,
    elegantVanityEnergy,
  ],
  states: [syntheticState],
  actions: [],
}

export const astraBindingAt = (mindscapeRank: number): SourceBinding =>
  ({
    kind: "agent",
    bindingId: `binding:astra-m${mindscapeRank}`,
    holderId: "entity:astra",
    sourceEntityId: "1311",
    eligible: true,
    configuration: { mindscapeRank, coreSkillLevel: 7 },
  }) as SourceBinding

export const woodpeckerBindingAt = (setPieces: number): SourceBinding =>
  ({
    kind: "drive-disc",
    bindingId: `binding:woodpecker-${setPieces}`,
    holderId: "entity:attacker",
    sourceEntityId: "31000",
    eligible: true,
    configuration: { setPieces },
  }) as SourceBinding

export const syntheticBinding = {
  kind: "environment",
  bindingId: "binding:spec",
  holderId: "entity:spec",
  sourceEntityId: "effect-spec-fixture",
  eligible: true,
  configuration: {},
}

/** 测试专用的宽松可变形状；测试只做定向破坏，不承担类型保证。 */
export type LooseRuleSet = {
  schemaVersion: number
  ruleSetId: string
  revision: string
  effects: Record<string, unknown>[]
  states: Record<string, unknown>[]
  actions: Record<string, unknown>[]
}

export function asLooseRuleSet(ruleSet: unknown): LooseRuleSet {
  return structuredClone(ruleSet) as LooseRuleSet
}

/** 便捷的克隆工具；测试只读取，不做深改。 */
export function cloneRuleSet<T>(ruleSet: T): T {
  return structuredClone(ruleSet)
}

/**
 * 递归重建对象并反转键顺序，用于验证内容比较忽略对象键顺序；
 * 数组元素顺序保持不变，因为数组顺序属于内容。
 */
export function reorderObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => reorderObjectKeys(entry))
  }
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value)
      .toReversed()
      .map(([key, nested]) => [key, reorderObjectKeys(nested)] as const)
    return Object.fromEntries(entries)
  }
  return value
}
