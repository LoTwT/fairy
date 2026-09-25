import type {
  AttributeObservation,
  AttributeSource,
  Condition,
  DirectStat,
  EffectNumericInput,
  FactorChannel,
  EffectId,
  EffectInstance,
  EffectState,
  EntityId,
  EvaluationInput,
  EvaluationResult,
  GeneralStat,
  HitContext,
  NumericExpression,
  PreparedEffects,
  Quantity,
  ResolvedContribution,
  ResolvedOutput,
  Stat,
  TriggerContext,
  Unit,
} from "../types.ts"
import { IssueCollector, failure } from "./issues.ts"
import {
  expectLiteral,
  expectNonEmptyArray,
  expectObject,
  rejectUnknownFields,
} from "./checks.ts"
import {
  readPreparedInternal,
  type PreparedContributionEntry,
  type PreparedEffectsInternal,
} from "./prepare.ts"
import {
  findStateObservation,
  readStateInternal,
  resolveStateBindingId,
  snapshotsEqual,
  type EffectStateInternal,
} from "./state.ts"
import {
  validateHitContext,
  validateSnapshots,
  validateWorldObservation,
  type WorldIndex,
} from "./world.ts"
import { calculateFinalStat, calculateInitialStat } from "../../formulas.ts"
import {
  DIRECT_STATS,
  FACTOR_CHANNEL_UNITS,
  STAT_UNIT_MAP,
  STATS,
  isEntityId,
} from "./vocabulary.ts"
import { validateNumericInputs } from "./numeric-input.ts"

interface LayerCandidate {
  readonly entry: PreparedContributionEntry
  readonly instance: EffectInstance | null
  readonly layer: EffectInstance["layers"][number] | null
  readonly beneficiary: EntityId
  readonly trigger: TriggerContext | null
}

interface OutputAddress {
  readonly kind: "stat"
  readonly stat: Stat
  readonly stage:
    | "initial-percentage"
    | "final-percentage"
    | "initial-fixed"
    | "final-fixed"
    | "direct"
  readonly entityId: EntityId
  readonly hitId: string | null
}

interface FactorAddress {
  readonly kind: "factor"
  readonly channel: string
  readonly entityId: EntityId
  readonly hitId: string | null
}

interface HitAddress {
  readonly kind: "hit"
  readonly hitId: string
  readonly field: "damageMultiplier"
  readonly itemId?: string
}

type ConsumptionAddress = OutputAddress | FactorAddress | HitAddress

interface EvaluatedLayer {
  readonly candidate: LayerCandidate
  readonly address: ConsumptionAddress
  readonly operator: "add" | "scale"
  readonly value: number
  readonly appliedModifications: readonly EffectId[]
}

/** 状态绑定实例在当前世界观察下的裁决；缺记录不是状态结束。 */
type StateBoundInstanceVerdict = "effective" | "ended" | "unobserved"

/** 单次求值调用的共享可变缓存；上下文拷贝共享同一实例。 */
interface SharedCache {
  readonly statValues: Map<string, number>
  readonly failedStats: Set<string>
  readonly layers: Map<string, EvaluatedLayer | null>
  readonly selections: Map<string, readonly EvaluatedLayer[]>
  readonly consumed: Set<EvaluatedLayer>
  readonly effectiveInstances: readonly EffectInstance[] | undefined
  readonly stateBoundVerdicts: Map<string, StateBoundInstanceVerdict>
  readonly reportedUnobservedInstances: Set<string>
  readonly snapshotWorlds: Map<string, WorldIndex>
}

export interface EvaluationContext {
  readonly prepared: PreparedEffectsInternal
  readonly state: EffectStateInternal
  readonly world: WorldIndex
  readonly snapshots: ReadonlyMap<string, SavedSnapshotLike>
  readonly shared: SharedCache
  readonly atSeconds: number
  readonly hit: HitContext | null
  readonly collector: IssueCollector
  readonly stack: readonly string[]
  readonly inputs: readonly EffectNumericInput[]
}

export interface SavedSnapshotLike {
  readonly snapshotId: string
  readonly atSeconds: number
  readonly attributes: readonly {
    readonly entityId: string
    readonly stat: string
    readonly stage: string
    readonly value: { readonly value: number }
  }[]
  readonly world: unknown
}

function statKey(
  entityId: string,
  stat: string,
  stage: string,
  hitId: string | null,
): string {
  return `stat ${entityId} ${stat} ${stage} ${hitId ?? "-"}`
}

function layerKey(layer: LayerCandidate): string {
  return `layer ${layer.entry.rule.effectId} ${layer.entry.bindingId} ${
    layer.instance?.instanceId ?? "continuous"
  } ${layer.layer?.layerId ?? "-"} ${layer.beneficiary}`
}

function addressKey(address: ConsumptionAddress): string {
  if (address.kind === "stat") {
    return `stat ${address.entityId} ${address.stat} ${address.stage} ${address.hitId ?? "-"}`
  }
  if (address.kind === "factor") {
    return `factor ${address.entityId} ${address.channel} ${address.hitId ?? "-"}`
  }
  return `hit ${address.hitId} ${address.field} ${address.itemId === undefined ? "all" : JSON.stringify(address.itemId)}`
}

function resolveRole(
  role: string,
  entityId: string | undefined,
  layer: LayerCandidate,
  hit: HitContext | null,
): EntityId | undefined {
  switch (role) {
    case "holder":
      return layer.entry.holderId
    case "entity":
      return entityId as EntityId
    case "triggerActor":
      return layer.trigger?.actorId
    case "entryActor":
      return layer.trigger === null
        ? undefined
        : (layer.trigger.entryActorId ?? layer.trigger.actorId)
    case "supportActor":
      return layer.trigger?.supportActorId
    case "beneficiary":
      return layer.beneficiary
    case "hitActor":
      return hit?.actorId
    case "hitTarget":
      return hit?.targetId
  }
  return undefined
}

function evaluateExpression(
  expression: NumericExpression<Unit, "contribution">,
  context: EvaluationContext,
  layer: LayerCandidate,
  parameters: ReadonlyMap<string, Quantity<Unit>> = layer.entry
    .foldedParameters,
): number {
  switch (expression.kind) {
    case "literal":
      return expression.value
    case "parameter": {
      // parameter 只读取所属规则自己的参数视图，不隐式读取目标字段。
      const parameter = parameters.get(expression.name)
      if (parameter === undefined) {
        context.collector.report(
          "MISSING_REFERENCE",
          "",
          `Parameter "${expression.name}" is not available in the owning rule's parameter view`,
        )
        return Number.NaN
      }
      return parameter.value
    }
    case "stat":
      return readStatValue(expression, context, layer)
    case "input": {
      const value = context.inputs.find(
        (input) =>
          input.bindingId === layer.entry.bindingId &&
          input.name === expression.name,
      )?.value
      if (value === undefined || value.unit !== expression.unit) {
        context.collector.report(
          value === undefined ? "MISSING_FACT" : "UNIT_MISMATCH",
          "/inputs",
          `Input "${expression.name}" of binding "${layer.entry.bindingId}" requires ${expression.unit}`,
          {
            effectId: layer.entry.rule.effectId,
            bindingId: layer.entry.bindingId,
          },
        )
        return Number.NaN
      }
      return value.value
    }
    case "convert":
      return foldNumericExpression(
        [
          evaluateExpression(expression.input, context, layer, parameters),
          evaluateExpression(expression.rate, context, layer, parameters),
        ],
        1,
        (product, value) => product * value,
        context,
        "A numeric expression conversion",
      )
    case "add":
      return foldNumericExpression(
        expression.operands.map((operand) =>
          evaluateExpression(operand, context, layer, parameters),
        ),
        0,
        (sum, operand) => sum + operand,
        context,
        "A numeric expression sum",
      )
    case "minimum":
      return foldNumericExpression(
        expression.operands.map((operand) =>
          evaluateExpression(operand, context, layer, parameters),
        ),
        Number.POSITIVE_INFINITY,
        (lowest, operand) => Math.min(lowest, operand),
        context,
        "A numeric expression minimum",
      )
    case "maximum":
      return foldNumericExpression(
        expression.operands.map((operand) =>
          evaluateExpression(operand, context, layer, parameters),
        ),
        Number.NEGATIVE_INFINITY,
        (highest, operand) => Math.max(highest, operand),
        context,
        "A numeric expression maximum",
      )
    case "multiply":
      return foldNumericExpression(
        [
          evaluateExpression(expression.value, context, layer, parameters),
          evaluateExpression(
            expression.coefficient,
            context,
            layer,
            parameters,
          ),
        ],
        1,
        (product, operand) => product * operand,
        context,
        "A numeric expression product",
      )
    default:
      return assertNeverExpression(expression as never)
  }
}

/**
 * 非有限结果必须失败：NaN 表示上游已经报告的问题，不重复报告；
 * ±Infinity 在此报告并返回 NaN，由调用方按既有 Result 契约失败。
 */
