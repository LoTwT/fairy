import { calculateSpecialVoidflareDamageBonusMultiplier } from "../../formulas.ts"
import type { LuminizeAnomalyDamageLevelInput } from "../../formulas.ts"
import type {
  Condition,
  EffectRule,
  EntityId,
  RemielleSpecialVoidflareAnomalySource,
  ResolvedContribution,
  SourceBinding,
  StaticCatalogDamageInput,
  StaticCatalogDamageItem,
  StaticCatalogMechanism,
  StaticDamageInput,
  StaticDamageResult,
  StaticEffectSelection,
} from "../types.ts"
import { isPlainObject, rejectUnknownFields } from "./checks.ts"
import type { IssueCollector } from "./issues.ts"
import { evaluateStaticDamage } from "./static-damage.ts"
import { isEntityId } from "./vocabulary.ts"

export const REMIELLE_SPECIAL_VOIDFLARE_MECHANISM =
  "remielle-special-voidflare" as const
export const REMIELLE_AGENT_ENTITY_ID = "1581"

/** strength 档位的固定乘数：full 为 1，影画 6 四分之一为 0.25。 */
export function remielleSpecialVoidflareStrengthMultiplier(
  strength: RemielleSpecialVoidflareAnomalySource["strength"],
): number {
  return strength === "mindscape-6-quarter" ? 0.25 : 1
}

/** 目录 damage 参数是否请求特殊虚曜机制（anomalySource 携带 mechanism 字段）。 */
export function remielleSpecialVoidflareRequested(
  damage: Record<string, unknown>,
): boolean {
  const source = damage["anomalySource"]
  return isPlainObject(source) && source["mechanism"] !== undefined
}

/** 目录中声明的机制元数据；未声明时返回 undefined，由调用方明确拒绝。 */
export function declaredRemielleSpecialVoidflareMechanism(
  catalog: StaticCatalogDamageInput["catalog"],
): StaticCatalogMechanism | undefined {
  return catalog.mechanisms?.find(
    (entry) => entry.mechanism === REMIELLE_SPECIAL_VOIDFLARE_MECHANISM,
  )
}

export interface RemielleSpecialVoidflareContext {
  readonly mechanism: StaticCatalogMechanism
  readonly entityId: EntityId
  readonly level: number
  readonly strength: RemielleSpecialVoidflareAnomalySource["strength"]
  readonly strengthMultiplier: number
}

/**
 * 校验特殊虚曜分支的公开输入契约。结构性可继续的错误全部报告给
 * collector 后返回 undefined；调用方在下一处检查点统一失败。
 */
