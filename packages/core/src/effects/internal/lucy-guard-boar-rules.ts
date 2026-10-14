import type {
  EffectRule,
  LucyGuardBoarCatalogMechanism,
  LucyGuardBoarInheritanceRule,
  LucyGuardBoarM6Rule,
  RuleSet,
  StaticEffectCatalog,
} from "../types.ts"
import { expectArray, expectObject, rejectUnknownFields } from "./checks.ts"
import { IssueCollector } from "./issues.ts"
import { validateSourceReference } from "./rule.ts"

export const LUCY_BOAR_MECHANISM = "lucy-guard-boar" as const
export const LUCY_BOAR_ITEM = "lucy:m6-boar-rain" as const
export const LUCY_BOAR_TARGET = "nanoka:lucy-m6-boar-rain" as const
export const LUCY_BOAR_SOURCES = {
  inheritance: {
    optionId: "nanoka:agents:lucy:guard-boar-inheritance",
    effectId: "agent:1151:nanoka:guard-boar-inheritance:mindscape:0",
  },
  m6: {
    optionId: "nanoka:agents:lucy:m6-boar-rain",
    effectId: "agent:1151:nanoka:m6-boar-rain:mindscape:6",
  },
  cheerFixed: {
    optionId: "agents:lucy:mindscape:0:blk-legacy:legacy-team-atk",
    effectId: "agent:1151:zzz-hp:legacy-team-atk:blk-legacy:mindscape:0",
  },
  cheerConversion: {
    optionId: "agents:lucy:mindscape:0:blk-legacy:eff-ms384fjz-fgct7r",
    effectId: "agent:1151:zzz-hp:eff-ms384fjz-fgct7r:blk-legacy:mindscape:0",
  },
  mindscape4: {
    optionId: "agents:lucy:mindscape:4:blk-legacy:legacy-team-critDmg",
    effectId: "agent:1151:zzz-hp:legacy-team-critDmg:blk-legacy:mindscape:4",
  },
} as const
export const LUCY_CONVERSION_INPUT =
  LUCY_BOAR_SOURCES.cheerConversion.effectId + ":source"
const factionMembers = ["1071", "1151", "1161", "1171", "1281", "1351"] as const

export function isLucyGuardBoarRule(
  rule: EffectRule,
): rule is LucyGuardBoarInheritanceRule | LucyGuardBoarM6Rule {
  return (
    rule.kind === "contribution" &&
    (rule.operation.kind === "lucy-guard-boar-inheritance" ||
      rule.operation.kind === "lucy-guard-boar-m6-damage")
  )
}

/** 只对既有结构验证成功的定义和引用做比较，不递归解释未知载荷。 */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]"
  if (value && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .toSorted(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => JSON.stringify(key) + ":" + canonical(entry))
        .join(",") +
      "}"
    )
  return JSON.stringify(value)
}