function requireFiniteValue(
  value: number,
  context: EvaluationContext,
  description: string,
): number {
  if (Number.isNaN(value)) {
    return value
  }
  if (!Number.isFinite(value)) {
    context.collector.report(
      "INVALID_DEFINITION",
      "",
      `${description} is not a finite number`,
    )
    return Number.NaN
  }
  return value
}

function assertNeverExpression(expression: never): number {
  void expression
  throw new Error("Unhandled numeric expression kind")
}

/**
 * 修改归约 `(set 或原值 + Σadd) × Πscale`：每一步都检查数值边界，
 * 不在封顶或乘零之后再判断结果是否有限。
 */
function applyFieldTransform(
  base: number,
  transform: NumericFieldTransform,
  context: EvaluationContext,
  description: string,
): number {
  const withAdds = requireFiniteValue(
    (transform.set ?? base) + transform.addSum,
    context,
    description,
  )
  return requireFiniteValue(
    withAdds * transform.scaleProduct,
    context,
    description,
  )
}

/**
 * 逐项算术归约：每一步都检查数值边界，不靠最终输出兜底。
 * 出现非有限中间结果立即返回，避免后续步骤重复报告同一溢出。
 */
function foldNumericExpression(
  operands: readonly number[],
  identity: number,
  combine: (accumulated: number, operand: number) => number,
  context: EvaluationContext,
  description: string,
): number {
  let accumulated = identity
  for (const operand of operands) {
    accumulated = requireFiniteValue(
      combine(accumulated, operand),
      context,
      description,
    )
    if (!Number.isFinite(accumulated)) {
      return accumulated
    }
  }
  return accumulated
}

function readStatValue(
  expression: {
    readonly kind: "stat"
    readonly stat: Stat
    readonly stage: "base" | "initial" | "current"
    readonly at: string
    readonly entity: { readonly role: string; readonly entityId?: EntityId }
  },
  context: EvaluationContext,
  layer: LayerCandidate,
): number {
  const reference = expression.entity
  const entityId = resolveRole(
    reference.role,
    "entityId" in reference ? reference.entityId : undefined,
    layer,
    context.hit,
  )
  if (entityId === undefined) {
    context.collector.report(
      "CONTEXT_MISMATCH",
      "",
      `Role "${reference.role}" cannot be resolved for this layer`,
    )
    return Number.NaN
  }
  if (expression.at === "evaluation") {
    const readingHitLocal =
      layer.entry.rule.scope === "hit" &&
      context.hit !== null &&
      entityId === context.hit.actorId
    return computeStatValue(
      entityId,
      expression.stat,
      expression.stage,
      readingHitLocal ? context.hit.hitId : null,
      context,
    )
  }
  const snapshotId =
    expression.at === "activation"
      ? (layer.trigger?.activationSnapshotId ?? undefined)
      : context.hit?.actionSnapshotId
  if (snapshotId === undefined) {
    context.collector.report(
      "MISSING_SNAPSHOT",
      "",
      `Stat read at "${expression.at}" requires ${
        expression.at === "activation"
          ? "a layer activation snapshot"
          : "the hit action snapshot"
      }`,
    )
    return Number.NaN
  }
  const snapshot = context.snapshots.get(snapshotId)
  if (snapshot === undefined) {
    context.collector.report(
      "MISSING_SNAPSHOT",
      "",
      `Snapshot "${snapshotId}" is not provided`,
    )
    return Number.NaN
  }
  const stage = expression.stage
  const saved = snapshot.attributes.find(
    (attribute) =>
      attribute.entityId === entityId &&
      attribute.stat === expression.stat &&
      attribute.stage === stage,
  )
  if (saved === undefined) {
    context.collector.report(
      "MISSING_SNAPSHOT",
      "",
      `Snapshot "${snapshotId}" does not save (${entityId}, ${expression.stat}, ${stage})`,
    )
    return Number.NaN
  }
  return saved.value.value
}

/** 属性节点求值：通用节点与命中局部节点按 hitId 区分并共享缓存。 */
function computeStatValue(
  entityId: EntityId,
  stat: Stat,
  stage: "base" | "initial" | "current",
  hitId: string | null,
  context: EvaluationContext,
): number {
  const key = statKey(entityId, stat, stage, hitId)
  const cached = context.shared.statValues.get(key)
  if (cached !== undefined) {
    return cached
  }
  if (context.shared.failedStats.has(key)) {
    return Number.NaN
  }
  const cycleStart = context.stack.indexOf(key)
  if (cycleStart >= 0) {
    reportCycle(context, cycleStart, key)
    context.shared.failedStats.add(key)
    return Number.NaN
  }
  const actor = context.world.actors.get(entityId)
  if (actor === undefined) {
    context.collector.report(
      "MISSING_FACT",
      "",
      `Entity "${entityId}" is not an observed actor; stat (${entityId}, ${stat}) cannot be read`,
    )
    context.shared.failedStats.add(key)
    return Number.NaN
  }
  if (stage === "base" && !DIRECT_STATS.has(stat as DirectStat)) {
    const value = actor.generalStats[stat as GeneralStat]?.baseValue
    if (value === undefined)
      context.collector.report(
        "MISSING_FACT",
        "",
        `Base stat (${entityId}, ${stat}) is required`,
      )
    return value ?? Number.NaN
  }
  const nested: EvaluationContext = {
    ...context,
    stack: [...context.stack, key],
  }
  const direct = DIRECT_STATS.has(stat as DirectStat)
  let value: number
  if (direct) {
    const input = actor.directStats[stat as DirectStat]
    if (input === undefined) {
      context.collector.report(
        "MISSING_FACT",
        "",
        `Direct stat (${entityId}, ${stat}) is read but not provided`,
      )
      context.shared.failedStats.add(key)
      return Number.NaN
    }
    const adjustments = selectedAdjustmentsFor(
      { kind: "stat", stat, stage: "direct", entityId, hitId },
      nested,
    )
    if (adjustments === undefined) {
      context.shared.failedStats.add(key)
      return Number.NaN
    }
    const additions = [
      ...input.additions,
      ...adjustments.map((entry) => entry.value),
    ]
    value = foldNumericExpression(
      additions,
      input.baseValue,
      (sum, adjustment) => sum + adjustment,
      context,
      `Direct stat (${entityId}, ${stat})`,
    )
  } else {
    const input = actor.generalStats[stat as GeneralStat]
    if (input === undefined) {
      context.collector.report(
        "MISSING_FACT",
        "",
        `General stat (${entityId}, ${stat}) is read but not provided`,
      )
      context.shared.failedStats.add(key)
      return Number.NaN
    }
    const initialPercentage = selectedAdjustmentsFor(
      { kind: "stat", stat, stage: "initial-percentage", entityId, hitId },
      nested,
    )
    const initialFixed = selectedAdjustmentsFor(
      { kind: "stat", stat, stage: "initial-fixed", entityId, hitId },
      nested,
    )
    // 候选求值失败时整次查询失败，不能把失败当成空调整继续返回部分结果。
    if (initialPercentage === undefined || initialFixed === undefined) {
      context.shared.failedStats.add(key)
      return Number.NaN
    }
    const initial = callStatHelper(
      () => {
        if (input.settledInitialValue !== undefined) {
          const percentage = initialPercentage.reduce(
            (sum, entry) => sum + entry.value,
            0,
          )
          if (percentage !== 0 && input.baseValue === undefined) {
            context.collector.report(
              "MISSING_FACT",
              "",
              `Base stat (${entityId}, ${stat}) is required by an initial percentage adjustment`,
            )
            return Number.NaN
          }
          const settledValue =
            input.settledInitialValue +
            (input.baseValue ?? 0) * percentage +
            initialFixed.reduce((sum, entry) => sum + entry.value, 0)
          if (settledValue < 0)
            throw new RangeError("Initial stat must be non-negative")
          return settledValue
        }
        return calculateInitialStat({
          baseStat: input.baseValue,
          initialStatPercentageAdjustments: [
            ...input.initialPercentage,
            ...initialPercentage.map((entry) => entry.value),
          ],
          initialStatFixedValueAdjustments: [
            ...input.initialFixed,
            ...initialFixed.map((entry) => entry.value),
          ],
        })
      },
      context,
      `Initial stat (${entityId}, ${stat})`,
    )
    if (stage === "initial") {
      value = initial
    } else {
      const finalPercentage = selectedAdjustmentsFor(
        { kind: "stat", stat, stage: "final-percentage", entityId, hitId },
        nested,
      )
      const finalFixed = selectedAdjustmentsFor(
        { kind: "stat", stat, stage: "final-fixed", entityId, hitId },
        nested,
      )
      if (finalPercentage === undefined || finalFixed === undefined) {
        context.shared.failedStats.add(key)
        return Number.NaN
      }
      value = callStatHelper(
        () =>
          calculateFinalStat({
            initialStat: initial,
            finalStatPercentageAdjustments: [
              ...input.finalPercentage,
              ...finalPercentage.map((entry) => entry.value),
            ],
            finalStatFixedValueAdjustments: [
              ...input.finalFixed,
              ...finalFixed.map((entry) => entry.value),
            ],
          }),
        context,
        `Final stat (${entityId}, ${stat})`,
      )
    }
  }
  if (stat === "sheerForce" && actor.deriveSheerForce) {
    const settled =
      actor.generalStats.sheerForce?.settledInitialValue !== undefined
    const baseline = (source: "health" | "attack") =>
      settled ? actor.generalStats[source]?.settledInitialValue : 0
    const healthBaseline = baseline("health")
    const attackBaseline = baseline("attack")
    if (healthBaseline === undefined || attackBaseline === undefined) {
      context.collector.report(
        "MISSING_FACT",
        "",
        `Settled sheer force (${entityId}) requires settled initial health and attack for conversion increments`,
      )
      return Number.NaN
    }
    value = requireFiniteValue(
      value +
        0.1 *
          (computeStatValue(entityId, "health", stage, hitId, nested) -
            healthBaseline) +
        0.3 *
          (computeStatValue(entityId, "attack", stage, hitId, nested) -
            attackBaseline),
      context,
      `Derived sheer force (${entityId})`,
    )
  }
  if (Number.isNaN(value)) {
    context.shared.failedStats.add(key)
    return Number.NaN
  }
  context.shared.statValues.set(key, value)
  return value
}