export function validateRemielleSpecialVoidflareInput(options: {
  readonly damage: Record<string, unknown>
  readonly hit: Record<string, unknown>
  readonly items: readonly (StaticCatalogDamageItem | undefined)[]
  readonly actors: ReadonlyMap<
    EntityId,
    StaticCatalogDamageInput["catalog"]["entities"][number]
  >
  readonly bindings: readonly SourceBinding[]
  readonly catalog: StaticCatalogDamageInput["catalog"]
  readonly collector: IssueCollector
}): RemielleSpecialVoidflareContext | undefined {
  const { collector, damage, hit, items, actors, bindings, catalog } = options
  const report = (
    code: Parameters<IssueCollector["report"]>[0],
    pointer: string,
    message: string,
  ) => collector.report(code, pointer, message)
  const mechanism = declaredRemielleSpecialVoidflareMechanism(catalog)
  if (mechanism === undefined) {
    report(
      "MISSING_REFERENCE",
      "/damage/anomalySource/mechanism",
      "The catalog does not declare the remielle-special-voidflare mechanism; regenerate the static catalog before requesting it",
    )
    return undefined
  }
  if (damage["kind"] !== "luminize") {
    report(
      "INVALID_INPUT",
      "/damage/anomalySource/mechanism",
      "The remielle-special-voidflare mechanism only applies to luminize damage",
    )
  }
  const source = damage["anomalySource"] as Record<string, unknown>
  rejectUnknownFields(
    source,
    ["mechanism", "entityId", "level", "strength"],
    {
      collector,
      pointer: "/damage/anomalySource",
      structureCode: "INVALID_INPUT",
    },
    "special Voidflare anomaly source",
  )
  if (source["mechanism"] !== REMIELLE_SPECIAL_VOIDFLARE_MECHANISM) {
    report(
      "INVALID_INPUT",
      "/damage/anomalySource/mechanism",
      `Unknown anomaly source mechanism: ${String(source["mechanism"])}`,
    )
    return undefined
  }
  const entityId = source["entityId"]
  if (!isEntityId(entityId)) {
    report(
      "INVALID_INPUT",
      "/damage/anomalySource/entityId",
      "The special Voidflare source requires an entity identity",
    )
    return undefined
  }
  if (actors.get(entityId)?.identity?.entityId !== mechanism.agentEntityId) {
    report(
      "CONTEXT_MISMATCH",
      "/damage/anomalySource/entityId",
      `The special Voidflare source must be the catalog agent ${mechanism.agentEntityId}`,
    )
  }
  if (hit["actorId"] !== entityId) {
    report(
      "CONTEXT_MISMATCH",
      "/damage/anomalySource/entityId",
      "The special Voidflare source must be this luminize hit's actor",
    )
  }
  const level = source["level"]
  if (
    typeof level !== "number" ||
    !Number.isSafeInteger(level) ||
    level < 1 ||
    level > 60
  ) {
    report(
      "INVALID_INPUT",
      "/damage/anomalySource/level",
      "The special Voidflare level must be a safe integer from 1 to 60 without rounding or clamping",
    )
  }
  const strength = source["strength"]
  const strengthEntry = mechanism.strengths.find(
    (entry) => entry.strength === strength,
  )
  if (strengthEntry === undefined) {
    report(
      "INVALID_INPUT",
      "/damage/anomalySource/strength",
      'The special Voidflare strength must be "full" or "mindscape-6-quarter"',
    )
  } else {
    const binding = bindings.find(
      (
        candidate,
      ): candidate is Extract<SourceBinding, { readonly kind: "agent" }> =>
        candidate.kind === "agent" &&
        candidate.holderId === entityId &&
        candidate.sourceEntityId === mechanism.agentEntityId,
    )
    if (binding === undefined) {
      report(
        "MISSING_FACT",
        "/damage/anomalySource/strength",
        "The special Voidflare strength gate requires the source agent's binding",
      )
    } else if (
      binding.configuration.mindscapeRank < strengthEntry.minimumMindscape
    ) {
      report(
        "CONTEXT_MISMATCH",
        "/damage/anomalySource/strength",
        `The "${strengthEntry.strength}" strength requires mindscape rank ${strengthEntry.minimumMindscape}`,
      )
    }
  }
  if (hit["element"] !== "lumiflux") {
    report(
      "CONTEXT_MISMATCH",
      "/hit/element",
      "The special Voidflare luminize hit must use the lumiflux element",
    )
  }
  if (hit["actionSnapshotId"] !== undefined) {
    report(
      "INVALID_INPUT",
      "/hit/actionSnapshotId",
      "The special Voidflare branch reads current attributes only and rejects action snapshot overrides",
    )
  }
  const usable = items.filter((item) => item !== undefined)
  if (usable.length !== 1) {
    report(
      "INVALID_INPUT",
      "/hit/damageItems",
      "The special Voidflare hit must carry exactly one base attack damage item",
    )
  } else {
    const item = usable[0]!
    if (item.stat !== "attack")
      report(
        "CONTEXT_MISMATCH",
        "/hit/damageItems/0/stat",
        "The special Voidflare base item must scale attack",
      )
    if (item.role !== "base")
      report(
        "CONTEXT_MISMATCH",
        "/hit/damageItems/0/role",
        "The special Voidflare base item must have the base role",
      )
    if (item.mode !== "direct")
      report(
        "CONTEXT_MISMATCH",
        "/hit/damageItems/0/mode",
        "The special Voidflare base item must use the direct preparation mode",
      )
    if (item.mode === "direct" && item.damageMultiplier !== 1)
      report(
        "CONTEXT_MISMATCH",
        "/hit/damageItems/0/damageMultiplier",
        "The special Voidflare base item must carry the direct multiplier 1; action multipliers belong to the Luminize multiplier",
      )
    const statSource = item.statSource as {
      entityId?: string
      snapshotId?: string
    }
    if (statSource.entityId !== entityId || statSource.snapshotId !== undefined)
      report(
        "CONTEXT_MISMATCH",
        "/hit/damageItems/0/statSource",
        "The special Voidflare base item must read the source actor's current attack",
      )
  }
  const defense = isPlainObject(damage["defense"])
    ? (damage["defense"] as Record<string, unknown>)
    : undefined
  if (defense !== undefined && defense["attackerLevel"] !== undefined) {
    report(
      "INVALID_INPUT",
      "/damage/defense/attackerLevel",
      "The special Voidflare defense level is assembled from the anomaly source level only; do not provide attackerLevel, not even the same value",
    )
  }
  const damageBonus = damage["damageBonus"]
  if (!Array.isArray(damageBonus) || damageBonus.length !== 0)
    report(
      "INVALID_INPUT",
      "/damage/damageBonus",
      "The special Voidflare damage bonus comes from the agent level helper; provide the empty baseline only",
    )
  const refringe = isPlainObject(damage["refringe"])
    ? (damage["refringe"] as Record<string, unknown>)
    : undefined
  if (refringe === undefined || refringe["mode"] !== "from-effects")
    report(
      "INVALID_INPUT",
      "/damage/refringe",
      "The special Voidflare refringe must be prepared from effects",
    )
  const luminizeMultiplier = isPlainObject(damage["luminizeMultiplier"])
    ? (damage["luminizeMultiplier"] as Record<string, unknown>)
    : undefined
  const adjustments =
    luminizeMultiplier?.["multiplicativeLuminizeMultiplierAdjustments"]
  if (
    adjustments !== undefined &&
    (!Array.isArray(adjustments) || adjustments.length !== 0)
  )
    report(
      "INVALID_INPUT",
      "/damage/luminizeMultiplier/multiplicativeLuminizeMultiplierAdjustments",
      "The special Voidflare branch rejects caller-provided Luminize multiplier adjustments",
    )
  if (
    strengthEntry === undefined ||
    typeof level !== "number" ||
    !Number.isSafeInteger(level) ||
    level < 1 ||
    level > 60
  )
    return undefined
  return {
    mechanism,
    entityId,
    level,
    strength: strengthEntry.strength,
    strengthMultiplier: remielleSpecialVoidflareStrengthMultiplier(
      strengthEntry.strength,
    ),
  }
}

