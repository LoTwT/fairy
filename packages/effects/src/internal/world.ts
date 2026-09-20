import type {
  DirectStat,
  EntityId,
  EntityObservation,
  GeneralStat,
  HitContext,
  SavedSnapshot,
  Stat,
  WorldObservation,
} from "../types.ts"
import { IssueCollector } from "./issues.ts"
import {
  DIRECT_STATS,
  GENERAL_STATS,
  isEntityId,
  isPrefixedIdentity,
  isTeamId,
} from "./vocabulary.ts"
import {
  expectArray,
  expectFiniteNumber,
  expectLiteral,
  expectNonEmptyArray,
  expectNonEmptyString,
  expectObject,
  rejectUnknownFields,
  type FieldChecks,
} from "./checks.ts"

export interface WorldIndex {
  readonly actors: ReadonlyMap<
    EntityId,
    Extract<EntityObservation, { kind: "actor" }>
  >
  readonly summons: ReadonlyMap<
    EntityId,
    Extract<EntityObservation, { kind: "summon" }>
  >
  readonly states: ReadonlyMap<string, WorldObservation["states"][number]>
  readonly distances: ReadonlyMap<string, number>
}

function distanceKey(first: string, second: string): string {
  return first < second ? `${first}\u0000${second}` : `${second}\u0000${first}`
}

