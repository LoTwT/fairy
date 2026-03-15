import type { AgentDetails } from "../gachabase/types.js"
import type {
  ResolveStaticBuildSkillMatrixInput,
  ResolveStaticBuildSkillMatrixResult,
  StaticBuildAssumptionList,
  StaticBuildBucketValueMap,
  StaticBuildDamageType,
  StaticBuildFormulaMultiplierMap,
  StaticBuildSkillMatrixAttributeSource,
  StaticBuildSkillMatrixEffectSummaryItem,
  StaticBuildSkillMatrixRow,
  StaticBuildSkillMatrixRowMeta,
  StaticBuildSkillMatrixTemplateSource,
  StaticBuildSkillTag,
  StaticBuildSourceDamageViewRequirementSummary,
  StaticBuildUnsupportedEffectList,
  StaticBuildVariableBucketList,
  StaticBuildVariableFormulaMultiplierList,
} from "./types.js"
import agentDetailsZh from "../../data/zh-CN/agent-details.json"
import { toAgentAttribute } from "../terms.js"
import { getStaticBuildAgent } from "./catalog.js"
import {
  resolveStaticBuildDamage,
  summarizeAssumptions,
  summarizeDiagnosticEntries,
  summarizeSourceNoteEntries,
} from "./resolver.js"

interface SkillMatrixTemplate {
  id: string
  agentId: string
  group: string
  label: string
  skillTypeId: number
  statName: string
  occurrence?: number
  skillTag: StaticBuildSkillTag
  damageType?: StaticBuildDamageType
  attribute?: string
  combatTags?: string[]
}

interface GenericSkillStatItem {
  id: string
  name: string
}

const segmentIndexByLabel = {
  一段: 1,
  二段: 2,
  三段: 3,
  四段: 4,
  五段: 5,
  六段: 6,
  七段: 7,
  八段: 8,
  九段: 9,
  十段: 10,
} as const

const targetSizeByLabel = {
  小体型: "small",
  中体型: "medium",
  大体型: "large",
} as const

const targetSizeLabelByValue = {
  small: "小体型",
  medium: "中体型",
  large: "大体型",
} as const

function parseSegmentToken(token: string) {
  if (token in segmentIndexByLabel) {
    return {
      baseQualifier: undefined,
      segmentLabel: token as keyof typeof segmentIndexByLabel,
      segmentIndex:
        segmentIndexByLabel[token as keyof typeof segmentIndexByLabel],
    }
  }

  for (const segmentLabel of Object.keys(segmentIndexByLabel) as Array<
    keyof typeof segmentIndexByLabel
  >) {
    if (!token.endsWith(segmentLabel)) continue
    const baseQualifier = token.slice(0, -segmentLabel.length) || undefined
    return {
      baseQualifier,
      segmentLabel,
      segmentIndex: segmentIndexByLabel[segmentLabel],
    }
  }

  return {
    baseQualifier: undefined,
    segmentLabel: undefined,
    segmentIndex: undefined,
  }
}

function inferSkillMatrixRowMeta(
  template: SkillMatrixTemplate,
  order: number,
  templateSource: StaticBuildSkillMatrixTemplateSource,
  attributeSource: StaticBuildSkillMatrixAttributeSource,
  resolvedAttribute: string,
  sourceStatId: string,
): StaticBuildSkillMatrixRowMeta {
  const tokens = template.label.split("·").filter(Boolean)
  const actionName = tokens[0] ?? template.group

  let skillName = actionName
  let qualifiers = [] as string[]

  if (tokens.length === 2) {
    const second = tokens[1]!
    const segment = parseSegmentToken(second)
    if (segment.segmentLabel || second in targetSizeByLabel) {
      skillName = actionName
      qualifiers = [second]
    } else {
      skillName = second
    }
  } else if (tokens.length >= 3) {
    skillName = tokens[1]!
    qualifiers = tokens.slice(2)
  }

  let targetSize: StaticBuildSkillMatrixRowMeta["targetSize"]
  let segmentLabel: string | undefined
  let segmentIndex: number | undefined

  if (qualifiers.length > 0) {
    const last = qualifiers.at(-1)!
    const mappedTargetSize =
      targetSizeByLabel[last as keyof typeof targetSizeByLabel]
    if (mappedTargetSize) {
      targetSize = mappedTargetSize
      qualifiers = qualifiers.slice(0, -1)
    } else {
      const segment = parseSegmentToken(last)
      if (segment.segmentLabel) {
        segmentLabel = segment.segmentLabel
        segmentIndex = segment.segmentIndex
        qualifiers = qualifiers.slice(0, -1)
        if (segment.baseQualifier) {
          qualifiers.push(segment.baseQualifier)
        }
      }
    }
  }

  const entryText = `${template.label} ${template.statName}`
  let entryType: StaticBuildSkillMatrixRowMeta["entryType"]
  let aggregationType: StaticBuildSkillMatrixRowMeta["aggregationType"]
  let isAdditionalDamage = false
  let variantAxis: StaticBuildSkillMatrixRowMeta["variantAxis"]
  if (targetSize) {
    entryType = "size-variant"
    aggregationType = "whole-entry"
    variantAxis = "target-size"
  } else if (entryText.includes("额外") || entryText.includes("追加")) {
    entryType = "extra"
    aggregationType = "whole-entry"
    isAdditionalDamage = true
  } else if (segmentLabel) {
    entryType = "hit"
    aggregationType = "per-hit"
    variantAxis = "segment"
  } else if (template.statName.includes("总伤害")) {
    entryType = "total"
    aggregationType = "whole-entry"
  } else if (qualifiers.length > 0) {
    entryType = "variant"
    aggregationType = "whole-entry"
    variantAxis = "condition"
  } else {
    entryType = "total"
    aggregationType = "whole-entry"
  }

  const canonicalTokens = [actionName]
  if (skillName !== actionName) {
    canonicalTokens.push(skillName)
  }
  canonicalTokens.push(...qualifiers)
  if (targetSize) {
    canonicalTokens.push(targetSizeLabelByValue[targetSize])
  }
  if (segmentLabel) {
    canonicalTokens.push(segmentLabel)
  }
  const canonicalLabel = canonicalTokens.join("·")
  const stableKey = [
    template.agentId,
    templateSource,
    template.skillTypeId,
    template.statName,
    template.occurrence ?? 1,
    template.skillTag,
    template.damageType ?? "default",
    resolvedAttribute,
    attributeSource,
    ...(template.combatTags ?? []),
  ].join("::")

  return {
    order,
    actionName,
    skillName,
    qualifiers,
    canonicalLabel,
    stableKey,
    templateSource,
    sourceSkillTypeId: template.skillTypeId,
    sourceStatId,
    sourceStatName: template.statName,
    sourceOccurrence: template.occurrence ?? 1,
    attributeSource,
    templateCombatTags: template.combatTags ?? [],
    entryType,
    aggregationType,
    isAdditionalDamage,
    ...(variantAxis ? { variantAxis } : {}),
    ...(segmentLabel ? { segmentLabel } : {}),
    ...(segmentIndex ? { segmentIndex } : {}),
    ...(targetSize ? { targetSize } : {}),
  }
}

function getAgentDetails(agentId: string): AgentDetails {
  const agent = (agentDetailsZh as AgentDetails[]).find(
    (item) => item.id === agentId,
  )
  if (!agent) {
    throw new RangeError(`Missing zh-CN agent details for agentId=${agentId}`)
  }
  return agent
}