/**
 * core helper 以抛错表达数值越界；公开接口按 Result 契约失败，
 * 因此把 helper 的错误转成已报告的问题，而不是让异常逃出求值。
 */
function callStatHelper(
  compute: () => number,
  context: EvaluationContext,
  description: string,
): number {
  try {
    return requireFiniteValue(compute(), context, description)
  } catch (error) {
    context.collector.report(
      "INVALID_DEFINITION",
      "",
      `${description} failed: ${error instanceof Error ? error.message : String(error)}`,
    )
    return Number.NaN
  }
}

function reportCycle(
  context: EvaluationContext,
  cycleStart: number,
  key: string,
): void {
  const path = [...context.stack.slice(cycleStart), key]
  context.collector.report(
    "DEPENDENCY_CYCLE",
    "",
    "Numeric evaluation contains a dependency cycle",
    { dependencyPath: path },
  )
}

/** 某个消费地址上经唯一性选择的获选贡献；结果按地址缓存。 */
function selectedAdjustmentsFor(
  address: ConsumptionAddress,
  context: EvaluationContext,
): readonly EvaluatedLayer[] | undefined {
  const key = addressKey(address)
  const cached = context.shared.selections.get(key)
  if (cached !== undefined) {
    return cached
  }
  const candidates = collectLayersForAddress(address, context)
  if (candidates === undefined) {
    return undefined
  }
  const evaluated = evaluateLayers(candidates, context, address)
  if (evaluated === undefined) {
    return undefined
  }
  const selected = selectUnique(evaluated, context)
  if (selected === undefined) {
    return undefined
  }
  context.shared.selections.set(key, selected)
  return selected
}

function collectLayersForAddress(
  address: ConsumptionAddress,
  context: EvaluationContext,
): LayerCandidate[] | undefined {
  const candidates: LayerCandidate[] = []
  // 只有命中局部的消费地址才纳入命中作用域规则；通用属性节点不因本次查询带命中而被污染。
  const includeHitScope =
    context.hit !== null && (address.kind === "hit" || address.hitId !== null)
  for (const entry of context.prepared.contributions) {
    const rule = entry.rule
    const ruleIsHitScope = rule.scope === "hit"
    if (ruleIsHitScope && !includeHitScope) {
      continue
    }
    if (address.kind === "hit" && !ruleIsHitScope) {
      continue
    }
    if (address.kind === "hit") {
      // 命中倍率地址只接受 hit-adjustment 操作，在下方统一收集。
      if (rule.operation.kind !== "hit-adjustment") {
        continue
      }
      if (
        address.itemId === undefined
          ? rule.operation.itemIds !== undefined
          : rule.operation.itemIds !== undefined &&
            !rule.operation.itemIds.includes(address.itemId)
      )
        continue
    } else if (rule.operation.kind === "hit-adjustment") {
      continue
    } else if (address.kind === "stat") {
      const operation = rule.operation
      if (
        operation.kind !== "stat-adjustment" ||
        operation.stat !== address.stat ||
        operation.stage !== address.stage
      ) {
        continue
      }
    } else if (address.kind === "factor") {
      const operation = rule.operation
      if (
        operation.kind !== "factor-contribution" ||
        (address.channel !== "*" && operation.channel !== address.channel)
      ) {
        continue
      }
    }
    const addressBeneficiary = beneficiaryForAddress(address, context)
    if (rule.activation.kind === "continuous") {
      const targets = resolveContinuousTargets(entry, context)
      if (targets === undefined) {
        return undefined
      }
      for (const beneficiary of targets) {
        if (addressBeneficiary !== null && beneficiary !== addressBeneficiary) {
          continue
        }
        candidates.push({
          entry,
          instance: null,
          layer: null,
          beneficiary,
          trigger: null,
        })
      }
      continue
    }
    for (const instance of effectiveInstances(context)) {
      if (
        instance.effectId !== rule.effectId ||
        instance.bindingId !== entry.bindingId
      ) {
        continue
      }
      for (const beneficiary of instance.beneficiaryIds) {
        if (addressBeneficiary !== null && beneficiary !== addressBeneficiary) {
          continue
        }
        // 只有该实例确实参与本次受益者计算时才要求它的状态观察。
        if (
          instance.lifetime.kind === "state-bound" &&
          stateBoundVerdict(instance, context) === "unobserved"
        ) {
          // 同一实例被多个消费地址读取时只报告一次缺项。
          if (
            !context.shared.reportedUnobservedInstances.has(instance.instanceId)
          ) {
            context.shared.reportedUnobservedInstances.add(instance.instanceId)
            context.collector.report(
              "MISSING_FACT",
              "",
              `State "${instance.lifetime.stateId}" is not observed for owner "${instance.lifetime.stateOwnerId}"; the state-bound instance of "${instance.effectId}" cannot be evaluated`,
              { effectId: instance.effectId, bindingId: instance.bindingId },
            )
          }
          return undefined
        }
        for (const layer of effectiveLayers(instance, context)) {
          candidates.push({
            entry,
            instance,
            layer,
            beneficiary,
            trigger: layer.trigger,
          })
        }
      }
    }
  }
  return candidates
}

/**
 * 消费地址对应的受益者：属性与 Factor 地址使用地址上的实体；
 * 命中倍率地址只消费当前进攻方自己的贡献，其他受益者的倍率不进入本次命中。
 */
function beneficiaryForAddress(
  address: ConsumptionAddress,
  context: EvaluationContext,
): EntityId | null {
  if (address.kind === "hit") {
    return context.hit?.actorId ?? null
  }
  return address.entityId
}

function resolveContinuousTargets(
  entry: PreparedContributionEntry,
  context: EvaluationContext,
): readonly EntityId[] | undefined {
  const holder = context.world.actors.get(entry.holderId)
  if (holder === undefined) {
    context.collector.report(
      "MISSING_FACT",
      "",
      `Holder "${entry.holderId}" is not an observed actor; continuous targets cannot be resolved`,
    )
    return undefined
  }
  const selector = entry.rule.beneficiary.kind
  if (selector === "holder") {
    return [entry.holderId]
  }
  if (selector === "holder-and-trigger-actor") {
    context.collector.report(
      "CONTEXT_MISMATCH",
      "",
      `Continuous rule "${entry.rule.effectId}" cannot resolve holder-and-trigger-actor targets without a trigger`,
    )
    return undefined
  }
  const team = [...context.world.actors.values()]
    .filter((actor) => actor.teamId === holder.teamId)
    .map((actor) => actor.entityId)
    .toSorted()
  if (selector === "team") {
    return team
  }
  return team.filter((entityId) => entityId !== entry.holderId)
}

function effectiveInstances(
  context: EvaluationContext,
): readonly EffectInstance[] {
  if (context.shared.effectiveInstances !== undefined) {
    return context.shared.effectiveInstances
  }
  const effective = context.state.instances.filter((instance) => {
    if (instance.lifetime.kind === "state-bound") {
      // 缺记录的实例保留到真正被消费时再报错，无关查询不因缺少观察而失败。
      return (
        stateBoundVerdict(instance, context) !== "ended" &&
        instance.layers.length > 0
      )
    }
    return instance.layers.some((layer) => layerActive(layer, context))
  })
  Object.defineProperty(context.shared, "effectiveInstances", {
    value: effective,
    configurable: true,
    writable: true,
  })
  return effective
}

/**
 * 按完整 (stateId, bindingId, ownerId) 读取状态绑定实例的观察：
 * 缺记录、显式未生效、生效但激活身份变化是三种不同结果。
 */
function stateBoundVerdict(
  instance: EffectInstance,
  context: EvaluationContext,
): StateBoundInstanceVerdict {
  const cached = context.shared.stateBoundVerdicts.get(instance.instanceId)
  if (cached !== undefined) {
    return cached
  }
  const verdict = computeStateBoundVerdict(instance, context)
  context.shared.stateBoundVerdicts.set(instance.instanceId, verdict)
  return verdict
}