/**
 * 递归移除贡献条件树中的 hit.element 枚举节点；专用于上游"自身基础精通
 * 专用读取"不应用元素白名单的具名差异，只影响受限读取的独立求值上下文。
 */
function stripElementFilters(
  condition: Condition<"contribution">,
): Condition<"contribution"> {
  if (condition.kind === "one-of" && condition.fact === "hit.element")
    return { kind: "constant", value: true }
  if (condition.kind === "all" || condition.kind === "any")
    return {
      ...condition,
      conditions: condition.conditions.map(stripElementFilters),
    }
  if (condition.kind === "not")
    return { ...condition, condition: stripElementFilters(condition.condition) }
  return condition
}

/** 特殊虚曜分支选中的选项不能携带逐命中或已被 strength 取代的倍率贡献。 */
export function remielleSpecialVoidflareRejectsEffect(
  effect: EffectRule,
): boolean {
  if (effect.kind !== "contribution") return false
  const operation = effect.operation
  if (operation.kind === "hit-adjustment") return true
  if (operation.kind !== "factor-contribution") return false
  return (
    operation.channel === "base-multiplier-addition" ||
    operation.channel === "base-multiplier-increase" ||
    operation.channel === "settlement-multiplier-addition" ||
    operation.channel === "luminize-multiplier-addition" ||
    operation.channel === "luminize-special-increase"
  )
}