export function validateWorldObservation(
  value: unknown,
  collector: IssueCollector,
  pointer: string,
): WorldIndex | undefined {
  const checks: FieldChecks = {
    collector,
    structureCode: "INVALID_INPUT",
    pointer,
  }
  const object = expectObject(value, checks, "world observation")
  if (object === undefined) {
    return undefined
  }
  const entities = expectArray(
    object["entities"],
    { ...checks, pointer: `${pointer}/entities` },
    "world entities",
  )
  const states = expectArray(
    object["states"],
    { ...checks, pointer: `${pointer}/states` },
    "world states",
  )
  const distances = expectArray(
    object["distances"],
    { ...checks, pointer: `${pointer}/distances` },
    "world distances",
  )
  if (
    entities === undefined ||
    states === undefined ||
    distances === undefined
  ) {
    return undefined
  }
  const actors = new Map<
    EntityId,
    Extract<EntityObservation, { kind: "actor" }>
  >()
  const summons = new Map<
    EntityId,
    Extract<EntityObservation, { kind: "summon" }>
  >()
  let entitiesValid = true
  for (const [index, entry] of entities.entries()) {
    const entityPointer = `${pointer}/entities/${index}`
    const entityChecks: FieldChecks = { ...checks, pointer: entityPointer }
    const entity = expectObject(entry, entityChecks, "entity observation")
    if (entity === undefined) {
      entitiesValid = false
      continue
    }
    const kind = expectLiteral(
      entity["kind"],
      ["actor", "summon"],
      entityChecks,
      "entity kind",
    )
    if (kind === undefined) {
      entitiesValid = false
      continue
    }
    const entityId = entity["entityId"]
    if (!isEntityId(entityId)) {
      entityChecks.collector.report(
        "INVALID_INPUT",
        `${entityPointer}/entityId`,
        "entityId must be a non-empty entity: identity",
      )
      entitiesValid = false
      continue
    }
    if (actors.has(entityId) || summons.has(entityId)) {
      entityChecks.collector.report(
        "DUPLICATE_ID",
        `${entityPointer}/entityId`,
        `Entity "${entityId}" is observed more than once`,
      )
      entitiesValid = false
      continue
    }
    const teamId = entity["teamId"]
    if (!isTeamId(teamId)) {
      entityChecks.collector.report(
        "INVALID_INPUT",
        `${entityPointer}/teamId`,
        "teamId must be a non-empty team: identity",
      )
      entitiesValid = false
      continue
    }
    if (kind === "actor") {
      const generalStats = expectObject(
        entity["generalStats"],
        { ...entityChecks, pointer: `${entityPointer}/generalStats` },
        "generalStats",
      )
      const directStats = expectObject(
        entity["directStats"],
        { ...entityChecks, pointer: `${entityPointer}/directStats` },
        "directStats",
      )
      if (generalStats === undefined || directStats === undefined) {
        entitiesValid = false
        continue
      }
      let statsValid = true
      for (const [statName, statInput] of Object.entries(generalStats)) {
        if (!GENERAL_STATS.has(statName as GeneralStat)) {
          entityChecks.collector.report(
            "INVALID_INPUT",
            `${entityPointer}/generalStats/${statName}`,
            `"${statName}" is not a general stat`,
          )
          statsValid = false
          continue
        }
        if (
          !validateGeneralStatInput(
            statInput,
            collector,
            `${entityPointer}/generalStats/${statName}`,
          )
        ) {
          statsValid = false
        }
      }
      for (const [statName, statInput] of Object.entries(directStats)) {
        if (!DIRECT_STATS.has(statName as DirectStat)) {
          entityChecks.collector.report(
            "INVALID_INPUT",
            `${entityPointer}/directStats/${statName}`,
            `"${statName}" is not a direct stat`,
          )
          statsValid = false
          continue
        }
        if (
          !validateDirectStatInput(
            statInput,
            collector,
            `${entityPointer}/directStats/${statName}`,
          )
        ) {
          statsValid = false
        }
      }
      if (!statsValid) {
        entitiesValid = false
        continue
      }
      rejectUnknownFields(
        entity,
        ["kind", "entityId", "teamId", "generalStats", "directStats"],
        entityChecks,
        "actor observation",
      )
      actors.set(entityId, entity as never)
      continue
    }
    const ownerId = entity["ownerId"]
    if (!isEntityId(ownerId)) {
      entityChecks.collector.report(
        "INVALID_INPUT",
        `${entityPointer}/ownerId`,
        "ownerId must be a non-empty entity: identity",
      )
      entitiesValid = false
      continue
    }
    const summonKind = expectNonEmptyString(
      entity["summonKind"],
      { ...entityChecks, pointer: `${entityPointer}/summonKind` },
      "summonKind",
    )
    if (summonKind === undefined) {
      entitiesValid = false
      continue
    }
    if (typeof entity["deployed"] !== "boolean") {
      entityChecks.collector.report(
        "INVALID_INPUT",
        `${entityPointer}/deployed`,
        "deployed must be a boolean",
      )
      entitiesValid = false
      continue
    }
    rejectUnknownFields(
      entity,
      ["kind", "entityId", "teamId", "ownerId", "summonKind", "deployed"],
      entityChecks,
      "summon observation",
    )
    summons.set(entityId, entity as never)
  }
  const stateIndex = new Map<string, WorldObservation["states"][number]>()
  let statesValid = true
  for (const [index, entry] of states.entries()) {
    const statePointer = `${pointer}/states/${index}`
    if (!validateStateObservation(entry, collector, statePointer)) {
      statesValid = false
      continue
    }
    const state = entry as WorldObservation["states"][number]
    const key = `${state.stateId} ${state.bindingId} ${state.ownerId}`
    if (stateIndex.has(key)) {
      collector.report(
        "DUPLICATE_ID",
        statePointer,
        `State observation (${state.stateId}, ${state.bindingId}, ${state.ownerId}) appears more than once`,
      )
      statesValid = false
      continue
    }
    stateIndex.set(key, state)
  }
  const distanceIndex = new Map<string, number>()
  let distancesValid = true
  for (const [index, entry] of distances.entries()) {
    const distancePointer = `${pointer}/distances/${index}`
    const distanceChecks: FieldChecks = { ...checks, pointer: distancePointer }
    const distance = expectObject(entry, distanceChecks, "distance observation")
    if (distance === undefined) {
      distancesValid = false
      continue
    }
    const first = distance["first"]
    const second = distance["second"]
    const meters = distance["meters"]
    if (!isEntityId(first) || !isEntityId(second)) {
      distanceChecks.collector.report(
        "INVALID_INPUT",
        distancePointer,
        "distance entries must reference entity identities",
      )
      distancesValid = false
      continue
    }
    if (first === second) {
      distanceChecks.collector.report(
        "INVALID_INPUT",
        distancePointer,
        "self-distances are not recorded; candidates at the same position use 0 meters",
      )
      distancesValid = false
      continue
    }
    if (typeof meters !== "number" || !Number.isFinite(meters) || meters < 0) {
      distanceChecks.collector.report(
        "INVALID_INPUT",
        `${distancePointer}/meters`,
        "meters must be a non-negative finite number",
      )
      distancesValid = false
      continue
    }
    rejectUnknownFields(
      distance,
      ["first", "second", "meters"],
      distanceChecks,
      "distance observation",
    )
    const key = distanceKey(first, second)
    if (distanceIndex.has(key)) {
      collector.report(
        "DUPLICATE_ID",
        distancePointer,
        `Distance between "${first}" and "${second}" is recorded more than once`,
      )
      distancesValid = false
      continue
    }
    distanceIndex.set(key, meters)
  }
  if (!entitiesValid || !statesValid || !distancesValid) {
    return undefined
  }
  return { actors, summons, states: stateIndex, distances: distanceIndex }
}

