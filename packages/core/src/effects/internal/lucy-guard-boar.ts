import { parseEffectRuleSet } from "../parse-effect-rule-set.ts"
import type {
  EffectId,
  EffectInstance,
  EffectNumericInput,
  EntityId,
  EvaluationResult,
  HitContext,
  LucyGuardBoarDamageInput,
  LucyGuardBoarDirectContribution,
  LucyGuardBoarOwnStats,
  LucyGuardBoarResult,
  NonEmpty,
  Result,
  StaticEffectCatalog,
  StaticEffectSelection,
} from "../types.ts"
import {
  expectArray,
  expectFiniteNumber,
  expectObject,
  rejectUnknownFields,
} from "./checks.ts"
import {
  createMomentEvaluation,
  evaluateEffects,
  readMomentStat,
} from "./evaluate.ts"
import { IssueCollector, failure } from "./issues.ts"
import {
  isLucyGuardBoarRule,
  LUCY_BOAR_ITEM,
  LUCY_BOAR_MECHANISM,
  LUCY_BOAR_SOURCES,
  LUCY_BOAR_TARGET,
  LUCY_CONVERSION_INPUT,
  readLucyGuardBoarMechanism,
  validateLucyGuardBoarRules,
} from "./lucy-guard-boar-rules.ts"
import { validateNumericInputs } from "./numeric-input.ts"
import {
  configurationView,
  evaluateConfigurationCondition,
  prepareSelectedEffects,
  readPreparedInternal,
  resolveParameters,
} from "./prepare.ts"
import { validateSourceBindings } from "./rule.ts"
import { readStateInternal, supplyEffectState } from "./state.ts"
import { validateStaticCatalog } from "./static-catalog.ts"
import {
  calculateDamageFromEvaluation,
  validateDamageFields,
} from "./static-damage.ts"
import { isEffectId, isIdentityString } from "./vocabulary.ts"
import { validateSnapshots, validateWorldObservation } from "./world.ts"

const ownUnits = {
  attack: "attack-points",
  impact: "impact-points",
  anomalyProficiency: "anomaly-proficiency-points",
  criticalRate: "ratio",
  criticalDamage: "ratio",
  penetrationRatio: "ratio",
} as const
const modelFields = {
  statComposition: "own-plus-owner-current-without-selected-lucy-cheer",
  otherEffects: "lucy-options-only",
  damageFactors: "explicit-boar-baseline",
  criticalDamage: "resolved-boar",
} as const
const allowedIds: readonly string[] = Object.values(LUCY_BOAR_SOURCES).map(
  (p) => p.effectId,
)
const ownerIds: readonly string[] = [
  LUCY_BOAR_SOURCES.cheerFixed.effectId,
  LUCY_BOAR_SOURCES.cheerConversion.effectId,
  LUCY_BOAR_SOURCES.mindscape4.effectId,
]

