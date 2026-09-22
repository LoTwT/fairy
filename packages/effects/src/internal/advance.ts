import type {
  ActionId,
  BindingId,
  ClockUpdate,
  CooldownPolicy,
  Condition,
  EffectId,
  EffectInstance,
  EffectState,
  EntityId,
  Event,
  EventRequest,
  InstantRule,
  Issue,
  LayerId,
  NonEmpty,
  NumericExpression,
  PreparedEffects,
  Quantity,
  SavedSnapshot,
  SessionId,
  StateObservation,
  Stat,
  TargetSelector,
  TransitionInput,
  TransitionResult,
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
  type NumericTransform,
  type PreparedContributionEntry,
  type PreparedEffectsInternal,
} from "./prepare.ts"
import {
  findStateObservation,
  readStateInternal,
  resolveLayerMaximum,
  resolveStateBindingId,
  snapshotsEqual,
  type EffectStateInternal,
  freezeState,
} from "./state.ts"
import {
  validateHitContext,
  validateSnapshots,
  validateStateObservation,
  validateWorldObservation,
  type WorldIndex,
} from "./world.ts"
import {
  createMomentEvaluation,
  readMomentStat,
  type SavedSnapshotLike,
} from "./evaluate.ts"
import { ENTRY_ACTIONS, EVENT_KINDS } from "./expression.ts"
import {
  DIRECT_STATS,
  STAT_UNIT_MAP,
  isEntityId,
  isPrefixedIdentity,
} from "./vocabulary.ts"

/** 稳定元组编码：各字符串按 UTF-16 长度编码为 `长度:内容` 后连接。 */
export function encodeStableTuple(parts: readonly string[]): string {
  return parts.map((part) => `${part.length}:${part}`).join("")
}

interface TriggerRuntime {
  readonly prepared: PreparedEffectsInternal
  readonly previous: EffectStateInternal
  readonly event: Event
  readonly before: WorldIndex
  readonly after: WorldIndex
  readonly collector: IssueCollector
  readonly moment: ReturnType<typeof createMomentEvaluation>
}

/** 实例所属贡献规则的持有者；状态观察按该持有者的来源绑定解析。 */
function instanceHolderId(
  prepared: PreparedEffectsInternal,
  instance: EffectInstance,
): EntityId | undefined {
  return prepared.contributions.find(
    (contribution) =>
      contribution.rule.effectId === instance.effectId &&
      contribution.bindingId === instance.bindingId,
  )?.holderId
}

/** 引擎自有副本：冻结新状态之前先与调用方对象脱钩。 */
function cloneEngineOwned<T>(value: T): T {
  return structuredClone(value)
}

/** 触发阶段可读的角色：以持有者与事件身份解析；entryActor 回退到事件主体。 */
function resolveTriggerRole(
  role: string,
  entityId: string | undefined,
  holderId: EntityId,
  event: Event,
): EntityId | undefined {
  switch (role) {
    case "holder":
      return holderId
    case "entity":
      return entityId as EntityId
    case "triggerActor":
    case "entryActor":
      return event.actorId
    case "supportActor":
      return event.kind === "entry-followup" ? event.supportActorId : undefined
  }
  return undefined
}

function evaluateTriggerExpression(
  expression: NumericExpression<Unit, "trigger">,
  runtime: TriggerRuntime,
  holderId: EntityId,
  parameters: ReadonlyMap<string, Quantity<Unit>>,
): number {
  switch (expression.kind) {
    case "literal":
      return expression.value
    case "parameter": {
      // parameter 只读取所属规则自己的参数视图，不隐式读取目标字段。
      const parameter = parameters.get(expression.name)
      if (parameter === undefined) {
        runtime.collector.report(
          "MISSING_REFERENCE",
          "",
          `Parameter "${expression.name}" is not available in the owning rule's parameter view`,
        )
        return Number.NaN
      }
      return parameter.value
    }
    case "stat": {
      const reference = expression.entity
      const entityId = resolveTriggerRole(
        reference.role,
        "entityId" in reference ? reference.entityId : undefined,
        holderId,
        runtime.event,
      )
      if (entityId === undefined) {
        runtime.collector.report(
          "CONTEXT_MISMATCH",
          "",
          `Role "${reference.role}" cannot be resolved for this event`,
        )
        return Number.NaN
      }
      if (expression.at !== "before-event") {
        runtime.collector.report(
          "INVALID_PHASE",
          "",
          "A trigger-phase stat read must use the before-event moment",
        )
        return Number.NaN
      }
      const stage =
        DIRECT_STATS.has(expression.stat as never) &&
        expression.stage !== "current"
          ? "current"
          : expression.stage
      return readMomentStat(
        runtime.moment,
        entityId,
        expression.stat,
        stage as "initial" | "current",
      )
    }
    case "add":
      return foldTriggerValues(
        expression.operands.map((operand) =>
          evaluateTriggerExpression(operand, runtime, holderId, parameters),
        ),
        0,
        (sum, operand) => sum + operand,
        runtime,
        "A numeric expression sum",
      )
    case "minimum":
      return foldTriggerValues(
        expression.operands.map((operand) =>
          evaluateTriggerExpression(operand, runtime, holderId, parameters),
        ),
        Number.POSITIVE_INFINITY,
        (lowest, operand) => Math.min(lowest, operand),
        runtime,
        "A numeric expression minimum",
      )
    case "maximum":
      return foldTriggerValues(
        expression.operands.map((operand) =>
          evaluateTriggerExpression(operand, runtime, holderId, parameters),
        ),
        Number.NEGATIVE_INFINITY,
        (highest, operand) => Math.max(highest, operand),
        runtime,
        "A numeric expression maximum",
      )
    case "multiply":
      return foldTriggerValues(
        [
          evaluateTriggerExpression(
            expression.value,
            runtime,
            holderId,
            parameters,
          ),
          evaluateTriggerExpression(
            expression.coefficient,
            runtime,
            holderId,
            parameters,
          ),
        ],
        1,
        (product, operand) => product * operand,
        runtime,
        "A numeric expression product",
      )
    default:
      void (expression as never)
      throw new Error("Unhandled numeric expression kind")
  }
}

/**
 * 非有限结果必须失败：NaN 表示上游已经报告的问题，不重复报告；
 * ±Infinity 在此报告并返回 NaN，由调用方按既有 Result 契约失败。
 */
function requireFiniteTriggerValue(
  value: number,
  runtime: TriggerRuntime,
  description: string,
): number {
  if (Number.isNaN(value)) {
    return value
  }
  if (!Number.isFinite(value)) {
    runtime.collector.report(
      "INVALID_DEFINITION",
      "",
      `${description} is not a finite number`,
    )
    return Number.NaN
  }
  return value
}

/**
 * 逐项算术归约：每一步都检查数值边界，不靠最终输出兜底。
 * 出现非有限中间结果立即返回，避免后续步骤重复报告同一溢出。
 */
function foldTriggerValues(
  values: readonly number[],
  identity: number,
  combine: (accumulated: number, value: number) => number,
  runtime: TriggerRuntime,
  description: string,
): number {
  let accumulated = identity
  for (const value of values) {
    accumulated = requireFiniteTriggerValue(
      combine(accumulated, value),
      runtime,
      description,
    )
    if (!Number.isFinite(accumulated)) {
      return accumulated
    }
  }
  return accumulated
}

/**
 * 层到期时间必须有限：时钟算术的中间溢出按定义失败处理，
 * 不把非有限值写入新状态。
 */
function requireFiniteExpiry(
  expiresAt: number | null | undefined,
  runtime: TriggerRuntime,
  effectId: EffectId,
  bindingId: BindingId,
): number | null | undefined {
  if (
    expiresAt === null ||
    (expiresAt !== undefined && Number.isFinite(expiresAt))
  ) {
    return expiresAt
  }
  runtime.collector.report(
    "INVALID_DEFINITION",
    "",
    `Rule "${effectId}" computes a non-finite layer expiry`,
    { effectId, bindingId },
  )
  return undefined
}

/** 组内最旧层的选择：开始时间优先，平局按层 ID。 */
function oldestLayer(
  layers: readonly EffectInstance["layers"][number][],
): EffectInstance["layers"][number] {
  return [...layers].toSorted((left, right) =>
    left.startedAt !== right.startedAt
      ? left.startedAt - right.startedAt
      : left.layerId < right.layerId
        ? -1
        : 1,
  )[0]!
}

/** 组内最新层的选择：开始时间优先，平局按层 ID。 */
function newestLayer(
  layers: readonly EffectInstance["layers"][number][],
): EffectInstance["layers"][number] {
  return [...layers]
    .toSorted((left, right) =>
      left.startedAt !== right.startedAt
        ? left.startedAt - right.startedAt
        : left.layerId < right.layerId
          ? -1
          : 1,
    )
    .at(-1)!
}

/** 触发阶段事实：只有事件实际携带的字段可读，缺失报 MISSING_FACT。 */
function eventFactAvailable(fact: string, event: Event): boolean {
  switch (fact) {
    case "event.kind":
      return true
    case "event.entryAction":
      return event.kind === "entry" || event.kind === "entry-followup"
    case "event.skillCategory":
      return event.kind === "hit-resolved"
    case "event.followupActionId":
      return event.kind === "entry-followup"
  }
  return false
}