function computeStateBoundVerdict(
  instance: EffectInstance,
  context: EvaluationContext,
): StateBoundInstanceVerdict {
  if (instance.lifetime.kind !== "state-bound") {
    return "ended"
  }
  const holderId = contributionHolderId(context.prepared, instance)
  if (holderId === undefined) {
    return "ended"
  }
  const bindingId = resolveStateBindingId(
    context.prepared,
    instance.lifetime.stateId,
    holderId,
    context.collector,
  )
  if (bindingId === undefined) {
    return "ended"
  }
  const observation = findStateObservation(
    context.world,
    instance.lifetime.stateId,
    bindingId,
    instance.lifetime.stateOwnerId,
  )
  if (observation === undefined) {
    return "unobserved"
  }
  if (
    !observation.active ||
    observation.activationId !== instance.lifetime.stateActivationId
  ) {
    return "ended"
  }
  return "effective"
}

function effectiveLayers(
  instance: EffectInstance,
  context: EvaluationContext,
): readonly EffectInstance["layers"][number][] {
  if (instance.lifetime.kind === "state-bound") {
    return instance.layers
  }
  return instance.layers.filter((layer) => layerActive(layer, context))
}

function layerActive(
  layer: EffectInstance["layers"][number],
  context: EvaluationContext,
): boolean {
  if (layer.expiresAt === null) {
    return true
  }
  return (
    layer.startedAt <= context.atSeconds && context.atSeconds < layer.expiresAt
  )
}

function contributionHolderId(
  prepared: PreparedEffectsInternal,
  instance: EffectInstance,
): EntityId | undefined {
  return prepared.contributions.find(
    (contribution) =>
      contribution.rule.effectId === instance.effectId &&
      contribution.bindingId === instance.bindingId,
  )?.holderId
}

function evaluateLayers(
  layers: readonly LayerCandidate[],
  context: EvaluationContext,
  address: ConsumptionAddress,
): EvaluatedLayer[] | undefined {
  const evaluated: EvaluatedLayer[] = []
  for (const layer of layers) {
    // 同一层在不同消费地址上是不同节点：命中局部地址与通用地址分别求值与缓存。
    const key = `${layerKey(layer)} ${addressKey(address)}`
    const cycleStart = context.stack.indexOf(key)
    if (cycleStart >= 0) {
      reportCycle(context, cycleStart, key)
      return undefined
    }
    if (context.shared.layers.has(key)) {
      const cached = context.shared.layers.get(key)
      if (cached !== null && cached !== undefined) {
        evaluated.push(cached)
      }
      continue
    }
    const result = evaluateSingleLayer(
      layer,
      {
        ...context,
        stack: [...context.stack, key],
      },
      address,
    )
    context.shared.layers.set(key, result ?? null)
    if (result === undefined) {
      return undefined
    }
    if (result !== null) {
      evaluated.push(result)
    }
  }
  return evaluated
}

interface ModificationOperand {
  readonly field: string
  readonly name?: string
  readonly operator: string
  readonly value: number
}

interface NumericFieldTransform {
  set: number | undefined
  addSum: number
  scaleProduct: number
}

function emptyNumericFieldTransform(): NumericFieldTransform {
  return { set: undefined, addSum: 0, scaleProduct: 1 }
}

/** 按字段归并修改：同值 set 合并，不同有效 set 报 MODIFICATION_CONFLICT。 */
function mergeFieldOperand(
  transform: NumericFieldTransform,
  operand: ModificationOperand,
  context: EvaluationContext,
  effectId: EffectId,
  fieldDescription: string,
): boolean {
  if (operand.operator === "set") {
    if (transform.set !== undefined && transform.set !== operand.value) {
      context.collector.report(
        "MODIFICATION_CONFLICT",
        "",
        `Different effective set values (${transform.set} and ${operand.value}) target ${fieldDescription}`,
        { effectId },
      )
      return false
    }
    transform.set = operand.value
    return true
  }
  // 累加本身也要逐步检查：先溢出再乘零会得到未报告的 NaN。
  if (operand.operator === "add") {
    transform.addSum = requireFiniteValue(
      transform.addSum + operand.value,
      context,
      `The accumulated add operands for ${fieldDescription}`,
    )
    return true
  }
  transform.scaleProduct = requireFiniteValue(
    transform.scaleProduct * operand.value,
    context,
    `The accumulated scale operands for ${fieldDescription}`,
  )
  return true
}

function evaluateSingleLayer(
  layer: LayerCandidate,
  context: EvaluationContext,
  address: ConsumptionAddress,
): EvaluatedLayer | null | undefined {
  const rule = layer.entry.rule
  if (!evaluateCondition(rule.when, context, layer)) {
    return null
  }
  const modifications = context.prepared.modifications.filter(
    (modification) =>
      modification.rule.phase === "contribution" &&
      modification.rule.target.kind === "effect" &&
      modification.rule.target.effectId === rule.effectId &&
      modification.holderId === layer.entry.holderId,
  )
  // 修改规则继承目标层、受益者、触发事件与命中上下文，但 parameter 读取修改规则自己的参数表。
  const applicable: {
    readonly effectId: EffectId
    readonly operands: readonly ModificationOperand[]
  }[] = []
  for (const modification of modifications) {
    const modificationWhen = (
      modification.rule as {
        when: Condition<"contribution">
      }
    ).when
    if (
      !evaluateCondition(
        modificationWhen,
        context,
        layer,
        modification.resolvedParameters,
      )
    ) {
      continue
    }
    const changeList = modification.rule.modifications as readonly {
      readonly field: string
      readonly name?: string
      readonly change: {
        readonly operator: "set" | "add" | "scale"
        readonly value: NumericExpression<Unit, "contribution">
      }
    }[]
    const operands = changeList.map((change) => ({
      field: change.field,
      ...(change.name === undefined ? {} : { name: change.name }),
      operator: change.change.operator,
      value: evaluateExpression(
        change.change.value,
        context,
        layer,
        modification.resolvedParameters,
      ),
    }))
    applicable.push({ effectId: modification.rule.effectId, operands })
  }
  // 参数先改再执行原表达式；同一字段按 (set 或原值 + Σadd) × Πscale 归并。
  const parameterTransforms = new Map<string, NumericFieldTransform>()
  const outputTransform = emptyNumericFieldTransform()
  for (const { effectId, operands } of applicable) {
    for (const operand of operands) {
      if (operand.field === "parameter") {
        const name = operand.name ?? ""
        if (!layer.entry.foldedParameters.has(name)) {
          continue
        }
        const transform =
          parameterTransforms.get(name) ?? emptyNumericFieldTransform()
        if (
          !mergeFieldOperand(
            transform,
            operand,
            context,
            effectId,
            `parameter "${name}" of "${rule.effectId}"`,
          )
        ) {
          return undefined
        }
        parameterTransforms.set(name, transform)
        continue
      }
      if (operand.field === "output") {
        if (
          !mergeFieldOperand(
            outputTransform,
            operand,
            context,
            effectId,
            `the output of "${rule.effectId}"`,
          )
        ) {
          return undefined
        }
      }
    }
  }
  const localParameters = new Map(layer.entry.foldedParameters)
  for (const [name, transform] of parameterTransforms) {
    const current = localParameters.get(name)
    if (current === undefined) {
      continue
    }
    const description = `The modified parameter "${name}" of "${rule.effectId}"`
    localParameters.set(name, {
      unit: current.unit,
      value: applyFieldTransform(
        current.value,
        transform,
        context,
        description,
      ),
    })
  }
  const layerWithParams: LayerCandidate = {
    ...layer,
    entry: { ...layer.entry, foldedParameters: localParameters },
  }
  const operation = rule.operation
  let value: number
  let outputAddress: ConsumptionAddress
  let operator: "add" | "scale"
  if (operation.kind === "stat-adjustment") {
    value = evaluateExpression(operation.value, context, layerWithParams)
    outputAddress = {
      kind: "stat",
      stat: operation.stat,
      stage: operation.stage,
      entityId: layer.beneficiary,
      hitId: address.hitId,
    }
    operator = "add"
  } else if (operation.kind === "factor-contribution") {
    value = evaluateExpression(operation.value, context, layerWithParams)
    outputAddress = {
      kind: "factor",
      channel: operation.channel,
      entityId: layer.beneficiary,
      hitId: address.hitId,
    }
    operator =
      operation.channel === "luminize-multiplier-scale" ? "scale" : "add"
  } else {
    value = evaluateExpression(operation.value, context, layerWithParams)
    outputAddress = {
      kind: "hit",
      hitId: context.hit?.hitId ?? "",
      field: "damageMultiplier",
      ...(address.kind === "hit" && address.itemId !== undefined
        ? { itemId: address.itemId }
        : {}),
    }
    operator = operation.operator
  }
  value = requireFiniteValue(
    value,
    context,
    `Rule "${rule.effectId}" produces a non-finite value`,
  )
  // 配置阶段的结果修改先建立基线，贡献阶段的输出修改在该基线上按字段归并；
  // 归并的每一步都检查数值边界，避免先溢出再被后续乘法掩盖。
  const outputDescription = `The modified output of "${rule.effectId}"`
  const withConfigurationAdds = requireFiniteValue(
    value + layer.entry.outputAddSum,
    context,
    outputDescription,
  )
  const withConfigurationScales = requireFiniteValue(
    withConfigurationAdds * layer.entry.outputScaleProduct,
    context,
    outputDescription,
  )
  const withContributionAdds = requireFiniteValue(
    withConfigurationScales + outputTransform.addSum,
    context,
    outputDescription,
  )
  const outputValue = requireFiniteValue(
    withContributionAdds * outputTransform.scaleProduct,
    context,
    outputDescription,
  )
  const appliedModificationIds = [
    ...applicable.map((item) => item.effectId),
    ...layer.entry.appliedModificationIds,
  ]
  if (Number.isNaN(outputValue)) {
    return undefined
  }
  if (
    operation.kind === "hit-adjustment" &&
    operator === "scale" &&
    outputValue < 0
  ) {
    context.collector.report(
      "INVALID_DEFINITION",
      "",
      "Hit multiplier scales must be non-negative",
      { effectId: rule.effectId },
    )
    return undefined
  }
  return {
    candidate: layer,
    address: outputAddress,
    operator,
    value: outputValue,
    appliedModifications: appliedModificationIds,
  }
}