function validateGeneralStatInput(
  value: unknown,
  collector: IssueCollector,
  pointer: string,
): boolean {
  const checks: FieldChecks = {
    collector,
    structureCode: "INVALID_INPUT",
    pointer,
  }
  const object = expectObject(value, checks, "general stat input")
  if (object === undefined) {
    return false
  }
  let valid = true
  for (const field of ["baseValue"] as const) {
    if (
      typeof object[field] !== "number" ||
      !Number.isFinite(object[field]) ||
      object[field] < 0
    ) {
      checks.collector.report(
        "INVALID_INPUT",
        `${pointer}/${field}`,
        "baseValue must be a non-negative finite number",
      )
      valid = false
    }
  }
  for (const field of [
    "initialPercentage",
    "initialFixed",
    "finalPercentage",
    "finalFixed",
  ] as const) {
    const array = object[field]
    if (!Array.isArray(array)) {
      checks.collector.report(
        "INVALID_INPUT",
        `${pointer}/${field}`,
        `${field} must be an array`,
      )
      valid = false
      continue
    }
    for (const [index, entry] of array.entries()) {
      if (typeof entry !== "number" || !Number.isFinite(entry)) {
        checks.collector.report(
          "INVALID_INPUT",
          `${pointer}/${field}/${index}`,
          `${field} entries must be finite numbers`,
        )
        valid = false
      }
    }
  }
  rejectUnknownFields(
    object,
    [
      "baseValue",
      "initialPercentage",
      "initialFixed",
      "finalPercentage",
      "finalFixed",
    ],
    checks,
    "general stat input",
  )
  return valid
}

function validateDirectStatInput(
  value: unknown,
  collector: IssueCollector,
  pointer: string,
): boolean {
  const checks: FieldChecks = {
    collector,
    structureCode: "INVALID_INPUT",
    pointer,
  }
  const object = expectObject(value, checks, "direct stat input")
  if (object === undefined) {
    return false
  }
  let valid = true
  if (
    typeof object["baseValue"] !== "number" ||
    !Number.isFinite(object["baseValue"])
  ) {
    checks.collector.report(
      "INVALID_INPUT",
      `${pointer}/baseValue`,
      "baseValue must be a finite number",
    )
    valid = false
  }
  const additions = object["additions"]
  if (!Array.isArray(additions)) {
    checks.collector.report(
      "INVALID_INPUT",
      `${pointer}/additions`,
      "additions must be an array",
    )
    return false
  }
  for (const [index, entry] of additions.entries()) {
    if (typeof entry !== "number" || !Number.isFinite(entry)) {
      checks.collector.report(
        "INVALID_INPUT",
        `${pointer}/additions/${index}`,
        "additions entries must be finite numbers",
      )
      valid = false
    }
  }
  rejectUnknownFields(
    object,
    ["baseValue", "additions"],
    checks,
    "direct stat input",
  )
  return valid
}

