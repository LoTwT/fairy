import type {
  AgentDetails,
  SkillParameterRow,
} from "../../src/integration/agent-types.ts"
import type {
  AgentAction,
  AgentActions,
  ActionIssue,
  SkillCoefficientCurve,
  SkillLevelGroup,
  ActionDamageSegment,
} from "../../src/skills/types.ts"
import {
  actionSourceSignature,
  anomalySettlementActionSignature,
  declaredPotentialLevels,
  isAnomalySettlementAction,
  readActionSourcePointer,
  sourceRows,
  type ActionRegistryEntry,
  type AnomalySettlementActionRegistryEntry,
  type ParameterActionRegistryEntry,
} from "./registry.ts"
import { parameterCurve, parseSkillExpression } from "./expression.ts"
import {
  PHEONY_M4_ITEM_ID,
  PHEONY_M4_TARGET_ID,
} from "../static-effects/pheony-m4.ts"

const groups: readonly SkillLevelGroup[] = [
  "basic",
  "dodge",
  "assist",
  "special",
  "chain",
]
const strip = (value: string) => value.replace(/<[^>]+>/gu, "")

function rowCurve(
  row: SkillParameterRow,
  group: SkillLevelGroup,
  property: "1001" | "1002",
  issues: ActionIssue[],
): SkillCoefficientCurve | null {
  let terms
  try {
    terms = parseSkillExpression(row.desc, property)
  } catch {
    issues.push({
      code: "unsupported-expression",
      message: `尚未支持的来源表达式：${row.desc}`,
    })
    return null
  }
  return parameterCurve(row.param ?? {}, terms, property, group)
}

const SIX_STANDARD_ELEMENTS = [
  "physical",
  "fire",
  "ice",
  "electric",
  "ether",
  "wind",
] as const

const calExpressionPattern =
  /^\{CAL:(\d+(?:\.\d+)?)\+(\d+(?:\.\d+)?)\*\(AvatarSkillLevel\((\d+)\)-1\),1,2\}%$/u

const levelGroupOfAvatarSkillLevel = {
  "0": "basic",
  "3": "chain",
} as const

/**
 * 独立异放动作来自说明/影画原文，而不是技能参数行。基础 CAL 的倍率就是
 * 异放倍率，不乘原异常系数；M4 的零初始倍率由目录选项赋值，40% 暴伤也只
 * 来自该选项。两者分别登记，不能互相复用倍率或暴伤规则。
 */