function evaluateCondition(
  condition: Condition<"contribution">,
  context: EvaluationContext,
  layer: LayerCandidate,
  parameters: ReadonlyMap<string, Quantity<Unit>> = layer.entry
    .foldedParameters,
): boolean {
  switch (condition.kind) {
    case "constant":
      return condition.value
    case "all":
      for (const entry of condition.conditions) {
        if (!evaluateCondition(entry, context, layer, parameters)) {
          return false
        }
      }
      return true
    case "any":
      for (const entry of condition.conditions) {
        if (evaluateCondition(entry, context, layer, parameters)) {
          return true
        }
      }
      return false
    case "not":
      return !evaluateCondition(condition.condition, context, layer, parameters)
    case "compare-number": {
      const left = requireFiniteValue(
        evaluateExpression(condition.left, context, layer, parameters),
        context,
        "A compared operand",
      )
      const right = requireFiniteValue(
        evaluateExpression(condition.right, context, layer, parameters),
        context,
        "A compared operand",
      )
      if (!Number.isFinite(left) || !Number.isFinite(right)) {
        return false
      }
      switch (condition.operator) {
        case "eq":
          return left === right
        case "neq":
          return left !== right
        case "lt":
          return left < right
        case "lte":
          return left <= right
        case "gt":
          return left > right
        case "gte":
          return left >= right
      }
    }
    case "one-of":
      return evaluateOneOf(condition, context)
    case "same-entity":
    case "same-team": {
      const left = resolveRoleEntity(condition.left, layer, context.hit)
      const right = resolveRoleEntity(condition.right, layer, context.hit)
      if (left === undefined || right === undefined) {
        context.collector.report(
          "CONTEXT_MISMATCH",
          "",
          `Roles in ${condition.kind} cannot be resolved for this layer`,
        )
        return false
      }
      if (condition.kind === "same-entity") {
        return left === right
      }
      const leftActor = context.world.actors.get(left)
      const rightActor = context.world.actors.get(right)
      if (leftActor === undefined || rightActor === undefined) {
        context.collector.report(
          "MISSING_FACT",
          "",
          `Team membership for "${left}" or "${right}" is not observable`,
        )
        return false
      }
      return leftActor.teamId === rightActor.teamId
    }
    case "state-is": {
      const owner = resolveRoleEntity(condition.owner, layer, context.hit)
      if (owner === undefined) {
        context.collector.report(
          "CONTEXT_MISMATCH",
          "",
          "The owner of a state read cannot be resolved",
        )
        return false
      }
      const world = worldForReadMoment(condition.at, context, layer)
      if (world === undefined) {
        return false
      }
      const bindingId = resolveStateBindingId(
        context.prepared,
        condition.stateId,
        layer.entry.holderId,
        context.collector,
      )
      if (bindingId === undefined) {
        return false
      }
      const observation = findStateObservation(
        world,
        condition.stateId,
        bindingId,
        owner,
      )
      if (observation === undefined) {
        // 缺记录不是未生效：未生效必须显式提供 active: false 的观察。
        context.collector.report(
          "MISSING_FACT",
          "",
          `State "${condition.stateId}" is not observed for owner "${owner}" at "${condition.at}"`,
        )
        return false
      }
      return observation.active === condition.active
    }
    case "within-summon-distance": {
      const entity = resolveRoleEntity(condition.entity, layer, context.hit)
      const owner = resolveRoleEntity(condition.summonOwner, layer, context.hit)
      if (entity === undefined || owner === undefined) {
        context.collector.report(
          "CONTEXT_MISMATCH",
          "",
          "Range condition roles cannot be resolved",
        )
        return false
      }
      const world = worldForReadMoment(condition.at, context, layer)
      if (world === undefined) {
        return false
      }
      const candidates = [...world.summons.values()]
        .filter(
          (summon) =>
            summon.ownerId === owner &&
            summon.deployed &&
            (condition.summonKinds as readonly string[]).includes(
              summon.summonKind,
            ),
        )
        .map((summon) => summon.entityId)
        .toSorted()
      if (candidates.length === 0) {
        return false
      }
      const maximum = requireFiniteValue(
        evaluateExpression(condition.maximum, context, layer, parameters),
        context,
        "A range condition maximum",
      )
      if (!Number.isFinite(maximum)) {
        return false
      }
      for (const candidate of candidates) {
        const first = entity < candidate ? entity : candidate
        const second = entity < candidate ? candidate : entity
        const distance = world.distances.get(`${first}\u0000${second}`)
        if (distance === undefined) {
          context.collector.report(
            "MISSING_FACT",
            "",
            `Distance between "${first}" and "${second}" is required by a range condition`,
          )
          return false
        }
        if (distance <= maximum) {
          return true
        }
      }
      return false
    }
  }
}

function worldForReadMoment(
  moment: string,
  context: EvaluationContext,
  layer: LayerCandidate,
): WorldIndex | undefined {
  if (moment === "evaluation") {
    return context.world
  }
  const snapshotId =
    moment === "activation"
      ? (layer.trigger?.activationSnapshotId ?? undefined)
      : context.hit?.actionSnapshotId
  if (snapshotId === undefined) {
    context.collector.report(
      "MISSING_SNAPSHOT",
      "",
      `A read at "${moment}" requires a snapshot`,
    )
    return undefined
  }
  const cached = context.shared.snapshotWorlds.get(snapshotId)
  if (cached !== undefined) {
    return cached
  }
  const snapshot = context.snapshots.get(snapshotId)
  if (snapshot === undefined) {
    context.collector.report(
      "MISSING_SNAPSHOT",
      "",
      `Snapshot "${snapshotId}" is not provided`,
    )
    return undefined
  }
  const index = validateWorldObservation(
    snapshot.world,
    context.collector,
    `snapshots/${snapshotId}/world`,
  )
  if (index === undefined) {
    return undefined
  }
  context.shared.snapshotWorlds.set(snapshotId, index)
  return index
}

function resolveRoleEntity(
  reference: { readonly role: string; readonly entityId?: EntityId },
  layer: LayerCandidate,
  hit: HitContext | null,
): EntityId | undefined {
  return resolveRole(
    reference.role,
    "entityId" in reference ? reference.entityId : undefined,
    layer,
    hit,
  )
}

function evaluateOneOf(
  condition: Condition<"contribution"> & { readonly kind: "one-of" },
  context: EvaluationContext,
): boolean {
  const hit = context.hit
  if (hit === null) {
    context.collector.report(
      "CONTEXT_MISMATCH",
      "",
      "Hit facts require hit scope",
    )
    return false
  }
  const fact = condition.fact
  if (fact === "hit.actionId") {
    return (condition.values as readonly string[]).includes(hit.actionId)
  }
  if (fact === "hit.skillCategory") {
    return (condition.values as readonly string[]).includes(hit.skillCategory)
  }
  if (fact === "hit.originEffectId") {
    const origin =
      hit.origin.kind === "effect-request" ? hit.origin.effectId : null
    return (condition.values as readonly (string | null)[]).includes(origin)
  }
  const value =
    fact === "hit.element"
      ? hit.element
      : fact === "hit.damageKind"
        ? hit.damageKind
        : fact === "hit.targetState"
          ? hit.targetState
          : hit.skillTags
  if (value === undefined) {
    context.collector.report(
      "MISSING_FACT",
      `/hit/${fact.slice(4)}`,
      `Fact "${fact}" is required by a selected rule`,
    )
    return false
  }
  return typeof value === "string"
    ? (condition.values as readonly string[]).includes(value)
    : value.some((tag) => (condition.values as readonly string[]).includes(tag))
}

