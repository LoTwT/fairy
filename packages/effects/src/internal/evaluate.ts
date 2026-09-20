import type {
  AttributeObservation,
  Condition,
  DirectStat,
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
  ResolvedContribution,
  ResolvedOutput,
  Stat,
  TriggerContext,
  Unit,
} from "../types.ts"
import { IssueCollector, failure } from "./issues.ts"
import { expectLiteral, expectNonEmptyArray, expectObject } from "./checks.ts"
import {
  readPreparedInternal,
  type PreparedContributionEntry,
  type PreparedEffectsInternal,
} from "./prepare.ts"
import { readStateInternal, type EffectStateInternal } from "./state.ts"
import {
  validateHitContext,
  validateSnapshots,
  validateWorldObservation,
  type WorldIndex,
} from "./world.ts"
import { calculateFinalStat, calculateInitialStat } from "@randomplay/core"
import { DIRECT_STATS, STAT_UNIT_MAP } from "./vocabulary.ts"

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
}

type ConsumptionAddress = OutputAddress | FactorAddress | HitAddress

interface EvaluatedLayer {
  readonly candidate: LayerCandidate
  readonly address: ConsumptionAddress
  readonly operator: "add" | "scale"
  readonly value: number
  readonly appliedModifications: readonly EffectId[]
}

/** 单次求值调用的共享可变缓存；上下文拷贝共享同一实例。 */
interface SharedCache {
  readonly statValues: Map<string, number>
  readonly failedStats: Set<string>
  readonly layers: Map<string, EvaluatedLayer | null>
  readonly selections: Map<string, readonly EvaluatedLayer[]>
  readonly consumed: Set<EvaluatedLayer>
  readonly effectiveInstances: readonly EffectInstance[] | undefined
  readonly snapshotWorlds: Map<string, WorldIndex>
}

interface EvaluationContext {
  readonly prepared: PreparedEffectsInternal
  readonly state: EffectStateInternal
  readonly world: WorldIndex
  readonly snapshots: ReadonlyMap<string, SavedSnapshotLike>
  readonly shared: SharedCache
  readonly atSeconds: number
  readonly hit: HitContext | null
  readonly collector: IssueCollector
  readonly stack: readonly string[]
}

interface SavedSnapshotLike {
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
  return `hit ${address.hitId} ${address.field}`
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
): number {
  switch (expression.kind) {
    case "literal":
      return expression.value
    case "parameter":
      return layer.entry.foldedParameters.get(expression.name)?.value ?? 0
    case "stat":
      return readStatValue(expression, context, layer)
    case "add":
      return expression.operands.reduce(
        (sum, operand) => sum + evaluateExpression(operand, context, layer),
        0,
      )
    case "minimum":
      return Math.min(
        ...expression.operands.map((operand) =>
          evaluateExpression(operand, context, layer),
        ),
      )
    case "maximum":
      return Math.max(
        ...expression.operands.map((operand) =>
          evaluateExpression(operand, context, layer),
        ),
      )
    case "multiply":
      return (
        evaluateExpression(expression.value, context, layer) *
        evaluateExpression(expression.coefficient, context, layer)
      )
    default:
      return assertNeverExpression(expression as never)
  }
}

function assertNeverExpression(expression: never): number {
  void expression
  throw new Error("Unhandled numeric expression kind")
}

function readStatValue(
  expression: {
    readonly kind: "stat"
    readonly stat: Stat
    readonly stage: "initial" | "current"
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
  stage: "initial" | "current",
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
    value =
      input.baseValue +
      [...input.additions, ...adjustments.map((entry) => entry.value)].reduce(
        (sum, adjustment) => sum + adjustment,
        0,
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
    const initial = calculateInitialStat({
      baseStat: input.baseValue,
      initialStatPercentageAdjustments: [
        ...input.initialPercentage,
        ...(initialPercentage?.map((entry) => entry.value) ?? []),
      ],
      initialStatFixedValueAdjustments: [
        ...input.initialFixed,
        ...(initialFixed?.map((entry) => entry.value) ?? []),
      ],
    })
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
      value = calculateFinalStat({
        initialStat: initial,
        finalStatPercentageAdjustments: [
          ...input.finalPercentage,
          ...(finalPercentage?.map((entry) => entry.value) ?? []),
        ],
        finalStatFixedValueAdjustments: [
          ...input.finalFixed,
          ...(finalFixed?.map((entry) => entry.value) ?? []),
        ],
      })
    }
  }
  context.shared.statValues.set(key, value)
  return value
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
  const evaluated = evaluateLayers(candidates, context)
  if (evaluated === undefined) {
    return undefined
  }
  const selected = selectUnique(evaluated, context)
  context.shared.selections.set(key, selected)
  return selected
}