/** 只用于验证拆除前提；实际贡献仍由原规则和既有求值器计算。 */
const reviewedOwnerShapes = {
  "agent:1151:zzz-hp:eff-ms384fjz-fgct7r:blk-legacy:mindscape:0": {
    config: {
      kind: "compare-number",
      unit: "count",
      operator: "gte",
      left: {
        kind: "configuration-number",
        unit: "count",
        field: "mindscapeRank",
      },
      right: {
        kind: "literal",
        unit: "count",
        value: 0,
      },
    },
    parameters: {
      threshold: {
        kind: "constant",
        unit: "attack-points",
        value: 0,
      },
      rate: {
        kind: "by-rank",
        rank: "specialSkillLevel",
        unit: "multiplier",
        values: {
          "1": 0.138,
          "2": 0.146,
          "3": 0.154,
          "4": 0.162,
          "5": 0.17,
          "6": 0.178,
          "7": 0.186,
          "8": 0.194,
          "9": 0.202,
          "10": 0.21,
          "11": 0.218,
          "12": 0.226,
          "13": 0.234,
          "14": 0.242,
          "15": 0.25,
          "16": 0.258,
        },
      },
      cap: {
        kind: "by-rank",
        rank: "specialSkillLevel",
        unit: "attack-points",
        values: {
          "1": 556,
          "2": 552,
          "3": 548,
          "4": 544,
          "5": 540,
          "6": 536,
          "7": 532,
          "8": 528,
          "9": 524,
          "10": 520,
          "11": 516,
          "12": 512,
          "13": 508,
          "14": 504,
          "15": 500,
          "16": 496,
        },
      },
    },
    activation: {
      kind: "supplied",
      maximumLayers: {
        kind: "literal",
        unit: "count",
        value: 1,
      },
    },
    scope: "entity",
    beneficiary: {
      kind: "team",
    },
    when: {
      kind: "all",
      conditions: [],
    },
    operation: {
      kind: "stat-adjustment",
      stat: "attack",
      stage: "final-fixed",
      value: {
        kind: "minimum",
        unit: "attack-points",
        operands: [
          {
            kind: "convert",
            unit: "attack-points",
            input: {
              kind: "maximum",
              unit: "attack-points",
              operands: [
                {
                  kind: "literal",
                  unit: "attack-points",
                  value: 0,
                },
                {
                  kind: "add",
                  unit: "attack-points",
                  operands: [
                    {
                      kind: "input",
                      unit: "attack-points",
                      name: "agent:1151:zzz-hp:eff-ms384fjz-fgct7r:blk-legacy:mindscape:0:source",
                    },
                    {
                      kind: "parameter",
                      unit: "attack-points",
                      name: "threshold",
                    },
                  ],
                },
              ],
            },
            rate: {
              kind: "parameter",
              unit: "multiplier",
              name: "rate",
            },
          },
          {
            kind: "parameter",
            unit: "attack-points",
            name: "cap",
          },
        ],
      },
    },
  },
  "agent:1151:zzz-hp:legacy-team-atk:blk-legacy:mindscape:0": {
    config: {
      kind: "compare-number",
      unit: "count",
      operator: "gte",
      left: {
        kind: "configuration-number",
        unit: "count",
        field: "mindscapeRank",
      },
      right: {
        kind: "literal",
        unit: "count",
        value: 0,
      },
    },
    parameters: {
      amount: {
        kind: "by-rank",
        rank: "specialSkillLevel",
        unit: "attack-points",
        values: {
          "1": 44,
          "2": 48,
          "3": 52,
          "4": 56,
          "5": 60,
          "6": 64,
          "7": 68,
          "8": 72,
          "9": 76,
          "10": 80,
          "11": 84,
          "12": 88,
          "13": 92,
          "14": 96,
          "15": 100,
          "16": 104,
        },
      },
    },
    activation: {
      kind: "supplied",
      maximumLayers: {
        kind: "literal",
        unit: "count",
        value: 1,
      },
    },
    scope: "entity",
    beneficiary: {
      kind: "team",
    },
    when: {
      kind: "all",
      conditions: [],
    },
    operation: {
      kind: "stat-adjustment",
      stat: "attack",
      stage: "final-fixed",
      value: {
        kind: "parameter",
        unit: "attack-points",
        name: "amount",
      },
    },
  },
  "agent:1151:zzz-hp:legacy-team-critDmg:blk-legacy:mindscape:4": {
    config: {
      kind: "compare-number",
      unit: "count",
      operator: "gte",
      left: {
        kind: "configuration-number",
        unit: "count",
        field: "mindscapeRank",
      },
      right: {
        kind: "literal",
        unit: "count",
        value: 4,
      },
    },
    parameters: {
      amount: {
        kind: "constant",
        unit: "ratio",
        value: 0.1,
      },
    },
    activation: {
      kind: "supplied",
      maximumLayers: {
        kind: "literal",
        unit: "count",
        value: 1,
      },
    },
    scope: "entity",
    beneficiary: {
      kind: "team",
    },
    when: {
      kind: "all",
      conditions: [],
    },
    operation: {
      kind: "stat-adjustment",
      stat: "criticalDamage",
      stage: "direct",
      value: {
        kind: "parameter",
        unit: "ratio",
        name: "amount",
      },
    },
  },
} as const