interface SourceCandidate {
  readonly key: string
  readonly list: readonly EvaluatedLayer[]
  readonly combined: number
}

/** 唯一性选择使用的配置阶段优先级。 */
function priorityOf(candidate: SourceCandidate): number {
  return candidate.list[0]!.candidate.entry.resolvedPriority
}

function selectUnique(
  layers: readonly EvaluatedLayer[],
  context: EvaluationContext,
): EvaluatedLayer[] | undefined {
  const bySource = new Map<string, EvaluatedLayer[]>()
  for (const layer of layers) {
    const key = `${layer.candidate.entry.bindingId}\u0000${layer.candidate.entry.rule.effectId}\u0000${layer.candidate.beneficiary}\u0000${addressKey(layer.address)}`
    const list = bySource.get(key) ?? []
    list.push(layer)
    bySource.set(key, list)
  }
  const sourceCandidates: SourceCandidate[] = [...bySource.entries()]
    .map(([key, list]) => {
      const adding = list[0]!.operator === "add"
      return {
        key,
        list,
        // 来源层归约同样逐步检查，不把溢出留到最终值再判断。
        combined: foldNumericExpression(
          list.map((entry) => entry.value),
          adding ? 0 : 1,
          adding
            ? (sum, value) => sum + value
            : (product, value) => product * value,
          context,
          `A uniqueness candidate of "${list[0]!.candidate.entry.rule.effectId}"`,
        ),
      }
    })
    .toSorted((left, right) => (left.key < right.key ? -1 : 1))
  if (sourceCandidates.some((candidate) => Number.isNaN(candidate.combined))) {
    return undefined
  }
  const survivors: EvaluatedLayer[] = []
  const groups = new Map<string, SourceCandidate[]>()
  for (const candidate of sourceCandidates) {
    const uniqueness = findUniqueness(candidate.list[0]!.candidate.entry)
    if (uniqueness === undefined) {
      survivors.push(...candidate.list)
      continue
    }
    const scopeIdentity =
      uniqueness.scope === "global"
        ? "global"
        : (holderTeam(candidate.list[0]!.candidate.entry, context) ?? "unknown")
    const groupKey = `${uniqueness.key}\u0000${scopeIdentity}\u0000${candidate.list[0]!.candidate.beneficiary}\u0000${addressKey(candidate.list[0]!.address)}`
    const group = groups.get(groupKey) ?? []
    group.push(candidate)
    groups.set(groupKey, group)
  }
  for (const group of groups.values()) {
    const first = group[0]!
    const uniqueness = findUniqueness(first.list[0]!.candidate.entry)!
    if (
      group.some(
        (candidate) =>
          candidate.list[0]!.operator !== first.list[0]!.operator ||
          findUniqueness(candidate.list[0]!.candidate.entry)!.select.kind !==
            uniqueness.select.kind,
      )
    ) {
      context.collector.report(
        "UNIQUENESS_CONFLICT",
        "",
        `Uniqueness group "${uniqueness.key}" must use the same selection policy and reduction operator`,
      )
      return undefined
    }
    if (uniqueness.select.kind === "single-source-only") {
      if (group.length > 1) {
        context.collector.report(
          "UNIQUENESS_CONFLICT",
          "",
          `Uniqueness group "${uniqueness.key}" has multiple active sources`,
        )
      }
      survivors.push(...first.list)
      continue
    }
    if (uniqueness.select.kind === "highest-value") {
      let best = group[0]!
      let tieSeen = false
      for (const candidate of group) {
        if (candidate.combined > best.combined) {
          best = candidate
          tieSeen = false
          continue
        }
        if (candidate.combined === best.combined && candidate !== best) {
          tieSeen = true
          if (candidate.key < best.key) {
            best = candidate
          }
        }
      }
      if (tieSeen) {
        // 同值候选按来源 ID 选择一个等价结果。
      }
      survivors.push(...best.list)
      continue
    }
    if (uniqueness.select.kind === "latest-activation") {
      // 先找激活时间最新的候选；较早候选之间的差异不影响明确的最新获胜者。
      let best = group[0]!
      for (const candidate of group) {
        const candidateStart = latestStart(candidate.list)
        const bestStart = latestStart(best.list)
        if (
          candidateStart > bestStart ||
          (candidateStart === bestStart && candidate.key < best.key)
        ) {
          best = candidate
        }
      }
      const newestStart = latestStart(best.list)
      if (
        group.some(
          (candidate) =>
            latestStart(candidate.list) === newestStart &&
            candidate.combined !== best.combined,
        )
      ) {
        context.collector.report(
          "UNIQUENESS_CONFLICT",
          "",
          `Uniqueness group "${uniqueness.key}" cannot resolve equal activation times with different values`,
        )
      }
      survivors.push(...best.list)
      continue
    }
    // 先确定最高优先级，再只在最高优先级候选之间裁决平局。
    let best = group[0]!
    for (const candidate of group) {
      if (priorityOf(candidate) > priorityOf(best)) {
        best = candidate
      }
    }
    const highestPriority = priorityOf(best)
    if (
      group.some(
        (candidate) =>
          priorityOf(candidate) === highestPriority &&
          candidate.combined !== best.combined,
      )
    ) {
      context.collector.report(
        "UNIQUENESS_CONFLICT",
        "",
        `Uniqueness group "${uniqueness.key}" cannot resolve equal priorities with different values`,
      )
    }
    survivors.push(...best.list)
  }
  return survivors
}

function latestStart(list: readonly EvaluatedLayer[]): number {
  let latest = Number.NEGATIVE_INFINITY
  for (const layer of list) {
    const startedAt = layer.candidate.layer?.startedAt
    if (startedAt !== undefined && startedAt > latest) {
      latest = startedAt
    }
  }
  return latest
}

function findUniqueness(
  entry: PreparedContributionEntry,
):
  | { key: string; scope: "team" | "global"; select: { kind: string } }
  | undefined {
  const rule = entry.rule as {
    uniqueness?: {
      key: string
      scope: "team" | "global"
      select: { kind: string }
    }
  }
  return rule.uniqueness
}

function holderTeam(
  entry: PreparedContributionEntry,
  context: EvaluationContext,
): string | undefined {
  return context.world.actors.get(entry.holderId)?.teamId
}

function markConsumed(
  context: EvaluationContext,
  address: ConsumptionAddress,
): void {
  const selected = selectedAdjustmentsFor(address, context)
  if (selected === undefined) {
    return
  }
  for (const layer of selected) {
    context.shared.consumed.add(layer)
  }
}

/** 事件推进复用的时点求值：按给定状态、世界与快照计算属性，不产生请求。 */
export interface MomentEvaluation {
  readonly context: EvaluationContext
}

export function createMomentEvaluation(
  prepared: PreparedEffectsInternal,
  state: EffectStateInternal,
  world: WorldIndex,
  snapshots: ReadonlyMap<string, SavedSnapshotLike>,
  atSeconds: number,
  collector: IssueCollector,
): MomentEvaluation {
  const context: EvaluationContext = {
    prepared,
    state,
    world,
    snapshots: snapshots as Map<string, SavedSnapshotLike>,
    shared: {
      statValues: new Map(),
      failedStats: new Set(),
      layers: new Map(),
      selections: new Map(),
      consumed: new Set(),
      effectiveInstances: undefined,
      stateBoundVerdicts: new Map(),
      reportedUnobservedInstances: new Set(),
      snapshotWorlds: new Map(),
    },
    atSeconds,
    hit: null,
    collector,
    stack: [],
    inputs: [],
  }
  return { context }
}

/** 读取该时点的一个属性；失败向收集器报告并返回 NaN。 */
export function readMomentStat(
  evaluation: MomentEvaluation,
  entityId: EntityId,
  stat: Stat,
  stage: "base" | "initial" | "current",
): number {
  return computeStatValue(entityId, stat, stage, null, evaluation.context)
}

/** 各查询分支允许的字段；其他分支的字段属于非法输入，不能静默丢弃。 */
const EVALUATION_INPUT_FIELDS: Readonly<
  Record<EvaluationInput["kind"], readonly string[]>
> = {
  panel: [
    "kind",
    "atSeconds",
    "world",
    "observedSnapshots",
    "entities",
    "stats",
    "inputs",
  ],
  hit: [
    "kind",
    "atSeconds",
    "world",
    "observedSnapshots",
    "hit",
    "stats",
    "inputs",
  ],
  contributions: [
    "kind",
    "atSeconds",
    "world",
    "observedSnapshots",
    "beneficiaries",
    "inputs",
  ],
}

/** 读取查询中的实体身份列表；每个元素都必须是非空 `entity:` 身份。 */
function readEntityIdList(
  value: unknown,
  collector: IssueCollector,
  pointer: string,
  what: string,
): EntityId[] | undefined {
  const array = expectNonEmptyArray(
    value,
    { collector, structureCode: "INVALID_INPUT", pointer },
    what,
  )
  if (array === undefined) {
    return undefined
  }
  let valid = true
  for (const [index, entry] of array.entries()) {
    if (!isEntityId(entry)) {
      collector.report(
        "INVALID_INPUT",
        `${pointer}/${index}`,
        "Each entry must be a non-empty entity: identity",
      )
      valid = false
    }
  }
  return valid ? (array as EntityId[]) : undefined
}