function readEventFact(fact: string, event: Event): string | undefined {
  switch (fact) {
    case "event.kind":
      return event.kind
    case "event.entryAction":
      return event.kind === "entry" || event.kind === "entry-followup"
        ? event.entryAction
        : undefined
    case "event.skillCategory":
      return event.kind === "hit-resolved" ? event.hit.skillCategory : undefined
    case "event.followupActionId":
      return event.kind === "entry-followup"
        ? event.followupActionId
        : undefined
  }
  return undefined
}

function evaluateTriggerCondition(
  condition: Condition<"trigger">,
  runtime: TriggerRuntime,
  holderId: EntityId,
  parameters: ReadonlyMap<string, Quantity<Unit>>,
): boolean {
  switch (condition.kind) {
    case "constant":
      return condition.value
    case "all":
      for (const entry of condition.conditions) {
        if (!evaluateTriggerCondition(entry, runtime, holderId, parameters)) {
          return false
        }
      }
      return true
    case "any":
      for (const entry of condition.conditions) {
        if (evaluateTriggerCondition(entry, runtime, holderId, parameters)) {
          return true
        }
      }
      return false
    case "not":
      return !evaluateTriggerCondition(
        condition.condition,
        runtime,
        holderId,
        parameters,
      )
    case "compare-number": {
      const left = requireFiniteTriggerValue(
        evaluateTriggerExpression(
          condition.left,
          runtime,
          holderId,
          parameters,
        ),
        runtime,
        "A compared operand",
      )
      const right = requireFiniteTriggerValue(
        evaluateTriggerExpression(
          condition.right,
          runtime,
          holderId,
          parameters,
        ),
        runtime,
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
      return false
    }
    case "one-of": {
      if (!eventFactAvailable(condition.fact, runtime.event)) {
        runtime.collector.report(
          "MISSING_FACT",
          "",
          `Fact "${condition.fact}" is not carried by a "${runtime.event.kind}" event`,
        )
        return false
      }
      const value = readEventFact(condition.fact, runtime.event)
      return (
        value !== undefined &&
        (condition.values as readonly string[]).includes(value)
      )
    }
    case "event-flag": {
      if (runtime.event.kind !== "hit-resolved") {
        runtime.collector.report(
          "MISSING_FACT",
          "",
          'Fact "isCriticalHit" is only carried by hit-resolved events',
        )
        return false
      }
      return runtime.event.isCriticalHit === condition.value
    }
    case "same-entity":
    case "same-team": {
      const left = resolveTriggerRole(
        condition.left.role,
        "entityId" in condition.left ? condition.left.entityId : undefined,
        holderId,
        runtime.event,
      )
      const right = resolveTriggerRole(
        condition.right.role,
        "entityId" in condition.right ? condition.right.entityId : undefined,
        holderId,
        runtime.event,
      )
      if (left === undefined || right === undefined) {
        runtime.collector.report(
          "CONTEXT_MISMATCH",
          "",
          `Roles in ${condition.kind} cannot be resolved for this event`,
        )
        return false
      }
      if (condition.kind === "same-entity") {
        return left === right
      }
      const leftActor = runtime.before.actors.get(left)
      const rightActor = runtime.before.actors.get(right)
      if (leftActor === undefined || rightActor === undefined) {
        runtime.collector.report(
          "MISSING_FACT",
          "",
          `Team membership for "${left}" or "${right}" is not observable`,
        )
        return false
      }
      return leftActor.teamId === rightActor.teamId
    }
    case "state-is": {
      const owner = resolveTriggerRole(
        condition.owner.role,
        "entityId" in condition.owner ? condition.owner.entityId : undefined,
        holderId,
        runtime.event,
      )
      if (owner === undefined) {
        runtime.collector.report(
          "CONTEXT_MISMATCH",
          "",
          "The owner of a state read cannot be resolved",
        )
        return false
      }
      const bindingId = resolveStateBindingId(
        runtime.prepared,
        condition.stateId,
        holderId,
        runtime.collector,
      )
      if (bindingId === undefined) {
        return false
      }
      const observation = findStateObservation(
        runtime.before,
        condition.stateId,
        bindingId,
        owner,
      )
      if (observation === undefined) {
        // 缺记录不是未生效：未生效必须显式提供 active: false 的观察。
        runtime.collector.report(
          "MISSING_FACT",
          "",
          `State "${condition.stateId}" is not observed for owner "${owner}" at "before-event"`,
        )
        return false
      }
      return observation.active === condition.active
    }
  }
  return false
}

/** 按目标选择器解析受益者；与世界观察一致地要求持有者可见。 */
function resolveAdvanceBeneficiaries(
  selector: TargetSelector,
  entryHolderId: EntityId,
  runtime: TriggerRuntime,
): readonly EntityId[] | undefined {
  const holder = runtime.before.actors.get(entryHolderId)
  if (holder === undefined) {
    runtime.collector.report(
      "MISSING_FACT",
      "",
      `Holder "${entryHolderId}" is not an observed actor; targets cannot be resolved`,
    )
    return undefined
  }
  if (selector.kind === "holder") {
    return [entryHolderId]
  }
  if (selector.kind === "holder-and-trigger-actor") {
    return [...new Set([entryHolderId, runtime.event.actorId])].toSorted()
  }
  const team = [...runtime.before.actors.values()]
    .filter((actor) => actor.teamId === holder.teamId)
    .map((actor) => actor.entityId)
    .toSorted()
  if (selector.kind === "team") {
    return team
  }
  return team.filter((entityId) => entityId !== entryHolderId)
}

function stateObservationsEqual(
  left: StateObservation,
  right: StateObservation,
): boolean {
  return (
    left.stateId === right.stateId &&
    left.bindingId === right.bindingId &&
    left.ownerId === right.ownerId &&
    left.active === right.active &&
    left.activationId === right.activationId &&
    left.since === right.since
  )
}

function validateTransitionEvent(
  value: unknown,
  collector: IssueCollector,
): Event | undefined {
  const checks = {
    collector,
    structureCode: "INVALID_INPUT" as const,
    pointer: "/event",
  }
  const object = expectObject(value, checks, "transition event")
  if (object === undefined) {
    return undefined
  }
  const kind = expectLiteral(
    object["kind"],
    EVENT_KINDS,
    { ...checks, pointer: "/event/kind" },
    "event kind",
  )
  const eventId = object["eventId"]
  if (!isPrefixedIdentity(eventId) || !String(eventId).startsWith("event:")) {
    collector.report(
      "INVALID_INPUT",
      "/event/eventId",
      "eventId must be an event: identity",
    )
    return undefined
  }
  const atSeconds = object["atSeconds"]
  if (
    typeof atSeconds !== "number" ||
    !Number.isFinite(atSeconds) ||
    atSeconds < 0
  ) {
    collector.report(
      "INVALID_INPUT",
      "/event/atSeconds",
      "atSeconds must be a non-negative finite number",
    )
    return undefined
  }
  const sequence = object["sequence"]
  if (
    typeof sequence !== "number" ||
    !Number.isInteger(sequence) ||
    sequence < 0 ||
    !Number.isSafeInteger(sequence)
  ) {
    collector.report(
      "INVALID_INPUT",
      "/event/sequence",
      "sequence must be a non-negative safe integer",
    )
    return undefined
  }
  const actorId = object["actorId"]
  if (!isEntityId(actorId)) {
    collector.report(
      "INVALID_INPUT",
      "/event/actorId",
      "actorId must be an entity: identity",
    )
    return undefined
  }
  if (kind === undefined) {
    return undefined
  }
  const common = ["kind", "eventId", "atSeconds", "sequence", "actorId"]
  const base = {
    eventId: eventId as Event["eventId"],
    atSeconds: atSeconds as number,
    sequence: sequence as number,
    actorId: actorId as EntityId,
  }
  switch (kind) {
    case "hit-resolved": {
      rejectUnknownFields(
        object,
        [...common, "hit", "isCriticalHit"],
        checks,
        "hit-resolved event",
      )
      const hit = validateHitContext(object["hit"], collector, "/event/hit")
      if (hit === undefined) {
        return undefined
      }
      if (typeof object["isCriticalHit"] !== "boolean") {
        collector.report(
          "INVALID_INPUT",
          "/event/isCriticalHit",
          "isCriticalHit must be a boolean",
        )
        return undefined
      }
      if (hit.actorId !== base.actorId) {
        collector.report(
          "CONTEXT_MISMATCH",
          "/event/actorId",
          "The event actor must be the hit actor",
        )
        return undefined
      }
      return {
        ...base,
        kind: "hit-resolved",
        hit,
        isCriticalHit: object["isCriticalHit"] as boolean,
      }
    }
    case "entry": {
      rejectUnknownFields(
        object,
        [...common, "entryAction"],
        checks,
        "entry event",
      )
      const entryAction = expectLiteral(
        object["entryAction"],
        ENTRY_ACTIONS,
        { ...checks, pointer: "/event/entryAction" },
        "entry action",
      )
      if (entryAction === undefined) {
        return undefined
      }
      return { ...base, kind: "entry", entryAction }
    }
    case "entry-followup": {
      rejectUnknownFields(
        object,
        [
          ...common,
          "entryAction",
          "entryEventId",
          "supportActorId",
          "energySpent",
          "followupActionId",
        ],
        checks,
        "entry-followup event",
      )
      const entryAction = expectLiteral(
        object["entryAction"],
        ENTRY_ACTIONS,
        { ...checks, pointer: "/event/entryAction" },
        "entry action",
      )
      const entryEventId = object["entryEventId"]
      const supportActorId = object["supportActorId"]
      const energySpent = object["energySpent"]
      const followupActionId = object["followupActionId"]
      if (
        !isPrefixedIdentity(entryEventId) ||
        !String(entryEventId).startsWith("event:")
      ) {
        collector.report(
          "INVALID_INPUT",
          "/event/entryEventId",
          "entryEventId must be an event: identity",
        )
        return undefined
      }
      if (!isEntityId(supportActorId)) {
        collector.report(
          "INVALID_INPUT",
          "/event/supportActorId",
          "supportActorId must be an entity: identity",
        )
        return undefined
      }
      if (
        typeof energySpent !== "number" ||
        !Number.isFinite(energySpent) ||
        energySpent < 0
      ) {
        collector.report(
          "INVALID_INPUT",
          "/event/energySpent",
          "energySpent must be a non-negative finite number",
        )
        return undefined
      }
      if (
        !isPrefixedIdentity(followupActionId) ||
        !String(followupActionId).startsWith("action:")
      ) {
        collector.report(
          "INVALID_INPUT",
          "/event/followupActionId",
          "followupActionId must be an action: identity",
        )
        return undefined
      }
      if (entryAction === undefined) {
        return undefined
      }
      return {
        ...base,
        kind: "entry-followup",
        entryAction,
        entryEventId: entryEventId as `event:${string}`,
        supportActorId: supportActorId as EntityId,
        energySpent: energySpent as number,
        followupActionId: followupActionId as ActionId,
      }
    }
    case "energy-spent": {
      rejectUnknownFields(
        object,
        [...common, "energySpent"],
        checks,
        "energy-spent event",
      )
      const energySpent = object["energySpent"]
      if (
        typeof energySpent !== "number" ||
        !Number.isFinite(energySpent) ||
        energySpent < 0
      ) {
        collector.report(
          "INVALID_INPUT",
          "/event/energySpent",
          "energySpent must be a non-negative finite number",
        )
        return undefined
      }
      return { ...base, kind: "energy-spent", energySpent }
    }
    case "precision-support": {
      rejectUnknownFields(object, common, checks, "precision-support event")
      return { ...base, kind: "precision-support" }
    }
    case "summon-attack-ordered": {
      rejectUnknownFields(
        object,
        [...common, "summonIds"],
        checks,
        "summon-attack-ordered event",
      )
      const summonIds = expectNonEmptyArray(
        object["summonIds"],
        {
          collector,
          structureCode: "INVALID_INPUT",
          pointer: "/event/summonIds",
        },
        "summon identities",
      )
      if (summonIds === undefined) {
        return undefined
      }
      const validated: EntityId[] = []
      for (const [index, summonId] of summonIds.entries()) {
        if (!isEntityId(summonId)) {
          collector.report(
            "INVALID_INPUT",
            `/event/summonIds/${index}`,
            "summonIds must contain entity: identities",
          )
          return undefined
        }
        if (validated.includes(summonId as EntityId)) {
          collector.report(
            "DUPLICATE_ID",
            `/event/summonIds/${index}`,
            `Summon "${summonId}" is listed more than once`,
          )
          return undefined
        }
        validated.push(summonId as EntityId)
      }
      return {
        ...base,
        kind: "summon-attack-ordered",
        summonIds: validated as unknown as NonEmpty<EntityId>,
      }
    }
    case "state-observed": {
      rejectUnknownFields(
        object,
        [...common, "observation"],
        checks,
        "state-observed event",
      )
      const observation = object["observation"]
      if (
        observation === undefined ||
        !validateStateObservation(observation, collector, "/event/observation")
      ) {
        return undefined
      }
      return {
        ...base,
        kind: "state-observed",
        observation: observation as StateObservation,
      }
    }
  }
  return undefined
}

function stackKeyForEvent(
  keys: readonly ("trigger-actor" | "skill-category")[],
  runtime: TriggerRuntime,
  effectId: EffectId,
): readonly string[] | undefined {
  const parts: string[] = []
  for (const key of keys) {
    if (key === "trigger-actor") {
      parts.push(runtime.event.actorId)
      continue
    }
    if (runtime.event.kind !== "hit-resolved") {
      runtime.collector.report(
        "MISSING_FACT",
        "",
        `Rule "${effectId}" stacks by skill category, which a "${runtime.event.kind}" event does not carry`,
      )
      return undefined
    }
    parts.push(runtime.event.hit.skillCategory)
  }
  return parts
}

function partitionIdentity(
  partition: "binding" | "holder" | "trigger-actor" | "team" | "global",
  bindingId: BindingId,
  holderId: EntityId,
  runtime: TriggerRuntime,
): string | undefined {
  switch (partition) {
    case "binding":
      return bindingId
    case "holder":
      return holderId
    case "trigger-actor":
      return runtime.event.actorId
    case "global":
      return "global"
    case "team": {
      const holder = runtime.before.actors.get(holderId)
      if (holder === undefined) {
        runtime.collector.report(
          "MISSING_FACT",
          "",
          `Holder "${holderId}" is not an observed actor; the team partition cannot be resolved`,
        )
        return undefined
      }
      return holder.teamId
    }
  }
}

/** 按时钟表更新被选中的旧层到期时间；无限层按上限语义收敛。 */
/**
 * 时间算术的一步：两个有限值相加必须仍然有限。
 * 溢出返回 undefined，由调用方按定义失败处理，不在封顶之后才判断。
 */
function finiteTimeSum(left: number, right: number): number | undefined {
  const sum = left + right
  return Number.isFinite(sum) ? sum : undefined
}

/**
 * 按时钟表更新被选中的旧层到期时间；无限层按上限语义收敛。
 * 任何一步的中间溢出都返回 undefined，调用方报告失败而不是写入非有限值。
 */
function applyClockUpdate(
  update: ClockUpdate,
  layerExpiresAt: number | null,
  eventTime: number,
  duration: number,
  maximum: number | undefined,
  firstActivatedAt: number,
): number | null | undefined {
  if (update.kind === "keep") {
    return layerExpiresAt
  }
  if (update.kind === "refresh") {
    return finiteTimeSum(eventTime, duration)
  }
  if (update.kind === "extend") {
    if (update.limit.kind === "none") {
      return layerExpiresAt === null
        ? null
        : finiteTimeSum(layerExpiresAt, duration)
    }
    if (maximum === undefined) {
      // 没有声明有界延长时不存在封顶值，保持原时钟。
      return layerExpiresAt
    }
    const cap = finiteTimeSum(
      update.limit.kind === "remaining" ? eventTime : firstActivatedAt,
      maximum,
    )
    if (cap === undefined) {
      return undefined
    }
    if (layerExpiresAt === null) {
      return cap
    }
    const extended = finiteTimeSum(layerExpiresAt, duration)
    if (extended === undefined) {
      return undefined
    }
    return Math.min(extended, cap)
  }
  return layerExpiresAt
}

/** 收集规则及其贡献阶段修改在激活时点读取的属性。 */
function collectActivationStatReads(
  entry: PreparedContributionEntry,
  runtime: TriggerRuntime,
): readonly {
  readonly role: string
  readonly entityId: string | undefined
  readonly stat: Stat
  readonly stage: "initial" | "current"
}[] {
  const reads: {
    role: string
    entityId: string | undefined
    stat: Stat
    stage: "initial" | "current"
  }[] = []
  const walkExpression = (expression: unknown): void => {
    if (typeof expression !== "object" || expression === null) {
      return
    }
    const record = expression as Record<string, unknown>
    if (record["kind"] === "stat" && record["at"] === "activation") {
      const entity = record["entity"] as
        | { readonly role: string; readonly entityId?: string }
        | undefined
      const stat = record["stat"] as Stat
      const stage = record["stage"] as "initial" | "current"
      if (entity !== undefined && typeof stat === "string") {
        reads.push({
          role: entity.role,
          entityId: entity.entityId,
          stat,
          stage: DIRECT_STATS.has(stat as never) ? "current" : stage,
        })
      }
    }
    for (const value of Object.values(record)) {
      walkExpression(value)
    }
  }
  const walkCondition = (condition: unknown): void => {
    if (typeof condition !== "object" || condition === null) {
      return
    }
    const record = condition as Record<string, unknown>
    for (const [key, value] of Object.entries(record)) {
      if (key === "left" || key === "right" || key === "maximum") {
        walkExpression(value)
        continue
      }
      walkCondition(value)
    }
  }
  const ruleRecord = entry.rule as unknown as Record<string, unknown>
  walkExpression(ruleRecord["operation"])
  walkCondition(ruleRecord["when"])
  for (const modification of runtime.prepared.modifications) {
    if (
      modification.rule.phase !== "contribution" ||
      modification.rule.target.kind !== "effect" ||
      modification.rule.target.effectId !== entry.rule.effectId ||
      modification.holderId !== entry.holderId
    ) {
      continue
    }
    walkCondition(modification.rule.when)
    for (const change of modification.rule.modifications) {
      walkExpression(change.change.value)
    }
  }
  return reads
}

function activationSnapshotId(
  sessionId: SessionId,
  prepared: PreparedEffectsInternal,
  eventId: string,
  effectId: EffectId,
  bindingId: BindingId,
): string {
  return `snapshot:${encodeStableTuple([
    sessionId,
    prepared.ruleSet.ruleSetId,
    prepared.ruleSet.revision,
    eventId,
    effectId,
    bindingId,
  ])}`
}

function instanceIdFor(
  sessionId: SessionId,
  prepared: PreparedEffectsInternal,
  effectId: EffectId,
  bindingId: BindingId,
  beneficiaryIds: readonly EntityId[],
  stackKey: readonly string[],
  lifetimeKeyParts: readonly string[],
  eventId: string,
): string {
  return `instance:${encodeStableTuple([
    sessionId,
    prepared.ruleSet.ruleSetId,
    prepared.ruleSet.revision,
    effectId,
    bindingId,
    ...beneficiaryIds,
    ...stackKey,
    ...lifetimeKeyParts,
    eventId,
  ])}`
}

function layerIdFor(
  sessionId: SessionId,
  prepared: PreparedEffectsInternal,
  effectId: EffectId,
  bindingId: BindingId,
  beneficiaryIds: readonly EntityId[],
  stackKey: readonly string[],
  lifetimeKeyParts: readonly string[],
  eventId: string,
  ordinal: number,
): string {
  return `layer:${encodeStableTuple([
    sessionId,
    prepared.ruleSet.ruleSetId,
    prepared.ruleSet.revision,
    effectId,
    bindingId,
    ...beneficiaryIds,
    ...stackKey,
    ...lifetimeKeyParts,
    eventId,
    String(ordinal),
  ])}`
}

function requestIdFor(
  sessionId: SessionId,
  prepared: PreparedEffectsInternal,
  eventId: string,
  effectId: EffectId,
  bindingId: BindingId,
  beneficiaryId: EntityId,
  operationIndex: number,
): string {
  return `request:${encodeStableTuple([
    sessionId,
    prepared.ruleSet.ruleSetId,
    prepared.ruleSet.revision,
    eventId,
    effectId,
    bindingId,
    beneficiaryId,
    String(operationIndex),
  ])}`
}

function timedGroupKey(
  effectId: string,
  bindingId: string,
  beneficiaryIds: readonly string[],
  stackKey: readonly string[],
): string {
  return [
    effectId,
    bindingId,
    ...[...beneficiaryIds].toSorted(),
    ...stackKey,
    "timed",
  ].join(" ")
}

function stateBoundGroupKey(
  effectId: string,
  bindingId: string,
  beneficiaryIds: readonly string[],
  stackKey: readonly string[],
  stateId: string,
  stateOwnerId: string,
  stateActivationId: string,
): string {
  return [
    effectId,
    bindingId,
    ...[...beneficiaryIds].toSorted(),
    ...stackKey,
    "state-bound",
    stateId,
    stateOwnerId,
    stateActivationId,
  ].join(" ")
}

/**
 * 时长变换 `(set 或原值 + Σadd) × Πscale`：每一步都检查有限性，
 * 溢出报告后返回 NaN，由调用方按既有 Result 契约失败，不被后续 set 掩盖。
 */
function applyTimeTransform(
  base: number,
  set: number | undefined,
  addSum: number,
  scaleProduct: number,
  runtime: TriggerRuntime,
  description: string,
): number {
  const withAdds = requireFiniteTriggerValue(
    (set ?? base) + addSum,
    runtime,
    description,
  )
  return requireFiniteTriggerValue(
    withAdds * scaleProduct,
    runtime,
    description,
  )
}

function applyTransform(
  base: number,
  transform: NumericTransform | undefined,
  runtime: TriggerRuntime,
  description: string,
): number {
  if (transform === undefined) {
    return base
  }
  return applyTimeTransform(
    base,
    transform.set,
    transform.addSum,
    transform.scaleProduct,
    runtime,
    description,
  )
}

interface ActivationTimingChange {
  set: number | undefined
  addSum: number
  scaleProduct: number
}

function applyTimingChange(
  base: number,
  change: ActivationTimingChange,
  runtime: TriggerRuntime,
  description: string,
): number {
  return applyTimeTransform(
    base,
    change.set,
    change.addSum,
    change.scaleProduct,
    runtime,
    description,
  )
}

/** 求值本次触发使用的时长与延长上限，含激活阶段修改与重新校验。 */
function evaluateActivationTiming(
  entry: PreparedContributionEntry,
  runtime: TriggerRuntime,
):
  | { readonly duration: number; readonly maximum: number | undefined }
  | undefined {
  const activation = entry.rule.activation
  if (activation.kind !== "triggered" || activation.lifetime.kind !== "timed") {
    return undefined
  }
  const baseDuration = evaluateTriggerExpression(
    activation.lifetime.seconds,
    runtime,
    entry.holderId,
    entry.foldedParameters,
  )
  const durationDescription = `The duration of "${entry.rule.effectId}"`
  const maximumDescription = `The extension maximum of "${entry.rule.effectId}"`
  let duration = applyTransform(
    baseDuration,
    entry.durationTransform,
    runtime,
    durationDescription,
  )
  let maximum: number | undefined
  if (activation.lifetime.onRetrigger.kind === "extend") {
    const limit = activation.lifetime.onRetrigger.limit
    if (limit.kind !== "none") {
      maximum = applyTransform(
        evaluateTriggerExpression(
          limit.maximum,
          runtime,
          entry.holderId,
          entry.foldedParameters,
        ),
        entry.extensionMaximumTransform,
        runtime,
        maximumDescription,
      )
    }
  }
  const durationChange: ActivationTimingChange = {
    set: undefined,
    addSum: 0,
    scaleProduct: 1,
  }
  const maximumChange: ActivationTimingChange = {
    set: undefined,
    addSum: 0,
    scaleProduct: 1,
  }
  let touchedDuration = false
  let touchedMaximum = false
  for (const modification of runtime.prepared.modifications) {
    if (
      modification.rule.phase !== "activation" ||
      modification.rule.target.kind !== "effect" ||
      modification.rule.target.effectId !== entry.rule.effectId ||
      modification.holderId !== entry.holderId
    ) {
      continue
    }
    if (
      !evaluateTriggerCondition(
        modification.rule.when,
        runtime,
        entry.holderId,
        modification.resolvedParameters,
      )
    ) {
      continue
    }
    for (const change of modification.rule.modifications) {
      const value = evaluateTriggerExpression(
        change.change.value,
        runtime,
        entry.holderId,
        modification.resolvedParameters,
      )
      if (Number.isNaN(value)) {
        return undefined
      }
      const modifyingDuration = change.field === "duration-seconds"
      const target = modifyingDuration ? durationChange : maximumChange
      const description = modifyingDuration
        ? durationDescription
        : maximumDescription
      if (modifyingDuration) {
        touchedDuration = true
      } else {
        touchedMaximum = true
      }
      if (change.change.operator === "set") {
        if (target.set !== undefined && target.set !== value) {
          runtime.collector.report(
            "MODIFICATION_CONFLICT",
            "",
            `Activation modifications declare conflicting set values for "${entry.rule.effectId}"`,
            { effectId: entry.rule.effectId, bindingId: entry.bindingId },
          )
          return undefined
        }
        target.set = value
      } else if (change.change.operator === "add") {
        // 激活阶段修改的累计同样逐步检查：先溢出再被 set 覆盖也是失败。
        target.addSum = requireFiniteTriggerValue(
          target.addSum + value,
          runtime,
          description,
        )
      } else {
        target.scaleProduct = requireFiniteTriggerValue(
          target.scaleProduct * value,
          runtime,
          description,
        )
      }
    }
  }
  if (touchedDuration) {
    duration = applyTimingChange(
      duration,
      durationChange,
      runtime,
      durationDescription,
    )
  }
  if (touchedMaximum) {
    if (maximum === undefined) {
      runtime.collector.report(
        "INVALID_MODIFICATION",
        "",
        `An activation modification extends the maximum of "${entry.rule.effectId}", which declares no bounded extension`,
        { effectId: entry.rule.effectId, bindingId: entry.bindingId },
      )
      return undefined
    }
    maximum = applyTimingChange(
      maximum,
      maximumChange,
      runtime,
      maximumDescription,
    )
  }
  if (!Number.isFinite(duration) || duration <= 0) {
    runtime.collector.report(
      "INVALID_DEFINITION",
      "",
      `Rule "${entry.rule.effectId}" evaluates to a non-positive duration`,
      { effectId: entry.rule.effectId, bindingId: entry.bindingId },
    )
    return undefined
  }
  if (maximum !== undefined) {
    if (!Number.isFinite(maximum) || maximum <= 0) {
      runtime.collector.report(
        "INVALID_DEFINITION",
        "",
        `Rule "${entry.rule.effectId}" evaluates to a non-positive extension maximum`,
        { effectId: entry.rule.effectId, bindingId: entry.bindingId },
      )
      return undefined
    }
    if (duration > maximum) {
      runtime.collector.report(
        touchedDuration || touchedMaximum
          ? "INVALID_MODIFICATION"
          : "INVALID_DEFINITION",
        "",
        `Rule "${entry.rule.effectId}" requires 0 < duration <= extension maximum`,
        { effectId: entry.rule.effectId, bindingId: entry.bindingId },
      )
      return undefined
    }
  }
  return { duration, maximum }
}

function layerSurvives(
  layer: EffectInstance["layers"][number],
  eventTime: number,
): boolean {
  if (layer.expiresAt === null) {
    return layer.startedAt <= eventTime
  }
  return layer.startedAt <= eventTime && eventTime < layer.expiresAt
}

function triggerContextForEvent(
  runtime: TriggerRuntime,
  snapshotId: string,
): TriggerContext {
  const event = runtime.event
  const entryActorId =
    event.kind === "entry" || event.kind === "entry-followup"
      ? event.actorId
      : undefined
  const supportActorId =
    event.kind === "entry-followup" ? event.supportActorId : undefined
  const skillCategory =
    event.kind === "hit-resolved" ? event.hit.skillCategory : undefined
  return {
    eventId: event.eventId,
    actorId: event.actorId,
    ...(entryActorId === undefined ? {} : { entryActorId }),
    ...(supportActorId === undefined ? {} : { supportActorId }),
    ...(skillCategory === undefined ? {} : { skillCategory }),
    activationSnapshotId: snapshotId as `snapshot:${string}`,
  }
}

function validateEventOrdering(runtime: TriggerRuntime): boolean {
  const previous = runtime.previous
  const event = runtime.event
  if (previous.processedEventIds.includes(event.eventId)) {
    runtime.collector.report(
      "EVENT_ORDER",
      "/event/eventId",
      `Event "${event.eventId}" has already been processed by this state`,
    )
    return false
  }
  if (event.atSeconds < previous.atSeconds) {
    runtime.collector.report(
      "EVENT_ORDER",
      "/event/atSeconds",
      "Event time must not be earlier than the state time",
    )
    return false
  }
  const last = previous.lastCursor
  if (last !== null) {
    if (event.atSeconds < last.atSeconds) {
      runtime.collector.report(
        "EVENT_ORDER",
        "/event/atSeconds",
        "Event time must not regress relative to the last state change",
      )
      return false
    }
    if (event.atSeconds === last.atSeconds && event.sequence <= last.sequence) {
      runtime.collector.report(
        "EVENT_ORDER",
        "/event/sequence",
        "Events at the same second must advance their sequence",
      )
      return false
    }
  }
  return true
}

function sharedGroupClock(
  selectedLayers: readonly EffectInstance["layers"][number][],
  onRetrigger: ClockUpdate,
  eventTime: number,
  duration: number,
  maximum: number | undefined,
  firstActivatedAt: number,
  fallback: number,
): number | undefined {
  if (selectedLayers.length === 0) {
    return fallback
  }
  const reference = selectedLayers.reduce((latest, layer) =>
    (layer.expiresAt ?? Number.POSITIVE_INFINITY) >
    (latest.expiresAt ?? Number.POSITIVE_INFINITY)
      ? layer
      : latest,
  )
  const updated = applyClockUpdate(
    onRetrigger,
    reference.expiresAt,
    eventTime,
    duration,
    maximum,
    firstActivatedAt,
  )
  if (updated === undefined) {
    return undefined
  }
  return updated ?? fallback
}

export function advanceEffects(
  prepared: PreparedEffects,
  previous: EffectState,
  input: TransitionInput,
):
  | { readonly ok: true; readonly value: TransitionResult }
  | { readonly ok: false; readonly issues: NonEmpty<Issue> } {
  const preparedInternal = readPreparedInternal(prepared)
  const stateInternal = readStateInternal(previous)
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
    "transition input",
  )
  if (inputObject === undefined) {
    return failure(collector)
  }
  rejectUnknownFields(
    inputObject,
    ["event", "before", "after", "observedSnapshots"],
    { collector, structureCode: "INVALID_INPUT", pointer: "" },
    "transition input",
  )
  const event = validateTransitionEvent(inputObject["event"], collector)
  if (event === undefined) {
    return failure(collector)
  }
  const before = validateWorldObservation(
    inputObject["before"],
    collector,
    "/before",
  )
  const after = validateWorldObservation(
    inputObject["after"],
    collector,
    "/after",
  )
  if (before === undefined || after === undefined) {
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
  if (!collector.isEmpty) {
    return failure(collector)
  }
  if (event.kind === "entry-followup") {
    if (!stateInternal.processedEventIds.includes(event.entryEventId)) {
      collector.report(
        "MISSING_REFERENCE",
        "/event/entryEventId",
        `Entry event "${event.entryEventId}" has not been processed by this state`,
      )
      return failure(collector)
    }
  }
  if (event.kind === "summon-attack-ordered") {
    for (const summonId of event.summonIds) {
      const summon = before.summons.get(summonId)
      if (summon === undefined) {
        collector.report(
          "MISSING_FACT",
          "/event/summonIds",
          `Summon "${summonId}" is not observable in the before world`,
        )
        return failure(collector)
      }
      if (summon.ownerId !== event.actorId) {
        collector.report(
          "CONTEXT_MISMATCH",
          "/event/summonIds",
          `Summon "${summonId}" does not belong to the ordering actor`,
        )
        return failure(collector)
      }
    }
  }
  if (event.kind === "state-observed") {
    const observation = event.observation
    const matching = findStateObservation(
      after,
      observation.stateId,
      observation.bindingId,
      observation.ownerId,
    )
    if (matching === undefined) {
      collector.report(
        "MISSING_FACT",
        "/event/observation",
        `The after world does not record state "${observation.stateId}" for owner "${observation.ownerId}"`,
      )
      return failure(collector)
    }
    if (!stateObservationsEqual(matching, observation)) {
      collector.report(
        "CONTEXT_MISMATCH",
        "/event/observation",
        "The observed state record must match the after world",
      )
      return failure(collector)
    }
  }
  const runtime: TriggerRuntime = {
    prepared: preparedInternal,
    previous: stateInternal,
    event,
    before,
    after,
    collector,
    moment: createMomentEvaluation(
      preparedInternal,
      { ...stateInternal, atSeconds: event.atSeconds },
      before,
      snapshots as ReadonlyMap<string, SavedSnapshotLike>,
      event.atSeconds,
      collector,
    ),
  }
  if (!validateEventOrdering(runtime)) {
    return failure(collector)
  }
  const requests: EventRequest[] = []
  const workingInstances: EffectInstance[] = stateInternal.instances.filter(
    (instance) => {
      if (instance.lifetime.kind !== "state-bound") {
        return true
      }
      const holderId = instanceHolderId(preparedInternal, instance)
      if (holderId === undefined) {
        return false
      }
      const bindingId = resolveStateBindingId(
        preparedInternal,
        instance.lifetime.stateId,
        holderId,
        collector,
      )
      if (bindingId === undefined) {
        return false
      }
      const observation = findStateObservation(
        after,
        instance.lifetime.stateId,
        bindingId,
        instance.lifetime.stateOwnerId,
      )
      if (observation === undefined) {
        // 缺记录不是状态结束：不能把缺失观察当作旧层已失效而清除。
        collector.report(
          "MISSING_FACT",
          "",
          `State "${instance.lifetime.stateId}" is not observed for owner "${instance.lifetime.stateOwnerId}" in the after world`,
          { effectId: instance.effectId, bindingId: instance.bindingId },
        )
        return false
      }
      return (
        observation.active &&
        observation.activationId === instance.lifetime.stateActivationId
      )
    },
  )
  if (!collector.isEmpty) {
    return failure(collector)
  }
  const cooldownUpdates = new Map<
    string,
    {
      readonly groupId: string
      readonly partitionKey: string
      readonly availableAt: number
    }
  >()
  const touchedInstances = new Map<string, EffectInstance>()
  const newInstances: EffectInstance[] = []
  const frozenSnapshots = new Map<string, SavedSnapshot>()
  const cooldownDeclarations = new Map<string, number>()
  interface CandidatePlan {
    readonly effectId: EffectId
    readonly bindingId: BindingId
    readonly cooldownGroupId: string | undefined
    readonly cooldownPartitionKey: string | undefined
    readonly cooldownSeconds: number | undefined
    readonly execute: () => boolean
  }
  const plans: CandidatePlan[] = []
  const cooldownAvailability = (key: string): number | undefined => {
    const existing = stateInternal.cooldowns.find(
      (cooldown) => `${cooldown.groupId} ${cooldown.partitionKey}` === key,
    )
    return existing?.availableAt
  }
  const freezeSnapshot = (
    entry: PreparedContributionEntry,
    beneficiaries: readonly EntityId[],
  ): string | undefined => {
    const snapshotId = activationSnapshotId(
      stateInternal.sessionId,
      preparedInternal,
      event.eventId,
      entry.rule.effectId,
      entry.bindingId,
    )
    if (frozenSnapshots.has(snapshotId)) {
      return snapshotId
    }
    const attributes: SavedSnapshot["attributes"][number][] = []
    const seen = new Set<string>()
    for (const read of collectActivationStatReads(entry, runtime)) {
      const entities =
        read.role === "beneficiary"
          ? beneficiaries
          : [
              resolveTriggerRole(
                read.role,
                read.entityId,
                entry.holderId,
                event,
              ),
            ]
      for (const entityId of entities) {
        if (entityId === undefined) {
          continue
        }
        const key = `${entityId} ${read.stat} ${read.stage}`
        if (seen.has(key)) {
          continue
        }
        seen.add(key)
        const value = readMomentStat(
          runtime.moment,
          entityId,
          read.stat,
          read.stage,
        )
        if (Number.isNaN(value)) {
          return undefined
        }
        attributes.push({
          entityId,
          stat: read.stat,
          stage: read.stage,
          value: { unit: STAT_UNIT_MAP[read.stat], value },
        } as SavedSnapshot["attributes"][number])
      }
    }
    attributes.sort((left, right) => {
      const leftKey = `${left.entityId} ${left.stat} ${left.stage}`
      const rightKey = `${right.entityId} ${right.stat} ${right.stage}`
      return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0
    })
    frozenSnapshots.set(snapshotId, {
      snapshotId: snapshotId as `snapshot:${string}`,
      atSeconds: event.atSeconds,
      attributes,
      world: cloneEngineOwned(inputObject["before"]) as SavedSnapshot["world"],
    })
    return snapshotId
  }
  const registerCooldown = (
    ruleEffectId: EffectId,
    bindingId: BindingId,
    holderId: EntityId,
    cooldown: CooldownPolicy,
    parameters: ReadonlyMap<string, Quantity<Unit>>,
  ): { readonly key: string; readonly blocked: boolean } | undefined => {
    const identity = partitionIdentity(
      cooldown.partition,
      bindingId,
      holderId,
      runtime,
    )
    if (identity === undefined) {
      return undefined
    }
    const partitionKey = encodeStableTuple([cooldown.partition, identity])
    const key = `${cooldown.groupId} ${partitionKey}`
    const seconds = evaluateTriggerExpression(
      cooldown.seconds,
      runtime,
      holderId,
      parameters,
    )
    if (!Number.isFinite(seconds) || seconds < 0) {
      collector.report(
        "INVALID_DEFINITION",
        "",
        `Rule "${ruleEffectId}" evaluates to an invalid cooldown duration`,
        { effectId: ruleEffectId, bindingId },
      )
      return undefined
    }
    const availableAt = cooldownAvailability(key)
    if (availableAt !== undefined && event.atSeconds < availableAt) {
      return { key, blocked: true }
    }
    const declared = cooldownDeclarations.get(key)
    if (declared !== undefined && declared !== seconds) {
      collector.report(
        "MODIFICATION_CONFLICT",
        "",
        `Cooldown group "${cooldown.groupId}" declares inconsistent durations for one partition`,
        { effectId: ruleEffectId, bindingId },
      )
      return undefined
    }
    cooldownDeclarations.set(key, seconds)
    return { key, blocked: false }
  }
  for (const entry of preparedInternal.contributions) {
    const activation = entry.rule.activation
    if (activation.kind !== "triggered") {
      continue
    }
    if (!activation.trigger.eventKinds.includes(event.kind)) {
      continue
    }
    if (
      !evaluateTriggerCondition(
        activation.trigger.when,
        runtime,
        entry.holderId,
        entry.foldedParameters,
      )
    ) {
      if (!collector.isEmpty) {
        return failure(collector)
      }
      continue
    }
    const beneficiaries = resolveAdvanceBeneficiaries(
      entry.rule.beneficiary,
      entry.holderId,
      runtime,
    )
    if (beneficiaries === undefined) {
      return failure(collector)
    }
    if (beneficiaries.length === 0) {
      continue
    }
    const stackKey = stackKeyForEvent(
      activation.layering.keys,
      runtime,
      entry.rule.effectId,
    )
    if (stackKey === undefined) {
      return failure(collector)
    }
    let cooldownGroupId: string | undefined
    let cooldownPartitionKey: string | undefined
    let cooldownSeconds: number | undefined
    if (activation.trigger.cooldown !== undefined) {
      const registration = registerCooldown(
        entry.rule.effectId,
        entry.bindingId,
        entry.holderId,
        activation.trigger.cooldown,
        entry.foldedParameters,
      )
      if (registration === undefined) {
        return failure(collector)
      }
      if (registration.blocked) {
        continue
      }
      cooldownGroupId = activation.trigger.cooldown.groupId
      cooldownPartitionKey = registration.key.slice(
        activation.trigger.cooldown.groupId.length + 1,
      )
      cooldownSeconds = cooldownDeclarations.get(registration.key)
    }
    const groups: readonly { readonly beneficiaries: readonly EntityId[] }[] =
      activation.layering.recipientPartition === "individual"
        ? beneficiaries.map((beneficiary) => ({
            beneficiaries: [beneficiary],
          }))
        : [{ beneficiaries: [...beneficiaries].toSorted() }]
    plans.push({
      effectId: entry.rule.effectId,
      bindingId: entry.bindingId,
      cooldownGroupId,
      cooldownPartitionKey,
      cooldownSeconds,
      execute: (): boolean => {
        let anyChange = false
        let candidateSnapshotId: string | undefined
        const ensureSnapshot = (): string | undefined => {
          if (candidateSnapshotId === undefined) {
            candidateSnapshotId = freezeSnapshot(entry, beneficiaries)
          }
          return candidateSnapshotId
        }
        for (const group of groups) {
          if (activation.lifetime.kind === "state-bound") {
            const ownerEntity = resolveTriggerRole(
              activation.lifetime.stateOwner.role,
              "entityId" in activation.lifetime.stateOwner
                ? activation.lifetime.stateOwner.entityId
                : undefined,
              entry.holderId,
              event,
            )
            if (ownerEntity === undefined) {
              collector.report(
                "CONTEXT_MISMATCH",
                "",
                `The state owner for "${entry.rule.effectId}" cannot be resolved`,
                { effectId: entry.rule.effectId, bindingId: entry.bindingId },
              )
              return false
            }
            const stateBindingId = resolveStateBindingId(
              preparedInternal,
              activation.lifetime.stateId,
              entry.holderId,
              collector,
            )
            if (stateBindingId === undefined) {
              return false
            }
            const observation = findStateObservation(
              after,
              activation.lifetime.stateId,
              stateBindingId,
              ownerEntity,
            )
            if (observation === undefined) {
              // 缺记录不是未生效：显式 inactive 才表示状态未生效。
              collector.report(
                "MISSING_FACT",
                "",
                `State "${activation.lifetime.stateId}" is not observed for owner "${ownerEntity}" in the after world`,
                { effectId: entry.rule.effectId, bindingId: entry.bindingId },
              )
              return false
            }
            if (!observation.active) {
              continue
            }
            const stateActivationId = observation.activationId as string
            const lifetimeKeyParts = [
              "state-bound",
              activation.lifetime.stateId,
              ownerEntity,
              stateActivationId,
            ]
            const key = stateBoundGroupKey(
              entry.rule.effectId,
              entry.bindingId,
              group.beneficiaries,
              stackKey,
              activation.lifetime.stateId,
              ownerEntity,
              stateActivationId,
            )
            // 状态绑定组没有时钟；层数上限按完整逻辑组统计，不按单个实例统计。
            const groupInstances = workingInstances
              .concat(newInstances)
              .filter(
                (instance) =>
                  instance.lifetime.kind === "state-bound" &&
                  stateBoundGroupKey(
                    instance.effectId,
                    instance.bindingId,
                    instance.beneficiaryIds,
                    instance.stackKey,
                    instance.lifetime.stateId,
                    instance.lifetime.stateOwnerId,
                    instance.lifetime.stateActivationId,
                  ) === key,
              )
            const groupLayers = groupInstances.flatMap(
              (instance) => instance.layers,
            )
            const maximum = resolveLayerMaximum(entry)
            let replacedLayerId: string | undefined
            let addNewLayer = false
            if (groupLayers.length === 0) {
              addNewLayer = true
            } else if (activation.layering.onRetrigger === "add-layer") {
              if (groupLayers.length < maximum) {
                addNewLayer = true
              } else if (
                activation.layering.atCapacity === "replace-oldest-layer"
              ) {
                replacedLayerId = oldestLayer(groupLayers).layerId
                addNewLayer = true
              }
            }
            if (!addNewLayer) {
              continue
            }
            // 新层接替被替换层的位置：组内已有实例时沿用其身份，空组才新建实例。
            const targetInstance =
              replacedLayerId === undefined
                ? groupInstances.find((instance) =>
                    instance.layers.some(
                      (layer) =>
                        layer.layerId === oldestLayer(groupLayers).layerId,
                    ),
                  )
                : groupInstances.find((instance) =>
                    instance.layers.some(
                      (layer) => layer.layerId === replacedLayerId,
                    ),
                  )
            const snapshotId = ensureSnapshot()
            if (snapshotId === undefined) {
              return false
            }
            const triggerContext = triggerContextForEvent(runtime, snapshotId)
            const newLayer = {
              layerId: layerIdFor(
                stateInternal.sessionId,
                preparedInternal,
                entry.rule.effectId,
                entry.bindingId,
                group.beneficiaries,
                stackKey,
                lifetimeKeyParts,
                event.eventId,
                0,
              ) as LayerId,
              startedAt: event.atSeconds,
              expiresAt: null,
              trigger: triggerContext,
            }
            if (targetInstance !== undefined) {
              const updated: EffectInstance = {
                ...targetInstance,
                layers: [
                  ...targetInstance.layers.filter(
                    (layer) => layer.layerId !== replacedLayerId,
                  ),
                  newLayer,
                ] as unknown as NonEmpty<EffectInstance["layers"][number]>,
              }
              touchedInstances.set(updated.instanceId, updated)
              anyChange = true
              continue
            }
            newInstances.push({
              instanceId: instanceIdFor(
                stateInternal.sessionId,
                preparedInternal,
                entry.rule.effectId,
                entry.bindingId,
                group.beneficiaries,
                stackKey,
                lifetimeKeyParts,
                event.eventId,
              ) as EffectInstance["instanceId"],
              effectId: entry.rule.effectId,
              bindingId: entry.bindingId,
              beneficiaryIds: group.beneficiaries as NonEmpty<EntityId>,
              stackKey,
              lifetime: {
                kind: "state-bound",
                stateId: activation.lifetime.stateId,
                stateOwnerId: ownerEntity,
                stateActivationId:
                  stateActivationId as `state-activation:${string}`,
              },
              layers: [newLayer] as NonEmpty<EffectInstance["layers"][number]>,
            })
            anyChange = true
            continue
          }
          const timing = evaluateActivationTiming(entry, runtime)
          if (timing === undefined) {
            return false
          }
          const key = timedGroupKey(
            entry.rule.effectId,
            entry.bindingId,
            group.beneficiaries,
            stackKey,
          )
          const groupInstances = workingInstances
            .concat(newInstances)
            .filter(
              (instance) =>
                instance.lifetime.kind === "timed" &&
                timedGroupKey(
                  instance.effectId,
                  instance.bindingId,
                  instance.beneficiaryIds,
                  instance.stackKey,
                ) === key,
            )
            .filter((instance) =>
              instance.layers.some((layer) =>
                layerSurvives(layer, event.atSeconds),
              ),
            )
          // 时钟锚点与层归属沿用组内代表实例；层数上限按完整逻辑组统计。
          const existing = groupInstances
            .toSorted((left, right) => {
              const leftAnchor =
                left.lifetime.kind === "timed"
                  ? left.lifetime.firstActivatedAt
                  : 0
              const rightAnchor =
                right.lifetime.kind === "timed"
                  ? right.lifetime.firstActivatedAt
                  : 0
              return leftAnchor !== rightAnchor
                ? leftAnchor - rightAnchor
                : left.instanceId < right.instanceId
                  ? -1
                  : 1
            })
            .at(-1)
          const groupSurvivingLayers = groupInstances.flatMap((instance) =>
            instance.layers.filter((layer) =>
              layerSurvives(layer, event.atSeconds),
            ),
          )
          const maximum = resolveLayerMaximum(entry)
          const onRetrigger = activation.lifetime.onRetrigger
          const refreshExisting = activation.lifetime.refreshExisting
          const clock = activation.lifetime.clock
          const firstActivatedAt =
            existing !== undefined && existing.lifetime.kind === "timed"
              ? existing.lifetime.firstActivatedAt
              : event.atSeconds
          const extendLimit =
            onRetrigger.kind === "extend" ? onRetrigger.limit : undefined
          // 封顶前先判断每一步：溢出后再取 Math.min 仍然是失败。
          const newLayerExpiry = ((): number | undefined => {
            const base = finiteTimeSum(event.atSeconds, timing.duration)
            if (base === undefined) {
              return undefined
            }
            if (extendLimit === undefined || extendLimit.kind === "none") {
              return base
            }
            if (timing.maximum === undefined) {
              return base
            }
            const cap = finiteTimeSum(
              extendLimit.kind === "remaining"
                ? event.atSeconds
                : firstActivatedAt,
              timing.maximum,
            )
            if (cap === undefined) {
              return undefined
            }
            return Math.min(base, cap)
          })()
          if (newLayerExpiry === undefined) {
            collector.report(
              "INVALID_DEFINITION",
              "",
              `Rule "${entry.rule.effectId}" computes a non-finite layer expiry`,
              { effectId: entry.rule.effectId, bindingId: entry.bindingId },
            )
            return false
          }
          if (existing === undefined) {
            const snapshotId = ensureSnapshot()
            if (snapshotId === undefined) {
              return false
            }
            const triggerContext = triggerContextForEvent(runtime, snapshotId)
            newInstances.push({
              instanceId: instanceIdFor(
                stateInternal.sessionId,
                preparedInternal,
                entry.rule.effectId,
                entry.bindingId,
                group.beneficiaries,
                stackKey,
                ["timed"],
                event.eventId,
              ) as EffectInstance["instanceId"],
              effectId: entry.rule.effectId,
              bindingId: entry.bindingId,
              beneficiaryIds: group.beneficiaries as NonEmpty<EntityId>,
              stackKey,
              lifetime: {
                kind: "timed",
                firstActivatedAt: event.atSeconds,
              },
              layers: [
                {
                  layerId: layerIdFor(
                    stateInternal.sessionId,
                    preparedInternal,
                    entry.rule.effectId,
                    entry.bindingId,
                    group.beneficiaries,
                    stackKey,
                    ["timed"],
                    event.eventId,
                    0,
                  ) as LayerId,
                  startedAt: event.atSeconds,
                  expiresAt: newLayerExpiry,
                  trigger: triggerContext,
                },
              ] as NonEmpty<EffectInstance["layers"][number]>,
            })
            anyChange = true
            continue
          }
          // 时钟选择覆盖完整逻辑组的存活层，不局限于某个代表实例。
          const selectedForClock: EffectInstance["layers"][number][] =
            refreshExisting === "all"
              ? [...groupSurvivingLayers]
              : refreshExisting === "newest"
                ? [newestLayer(groupSurvivingLayers)]
                : []
          let replacedLayerId: string | undefined
          let addNewLayer = false
          if (activation.layering.onRetrigger === "add-layer") {
            if (groupSurvivingLayers.length < maximum) {
              addNewLayer = true
            } else if (
              activation.layering.atCapacity === "replace-oldest-layer"
            ) {
              replacedLayerId = oldestLayer(groupSurvivingLayers).layerId
              addNewLayer = true
            }
          }
          // 被替换的层可能属于组内另一实例：新层接替它的位置，不留下空实例。
          const replacedInstance =
            replacedLayerId === undefined
              ? undefined
              : groupInstances.find((instance) =>
                  instance.layers.some(
                    (layer) => layer.layerId === replacedLayerId,
                  ),
                )
          const targetInstance = replacedInstance ?? existing
          let newLayer: EffectInstance["layers"][number] | undefined
          if (addNewLayer) {
            const snapshotId = ensureSnapshot()
            if (snapshotId === undefined) {
              return false
            }
            const triggerContext = triggerContextForEvent(runtime, snapshotId)
            const newLayerExpiresAt =
              clock === "shared"
                ? sharedGroupClock(
                    selectedForClock,
                    onRetrigger,
                    event.atSeconds,
                    timing.duration,
                    timing.maximum,
                    firstActivatedAt,
                    newLayerExpiry,
                  )
                : newLayerExpiry
            const expiresAt = requireFiniteExpiry(
              newLayerExpiresAt,
              runtime,
              entry.rule.effectId,
              entry.bindingId,
            )
            if (expiresAt === undefined) {
              return false
            }
            newLayer = {
              layerId: layerIdFor(
                stateInternal.sessionId,
                preparedInternal,
                entry.rule.effectId,
                entry.bindingId,
                group.beneficiaries,
                stackKey,
                ["timed"],
                event.eventId,
                0,
              ) as LayerId,
              startedAt: event.atSeconds,
              expiresAt,
              trigger: triggerContext,
            }
          }
          // 组内每个实例各自提交：时钟刷新、替换旧层与新增层一起生效。
          for (const instance of groupInstances) {
            const updatedLayers: EffectInstance["layers"][number][] = []
            let changedLayers = false
            for (const layer of instance.layers) {
              if (replacedLayerId === layer.layerId) {
                changedLayers = true
                continue
              }
              if (
                layerSurvives(layer, event.atSeconds) &&
                selectedForClock.includes(layer)
              ) {
                const updatedExpiry = requireFiniteExpiry(
                  applyClockUpdate(
                    onRetrigger,
                    layer.expiresAt,
                    event.atSeconds,
                    timing.duration,
                    timing.maximum,
                    firstActivatedAt,
                  ),
                  runtime,
                  entry.rule.effectId,
                  entry.bindingId,
                )
                if (updatedExpiry === undefined) {
                  return false
                }
                if (updatedExpiry !== layer.expiresAt) {
                  changedLayers = true
                }
                updatedLayers.push({ ...layer, expiresAt: updatedExpiry })
                continue
              }
              updatedLayers.push(layer)
            }
            if (
              newLayer !== undefined &&
              instance.instanceId === targetInstance.instanceId
            ) {
              updatedLayers.push(newLayer)
              changedLayers = true
            }
            if (!changedLayers) {
              continue
            }
            touchedInstances.set(instance.instanceId, {
              ...instance,
              layers: updatedLayers as unknown as NonEmpty<
                EffectInstance["layers"][number]
              >,
            })
            anyChange = true
          }
        }
        return anyChange
      },
    })
  }
  const freezeInstantSnapshot = (entry: {
    readonly rule: InstantRule
    readonly bindingId: BindingId
  }): string => {
    const snapshotId = activationSnapshotId(
      stateInternal.sessionId,
      preparedInternal,
      event.eventId,
      entry.rule.effectId,
      entry.bindingId,
    )
    if (!frozenSnapshots.has(snapshotId)) {
      frozenSnapshots.set(snapshotId, {
        snapshotId: snapshotId as `snapshot:${string}`,
        atSeconds: event.atSeconds,
        attributes: [],
        world: cloneEngineOwned(
          inputObject["before"],
        ) as SavedSnapshot["world"],
      })
    }
    return snapshotId
  }
  for (const entry of preparedInternal.instants) {
    if (!entry.rule.trigger.eventKinds.includes(event.kind)) {
      continue
    }
    if (
      !evaluateTriggerCondition(
        entry.rule.trigger.when,
        runtime,
        entry.holderId,
        entry.resolvedParameters,
      )
    ) {
      if (!collector.isEmpty) {
        return failure(collector)
      }
      continue
    }
    const beneficiaries = resolveAdvanceBeneficiaries(
      entry.rule.beneficiary,
      entry.holderId,
      runtime,
    )
    if (beneficiaries === undefined) {
      return failure(collector)
    }
    if (beneficiaries.length === 0) {
      continue
    }
    let cooldownGroupId: string | undefined
    let cooldownPartitionKey: string | undefined
    let cooldownSeconds: number | undefined
    if (entry.rule.trigger.cooldown !== undefined) {
      const registration = registerCooldown(
        entry.rule.effectId,
        entry.bindingId,
        entry.holderId,
        entry.rule.trigger.cooldown,
        entry.resolvedParameters,
      )
      if (registration === undefined) {
        return failure(collector)
      }
      if (registration.blocked) {
        continue
      }
      cooldownGroupId = entry.rule.trigger.cooldown.groupId
      cooldownPartitionKey = registration.key.slice(
        entry.rule.trigger.cooldown.groupId.length + 1,
      )
      cooldownSeconds = cooldownDeclarations.get(registration.key)
    }
    plans.push({
      effectId: entry.rule.effectId,
      bindingId: entry.bindingId,
      cooldownGroupId,
      cooldownPartitionKey,
      cooldownSeconds,
      execute: (): boolean => {
        const rule = entry.rule
        if (rule.operation.kind === "resource-generation") {
          const amount = evaluateTriggerExpression(
            rule.operation.amount,
            runtime,
            entry.holderId,
            entry.resolvedParameters,
          )
          if (!Number.isFinite(amount) || amount < 0) {
            collector.report(
              "INVALID_DEFINITION",
              "",
              `Rule "${rule.effectId}" evaluates to an invalid energy amount`,
              { effectId: rule.effectId, bindingId: entry.bindingId },
            )
            return false
          }
          for (const beneficiary of beneficiaries) {
            requests.push({
              requestId: requestIdFor(
                stateInternal.sessionId,
                preparedInternal,
                event.eventId,
                rule.effectId,
                entry.bindingId,
                beneficiary,
                0,
              ) as `request:${string}`,
              eventId: event.eventId,
              effectId: rule.effectId,
              bindingId: entry.bindingId,
              beneficiaryId: beneficiary,
              kind: "resource-generation",
              resource: "energy",
              baseAmount: { unit: "energy-points", value: amount },
            })
          }
          return true
        }
        const snapshotId = freezeInstantSnapshot(entry)
        const actions: {
          readonly actionId: ActionId
          readonly count: number
        }[] = []
        for (const action of rule.operation.actions) {
          const count = evaluateTriggerExpression(
            action.count,
            runtime,
            entry.holderId,
            entry.resolvedParameters,
          )
          if (!Number.isInteger(count) || count <= 0) {
            collector.report(
              "INVALID_DEFINITION",
              "",
              `Rule "${rule.effectId}" evaluates to a non-positive action count`,
              { effectId: rule.effectId, bindingId: entry.bindingId },
            )
            return false
          }
          actions.push({ actionId: action.actionId, count })
        }
        for (const beneficiary of beneficiaries) {
          for (const [operationIndex, action] of actions.entries()) {
            requests.push({
              requestId: requestIdFor(
                stateInternal.sessionId,
                preparedInternal,
                event.eventId,
                rule.effectId,
                entry.bindingId,
                beneficiary,
                operationIndex,
              ) as `request:${string}`,
              eventId: event.eventId,
              effectId: rule.effectId,
              bindingId: entry.bindingId,
              beneficiaryId: beneficiary,
              kind: "action-request",
              actionId: action.actionId,
              count: action.count,
              triggerSnapshotId: snapshotId as `snapshot:${string}`,
            })
          }
        }
        return true
      },
    })
  }
  for (const plan of plans) {
    const changed = plan.execute()
    if (!collector.isEmpty) {
      return failure(collector)
    }
    if (
      changed &&
      plan.cooldownGroupId !== undefined &&
      plan.cooldownPartitionKey !== undefined
    ) {
      // 只有确实要提交冷却时才计算结束时间；被阻止或未产生变化的候选不提前求值。
      const availableAt = finiteTimeSum(
        event.atSeconds,
        plan.cooldownSeconds ?? 0,
      )
      if (availableAt === undefined) {
        collector.report(
          "INVALID_DEFINITION",
          "",
          `Cooldown group "${plan.cooldownGroupId}" computes a non-finite availability time`,
          { effectId: plan.effectId, bindingId: plan.bindingId },
        )
        return failure(collector)
      }
      cooldownUpdates.set(
        `${plan.cooldownGroupId} ${plan.cooldownPartitionKey}`,
        {
          groupId: plan.cooldownGroupId,
          partitionKey: plan.cooldownPartitionKey,
          availableAt,
        },
      )
    }
  }
  if (!collector.isEmpty) {
    return failure(collector)
  }
  const mergedInstances: EffectInstance[] = []
  const seenInstanceIds = new Set<string>()
  for (const instance of workingInstances) {
    const next = touchedInstances.get(instance.instanceId) ?? instance
    if (seenInstanceIds.has(next.instanceId)) {
      collector.report(
        "DUPLICATE_ID",
        "",
        `Instance "${next.instanceId}" appears more than once after the transition`,
      )
      return failure(collector)
    }
    seenInstanceIds.add(next.instanceId)
    mergedInstances.push(next)
  }
  for (const instance of newInstances) {
    if (seenInstanceIds.has(instance.instanceId)) {
      collector.report(
        "DUPLICATE_ID",
        "",
        `Instance "${instance.instanceId}" appears more than once after the transition`,
      )
      return failure(collector)
    }
    seenInstanceIds.add(instance.instanceId)
    mergedInstances.push(instance)
  }
  const updatedCooldownKeys = new Set(cooldownUpdates.keys())
  const mergedCooldowns = [
    ...stateInternal.cooldowns.filter(
      (cooldown) =>
        !updatedCooldownKeys.has(
          `${cooldown.groupId} ${cooldown.partitionKey}`,
        ),
    ),
    ...cooldownUpdates.values(),
  ]
  const nextState: EffectStateInternal = {
    prepared: preparedInternal,
    sessionId: stateInternal.sessionId,
    atSeconds: event.atSeconds,
    instances: mergedInstances,
    snapshots: [
      ...stateInternal.snapshots,
      ...observedSnapshots.map((snapshot) => cloneEngineOwned(snapshot)),
      ...frozenSnapshots.values(),
    ],
    cooldowns: mergedCooldowns,
    processedEventIds: [...stateInternal.processedEventIds, event.eventId],
    lastCursor: {
      eventId: event.eventId,
      atSeconds: event.atSeconds,
      sequence: event.sequence,
    },
  }
  const frozenState = freezeState(nextState)
  requests.sort((left, right) =>
    left.requestId < right.requestId
      ? -1
      : left.requestId > right.requestId
        ? 1
        : 0,
  )
  return {
    ok: true,
    value: { state: frozenState, requests },
  }
}