/** 只适配露西这一个条件模型；保留 world 中真实 summon，不伪造普通 actor。 */
export function calculateLucyGuardBoar(
  input: unknown,
  fromCatalog: boolean,
): Result<LucyGuardBoarResult> {
  const collector = new IssueCollector()
  const checks = (pointer: string) => ({
    collector,
    pointer,
    structureCode: "INVALID_INPUT" as const,
  })
  const object = expectObject(input, checks(""), "Lucy guard boar input")
  if (!object) return failure(collector)
  rejectUnknownFields(
    object,
    [
      "mechanism",
      "definitions",
      "bindings",
      "selections",
      "world",
      "sourceBindingId",
      "atSeconds",
      "boar",
      "teamCondition",
      "conditionalModel",
      "inputs",
      "snapshots",
      "settlement",
      ...(fromCatalog ? ["catalog", "actorSources"] : []),
    ],
    checks(""),
    "Lucy guard boar input",
  )
  if (object.mechanism !== LUCY_BOAR_MECHANISM)
    collector.report("INVALID_INPUT", "/mechanism", "Unknown Lucy mechanism")
  const parsed = parseEffectRuleSet(object.definitions)
  if (!parsed.ok) return parsed
  validateLucyGuardBoarRules(parsed.value, collector)
  let catalog: StaticEffectCatalog | undefined
  if (fromCatalog) {
    const validated = validateStaticCatalog(object.catalog, parsed.value)
    if (!validated.ok) return validated
    catalog = validated.value
  }
  const bindings = validateSourceBindings(object.bindings, collector)
  const world = validateWorldObservation(object.world, collector, "/world")
  const snapshots = validateSnapshots(
    object.snapshots ?? [],
    collector,
    "/snapshots",
  )
  const inputs = bindings
    ? validateNumericInputs(object.inputs, bindings, collector)
    : undefined
  const selections = expectArray(
    object.selections,
    checks("/selections"),
    "selections",
  )
  const atSeconds = expectFiniteNumber(
    object.atSeconds,
    checks("/atSeconds"),
    "current time",
  )
  if (atSeconds !== undefined && atSeconds < 0)
    collector.report(
      "INVALID_INPUT",
      "/atSeconds",
      "Current time must be non-negative",
    )
  const identity = (value: unknown, prefix: string, pointer: string) => {
    if (!isIdentityString(value, prefix))
      collector.report(
        "INVALID_INPUT",
        pointer,
        "Expected " + prefix + ": identity",
      )
  }
  identity(object.sourceBindingId, "binding", "/sourceBindingId")
  const boar = expectObject(object.boar, checks("/boar"), "guard boar")
  const condition = expectObject(
    object.teamCondition,
    checks("/teamCondition"),
    "team condition",
  )
  const model = expectObject(
    object.conditionalModel,
    checks("/conditionalModel"),
    "conditional model",
  )
  const settlement = expectObject(
    object.settlement,
    checks("/settlement"),
    "settlement",
  )
  let own: Record<string, unknown> | undefined
  let ownerSource: Record<string, unknown> | undefined
  const quantity = (
    value: unknown,
    unit: string,
    pointer: string,
    maximum?: number,
  ) => {
    const entry = expectObject(value, checks(pointer), "quantity")
    if (!entry) return
    rejectUnknownFields(entry, ["unit", "value"], checks(pointer), "quantity")
    if (entry.unit !== unit)
      collector.report("UNIT_MISMATCH", pointer + "/unit", "Expected " + unit)
    const number = expectFiniteNumber(
      entry.value,
      checks(pointer + "/value"),
      "quantity value",
    )
    if (
      number !== undefined &&
      (number < 0 || (maximum !== undefined && number > maximum))
    )
      collector.report(
        "INVALID_INPUT",
        pointer + "/value",
        "Quantity is outside its non-negative domain",
      )
  }
  if (boar) {
    rejectUnknownFields(
      boar,
      ["entityId", "ownerSource", "ownStats"],
      checks("/boar"),
      "guard boar",
    )
    identity(boar.entityId, "entity", "/boar/entityId")
    ownerSource = expectObject(
      boar.ownerSource,
      checks("/boar/ownerSource"),
      "current owner source",
    )
    if (ownerSource) {
      rejectUnknownFields(
        ownerSource,
        ["entityId", "snapshotId"],
        checks("/boar/ownerSource"),
        "current owner source",
      )
      identity(ownerSource.entityId, "entity", "/boar/ownerSource/entityId")
      // 当前读取的语义检查不能依赖 enumerable keys。
      if (ownerSource.snapshotId !== undefined)
        collector.report(
          "CONTEXT_MISMATCH",
          "/boar/ownerSource/snapshotId",
          "Lucy inheritance reads current owner attributes only",
        )
    }
    own = expectObject(boar.ownStats, checks("/boar/ownStats"), "own stats")
    if (own) {
      rejectUnknownFields(
        own,
        Object.keys(ownUnits),
        checks("/boar/ownStats"),
        "own stats",
      )
      for (const [stat, unit] of Object.entries(ownUnits))
        quantity(
          own[stat],
          unit,
          "/boar/ownStats/" + stat,
          stat === "criticalRate" || stat === "penetrationRatio"
            ? 1
            : undefined,
        )
    }
  }
  if (model) {
    rejectUnknownFields(
      model,
      Object.keys(modelFields),
      checks("/conditionalModel"),
      "conditional model",
    )
    for (const [key, value] of Object.entries(modelFields))
      if (model[key] !== value)
        collector.report(
          "INVALID_INPUT",
          "/conditionalModel/" + key,
          "Explicit Lucy conditional model acknowledgement is required",
        )
  }
  if (condition) {
    if (condition.kind === "not-satisfied")
      rejectUnknownFields(
        condition,
        ["kind"],
        checks("/teamCondition"),
        "team condition",
      )
    else if (condition.kind === "teammate") {
      rejectUnknownFields(
        condition,
        ["kind", "entityId", "reason"],
        checks("/teamCondition"),
        "team condition",
      )
      identity(condition.entityId, "entity", "/teamCondition/entityId")
      if (
        !["same-element", "same-faction", "rupture"].includes(
          condition.reason as string,
        )
      )
        collector.report(
          "INVALID_INPUT",
          "/teamCondition/reason",
          "Unknown Lucy teammate condition",
        )
    } else
      collector.report(
        "INVALID_INPUT",
        "/teamCondition/kind",
        "Expected not-satisfied or teammate",
      )
  }
  let event: Record<string, unknown> | undefined
  if (settlement) {
    if (settlement.kind === "attributes")
      rejectUnknownFields(
        settlement,
        ["kind"],
        checks("/settlement"),
        "attributes settlement",
      )
    else if (settlement.kind === "m6-explosion") {
      rejectUnknownFields(
        settlement,
        ["kind", "event", "criticalRate", "damage"],
        checks("/settlement"),
        "M6 settlement",
      )
      event = expectObject(
        settlement.event,
        checks("/settlement/event"),
        "M6 event",
      )
      if (event) {
        rejectUnknownFields(
          event,
          [
            "eventId",
            "sourceBindingId",
            "triggerActorId",
            "targetId",
            "skillCategory",
            "cheerOn",
          ],
          checks("/settlement/event"),
          "M6 event",
        )
        for (const [key, prefix] of [
          ["eventId", "event"],
          ["sourceBindingId", "binding"],
          ["triggerActorId", "entity"],
          ["targetId", "entity"],
        ])
          identity(event[key!], prefix!, "/settlement/event/" + key)
        if (event.skillCategory !== "enhanced-special")
          collector.report(
            "CONTEXT_MISMATCH",
            "/settlement/event/skillCategory",
            "The declared trigger must be an enhanced-special hit",
          )
        if (event.cheerOn !== true)
          collector.report(
            "CONTEXT_MISMATCH",
            "/settlement/event/cheerOn",
            "The trigger must explicitly assert Cheer On",
          )
      }
      quantity(settlement.criticalRate, "ratio", "/settlement/criticalRate", 1)
      const damageIssues = new IssueCollector()
      validateDamageFields(settlement.damage, damageIssues)
      for (const issue of damageIssues.toIssues() ?? [])
        collector.add({ ...issue, pointer: "/settlement" + issue.pointer })
      if (
        typeof settlement.damage === "object" &&
        settlement.damage !== null &&
        (settlement.damage as { kind?: unknown }).kind !== "regular"
      )
        collector.report(
          "CONTEXT_MISMATCH",
          "/settlement/damage/kind",
          "Lucy M6 uses regular damage only",
        )
    } else
      collector.report(
        "INVALID_INPUT",
        "/settlement/kind",
        "Expected attributes or m6-explosion",
      )
  }
  if (
    !collector.isEmpty ||
    !bindings ||
    !world ||
    !snapshots ||
    !inputs ||
    !selections ||
    atSeconds === undefined ||
    !boar ||
    !ownerSource ||
    !own ||
    !condition ||
    !model ||
    !settlement
  )
    return failure(collector)
  const typed = object as unknown as LucyGuardBoarDamageInput
  const binding = bindings.find((b) => b.bindingId === typed.sourceBindingId)
  if (
    !binding ||
    binding.kind !== "agent" ||
    binding.sourceEntityId !== "1151" ||
    !binding.eligible
  )
    collector.report(
      "CONTEXT_MISMATCH",
      "/sourceBindingId",
      "An eligible Lucy agent binding is required",
    )
  if (
    bindings.filter(
      (b) => b.kind === "agent" && b.sourceEntityId === "1151" && b.eligible,
    ).length > 1
  )
    collector.report(
      "DUPLICATE_ID",
      "/bindings",
      "Lucy guard boar accepts one eligible Lucy source binding",
    )
  const holder = binding ? world.actors.get(binding.holderId) : undefined
  const summon = world.summons.get(typed.boar.entityId)
  if (!holder)
    collector.report(
      "MISSING_FACT",
      "/sourceBindingId",
      "Lucy holder must be an observed actor",
    )
  if (!summon)
    collector.report(
      "MISSING_FACT",
      "/boar/entityId",
      "Guard boar must be an observed summon",
    )
  if (
    holder &&
    summon &&
    (summon.summonKind !== LUCY_BOAR_MECHANISM ||
      !summon.deployed ||
      summon.ownerId !== holder.entityId ||
      summon.teamId !== holder.teamId ||
      ownerSource.entityId !== holder.entityId)
  )
    collector.report(
      "CONTEXT_MISMATCH",
      "/boar",
      "The deployed Lucy guard boar and current owner source must refer to this binding's holder and team",
    )
  if (holder && condition.kind === "teammate") {
    const teammate = world.actors.get(condition.entityId as EntityId)
    if (!teammate)
      collector.report(
        "MISSING_FACT",
        "/teamCondition/entityId",
        "The teammate must be an observed actor",
      )
    else if (
      teammate.entityId === holder.entityId ||
      teammate.teamId !== holder.teamId
    )
      collector.report(
        "CONTEXT_MISMATCH",
        "/teamCondition/entityId",
        "Lucy requires another actor on the same team",
      )
  }
  if (holder && event) {
    const trigger = world.actors.get(event.triggerActorId as EntityId)
    const target = world.actors.get(event.targetId as EntityId)
    if (!trigger)
      collector.report(
        "MISSING_FACT",
        "/settlement/event/triggerActorId",
        "Observed trigger actor is required",
      )
    if (!target)
      collector.report(
        "MISSING_FACT",
        "/settlement/event/targetId",
        "Observed target actor is required",
      )
    if (event.sourceBindingId !== binding!.bindingId)
      collector.report(
        "CONTEXT_MISMATCH",
        "/settlement/event/sourceBindingId",
        "M6 event must use the same Lucy source binding",
      )
    if (
      trigger &&
      (trigger.entityId === holder.entityId || trigger.teamId !== holder.teamId)
    )
      collector.report(
        "CONTEXT_MISMATCH",
        "/settlement/event/triggerActorId",
        "M6 trigger must be another squad actor",
      )
    if (target && target.teamId === holder.teamId)
      collector.report(
        "CONTEXT_MISMATCH",
        "/settlement/event/targetId",
        "M6 target must be an opposing actor",
      )
  }

  if (catalog && holder) {
    const actorSources = expectArray(
      object.actorSources,
      checks("/actorSources"),
      "actor sources",
    )
    const actors = new Map<EntityId, StaticEffectCatalog["entities"][number]>()
    for (const [index, value] of (actorSources ?? []).entries()) {
      const p = "/actorSources/" + index
      const source = expectObject(value, checks(p), "actor source")
      if (!source) continue
      rejectUnknownFields(
        source,
        ["entityId", "agentEntityId"],
        checks(p),
        "actor source",
      )
      identity(source.entityId, "entity", p + "/entityId")
      const entity = catalog.entities.find(
        (e) =>
          e.status === "mapped" &&
          e.identity?.kind === "agent" &&
          e.identity.entityId === source.agentEntityId,
      )
      const actorId = source.entityId as EntityId
      if (!world.actors.has(actorId) || !entity)
        collector.report(
          "CONTEXT_MISMATCH",
          p,
          "Actor source must map an observed actor to a catalog agent",
        )
      else {
        if (actors.has(actorId))
          collector.report("DUPLICATE_ID", p, "Duplicate actor source")
        actors.set(actorId, entity)
      }
    }
    for (const actor of world.actors.values())
      if (actor.teamId === holder.teamId && !actors.has(actor.entityId))
        collector.report(
          "MISSING_FACT",
          "/actorSources",
          "All other squad actors need catalog identities, including a false team condition",
        )
    for (const [index, source] of bindings.entries()) {
      if (!world.actors.has(source.holderId))
        collector.report(
          "MISSING_FACT",
          "/bindings/" + index + "/holderId",
          "Source holders must be observed actors",
        )
      if (
        source.kind === "agent" &&
        actors.get(source.holderId)?.identity?.entityId !==
          source.sourceEntityId
      )
        collector.report(
          "CONTEXT_MISMATCH",
          "/bindings/" + index,
          "Agent binding holder and actor source must match",
        )
    }
    const metadata = readLucyGuardBoarMechanism(catalog)
    const qualifies = (id: EntityId, reason: string) => {
      const entity = actors.get(id)
      if (!entity) return false
      if (reason === "same-element")
        return (
          entity.element !== null &&
          entity.element === actors.get(holder.entityId)?.element
        )
      if (reason === "rupture") return entity.profession === "命破"
      return metadata.sameFactionAgentEntityIds.includes(
        entity.identity!.entityId,
      )
    }
    if (
      condition.kind === "teammate" &&
      !qualifies(condition.entityId as EntityId, condition.reason as string)
    )
      collector.report(
        "CONTEXT_MISMATCH",
        "/teamCondition/reason",
        "Declared Lucy teammate reason is contradicted by the catalog",
      )
    if (
      condition.kind === "not-satisfied" &&
      [...world.actors.values()].some(
        (a) =>
          a.entityId !== holder.entityId &&
          a.teamId === holder.teamId &&
          ["same-element", "same-faction", "rupture"].some((r) =>
            qualifies(a.entityId, r),
          ),
      )
    )
      collector.report(
        "CONTEXT_MISMATCH",
        "/teamCondition",
        "Another observed squad actor satisfies Lucy's additional ability",
      )
  }
  if (
    !collector.isEmpty ||
    !binding ||
    binding.kind !== "agent" ||
    !holder ||
    !summon
  )
    return failure(collector)

  const selected: StaticEffectSelection[] = []
  const selectedPointers = new Map<string, string>()
  const seen = new Set<string>()
  for (const [index, value] of selections.entries()) {
    const p = "/selections/" + index
    const selection = expectObject(value, checks(p), "Lucy selection")
    if (!selection) continue
    const key = catalog ? "optionId" : "effectId"
    rejectUnknownFields(
      selection,
      [key, "bindingId", "layers"],
      checks(p),
      "Lucy selection",
    )
    identity(selection.bindingId, "binding", p + "/bindingId")
    const source = bindings.find((b) => b.bindingId === selection.bindingId)
    const id = selection[key]
    if (typeof id !== "string" || !id.trim() || (!catalog && !isEffectId(id)))
      collector.report(
        "INVALID_INPUT",
        p + "/" + key,
        "A valid selection identity is required",
      )
    const pairKey = JSON.stringify([selection.bindingId, id])
    if (seen.has(pairKey))
      collector.report("DUPLICATE_ID", p, "Select each bound source once")
    seen.add(pairKey)
    const layers = expectFiniteNumber(
      selection.layers,
      checks(p + "/layers"),
      "layers",
    )
    if (layers !== undefined && (!Number.isSafeInteger(layers) || layers < 0))
      collector.report(
        "INVALID_INPUT",
        p + "/layers",
        "Layers must be a non-negative safe integer",
      )
    if (!source || !source.eligible || !world.actors.has(source.holderId)) {
      collector.report(
        "CONTEXT_MISMATCH",
        p,
        "Selected source requires an eligible observed holder binding",
      )
      continue
    }
    let effectIds: readonly EffectId[] = []
    if (catalog) {
      const option = catalog.options.find((o) => o.optionId === id)
      if (!option) {
        collector.report("MISSING_REFERENCE", p + "/optionId", "Unknown option")
        continue
      }
      const entity = catalog.entities.find(
        (e) => e.catalogEntityId === option.catalogEntityId,
      )!
      if (
        entity.identity?.kind !== source.kind ||
        entity.identity.entityId !== source.sourceEntityId
      ) {
        collector.report(
          "CONTEXT_MISMATCH",
          p,
          "Option and binding identities disagree",
        )
        continue
      }
      const variants = option.variants.filter(
        (v) =>
          (!v.configuration.refinements ||
            (source.kind === "w-engine" &&
              v.configuration.refinements.includes(
                source.configuration.refinement,
              ))) &&
          (!v.configuration.potentialLevels ||
            (source.kind === "agent" &&
              v.configuration.potentialLevels.includes(
                source.configuration.potentialLevel ?? 0,
              ))),
      )
      if (variants.length !== 1) {
        collector.report(
          "MISSING_RANK",
          p,
          "Selected option has no unique variant",
        )
        continue
      }
      const variant = variants[0]!,
        config = variant.configuration
      if (variant.status === "unsupported") {
        collector.report("INVALID_INPUT", p, "Selected option is unsupported")
        continue
      }
      if (
        (config.minimumMindscape !== undefined &&
          (source.kind !== "agent" ||
            source.configuration.mindscapeRank < config.minimumMindscape)) ||
        (config.minimumSetPieces !== undefined &&
          (source.kind !== "drive-disc" ||
            source.configuration.setPieces < config.minimumSetPieces))
      )
        collector.report(
          "CONTEXT_MISMATCH",
          p,
          "Selected option is not unlocked",
        )
      if (
        (config.coreSkillLevels &&
          (source.kind !== "agent" ||
            !config.coreSkillLevels.includes(
              source.configuration.coreSkillLevel,
            ))) ||
        (config.specialSkillLevels &&
          (source.kind !== "agent" ||
            source.configuration.specialSkillLevel === undefined ||
            !config.specialSkillLevels.includes(
              source.configuration.specialSkillLevel,
            )))
      )
        collector.report(
          "MISSING_RANK",
          p,
          "Selected option has no verified skill rank",
        )
      if (layers !== undefined && layers > variant.maximumLayers)
        collector.report(
          "INVALID_INPUT",
          p + "/layers",
          "Selected layers exceed the catalog maximum",
        )
      effectIds = variant.effectIds
    } else effectIds = [id as EffectId]
    for (const effectId of effectIds) {
      const rule = parsed.value.effects.find((e) => e.effectId === effectId)
      if (!rule) {
        collector.report("MISSING_REFERENCE", p, "Unknown selected effect")
        continue
      }
      if (
        rule.source.identity.kind !== source.kind ||
        rule.source.identity.entityId !== source.sourceEntityId
      )
        collector.report(
          "CONTEXT_MISMATCH",
          p,
          "Selected rule and binding identities disagree",
        )
      if (layers !== undefined) {
        selected.push({ effectId, bindingId: source.bindingId, layers })
        selectedPointers.set(JSON.stringify([source.bindingId, effectId]), p)
      }
    }
  }
  if (!collector.isEmpty) return failure(collector)

  // 在准备器应用任何修改前识别受限候选；没有输出事实求值或静默删定义。
  for (const [index, rule] of parsed.value.effects.entries()) {
    for (const source of bindings) {
      if (
        !source.eligible ||
        rule.source.identity.kind !== source.kind ||
        rule.source.identity.entityId !== source.sourceEntityId
      )
        continue
      const continuous =
        rule.kind === "contribution" && rule.activation.kind === "continuous"
      const modifiesSelectedAllowed =
        rule.kind === "modification" &&
        rule.target.kind === "effect" &&
        source.holderId === holder.entityId &&
        selected.some(
          (s) =>
            s.bindingId === binding.bindingId &&
            allowedIds.includes(s.effectId) &&
            rule.target.kind === "effect" &&
            rule.target.effectId === s.effectId,
        )
      if (!continuous && !modifiesSelectedAllowed) continue
      const config = configurationView(source)
      if (
        evaluateConfigurationCondition(
          rule.config,
          resolveParameters(rule.parameters, config),
          config,
          collector,
        )
      )
        collector.report(
          "CONTEXT_MISMATCH",
          "/definitions/effects/" + index,
          "Lucy guard boar excludes other continuous or modifying candidates",
          { effectId: rule.effectId, bindingId: source.bindingId },
        )
    }
  }
  if (!collector.isEmpty) return failure(collector)
  const preparedAll = prepareSelectedEffects(
    parsed.value,
    bindings,
    new Set(selected.map((s) => JSON.stringify([s.bindingId, s.effectId]))),
  )
  if (!preparedAll.ok) return preparedAll
  for (const selection of selected) {
    const p = selectedPointers.get(
      JSON.stringify([selection.bindingId, selection.effectId]),
    )!
    const entry = readPreparedInternal(preparedAll.value)!.contributions.find(
      (e) =>
        e.bindingId === selection.bindingId &&
        e.rule.effectId === selection.effectId,
    )
    if (!entry || entry.rule.activation.kind !== "supplied")
      collector.report(
        "CONTEXT_MISMATCH",
        p,
        "Selected effect is not an unlocked supplied contribution",
        { effectId: selection.effectId, bindingId: selection.bindingId },
      )
    else if (selection.layers > entry.resolvedLayerMaximum)
      collector.report(
        "INVALID_INPUT",
        p + "/layers",
        "Selected layers exceed the rule maximum",
      )
    if (
      selection.layers > 0 &&
      (selection.bindingId !== binding.bindingId ||
        !allowedIds.includes(selection.effectId))
    )
      collector.report(
        "CONTEXT_MISMATCH",
        p,
        "Lucy guard boar accepts only this Lucy binding's five sources",
        { effectId: selection.effectId, bindingId: selection.bindingId },
      )
  }
  const active = (effectId: string) =>
    selected.some(
      (s) =>
        s.bindingId === binding.bindingId &&
        s.effectId === effectId &&
        s.layers > 0,
    )
  const inheritanceActive = active(LUCY_BOAR_SOURCES.inheritance.effectId)
  const m6Active = active(LUCY_BOAR_SOURCES.m6.effectId)
  if (typed.settlement.kind === "attributes" && m6Active)
    collector.report(
      "CONTEXT_MISMATCH",
      "/settlement",
      "An active M6 option requires its explicit explosion event",
    )
  for (const [index, entry] of inputs.entries())
    if (
      entry.name === LUCY_CONVERSION_INPUT &&
      entry.bindingId !== binding.bindingId
    )
      collector.report(
        "CONTEXT_MISMATCH",
        "/inputs/" + index + "/bindingId",
        "Lucy conversion input must belong to this exact owner binding",
      )
  if (!collector.isEmpty) return failure(collector)

  const ownerSelections = selected.filter(
    (s) => s.layers > 0 && ownerIds.includes(s.effectId),
  )
  const prepared = prepareSelectedEffects(
    parsed.value,
    bindings,
    new Set(
      ownerSelections.map((s) => JSON.stringify([s.bindingId, s.effectId])),
    ),
  )
  if (!prepared.ok) return prepared
  const beneficiaries = [...world.actors.values()]
    .filter((a) => a.teamId === holder.teamId)
    .map((a) => a.entityId) as unknown as NonEmpty<EntityId>
  const instances: EffectInstance[] = ownerSelections.map((s, index) => ({
    instanceId: ("instance:lucy-owner:" +
      index) as EffectInstance["instanceId"],
    effectId: s.effectId,
    bindingId: s.bindingId,
    beneficiaryIds: beneficiaries,
    stackKey: [],
    lifetime: { kind: "supplied" },
    layers: [
      {
        layerId: ("layer:lucy-owner:" +
          index) as EffectInstance["layers"][number]["layerId"],
        startedAt: atSeconds,
        expiresAt: null,
        trigger: null,
      },
    ],
  }))
  const state = supplyEffectState(prepared.value, {
    sessionId: "session:lucy-guard-boar",
    atSeconds,
    instances,
    snapshots,
    cooldowns: [],
    eventHistory: { processedIds: [], last: null },
  })
  if (!state.ok) return state
  const ownedInputs: EffectNumericInput[] = inputs.map((i) => ({
    ...i,
    value: { ...i.value },
  }))
  const explicitInput = inputs.find(
    (i) =>
      i.bindingId === binding.bindingId && i.name === LUCY_CONVERSION_INPUT,
  )
  let conversionInput: LucyGuardBoarResult["provenance"]["conversionInput"] =
    null
  const initialReadings: EvaluationResult["attributes"][number][] = []
  if (active(LUCY_BOAR_SOURCES.cheerConversion.effectId) || explicitInput) {
    const moment = createMomentEvaluation(
      readPreparedInternal(prepared.value)!,
      readStateInternal(state.value)!,
      world,
      new Map(snapshots.map((s) => [s.snapshotId, s])),
      atSeconds,
      collector,
    )
    const initialAttack = readMomentStat(
      moment,
      holder.entityId,
      "attack",
      "initial",
    )
    if (explicitInput && explicitInput.value.unit !== "attack-points")
      collector.report(
        "UNIT_MISMATCH",
        "/inputs/" + inputs.indexOf(explicitInput) + "/value/unit",
        "Lucy conversion reads initial attack-points",
      )
    if (explicitInput && explicitInput.value.value !== initialAttack)
      collector.report(
        "CONTEXT_MISMATCH",
        "/inputs/" + inputs.indexOf(explicitInput) + "/value/value",
        "Lucy conversion input must equal this owner's actual initial ATK",
      )
    if (!collector.isEmpty) return failure(collector)
    const value = { unit: "attack-points" as const, value: initialAttack }
    initialReadings.push({
      entityId: holder.entityId,
      stat: "attack",
      stage: "initial",
      value,
      hitId: null,
    })
    conversionInput = {
      bindingId: binding.bindingId,
      name: LUCY_CONVERSION_INPUT,
      value,
      source: explicitInput ? "caller-provided" : "derived-owner-initial",
      ownerId: holder.entityId,
      stage: "initial",
    }
    if (!explicitInput)
      ownedInputs.push({
        bindingId: binding.bindingId,
        name: LUCY_CONVERSION_INPUT,
        value,
      })
  }
  const queryBase = {
    atSeconds,
    world: typed.world,
    observedSnapshots: [],
    inputs: ownedInputs,
  }
  const contributions = evaluateEffects(prepared.value, state.value, {
    ...queryBase,
    kind: "contributions",
    beneficiaries: [holder.entityId],
  })
  if (!contributions.ok) return contributions
  let ownerPanel: EvaluationResult = {
    contributions: [],
    attributes: [],
    hit: null,
  }
  const inheritCritical =
    inheritanceActive && typed.teamCondition.kind === "teammate"
  if (inheritanceActive) {
    const evaluated = evaluateEffects(prepared.value, state.value, {
      ...queryBase,
      kind: "panel",
      entities: [holder.entityId],
      stats: [
        "attack",
        "impact",
        "anomalyProficiency",
        ...(inheritCritical
          ? (["criticalRate", "criticalDamage"] as const)
          : []),
      ],
    })
    if (!evaluated.ok) return evaluated
    ownerPanel = evaluated.value
  }
  const inheritanceRule = parsed.value.effects.find(
    (e) => e.effectId === LUCY_BOAR_SOURCES.inheritance.effectId,
  )!
  if (
    !isLucyGuardBoarRule(inheritanceRule) ||
    inheritanceRule.operation.kind !== "lucy-guard-boar-inheritance"
  ) {
    collector.report(
      "INVALID_DEFINITION",
      "/definitions/effects",
      "Missing fixed inheritance rule",
    )
    return failure(collector)
  }
  const cheerMultiplier = inheritanceActive
    ? inheritanceRule.operation.cheerMultiplier.values[
        binding.configuration.coreSkillLevel
      ]
    : 1
  const ownerContributions: LucyGuardBoarDirectContribution[] = []
  for (const entry of contributions.value.contributions) {
    if (
      entry.address.kind !== "stat" ||
      (entry.address.stat !== "attack" &&
        entry.address.stat !== "criticalDamage") ||
      entry.origin.bindingId !== binding.bindingId ||
      entry.address.entityId !== holder.entityId ||
      !ownerIds.includes(entry.origin.effectId)
    ) {
      collector.report(
        "CONTEXT_MISMATCH",
        "/selections",
        "An unexpected owner contribution escaped Lucy's restricted source set",
      )
      continue
    }
    const rule = parsed.value.effects.find(
      (r) => r.effectId === entry.origin.effectId,
    )!
    ownerContributions.push({
      effectId: rule.effectId,
      bindingId: binding.bindingId,
      sourceEntityId: holder.entityId,
      beneficiaryId: holder.entityId,
      stat: entry.address.stat,
      sourceValue: entry.value as LucyGuardBoarDirectContribution["value"],
      multiplier: 1,
      value: entry.value as LucyGuardBoarDirectContribution["value"],
      references: rule.source.references,
    })
  }
  if (!collector.isEmpty) return failure(collector)
  const sum = (stat: "attack" | "criticalDamage") =>
    ownerContributions
      .filter((e) => e.stat === stat)
      .reduce((total, e) => total + e.value.value, 0)
  const cheer = sum("attack"),
    m4 = sum("criticalDamage")
  const boarContributions = ownerContributions.map((entry) => ({
    ...entry,
    beneficiaryId: summon.entityId,
    multiplier: entry.stat === "attack" ? cheerMultiplier : 1,
    value: {
      ...entry.value,
      value:
        entry.value.value * (entry.stat === "attack" ? cheerMultiplier : 1),
    },
  }))
  const inherited: LucyGuardBoarResult["provenance"]["inheritanceContributions"][number][] =
    []
  for (const reading of ownerPanel.attributes) {
    const stat = reading.stat as Exclude<
      keyof LucyGuardBoarOwnStats,
      "penetrationRatio"
    >
    const removed =
      stat === "attack" ? cheer : stat === "criticalDamage" ? m4 : 0
    inherited.push({
      stat,
      value: { unit: ownUnits[stat], value: reading.value.value - removed },
      effectId: inheritanceRule.effectId,
      bindingId: binding.bindingId,
      sourceEntityId: holder.entityId,
      beneficiaryId: summon.entityId,
      stage: "current",
      references: inheritanceRule.source.references,
    })
  }
  const ownStats = Object.fromEntries(
    (Object.keys(ownUnits) as (keyof LucyGuardBoarOwnStats)[]).map((name) => [
      name,
      { unit: ownUnits[name], value: typed.boar.ownStats[name].value },
    ]),
  ) as unknown as LucyGuardBoarOwnStats
  const attributes = Object.fromEntries(
    Object.entries(ownStats).map(([name, value]) => [
      name,
      {
        ...value,
        value:
          value.value +
          inherited
            .filter((c) => c.stat === name)
            .reduce((total, c) => total + c.value.value, 0) +
          boarContributions
            .filter((c) => c.stat === name)
            .reduce((total, c) => total + c.value.value, 0),
      },
    ]),
  ) as unknown as LucyGuardBoarOwnStats
  for (const [name, value] of Object.entries(attributes))
    if (!Number.isFinite(value.value) || value.value < 0)
      collector.report(
        "INVALID_INPUT",
        "/boar/ownStats/" + name,
        "The resolved boar attribute must be finite and non-negative",
      )
  if (!collector.isEmpty) return failure(collector)
  const provenance: LucyGuardBoarResult["provenance"] = {
    holderId: holder.entityId,
    sourceBindingId: binding.bindingId,
    boarId: summon.entityId,
    ownerSource: { entityId: holder.entityId, stage: "current" },
    teamCondition:
      typed.teamCondition.kind === "not-satisfied"
        ? { kind: "not-satisfied" }
        : {
            kind: "teammate",
            entityId: typed.teamCondition.entityId,
            reason: typed.teamCondition.reason,
          },
    teamConditionEvidence: catalog ? "catalog-verified" : "caller-asserted",
    conditionalModel: { ...modelFields },
    ownStats,
    ownerReadings: [...initialReadings, ...ownerPanel.attributes],
    selectedOwnerContributions: contributions.value.contributions,
    removedOwnerCheerContributions: ownerContributions.filter(
      (c) => inheritanceActive && (c.stat === "attack" || inheritCritical),
    ),
    boarCheerContributions: boarContributions,
    inheritanceContributions: inherited,
    conversionInput,
  }
  let resultSettlement: LucyGuardBoarResult["settlement"] = null
  if (typed.settlement.kind === "m6-explosion") {
    const hit: HitContext = {
      hitId: "hit:lucy-m6-boar-rain",
      actionId: "action:lucy-m6-boar-rain",
      actionInstanceId: "action-instance:lucy-m6-boar-rain",
      actorId: summon.entityId,
      targetId: typed.settlement.event.targetId,
      skillCategory: "uncategorized",
      element: "fire",
      damageKind: "regular",
      skillTags: [],
      targetState: typed.settlement.damage.stunDamage.isTargetStunned
        ? "stunned"
        : "not-stunned",
      actionSnapshotId: "snapshot:lucy-m6-boar-rain",
      origin: { kind: "direct" },
      damageItems: [
        {
          itemId: LUCY_BOAR_ITEM,
          stat: "attack",
          damageMultiplier: m6Active ? 3 : 0,
        },
      ],
    }
    const evaluation: EvaluationResult = {
      contributions: [],
      attributes: Object.entries(attributes).map(([stat, value]) => ({
        entityId: summon.entityId,
        stat,
        stage: "current",
        value,
        hitId: hit.hitId,
      })) as EvaluationResult["attributes"],
      hit: {
        hitId: hit.hitId,
        criticalRate: typed.settlement.criticalRate.value,
        damageItems: [
          {
            itemId: LUCY_BOAR_ITEM,
            damageMultiplier: m6Active ? 3 : 0,
            finalStat: attributes.attack.value,
          },
        ],
      },
    }
    try {
      const calculated = calculateDamageFromEvaluation(
        typed.settlement.damage,
        hit,
        evaluation,
      )
      if (
        ![
          calculated.nonCritical,
          calculated.critical,
          calculated.expected,
        ].every(Number.isFinite)
      )
        throw new Error("Lucy M6 result is not finite")
      resultSettlement = {
        ...calculated,
        status: m6Active ? "applied" : "inactive",
        event: {
          eventId: typed.settlement.event.eventId,
          sourceBindingId: binding.bindingId,
          triggerActorId: typed.settlement.event.triggerActorId,
          targetId: typed.settlement.event.targetId,
          skillCategory: "enhanced-special",
          cheerOn: true,
        },
        effectId: LUCY_BOAR_SOURCES.m6.effectId,
        bindingId: binding.bindingId,
        references: parsed.value.effects.find(
          (rule) => rule.effectId === LUCY_BOAR_SOURCES.m6.effectId,
        )!.source.references,
        attackProvider: { entityId: summon.entityId, stage: "current" },
        beneficiaryId: summon.entityId,
        itemId: LUCY_BOAR_ITEM,
        skillTargetId: LUCY_BOAR_TARGET,
        element: "fire",
        skillCategory: "uncategorized",
        skillTags: [],
      }
    } catch (error) {
      collector.report(
        "INVALID_INPUT",
        "/settlement/damage",
        error instanceof Error
          ? error.message
          : "Invalid Lucy M6 damage calculation",
      )
      return failure(collector)
    }
  }
  return {
    ok: true,
    value: {
      mechanism: LUCY_BOAR_MECHANISM,
      inheritanceStatus: inheritanceActive ? "applied" : "inactive",
      attributes,
      provenance,
      settlement: resultSettlement,
    },
  }
}