function getSkillMultiplier(
  agentId: string,
  skillTypeId: number,
  statName: string,
  occurrence = 1,
) {
  const agent = getAgentDetails(agentId)
  const skill = agent.skills.find((item) => item.typeId === String(skillTypeId))
  if (!skill) {
    throw new RangeError(
      `Missing skill type ${skillTypeId} for agentId=${agentId}`,
    )
  }

  const matches = skill.stats.filter((item) => item.name === statName)
  const stat = matches[occurrence - 1]
  const value = stat?.values.at(-1)
  if (!value) {
    throw new RangeError(
      `Missing stat ${statName}#${occurrence} for agentId=${agentId}, skillTypeId=${skillTypeId}`,
    )
  }

  return {
    value,
    statId: stat.id,
  }
}

function isDamageStatName(name: string) {
  return name.includes("伤害倍率")
}

function normalizeGenericStatLabel(name: string) {
  return name
    .replace(/伤害倍率/g, "")
    .replace(/\[|\]/g, "")
    .replace(/^[:：·\-]+|[:：·\-]+$/g, "")
    .trim()
}

function inferGenericActionName(skillTypeId: string, damageIndex: number) {
  switch (skillTypeId) {
    case "0":
      return "普通攻击"
    case "1":
      return damageIndex === 1 ? "特殊技" : "强化特殊技"
    case "2":
      return damageIndex === 1 ? "冲刺攻击" : "闪避"
    case "3":
      return damageIndex === 1 ? "连携技" : "终结技"
    case "6":
      return damageIndex === 1 ? "快速支援" : "支援突击"
    default:
      return "技能"
  }
}

function inferGenericGroup(skillTypeId: string) {
  switch (skillTypeId) {
    case "0":
      return "普通攻击"
    case "1":
      return "特殊技"
    case "2":
      return "闪避"
    case "3":
      return "连携技"
    case "6":
      return "支援技"
    default:
      return "技能"
  }
}

function inferGenericSkillTag(
  skillTypeId: string,
  damageIndex: number,
): StaticBuildSkillTag {
  switch (skillTypeId) {
    case "0":
      return "basic"
    case "1":
      return damageIndex === 1 ? "special" : "enhancedSpecial"
    case "2":
      return "dash"
    case "3":
      return damageIndex === 1 ? "chain" : "ultimate"
    case "6":
      return "assist"
    default:
      return "basic"
  }
}

function buildGeneratedSkillMatrixTemplates(agentId: string) {
  const agent = getAgentDetails(agentId)
  const templates: SkillMatrixTemplate[] = []

  for (const skill of agent.skills) {
    const occurrenceByName = new Map<string, number>()
    let damageIndex = 0

    for (const stat of skill.stats as GenericSkillStatItem[]) {
      const currentOccurrence = (occurrenceByName.get(stat.name) ?? 0) + 1
      occurrenceByName.set(stat.name, currentOccurrence)
      if (!isDamageStatName(stat.name)) continue

      damageIndex += 1
      const actionName = inferGenericActionName(skill.typeId, damageIndex)
      const normalized = normalizeGenericStatLabel(stat.name)
      const label = normalized ? `${actionName}·${normalized}` : actionName

      templates.push({
        id: `${agentId}-${skill.typeId}-${stat.id}`,
        agentId,
        group: inferGenericGroup(skill.typeId),
        label,
        skillTypeId: Number(skill.typeId),
        statName: stat.name,
        occurrence: currentOccurrence,
        skillTag: inferGenericSkillTag(skill.typeId, damageIndex),
      })
    }
  }

  return templates
}

function summarizeBuckets(rows: StaticBuildSkillMatrixRow[]) {
  const first = rows[0]?.build.resolvedBuckets
  if (!first) {
    return {
      commonBuckets: {} as StaticBuildBucketValueMap,
      variableBuckets: [] as StaticBuildVariableBucketList,
    }
  }

  const commonBuckets: StaticBuildBucketValueMap = {}
  const variableBuckets: StaticBuildVariableBucketList = []

  for (const [bucket, value] of Object.entries(first)) {
    const same = rows.every(
      (row) =>
        row.build.resolvedBuckets[bucket as keyof typeof first] === value,
    )
    if (same) {
      commonBuckets[bucket] = value
    } else {
      variableBuckets.push(bucket)
    }
  }

  return { commonBuckets, variableBuckets }
}

function summarizeFormulaMultipliers(rows: StaticBuildSkillMatrixRow[]) {
  const first = rows[0]?.build.damage.expected.breakdown
  if (!first) {
    return {
      commonFormulaMultipliers: {} as StaticBuildFormulaMultiplierMap,
      variableFormulaMultipliers:
        [] as StaticBuildVariableFormulaMultiplierList,
    }
  }

  const commonFormulaMultipliers: StaticBuildFormulaMultiplierMap = {}
  const variableFormulaMultipliers: StaticBuildVariableFormulaMultiplierList =
    []

  for (const [bucket, value] of Object.entries(first)) {
    if (bucket === "baseDamage") continue
    const same = rows.every(
      (row) =>
        row.build.damage.expected.breakdown[bucket as keyof typeof first] ===
        value,
    )
    if (same) {
      commonFormulaMultipliers[bucket] = value
    } else {
      variableFormulaMultipliers.push(bucket)
    }
  }

  return { commonFormulaMultipliers, variableFormulaMultipliers }
}

const bucketLabels = {
  attackPercent: "攻击%",
  flatAttack: "固定攻击",
  bonusDamageSum: "增伤",
  critRate: "暴击率",
  critDamage: "暴击伤害",
  penetrationRate: "穿透率",
  penetrationValue: "穿透值",
  resistanceReduction: "减抗",
  ignoreResistance: "无视抗性",
  vulnerabilityBonus: "易伤",
  damageReduction: "减伤",
  stunVulnerability: "失衡易伤",
  nonStunVulnerability: "非失衡易伤",
  sheerBonusSum: "贯穿增伤",
  skillMultiplierFactor: "技能倍率",
  anomalyMastery: "异常精通",
  anomalyProficiency: "异常掌控",
  anomalyBonusDamageSum: "异常增伤",
  anomalyCritRate: "异常暴击率",
  anomalyCritDamage: "异常暴击伤害",
} as const

function formatValue(value: number) {
  const normalized = Number.parseFloat(value.toFixed(3))
  return Number.isInteger(normalized)
    ? String(normalized)
    : normalized.toString()
}

function formatModifier(
  bucket: string,
  value: number,
  combine: "sum" | "multiply",
) {
  if (combine === "multiply") {
    const percent = (value - 1) * 100
    return `×${formatValue(value)}（${percent >= 0 ? "+" : ""}${formatValue(percent)}%）`
  }

  if (
    bucket === "critRate" ||
    bucket === "critDamage" ||
    bucket === "bonusDamageSum" ||
    bucket === "penetrationRate" ||
    bucket === "resistanceReduction" ||
    bucket === "ignoreResistance" ||
    bucket === "vulnerabilityBonus" ||
    bucket === "damageReduction" ||
    bucket === "stunVulnerability" ||
    bucket === "nonStunVulnerability" ||
    bucket === "sheerBonusSum" ||
    bucket === "anomalyBonusDamageSum" ||
    bucket === "anomalyCritRate" ||
    bucket === "anomalyCritDamage"
  ) {
    return `${value >= 0 ? "+" : ""}${formatValue(value * 100)}%`
  }

  return `${value >= 0 ? "+" : ""}${formatValue(value)}`
}

