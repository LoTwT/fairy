import type {
  BindingId,
  EffectId,
  EffectInstance,
  EffectState,
  EntityId,
  EvaluationInput,
  InstantRule,
  Issue,
  LayerId,
  PreparedEffects,
  RuleSet,
  SavedSnapshot,
  SessionId,
  SourceBinding,
  StateInput,
  SuppliedEffectInstance,
  SuppliedInstancesUpdate,
  TriggerContext,
  Unit,
  WorldObservation,
} from "../types.ts"
import { IssueCollector, failure } from "./issues.ts"
import {
  expectArray,
  expectObject,
  rejectUnknownFields,
  type FieldChecks,
} from "./checks.ts"
import {
  readPreparedInternal,
  type PreparedEffectsInternal,
} from "./prepare.ts"
import {
  validateSnapshots,
  validateWorldObservation,
  type WorldIndex,
} from "./world.ts"
import { isEntityId, isPrefixedIdentity } from "./vocabulary.ts"

/** 引擎内部状态；品牌之外的实施细节，不进入公开类型。 */
export interface EffectStateInternal {
  readonly prepared: PreparedEffectsInternal
  readonly sessionId: SessionId
  readonly atSeconds: number
  readonly instances: readonly EffectInstance[]
  readonly snapshots: readonly SavedSnapshot[]
  readonly cooldowns: readonly {
    readonly groupId: string
    readonly partitionKey: string
    readonly availableAt: number
  }[]
  readonly processedEventIds: readonly string[]
  readonly lastCursor: {
    readonly eventId: string
    readonly atSeconds: number
    readonly sequence: number
  } | null
}

export function readStateInternal(
  state: EffectState,
): EffectStateInternal | undefined {
  const internal = (state as { internal?: unknown }).internal
  if (
    typeof internal !== "object" ||
    internal === null ||
    !("prepared" in internal && "instances" in internal)
  ) {
    return undefined
  }
  return internal as EffectStateInternal
}

function freezeState(internal: EffectStateInternal): EffectState {
  deepFreeze(internal)
  const state = {
    atSeconds: internal.atSeconds,
    sessionId: internal.sessionId,
    internal,
  } as unknown as EffectState
  Object.freeze(state)
  return state
}

function deepFreeze(value: unknown): void {
  if (typeof value !== "object" || value === null) {
    return
  }
  if (Object.isFrozen(value)) {
    return
  }
  Object.freeze(value)
  if (Array.isArray(value)) {
    for (const entry of value) {
      deepFreeze(entry)
    }
    return
  }
  for (const nested of Object.values(value)) {
    deepFreeze(nested)
  }
}

/** 判断规则是否读取触发角色或激活快照；外部层的 trigger:null 仅适用于此类规则。 */
export function ruleRequiresTriggerContext(rule: object): boolean {
  return walkReadsTrigger(rule)
}

function walkReadsTrigger(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((entry) => walkReadsTrigger(entry))
  }
  if (typeof value !== "object" || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  const role = record["role"]
  if (
    role === "triggerActor" ||
    role === "entryActor" ||
    role === "supportActor"
  ) {
    return true
  }
  if (record["at"] === "activation") {
    return true
  }
  return Object.values(record).some((nested) => walkReadsTrigger(nested))
}

interface InstanceValidationContext {
  readonly prepared: PreparedEffectsInternal
  readonly collector: IssueCollector
  readonly pointer: string
  readonly atSeconds: number
  readonly knownSnapshotIds: ReadonlySet<string>
  readonly snapshotsById: ReadonlyMap<string, SavedSnapshot>
  readonly seenInstanceIds: Set<string>
  readonly seenLayerIds: Set<string>
  /** 同步替换场景：范围外保留实例的 ID 集合。 */
  readonly retainedInstanceIds: Set<string>
  readonly retainedInstances: EffectInstance[]
  readonly requireSupplied: boolean
}