/** 读取查询中的属性列表；每个元素都必须是正式 Stat。 */
function readStatList(
  value: unknown,
  collector: IssueCollector,
  pointer: string,
  what: string,
): Stat[] | undefined {
  const array = expectNonEmptyArray(
    value,
    { collector, structureCode: "INVALID_INPUT", pointer },
    what,
  )
  if (array === undefined) {
    return undefined
  }
  let valid = true
  for (const [index, entry] of array.entries()) {
    if (typeof entry !== "string" || !STATS.has(entry as Stat)) {
      collector.report(
        "INVALID_INPUT",
        `${pointer}/${index}`,
        "Each entry must be a registered stat",
      )
      valid = false
    }
  }
  return valid ? (array as Stat[]) : undefined
}

export function evaluateEffects(
  prepared: PreparedEffects,
  state: EffectState,
  input: EvaluationInput,
):
  | { readonly ok: true; readonly value: EvaluationResult }
  | ReturnType<typeof failure> {
  const preparedInternal = readPreparedInternal(prepared)
  const stateInternal = readStateInternal(state)
  const collector = new IssueCollector()
  if (preparedInternal === undefined || stateInternal === undefined) {
    collector.report(
      "CONTEXT_MISMATCH",
      "",
      "prepared or state does not originate from this engine",
    )
    return failure(collector)
  }
  if (stateInternal.prepared !== preparedInternal) {
    collector.report(
      "CONTEXT_MISMATCH",
      "",
      "state belongs to a different preparation result",
    )
    return failure(collector)
  }
  const inputObject = expectObject(
    input,
    { collector, structureCode: "INVALID_INPUT", pointer: "" },
    "evaluation input",
  )
  if (inputObject === undefined) {
    return failure(collector)
  }
  const kind = expectLiteral(
    inputObject["kind"],
    ["panel", "hit", "contributions"],
    { collector, structureCode: "INVALID_INPUT", pointer: "/kind" },
    "evaluation input kind",
  )
  if (kind !== undefined) {
    rejectUnknownFields(
      inputObject,
      EVALUATION_INPUT_FIELDS[kind],
      { collector, structureCode: "INVALID_INPUT", pointer: "" },
      `${kind} query`,
    )
  }
  const atSeconds = inputObject["atSeconds"]
  if (
    typeof atSeconds !== "number" ||
    !Number.isFinite(atSeconds) ||
    atSeconds < 0
  ) {
    collector.report(
      "INVALID_INPUT",
      "/atSeconds",
      "atSeconds must be a non-negative finite number",
    )
    return failure(collector)
  }
  if (atSeconds < stateInternal.atSeconds) {
    collector.report(
      "EVENT_ORDER",
      "/atSeconds",
      "Query time must not be earlier than the state time",
    )
    return failure(collector)
  }
  const world = validateWorldObservation(
    inputObject["world"],
    collector,
    "/world",
  )
  if (world === undefined) {
    return failure(collector)
  }
  const observedSnapshots = validateSnapshots(
    inputObject["observedSnapshots"],
    collector,
    "/observedSnapshots",
  )
  if (observedSnapshots === undefined) {
    return failure(collector)
  }
  const snapshots = new Map(
    stateInternal.snapshots.map((snapshot) => [snapshot.snapshotId, snapshot]),
  )
  for (const snapshot of observedSnapshots) {
    const existing = snapshots.get(snapshot.snapshotId)
    if (existing === undefined) {
      snapshots.set(snapshot.snapshotId, snapshot)
      continue
    }
    if (!snapshotsEqual(existing, snapshot)) {
      collector.report(
        "CONTEXT_MISMATCH",
        "/observedSnapshots",
        `Snapshot "${snapshot.snapshotId}" conflicts with the recorded snapshot`,
      )
    }
  }
  if (kind === undefined || !collector.isEmpty) {
    return failure(collector)
  }
  let hit: HitContext | null = null
  const numericInputs = validateNumericInputs(
    inputObject["inputs"],
    preparedInternal.bindings,
    collector,
  )
  if (numericInputs === undefined) return failure(collector)
  let hitStats: readonly Stat[] = []
  if (kind === "hit") {
    const validatedHit = validateHitContext(
      inputObject["hit"],
      collector,
      "/hit",
    )
    if (validatedHit === undefined) {
      return failure(collector)
    }
    hit = validatedHit
    if (inputObject["stats"] !== undefined) {
      const stats = readStatList(
        inputObject["stats"],
        collector,
        "/stats",
        "hit stats",
      )
      if (stats === undefined) return failure(collector)
      hitStats = stats
    }
  }
  const context: EvaluationContext = {
    prepared: preparedInternal,
    state: stateInternal,
    world,
    snapshots: snapshots as Map<string, SavedSnapshotLike>,
    shared: {
      statValues: new Map(),
      failedStats: new Set(),
      layers: new Map(),
      selections: new Map(),
      consumed: new Set(),
      effectiveInstances: undefined,
      stateBoundVerdicts: new Map(),
      reportedUnobservedInstances: new Set(),
      snapshotWorlds: new Map(),
    },
    atSeconds,
    hit,
    collector,
    stack: [],
    inputs: numericInputs,
  }
  if (kind === "panel") {
    const entities = readEntityIdList(
      inputObject["entities"],
      collector,
      "/entities",
      "panel entities",
    )
    const stats = readStatList(
      inputObject["stats"],
      collector,
      "/stats",
      "panel stats",
    )
    if (entities === undefined || stats === undefined) {
      return failure(collector)
    }
    const result = evaluatePanel(entities, stats, context)
    if (result === undefined || !collector.isEmpty) {
      return failure(collector)
    }
    return { ok: true, value: result }
  }
  if (kind === "contributions") {
    const beneficiaries = readEntityIdList(
      inputObject["beneficiaries"],
      collector,
      "/beneficiaries",
      "contribution beneficiaries",
    )
    if (beneficiaries === undefined) {
      return failure(collector)
    }
    const result = evaluateContributionsQuery(beneficiaries, context)
    if (result === undefined || !collector.isEmpty) {
      return failure(collector)
    }
    return { ok: true, value: result }
  }
  const result = evaluateHitQuery(context, hitStats)
  if (result === undefined || !collector.isEmpty) {
    return failure(collector)
  }
  return { ok: true, value: result }
}

function evaluatePanel(
  entities: readonly string[],
  stats: readonly Stat[],
  context: EvaluationContext,
): EvaluationResult | undefined {
  const attributes: (AttributeObservation & {
    readonly hitId: string | null
  })[] = []
  const seen = new Set<string>()
  for (const entityId of entities) {
    for (const stat of stats) {
      const value = computeStatValue(
        entityId as EntityId,
        stat,
        "current",
        null,
        context,
      )
      if (Number.isNaN(value)) {
        return undefined
      }
      const stages: readonly (
        | "initial-percentage"
        | "initial-fixed"
        | "final-percentage"
        | "final-fixed"
        | "direct"
      )[] = DIRECT_STATS.has(stat as DirectStat)
        ? ["direct"]
        : [
            "initial-percentage",
            "initial-fixed",
            "final-percentage",
            "final-fixed",
          ]
      for (const stage of stages) {
        markConsumed(context, {
          kind: "stat",
          stat,
          stage,
          entityId: entityId as EntityId,
          hitId: null,
        })
      }
      const key = `${entityId} ${stat}`
      if (seen.has(key)) {
        continue
      }
      seen.add(key)
      attributes.push({
        entityId: entityId as EntityId,
        stat,
        stage: "current",
        value: { unit: STAT_UNIT_MAP[stat], value },
        hitId: null,
      } as AttributeObservation & { hitId: string | null })
    }
  }
  return {
    contributions: collectResultContributions(context),
    attributes: attributes as EvaluationResult["attributes"],
    hit: null,
  }
}

function evaluateContributionsQuery(
  beneficiaries: readonly string[],
  context: EvaluationContext,
): EvaluationResult | undefined {
  for (const beneficiary of beneficiaries) {
    for (const stat of Object.keys(STAT_UNIT_MAP) as Stat[]) {
      const stages: readonly (
        | "initial-percentage"
        | "initial-fixed"
        | "final-percentage"
        | "final-fixed"
        | "direct"
      )[] = DIRECT_STATS.has(stat as DirectStat)
        ? ["direct"]
        : [
            "initial-percentage",
            "initial-fixed",
            "final-percentage",
            "final-fixed",
          ]
      for (const stage of stages) {
        if (
          selectedAdjustmentsFor(
            {
              kind: "stat",
              stat,
              stage,
              entityId: beneficiary as EntityId,
              hitId: null,
            },
            context,
          ) === undefined
        ) {
          return undefined
        }
        markConsumed(context, {
          kind: "stat",
          stat,
          stage,
          entityId: beneficiary as EntityId,
          hitId: null,
        })
      }
    }
    if (
      selectedAdjustmentsFor(
        {
          kind: "factor",
          channel: "*",
          entityId: beneficiary as EntityId,
          hitId: null,
        },
        context,
      ) === undefined
    ) {
      return undefined
    }
    markConsumed(context, {
      kind: "factor",
      channel: "*",
      entityId: beneficiary as EntityId,
      hitId: null,
    })
  }
  return {
    contributions: collectResultContributions(context),
    attributes: [],
    hit: null,
  }
}