function summarizeSkillMatrixEffects(
  rows: StaticBuildSkillMatrixRow[],
): StaticBuildSkillMatrixEffectSummaryItem[] {
  const summary = new Map<
    string,
    {
      effectId: string
      sourceName: string
      label: string
      bucketTexts: Set<string>
      valueTexts: Set<string>
      rows: Set<string>
    }
  >()

  for (const row of rows) {
    for (const trace of row.build.trace) {
      if (trace.status !== "applied" || !trace.modifiers?.length) continue

      let item = summary.get(trace.effectId)
      if (!item) {
        item = {
          effectId: trace.effectId,
          sourceName: trace.sourceName,
          label: trace.label,
          bucketTexts: new Set<string>(),
          valueTexts: new Set<string>(),
          rows: new Set<string>(),
        }
        summary.set(trace.effectId, item)
      }

      item.rows.add(row.id)
      for (const modifier of trace.modifiers) {
        item.bucketTexts.add(
          bucketLabels[modifier.bucket as keyof typeof bucketLabels] ??
            modifier.bucket,
        )
        item.valueTexts.add(
          formatModifier(modifier.bucket, modifier.value, modifier.combine),
        )
      }
    }
  }

  return [...summary.values()].map((item) => {
    const appliedRowCount = item.rows.size
    const totalRowCount = rows.length
    const appliesToAllRows = appliedRowCount === totalRowCount
    return {
      effectId: item.effectId,
      sourceName: item.sourceName,
      label: item.label,
      bucket: [...item.bucketTexts].join(" + "),
      value: [...item.valueTexts].join("；"),
      appliedRowCount,
      totalRowCount,
      appliesToAllRows,
      condition: appliesToAllRows
        ? "当前矩阵全部生效"
        : `部分技能生效（${appliedRowCount}/${totalRowCount}）`,
    }
  })
}

function summarizeSkillMatrixRequirements(): StaticBuildSourceDamageViewRequirementSummary {
  return {
    count: 0,
    satisfiedCount: 0,
    unsatisfiedCount: 0,
    hasUnsatisfied: false,
    groups: [],
  }
}

function summarizeSkillMatrixCaveats(
  assumptions: StaticBuildAssumptionList,
  unsupportedEffects: StaticBuildUnsupportedEffectList,
) {
  return {
    assumptionCount: assumptions.length,
    unsupportedEffectCount: unsupportedEffects.length,
    hasAssumptions: assumptions.length > 0,
    hasUnsupportedEffects: unsupportedEffects.length > 0,
  }
}

function summarizeSkillMatrix(rows: StaticBuildSkillMatrixRow[]) {
  const first = rows[0]?.build
  const { commonBuckets, variableBuckets } = summarizeBuckets(rows)
  const { commonFormulaMultipliers, variableFormulaMultipliers } =
    summarizeFormulaMultipliers(rows)
  const assumptions: StaticBuildAssumptionList = [
    ...new Set(rows.flatMap((row) => row.assumptions)),
  ]
  const unsupportedEffects: StaticBuildUnsupportedEffectList = [
    ...new Set(rows.flatMap((row) => row.unsupportedEffects)),
  ]
  const groups = Array.from(
    rows.reduce((map, row) => {
      const groupRows = map.get(row.group) ?? []
      groupRows.push(row)
      map.set(row.group, groupRows)
      return map
    }, new Map<string, StaticBuildSkillMatrixRow[]>()),
  ).map(([group, groupRows]) => ({
    ...(() => {
      const assumptions: StaticBuildAssumptionList = [
        ...new Set(groupRows.flatMap((row) => row.assumptions)),
      ]
      const unsupportedEffects: StaticBuildUnsupportedEffectList = [
        ...new Set(groupRows.flatMap((row) => row.unsupportedEffects)),
      ]
      return {
        assumptionSummary: summarizeAssumptions(assumptions),
        requirementSummary: summarizeSkillMatrixRequirements(),
        caveatSummary: summarizeSkillMatrixCaveats(
          assumptions,
          unsupportedEffects,
        ),
        assumptions,
        unsupportedEffects,
      }
    })(),
    ...(() => {
      const { commonBuckets, variableBuckets } = summarizeBuckets(groupRows)
      const { commonFormulaMultipliers, variableFormulaMultipliers } =
        summarizeFormulaMultipliers(groupRows)
      return {
        commonBuckets,
        variableBuckets,
        commonFormulaMultipliers,
        variableFormulaMultipliers,
      }
    })(),
    key: group,
    label: group,
    count: groupRows.length,
    effectSummary: summarizeSkillMatrixEffects(groupRows),
    diagnosticSummary: summarizeDiagnosticEntries(
      groupRows.flatMap((row) => row.diagnostics),
    ),
    sourceNoteSummary: summarizeSourceNoteEntries(
      groupRows.flatMap((row) => row.sourceNotes),
    ),
  }))

  if (!first) {
    throw new RangeError("Cannot summarize empty skill matrix")
  }

  return {
    rowCount: rows.length,
    baseDamageStat: first.resolvedPanel.baseDamageStat,
    baseDamageValue: first.resolvedPanel.baseDamageValue,
    attack: first.resolvedPanel.attack,
    hp: first.resolvedPanel.hp,
    sheerForce: first.resolvedPanel.sheerForce,
    critRate: first.resolvedPanel.critRate,
    critDamage: first.resolvedPanel.critDamage,
    penetrationRate: first.resolvedPanel.penetrationRate,
    penetrationValue: first.resolvedPanel.penetrationValue,
    commonBuckets,
    variableBuckets,
    commonFormulaMultipliers,
    variableFormulaMultipliers,
    effectSummary: summarizeSkillMatrixEffects(rows),
    requirementSummary: summarizeSkillMatrixRequirements(),
    assumptionSummary: summarizeAssumptions(assumptions),
    caveatSummary: summarizeSkillMatrixCaveats(assumptions, unsupportedEffects),
    diagnosticSummary: summarizeDiagnosticEntries(
      rows.flatMap((row) => row.diagnostics),
    ),
    sourceNoteSummary: summarizeSourceNoteEntries(
      rows.flatMap((row) => row.sourceNotes),
    ),
    groups,
  }
}