function validateEffectInstance(
  value: unknown,
  context: InstanceValidationContext,
  pointer: string,
): EffectInstance | undefined {
  const checks: FieldChecks = {
    collector: context.collector,
    structureCode: "INVALID_INPUT",
    pointer,
  }
  const object = expectObject(value, checks, "effect instance")
  if (object === undefined) {
    return undefined
  }
  const instanceId = object["instanceId"]
  if (
    !isPrefixedIdentity(instanceId) ||
    !String(instanceId).startsWith("instance:")
  ) {
    checks.collector.report(
      "INVALID_INPUT",
      `${pointer}/instanceId`,
      "instanceId must be an instance: identity",
    )
    return undefined
  }
  if (
    context.seenInstanceIds.has(instanceId) ||
    (context.retainedInstanceIds.size > 0 &&
      context.retainedInstanceIds.has(instanceId))
  ) {
    checks.collector.report(
      "DUPLICATE_ID",
      `${pointer}/instanceId`,
      `Instance "${instanceId}" appears more than once in the state`,
    )
    return undefined
  }
  const effectId = object["effectId"]
  const bindingId = object["bindingId"]
  if (typeof effectId !== "string" || typeof bindingId !== "string") {
    checks.collector.report(
      "INVALID_INPUT",
      pointer,
      "Instances must carry effectId and bindingId identities",
    )
    return undefined
  }
  const entry = context.prepared.contributions.find(
    (contribution) =>
      contribution.rule.effectId === effectId &&
      contribution.bindingId === bindingId,
  )
  if (entry === undefined) {
    checks.collector.report(
      "CONTEXT_MISMATCH",
      pointer,
      `Effect "${effectId}" is not an active contribution rule under binding "${bindingId}"`,
      { effectId: effectId as EffectId, bindingId: bindingId as BindingId },
    )
    return undefined
  }
  if (context.requireSupplied && entry.rule.activation.kind !== "supplied") {
    checks.collector.report(
      "INVALID_MODIFICATION",
      pointer,
      `External instance replacement requires a supplied-activation rule, "${effectId}" is ${entry.rule.activation.kind}`,
      { effectId: effectId as EffectId, bindingId: bindingId as BindingId },
    )
    return undefined
  }
  const beneficiaryIds = object["beneficiaryIds"]
  if (
    !Array.isArray(beneficiaryIds) ||
    beneficiaryIds.length === 0 ||
    beneficiaryIds.some((id) => !isEntityId(id)) ||
    new Set(beneficiaryIds).size !== beneficiaryIds.length
  ) {
    checks.collector.report(
      "INVALID_INPUT",
      `${pointer}/beneficiaryIds`,
      "beneficiaryIds must be a non-empty array of unique entity identities",
    )
    return undefined
  }
  const sortedBeneficiaries = [...beneficiaryIds].toSorted()
  const stackKey = object["stackKey"]
  if (
    !Array.isArray(stackKey) ||
    stackKey.some((key) => typeof key !== "string" || key.length === 0)
  ) {
    checks.collector.report(
      "INVALID_INPUT",
      `${pointer}/stackKey`,
      "stackKey must be an array of non-empty strings",
    )
    return undefined
  }
  const activation = entry.rule.activation
  const expectedStackKeyLength =
    activation.kind === "triggered" ? activation.layering.keys.length : 0
  if (stackKey.length !== expectedStackKeyLength) {
    checks.collector.report(
      "INVALID_INPUT",
      `${pointer}/stackKey`,
      `stackKey must have ${expectedStackKeyLength} entries for this rule`,
    )
    return undefined
  }
  const lifetime = object["lifetime"]
  const lifetimeObject =
    typeof lifetime === "object" && lifetime !== null
      ? (lifetime as Record<string, unknown>)
      : undefined
  if (lifetimeObject === undefined) {
    checks.collector.report(
      "INVALID_INPUT",
      `${pointer}/lifetime`,
      "lifetime must be an object",
    )
    return undefined
  }
  const lifetimeKind = lifetimeObject["kind"]
  let lifetimeValid = true
  if (activation.kind === "supplied") {
    if (lifetimeKind !== "supplied") {
      checks.collector.report(
        "CONTEXT_MISMATCH",
        `${pointer}/lifetime`,
        "Supplied-activation rules require supplied lifetimes",
      )
      lifetimeValid = false
    }
  } else if (activation.kind === "triggered") {
    if (activation.lifetime.kind === "timed") {
      if (lifetimeKind !== "timed") {
        checks.collector.report(
          "CONTEXT_MISMATCH",
          `${pointer}/lifetime`,
          "This rule requires a timed lifetime",
        )
        lifetimeValid = false
      } else if (
        typeof lifetimeObject["firstActivatedAt"] !== "number" ||
        !Number.isFinite(lifetimeObject["firstActivatedAt"]) ||
        lifetimeObject["firstActivatedAt"] < 0
      ) {
        checks.collector.report(
          "INVALID_INPUT",
          `${pointer}/lifetime/firstActivatedAt`,
          "firstActivatedAt must be a non-negative finite number",
        )
        lifetimeValid = false
      }
    } else if (activation.lifetime.kind === "state-bound") {
      if (lifetimeKind !== "state-bound") {
        checks.collector.report(
          "CONTEXT_MISMATCH",
          `${pointer}/lifetime`,
          "This rule requires a state-bound lifetime",
        )
        lifetimeValid = false
      } else {
        if (lifetimeObject["stateId"] !== activation.lifetime.stateId) {
          checks.collector.report(
            "CONTEXT_MISMATCH",
            `${pointer}/lifetime/stateId`,
            `This rule binds state "${activation.lifetime.stateId}"`,
          )
          lifetimeValid = false
        }
      }
    }
  }
  if (!lifetimeValid) {
    return undefined
  }
  const layers = object["layers"]
  if (!Array.isArray(layers) || layers.length === 0) {
    checks.collector.report(
      "INVALID_INPUT",
      `${pointer}/layers`,
      "layers must be a non-empty array",
    )
    return undefined
  }
  const validatedLayers: EffectInstance["layers"][number][] = []
  for (const [index, layerValue] of layers.entries()) {
    const layerPointer = `${pointer}/layers/${index}`
    const layerChecks: FieldChecks = { ...checks, pointer: layerPointer }
    const layer = expectObject(layerValue, layerChecks, "effect layer")
    if (layer === undefined) {
      return undefined
    }
    const layerId = layer["layerId"]
    if (!isPrefixedIdentity(layerId) || !String(layerId).startsWith("layer:")) {
      layerChecks.collector.report(
        "INVALID_INPUT",
        `${layerPointer}/layerId`,
        "layerId must be a layer: identity",
      )
      return undefined
    }
    if (context.seenLayerIds.has(layerId)) {
      layerChecks.collector.report(
        "DUPLICATE_ID",
        `${layerPointer}/layerId`,
        `Layer "${layerId}" appears more than once in the state`,
      )
      return undefined
    }
    const startedAt = layer["startedAt"]
    if (
      typeof startedAt !== "number" ||
      !Number.isFinite(startedAt) ||
      startedAt < 0
    ) {
      layerChecks.collector.report(
        "INVALID_INPUT",
        `${layerPointer}/startedAt`,
        "startedAt must be a non-negative finite number",
      )
      return undefined
    }
    if (startedAt > context.atSeconds) {
      layerChecks.collector.report(
        "INVALID_INPUT",
        `${layerPointer}/startedAt`,
        "Layer start times must not be later than the state time",
      )
      return undefined
    }
    const expiresAt = layer["expiresAt"]
    if (lifetimeKind === "timed") {
      if (typeof expiresAt !== "number" || !Number.isFinite(expiresAt)) {
        layerChecks.collector.report(
          "INVALID_INPUT",
          `${layerPointer}/expiresAt`,
          "Timed layers require a numeric expiry",
        )
        return undefined
      }
      if (expiresAt <= startedAt) {
        layerChecks.collector.report(
          "INVALID_INPUT",
          `${layerPointer}/expiresAt`,
          "Actual durations must be strictly positive",
        )
        return undefined
      }
    } else if (lifetimeKind === "state-bound") {
      if (expiresAt !== null) {
        layerChecks.collector.report(
          "INVALID_INPUT",
          `${layerPointer}/expiresAt`,
          "State-bound layers must not carry an expiry",
        )
        return undefined
      }
    } else if (
      expiresAt !== null &&
      (typeof expiresAt !== "number" || !Number.isFinite(expiresAt))
    ) {
      layerChecks.collector.report(
        "INVALID_INPUT",
        `${layerPointer}/expiresAt`,
        "expiresAt must be a finite number or null",
      )
      return undefined
    }
    const trigger = layer["trigger"]
    if (trigger !== null) {
      const triggerObject =
        typeof trigger === "object" && trigger !== null
          ? (trigger as Record<string, unknown>)
          : undefined
      if (triggerObject === undefined) {
        layerChecks.collector.report(
          "INVALID_INPUT",
          `${layerPointer}/trigger`,
          "trigger must be a trigger context or null",
        )
        return undefined
      }
      const eventId = triggerObject["eventId"]
      if (
        !isPrefixedIdentity(eventId) ||
        !String(eventId).startsWith("event:")
      ) {
        layerChecks.collector.report(
          "INVALID_INPUT",
          `${layerPointer}/trigger/eventId`,
          "eventId must be an event: identity",
        )
        return undefined
      }
      if (!isEntityId(triggerObject["actorId"])) {
        layerChecks.collector.report(
          "INVALID_INPUT",
          `${layerPointer}/trigger/actorId`,
          "actorId must be an entity: identity",
        )
        return undefined
      }
      for (const optionalField of ["entryActorId", "supportActorId"]) {
        const optional = triggerObject[optionalField]
        if (optional !== undefined && !isEntityId(optional)) {
          layerChecks.collector.report(
            "INVALID_INPUT",
            `${layerPointer}/trigger/${optionalField}`,
            `${optionalField} must be an entity: identity`,
          )
          return undefined
        }
      }
      const activationSnapshotId = triggerObject["activationSnapshotId"]
      if (
        !isPrefixedIdentity(activationSnapshotId) ||
        !String(activationSnapshotId).startsWith("snapshot:")
      ) {
        layerChecks.collector.report(
          "INVALID_INPUT",
          `${layerPointer}/trigger/activationSnapshotId`,
          "activationSnapshotId must be a snapshot: identity",
        )
        return undefined
      }
      const snapshot = context.snapshotsById.get(activationSnapshotId)
      if (snapshot === undefined) {
        checks.collector.report(
          "MISSING_SNAPSHOT",
          `${layerPointer}/trigger/activationSnapshotId`,
          `Snapshot "${activationSnapshotId}" is not provided`,
        )
        return undefined
      }
      if (snapshot.atSeconds !== startedAt) {
        checks.collector.report(
          "CONTEXT_MISMATCH",
          `${layerPointer}/trigger/activationSnapshotId`,
          "Activation snapshots must be taken at the layer's original trigger time",
        )
        return undefined
      }
    } else if (ruleRequiresTriggerContext(entry.rule as unknown as object)) {
      layerChecks.collector.report(
        "CONTEXT_MISMATCH",
        `${layerPointer}/trigger`,
        `Rule "${effectId}" reads trigger roles or activation snapshots; its layers must carry a trigger context`,
      )
      return undefined
    }
    rejectUnknownFields(
      layer,
      ["layerId", "startedAt", "expiresAt", "trigger"],
      layerChecks,
      "effect layer",
    )
    context.seenLayerIds.add(layerId)
    validatedLayers.push(layer as unknown as EffectInstance["layers"][number])
  }

  const normalized: EffectInstance = {
    ...(object as unknown as EffectInstance),
    beneficiaryIds:
      sortedBeneficiaries as unknown as EffectInstance["beneficiaryIds"],
    layers: validatedLayers as unknown as EffectInstance["layers"],
  }
  context.seenInstanceIds.add(instanceId)
  return normalized
}