export function validateStateObservation(
  value: unknown,
  collector: IssueCollector,
  pointer: string,
): boolean {
  const checks: FieldChecks = {
    collector,
    structureCode: "INVALID_INPUT",
    pointer,
  }
  const object = expectObject(value, checks, "state observation")
  if (object === undefined) {
    return false
  }
  let valid = true
  if (
    !isPrefixedIdentity(object["stateId"]) ||
    !String(object["stateId"]).startsWith("state:")
  ) {
    checks.collector.report(
      "INVALID_INPUT",
      `${pointer}/stateId`,
      "stateId must be a state: identity",
    )
    valid = false
  }
  if (
    !isPrefixedIdentity(object["bindingId"]) ||
    !String(object["bindingId"]).startsWith("binding:")
  ) {
    checks.collector.report(
      "INVALID_INPUT",
      `${pointer}/bindingId`,
      "bindingId must be a binding: identity",
    )
    valid = false
  }
  if (!isEntityId(object["ownerId"])) {
    checks.collector.report(
      "INVALID_INPUT",
      `${pointer}/ownerId`,
      "ownerId must be an entity: identity",
    )
    valid = false
  }
  const active = object["active"]
  if (typeof active !== "boolean") {
    checks.collector.report(
      "INVALID_INPUT",
      `${pointer}/active`,
      "active must be a boolean",
    )
    valid = false
  }
  if (active === true) {
    if (
      !isPrefixedIdentity(object["activationId"]) ||
      !String(object["activationId"]).startsWith("state-activation:")
    ) {
      checks.collector.report(
        "INVALID_INPUT",
        `${pointer}/activationId`,
        "active states must carry a state-activation: identity",
      )
      valid = false
    }
    const since = object["since"]
    if (typeof since !== "number" || !Number.isFinite(since) || since < 0) {
      checks.collector.report(
        "INVALID_INPUT",
        `${pointer}/since`,
        "since must be a non-negative finite number",
      )
      valid = false
    }
  } else {
    if (object["activationId"] !== null || object["since"] !== null) {
      checks.collector.report(
        "INVALID_INPUT",
        pointer,
        "inactive states must carry null activationId and since",
      )
      valid = false
    }
  }
  rejectUnknownFields(
    object,
    ["stateId", "bindingId", "ownerId", "active", "activationId", "since"],
    checks,
    "state observation",
  )
  return valid
}

export interface SnapshotIndexEntry {
  readonly snapshot: SavedSnapshot
}

/** 校验快照结构并按键去重；同 ID 同内容由调用方在合并时判定。 */
export function validateSnapshots(
  value: unknown,
  collector: IssueCollector,
  pointer: string,
): SavedSnapshot[] | undefined {
  const snapshots = expectArray(
    value,
    { collector, structureCode: "INVALID_INPUT", pointer },
    "snapshots",
  )
  if (snapshots === undefined) {
    return undefined
  }
  const validated: SavedSnapshot[] = []
  const seen = new Set<string>()
  let valid = true
  for (const [index, entry] of snapshots.entries()) {
    const snapshotPointer = `${pointer}/${index}`
    const checks: FieldChecks = {
      collector,
      structureCode: "INVALID_INPUT",
      pointer: snapshotPointer,
    }
    const snapshot = expectObject(entry, checks, "saved snapshot")
    if (snapshot === undefined) {
      valid = false
      continue
    }
    const snapshotId = snapshot["snapshotId"]
    if (
      !isPrefixedIdentity(snapshotId) ||
      !String(snapshotId).startsWith("snapshot:")
    ) {
      checks.collector.report(
        "INVALID_INPUT",
        `${snapshotPointer}/snapshotId`,
        "snapshotId must be a snapshot: identity",
      )
      valid = false
      continue
    }
    if (seen.has(snapshotId)) {
      collector.report(
        "DUPLICATE_ID",
        `${snapshotPointer}/snapshotId`,
        `Snapshot "${snapshotId}" appears more than once`,
      )
      valid = false
      continue
    }
    seen.add(snapshotId)
    const atSeconds = snapshot["atSeconds"]
    if (
      typeof atSeconds !== "number" ||
      !Number.isFinite(atSeconds) ||
      atSeconds < 0
    ) {
      checks.collector.report(
        "INVALID_INPUT",
        `${snapshotPointer}/atSeconds`,
        "atSeconds must be a non-negative finite number",
      )
      valid = false
      continue
    }
    const attributes = expectArray(
      snapshot["attributes"],
      { ...checks, pointer: `${snapshotPointer}/attributes` },
      "snapshot attributes",
    )
    if (attributes === undefined) {
      valid = false
      continue
    }
    let attributesValid = true
    const seenAttributes = new Set<string>()
    for (const [attributeIndex, attribute] of attributes.entries()) {
      const attributePointer = `${snapshotPointer}/attributes/${attributeIndex}`
      if (
        !validateAttributeObservation(attribute, collector, attributePointer)
      ) {
        attributesValid = false
        continue
      }
      const record = attribute as {
        entityId: string
        stat: string
        stage: string
      }
      const key = `${record.entityId} ${record.stat} ${record.stage}`
      if (seenAttributes.has(key)) {
        collector.report(
          "DUPLICATE_ID",
          attributePointer,
          `Attribute (${record.entityId}, ${record.stat}, ${record.stage}) appears more than once in the snapshot`,
        )
        attributesValid = false
      }
    }
    if (!attributesValid) {
      valid = false
      continue
    }
    if (
      validateWorldObservation(
        snapshot["world"],
        collector,
        `${snapshotPointer}/world`,
      ) === undefined
    ) {
      valid = false
      continue
    }
    rejectUnknownFields(
      snapshot,
      ["snapshotId", "atSeconds", "attributes", "world"],
      checks,
      "saved snapshot",
    )
    validated.push(entry as SavedSnapshot)
  }
  return valid ? validated : undefined
}