const curatedSkillMatrixTemplates: SkillMatrixTemplate[] = [
  {
    id: "1041-basic-warmup-1",
    agentId: "1041",
    group: "普通攻击",
    label: "普通攻击·热身火花·一段",
    skillTypeId: 0,
    statName: "一段伤害倍率",
    skillTag: "basic",
  },
  {
    id: "1041-basic-warmup-2",
    agentId: "1041",
    group: "普通攻击",
    label: "普通攻击·热身火花·二段",
    skillTypeId: 0,
    statName: "二段伤害倍率",
    skillTag: "basic",
  },
  {
    id: "1041-basic-warmup-3",
    agentId: "1041",
    group: "普通攻击",
    label: "普通攻击·热身火花·三段",
    skillTypeId: 0,
    statName: "三段伤害倍率",
    skillTag: "basic",
  },
  {
    id: "1041-basic-warmup-4",
    agentId: "1041",
    group: "普通攻击",
    label: "普通攻击·热身火花·四段",
    skillTypeId: 0,
    statName: "四段伤害倍率",
    skillTag: "basic",
  },
  {
    id: "1041-basic-suppression-1",
    agentId: "1041",
    group: "普通攻击",
    label: "普通攻击·火力镇压·一段",
    skillTypeId: 0,
    statName: "一段伤害倍率",
    occurrence: 2,
    skillTag: "basic",
    combatTags: ["fireSuppression"],
  },
  {
    id: "1041-basic-suppression-2",
    agentId: "1041",
    group: "普通攻击",
    label: "普通攻击·火力镇压·二段",
    skillTypeId: 0,
    statName: "二段伤害倍率",
    occurrence: 2,
    skillTag: "basic",
    combatTags: ["fireSuppression"],
  },
  {
    id: "1041-basic-suppression-3",
    agentId: "1041",
    group: "普通攻击",
    label: "普通攻击·火力镇压·三段",
    skillTypeId: 0,
    statName: "三段伤害倍率",
    occurrence: 2,
    skillTag: "basic",
    combatTags: ["fireSuppression"],
  },
  {
    id: "1041-basic-suppression-4",
    agentId: "1041",
    group: "普通攻击",
    label: "普通攻击·火力镇压·四段",
    skillTypeId: 0,
    statName: "四段伤害倍率",
    occurrence: 2,
    skillTag: "basic",
    combatTags: ["fireSuppression"],
  },
  {
    id: "1041-basic-suppression-5",
    agentId: "1041",
    group: "普通攻击",
    label: "普通攻击·火力镇压·五段",
    skillTypeId: 0,
    statName: "五段伤害倍率",
    skillTag: "basic",
    combatTags: ["fireSuppression"],
  },
  {
    id: "1041-basic-suppression-enhanced-5",
    agentId: "1041",
    group: "普通攻击",
    label: "普通攻击·火力镇压·强化五段",
    skillTypeId: 0,
    statName: "强化普攻第五段伤害倍率",
    skillTag: "basic",
    combatTags: ["fireSuppression"],
  },
  {
    id: "1041-basic-suppression-enhanced-extra",
    agentId: "1041",
    group: "普通攻击",
    label: "普通攻击·火力镇压·强化五段追加",
    skillTypeId: 0,
    statName: "强化普攻第五段额外伤害倍率",
    skillTag: "basic",
    combatTags: ["fireSuppression"],
  },
  {
    id: "1041-basic-fire-burst",
    agentId: "1041",
    group: "普通攻击",
    label: "普通攻击·火力迸发",
    skillTypeId: 0,
    statName: "普通攻击:火力迸发伤害倍率",
    skillTag: "basic",
    combatTags: ["fireSuppression"],
  },
  {
    id: "1041-dash-scorch",
    agentId: "1041",
    group: "闪避",
    label: "冲刺攻击·炽火",
    skillTypeId: 2,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "dash",
  },
  {
    id: "1041-dash-fire-suppression",
    agentId: "1041",
    group: "闪避",
    label: "冲刺攻击·火力镇压",
    skillTypeId: 2,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "dash",
    combatTags: ["fireSuppression"],
  },
  {
    id: "1041-dodge-counter",
    agentId: "1041",
    group: "闪避",
    label: "闪避反击·逆火",
    skillTypeId: 2,
    statName: "伤害倍率",
    occurrence: 3,
    skillTag: "dash",
  },
  {
    id: "1041-assist-quick",
    agentId: "1041",
    group: "支援技",
    label: "快速支援·火力掩护",
    skillTypeId: 6,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "assist",
  },
  {
    id: "1041-assist-follow-up",
    agentId: "1041",
    group: "支援技",
    label: "支援突击·重燃",
    skillTypeId: 6,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "assist",
  },
  {
    id: "1041-special",
    agentId: "1041",
    group: "特殊技",
    label: "特殊技·烈火",
    skillTypeId: 1,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "special",
  },
  {
    id: "1041-enhanced-special",
    agentId: "1041",
    group: "特殊技",
    label: "强化特殊技·盛燃烈火",
    skillTypeId: 1,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "enhancedSpecial",
  },
  {
    id: "1041-chain",
    agentId: "1041",
    group: "连携技",
    label: "连携技·昂扬烈焰",
    skillTypeId: 3,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "chain",
  },
  {
    id: "1041-ultimate",
    agentId: "1041",
    group: "连携技",
    label: "终结技·轰鸣烈焰",
    skillTypeId: 3,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "ultimate",
  },
  {
    id: "1191-basic-cut-1",
    agentId: "1191",
    group: "普通攻击",
    label: "普通攻击·利齿修剪法·一段",
    skillTypeId: 0,
    statName: "一段伤害倍率",
    occurrence: 1,
    skillTag: "basic",
  },
  {
    id: "1191-basic-cut-2",
    agentId: "1191",
    group: "普通攻击",
    label: "普通攻击·利齿修剪法·二段",
    skillTypeId: 0,
    statName: "二段伤害倍率",
    occurrence: 1,
    skillTag: "basic",
  },
  {
    id: "1191-basic-cut-3",
    agentId: "1191",
    group: "普通攻击",
    label: "普通攻击·利齿修剪法·三段",
    skillTypeId: 0,
    statName: "三段伤害倍率",
    occurrence: 1,
    skillTag: "basic",
  },
  {
    id: "1191-basic-freeze-1",
    agentId: "1191",
    group: "普通攻击",
    label: "普通攻击·急冻修剪法·一段",
    skillTypeId: 0,
    statName: "一段伤害倍率",
    occurrence: 2,
    skillTag: "basic",
    combatTags: ["flashFreezeCharge"],
  },
  {
    id: "1191-basic-freeze-2",
    agentId: "1191",
    group: "普通攻击",
    label: "普通攻击·急冻修剪法·二段",
    skillTypeId: 0,
    statName: "二段伤害倍率",
    occurrence: 2,
    skillTag: "basic",
    combatTags: ["flashFreezeCharge"],
  },
  {
    id: "1191-basic-freeze-3",
    agentId: "1191",
    group: "普通攻击",
    label: "普通攻击·急冻修剪法·三段",
    skillTypeId: 0,
    statName: "三段伤害倍率",
    occurrence: 2,
    skillTag: "basic",
    combatTags: ["flashFreezeCharge"],
  },
  {
    id: "1191-basic-ice-wave-1",
    agentId: "1191",
    group: "普通攻击",
    label: "普通攻击·冰刃浪·一段",
    skillTypeId: 0,
    statName: "一段伤害倍率",
    occurrence: 3,
    skillTag: "basic",
    combatTags: ["flashFreezeCharge"],
  },
  {
    id: "1191-basic-ice-wave-2",
    agentId: "1191",
    group: "普通攻击",
    label: "普通攻击·冰刃浪·二段",
    skillTypeId: 0,
    statName: "二段伤害倍率",
    occurrence: 3,
    skillTag: "basic",
    combatTags: ["flashFreezeCharge"],
  },
  {
    id: "1191-basic-frost-small",
    agentId: "1191",
    group: "普通攻击",
    label: "普通攻击·霜锋·小体型",
    skillTypeId: 0,
    statName: "对小体型敌人伤害倍率",
    skillTag: "basic",
    combatTags: ["flashFreezeCharge"],
  },
  {
    id: "1191-basic-frost-medium",
    agentId: "1191",
    group: "普通攻击",
    label: "普通攻击·霜锋·中体型",
    skillTypeId: 0,
    statName: "对中体型敌人伤害倍率",
    skillTag: "basic",
    combatTags: ["flashFreezeCharge"],
  },
  {
    id: "1191-basic-frost-large",
    agentId: "1191",
    group: "普通攻击",
    label: "普通攻击·霜锋·大体型",
    skillTypeId: 0,
    statName: "对大体型敌人伤害倍率",
    skillTag: "basic",
    combatTags: ["flashFreezeCharge"],
  },
  {
    id: "1191-dash-spin",
    agentId: "1191",
    group: "闪避",
    label: "冲刺攻击·冰渊潜袭·回旋斩击",
    skillTypeId: 2,
    statName: "回旋斩击伤害倍率",
    skillTag: "dash",
  },
  {
    id: "1191-dash-quick",
    agentId: "1191",
    group: "闪避",
    label: "冲刺攻击·冰渊潜袭·快速剪击",
    skillTypeId: 2,
    statName: "快速剪击伤害倍率",
    skillTag: "dash",
  },
  {
    id: "1191-dash-charge",
    agentId: "1191",
    group: "闪避",
    label: "冲刺攻击·冰渊潜袭·蓄力剪击",
    skillTypeId: 2,
    statName: "蓄力剪击伤害倍率",
    skillTag: "dash",
    combatTags: ["flashFreezeCharge"],
  },
  {
    id: "1191-dash-surf",
    agentId: "1191",
    group: "闪避",
    label: "冲刺攻击·骇浪",
    skillTypeId: 2,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "dash",
  },
  {
    id: "1191-dash-cold-current",
    agentId: "1191",
    group: "闪避",
    label: "冲刺攻击·寒潮",
    skillTypeId: 2,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "dash",
  },
  {
    id: "1191-dodge-counter",
    agentId: "1191",
    group: "闪避",
    label: "闪避反击·暗礁",
    skillTypeId: 2,
    statName: "伤害倍率",
    occurrence: 3,
    skillTag: "dash",
  },
  {
    id: "1191-assist-quick",
    agentId: "1191",
    group: "支援技",
    label: "快速支援·护卫鲛",
    skillTypeId: 6,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "assist",
  },
  {
    id: "1191-assist-follow-up",
    agentId: "1191",
    group: "支援技",
    label: "支援突击·巡洋鲨",
    skillTypeId: 6,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "assist",
  },
  {
    id: "1191-special-tail",
    agentId: "1191",
    group: "特殊技",
    label: "特殊技·摆尾",
    skillTypeId: 1,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "special",
  },
  {
    id: "1191-enhanced-special-sweep",
    agentId: "1191",
    group: "特殊技",
    label: "强化特殊技·横扫",
    skillTypeId: 1,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "enhancedSpecial",
  },
  {
    id: "1191-enhanced-special-tornado",
    agentId: "1191",
    group: "特殊技",
    label: "强化特殊技·鲨卷风",
    skillTypeId: 1,
    statName: "伤害倍率",
    occurrence: 3,
    skillTag: "enhancedSpecial",
  },
  {
    id: "1191-chain",
    agentId: "1191",
    group: "连携技",
    label: "连携技·雪崩",
    skillTypeId: 3,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "chain",
    combatTags: ["flashFreezeCharge"],
  },
  {
    id: "1191-ultimate",
    agentId: "1191",
    group: "连携技",
    label: "终结技·永冬狂宴",
    skillTypeId: 3,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "ultimate",
    combatTags: ["flashFreezeCharge"],
  },
  {
    id: "1201-basic-cloud-1",
    agentId: "1201",
    group: "普通攻击",
    label: "普通攻击·穿云·一段",
    skillTypeId: 0,
    statName: "一段伤害倍率",
    skillTag: "basic",
  },
  {
    id: "1201-basic-cloud-2",
    agentId: "1201",
    group: "普通攻击",
    label: "普通攻击·穿云·二段",
    skillTypeId: 0,
    statName: "二段伤害倍率",
    skillTag: "basic",
  },
  {
    id: "1201-basic-cloud-3",
    agentId: "1201",
    group: "普通攻击",
    label: "普通攻击·穿云·三段",
    skillTypeId: 0,
    statName: "三段伤害倍率",
    skillTag: "basic",
  },
  {
    id: "1201-basic-cloud-4",
    agentId: "1201",
    group: "普通攻击",
    label: "普通攻击·穿云·四段",
    skillTypeId: 0,
    statName: "四段伤害倍率",
    skillTag: "basic",
  },
  {
    id: "1201-basic-cloud-5",
    agentId: "1201",
    group: "普通攻击",
    label: "普通攻击·穿云·五段",
    skillTypeId: 0,
    statName: "五段伤害倍率",
    skillTag: "basic",
  },
  {
    id: "1201-basic-shift",
    agentId: "1201",
    group: "普通攻击",
    label: "普通攻击·穿云·移形",
    skillTypeId: 0,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "basic",
  },
  {
    id: "1201-basic-feather",
    agentId: "1201",
    group: "普通攻击",
    label: "普通攻击·落羽",
    skillTypeId: 0,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "basic",
  },
  {
    id: "1201-basic-arrow",
    agentId: "1201",
    group: "普通攻击",
    label: "普通攻击·甲乙矢",
    skillTypeId: 0,
    statName: "伤害倍率",
    occurrence: 3,
    skillTag: "basic",
  },
  {
    id: "1201-dash-feixian",
    agentId: "1201",
    group: "闪避",
    label: "冲刺攻击·飞弦",
    skillTypeId: 2,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "dash",
  },
  {
    id: "1201-dodge-counter",
    agentId: "1201",
    group: "闪避",
    label: "闪避反击·藏锋",
    skillTypeId: 2,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "dash",
  },
  {
    id: "1201-dash-slash-1",
    agentId: "1201",
    group: "闪避",
    label: "冲刺攻击·飞弦·斩·一段",
    skillTypeId: 2,
    statName: "一段伤害倍率",
    skillTag: "dash",
    combatTags: ["harumasaSharpness"],
  },
  {
    id: "1201-dash-slash-2",
    agentId: "1201",
    group: "闪避",
    label: "冲刺攻击·飞弦·斩·二段",
    skillTypeId: 2,
    statName: "二段伤害倍率",
    skillTag: "dash",
    combatTags: ["harumasaSharpness"],
  },
  {
    id: "1201-dash-slash-3",
    agentId: "1201",
    group: "闪避",
    label: "冲刺攻击·飞弦·斩·三段",
    skillTypeId: 2,
    statName: "三段伤害倍率",
    skillTag: "dash",
    combatTags: ["harumasaSharpness"],
  },
  {
    id: "1201-dash-slash-extra",
    agentId: "1201",
    group: "闪避",
    label: "冲刺攻击·飞弦·斩·额外伤害",
    skillTypeId: 2,
    statName: "额外伤害倍率",
    skillTag: "dash",
    combatTags: ["harumasaSharpness"],
  },
  {
    id: "1201-assist-quick",
    agentId: "1201",
    group: "支援技",
    label: "快速支援·穿弦",
    skillTypeId: 6,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "assist",
  },
  {
    id: "1201-assist-follow-up",
    agentId: "1201",
    group: "支援技",
    label: "支援突击·构身·斩",
    skillTypeId: 6,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "assist",
  },
  {
    id: "1201-special",
    agentId: "1201",
    group: "特殊技",
    label: "特殊技·天罗",
    skillTypeId: 1,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "special",
  },
  {
    id: "1201-enhanced-special-net",
    agentId: "1201",
    group: "特殊技",
    label: "强化特殊技·地网",
    skillTypeId: 1,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "enhancedSpecial",
  },
  {
    id: "1201-enhanced-special-patrol",
    agentId: "1201",
    group: "特殊技",
    label: "强化特殊技·地网·巡弋",
    skillTypeId: 1,
    statName: "伤害倍率",
    occurrence: 3,
    skillTag: "enhancedSpecial",
  },
  {
    id: "1201-chain",
    agentId: "1201",
    group: "连携技",
    label: "连携技·会·离",
    skillTypeId: 3,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "chain",
  },
  {
    id: "1201-ultimate",
    agentId: "1201",
    group: "连携技",
    label: "终结技·残心",
    skillTypeId: 3,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "ultimate",
    combatTags: ["harumasaSharpness"],
  },
  {
    id: "1201-ultimate-bloom",
    agentId: "1201",
    group: "连携技",
    label: "终结技·残心·散华",
    skillTypeId: 3,
    statName: "伤害倍率",
    occurrence: 3,
    skillTag: "ultimate",
    combatTags: ["harumasaSharpness"],
  },
  {
    id: "1241-basic-1",
    agentId: "1241",
    group: "普通攻击",
    label: "普通攻击·一段",
    skillTypeId: 0,
    statName: "一段伤害倍率",
    skillTag: "basic",
  },
  {
    id: "1241-basic-2",
    agentId: "1241",
    group: "普通攻击",
    label: "普通攻击·二段",
    skillTypeId: 0,
    statName: "二段伤害倍率",
    skillTag: "basic",
  },
  {
    id: "1241-basic-3",
    agentId: "1241",
    group: "普通攻击",
    label: "普通攻击·三段",
    skillTypeId: 0,
    statName: "三段伤害倍率",
    skillTag: "basic",
  },
  {
    id: "1241-basic-4",
    agentId: "1241",
    group: "普通攻击",
    label: "普通攻击·四段",
    skillTypeId: 0,
    statName: "四段伤害倍率",
    skillTag: "basic",
  },
  {
    id: "1241-basic-5",
    agentId: "1241",
    group: "普通攻击",
    label: "普通攻击·五段",
    skillTypeId: 0,
    statName: "五段伤害倍率",
    skillTag: "basic",
  },
  {
    id: "1241-suppression-physical-1",
    agentId: "1241",
    group: "普通攻击",
    label: "普通攻击·请勿抵抗·物理一段",
    skillTypeId: 0,
    statName: "一段伤害倍率（物理）",
    skillTag: "basic",
    attribute: "Physical",
    combatTags: ["suppressionMode"],
  },
  {
    id: "1241-suppression-physical-2",
    agentId: "1241",
    group: "普通攻击",
    label: "普通攻击·请勿抵抗·物理二段",
    skillTypeId: 0,
    statName: "二段伤害倍率（物理）",
    skillTag: "basic",
    attribute: "Physical",
    combatTags: ["suppressionMode"],
  },
  {
    id: "1241-suppression-physical-3",
    agentId: "1241",
    group: "普通攻击",
    label: "普通攻击·请勿抵抗·物理三段",
    skillTypeId: 0,
    statName: "三段伤害倍率（物理）",
    skillTag: "basic",
    attribute: "Physical",
    combatTags: ["suppressionMode"],
  },
  {
    id: "1241-suppression-ether-1",
    agentId: "1241",
    group: "普通攻击",
    label: "普通攻击·请勿抵抗·以太一段",
    skillTypeId: 0,
    statName: "一段伤害倍率（以太）",
    skillTag: "basic",
    attribute: "Ether",
    combatTags: ["suppressionMode"],
  },
  {
    id: "1241-suppression-ether-2",
    agentId: "1241",
    group: "普通攻击",
    label: "普通攻击·请勿抵抗·以太二段",
    skillTypeId: 0,
    statName: "二段伤害倍率（以太）",
    skillTag: "basic",
    attribute: "Ether",
    combatTags: ["suppressionMode"],
  },
  {
    id: "1241-suppression-ether-3",
    agentId: "1241",
    group: "普通攻击",
    label: "普通攻击·请勿抵抗·以太三段",
    skillTypeId: 0,
    statName: "三段伤害倍率（以太）",
    skillTag: "basic",
    attribute: "Ether",
    combatTags: ["suppressionMode"],
  },
  {
    id: "1241-dash-ambush",
    agentId: "1241",
    group: "闪避",
    label: "冲刺攻击·火力奇袭",
    skillTypeId: 2,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "dash",
  },
  {
    id: "1241-dash-suppression-physical",
    agentId: "1241",
    group: "闪避",
    label: "冲刺攻击·火力压制·物理",
    skillTypeId: 2,
    statName: "伤害倍率（物理）",
    skillTag: "dash",
    attribute: "Physical",
    combatTags: ["suppressionMode"],
  },
  {
    id: "1241-dash-suppression-ether",
    agentId: "1241",
    group: "闪避",
    label: "冲刺攻击·火力压制·以太",
    skillTypeId: 2,
    statName: "伤害倍率（以太）",
    skillTag: "dash",
    attribute: "Ether",
    combatTags: ["suppressionMode"],
  },
  {
    id: "1241-dodge-counter",
    agentId: "1241",
    group: "闪避",
    label: "闪避反击·火力震爆",
    skillTypeId: 2,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "dash",
  },
  {
    id: "1241-assist-quick",
    agentId: "1241",
    group: "支援技",
    label: "快速支援·掩护射击",
    skillTypeId: 6,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "assist",
  },
  {
    id: "1241-assist-follow-up",
    agentId: "1241",
    group: "支援技",
    label: "支援突击·自卫还击",
    skillTypeId: 6,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "assist",
  },
  {
    id: "1241-special",
    agentId: "1241",
    group: "特殊技",
    label: "特殊技·鹿弹射击",
    skillTypeId: 1,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "special",
  },
  {
    id: "1241-enhanced-special",
    agentId: "1241",
    group: "特殊技",
    label: "强化特殊技·全弹连射",
    skillTypeId: 1,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "enhancedSpecial",
  },
  {
    id: "1241-chain",
    agentId: "1241",
    group: "连携技",
    label: "连携技·歼灭模式",
    skillTypeId: 3,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "chain",
  },
  {
    id: "1241-ultimate",
    agentId: "1241",
    group: "连携技",
    label: "终结技·歼灭模式MAX",
    skillTypeId: 3,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "ultimate",
  },
  {
    id: "1321-basic-1",
    agentId: "1321",
    group: "普通攻击",
    label: "普通攻击·一段",
    skillTypeId: 0,
    statName: "一段伤害倍率",
    skillTag: "basic",
  },
  {
    id: "1321-basic-2",
    agentId: "1321",
    group: "普通攻击",
    label: "普通攻击·二段",
    skillTypeId: 0,
    statName: "二段伤害倍率",
    skillTag: "basic",
  },
  {
    id: "1321-basic-3",
    agentId: "1321",
    group: "普通攻击",
    label: "普通攻击·三段",
    skillTypeId: 0,
    statName: "三段伤害倍率",
    skillTag: "basic",
  },
  {
    id: "1321-basic-4",
    agentId: "1321",
    group: "普通攻击",
    label: "普通攻击·四段",
    skillTypeId: 0,
    statName: "四段伤害倍率",
    skillTag: "basic",
  },
  {
    id: "1321-basic-5",
    agentId: "1321",
    group: "普通攻击",
    label: "普通攻击·五段",
    skillTypeId: 0,
    statName: "五段伤害倍率",
    skillTag: "basic",
  },
  {
    id: "1321-basic-bind",
    agentId: "1321",
    group: "普通攻击",
    label: "普通攻击·绞勒式·I型",
    skillTypeId: 0,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "basic",
  },
  {
    id: "1321-basic-bind-ii",
    agentId: "1321",
    group: "普通攻击",
    label: "普通攻击·绞勒式·II型",
    skillTypeId: 0,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "basic",
  },
  {
    id: "1321-dash",
    agentId: "1321",
    group: "闪避",
    label: "冲刺攻击·穿梭潜袭",
    skillTypeId: 2,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "dash",
  },
  {
    id: "1321-dodge-counter",
    agentId: "1321",
    group: "闪避",
    label: "闪避反击·绞缢反制",
    skillTypeId: 2,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "dash",
  },
  {
    id: "1321-assist-quick",
    agentId: "1321",
    group: "支援技",
    label: "快速支援·烈锋",
    skillTypeId: 6,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "assist",
  },
  {
    id: "1321-assist-follow-up",
    agentId: "1321",
    group: "支援技",
    label: "支援突击·轨迹干涉",
    skillTypeId: 6,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "assist",
  },
  {
    id: "1321-special-lock",
    agentId: "1321",
    group: "特殊技",
    label: "特殊技·锁系控位",
    skillTypeId: 1,
    statName: "一段伤害倍率",
    skillTag: "special",
  },
  {
    id: "1321-special-bind-wrap",
    agentId: "1321",
    group: "特殊技",
    label: "特殊技·束裂式·I型·缠绕",
    skillTypeId: 1,
    statName: "缠绕伤害倍率",
    occurrence: 1,
    skillTag: "special",
  },
  {
    id: "1321-special-bind-detonate",
    agentId: "1321",
    group: "特殊技",
    label: "特殊技·束裂式·I型·引爆",
    skillTypeId: 1,
    statName: "引爆伤害倍率",
    occurrence: 1,
    skillTag: "special",
  },
  {
    id: "1321-enhanced-wrap",
    agentId: "1321",
    group: "特殊技",
    label: "强化特殊技·束裂式·终型·缠绕",
    skillTypeId: 1,
    statName: "缠绕伤害倍率",
    occurrence: 2,
    skillTag: "enhancedSpecial",
  },
  {
    id: "1321-enhanced-detonate",
    agentId: "1321",
    group: "特殊技",
    label: "强化特殊技·束裂式·终型·引爆",
    skillTypeId: 1,
    statName: "引爆伤害倍率",
    occurrence: 2,
    skillTag: "enhancedSpecial",
  },
  {
    id: "1321-chain",
    agentId: "1321",
    group: "连携技",
    label: "连携技·月辉丝·绊",
    skillTypeId: 3,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "chain",
  },
  {
    id: "1321-ultimate-stringsong",
    agentId: "1321",
    group: "连携技",
    label: "终结技·月辉丝·弦音",
    skillTypeId: 3,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "ultimate",
  },
  {
    id: "1321-ultimate-shadow",
    agentId: "1321",
    group: "连携技",
    label: "终结技·月辉丝·弦影",
    skillTypeId: 3,
    statName: "伤害倍率",
    occurrence: 3,
    skillTag: "ultimate",
  },
  {
    id: "1371-basic-1",
    agentId: "1371",
    group: "普通攻击",
    label: "普通攻击·一段",
    skillTypeId: 0,
    statName: "一段伤害倍率",
    skillTag: "basic",
    damageType: "sheer",
  },
  {
    id: "1371-basic-2",
    agentId: "1371",
    group: "普通攻击",
    label: "普通攻击·二段",
    skillTypeId: 0,
    statName: "二段伤害倍率",
    skillTag: "basic",
    damageType: "sheer",
  },
  {
    id: "1371-basic-3",
    agentId: "1371",
    group: "普通攻击",
    label: "普通攻击·三段",
    skillTypeId: 0,
    statName: "三段伤害倍率",
    skillTag: "basic",
    damageType: "sheer",
  },
  {
    id: "1371-basic-4",
    agentId: "1371",
    group: "普通攻击",
    label: "普通攻击·四段",
    skillTypeId: 0,
    statName: "四段伤害倍率",
    skillTag: "basic",
    damageType: "sheer",
  },
  {
    id: "1371-basic-5",
    agentId: "1371",
    group: "普通攻击",
    label: "普通攻击·五段",
    skillTypeId: 0,
    statName: "五段伤害倍率",
    skillTag: "basic",
    damageType: "sheer",
  },
  {
    id: "1371-basic-ink-cloud",
    agentId: "1371",
    group: "普通攻击",
    label: "普通攻击·墨影凝云",
    skillTypeId: 0,
    statName: "墨影凝云总伤害倍率",
    skillTag: "basic",
    damageType: "sheer",
  },
  {
    id: "1371-basic-auric-array",
    agentId: "1371",
    group: "普通攻击",
    label: "普通攻击·玄墨极阵",
    skillTypeId: 0,
    statName: "玄墨极阵总伤害倍率",
    skillTag: "basic",
    damageType: "sheer",
  },
  {
    id: "1371-basic-qingming-shock",
    agentId: "1371",
    group: "普通攻击",
    label: "普通攻击·青溟震击",
    skillTypeId: 0,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "basic",
    damageType: "sheer",
  },
  {
    id: "1371-dash",
    agentId: "1371",
    group: "闪避",
    label: "冲刺攻击·凌云破",
    skillTypeId: 2,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "dash",
    damageType: "sheer",
  },
  {
    id: "1371-dodge-counter",
    agentId: "1371",
    group: "闪避",
    label: "闪避反击·除祟一击",
    skillTypeId: 2,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "dash",
    damageType: "sheer",
  },
  {
    id: "1371-assist-quick",
    agentId: "1371",
    group: "支援技",
    label: "快速支援·流云影身",
    skillTypeId: 6,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "assist",
    damageType: "sheer",
  },
  {
    id: "1371-assist-follow-up",
    agentId: "1371",
    group: "支援技",
    label: "支援突击·霄云迅击",
    skillTypeId: 6,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "assist",
    damageType: "sheer",
  },
  {
    id: "1371-special",
    agentId: "1371",
    group: "特殊技",
    label: "特殊技·烬影诀",
    skillTypeId: 1,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "special",
    damageType: "sheer",
  },
  {
    id: "1371-enhanced-ink-form",
    agentId: "1371",
    group: "特殊技",
    label: "强化特殊技·墨痕化形",
    skillTypeId: 1,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "enhancedSpecial",
    damageType: "sheer",
  },
  {
    id: "1371-enhanced-ink-form-charge",
    agentId: "1371",
    group: "特殊技",
    label: "强化特殊技·墨痕化形·蓄力追加",
    skillTypeId: 1,
    statName: "蓄力完成追加伤害倍率",
    skillTag: "enhancedSpecial",
    damageType: "sheer",
  },
  {
    id: "1371-enhanced-cloud-strike",
    agentId: "1371",
    group: "特殊技",
    label: "强化特殊技·霄云迅击-破",
    skillTypeId: 1,
    statName: "[强化特殊技：霄云迅击-破]总伤害倍率",
    skillTag: "enhancedSpecial",
    damageType: "sheer",
  },
  {
    id: "1371-enhanced-qingming-shock",
    agentId: "1371",
    group: "特殊技",
    label: "强化特殊技·青溟震击-破",
    skillTypeId: 1,
    statName: "[强化特殊技：青溟震击-破]总伤害倍率",
    skillTag: "enhancedSpecial",
    damageType: "sheer",
  },
  {
    id: "1371-enhanced-cloud-channel",
    agentId: "1371",
    group: "特殊技",
    label: "强化特殊技·凝云术·蓄力期间",
    skillTypeId: 1,
    statName: "蓄力期间总伤害倍率",
    skillTag: "enhancedSpecial",
    damageType: "sheer",
  },
  {
    id: "1371-enhanced-fade",
    agentId: "1371",
    group: "特殊技",
    label: "强化特殊技·墨烬影消",
    skillTypeId: 1,
    statName: "伤害倍率",
    occurrence: 3,
    skillTag: "enhancedSpecial",
    damageType: "sheer",
  },
  {
    id: "1371-chain",
    agentId: "1371",
    group: "连携技",
    label: "连携技·玄墨迅击",
    skillTypeId: 3,
    statName: "伤害倍率",
    occurrence: 1,
    skillTag: "chain",
    damageType: "sheer",
  },
  {
    id: "1371-ultimate-cloud-shadow",
    agentId: "1371",
    group: "连携技",
    label: "终结技·青溟云影",
    skillTypeId: 3,
    statName: "伤害倍率",
    occurrence: 2,
    skillTag: "ultimate",
    damageType: "sheer",
  },
  {
    id: "1371-ultimate-thousand-charms",
    agentId: "1371",
    group: "连携技",
    label: "终结技·符法千重",
    skillTypeId: 3,
    statName: "伤害倍率",
    occurrence: 3,
    skillTag: "ultimate",
    damageType: "sheer",
  },
]