function resolveLayerMaximum(entry: {
  readonly rule: EffectInstance extends never ? never : { activation: unknown }
  readonly resolvedParameters: ReadonlyMap<
    string,
    { readonly unit: Unit; readonly value: number }
  >
}): number {
  const activation = entry.rule.activation as {
    kind: string
    layering?: {
      maximum?:
        | { kind: "literal"; value: number }
        | { kind: "parameter"; name: string }
    }
  }
  if (activation.kind !== "triggered") {
    return Number.POSITIVE_INFINITY
  }
  const maximum = activation.layering?.maximum
  if (maximum === undefined) {
    return Number.POSITIVE_INFINITY
  }
  if (maximum.kind === "literal") {
    return maximum.value
  }
  return (
    entry.resolvedParameters.get(maximum.name)?.value ??
    Number.POSITIVE_INFINITY
  )
}

/** 逻辑组键：实例身份 + 生命周期身份；状态两次进入属于不同组。 */
export function lifecycleGroupKey(
  lifetime: EffectInstance["lifetime"],
): string {
  if (lifetime.kind === "state-bound") {
    return `state-bound ${lifetime.stateId} ${lifetime.stateOwnerId} ${lifetime.stateActivationId}`
  }
  return lifetime.kind
}

export function instanceGroupKey(instance: EffectInstance): string {
  return [
    instance.effectId,
    instance.bindingId,
    ...instance.beneficiaryIds,
    ...instance.stackKey,
    lifecycleGroupKey(instance.lifetime),
  ].join(" ")
}