function validateAttributeObservation(
  value: unknown,
  collector: IssueCollector,
  pointer: string,
): boolean {
  const checks: FieldChecks = {
    collector,
    structureCode: "INVALID_INPUT",
    pointer,
  }
  const object = expectObject(value, checks, "attribute observation")
  if (object === undefined) {
    return false
  }
  let valid = true
  if (!isEntityId(object["entityId"])) {
    checks.collector.report(
      "INVALID_INPUT",
      `${pointer}/entityId`,
      "entityId must be an entity: identity",
    )
    valid = false
  }
  const stat = object["stat"]
  if (
    typeof stat !== "string" ||
    !(
      DIRECT_STATS.has(stat as DirectStat) ||
      GENERAL_STATS.has(stat as GeneralStat)
    )
  ) {
    checks.collector.report(
      "INVALID_INPUT",
      `${pointer}/stat`,
      "stat must be a registered stat",
    )
    valid = false
  }
  const stage = object["stage"]
  const direct = DIRECT_STATS.has(stat as DirectStat)
  const stageValid = direct
    ? stage === "current"
    : stage === "initial" || stage === "current"
  if (!stageValid) {
    checks.collector.report(
      "INVALID_INPUT",
      `${pointer}/stage`,
      "attribute stage does not match the stat kind",
    )
    valid = false
  }
  const quantity = expectObject(
    object["value"],
    { ...checks, pointer: `${pointer}/value` },
    "attribute value",
  )
  if (quantity === undefined) {
    return false
  }
  if (
    typeof quantity["value"] !== "number" ||
    !Number.isFinite(quantity["value"])
  ) {
    checks.collector.report(
      "INVALID_INPUT",
      `${pointer}/value/value`,
      "attribute values must be finite numbers",
    )
    valid = false
  }
  rejectUnknownFields(
    quantity,
    ["unit", "value"],
    { ...checks, pointer: `${pointer}/value` },
    "attribute value",
  )
  rejectUnknownFields(
    object,
    ["entityId", "stat", "stage", "value"],
    checks,
    "attribute observation",
  )
  return valid
}