function evaluateHitQuery(
  context: EvaluationContext,
  additionalStats: readonly Stat[] = [],
): EvaluationResult | undefined {
  const hit = context.hit
  if (hit === null) {
    return undefined
  }
  const attributes: EvaluationResult["attributes"][number][] = []
  const addAttribute = (
    attribute: EvaluationResult["attributes"][number],
  ): void => {
    if (
      !attributes.some(
        (entry) =>
          entry.stat === attribute.stat &&
          entry.entityId === attribute.entityId &&
          entry.snapshotId === attribute.snapshotId &&
          entry.hitId === attribute.hitId,
      )
    )
      attributes.push(attribute)
  }
  const readAttribute = (stat: Stat, source?: AttributeSource): number => {
    const entityId = source?.entityId ?? hit.actorId
    if (source?.snapshotId !== undefined) {
      const snapshot = context.snapshots.get(source.snapshotId)
      const saved = snapshot?.attributes.find(
        (attribute) =>
          attribute.entityId === entityId &&
          attribute.stat === stat &&
          attribute.stage === "current",
      )
      if (saved === undefined) {
        context.collector.report(
          "MISSING_SNAPSHOT",
          "/hit",
          `Snapshot "${source.snapshotId}" does not save (${entityId}, ${stat}, current)`,
        )
        return Number.NaN
      }
      addAttribute({
        ...saved,
        hitId: hit.hitId,
        snapshotId: source.snapshotId,
      } as EvaluationResult["attributes"][number])
      return saved.value.value
    }
    const hitId = entityId === hit.actorId ? hit.hitId : null
    const value = computeStatValue(entityId, stat, "current", hitId, context)
    if (Number.isNaN(value)) return value
    const stages = DIRECT_STATS.has(stat as DirectStat)
      ? (["direct"] as const)
      : ([
          "initial-percentage",
          "initial-fixed",
          "final-percentage",
          "final-fixed",
        ] as const)
    for (const stage of stages)
      markConsumed(context, { kind: "stat", stat, stage, entityId, hitId })
    addAttribute({
      entityId,
      stat,
      stage: "current",
      value: { unit: STAT_UNIT_MAP[stat], value },
      hitId,
    } as EvaluationResult["attributes"][number])
    return value
  }
  const finalItemStats = hit.damageItems.map((item) =>
    readAttribute(
      item.stat,
      item.statSource ?? hit.attributeSources?.[item.stat],
    ),
  )
  for (const stat of new Set(additionalStats))
    readAttribute(stat, hit.attributeSources?.[stat])
  const criticalRate = readAttribute(
    "criticalRate",
    hit.attributeSources?.criticalRate,
  )
  if (!context.collector.isEmpty) return undefined
  const itemAdjustments = context.prepared.contributions.flatMap((entry) =>
    entry.rule.operation.kind === "hit-adjustment"
      ? (entry.rule.operation.itemIds ?? [])
      : [],
  )
  const hasItemAdjustments = itemAdjustments.length > 0
  // 具体项和全项贡献在同一个实际消费地址上选择唯一来源。
  const multiplierSelected = hasItemAdjustments
    ? []
    : selectedAdjustmentsFor(
        { kind: "hit", hitId: hit.hitId, field: "damageMultiplier" },
        context,
      )
  if (multiplierSelected === undefined) {
    return undefined
  }
  if (!hasItemAdjustments) {
    markConsumed(context, {
      kind: "hit",
      hitId: hit.hitId,
      field: "damageMultiplier",
    })
  }
  for (const itemId of new Set(itemAdjustments)) {
    if (hit.damageItems.some((item) => item.itemId === itemId)) continue
    const selected = selectedAdjustmentsFor(
      { kind: "hit", hitId: hit.hitId, field: "damageMultiplier", itemId },
      context,
    )
    if (selected === undefined) return undefined
    const invalid = selected.find(
      (layer) =>
        layer.candidate.entry.rule.operation.kind === "hit-adjustment" &&
        layer.candidate.entry.rule.operation.itemIds?.includes(itemId),
    )
    if (invalid !== undefined)
      context.collector.report(
        "MISSING_REFERENCE",
        "/hit/damageItems",
        `Selected adjustment targets missing damage item "${itemId}"`,
        {
          effectId: invalid.candidate.entry.rule.effectId,
          bindingId: invalid.candidate.entry.bindingId,
        },
      )
  }
  const adjustedItems: {
    itemId: string
    damageMultiplier: number
    finalStat: number
  }[] = []
  for (const [itemIndex, item] of hit.damageItems.entries()) {
    const address: HitAddress = {
      kind: "hit",
      hitId: hit.hitId,
      field: "damageMultiplier",
      itemId: item.itemId,
    }
    const itemSelected = hasItemAdjustments
      ? selectedAdjustmentsFor(address, context)
      : []
    if (itemSelected === undefined) return undefined
    if (hasItemAdjustments) markConsumed(context, address)
    const selected = [...multiplierSelected, ...itemSelected]
    const withAdditions = foldNumericExpression(
      selected
        .filter((layer) => layer.operator === "add")
        .map((layer) => layer.value),
      item.damageMultiplier,
      (sum, value) => sum + value,
      context,
      "The additive hit multiplier",
    )
    const scale = foldNumericExpression(
      selected
        .filter((layer) => layer.operator === "scale")
        .map((layer) => layer.value),
      1,
      (product, value) => product * value,
      context,
      "The hit multiplier scale",
    )
    const damageMultiplier = requireFiniteValue(
      withAdditions * scale,
      context,
      "The scaled hit multiplier",
    )
    if (damageMultiplier < 0)
      context.collector.report(
        "INVALID_DEFINITION",
        "/hit/damageItems",
        `Adjusted multiplier for "${item.itemId}" must be non-negative`,
      )
    adjustedItems.push({
      itemId: item.itemId,
      damageMultiplier,
      finalStat: finalItemStats[itemIndex]!,
    })
  }
  for (const channel of factorChannels(context)) {
    if (
      selectedAdjustmentsFor(
        { kind: "factor", channel, entityId: hit.actorId, hitId: hit.hitId },
        context,
      ) === undefined
    ) {
      return undefined
    }
    markConsumed(context, {
      kind: "factor",
      channel,
      entityId: hit.actorId,
      hitId: hit.hitId,
    })
  }
  return {
    contributions: collectResultContributions(context),
    attributes,
    hit: {
      hitId: hit.hitId,
      criticalRate,
      damageItems: adjustedItems,
    },
  }
}

function factorChannels(context: EvaluationContext): readonly string[] {
  const channels = new Set<string>()
  for (const entry of context.prepared.contributions) {
    if (entry.rule.operation.kind === "factor-contribution") {
      channels.add(entry.rule.operation.channel)
    }
  }
  return [...channels].toSorted()
}

function collectResultContributions(
  context: EvaluationContext,
): readonly ResolvedContribution[] {
  return [...context.shared.consumed]
    .map((layer) => toResolvedContribution(layer))
    .toSorted((left, right) =>
      contributionSortKey(left) < contributionSortKey(right) ? -1 : 1,
    )
}

function contributionSortKey(contribution: ResolvedContribution): string {
  return [
    addressKey(contribution.address as ConsumptionAddress),
    contribution.origin.effectId,
    contribution.origin.bindingId,
    contribution.origin.instanceId ?? "",
    contribution.origin.layerId ?? "",
    contribution.origin.beneficiaryId,
  ].join(" ")
}

function toResolvedContribution(layer: EvaluatedLayer): ResolvedContribution {
  const unit: Unit =
    layer.address.kind === "stat"
      ? layer.address.stage === "initial-percentage" ||
        layer.address.stage === "final-percentage" ||
        layer.address.stage === "direct"
        ? "ratio"
        : STAT_UNIT_MAP[layer.address.stat]
      : layer.address.kind === "factor"
        ? FACTOR_CHANNEL_UNITS[layer.address.channel as FactorChannel]
        : "multiplier"
  return {
    address: layer.address as unknown as ResolvedOutput["address"],
    operator: layer.operator,
    value: { unit, value: layer.value },
    origin: {
      effectId: layer.candidate.entry.rule.effectId,
      bindingId: layer.candidate.entry.bindingId,
      instanceId: layer.candidate.instance?.instanceId ?? null,
      layerId: layer.candidate.layer?.layerId ?? null,
      beneficiaryId: layer.candidate.beneficiary,
    },
    appliedModifications: layer.appliedModifications,
  } as unknown as ResolvedContribution
}