export function validateLucyGuardBoarRules(
  definitions: RuleSet,
  collector: IssueCollector,
): void {
  for (const [key, pair] of Object.entries(LUCY_BOAR_SOURCES)) {
    const rule = definitions.effects.find((e) => e.effectId === pair.effectId)
    const pointer = "/definitions/effects/" + definitions.effects.indexOf(rule!)
    if (!rule || rule.kind !== "contribution") {
      collector.report(
        "MISSING_REFERENCE",
        "/definitions/effects",
        "Lucy guard boar requires its exact source " + pair.effectId,
      )
      continue
    }
    if (key === "inheritance" || key === "m6") {
      if (
        rule.operation.kind !==
        (key === "inheritance"
          ? "lucy-guard-boar-inheritance"
          : "lucy-guard-boar-m6-damage")
      )
        collector.report(
          "INVALID_DEFINITION",
          pointer + "/operation",
          "Lucy named operation and fixed identity disagree",
        )
      continue
    }
    const expected =
      reviewedOwnerShapes[pair.effectId as keyof typeof reviewedOwnerShapes]
    const actual = {
      config: rule.config,
      parameters: rule.parameters,
      activation: rule.activation,
      scope: rule.scope,
      beneficiary: rule.beneficiary,
      when: rule.when,
      operation: rule.operation,
    }
    if (
      rule.source.identity.kind !== "agent" ||
      rule.source.identity.entityId !== "1151" ||
      rule.uniqueness !== undefined ||
      canonical(actual) !== canonical(expected)
    )
      collector.report(
        "INVALID_DEFINITION",
        pointer,
        "Lucy owner contribution no longer has its reviewed final-fixed ATK or direct CD shape",
        { effectId: rule.effectId },
      )
  }
  if (definitions.effects.filter(isLucyGuardBoarRule).length !== 2)
    collector.report(
      "INVALID_DEFINITION",
      "/definitions/effects",
      "Lucy guard boar requires exactly its two named rules",
    )
}