/**
 * 特殊虚曜受限读取的局外投影：把源角色 attack 与 anomalyProficiency 的局内
 * final 调整清空，保留 base/initial/settled 初始阶段与二件套所在的局外面板。
 * 固定来源的口径是"局外攻击 + 指定自身转模；局外精通 + 指定音擎/四件"，
 * 世界中的普通局内基线（finalPercentage/finalFixed）不进入受限读取；
 * R/耀变转换与其他普通路径继续使用原始 world，输入对象不被修改。
 */
function outOfCombatReadingWorld(
  world: StaticDamageInput["world"],
  entityId: EntityId,
): StaticDamageInput["world"] {
  return {
    ...world,
    entities: world.entities.map((entity) => {
      if (entity.kind !== "actor" || entity.entityId !== entityId) return entity
      const generalStats = { ...entity.generalStats }
      for (const stat of ["attack", "anomalyProficiency"] as const) {
        const input = generalStats[stat]
        if (input !== undefined)
          generalStats[stat] = {
            ...input,
            finalPercentage: [],
            finalFixed: [],
          }
      }
      return { ...entity, generalStats }
    }),
  }
}

/**
 * 特殊虚曜分支的受限读取组装：在独立求值上下文中计算受限攻击、受限精通、
 * 受限穿透率与自身穿透贡献，并按具名来源元数据拆分通用与耀变专属抗穿。
 * 全部读取复用同一 effects 引擎与选择展开，不缓存跨调用状态。
 */