/** 逻辑组层数上限检查：同一完整逻辑组的层总数不得超过声明上限。 */
export function validateGroupLayerCounts(
  prepared: PreparedEffectsInternal,
  instances: readonly EffectInstance[],
  collector: IssueCollector,
): void {
  const counts = new Map<string, number>()
  for (const instance of instances) {
    const key = instanceGroupKey(instance)
    counts.set(key, (counts.get(key) ?? 0) + instance.layers.length)
  }
  for (const instance of instances) {
    const entry = prepared.contributions.find(
      (contribution) =>
        contribution.rule.effectId === instance.effectId &&
        contribution.bindingId === instance.bindingId,
    )
    if (entry === undefined) {
      continue
    }
    if (entry.rule.activation.kind !== "triggered") {
      continue
    }
    const maximum = resolveLayerMaximum(entry)
    const count = counts.get(instanceGroupKey(instance)) ?? 0
    if (count > maximum) {
      collector.report(
        "INVALID_INPUT",
        "",
        `Layer group for "${instance.effectId}" holds ${count} layers, exceeding the declared maximum of ${maximum}`,
      )
    }
  }
}

function validateCooldowns(
  value: unknown,
  collector: IssueCollector,
  pointer: string,
): StateInput["cooldowns"] | undefined {
  const cooldowns = expectArray(
    value,
    { collector, structureCode: "INVALID_INPUT", pointer },
    "cooldowns",
  )
  if (cooldowns === undefined) {
    return undefined
  }
  const validated: {
    readonly groupId: string
    readonly partitionKey: string
    readonly availableAt: number
  }[] = []
  const seen = new Set<string>()
  let valid = true
  for (const [index, entry] of cooldowns.entries()) {
    const entryPointer = `${pointer}/${index}`
    const checks: FieldChecks = {
      collector,
      structureCode: "INVALID_INPUT",
      pointer: entryPointer,
    }
    const cooldown = expectObject(entry, checks, "cooldown record")
    if (cooldown === undefined) {
      valid = false
      continue
    }
    const groupId = cooldown["groupId"]
    if (typeof groupId !== "string" || groupId.length === 0) {
      checks.collector.report(
        "INVALID_INPUT",
        `${entryPointer}/groupId`,
        "groupId must be a non-empty string",
      )
      valid = false
      continue
    }
    const partitionKey = cooldown["partitionKey"]
    if (typeof partitionKey !== "string" || !decodePartitionKey(partitionKey)) {
      checks.collector.report(
        "INVALID_INPUT",
        `${entryPointer}/partitionKey`,
        "partitionKey must encode (partition, identity)",
      )
      valid = false
      continue
    }
    const availableAt = cooldown["availableAt"]
    if (
      typeof availableAt !== "number" ||
      !Number.isFinite(availableAt) ||
      availableAt < 0
    ) {
      checks.collector.report(
        "INVALID_INPUT",
        `${entryPointer}/availableAt`,
        "availableAt must be a non-negative finite number",
      )
      valid = false
      continue
    }
    const key = `${groupId} ${partitionKey}`
    if (seen.has(key)) {
      collector.report(
        "DUPLICATE_ID",
        entryPointer,
        `Cooldown (${groupId}, ${partitionKey}) appears more than once`,
      )
      valid = false
      continue
    }
    seen.add(key)
    rejectUnknownFields(
      cooldown,
      ["groupId", "partitionKey", "availableAt"],
      checks,
      "cooldown record",
    )
    validated.push(entry as StateInput["cooldowns"][number])
  }
  return valid ? validated : undefined
}

/** 稳定元组编码：`长度:内容` 依次连接；解码校验整个字符串可完整还原。 */
export function decodePartitionKey(
  partitionKey: string,
): { partition: string; identity: string } | undefined {
  let index = 0
  const parts: string[] = []
  while (index < partitionKey.length) {
    const colon = partitionKey.indexOf(":", index)
    if (colon < 0) {
      return undefined
    }
    const lengthText = partitionKey.slice(index, colon)
    if (!/^\d+$/u.test(lengthText)) {
      return undefined
    }
    const length = Number(lengthText)
    const start = colon + 1
    const end = start + length
    if (end > partitionKey.length) {
      return undefined
    }
    parts.push(partitionKey.slice(start, end))
    index = end
  }
  if (parts.length < 2) {
    return undefined
  }
  const [partition, ...rest] = parts
  if (partition === undefined) {
    return undefined
  }
  const identity = rest.join("")
  if (identity.length === 0) {
    return undefined
  }
  return { partition, identity }
}