function collectLayersForAddress(
  address: ConsumptionAddress,
  context: EvaluationContext,
): LayerCandidate[] | undefined {
  const candidates: LayerCandidate[] = []
  const includeHitScope = context.hit !== null
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
    const addressBeneficiary = addressEntity(address)
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

function addressEntity(address: ConsumptionAddress): EntityId | null {
  if (address.kind === "hit") {
    return null
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
      const observation = findStateObservation(
        context.world,
        instance.lifetime.stateId,
        instance.lifetime.stateOwnerId,
      )
      if (
        observation === undefined ||
        !observation.active ||
        observation.activationId !== instance.lifetime.stateActivationId
      ) {
        return false
      }
      return instance.layers.length > 0
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

function findStateObservation(
  world: WorldIndex,
  stateId: string,
  ownerId: string,
): { active: boolean; activationId: string | null } | undefined {
  for (const observation of world.states.values()) {
    if (observation.stateId === stateId && observation.ownerId === ownerId) {
      return observation
    }
  }
  return undefined
}

function evaluateLayers(
  layers: readonly LayerCandidate[],
  context: EvaluationContext,
): EvaluatedLayer[] | undefined {
  const evaluated: EvaluatedLayer[] = []
  for (const layer of layers) {
    const key = layerKey(layer)
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
    const result = evaluateSingleLayer(layer, {
      ...context,
      stack: [...context.stack, key],
    })
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

function evaluateSingleLayer(
  layer: LayerCandidate,
  context: EvaluationContext,
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
  const applicable: {
    readonly effectId: EffectId
    readonly operands: readonly {
      readonly field: string
      readonly name?: string
      readonly operator: string
      readonly value: number
    }[]
  }[] = []
  for (const modification of modifications) {
    const modificationWhen = (
      modification.rule as {
        when: Condition<"contribution">
      }
    ).when
    if (!evaluateCondition(modificationWhen, context, layer)) {
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
      value: evaluateExpression(change.change.value, context, layer),
    }))
    applicable.push({ effectId: modification.rule.effectId, operands })
  }
  const localParameters = new Map(layer.entry.foldedParameters)
  for (const { operands } of applicable) {
    for (const operand of operands) {
      if (operand.field !== "parameter") {
        continue
      }
      const name = operand.name ?? ""
      const current = localParameters.get(name)
      if (current === undefined) {
        continue
      }
      if (operand.operator === "set") {
        localParameters.set(name, { unit: current.unit, value: operand.value })
        continue
      }
      if (operand.operator === "add") {
        localParameters.set(name, {
          unit: current.unit,
          value: current.value + operand.value,
        })
        continue
      }
      localParameters.set(name, {
        unit: current.unit,
        value: current.value * operand.value,
      })
    }
  }
  const layerWithParams: LayerCandidate = {
    ...layer,
    entry: { ...layer.entry, foldedParameters: localParameters },
  }
  const operation = rule.operation
  let value: number
  let address: ConsumptionAddress
  let operator: "add" | "scale"
  if (operation.kind === "stat-adjustment") {
    value = evaluateExpression(operation.value, context, layerWithParams)
    address = {
      kind: "stat",
      stat: operation.stat,
      stage: operation.stage,
      entityId: layer.beneficiary,
      hitId: context.hit === null ? null : context.hit.hitId,
    }
    operator = "add"
  } else if (operation.kind === "factor-contribution") {
    value = evaluateExpression(operation.value, context, layerWithParams)
    address = {
      kind: "factor",
      channel: operation.channel,
      entityId: layer.beneficiary,
      hitId: context.hit === null ? null : context.hit.hitId,
    }
    operator = "add"
  } else {
    value = evaluateExpression(operation.value, context, layerWithParams)
    address = {
      kind: "hit",
      hitId: context.hit?.hitId ?? "",
      field: "damageMultiplier",
    }
    operator = "scale"
  }
  if (Number.isNaN(value)) {
    return undefined
  }
  let outputValue = value
  for (const { operands } of applicable) {
    for (const operand of operands) {
      if (operand.field !== "output") {
        continue
      }
      if (operand.operator === "add") {
        outputValue += operand.value
      } else if (operand.operator === "scale") {
        outputValue *= operand.value
      }
    }
  }
  outputValue =
    (outputValue + layer.entry.outputAddSum) * layer.entry.outputScaleProduct
  const appliedModificationIds = [
    ...applicable.map((item) => item.effectId),
    ...layer.entry.appliedModificationIds,
  ]
  return {
    candidate: layer,
    address,
    operator,
    value: outputValue,
    appliedModifications: appliedModificationIds,
  }
}

function evaluateCondition(
  condition: Condition<"contribution">,
  context: EvaluationContext,
  layer: LayerCandidate,
): boolean {
  switch (condition.kind) {
    case "constant":
      return condition.value
    case "all":
      for (const entry of condition.conditions) {
        if (!evaluateCondition(entry, context, layer)) {
          return false
        }
      }
      return true
    case "any":
      for (const entry of condition.conditions) {
        if (evaluateCondition(entry, context, layer)) {
          return true
        }
      }
      return false
    case "not":
      return !evaluateCondition(condition.condition, context, layer)
    case "compare-number": {
      const left = evaluateExpression(condition.left, context, layer)
      const right = evaluateExpression(condition.right, context, layer)
      if (Number.isNaN(left) || Number.isNaN(right)) {
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
      const observation = findStateObservation(world, condition.stateId, owner)
      if (observation === undefined) {
        return !condition.active
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
      const maximum = evaluateExpression(condition.maximum, context, layer)
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
  return false
}

function selectUnique(
  layers: readonly EvaluatedLayer[],
  context: EvaluationContext,
): EvaluatedLayer[] {
  const bySource = new Map<string, EvaluatedLayer[]>()
  for (const layer of layers) {
    const key = `${layer.candidate.entry.bindingId}\u0000${layer.candidate.entry.rule.effectId}\u0000${layer.candidate.beneficiary}\u0000${addressKey(layer.address)}`
    const list = bySource.get(key) ?? []
    list.push(layer)
    bySource.set(key, list)
  }
  interface SourceCandidate {
    readonly key: string
    readonly list: readonly EvaluatedLayer[]
    readonly combined: number
  }
  const sourceCandidates: SourceCandidate[] = [...bySource.entries()]
    .map(([key, list]) => ({
      key,
      list,
      combined:
        list[0]!.operator === "add"
          ? list.reduce((sum, entry) => sum + entry.value, 0)
          : list.reduce((product, entry) => product * entry.value, 1),
    }))
    .toSorted((left, right) => (left.key < right.key ? -1 : 1))
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
      survivors.push(...best.list)
      continue
    }
    let best = group[0]!
    for (const candidate of group) {
      const priority = resolvePriority(candidate.list[0]!.candidate.entry)
      const bestPriority = resolvePriority(best.list[0]!.candidate.entry)
      if (priority > bestPriority) {
        best = candidate
        continue
      }
      if (priority === bestPriority && candidate.combined !== best.combined) {
        context.collector.report(
          "UNIQUENESS_CONFLICT",
          "",
          `Uniqueness group "${uniqueness.key}" cannot resolve equal priorities with different values`,
        )
      }
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

function resolvePriority(entry: PreparedContributionEntry): number {
  const rule = entry.rule as {
    uniqueness?: {
      select: {
        kind: string
        priority?:
          | { kind: "literal"; value: number }
          | { kind: "parameter"; name: string }
      }
    }
  }
  const select = rule.uniqueness?.select
  if (select?.kind !== "priority") {
    return 0
  }
  const priority = select.priority
  if (priority === undefined) {
    return 0
  }
  if (priority.kind === "literal") {
    return priority.value
  }
  return entry.resolvedParameters.get(priority.name)?.value ?? 0
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
    if (JSON.stringify(existing) !== JSON.stringify(snapshot)) {
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
      snapshotWorlds: new Map(),
    },
    atSeconds,
    hit,
    collector,
    stack: [],
  }
  if (kind === "panel") {
    const entities = expectNonEmptyArray(
      inputObject["entities"],
      { collector, structureCode: "INVALID_INPUT", pointer: "/entities" },
      "panel entities",
    )
    const stats = expectNonEmptyArray(
      inputObject["stats"],
      { collector, structureCode: "INVALID_INPUT", pointer: "/stats" },
      "panel stats",
    )
    if (entities === undefined || stats === undefined) {
      return failure(collector)
    }
    const result = evaluatePanel(entities as string[], stats as Stat[], context)
    if (result === undefined || !collector.isEmpty) {
      return failure(collector)
    }
    return { ok: true, value: result }
  }
  if (kind === "contributions") {
    const beneficiaries = expectNonEmptyArray(
      inputObject["beneficiaries"],
      { collector, structureCode: "INVALID_INPUT", pointer: "/beneficiaries" },
      "contribution beneficiaries",
    )
    if (beneficiaries === undefined) {
      return failure(collector)
    }
    const result = evaluateContributionsQuery(
      beneficiaries as string[],
      context,
    )
    if (result === undefined || !collector.isEmpty) {
      return failure(collector)
    }
    return { ok: true, value: result }
  }
  const result = evaluateHitQuery(context)
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
): EvaluationResult | undefined {
  const hit = context.hit
  if (hit === null) {
    return undefined
  }
  const finalStats = new Map<string, number>()
  for (const item of hit.damageItems) {
    const value = computeStatValue(
      hit.actorId,
      item.stat,
      "current",
      hit.hitId,
      context,
    )
    if (Number.isNaN(value)) {
      return undefined
    }
    finalStats.set(item.stat, value)
    const stages: readonly (
      | "initial-percentage"
      | "initial-fixed"
      | "final-percentage"
      | "final-fixed"
      | "direct"
    )[] = DIRECT_STATS.has(item.stat as DirectStat)
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
        stat: item.stat,
        stage,
        entityId: hit.actorId,
        hitId: hit.hitId,
      })
    }
  }
  const criticalRate = computeStatValue(
    hit.actorId,
    "criticalRate",
    "current",
    hit.hitId,
    context,
  )
  if (Number.isNaN(criticalRate)) {
    return undefined
  }
  markConsumed(context, {
    kind: "stat",
    stat: "criticalRate",
    stage: "direct",
    entityId: hit.actorId,
    hitId: hit.hitId,
  })
  const multiplierSelected = selectedAdjustmentsFor(
    { kind: "hit", hitId: hit.hitId, field: "damageMultiplier" },
    context,
  )
  if (multiplierSelected === undefined) {
    return undefined
  }
  markConsumed(context, {
    kind: "hit",
    hitId: hit.hitId,
    field: "damageMultiplier",
  })
  const scaleFactor = multiplierSelected.reduce(
    (product, layer) => product * layer.value,
    1,
  )
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
  const attributes = [...finalStats.entries()].map(([stat, value]) => ({
    entityId: hit.actorId,
    stat: stat as Stat,
    stage: "current",
    value: { unit: STAT_UNIT_MAP[stat as Stat], value },
    hitId: hit.hitId,
  })) as EvaluationResult["attributes"]
  return {
    contributions: collectResultContributions(context),
    attributes,
    hit: {
      hitId: hit.hitId,
      criticalRate,
      damageItems: hit.damageItems.map((item) => ({
        itemId: item.itemId,
        damageMultiplier: item.damageMultiplier * scaleFactor,
        finalStat: finalStats.get(item.stat) ?? Number.NaN,
      })),
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
        ? "ratio"
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
