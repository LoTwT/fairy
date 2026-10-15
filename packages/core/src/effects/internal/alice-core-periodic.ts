import { validateCatalogActorSourceFields } from "./catalog-actor-source.ts"
import { parseEffectRuleSet } from "../parse-effect-rule-set.ts"
import type {
  AliceCorePeriodicDamageResult,
  AliceCorePeriodicEvent,
  AliceCorePeriodicRule,
  EffectRule,
  OriginalPhysicalAnomalyFact,
  Result,
  RuleSet,
  SourceBinding,
  StaticCatalogVariant,
  StaticEffectCatalog,
} from "../types.ts"
import { expectArray, expectObject, rejectUnknownFields } from "./checks.ts"
import { IssueCollector, failure } from "./issues.ts"
import {
  configurationView,
  evaluateConfigurationCondition,
  resolveParameters,
} from "./prepare.ts"
import { validateSourceBindings } from "./rule.ts"
import { validateStaticCatalog } from "./static-catalog.ts"
import { isIdentityString } from "./vocabulary.ts"
import { validateSnapshots, validateWorldObservation } from "./world.ts"

export const ALICE_CORE_PERIODIC_MECHANISM =
  "alice-core-periodic-damage" as const

export function isAliceCorePeriodicRule(
  rule: EffectRule,
): rule is AliceCorePeriodicRule {
  return (
    rule.kind === "contribution" &&
    rule.operation.kind === ALICE_CORE_PERIODIC_MECHANISM
  )
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .toSorted(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`
  return JSON.stringify(value)
}

/** 普通目录形状校验成功后，检查具名机制的双向身份闭合。 */
export function validateAliceCorePeriodicCatalog(
  catalog: StaticEffectCatalog,
  definitions: RuleSet,
  collector: IssueCollector,
): void {
  const rules = definitions.effects.filter(isAliceCorePeriodicRule)
  const mechanisms = (catalog.mechanisms ?? []).filter(
    (m) => m.mechanism === ALICE_CORE_PERIODIC_MECHANISM,
  )
  if (!rules.length && !mechanisms.length) return
  if (mechanisms.length !== 1 || rules.length !== 1) {
    collector.report(
      mechanisms.length > 1 ? "DUPLICATE_ID" : "INVALID_DEFINITION",
      "/catalog/mechanisms",
      "The Alice periodic rule requires exactly one corresponding mechanism",
    )
    return
  }
  const mechanism = mechanisms[0]!,
    rule = rules[0]!
  const pointer = `/catalog/mechanisms/${catalog.mechanisms!.indexOf(mechanism)}`
  const checks = {
    collector,
    structureCode: "INVALID_DEFINITION" as const,
    pointer,
  }
  rejectUnknownFields(
    mechanism as unknown as Record<string, unknown>,
    ["mechanism", "agentEntityId", "optionId", "effectId", "references"],
    checks,
    "Alice periodic mechanism",
  )
  const option = catalog.options.find((o) => o.optionId === mechanism.optionId)
  if (
    !option &&
    typeof mechanism.optionId === "string" &&
    mechanism.optionId.length
  )
    collector.report(
      "MISSING_REFERENCE",
      `${pointer}/optionId`,
      "Unknown periodic catalog option",
    )
  if (
    typeof mechanism.effectId === "string" &&
    !definitions.effects.some((e) => e.effectId === mechanism.effectId)
  )
    collector.report(
      "MISSING_REFERENCE",
      `${pointer}/effectId`,
      "Unknown periodic effect",
    )
  const entity = catalog.entities.find(
    (e) => e.catalogEntityId === option?.catalogEntityId,
  )
  const variant = option?.variants[0]
  const referringOptions = catalog.options.filter((o) =>
    o.variants.some((v) => v.effectIds.includes(rule.effectId)),
  )
  if (
    mechanism.agentEntityId !== "1401" ||
    mechanism.effectId !== rule.effectId ||
    !option ||
    entity?.identity?.kind !== "agent" ||
    entity.identity.entityId !== "1401" ||
    entity.status !== "mapped" ||
    option.target !== "self" ||
    option.exclusiveGroup !== undefined ||
    referringOptions.length !== 1 ||
    referringOptions[0] !== option ||
    option.variants.length !== 1 ||
    !variant ||
    (variant.target ?? option.target) !== "self" ||
    variant.effectIds.length !== 1 ||
    variant.effectIds[0] !== rule.effectId ||
    variant.maximumLayers !== 1 ||
    variant.status === "unsupported" ||
    variant.inputs.length !== 0 ||
    Object.keys(variant.applicability).length !== 0 ||
    variant.configuration.minimumMindscape !== 0 ||
    canonical([...(variant.configuration.coreSkillLevels ?? [])].toSorted()) !==
      canonical([1, 2, 3, 4, 5, 6, 7]) ||
    Object.keys(variant.configuration).length !== 2 ||
    variant.damageItemRequirements !== undefined ||
    variant.parameterMapping !== undefined ||
    variant.exclusiveDamageItem !== undefined ||
    variant.layerCountInputName !== undefined ||
    variant.declaredTeammateBeneficiary !== undefined ||
    variant.squadUniqueEffect !== undefined
  ) {
    collector.report(
      "INVALID_DEFINITION",
      pointer,
      "Alice periodic metadata, option, source, configuration and sole ratio rule must correspond in both directions",
    )
  }
  const references = expectArray(
    mechanism.references,
    { ...checks, pointer: `${pointer}/references` },
    "mechanism references",
  )
  if (!references) return
  const expected = rule.source.references.map(canonical).toSorted()
  const actual = references.map(canonical).toSorted()
  if (new Set(actual).size !== actual.length)
    collector.report(
      "DUPLICATE_ID",
      `${pointer}/references`,
      "Duplicate periodic source references",
    )
  if (
    !actual.length ||
    canonical(actual) !== canonical(expected) ||
    canonical(variant?.references.map(canonical).toSorted()) !==
      canonical(expected)
  )
    collector.report(
      "INVALID_DEFINITION",
      `${pointer}/references`,
      "Periodic mechanism, option and rule must retain the same complete source references",
    )
}

function matchesConfiguration(
  variant: StaticCatalogVariant,
  binding: SourceBinding,
): boolean {
  const c = configurationView(binding),
    required = variant.configuration
  return (
    (required.minimumMindscape === undefined ||
      (c.mindscapeRank !== undefined &&
        c.mindscapeRank >= required.minimumMindscape)) &&
    (required.minimumSetPieces === undefined ||
      (c.setPieces !== undefined &&
        c.setPieces >= required.minimumSetPieces)) &&
    (
      [
        ["coreSkillLevels", "coreSkillLevel"],
        ["refinements", "refinement"],
        ["potentialLevels", "potentialLevel"],
        ["specialSkillLevels", "specialSkillLevel"],
      ] as const
    ).every(
      ([list, key]) =>
        required[list] === undefined ||
        (c[key] !== undefined &&
          (required[list] as readonly number[]).includes(c[key]!)),
    )
  )
}

export function calculateAliceCorePeriodicDamage(
  input: unknown,
  fromCatalog: boolean,
): Result<AliceCorePeriodicDamageResult> {
  const collector = new IssueCollector()
  const checks = (pointer: string) => ({
    collector,
    pointer,
    structureCode: "INVALID_INPUT" as const,
  })
  const object = expectObject(input, checks(""), "Alice periodic input")
  if (!object) return failure(collector)
  rejectUnknownFields(
    object,
    [
      "mechanism",
      "definitions",
      "bindings",
      "selections",
      "world",
      "snapshots",
      "atSeconds",
      "event",
      "originalAnomalies",
      ...(fromCatalog ? ["catalog", "actorSources"] : []),
    ],
    checks(""),
    "Alice periodic input",
  )
  if (object.mechanism !== ALICE_CORE_PERIODIC_MECHANISM)
    collector.report(
      "INVALID_INPUT",
      "/mechanism",
      "Unknown named settlement mechanism",
    )
  const parsed = parseEffectRuleSet(object.definitions)
  if (!parsed.ok) return parsed
  const definitions = parsed.value
  let catalog: StaticEffectCatalog | undefined
  if (fromCatalog) {
    const validated = validateStaticCatalog(object.catalog, definitions)
    if (!validated.ok) return validated
    catalog = validated.value
  }
  const rules = definitions.effects.filter(isAliceCorePeriodicRule)
  if (rules.length !== 1)
    collector.report(
      "MISSING_REFERENCE",
      "/definitions",
      "The single Alice periodic ratio rule is required",
    )
  const rule = rules[0]
  const bindings = validateSourceBindings(object.bindings, collector)
  const world = validateWorldObservation(object.world, collector, "/world")
  const snapshots = validateSnapshots(object.snapshots, collector, "/snapshots")
  const selections = expectArray(
    object.selections,
    checks("/selections"),
    "selections",
  )
  const facts = expectArray(
    object.originalAnomalies,
    checks("/originalAnomalies"),
    "original anomaly facts",
  )
  const event = expectObject(object.event, checks("/event"), "periodic event")
  if (
    typeof object.atSeconds !== "number" ||
    !Number.isFinite(object.atSeconds) ||
    object.atSeconds < 0
  )
    collector.report(
      "INVALID_INPUT",
      "/atSeconds",
      "A finite non-negative event time is required",
    )
  const identity = (value: unknown, prefix: string, pointer: string) => {
    if (!isIdentityString(value, prefix))
      collector.report(
        "INVALID_INPUT",
        pointer,
        `Expected a ${prefix}: identity`,
      )
  }
  if (event) {
    rejectUnknownFields(
      event,
      [
        "eventId",
        "actorId",
        "targetId",
        "sourceBindingId",
        "originalAnomalyEventId",
        "originalAnomalySnapshotId",
        "originalAnomalyActive",
      ],
      checks("/event"),
      "periodic event",
    )
    for (const [key, prefix] of [
      ["eventId", "event"],
      ["actorId", "entity"],
      ["targetId", "entity"],
      ["sourceBindingId", "binding"],
      ["originalAnomalyEventId", "event"],
      ["originalAnomalySnapshotId", "snapshot"],
    ] as const)
      identity(event[key], prefix, `/event/${key}`)
    if (event.originalAnomalyActive !== true)
      collector.report(
        "INVALID_INPUT",
        "/event/originalAnomalyActive",
        "The caller must explicitly declare the original anomaly active",
      )
    if (event.eventId === event.originalAnomalyEventId)
      collector.report(
        "CONTEXT_MISMATCH",
        "/event/eventId",
        "The periodic event is distinct from its original anomaly event",
      )
  }
  const factIds = new Set<string>()
  for (const [index, factValue] of (facts ?? []).entries()) {
    const p = `/originalAnomalies/${index}`,
      fact = expectObject(factValue, checks(p), "original anomaly fact")
    if (!fact) continue
    rejectUnknownFields(
      fact,
      [
        "eventId",
        "snapshotId",
        "sourceActorId",
        "targetId",
        "kind",
        "element",
        "isAnomalyCritical",
        "settledDamage",
      ],
      checks(p),
      "original anomaly fact",
    )
    for (const [key, prefix] of [
      ["eventId", "event"],
      ["snapshotId", "snapshot"],
      ["sourceActorId", "entity"],
      ["targetId", "entity"],
    ] as const)
      identity(fact[key], prefix, `${p}/${key}`)
    if (typeof fact.eventId === "string") {
      if (factIds.has(fact.eventId))
        collector.report(
          "DUPLICATE_ID",
          `${p}/eventId`,
          "Original event identities must be unique, including across snapshots",
        )
      factIds.add(fact.eventId)
    }
    for (const [key, expected] of [
      ["kind", "assault"],
      ["element", "physical"],
    ] as const)
      if (fact[key] !== expected)
        collector.report(
          typeof fact[key] === "string" ? "CONTEXT_MISMATCH" : "INVALID_INPUT",
          `${p}/${key}`,
          "Only a declared ordinary physical Assault actual result is supported",
        )
    if (typeof fact.isAnomalyCritical !== "boolean")
      collector.report(
        "INVALID_INPUT",
        `${p}/isAnomalyCritical`,
        "Declare the original actual anomaly critical result as a boolean",
      )
    const amount = expectObject(
      fact.settledDamage,
      checks(`${p}/settledDamage`),
      "settled actual damage",
    )
    if (amount) {
      rejectUnknownFields(
        amount,
        ["unit", "value"],
        checks(`${p}/settledDamage`),
        "settled actual damage",
      )
      if (amount.unit !== "damage-points")
        collector.report(
          "INVALID_INPUT",
          `${p}/settledDamage/unit`,
          "Settled damage must use damage-points",
        )
      if (
        typeof amount.value !== "number" ||
        !Number.isFinite(amount.value) ||
        amount.value < 0
      )
        collector.report(
          "INVALID_INPUT",
          `${p}/settledDamage/value`,
          "Settled actual damage must be finite and non-negative",
        )
    }
  }
  const actorSources = new Map<string, string>()
  if (catalog) {
    const sources = expectArray(
      object.actorSources,
      checks("/actorSources"),
      "actor sources",
    )
    for (const [index, sourceValue] of (sources ?? []).entries()) {
      const p = `/actorSources/${index}`,
        source = expectObject(sourceValue, checks(p), "actor source")
      if (!source) continue
      validateCatalogActorSourceFields(source, p, collector)
      identity(source.entityId, "entity", `${p}/entityId`)
      if (
        typeof source.agentEntityId !== "string" ||
        !catalog.entities.some(
          (e) =>
            e.identity?.kind === "agent" &&
            e.identity.entityId === source.agentEntityId,
        )
      )
        collector.report(
          "MISSING_REFERENCE",
          `${p}/agentEntityId`,
          "Actor source must name a mapped agent",
        )
      if (
        typeof source.entityId === "string" &&
        typeof source.agentEntityId === "string"
      ) {
        if (actorSources.has(source.entityId))
          collector.report("DUPLICATE_ID", p, "Actor source is repeated")
        actorSources.set(source.entityId, source.agentEntityId)
        if (world && !world.actors.has(source.entityId as `entity:${string}`))
          collector.report(
            "MISSING_FACT",
            p,
            "Actor source must refer to the current world",
          )
      }
    }
  }
  if (
    !collector.isEmpty ||
    !rule ||
    !bindings ||
    !world ||
    !snapshots ||
    !event ||
    !facts ||
    !selections
  )
    return failure(collector)
  const typedEvent = event as unknown as AliceCorePeriodicEvent
  const actor = world.actors.get(typedEvent.actorId),
    target = world.actors.get(typedEvent.targetId)
  const binding = bindings.find(
    (b) => b.bindingId === typedEvent.sourceBindingId,
  )
  if (!actor || !target)
    collector.report(
      "MISSING_FACT",
      "/event",
      "Current Alice and target actors are required",
    )
  else if (actor.entityId === target.entityId || actor.teamId === target.teamId)
    collector.report(
      "CONTEXT_MISMATCH",
      "/event/targetId",
      "Current Alice and target must be opposing actors",
    )
  if (!binding)
    collector.report(
      "MISSING_REFERENCE",
      "/event/sourceBindingId",
      "Unknown event source binding",
    )
  else if (
    binding.kind !== "agent" ||
    binding.sourceEntityId !== "1401" ||
    binding.holderId !== typedEvent.actorId ||
    !binding.eligible ||
    (catalog && actorSources.get(binding.holderId) !== "1401")
  )
    collector.report(
      "CONTEXT_MISMATCH",
      "/event/sourceBindingId",
      "The event must belong to its eligible Alice holder binding",
    )
  const original = (facts as unknown as OriginalPhysicalAnomalyFact[]).find(
    (f) => f.eventId === typedEvent.originalAnomalyEventId,
  )
  if (!original)
    collector.report(
      "MISSING_FACT",
      "/event/originalAnomalyEventId",
      "The referenced original anomaly fact is required",
    )
  else {
    if (
      original.snapshotId !== typedEvent.originalAnomalySnapshotId ||
      original.targetId !== typedEvent.targetId
    )
      collector.report(
        "CONTEXT_MISMATCH",
        "/event",
        "Original event, snapshot and target references must agree",
      )
    const snapshot = snapshots.find(
      (s) => s.snapshotId === typedEvent.originalAnomalySnapshotId,
    )
    if (!snapshot)
      collector.report(
        "MISSING_SNAPSHOT",
        "/event/originalAnomalySnapshotId",
        "The original historical snapshot is required",
      )
    else {
      if (snapshot.atSeconds > (object.atSeconds as number))
        collector.report(
          "CONTEXT_MISMATCH",
          "/event/originalAnomalySnapshotId",
          "The original snapshot cannot be in the future",
        )
      const historical = snapshot.world.entities.filter(
        (e) => e.kind === "actor",
      )
      const alice = historical.find((e) => e.entityId === typedEvent.actorId),
        provider = historical.find(
          (e) => e.entityId === original.sourceActorId,
        ),
        enemy = historical.find((e) => e.entityId === original.targetId)
      if (!alice || !provider || !enemy)
        collector.report(
          "MISSING_SNAPSHOT",
          "/event/originalAnomalySnapshotId",
          "Historical Alice, original applier and target must be saved; current actors cannot fill historical gaps",
        )
      else if (
        alice.teamId !== provider.teamId ||
        alice.teamId === enemy.teamId ||
        enemy.entityId === alice.entityId ||
        enemy.entityId === provider.entityId
      )
        collector.report(
          "CONTEXT_MISMATCH",
          "/event/originalAnomalySnapshotId",
          "The original applier must share historical Alice's team and target an opposing actor",
        )
    }
  }
  const validRuleBinding = (
    selectedRule: EffectRule,
    selectedBinding: SourceBinding,
    p: string,
  ) => {
    if (
      selectedRule.source.identity.kind !== selectedBinding.kind ||
      selectedRule.source.identity.entityId !==
        selectedBinding.sourceEntityId ||
      !world.actors.has(selectedBinding.holderId)
    ) {
      collector.report(
        "CONTEXT_MISMATCH",
        p,
        "Selected rule and observed holder binding must have the same source",
      )
      return
    }
    const configuration = configurationView(selectedBinding)
    if (
      !evaluateConfigurationCondition(
        selectedRule.config,
        resolveParameters(selectedRule.parameters, configuration),
        configuration,
        collector,
      )
    )
      collector.report(
        "CONTEXT_MISMATCH",
        p,
        "The selected source is not unlocked under this configuration",
      )
  }
  if (binding) validRuleBinding(rule, binding, "/event/sourceBindingId")
  let applied = false
  const seen = new Set<string>()
  const mechanism = catalog?.mechanisms?.find(
    (m) => m.mechanism === ALICE_CORE_PERIODIC_MECHANISM,
  )
  for (let index = 0; index < selections.length; index++) {
    const p = `/selections/${index}`,
      selection = expectObject(
        selections[index],
        checks(p),
        "periodic selection",
      )
    if (!selection) continue
    const idKey = catalog ? "optionId" : "effectId"
    rejectUnknownFields(
      selection,
      [idKey, "bindingId", "layers"],
      checks(p),
      "periodic selection",
    )
    identity(selection.bindingId, "binding", `${p}/bindingId`)
    if (
      typeof selection[idKey] !== "string" ||
      !(selection[idKey] as string).length
    )
      collector.report(
        "INVALID_INPUT",
        `${p}/${idKey}`,
        "A source identity is required",
      )
    if (selection.layers !== 0 && selection.layers !== 1)
      collector.report(
        "INVALID_INPUT",
        `${p}/layers`,
        "A named event selection must be exactly 0 or 1",
      )
    const key = JSON.stringify([selection.bindingId, selection[idKey]])
    if (seen.has(key))
      collector.report("DUPLICATE_ID", p, "Select a bound source only once")
    seen.add(key)
    const selectedBinding = bindings.find(
      (b) => b.bindingId === selection.bindingId,
    )
    if (!selectedBinding) {
      collector.report("MISSING_REFERENCE", p, "Unknown selection binding")
      continue
    }
    let selectedRules: readonly EffectRule[] = []
    if (catalog) {
      const option = catalog.options.find(
        (o) => o.optionId === selection.optionId,
      )
      if (!option) {
        collector.report("MISSING_REFERENCE", p, "Unknown catalog option")
        continue
      }
      const owner = catalog.entities.find(
        (e) => e.catalogEntityId === option.catalogEntityId,
      )
      if (
        owner?.identity?.kind !== selectedBinding.kind ||
        owner.identity.entityId !== selectedBinding.sourceEntityId ||
        (selectedBinding.kind === "agent" &&
          actorSources.get(selectedBinding.holderId) !==
            selectedBinding.sourceEntityId)
      )
        collector.report(
          "CONTEXT_MISMATCH",
          p,
          "Option, actor source and binding must agree",
        )
      const variants = option.variants.filter((v) =>
        matchesConfiguration(v, selectedBinding),
      )
      if (variants.length !== 1 || variants[0]!.status === "unsupported") {
        collector.report(
          "CONTEXT_MISMATCH",
          p,
          "The option must have one supported variant for this configuration",
        )
        continue
      }
      selectedRules = variants[0]!.effectIds.map((id) =>
        definitions.effects.find((r) => r.effectId === id)!,
      )
      if (selection.layers === 1 && selection.optionId !== mechanism?.optionId)
        collector.report(
          "CONTEXT_MISMATCH",
          p,
          "Only the named periodic option may be enabled in this event",
        )
    } else {
      const selectedRule = definitions.effects.find(
        (r) => r.effectId === selection.effectId,
      )
      if (!selectedRule) {
        collector.report("MISSING_REFERENCE", p, "Unknown selected rule")
        continue
      }
      if (
        selectedRule.kind !== "contribution" ||
        selectedRule.activation.kind !== "supplied"
      )
        collector.report(
          "CONTEXT_MISMATCH",
          p,
          "Only supplied contribution selections are accepted",
        )
      selectedRules = [selectedRule]
    }
    for (const selectedRule of selectedRules)
      validRuleBinding(selectedRule, selectedBinding, p)
    if (selection.layers === 1) {
      if (
        selectedRules.length !== 1 ||
        selectedRules[0]!.effectId !== rule.effectId ||
        selectedBinding !== binding ||
        !selectedBinding.eligible
      )
        collector.report(
          "CONTEXT_MISMATCH",
          p,
          "This independent event accepts only its single Alice ratio source",
        )
      else applied = true
    }
  }
  if (!collector.isEmpty || !binding || !original) return failure(collector)
  const ratio = applied ? rule.operation.ratio.value : 0
  const value = original.settledDamage.value * ratio
  if (!Number.isFinite(value)) {
    collector.report(
      "INVALID_INPUT",
      "/originalAnomalies",
      "Periodic result must be finite",
    )
    return failure(collector)
  }
  const savedOriginal = Object.freeze({
    ...original,
    settledDamage: Object.freeze({ ...original.settledDamage }),
  })
  return {
    ok: true,
    value: Object.freeze({
      mechanism: ALICE_CORE_PERIODIC_MECHANISM,
      status: applied ? "applied" : "inactive",
      nonCritical: value,
      critical: null,
      criticalRate: 0,
      criticalSemantics: "no-critical-settlement",
      expected: value,
      factors: Object.freeze({
        originalSettledDamage: original.settledDamage.value,
        effectivePeriodicRatio: ratio,
      }),
      provenance: Object.freeze({
        event: Object.freeze({ ...typedEvent }),
        holderId: typedEvent.actorId,
        bindingId: binding.bindingId,
        effectId: rule.effectId,
        originalAnomaly: savedOriginal,
        effectivePeriodicRatio: ratio,
      }),
      contributions: Object.freeze(
        applied
          ? [
              Object.freeze({
                effectId: rule.effectId,
                bindingId: binding.bindingId,
                holderId: typedEvent.actorId,
                eventId: typedEvent.eventId,
                originalAnomalyEventId: original.eventId,
                ratio: Object.freeze({ unit: "ratio" as const, value: ratio }),
              }),
            ]
          : [],
      ),
    }),
  }
}