function validateEventHistory(
  value: unknown,
  collector: IssueCollector,
  pointer: string,
  atSeconds: number,
): StateInput["eventHistory"] | undefined {
  const checks: FieldChecks = {
    collector,
    structureCode: "INVALID_INPUT",
    pointer,
  }
  const history = expectObject(value, checks, "event history")
  if (history === undefined) {
    return undefined
  }
  const processedIds = history["processedIds"]
  if (!Array.isArray(processedIds)) {
    checks.collector.report(
      "INVALID_INPUT",
      `${pointer}/processedIds`,
      "processedIds must be an array",
    )
    return undefined
  }
  const seen = new Set<string>()
  let valid = true
  for (const [index, eventId] of processedIds.entries()) {
    if (typeof eventId !== "string" || eventId.length === 0) {
      collector.report(
        "INVALID_INPUT",
        `${pointer}/processedIds/${index}`,
        "processed event IDs must be non-empty strings",
      )
      valid = false
      continue
    }
    if (seen.has(eventId)) {
      collector.report(
        "DUPLICATE_ID",
        `${pointer}/processedIds/${index}`,
        `Event "${eventId}" is recorded more than once`,
      )
      valid = false
      continue
    }
    seen.add(eventId)
  }
  const last = history["last"]
  if (last === null) {
    if (processedIds.length !== 0) {
      collector.report(
        "INVALID_INPUT",
        `${pointer}/last`,
        "A non-empty history must reference its last cursor",
      )
      valid = false
    }
  } else {
    const lastObject =
      typeof last === "object" && last !== null
        ? (last as Record<string, unknown>)
        : undefined
    if (lastObject === undefined) {
      collector.report(
        "INVALID_INPUT",
        `${pointer}/last`,
        "last must be a cursor or null",
      )
      return undefined
    }
    const lastEventId = lastObject["eventId"]
    if (typeof lastEventId !== "string" || !seen.has(lastEventId)) {
      collector.report(
        "INVALID_INPUT",
        `${pointer}/last/eventId`,
        "The last cursor must reference a processed event",
      )
      valid = false
    }
    const lastAt = lastObject["atSeconds"]
    if (typeof lastAt !== "number" || !Number.isFinite(lastAt) || lastAt < 0) {
      collector.report(
        "INVALID_INPUT",
        `${pointer}/last/atSeconds`,
        "last atSeconds must be a non-negative finite number",
      )
      valid = false
    } else if (lastAt > atSeconds) {
      collector.report(
        "EVENT_ORDER",
        `${pointer}/last/atSeconds`,
        "The last cursor must not be later than the state time",
      )
      valid = false
    }
    const lastSequence = lastObject["sequence"]
    if (
      typeof lastSequence !== "number" ||
      !Number.isInteger(lastSequence) ||
      lastSequence < 0 ||
      !Number.isSafeInteger(lastSequence)
    ) {
      collector.report(
        "INVALID_INPUT",
        `${pointer}/last/sequence`,
        "last sequence must be a non-negative safe integer",
      )
      valid = false
    }
  }
  if (!valid) {
    return undefined
  }
  return history as StateInput["eventHistory"]
}