export function assembleRemielleSpecialVoidflareReadings(options: {
  readonly context: RemielleSpecialVoidflareContext
  readonly input: StaticCatalogDamageInput
  readonly lowInput: StaticDamageInput
  readonly expanded: readonly StaticEffectSelection[]
  readonly evaluation: StaticDamageResult["evaluation"]
  readonly collector: IssueCollector
}):
  | {
      readonly evaluation: StaticDamageResult["evaluation"]
      readonly luminizeAnomalyDamageLevel: LuminizeAnomalyDamageLevelInput
    }
  | undefined {
  const { context, input, lowInput, expanded, evaluation, collector } = options
  const report = (
    message: string,
    code: "INVALID_INPUT" | "CONTEXT_MISMATCH" = "INVALID_INPUT",
  ) => collector.report(code, "/damage/anomalySource", message)
  const mechanism = context.mechanism
  const ownBindingIds = new Set(
    input.bindings
      .filter((binding) => binding.holderId === context.entityId)
      .map((binding) => binding.bindingId),
  )
  const markedEffectIds = new Set([
    ...mechanism.selfAttackConvertEffectIds,
    ...mechanism.wEngineMasteryEffectIds,
    ...mechanism.driveDiscFourPieceMasteryEffectIds,
  ])
  const exemptEffectIds = new Set(
    mechanism.wEngineMasteryElementExemptEffectIds,
  )
  const restrictedReadingSelections = expanded.filter(
    (selection) =>
      markedEffectIds.has(selection.effectId) &&
      ownBindingIds.has(selection.bindingId),
  )
  const restrictedDefinitions =
    exemptEffectIds.size === 0
      ? lowInput.definitions
      : {
          ...lowInput.definitions,
          effects: lowInput.definitions.effects.map((effect) =>
            exemptEffectIds.has(effect.effectId) &&
            effect.kind === "contribution"
              ? { ...effect, when: stripElementFilters(effect.when) }
              : effect,
          ),
        }
  const restrictedReading = evaluateStaticDamage({
    ...lowInput,
    definitions: restrictedDefinitions,
    selections: restrictedReadingSelections,
    world: outOfCombatReadingWorld(lowInput.world, context.entityId),
  })
  if (!restrictedReading.ok) {
    for (const issue of restrictedReading.issues)
      collector.report(issue.code, issue.pointer, issue.message)
    return undefined
  }
  const restrictedAttack =
    restrictedReading.value.evaluation.hit?.damageItems[0]?.finalStat
  const restrictedProficiency =
    restrictedReading.value.evaluation.attributes.find(
      (attribute) =>
        attribute.stat === "anomalyProficiency" &&
        attribute.entityId === context.entityId &&
        attribute.snapshotId === undefined,
    )?.value.value
  if (restrictedAttack === undefined || restrictedProficiency === undefined) {
    report(
      "The restricted attack and proficiency readings did not evaluate for the special Voidflare source",
      "CONTEXT_MISMATCH",
    )
    return undefined
  }
  const ownSlotReading = evaluateStaticDamage({
    ...lowInput,
    selections: expanded.filter((selection) =>
      ownBindingIds.has(selection.bindingId),
    ),
  })
  if (!ownSlotReading.ok) {
    for (const issue of ownSlotReading.issues)
      collector.report(issue.code, issue.pointer, issue.message)
    return undefined
  }
  const restrictedPenetrationRatio =
    ownSlotReading.value.evaluation.attributes.find(
      (attribute) =>
        attribute.stat === "penetrationRatio" &&
        attribute.entityId === context.entityId &&
        attribute.snapshotId === undefined,
    )?.value.value
  if (restrictedPenetrationRatio === undefined) {
    report(
      "The restricted penetration ratio reading did not evaluate for the special Voidflare source",
      "CONTEXT_MISMATCH",
    )
    return undefined
  }
  const radianceMarked = new Set(mechanism.radianceResistanceIgnoreEffectIds)
  const keepContribution = (contribution: ResolvedContribution): boolean => {
    if (contribution.address.kind !== "factor") return true
    if (contribution.address.channel === "attacker-resistance-ignore")
      return radianceMarked.has(contribution.origin.effectId)
        ? ownBindingIds.has(contribution.origin.bindingId)
        : true
    if (contribution.address.channel === "attacker-penetration-value")
      return ownBindingIds.has(contribution.origin.bindingId)
    return true
  }
  return {
    evaluation: {
      ...evaluation,
      attributes: evaluation.attributes.map((attribute) => {
        if (
          attribute.entityId !== context.entityId ||
          attribute.snapshotId !== undefined
        )
          return attribute
        if (attribute.stat === "anomalyProficiency")
          return {
            ...attribute,
            value: { ...attribute.value, value: restrictedProficiency },
          }
        if (attribute.stat === "penetrationRatio")
          return {
            ...attribute,
            value: { ...attribute.value, value: restrictedPenetrationRatio },
          }
        return attribute
      }),
      hit:
        evaluation.hit === null
          ? null
          : {
              ...evaluation.hit,
              damageItems: evaluation.hit.damageItems.map((item, index) =>
                index === 0 ? { ...item, finalStat: restrictedAttack } : item,
              ),
            },
      contributions: evaluation.contributions.filter(keepContribution),
    },
    luminizeAnomalyDamageLevel: {
      mechanism: REMIELLE_SPECIAL_VOIDFLARE_MECHANISM,
      level: context.level,
    },
  }
}

/** 特殊虚曜分支的已结算增伤区：由角色等级 helper 准备。 */
export function remielleSpecialVoidflareDamageBonus(level: number): {
  readonly settledMultiplier: number
} {
  return {
    settledMultiplier: calculateSpecialVoidflareDamageBonusMultiplier(level),
  }
}
