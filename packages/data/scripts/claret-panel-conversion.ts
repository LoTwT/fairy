import { createHash } from "node:crypto"
import { isDeepStrictEqual } from "node:util"
import type {
  ContributionRule,
  RuleSet,
  StaticEffectCatalog,
} from "@randomplay/shared"
import type { AgentData, AgentDetails } from "../src/integration/agent-types.ts"
import rankEvidence from "./static-effects/rank-evidence.json" with { type: "json" }

/** 将已核实的同一目录效果归入初始面板；低层仍保留显式来源输入。 */
export function claretPanelConversion(
  detailsBytes: Uint8Array,
  data: AgentData,
  definitions: RuleSet,
  catalog: StaticEffectCatalog,
  gameVersion: string,
): ContributionRule {
  const effectId =
    "agent:1611:zzz-hp:eff-mtskqyss-1toefw:blk-mtrf598z-wr4jqt:mindscape:0"
  const optionId =
    "agents:claret:mindscape:0:blk-mtrf598z-wr4jqt:eff-mtskqyss-1toefw"
  const inputName = `${effectId}:source`
  const evidence = rankEvidence["claret:blk-mtrf598z-wr4jqt"]
  const details = JSON.parse(
    Buffer.from(detailsBytes).toString("utf8"),
  ) as AgentDetails
  const digest = createHash("sha256").update(detailsBytes).digest("hex")
  const references: ContributionRule["source"]["references"][number][] = []
  const rates: number[] = []
  if (Object.keys(details.passive.level).length !== evidence.levels.length)
    throw new Error("Claret initial conversion requires all seven core rows")
  for (const entry of evidence.evidence) {
    const rowId = entry.pointer.split("/")[3]!
    if (digest !== entry.sha256)
      throw new Error(
        `Claret initial conversion evidence changed: ${entry.path}`,
      )
    const text = details.passive.level[rowId]?.desc[0]?.replace(/<[^>]*>/gu, "")
    const clause = text?.match(
      /克拉蕾每拥有1%的初始暴击伤害，初始暴击率提升([\d.]+)%/u,
    )
    if (!clause || data.passive.level[rowId]?.level !== entry.rank)
      throw new Error(
        `Claret initial conversion evidence/rank mismatch: ${entry.pointer}`,
      )
    rates.push(Number(clause[1]))
    references.push({
      sourceId: "nanoka-integrated",
      version: gameVersion,
      locale: "zh",
      resourcePath: entry.path,
      pointer: `/passive/level/${rowId}/desc/0`,
    })
  }
  const rate = rates[0]!
  if (!Number.isFinite(rate) || !rates.every((value) => value === rate))
    throw new Error("Claret initial conversion rate differs across core rows")

  const rules = definitions.effects.filter((rule) => rule.effectId === effectId)
  const rule = rules[0]
  const options = catalog.options.filter(
    (option) => option.optionId === optionId,
  )
  const option = options[0]
  const variant = option?.variants[0]
  const identity = catalog.entities.find(
    (entry) => entry.catalogEntityId === option?.catalogEntityId,
  )?.identity
  const sourceIdentity = { kind: "agent", entityId: "1611" }
  const operation = {
    kind: "stat-adjustment",
    stat: "criticalRate",
    stage: "direct",
    value: {
      kind: "convert",
      unit: "ratio",
      input: {
        kind: "maximum",
        unit: "ratio",
        operands: [
          { kind: "literal", unit: "ratio", value: 0 },
          {
            kind: "add",
            unit: "ratio",
            operands: [
              { kind: "input", unit: "ratio", name: inputName },
              { kind: "parameter", unit: "ratio", name: "threshold" },
            ],
          },
        ],
      },
      rate: { kind: "parameter", unit: "multiplier", name: "rate" },
    },
  } as const satisfies ContributionRule["operation"]
  if (
    rules.length !== 1 ||
    rule?.kind !== "contribution" ||
    !isDeepStrictEqual(rule.source.identity, sourceIdentity) ||
    !references.every((reference) =>
      rule.source.references.some((actual) =>
        isDeepStrictEqual(actual, reference),
      ),
    ) ||
    !isDeepStrictEqual(rule.parameters, {
      threshold: { kind: "constant", unit: "ratio", value: 0 },
      rate: { kind: "constant", unit: "multiplier", value: rate },
    }) ||
    !isDeepStrictEqual(rule.activation, {
      kind: "supplied",
      maximumLayers: { kind: "literal", unit: "count", value: 1 },
    }) ||
    !isDeepStrictEqual(rule.config, {
      kind: "compare-number",
      unit: "count",
      operator: "gte",
      left: {
        kind: "configuration-number",
        unit: "count",
        field: "mindscapeRank",
      },
      right: { kind: "literal", unit: "count", value: 0 },
    }) ||
    !isDeepStrictEqual(rule.beneficiary, { kind: "holder" }) ||
    rule.scope !== "entity" ||
    !isDeepStrictEqual(rule.when, { kind: "all", conditions: [] }) ||
    !isDeepStrictEqual(rule.operation, operation) ||
    options.length !== 1 ||
    option?.variants.length !== 1 ||
    option.target !== "self" ||
    !isDeepStrictEqual(identity, sourceIdentity) ||
    variant?.status === "unsupported" ||
    !variant ||
    !isDeepStrictEqual(variant.configuration, {
      minimumMindscape: 0,
      coreSkillLevels: evidence.levels,
    }) ||
    !isDeepStrictEqual(variant.effectIds, [effectId]) ||
    variant.maximumLayers !== 1 ||
    !isDeepStrictEqual(
      variant.inputs.map(({ name, unit }) => ({ name, unit })),
      [{ name: inputName, unit: "ratio" }],
    ) ||
    !isDeepStrictEqual(variant.applicability, {})
  )
    throw new Error(`Claret initial conversion catalog/rule drift: ${effectId}`)

  // 参数复用正式效果；current 在独立的面板求值世界中只含装备与常驻规则。
  // 保留同一 effectId，使高层命中阶段能够识别已经结算的贡献。
  return {
    ...rule,
    activation: { kind: "continuous" },
    operation: {
      ...operation,
      value: {
        ...operation.value,
        input: {
          ...operation.value.input,
          operands: [
            operation.value.input.operands[0],
            {
              ...operation.value.input.operands[1],
              operands: [
                {
                  kind: "stat",
                  unit: "ratio",
                  entity: { role: "holder" },
                  stat: "criticalDamage",
                  stage: "current",
                  at: "evaluation",
                },
                operation.value.input.operands[1].operands[1],
              ],
            },
          ],
        },
      },
    },
  }
}