export function supplyEffectState(
  prepared: PreparedEffects,
  input: StateInput,
):
  | { readonly ok: true; readonly value: EffectState }
  | ReturnType<typeof failure> {
  const preparedInternal = readPreparedInternal(prepared)
  const collector = new IssueCollector()
  if (preparedInternal === undefined) {
    collector.report(
      "CONTEXT_MISMATCH",
      "",
      "prepared does not originate from prepareEffects",
    )
    return failure(collector)
  }
  const inputObject = expectObject(
    input,
    { collector, structureCode: "INVALID_INPUT", pointer: "" },
    "state input",
  )
  if (inputObject === undefined) {
    return failure(collector)
  }
  rejectUnknownFields(
    inputObject,
    [
      "sessionId",
      "atSeconds",
      "instances",
      "snapshots",
      "cooldowns",
      "eventHistory",
    ],
    { collector, structureCode: "INVALID_INPUT", pointer: "" },
    "state input",
  )
  const sessionId = inputObject["sessionId"]
  if (
    typeof sessionId !== "string" ||
    !sessionId.startsWith("session:") ||
    sessionId.length <= "session:".length
  ) {
    collector.report(
      "INVALID_INPUT",
      "/sessionId",
      "sessionId must be a session: identity",
    )
    return failure(collector)
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
  const snapshots = validateSnapshots(
    inputObject["snapshots"],
    collector,
    "/snapshots",
  )
  if (snapshots === undefined) {
    return failure(collector)
  }
  const snapshotsById = new Map(
    snapshots.map((snapshot) => [snapshot.snapshotId, snapshot]),
  )
  const instancesArray = expectArray(
    inputObject["instances"],
    { collector, structureCode: "INVALID_INPUT", pointer: "/instances" },
    "instances",
  )
  if (instancesArray === undefined) {
    return failure(collector)
  }
  const context: InstanceValidationContext = {
    prepared: preparedInternal,
    collector,
    pointer: "/instances",
    atSeconds,
    knownSnapshotIds: new Set(snapshotsById.keys()),
    snapshotsById,
    seenInstanceIds: new Set<string>(),
    seenLayerIds: new Set<string>(),
    retainedInstanceIds: new Set<string>(),
    retainedInstances: [],
    requireSupplied: false,
  }
  const instances: EffectInstance[] = []
  for (const [index, entry] of instancesArray.entries()) {
    const instance = validateEffectInstance(
      entry,
      context,
      `/instances/${index}`,
    )
    if (instance === undefined) {
      continue
    }
    instances.push(instance)
  }
  const cooldowns = validateCooldowns(
    inputObject["cooldowns"],
    collector,
    "/cooldowns",
  )
  const eventHistory = validateEventHistory(
    inputObject["eventHistory"],
    collector,
    "/eventHistory",
    atSeconds,
  )
  if (cooldowns === undefined || eventHistory === undefined) {
    return failure(collector)
  }
  validateGroupLayerCounts(preparedInternal, instances, collector)
  if (!collector.isEmpty) {
    return failure(collector)
  }
  const internal: EffectStateInternal = {
    prepared: preparedInternal,
    sessionId: sessionId as SessionId,
    atSeconds,
    instances,
    snapshots,
    cooldowns,
    processedEventIds: eventHistory.processedIds,
    lastCursor: eventHistory.last,
  }
  return { ok: true, value: freezeState(internal) }
}

export function synchronizeSuppliedInstances(
  prepared: PreparedEffects,
  previous: EffectState,
  input: SuppliedInstancesUpdate,
):
  | { readonly ok: true; readonly value: EffectState }
  | ReturnType<typeof failure> {
  const preparedInternal = readPreparedInternal(prepared)
  const previousInternal = readStateInternal(previous)
  const collector = new IssueCollector()
  if (preparedInternal === undefined || previousInternal === undefined) {
    collector.report(
      "CONTEXT_MISMATCH",
      "",
      "prepared or previous state does not originate from this engine",
    )
    return failure(collector)
  }
  if (previousInternal.prepared !== preparedInternal) {
    collector.report(
      "CONTEXT_MISMATCH",
      "",
      "previous state belongs to a different preparation result",
    )
    return failure(collector)
  }
  const inputObject = expectObject(
    input,
    { collector, structureCode: "INVALID_INPUT", pointer: "" },
    "supplied instances update",
  )
  if (inputObject === undefined) {
    return failure(collector)
  }
  rejectUnknownFields(
    inputObject,
    [
      "eventId",
      "atSeconds",
      "sequence",
      "replacements",
      "world",
      "observedSnapshots",
    ],
    { collector, structureCode: "INVALID_INPUT", pointer: "" },
    "supplied instances update",
  )
  const eventId = inputObject["eventId"]
  if (
    typeof eventId !== "string" ||
    !eventId.startsWith("event:") ||
    eventId.length <= "event:".length
  ) {
    collector.report(
      "INVALID_INPUT",
      "/eventId",
      "eventId must be an event: identity",
    )
    return failure(collector)
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
  const sequence = inputObject["sequence"]
  if (
    typeof sequence !== "number" ||
    !Number.isInteger(sequence) ||
    sequence < 0 ||
    !Number.isSafeInteger(sequence)
  ) {
    collector.report(
      "INVALID_INPUT",
      "/sequence",
      "sequence must be a non-negative safe integer",
    )
    return failure(collector)
  }
  if (atSeconds < previousInternal.atSeconds) {
    collector.report(
      "EVENT_ORDER",
      "/atSeconds",
      "Synchronization cannot move state time backwards",
    )
    return failure(collector)
  }
  if (previousInternal.processedEventIds.includes(eventId)) {
    collector.report(
      "EVENT_ORDER",
      "/eventId",
      `Event "${eventId}" was already processed`,
    )
    return failure(collector)
  }
  const previousCursor = previousInternal.lastCursor
  if (previousCursor !== null) {
    const previousOrder =
      previousCursor.atSeconds * Number.MAX_SAFE_INTEGER +
      previousCursor.sequence
    const nextOrder = atSeconds * Number.MAX_SAFE_INTEGER + sequence
    if (nextOrder <= previousOrder) {
      collector.report(
        "EVENT_ORDER",
        "",
        "Synchronization cursor must strictly advance",
      )
      return failure(collector)
    }
  }
  const replacements = expectNonEmptyArrayField(inputObject["replacements"])
  if (replacements === undefined) {
    collector.report(
      "INVALID_INPUT",
      "/replacements",
      "replacements must be a non-empty array",
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
  const replacedScopes = new Set<string>()
  const seenSnapshotIds = new Set<string>()
  const mergedSnapshots = [...previousInternal.snapshots]
  const mergedSnapshotIndex = new Map(
    mergedSnapshots.map((snapshot) => [snapshot.snapshotId, snapshot]),
  )
  for (const snapshot of observedSnapshots) {
    const existing = mergedSnapshotIndex.get(snapshot.snapshotId)
    if (existing === undefined) {
      mergedSnapshots.push(snapshot)
      mergedSnapshotIndex.set(snapshot.snapshotId, snapshot)
      continue
    }
    if (!snapshotsEqual(existing, snapshot)) {
      collector.report(
        "CONTEXT_MISMATCH",
        `/observedSnapshots`,
        `Snapshot "${snapshot.snapshotId}" conflicts with the recorded snapshot of the same ID`,
      )
      return failure(collector)
    }
  }
  const context: InstanceValidationContext = {
    prepared: preparedInternal,
    collector,
    pointer: "/replacements",
    atSeconds,
    knownSnapshotIds: seenSnapshotIds,
    snapshotsById: mergedSnapshotIndex,
    seenInstanceIds: new Set<string>(),
    seenLayerIds: new Set<string>(),
    retainedInstanceIds: new Set<string>(),
    retainedInstances: [],
    requireSupplied: true,
  }
  const replacedInstancesByScope = new Map<string, EffectInstance[]>()
  for (const [index, entry] of (replacements as unknown[]).entries()) {
    const pointer = `/replacements/${index}`
    const checks: FieldChecks = {
      collector,
      structureCode: "INVALID_INPUT",
      pointer,
    }
    const replacement = expectObject(entry, checks, "replacement scope")
    if (replacement === undefined) {
      continue
    }
    const effectId = replacement["effectId"]
    const bindingId = replacement["bindingId"]
    if (typeof effectId !== "string" || typeof bindingId !== "string") {
      checks.collector.report(
        "INVALID_INPUT",
        pointer,
        "Replacement scopes must carry effectId and bindingId",
      )
      continue
    }
    const scopeKey = `${effectId} ${bindingId}`
    if (replacedScopes.has(scopeKey)) {
      collector.report(
        "INVALID_INPUT",
        pointer,
        `Replacement scope (${effectId}, ${bindingId}) is specified more than once`,
      )
      continue
    }
    replacedScopes.add(scopeKey)
    const scopeEntry = preparedInternal.contributions.find(
      (contribution) =>
        contribution.rule.effectId === effectId &&
        contribution.bindingId === bindingId,
    )
    if (scopeEntry === undefined) {
      collector.report(
        "CONTEXT_MISMATCH",
        pointer,
        `Effect "${effectId}" is not an active contribution rule under binding "${bindingId}"`,
      )
      continue
    }
    if (scopeEntry.rule.activation.kind !== "supplied") {
      collector.report(
        "INVALID_MODIFICATION",
        pointer,
        `External instance replacement requires a supplied-activation rule, "${effectId}" is ${scopeEntry.rule.activation.kind}`,
      )
      continue
    }
    const instanceList = replacement["instances"]
    if (!Array.isArray(instanceList)) {
      checks.collector.report(
        "INVALID_INPUT",
        `${pointer}/instances`,
        "instances must be an array",
      )
      continue
    }
    const validated: EffectInstance[] = []
    for (const [instanceIndex, instanceValue] of instanceList.entries()) {
      const instance = validateEffectInstance(
        instanceValue,
        context,
        `${pointer}/instances/${instanceIndex}`,
      )
      if (instance === undefined) {
        continue
      }
      if (instance.effectId !== effectId || instance.bindingId !== bindingId) {
        collector.report(
          "CONTEXT_MISMATCH",
          `${pointer}/instances/${instanceIndex}`,
          "Instances must match their replacement scope",
        )
        continue
      }
      validated.push(instance)
    }
    replacedInstancesByScope.set(scopeKey, validated)
  }

  // 保留集合 = 替换范围之外的旧实例；被替换范围内的 ID 允许由新实例复用（续期）。
  for (const instance of previousInternal.instances) {
    if (replacedScopes.has(`${instance.effectId} ${instance.bindingId}`)) {
      continue
    }
    context.retainedInstanceIds.add(instance.instanceId)
    for (const layer of instance.layers) {
      context.seenLayerIds.add(layer.layerId)
    }
  }
  context.retainedInstances.push(
    ...previousInternal.instances.filter(
      (instance) =>
        !replacedScopes.has(`${instance.effectId} ${instance.bindingId}`),
    ),
  )

  // 保留实例的约束：替换范围之外的实例原样保留；同范围复用 ID 的实例只允许续期。
  for (const [scopeKey, instances] of replacedInstancesByScope) {
    const [effectId, bindingId] = scopeKey.split(" ")
    const previousScopeInstances = previousInternal.instances.filter(
      (instance) =>
        instance.effectId === effectId && instance.bindingId === bindingId,
    )
    const previousById = new Map(
      previousScopeInstances.map((instance) => [instance.instanceId, instance]),
    )
    for (const instance of instances) {
      const previousInstance = previousById.get(instance.instanceId)
      if (previousInstance === undefined) {
        continue
      }
      if (
        !arraysEqual(
          previousInstance.beneficiaryIds,
          instance.beneficiaryIds,
        ) ||
        !arraysEqual(previousInstance.stackKey, instance.stackKey) ||
        !lifetimesEqual(previousInstance.lifetime, instance.lifetime)
      ) {
        collector.report(
          "CONTEXT_MISMATCH",
          "",
          `Retained instance "${instance.instanceId}" must keep its beneficiaries, stack key, and lifetime identity`,
        )
        continue
      }
      const previousLayers = new Map(
        previousInstance.layers.map((layer) => [layer.layerId, layer]),
      )
      for (const layer of instance.layers) {
        const previousLayer = previousLayers.get(layer.layerId)
        if (previousLayer === undefined) {
          continue
        }
        if (
          previousLayer.startedAt !== layer.startedAt ||
          !triggersEqual(previousLayer.trigger, layer.trigger)
        ) {
          collector.report(
            "CONTEXT_MISMATCH",
            "",
            `Retained layer "${layer.layerId}" must keep its start time and trigger context; re-activation requires a new layer ID`,
          )
        }
      }
    }
  }
  if (!collector.isEmpty) {
    return failure(collector)
  }

  const retainedInstances = previousInternal.instances.filter(
    (instance) =>
      !replacedScopes.has(`${instance.effectId} ${instance.bindingId}`),
  )
  const nextInstances = [...retainedInstances]
  for (const instances of replacedInstancesByScope.values()) {
    nextInstances.push(...instances)
  }
  // 同步范围的目标合法性按 world 校验；保留实例沿用导入时的判定。
  for (const instances of replacedInstancesByScope.values()) {
    for (const instance of instances) {
      validateTargetSetForWorld(preparedInternal, world, instance, collector)
    }
  }
  validateGroupLayerCounts(preparedInternal, nextInstances, collector)
  if (!collector.isEmpty) {
    return failure(collector)
  }
  const internal: EffectStateInternal = {
    prepared: preparedInternal,
    sessionId: previousInternal.sessionId,
    atSeconds,
    instances: nextInstances,
    snapshots: mergedSnapshots,
    cooldowns: previousInternal.cooldowns,
    processedEventIds: [...previousInternal.processedEventIds, eventId],
    lastCursor: { eventId, atSeconds, sequence },
  }
  return { ok: true, value: freezeState(internal) }
}

function expectNonEmptyArrayField(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined
}

/** 按选择器、持有者、触发上下文与世界解析期望受益集合；同步时校验替换实例。 */
function validateTargetSetForWorld(
  prepared: PreparedEffectsInternal,
  world: WorldIndex,
  instance: EffectInstance,
  collector: IssueCollector,
): void {
  const entry = prepared.contributions.find(
    (contribution) =>
      contribution.rule.effectId === instance.effectId &&
      contribution.bindingId === instance.bindingId,
  )
  if (entry === undefined) {
    return
  }
  const holder = world.actors.get(entry.holderId)
  if (holder === undefined) {
    collector.report(
      "MISSING_FACT",
      "",
      `Holder "${entry.holderId}" is not an observed actor in the synchronization world`,
    )
    return
  }
  const rule = entry.rule as { beneficiary: { kind: string } }
  const holderId = entry.holderId
  let expected: readonly string[]
  switch (rule.beneficiary.kind) {
    case "holder":
      expected = [holderId]
      break
    case "team":
    case "team-except-holder": {
      const team = [...world.actors.values()]
        .filter((actor) => actor.teamId === holder.teamId)
        .map((actor) => actor.entityId)
        .toSorted()
      expected =
        rule.beneficiary.kind === "team"
          ? team
          : team.filter((id) => id !== holderId)
      break
    }
    case "holder-and-trigger-actor": {
      let derived: readonly string[] | undefined
      for (const layer of instance.layers) {
        if (layer.trigger === null) {
          continue
        }
        const triggerActor = layer.trigger.actorId
        const triggerActorObservation = world.actors.get(triggerActor)
        if (
          triggerActorObservation === undefined ||
          triggerActorObservation.teamId !== holder.teamId
        ) {
          collector.report(
            "CONTEXT_MISMATCH",
            "",
            `Trigger actor "${triggerActor}" must belong to the holder's team`,
          )
          return
        }
        const layerExpected = [...new Set([holderId, triggerActor])].toSorted()
        if (derived === undefined) {
          derived = layerExpected
          continue
        }
        if (
          derived.length !== layerExpected.length ||
          derived.some((id, index) => id !== layerExpected[index])
        ) {
          collector.report(
            "CONTEXT_MISMATCH",
            "",
            `Instance "${instance.instanceId}" carries layers with different trigger actors, which cannot share one beneficiary set`,
          )
          return
        }
      }
      expected = derived ?? [holderId]
      break
    }
    default:
      return
  }
  const actual = [...instance.beneficiaryIds]
  if (
    actual.length !== expected.length ||
    actual.some((id, index) => id !== expected[index])
  ) {
    collector.report(
      "CONTEXT_MISMATCH",
      "",
      `Instance "${instance.instanceId}" beneficiaries do not match the rule's target selector`,
    )
  }
}

function arraysEqual(
  left: readonly unknown[],
  right: readonly unknown[],
): boolean {
  return (
    left.length === right.length &&
    left.every((entry, index) => entry === right[index])
  )
}

function lifetimesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(sortKeys(left)) === JSON.stringify(sortKeys(right))
}

function triggersEqual(
  left: TriggerContext | null,
  right: TriggerContext | null,
): boolean {
  return JSON.stringify(sortKeys(left)) === JSON.stringify(sortKeys(right))
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortKeys(entry))
  }
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value)
      .map(([key, nested]) => [key, sortKeys(nested)] as const)
      .toSorted((left, right) => (left[0] < right[0] ? -1 : 1))
    return Object.fromEntries(entries)
  }
  return value
}

function snapshotsEqual(left: SavedSnapshot, right: SavedSnapshot): boolean {
  return JSON.stringify(sortKeys(left)) === JSON.stringify(sortKeys(right))
}

export type {
  EffectInstance,
  InstantRule,
  Issue,
  RuleSet,
  SourceBinding,
  SuppliedEffectInstance,
  WorldObservation,
  EvaluationInput,
  EntityId,
  LayerId,
}
export type { WorldIndex }