export function resolveStaticBuildSkillMatrix(
  input: ResolveStaticBuildSkillMatrixInput,
): ResolveStaticBuildSkillMatrixResult {
  const agent = getStaticBuildAgent(input.loadout.agentId)
  if (!agent) {
    throw new RangeError(`Unsupported agentId: ${input.loadout.agentId}`)
  }
  if (agent.defaultDamageType === "anomaly") {
    throw new RangeError(
      `${agent.name} 当前仅支持单次 anomaly resolver，尚不支持 skill matrix`,
    )
  }

  const templates = curatedSkillMatrixTemplates.filter(
    (item) => item.agentId === agent.id,
  )
  const resolvedTemplates =
    templates.length > 0
      ? templates
      : buildGeneratedSkillMatrixTemplates(agent.id)
  const templateSource = templates.length > 0 ? "curated" : "generated"
  if (!resolvedTemplates.length) {
    throw new RangeError(`No skill matrix templates for agentId=${agent.id}`)
  }

  const assumptions: StaticBuildAssumptionList = []
  const globalCombatTags = input.context.combatTags ?? []
  const globalExtraAbilityActive = input.context.extraAbilityActive

  const rows = resolvedTemplates.map((template, index) => {
    const skillStat = getSkillMultiplier(
      template.agentId,
      template.skillTypeId,
      template.statName,
      template.occurrence,
    )
    const resolvedContextAttribute = toAgentAttribute(input.context.attribute)
    const attribute =
      toAgentAttribute(template.attribute) ??
      resolvedContextAttribute ??
      agent.defaultAttribute
    const attributeSource = template.attribute
      ? "template"
      : resolvedContextAttribute
        ? "context"
        : "agent-default"
    const combatTags = [
      ...new Set([...(template.combatTags ?? []), ...globalCombatTags]),
    ]

    const damageType: "normal" | "sheer" =
      template.damageType === "sheer"
        ? "sheer"
        : template.damageType === "normal"
          ? "normal"
          : agent.defaultDamageType === "sheer"
            ? "sheer"
            : "normal"

    const build = resolveStaticBuildDamage({
      mode: input.mode,
      manualBaseMode: input.manualBaseMode,
      loadout: input.loadout,
      panel: input.panel,
      scenario: {
        damageType,
        skillTag: template.skillTag,
        skillMultiplier: skillStat.value,
        attribute,
        extraAbilityActive: globalExtraAbilityActive,
        combatTags,
        enemy: input.context.enemy,
      },
      effectOverrides: input.effectOverrides,
    })

    return {
      id: template.id,
      group: template.group,
      label: template.label,
      metadata: inferSkillMatrixRowMeta(
        template,
        index + 1,
        templateSource,
        attributeSource,
        attribute,
        skillStat.statId,
      ),
      skillTag: template.skillTag,
      damageType: template.damageType ?? agent.defaultDamageType,
      attribute,
      combatTags,
      skillMultiplier: skillStat.value,
      damageSummary: {
        expected: build.damage.expected.total,
        crit: build.damage.crit.total,
        noCrit: build.damage.noCrit.total,
      },
      summary: build.summary,
      resolvedBuckets: build.resolvedBuckets,
      diagnostics: build.diagnostics,
      diagnosticSummary: summarizeDiagnosticEntries(build.diagnostics),
      sourceNotes: build.sourceNotes,
      sourceNoteSummary: summarizeSourceNoteEntries(build.sourceNotes),
      requirementSummary: summarizeSkillMatrixRequirements(),
      assumptionSummary: summarizeAssumptions(build.assumptions),
      caveatSummary: summarizeSkillMatrixCaveats(
        build.assumptions,
        build.unsupportedEffects,
      ),
      assumptions: build.assumptions,
      unsupportedEffects: build.unsupportedEffects,
      build,
    } satisfies StaticBuildSkillMatrixRow
  })

  const first = rows[0]?.build
  if (!first) {
    throw new RangeError(`Empty skill matrix for agentId=${agent.id}`)
  }

  assumptions.push(
    "技能矩阵按预定义技能模板逐项调用单次 resolver 生成；若用户未额外指定状态，只使用模板自带条件与全局 context",
  )
  if (templates.length === 0) {
    assumptions.push(
      `${agent.name} 当前使用通用技能矩阵模板生成，技能标签来自 stat name 归一化，未达到 curated 手工模板的展示精度`,
    )
  }
  const unsupportedEffects = [
    ...new Set(rows.flatMap((row) => row.unsupportedEffects)),
  ]

  return {
    profile: first.profile,
    mode: first.mode,
    manualBaseMode: first.manualBaseMode,
    loadout: first.loadout,
    summary: summarizeSkillMatrix(rows),
    effectSummary: summarizeSkillMatrixEffects(rows),
    requirementSummary: summarizeSkillMatrixRequirements(),
    assumptionSummary: summarizeAssumptions(assumptions),
    caveatSummary: summarizeSkillMatrixCaveats(assumptions, unsupportedEffects),
    diagnosticSummary: summarizeDiagnosticEntries(
      rows.flatMap((row) => row.diagnostics),
    ),
    sourceNoteSummary: summarizeSourceNoteEntries(
      rows.flatMap((row) => row.sourceNotes),
    ),
    rows,
    assumptions,
    unsupportedEffects,
  }
}