export function validateHitContext(
  value: unknown,
  collector: IssueCollector,
  pointer: string,
): HitContext | undefined {
  const checks: FieldChecks = {
    collector,
    structureCode: "INVALID_INPUT",
    pointer,
  }
  const object = expectObject(value, checks, "hit context")
  if (object === undefined) {
    return undefined
  }
  let valid = true
  const expectIdentity = (field: string, prefix: string): void => {
    const identity = object[field]
    if (
      typeof identity !== "string" ||
      !identity.startsWith(`${prefix}:`) ||
      identity.length <= prefix.length + 1
    ) {
      checks.collector.report(
        "INVALID_INPUT",
        `${pointer}/${field}`,
        `${field} must be a non-empty ${prefix}: identity`,
      )
      valid = false
    }
  }
  expectIdentity("hitId", "hit")
  expectIdentity("actionInstanceId", "action-instance")
  expectIdentity("actionId", "action")
  expectIdentity("actorId", "entity")
  expectIdentity("targetId", "entity")
  expectIdentity("actionSnapshotId", "snapshot")
  const skillCategory = expectLiteral(
    object["skillCategory"],
    [
      "basic",
      "dodge-counter",
      "enhanced-special",
      "special",
      "chain",
      "ultimate",
      "quick-assist",
      "defensive-assist",
      "evasive-assist",
    ],
    checks,
    "skillCategory",
  )
  if (skillCategory === undefined) {
    valid = false
  }
  const origin = expectObject(
    object["origin"],
    { ...checks, pointer: `${pointer}/origin` },
    "hit origin",
  )
  if (origin === undefined) {
    return undefined
  }
  if (origin["kind"] === "direct") {
    rejectUnknownFields(
      origin,
      ["kind"],
      { ...checks, pointer: `${pointer}/origin` },
      "hit origin",
    )
  } else if (origin["kind"] === "effect-request") {
    const originChecks: FieldChecks = {
      ...checks,
      pointer: `${pointer}/origin`,
    }
    const requestId = origin["requestId"]
    if (
      typeof requestId !== "string" ||
      !requestId.startsWith("request:") ||
      requestId.length <= "request:".length
    ) {
      originChecks.collector.report(
        "INVALID_INPUT",
        `${originChecks.pointer}/requestId`,
        "requestId must be a non-empty request: identity",
      )
      valid = false
    }
    if (typeof origin["effectId"] !== "string") {
      valid = false
    }
    if (typeof origin["bindingId"] !== "string") {
      valid = false
    }
    rejectUnknownFields(
      origin,
      ["kind", "requestId", "effectId", "bindingId"],
      originChecks,
      "hit origin",
    )
  } else {
    checks.collector.report(
      "INVALID_INPUT",
      `${pointer}/origin/kind`,
      'origin kind must be "direct" or "effect-request"',
    )
    valid = false
  }
  const damageItems = expectNonEmptyArray(
    object["damageItems"],
    { ...checks, pointer: `${pointer}/damageItems` },
    "damageItems",
  )
  if (damageItems === undefined) {
    return undefined
  }
  const seenItems = new Set<string>()
  for (const [index, item] of damageItems.entries()) {
    const itemPointer = `${pointer}/damageItems/${index}`
    const itemObject = expectObject(
      item,
      { ...checks, pointer: itemPointer },
      "damage item",
    )
    if (itemObject === undefined) {
      valid = false
      continue
    }
    const itemId = itemObject["itemId"]
    if (typeof itemId !== "string" || itemId.length === 0) {
      checks.collector.report(
        "INVALID_INPUT",
        `${itemPointer}/itemId`,
        "itemId must be a non-empty string",
      )
      valid = false
    } else if (seenItems.has(itemId)) {
      collector.report(
        "DUPLICATE_ID",
        `${itemPointer}/itemId`,
        `Damage item "${itemId}" appears more than once`,
      )
      valid = false
    } else {
      seenItems.add(itemId)
    }
    const multiplier = itemObject["damageMultiplier"]
    if (
      typeof multiplier !== "number" ||
      !Number.isFinite(multiplier) ||
      multiplier < 0
    ) {
      checks.collector.report(
        "INVALID_INPUT",
        `${itemPointer}/damageMultiplier`,
        "damageMultiplier must be a non-negative finite number",
      )
      valid = false
    }
    const stat = itemObject["stat"]
    if (typeof stat !== "string" || !GENERAL_STATS.has(stat as GeneralStat)) {
      checks.collector.report(
        "INVALID_INPUT",
        `${itemPointer}/stat`,
        "damage item stat must be a general stat",
      )
      valid = false
    }
    rejectUnknownFields(
      itemObject,
      ["itemId", "damageMultiplier", "stat"],
      { ...checks, pointer: itemPointer },
      "damage item",
    )
  }
  if (!valid) {
    return undefined
  }
  return object as unknown as HitContext
}

export function snapshotAttribute(
  snapshot: SavedSnapshot,
  entityId: EntityId,
  stat: Stat,
  stage: "initial" | "current",
): number | undefined {
  for (const attribute of snapshot.attributes) {
    if (
      attribute.entityId === entityId &&
      attribute.stat === stat &&
      attribute.stage === stage
    ) {
      return attribute.value.value
    }
  }
  return undefined
}

export { distanceKey, expectFiniteNumber }