function convertAnomalySettlementAction(
  entityId: string,
  details: AgentDetails,
  entry: AnomalySettlementActionRegistryEntry,
  path: string,
  ids: Set<string>,
): AgentAction {
  if (ids.has(entry.actionId))
    throw new Error(`Duplicate action ID: ${entry.actionId}`)
  ids.add(entry.actionId)
  if (
    anomalySettlementActionSignature(details, entry) !== entry.sourceSignature
  )
    throw new Error(
      `Action semantic signature changed: ${entry.actionId}; review its registry entry`,
    )
  const sourceText = readActionSourcePointer(details, entry.source.pointer)
  if (typeof sourceText !== "string")
    throw new Error(`Missing anomaly settlement source: ${entry.actionId}`)
  if (!entry.elements.length)
    throw new Error(`Missing elements: ${entry.actionId}`)
  for (const element of entry.elements)
    if (!(SIX_STANDARD_ELEMENTS as readonly string[]).includes(element))
      throw new Error(
        `Unsupported anomaly settlement element: ${entry.actionId}/${element}`,
      )
  const descriptions = entry.descriptionSources.map((pointer) => {
    const text = readActionSourcePointer(details, pointer)
    if (typeof text !== "string")
      throw new Error(
        `Missing anomaly settlement description: ${entry.actionId}`,
      )
    return text
  })
  if (
    entry.issues.length > 0 ||
    !descriptions.some((text) => text.includes("其暴击伤害额外提升40%"))
  )
    throw new Error(`Unreviewed anomaly settlement clause: ${entry.actionId}`)

  const levelGroup = entry.levelGroup
  let damageCoefficient: SkillCoefficientCurve | null = null
  let itemCoefficient: SkillCoefficientCurve
  if (entry.multiplier.kind === "cal") {
    if (!sourceText.includes(entry.multiplier.expression))
      throw new Error(`Missing CAL expression: ${entry.actionId}`)
    const match = calExpressionPattern.exec(entry.multiplier.expression)
    if (
      !match ||
      levelGroupOfAvatarSkillLevel[
        match[3] as keyof typeof levelGroupOfAvatarSkillLevel
      ] !== levelGroup
    )
      throw new Error(`Unverified CAL expression: ${entry.actionId}`)
    const base = Number(match[1]) / 100
    const growth = Number(match[2]) / 100
    if (
      base !== entry.multiplier.base ||
      growth !== entry.multiplier.growth ||
      entry.anomalySettlementCriticalDamage !== 0.4 ||
      entry.minimumMindscapeRank !== undefined ||
      entry.upstreamSkillId === null
    )
      throw new Error(`Unverified CAL registration: ${entry.actionId}`)
    damageCoefficient = { levelGroup, base, growth }
    itemCoefficient = damageCoefficient
  } else {
    if (
      entry.multiplier.itemId !== PHEONY_M4_ITEM_ID ||
      entry.minimumMindscapeRank !== 4 ||
      entry.anomalySettlementCriticalDamage !== 0 ||
      !entry.skillTargetIds.includes(PHEONY_M4_TARGET_ID) ||
      entry.upstreamSkillId !== null ||
      !sourceText.includes(entry.sourceExpression)
    )
      throw new Error(`Unverified M4 registration: ${entry.actionId}`)
    itemCoefficient = { levelGroup, base: 0, growth: 0 }
  }
  const action: AgentAction = {
    actionId: entry.actionId,
    branchId: entry.branchId,
    name: entry.name,
    rowName: entry.rowName,
    levelGroup,
    skillCategory: entry.skillCategory,
    skillTargetIds: [...entry.skillTargetIds],
    skillTags: [],
    ...(entry.minimumMindscapeRank === undefined
      ? {}
      : { minimumMindscapeRank: entry.minimumMindscapeRank }),
    source: { path, pointer: entry.source.pointer },
    descriptionSources: entry.descriptionSources.map((pointer) => ({
      path,
      pointer,
    })),
    description: descriptions.map(strip).join("\n"),
    parameterIds: [],
    sourceExpression: entry.sourceExpression,
    damageCoefficient,
    dazeCoefficient: null,
    calculation: {
      kind: "anomaly-settlement",
      elements: [...entry.elements],
      items: [
        {
          itemId:
            entry.multiplier.kind === "cal"
              ? `${entry.actionId}:base`
              : entry.multiplier.itemId,
          stat: "attack",
          coefficient: itemCoefficient,
        },
      ],
      anomalySettlementCriticalDamage: entry.anomalySettlementCriticalDamage,
    },
    inputs: [],
    limitations: [...(entry.limitations ?? [])],
    upstreamSkillId: entry.upstreamSkillId,
  }
  return action
}