export function validateLucyGuardBoarCatalog(
  catalog: StaticEffectCatalog,
  definitions: RuleSet,
  collector: IssueCollector,
): void {
  const named = definitions.effects.filter(isLucyGuardBoarRule)
  const mechanisms = (catalog.mechanisms ?? []).filter(
    (m) => m.mechanism === LUCY_BOAR_MECHANISM,
  )
  const targets = catalog.skillTargets.filter(
    (t) => t.targetId === LUCY_BOAR_TARGET,
  )
  const referringOptions = catalog.options.filter((o) =>
    Object.values(LUCY_BOAR_SOURCES)
      .slice(0, 2)
      .some((p) => p.optionId === o.optionId),
  )
  if (
    !named.length &&
    !mechanisms.length &&
    !targets.length &&
    !referringOptions.length
  )
    return
  validateLucyGuardBoarRules(definitions, collector)
  if (mechanisms.length !== 1) {
    collector.report(
      mechanisms.length > 1 ? "DUPLICATE_ID" : "INVALID_DEFINITION",
      "/catalog/mechanisms",
      "Lucy guard boar requires exactly one mechanism",
    )
    return
  }
  const mechanism = mechanisms[0]!
  const pointer =
    "/catalog/mechanisms/" + catalog.mechanisms!.indexOf(mechanism)
  const checks = (p: string) => ({
    collector,
    pointer: p,
    structureCode: "INVALID_DEFINITION" as const,
  })
  rejectUnknownFields(
    mechanism as unknown as Record<string, unknown>,
    [
      "mechanism",
      "agentEntityId",
      "inheritance",
      "m6",
      "cheerFixed",
      "cheerConversion",
      "mindscape4",
      "itemId",
      "skillTargetId",
      "sameFactionAgentEntityIds",
      "factionReferences",
      "references",
    ],
    checks(pointer),
    "Lucy mechanism",
  )
  if (
    mechanism.agentEntityId !== "1151" ||
    mechanism.itemId !== LUCY_BOAR_ITEM ||
    mechanism.skillTargetId !== LUCY_BOAR_TARGET
  )
    collector.report(
      "INVALID_DEFINITION",
      pointer,
      "Lucy mechanism has fixed agent, item and target identities",
    )
  const memberIds = expectArray(
    mechanism.sameFactionAgentEntityIds,
    checks(pointer + "/sameFactionAgentEntityIds"),
    "Lucy faction members",
  )
  if (memberIds) {
    if (new Set(memberIds).size !== memberIds.length)
      collector.report(
        "DUPLICATE_ID",
        pointer + "/sameFactionAgentEntityIds",
        "Duplicate Lucy faction member",
      )
    if (
      memberIds.some((id) => typeof id !== "string") ||
      JSON.stringify(memberIds.toSorted()) !== JSON.stringify(factionMembers)
    )
      collector.report(
        "INVALID_DEFINITION",
        pointer + "/sameFactionAgentEntityIds",
        "Lucy faction membership must match its fixed source",
      )
    for (const [index, id] of memberIds.entries())
      if (
        !catalog.entities.some(
          (e) =>
            e.status === "mapped" &&
            e.identity?.kind === "agent" &&
            e.identity.entityId === id,
        )
      )
        collector.report(
          "MISSING_REFERENCE",
          pointer + "/sameFactionAgentEntityIds/" + index,
          "Lucy faction member must map to a catalog agent",
        )
  }
  const validateReferences = (value: unknown, p: string) => {
    const array = expectArray(value, checks(p), "source references")
    if (array)
      for (const [index, ref] of array.entries())
        validateSourceReference(ref, checks(p + "/" + index))
    return array
  }
  const references = validateReferences(
    mechanism.references,
    pointer + "/references",
  )
  const factionReferences = validateReferences(
    mechanism.factionReferences,
    pointer + "/factionReferences",
  )
  for (const [key, expected] of Object.entries(LUCY_BOAR_SOURCES)) {
    const pairPointer = pointer + "/" + key
    const pair = expectObject(
      mechanism[key as keyof typeof LUCY_BOAR_SOURCES],
      checks(pairPointer),
      "Lucy source pair",
    )
    if (!pair) continue
    rejectUnknownFields(
      pair,
      ["optionId", "effectId"],
      checks(pairPointer),
      "Lucy source pair",
    )
    if (
      pair.optionId !== expected.optionId ||
      pair.effectId !== expected.effectId
    ) {
      collector.report(
        "INVALID_DEFINITION",
        pairPointer,
        "Lucy source pair must retain its exact option/effect identity",
      )
      continue
    }
    const rule = definitions.effects.find(
      (e) => e.effectId === expected.effectId,
    )
    const option = catalog.options.find((o) => o.optionId === expected.optionId)
    const entity = catalog.entities.find(
      (e) => e.catalogEntityId === option?.catalogEntityId,
    )
    const variant = option?.variants[0]
    const referring = catalog.options.filter((o) =>
      o.variants.some((v) => v.effectIds.includes(expected.effectId)),
    )
    const isNamed = key === "inheritance" || key === "m6"
    const requiredTarget = isNamed ? "self" : "team"
    if (
      !rule ||
      !option ||
      option.catalogEntityId !== "agents:lucy" ||
      entity?.identity?.kind !== "agent" ||
      entity.identity.entityId !== "1151" ||
      entity.status !== "mapped" ||
      option.target !== requiredTarget ||
      option.exclusiveGroup !== undefined ||
      referring.length !== 1 ||
      referring[0] !== option ||
      option.variants.length !== 1 ||
      !variant ||
      (variant.target ?? option.target) !== requiredTarget
    ) {
      collector.report(
        "INVALID_DEFINITION",
        pairPointer,
        "Lucy source rule, unique option, effective beneficiary and mapped agent must correspond",
      )
      continue
    }
    validateReferences(
      variant.references,
      "/catalog/options/" +
        catalog.options.indexOf(option) +
        "/variants/0/references",
    )
    if (!collector.isEmpty) continue
    const config = isNamed
      ? {
          minimumMindscape: key === "m6" ? 6 : 0,
          coreSkillLevels: [1, 2, 3, 4, 5, 6, 7],
        }
      : key === "mindscape4"
        ? { minimumMindscape: 4 }
        : {
            minimumMindscape: 0,
            specialSkillLevels: Array.from({ length: 16 }, (_, i) => i + 1),
          }
    const inputShape = variant.inputs.map((i) => ({
      name: i.name,
      unit: i.unit,
    }))
    if (
      canonical(variant.effectIds) !== canonical([expected.effectId]) ||
      variant.maximumLayers !== 1 ||
      variant.status === "unsupported" ||
      Object.keys(variant.applicability).length !== 0 ||
      canonical(variant.configuration) !== canonical(config) ||
      canonical(inputShape) !==
        canonical(
          key === "cheerConversion"
            ? [{ name: LUCY_CONVERSION_INPUT, unit: "attack-points" }]
            : [],
        ) ||
      variant.damageItemRequirements !== undefined ||
      variant.exclusiveDamageItem !== undefined ||
      variant.parameterMapping !== undefined ||
      variant.layerCountInputName !== undefined ||
      variant.declaredTeammateBeneficiary !== undefined ||
      variant.squadUniqueEffect !== undefined ||
      canonical(variant.references.map(canonical).toSorted()) !==
        canonical(rule.source.references.map(canonical).toSorted())
    )
      collector.report(
        "INVALID_DEFINITION",
        pairPointer,
        "Lucy source variant and complete references must retain the reviewed contract",
      )
  }
  if (
    targets.length !== 1 ||
    targets[0]?.agentEntityId !== "1151" ||
    targets[0]?.upstreamId !== null ||
    targets[0]?.category !== "uncategorized" ||
    targets[0]?.countsAsFollowUp !== false
  )
    collector.report(
      "INVALID_DEFINITION",
      "/catalog/skillTargets",
      "Lucy M6 requires its unique uncategorized, non-follow-up target",
    )
  if (!collector.isEmpty || !references || !factionReferences) return
  const expectedReferences = named
    .flatMap((r) => r.source.references)
    .map(canonical)
    .toSorted()
  const expectedFactionReferences = factionMembers
    .map((id) => ({
      sourceId: "nanoka-integrated",
      version: "3.2",
      locale: "en",
      resourcePath: "index.json",
      pointer: "/entities/agents/members/" + id + "/sourceRecord/camp",
    }))
    .map(canonical)
    .toSorted()
  for (const [field, actual, expected] of [
    ["references", references.map(canonical).toSorted(), expectedReferences],
    [
      "factionReferences",
      factionReferences.map(canonical).toSorted(),
      expectedFactionReferences,
    ],
  ] as const) {
    if (new Set(actual).size !== actual.length)
      collector.report(
        "DUPLICATE_ID",
        pointer + "/" + field,
        "Duplicate Lucy source reference",
      )
    if (canonical(actual) !== canonical(expected))
      collector.report(
        "INVALID_DEFINITION",
        pointer + "/" + field,
        "Lucy metadata must retain the complete corresponding source references",
      )
  }
}

export function readLucyGuardBoarMechanism(
  catalog: StaticEffectCatalog,
): LucyGuardBoarCatalogMechanism {
  return catalog.mechanisms!.find(
    (m): m is LucyGuardBoarCatalogMechanism =>
      m.mechanism === LUCY_BOAR_MECHANISM,
  )!
}