export function convertAgentActions(
  entityId: string,
  details: AgentDetails,
  registry: readonly ActionRegistryEntry[],
): AgentActions {
  const path = `agents/${entityId}/details.zh.json`
  const entries = registry.filter((entry) => entry.entityId === entityId)
  // 新角色可在 integrated 中先进入资料与属性层，动作目录由后续批次补齐。
  // 空动作清单是显式缺口，不伪造招式、不静默省略成员。
  if (!entries.length)
    return {
      schemaVersion: 1,
      entityId,
      skillLevelBonuses: [],
      actions: [],
    }
  const skillLevelBonuses = [3, 5].map((rank) => {
    const description = details.talent[String(rank)]?.desc
    const expected =
      "[普通攻击]、[闪避]、[支援技]、[特殊技]、[连携技]技能等级+2"
    if (!description || strip(description).replace(/\s/gu, "") !== expected)
      throw new Error(`Unverified skill level bonus: ${path}/talent/${rank}`)
    return {
      minimumMindscapeRank: rank,
      bonus: 2,
      groups: [...groups],
      source: { path, pointer: `/talent/${rank}/desc` },
    }
  })
  const covered = new Set<string>()
  const ids = new Set<string>()
  const cover = (pointer: string) => {
    if (covered.has(pointer))
      throw new Error(`Duplicate action source row: ${path}${pointer}`)
    covered.add(pointer)
  }
  const parameterEntries = entries.filter(
    (entry): entry is ParameterActionRegistryEntry =>
      !isAnomalySettlementAction(entry),
  )
  const anomalyEntries = entries.filter(isAnomalySettlementAction)
  const actions: AgentAction[] = [
    ...parameterEntries.map((entry): AgentAction => {
      if (!entry.actionId.startsWith("action:"))
        throw new Error(`Invalid runtime action identity: ${entry.actionId}`)
      if (ids.has(entry.actionId))
        throw new Error(`Duplicate action ID: ${entry.actionId}`)
      ids.add(entry.actionId)
      if (actionSourceSignature(details, entry) !== entry.sourceSignature)
        throw new Error(
          `Action semantic signature changed: ${entry.actionId}; review its registry entry`,
        )
      const { section, row, daze, descriptions } = sourceRows(details, entry)
      const potentialLevels = declaredPotentialLevels(details, entry)
      if (entry.conditionalIdentity) {
        const conditional = entry.conditionalIdentity
        if (
          !potentialLevels ||
          !conditional.potentialLevels.length ||
          conditional.potentialLevels.some(
            (level) => !potentialLevels.includes(level),
          ) ||
          (!conditional.skillTargetIds.length &&
            !conditional.skillTags.length) ||
          !entry.relatedPassiveEvidence?.length
        )
          throw new Error(
            `Invalid conditional identity: ${entry.actionId}; review its registry entry`,
          )
      }
      const prefix = `/skill/${entry.levelGroup}/description/${entry.sectionIndex}/param`
      cover(`${prefix}/${entry.rowIndex}`)
      if (entry.dazeRowIndex !== null) cover(`${prefix}/${entry.dazeRowIndex}`)
      const issues: ActionIssue[] = [...entry.issues]
      const damageCoefficient =
        entry.rowKind === "damage"
          ? rowCurve(row, entry.levelGroup, "1001", issues)
          : null
      const dazeCoefficient =
        entry.rowKind === "daze"
          ? rowCurve(row, entry.levelGroup, "1002", issues)
          : daze
            ? rowCurve(daze, entry.levelGroup, "1002", issues)
            : null
      const descriptionSources = descriptions.map((value) => ({
        path,
        pointer: `/skill/${entry.levelGroup}/description/${value.index}/desc`,
      }))
      const action: AgentAction = {
        actionId: entry.actionId,
        branchId: entry.branchId,
        name: section.name,
        rowName: row.name,
        levelGroup: entry.levelGroup,
        skillCategory: entry.skillCategory,
        skillTargetIds: [...entry.skillTargetIds],
        skillTags: entry.countsAsFollowUp ? ["zzz-hp:follow-up"] : [],
        ...(potentialLevels ? { potentialLevels: [...potentialLevels] } : {}),
        ...(entry.conditionalIdentity
          ? {
              conditionalIdentity: {
                potentialLevels: [...entry.conditionalIdentity.potentialLevels],
                requiresAdditionalAbilityActive: true as const,
                skillTargetIds: [...entry.conditionalIdentity.skillTargetIds],
                skillTags: [...entry.conditionalIdentity.skillTags],
              },
            }
          : {}),
        source: { path, pointer: `${prefix}/${entry.rowIndex}` },
        descriptionSources,
        description: descriptions.map((value) => strip(value.desc)).join("\n"),
        parameterIds: Object.keys(row.param ?? {}),
        sourceExpression: row.desc,
        damageCoefficient,
        dazeCoefficient,
        calculation: { kind: "daze-only" },
        inputs: [],
        limitations: [...(entry.limitations ?? [])],
        upstreamSkillId: entry.upstreamSkillId,
      }
      if (issues.length)
        return { ...action, calculation: { kind: "unavailable", issues } }
      if (entry.rowKind === "luminize") {
        const match =
          /^\{CAL:(\d+(?:\.\d+)?)\+AvatarSkillLevel\((0|3|6)\)\*(\d+(?:\.\d+)?),1,2\}%$/u.exec(
            row.desc,
          )
        const levelGroup = (
          { "0": "basic", "3": "chain", "6": "assist" } as const
        )[match?.[2] as "0" | "3" | "6"]
        if (!match || levelGroup !== entry.levelGroup)
          throw new Error(`Unverified luminize curve: ${entry.actionId}`)
        const growth = Number(match[3]) / 100
        return {
          ...action,
          calculation: {
            kind: "luminize",
            multiplier: {
              levelGroup,
              base: Number(match[1]) / 100 + growth,
              growth,
            },
          },
          limitations: [
            ...action.limitations,
            "仅提供本招式耀变基础倍率；虚曜强度、异化、异常精通及其他增益由现有计算接口显式提供。",
          ],
        }
      }
      if (entry.rowKind === "daze") return action
      if (!damageCoefficient || !entry.element || !entry.skillCategory)
        throw new Error(`Incomplete ready action: ${entry.actionId}`)
      const stat =
        entry.damageKind === "sheer"
          ? "sheerForce"
          : entry.damageKind === "sharpen"
            ? "defense"
            : "attack"
      const segments: ActionDamageSegment[] = entry.individualHits
        ? entry.individualHits.map((hit, index) => {
            if (
              !Number.isSafeInteger(hit.repeat) ||
              hit.repeat < 1 ||
              hit.repeat > 100 ||
              !Number.isFinite(hit.divisor) ||
              hit.divisor < 1
            )
              throw new Error(`Invalid hit split: ${entry.actionId}`)
            return {
              segmentId: `${entry.actionId}:segment:${index + 1}`,
              damageKind: entry.damageKind,
              element: entry.element!,
              granularity: "individual",
              repeat: hit.repeat,
              items: [
                {
                  itemId: `${entry.actionId}:item:${index + 1}`,
                  stat,
                  coefficient: parameterCurve(
                    row.param ?? {},
                    [{ parameterId: hit.parameterId, scale: 1 / hit.divisor }],
                    "1001",
                    entry.levelGroup,
                  ),
                },
              ],
            }
          })
        : [
            {
              segmentId: `${entry.actionId}:total`,
              damageKind: entry.damageKind,
              element: entry.element,
              granularity: "aggregate",
              repeat: 1,
              items: [
                {
                  itemId: `${entry.actionId}:base`,
                  stat,
                  coefficient: damageCoefficient,
                },
              ],
            },
          ]
      for (const key of ["base", "growth"] as const) {
        const total = segments.reduce(
          (sum, segment) =>
            sum +
            segment.repeat *
              segment.items.reduce(
                (value, item) => value + item.coefficient[key],
                0,
              ),
          0,
        )
        if (
          Math.abs(total - damageCoefficient[key]) >
          1e-10 * Math.max(1, total)
        )
          throw new Error(
            `Hit split differs from full expression: ${entry.actionId}`,
          )
      }
      if (entry.additionalBase === "zhao-charge") {
        const descriptionIndex = details.skill.basic!.description.findIndex(
          (value) =>
            value.name === "普通攻击：最终裁决" &&
            value.desc?.includes("{CAL:0.12+AvatarSkillLevel(0)*0.01,100,2}%"),
        )
        if (
          entityId !== "1341" ||
          descriptionIndex < 0 ||
          segments.length !== 1
        )
          throw new Error("Unverified Zhao additional base damage")
        const segment = segments[0]!
        return {
          ...action,
          descriptionSources: [
            ...descriptionSources,
            {
              path,
              pointer: `/skill/basic/description/${descriptionIndex}/desc`,
            },
          ],
          calculation: {
            kind: "damage",
            segments: [
              {
                ...segment,
                items: [
                  ...segment.items,
                  {
                    itemId: `${entry.actionId}:charged-health`,
                    stat: "health",
                    coefficient: {
                      levelGroup: "basic",
                      base: 0.13,
                      growth: 0.01,
                    },
                    multiplyByInput: "chargeSeconds",
                  },
                ],
              },
            ],
          },
          inputs: [
            {
              inputId: "chargeSeconds",
              name: "终结一击消耗的蓄力秒数",
              minimum: 0,
              maximum: 5,
            },
          ],
          limitations: [
            ...action.limitations,
            "生命值附加项只加入终结一击一次；当前合计计算要求各次命中使用相同乘区。",
          ],
        }
      }
      return {
        ...action,
        calculation: { kind: "damage", segments },
        limitations: entry.individualHits
          ? action.limitations
          : [
              ...action.limitations,
              "合计倍率已确认，内部命中数尚未核实；仅适用于各次命中乘区一致且无逐次额外加伤的场景，显示取整可有合理误差。",
            ],
      }
    }),
    ...anomalyEntries.map((entry) =>
      convertAnomalySettlementAction(entityId, details, entry, path, ids),
    ),
  ]
  const expected = new Set<string>()
  for (const [group, block] of Object.entries(details.skill))
    for (const [sectionIndex, section] of block.description.entries())
      for (const [rowIndex, row] of (section.param ?? []).entries())
        if (
          row.name.includes("伤害倍率") ||
          row.name.includes("失衡倍率") ||
          row.name === "耀变倍率"
        )
          expected.add(
            `/skill/${group}/description/${sectionIndex}/param/${rowIndex}`,
          )
  if (
    expected.size !== covered.size ||
    [...expected].some((pointer) => !covered.has(pointer))
  )
    throw new Error(`Action source row coverage changed: ${entityId}`)
  return { schemaVersion: 1, entityId, skillLevelBonuses, actions }
}
