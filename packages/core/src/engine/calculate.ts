import type {
  AgentSnapshot,
  AttackSegment,
  BattleSnapshot,
  BucketContributor,
  BucketResult,
  CalcResult,
  DamageType,
  Diagnostic,
  ManualEvent,
  ManualEventResult,
  ModifierResult,
  MultiplierBucket,
  SegmentResult,
  SourceRef,
  TargetSelector,
  TraceEvent,
  TypedModifier,
} from "../schema"
import { battleSnapshotSchema, calcResultSchema } from "../schema"
import {
  getAttributeDamageBonus,
  getCorruptedShieldDamageReduction,
  getDazeVulnerabilityMultiplier,
  getDefenseMultiplier,
  getResistance,
  getResistanceMultiplier,
  getVulnerabilityMultiplier,
  isEnemyDazed,
  makeBucket,
  makeContributor,
} from "./buckets"
import { evaluateCondition } from "./condition"
import { error, warning } from "./diagnostics"
import { getHandlerBucket, resolveHandler } from "./handlers"
import { clamp, sum } from "./math"
import { makeTraceEvent, resetTraceCounter } from "./trace"
import type { CalculateOptions } from "./types"

const sourceMissingDiagnosticRef = "ERR-SRC-001"

export function calculate(input: unknown, options: CalculateOptions = {}): CalcResult {
  const snapshot = battleSnapshotSchema.parse(input)
  resetTraceCounter()

  const warnings: Diagnostic[] = [
    ...getUnsupportedFeatureWarnings(snapshot),
  ]
  const errors: Diagnostic[] = []
  const activeActor = getActiveActor(snapshot)
  const segmentComputations = snapshot.attackSegments.map((segment, index) =>
    calculateSegment(snapshot, activeActor, segment, index),
  )
  const manualEventResults = (snapshot.manualEvents ?? []).map((event, index) =>
    calculateManualEvent(snapshot, event, index),
  )

  for (const segment of segmentComputations) {
    warnings.push(...segment.warnings)
    errors.push(...segment.errors)
  }

  for (const event of manualEventResults) {
    warnings.push(...event.warnings)
    errors.push(...event.errors)
  }

  const trace = [
    ...segmentComputations.flatMap(segment => segment.trace),
    ...manualEventResults.flatMap(event => event.trace),
  ]
  const attackSegments = segmentComputations.map(segment => segment.result)
  const eventResults = manualEventResults.map(event => event.result)
  const rawTotalDamage = sum([
    ...attackSegments.map(segment => segment.rawDamage),
    ...eventResults.map(event => event.rawDamage),
  ])
  const displayTotalDamage = sum([
    ...attackSegments.map(segment => segment.segmentDisplayDamage),
    ...eventResults.map(event => event.displayDamage),
  ])
  const expectedDamage = sum([
    ...attackSegments.map(segment => segment.expectedDamage ?? segment.rawDamage),
    ...eventResults.map(event => event.rawDamage),
  ])
  const result: CalcResult = {
    schemaVersion: snapshot.schemaVersion,
    gameVersion: snapshot.gameVersion,
    ruleSetVersion: snapshot.ruleSetVersion,
    dataVersion: snapshot.dataVersion,
    sourceVersion: snapshot.sourceVersion,
    ...(snapshot.originalGameVersion === undefined ? {} : { originalGameVersion: snapshot.originalGameVersion }),
    ...(snapshot.originalRuleSetVersion === undefined ? {} : { originalRuleSetVersion: snapshot.originalRuleSetVersion }),
    ...(snapshot.originalDataVersion === undefined ? {} : { originalDataVersion: snapshot.originalDataVersion }),
    ...(snapshot.originalSourceVersion === undefined ? {} : { originalSourceVersion: snapshot.originalSourceVersion }),
    ...(options.snapshotId === undefined ? {} : { snapshotId: options.snapshotId }),
    calculationId: options.calculationId ?? "calc-1",
    ...(snapshot.locale === undefined ? {} : { locale: snapshot.locale }),
    summary: {
      activeActorId: activeActor.agentId,
      ...(snapshot.enemy.enemyId === undefined ? {} : { enemyId: snapshot.enemy.enemyId }),
      damageType: getSummaryDamageType(attackSegments, eventResults),
      rawTotalDamage,
      displayTotalDamage,
      expectedDamage,
      critDamage: sum(attackSegments.map(segment => segment.critDamage ?? segment.rawDamage)),
      nonCritDamage: sum(attackSegments.map(segment => segment.nonCritDamage ?? segment.rawDamage)),
      dazeValue: sum(attackSegments.map(segment => segment.dazeValue ?? 0)),
      anomalyBuildup: sum(attackSegments.map(segment => segment.anomalyBuildup ?? 0)),
      disorderDamage: sum(attackSegments.filter(segment => segment.damageType === "disorder").map(segment => segment.rawDamage)),
      trueDamage: sum(eventResults.map(event => event.rawDamage)),
    },
    attackSegments,
    buckets: segmentComputations.flatMap(segment => segment.buckets),
    modifiers: segmentComputations.flatMap(segment => segment.modifiers),
    ...(eventResults.length === 0 ? {} : { events: eventResults }),
    trace,
    warnings,
    errors,
  }

  return calcResultSchema.parse(result)
}

interface SegmentCalculation {
  result: SegmentResult
  buckets: BucketResult[]
  modifiers: ModifierResult[]
  trace: TraceEvent[]
  warnings: Diagnostic[]
  errors: Diagnostic[]
}

type ContributorSourceFields =
  | { source: SourceRef }
  | { sourceMissing: true; diagnosticRefs: string[] }

function calculateSegment(
  snapshot: BattleSnapshot,
  activeActor: AgentSnapshot,
  segment: AttackSegment,
  index: number,
): SegmentCalculation {
  const warnings: Diagnostic[] = []
  const errors: Diagnostic[] = []
  const damageType = segment.damageType
  const sourceFields = getContributorSourceFields(segment.source, `attackSegments[${index}].source`, warnings)

  if (isPendingAnomalyOrDisorder(damageType)) {
    return calculatePendingAnomalyOrDisorderSegment(
      activeActor,
      segment,
      index,
      sourceFields,
      warnings,
      errors,
    )
  }

  const modifierEvaluation = evaluateModifiers(snapshot, activeActor, segment, index)
  warnings.push(...modifierEvaluation.warnings)
  errors.push(...modifierEvaluation.errors)

  const baseDamage = getBaseDamage(activeActor, segment)
  const damageBonusValue = getDamageBonus(activeActor, segment)
    + sumBucketContributors(modifierEvaluation.contributorsByBucket.get("damageBonusZone"))
  const damageBonusMultiplier = clamp(1 + damageBonusValue, 0, 6)
  const critRate = clamp(activeActor.panel.critRate ?? 0, 0, 1)
  const critDamageBonus = clamp(activeActor.panel.critDamage ?? 0, 0, 5)
  const critMultiplier = getCritMultiplier(snapshot, segment, critRate, critDamageBonus)
  const resistance = getResistance(snapshot.enemy, segment.attribute)
  const resistanceReduction = sumBucketContributors(modifierEvaluation.contributorsByBucket.get("resistanceZone"))
  const resistanceMultiplier = getResistanceMultiplier(resistance, resistanceReduction)
  const vulnerabilityBonus = sumBucketContributors(modifierEvaluation.contributorsByBucket.get("vulnerabilityZone"))
  const vulnerabilityMultiplier = getVulnerabilityMultiplier(
    vulnerabilityBonus,
    getCorruptedShieldDamageReduction(snapshot.enemy),
  )
  const dazeVulnerabilityBonus = sumBucketContributors(modifierEvaluation.contributorsByBucket.get("dazeVulnerabilityZone"))
  const dazeVulnerabilityMultiplier = getDazeVulnerabilityMultiplier(isEnemyDazed(snapshot.enemy), 0.5 + dazeVulnerabilityBonus)
  const specialExtra = sumBucketContributors(modifierEvaluation.contributorsByBucket.get("specialZone"))
  const distanceDecayMultiplier = (segment.distanceDecay ?? 1) * clamp(1 + specialExtra, 0, 5)
  const bucketInputs: BucketResult[] = [
    makeBucket({
      bucketId: "baseDamageZone",
      before: 0,
      after: baseDamage,
      effectiveMultiplier: baseDamage,
      contributors: [
        makeContributor({
          id: `${segment.id}:base-${damageType}`,
          value: baseDamage,
          operation: "add",
          ...sourceFields,
        }),
      ],
    }),
    makeBucket({
      bucketId: "damageBonusZone",
      after: damageBonusMultiplier,
      effectiveMultiplier: damageBonusMultiplier,
      contributors: [
        makeContributor({
          id: `${segment.id}:attribute-damage-bonus`,
          value: getDamageBonus(activeActor, segment),
          operation: "add",
          ...sourceFields,
        }),
        ...getModifierContributors(modifierEvaluation, "damageBonusZone"),
      ],
    }),
  ]

  if (usesStandardCrit(damageType)) {
    bucketInputs.push(makeBucket({
      bucketId: "critZone",
      after: critMultiplier,
      effectiveMultiplier: critMultiplier,
      contributors: [
        makeContributor({
          id: `${segment.id}:crit-expected`,
          value: critMultiplier,
          operation: "multiply",
          ...sourceFields,
        }),
      ],
    }))
  }

  if (usesDefenseZone(damageType)) {
    const defenseReduction = sumBucketContributors(modifierEvaluation.contributorsByBucket.get("defenseZone"))
    const defense = getDefenseMultiplier({
      attackerLevel: activeActor.level,
      enemy: snapshot.enemy,
      ...(activeActor.panel.penetrationRate === undefined ? {} : { penetrationRate: activeActor.panel.penetrationRate }),
      ...(activeActor.panel.flatPenetration === undefined ? {} : { flatPenetration: activeActor.panel.flatPenetration }),
      defenseReduction,
    })
    bucketInputs.push(makeBucket({
      bucketId: "defenseZone",
      after: defense.multiplier,
      effectiveMultiplier: defense.multiplier,
      contributors: [
        makeContributor({
          id: `${segment.id}:base-defense`,
          value: defense.baseDefense,
          operation: "add",
          ...sourceFields,
        }),
        ...getModifierContributors(modifierEvaluation, "defenseZone"),
      ],
    }))
  }

  if (damageType === "sheer") {
    const sheerDamageBonusValue = (activeActor.panel.sheerDamageBonus ?? 0)
      + sumBucketContributors(modifierEvaluation.contributorsByBucket.get("sheerDamageBonusZone"))
    const sheerDamageBonusMultiplier = clamp(1 + sheerDamageBonusValue, 0.2, 9)
    bucketInputs.push(makeBucket({
      bucketId: "sheerDamageBonusZone",
      after: sheerDamageBonusMultiplier,
      effectiveMultiplier: sheerDamageBonusMultiplier,
      contributors: [
        makeContributor({
          id: `${segment.id}:sheer-damage-bonus`,
          value: activeActor.panel.sheerDamageBonus ?? 0,
          operation: "add",
          ...sourceFields,
        }),
        ...getModifierContributors(modifierEvaluation, "sheerDamageBonusZone"),
      ],
    }))
  }

  if (damageType === "anomaly" || damageType === "disorder") {
    const anomalyProficiencyValue = clamp(
      (activeActor.panel.anomalyProficiency ?? 100) / 100
      + sumBucketContributors(modifierEvaluation.contributorsByBucket.get("anomalyProficiencyZone")),
      0,
      10,
    )
    const damageLevelValue = getDamageLevelMultiplier(activeActor.level)
      + sumBucketContributors(modifierEvaluation.contributorsByBucket.get("damageLevelZone"))
    const anomalyDamageBonusValue = 1
      + sumBucketContributors(modifierEvaluation.contributorsByBucket.get("anomalyDamageBonusZone"))
    const anomalyCritValue = 1
      + sumBucketContributors(modifierEvaluation.contributorsByBucket.get("anomalyCritZone"))
    bucketInputs.push(
      makeBucket({
        bucketId: "anomalyProficiencyZone",
        after: anomalyProficiencyValue,
        effectiveMultiplier: anomalyProficiencyValue,
        contributors: [
          makeContributor({
            id: `${segment.id}:anomaly-proficiency`,
            value: activeActor.panel.anomalyProficiency ?? 100,
            operation: "multiply",
            ...sourceFields,
          }),
          ...getModifierContributors(modifierEvaluation, "anomalyProficiencyZone"),
        ],
      }),
      makeBucket({
        bucketId: "damageLevelZone",
        after: damageLevelValue,
        effectiveMultiplier: damageLevelValue,
        contributors: [
          makeContributor({
            id: `${segment.id}:damage-level`,
            value: activeActor.level,
            operation: "multiply",
            ...sourceFields,
          }),
          ...getModifierContributors(modifierEvaluation, "damageLevelZone"),
        ],
      }),
      makeBucket({
        bucketId: "anomalyDamageBonusZone",
        after: anomalyDamageBonusValue,
        effectiveMultiplier: anomalyDamageBonusValue,
        contributors: getModifierContributors(modifierEvaluation, "anomalyDamageBonusZone"),
      }),
      makeBucket({
        bucketId: "anomalyCritZone",
        after: anomalyCritValue,
        effectiveMultiplier: anomalyCritValue,
        contributors: getModifierContributors(modifierEvaluation, "anomalyCritZone"),
      }),
    )
  }

  bucketInputs.push(
    makeBucket({
      bucketId: "resistanceZone",
      after: resistanceMultiplier,
      effectiveMultiplier: resistanceMultiplier,
      contributors: [
        makeContributor({
          id: `${segment.id}:resistance`,
          value: resistance,
          operation: "add",
          ...sourceFields,
        }),
        ...getModifierContributors(modifierEvaluation, "resistanceZone"),
      ],
    }),
    makeBucket({
      bucketId: "vulnerabilityZone",
      after: vulnerabilityMultiplier,
      effectiveMultiplier: vulnerabilityMultiplier,
      contributors: [
        makeContributor({
          id: `${segment.id}:corrupted-shield-damage-reduction`,
          value: -getCorruptedShieldDamageReduction(snapshot.enemy),
          operation: "add",
          active: snapshot.enemy.corruptedShield?.active ?? false,
          ...sourceFields,
        }),
        ...getModifierContributors(modifierEvaluation, "vulnerabilityZone"),
      ],
    }),
    makeBucket({
      bucketId: "dazeVulnerabilityZone",
      after: dazeVulnerabilityMultiplier,
      effectiveMultiplier: dazeVulnerabilityMultiplier,
      contributors: [
        makeContributor({
          id: `${segment.id}:daze-vulnerability`,
          value: dazeVulnerabilityMultiplier,
          operation: "multiply",
          ...sourceFields,
        }),
        ...getModifierContributors(modifierEvaluation, "dazeVulnerabilityZone"),
      ],
    }),
    makeBucket({
      bucketId: "specialZone",
      after: distanceDecayMultiplier,
      effectiveMultiplier: distanceDecayMultiplier,
      contributors: [
        makeContributor({
          id: `${segment.id}:distance-decay`,
          value: segment.distanceDecay ?? 1,
          operation: "multiply",
          ...sourceFields,
        }),
        ...getModifierContributors(modifierEvaluation, "specialZone"),
      ],
    }),
  )

  if (segment.baseDazeMultiplier !== undefined) {
    bucketInputs.push(
      makeBucket({
        bucketId: "dazeValueZone",
        after: getBaseDaze(activeActor, segment),
        effectiveMultiplier: getBaseDaze(activeActor, segment),
        contributors: [
          makeContributor({
            id: `${segment.id}:base-daze`,
            value: getBaseDaze(activeActor, segment),
            operation: "add",
            ...sourceFields,
          }),
        ],
      }),
      makeBucket({
        bucketId: "dazeInflictZone",
        after: 1 + sumBucketContributors(modifierEvaluation.contributorsByBucket.get("dazeInflictZone")),
        effectiveMultiplier: 1 + sumBucketContributors(modifierEvaluation.contributorsByBucket.get("dazeInflictZone")),
        contributors: getModifierContributors(modifierEvaluation, "dazeInflictZone"),
      }),
      makeBucket({
        bucketId: "dazeReceiveZone",
        after: 1 + sumBucketContributors(modifierEvaluation.contributorsByBucket.get("dazeReceiveZone")),
        effectiveMultiplier: 1 + sumBucketContributors(modifierEvaluation.contributorsByBucket.get("dazeReceiveZone")),
        contributors: getModifierContributors(modifierEvaluation, "dazeReceiveZone"),
      }),
    )
  }

  const { buckets, trace: bucketTrace } = attachBucketContributionTrace(bucketInputs)
  const effectiveMultiplier = buckets
    .filter(isDamageFormulaBucket)
    .reduce((total, bucket) => total * bucket.effectiveMultiplier, 1)
  const rawDamage = damageType === "daze"
    ? 0
    : baseDamage * effectiveMultiplier
  const segmentDisplayDamage = Math.ceil(rawDamage)
  const trace = [
    ...modifierEvaluation.trace,
    ...bucketTrace,
    makeTraceEvent({
      kind: "formula",
      path: `attackSegments[${index}].rawDamage`,
      inputs: {
        baseDamage,
        damageType,
        multiplier: segment.multiplier ?? 1,
        bucketIds: buckets.map(bucket => bucket.bucketId),
      },
      formula: getFormulaLabel(damageType),
      rawValue: rawDamage,
      refs: buckets.flatMap(bucket => bucket.traceRefs),
    }),
    makeTraceEvent({
      kind: "rounding",
      path: `attackSegments[${index}].segmentDisplayDamage`,
      rawValue: rawDamage,
      displayValue: segmentDisplayDamage,
      rounding: {
        mode: "ceilPerSegment",
        input: rawDamage,
        output: segmentDisplayDamage,
        reason: "Game display rounds each attack segment up before summing.",
      },
    }),
  ]

  if (damageType === "sheer") {
    trace.push(makeTraceEvent({
      kind: "formula",
      path: "buckets[?bucketId=defenseZone]",
      inputs: { damageType: "sheer" },
      formula: "Sheer damage skips defenseZone.",
      displayValue: "defenseSkipped",
    }))
  }

  const nonCritMultiplier = buckets
    .filter(bucket => isDamageFormulaBucket(bucket) && bucket.bucketId !== "critZone")
    .reduce((total, bucket) => total * bucket.effectiveMultiplier, 1)
  const nonCritDamage = damageType === "daze" ? 0 : baseDamage * nonCritMultiplier
  const critDamage = damageType === "daze" ? 0 : nonCritDamage * (1 + critDamageBonus)
  const dazeValue = getDazeValue(activeActor, segment, buckets)

  return {
    result: {
      id: segment.id,
      actorId: segment.actorId ?? activeActor.agentId,
      attribute: segment.attribute,
      tags: segment.tags,
      damageType,
      rawDamage,
      segmentDisplayDamage,
      roundingMode: "ceilPerSegment",
      baseDamage,
      expectedDamage: rawDamage,
      critDamage,
      nonCritDamage,
      ...(segment.baseDazeMultiplier === undefined ? {} : { baseDaze: getBaseDaze(activeActor, segment) }),
      ...(dazeValue === undefined ? {} : { dazeValue }),
      ...(segment.anomalyContribution?.buildup === undefined ? {} : { anomalyBuildup: getAnomalyBuildup(activeActor, segment) }),
      traceRefs: trace.map(event => event.id),
    },
    buckets,
    modifiers: modifierEvaluation.modifiers,
    trace,
    warnings,
    errors,
  }
}

function calculatePendingAnomalyOrDisorderSegment(
  activeActor: AgentSnapshot,
  segment: AttackSegment,
  index: number,
  sourceFields: ContributorSourceFields,
  warnings: Diagnostic[],
  errors: Diagnostic[],
): SegmentCalculation {
  const diagnosticKey = segment.damageType === "anomaly"
    ? "ERR-CALC-PENDING-ANOMALY"
    : "ERR-CALC-PENDING-DISORDER"
  warnings.push(warning(diagnosticKey, `attackSegments[${index}].damageType`, {
    damageType: segment.damageType,
    followUpTask: "#27",
  }))

  const rawBuckets = [
    makeBucket({
      bucketId: "baseDamageZone",
      before: 0,
      after: 0,
      effectiveMultiplier: 0,
      contributors: [
        makeContributor({
          id: `${segment.id}:pending-${segment.damageType}`,
          value: 0,
          operation: "ignore",
          active: false,
          inactiveReason: `${segment.damageType}-formula-pending`,
          ...sourceFields,
        }),
      ],
    }),
  ]
  const { buckets, trace: bucketTrace } = attachBucketContributionTrace(rawBuckets)
  const trace = [
    ...bucketTrace,
    makeTraceEvent({
      kind: "warning",
      path: `attackSegments[${index}].damageType`,
      inputs: {
        damageType: segment.damageType,
        diagnosticKey,
        followUpTask: "#27",
      },
      displayValue: "pending-formula",
      refs: buckets.flatMap(bucket => bucket.traceRefs),
    }),
    makeTraceEvent({
      kind: "formula",
      path: `attackSegments[${index}].rawDamage`,
      inputs: {
        damageType: segment.damageType,
        diagnosticKey,
      },
      formula: "pending anomaly/disorder formula: no trusted numeric damage emitted in PR #10",
      rawValue: 0,
      displayValue: "pending-formula",
      refs: buckets.flatMap(bucket => bucket.traceRefs),
    }),
    makeTraceEvent({
      kind: "rounding",
      path: `attackSegments[${index}].segmentDisplayDamage`,
      rawValue: 0,
      displayValue: 0,
      rounding: {
        mode: "ceilPerSegment",
        input: 0,
        output: 0,
        reason: "Pending anomaly/disorder formula emits zero display damage until task #27 implements trusted evidence.",
      },
    }),
  ]

  return {
    result: {
      id: segment.id,
      actorId: segment.actorId ?? activeActor.agentId,
      attribute: segment.attribute,
      tags: segment.tags,
      damageType: segment.damageType,
      rawDamage: 0,
      segmentDisplayDamage: 0,
      roundingMode: "ceilPerSegment",
      baseDamage: 0,
      expectedDamage: 0,
      traceRefs: trace.map(event => event.id),
    },
    buckets,
    modifiers: [],
    trace,
    warnings,
    errors,
  }
}

interface ModifierEvaluation {
  contributorsByBucket: Map<MultiplierBucket, BucketContributor[]>
  modifiers: ModifierResult[]
  trace: TraceEvent[]
  warnings: Diagnostic[]
  errors: Diagnostic[]
}

function evaluateModifiers(
  snapshot: BattleSnapshot,
  activeActor: AgentSnapshot,
  segment: AttackSegment,
  segmentIndex: number,
): ModifierEvaluation {
  const contributorsByBucket = new Map<MultiplierBucket, BucketContributor[]>()
  const modifiers: ModifierResult[] = []
  const trace: TraceEvent[] = []
  const warnings: Diagnostic[] = []
  const errors: Diagnostic[] = []
  const sortedModifiers = [...(snapshot.modifiers ?? [])].sort((left, right) => (left.priority ?? 0) - (right.priority ?? 0))

  sortedModifiers.forEach((modifier, modifierIndex) => {
    const handler = resolveHandler(modifier.handlerId)
    const bucket = getHandlerBucket(modifier)
    const targetMatches = doesTargetMatch(modifier.appliesTo, snapshot, activeActor, segment)
    const conditionMatches = modifier.when === undefined || evaluateCondition(modifier.when, {
      snapshot,
      activeActor,
      target: getTargetValue(modifier.appliesTo, snapshot, activeActor, segment),
      enemy: snapshot.enemy,
      segment,
      modifier,
    })
    const inactiveReason = getModifierInactiveReason(modifier, handler !== undefined, targetMatches, conditionMatches)
    const producedContributors: string[] = []
    const sourceDiagnostic = modifier.source === undefined
      ? {
          warningKey: sourceMissingDiagnosticRef,
          diagnosticRef: sourceMissingDiagnosticRef,
        }
      : undefined
    if (sourceDiagnostic !== undefined) {
      warnings.push(warning(sourceDiagnostic.warningKey, `modifiers[${modifierIndex}].source`, {
        modifierId: modifier.id,
      }))
    }

    if (inactiveReason === undefined && handler !== undefined && bucket !== undefined) {
      const output = handler.apply({
        modifier,
        ...(sourceDiagnostic === undefined ? {} : { sourceDiagnostic }),
      })
      const bucketContributors = contributorsByBucket.get(output.bucket) ?? []
      bucketContributors.push(...output.contributors)
      contributorsByBucket.set(output.bucket, bucketContributors)
      producedContributors.push(...output.contributors.map(contributor => contributor.id))
    }
    else if (handler === undefined) {
      errors.push(error("ERR-DAT-004", `modifiers[${modifierIndex}].handlerId`, {
        handlerId: modifier.handlerId,
      }))
    }

    const activationTrace = makeTraceEvent({
      kind: "modifierActivation",
      path: `attackSegments[${segmentIndex}].modifiers[${modifierIndex}]`,
      inputs: {
        modifierId: modifier.id,
        handlerId: modifier.handlerId,
        appliesTo: modifier.appliesTo,
        conditionMatches,
        targetMatches,
      },
      active: inactiveReason === undefined,
      ...(inactiveReason === undefined ? {} : { inactiveReason }),
      ...(modifier.source === undefined ? {} : { source: modifier.source }),
      refs: producedContributors,
    })
    trace.push(activationTrace)
    modifiers.push({
      id: modifier.id,
      handlerId: modifier.handlerId,
      active: inactiveReason === undefined,
      appliesTo: modifier.appliesTo,
      ...(bucket === undefined ? {} : { bucket }),
      ...(modifier.source === undefined ? { sourceMissing: true } : { source: modifier.source }),
      ...(inactiveReason === undefined ? {} : { inactiveReason }),
      ...(producedContributors.length === 0 ? {} : { producedContributors }),
      traceRefs: [activationTrace.id],
    })
  })

  return {
    contributorsByBucket,
    modifiers,
    trace,
    warnings,
    errors,
  }
}

interface ManualEventCalculation {
  result: ManualEventResult
  trace: TraceEvent[]
  warnings: Diagnostic[]
  errors: Diagnostic[]
}

function calculateManualEvent(
  snapshot: BattleSnapshot,
  event: ManualEvent,
  index: number,
): ManualEventCalculation {
  const warnings: Diagnostic[] = []
  const errors: Diagnostic[] = []
  const base = getManualEventBaseValue(snapshot, event)
  if (base.error !== undefined)
    errors.push(base.error)

  const baseValue = base.value
  const multiplier = getManualEventMultiplier(event)
  const flatValue = getManualEventFlatValue(event)
  const rawDamage = baseValue * multiplier + (flatValue ?? 0)
  const displayDamage = Math.ceil(rawDamage)
  const trace = [
    makeTraceEvent({
      kind: "formula",
      path: `events[${index}].rawDamage`,
      inputs: {
        eventId: event.id,
        kind: event.kind,
        baseValue,
        multiplier,
      },
      formula: "manualEventDamage = baseValue * multiplier + flatValue",
      rawValue: rawDamage,
      displayValue: displayDamage,
      ...(event.source === undefined ? {} : { source: event.source }),
    }),
  ]

  return {
    result: {
      id: event.id,
      kind: event.kind,
      ...(event.ruleId === undefined ? {} : { ruleId: event.ruleId }),
      ...(event.source === undefined ? {} : { source: event.source }),
      ...(event.basePath === undefined ? {} : { basePath: event.basePath }),
      baseValue,
      multiplier,
      ...(flatValue === undefined ? {} : { flatValue }),
      rawDamage,
      displayDamage,
      traceRefs: trace.map(item => item.id),
    },
    trace,
    warnings,
    errors,
  }
}

function getBaseDamage(activeActor: AgentSnapshot, segment: AttackSegment): number {
  const multiplier = segment.multiplier ?? 1
  if (segment.damageType === "sheer")
    return (activeActor.panel.sheerForce ?? 0) * multiplier

  if (segment.damageType === "daze")
    return 0

  return activeActor.panel.attack * multiplier
}

function getBaseDaze(activeActor: AgentSnapshot, segment: AttackSegment): number {
  return (activeActor.panel.impact ?? 0) * (segment.baseDazeMultiplier ?? 0)
}

function getDazeValue(activeActor: AgentSnapshot, segment: AttackSegment, buckets: BucketResult[]): number | undefined {
  if (segment.baseDazeMultiplier === undefined)
    return undefined

  const multiplier = buckets
    .filter(bucket => bucket.bucketId === "dazeInflictZone" || bucket.bucketId === "dazeReceiveZone")
    .reduce((total, bucket) => total * bucket.effectiveMultiplier, 1)

  return getBaseDaze(activeActor, segment) * multiplier
}

function getAnomalyBuildup(activeActor: AgentSnapshot, segment: AttackSegment): number {
  const baseBuildup = segment.anomalyContribution?.buildup ?? 0
  return baseBuildup * ((activeActor.panel.anomalyMastery ?? 100) / 100)
}

function getDamageBonus(activeActor: AgentSnapshot, segment: AttackSegment): number {
  if (segment.damageType === "sheer" || segment.damageType === "daze")
    return 0

  const panelRecord = activeActor.panel as unknown as Record<string, unknown>
  const attributeBonus = getAttributeDamageBonus(panelRecord, segment.attribute)
  return typeof attributeBonus === "number" ? attributeBonus : 0
}

function getCritMultiplier(
  snapshot: BattleSnapshot,
  segment: AttackSegment,
  critRate: number,
  critDamageBonus: number,
): number {
  if (segment.expectedCrit === true)
    return 1 + critDamageBonus

  if (snapshot.options?.resultMode === "nonCrit")
    return 1

  if (snapshot.options?.resultMode === "crit")
    return 1 + critDamageBonus

  return 1 + critRate * critDamageBonus
}

function getFormulaLabel(damageType: DamageType): string {
  switch (damageType) {
    case "sheer":
      return "baseDamageZone * damageBonusZone * critZone * sheerDamageBonusZone * resistanceZone * vulnerabilityZone * dazeVulnerabilityZone * specialZone"
    case "anomaly":
      return "baseDamageZone * damageBonusZone * anomalyProficiencyZone * defenseZone * resistanceZone * vulnerabilityZone * dazeVulnerabilityZone * damageLevelZone * anomalyDamageBonusZone * anomalyCritZone * specialZone"
    case "disorder":
      return "baseDamageZone * damageBonusZone * anomalyProficiencyZone * defenseZone * resistanceZone * vulnerabilityZone * dazeVulnerabilityZone * damageLevelZone * anomalyDamageBonusZone * anomalyCritZone * specialZone"
    case "daze":
      return "dazeValueZone * dazeInflictZone * dazeReceiveZone"
    case "trueDamage":
      return "manual true damage event"
    default:
      return "baseDamageZone * damageBonusZone * critZone * defenseZone * resistanceZone * vulnerabilityZone * dazeVulnerabilityZone * specialZone"
  }
}

function usesDefenseZone(damageType: DamageType): boolean {
  return damageType === "regular" || damageType === "anomaly" || damageType === "disorder" || damageType === "daze"
}

function usesStandardCrit(damageType: DamageType): boolean {
  return damageType === "regular" || damageType === "sheer"
}

function isPendingAnomalyOrDisorder(damageType: DamageType): boolean {
  return damageType === "anomaly" || damageType === "disorder"
}

function isDamageFormulaBucket(bucket: BucketResult): boolean {
  return bucket.bucketId !== "baseDamageZone"
    && bucket.bucketId !== "dazeValueZone"
    && bucket.bucketId !== "dazeInflictZone"
    && bucket.bucketId !== "dazeReceiveZone"
}

function attachBucketContributionTrace(buckets: BucketResult[]): {
  buckets: BucketResult[]
  trace: TraceEvent[]
} {
  const trace: TraceEvent[] = []
  const tracedBuckets = buckets.map((bucket) => {
    const traceRefs = [...bucket.traceRefs]
    bucket.contributors.forEach((contributor, contributorIndex) => {
      const event = makeTraceEvent({
        kind: "bucketContribution",
        path: `buckets[?bucketId=${bucket.bucketId}].contributors[${contributorIndex}]`,
        inputs: {
          bucketId: bucket.bucketId,
          contributorId: contributor.id,
          operation: contributor.operation,
          active: contributor.active,
          modifierId: contributor.modifierId,
          sourceMissing: contributor.sourceMissing,
        },
        rawValue: contributor.value,
        displayValue: bucket.effectiveMultiplier,
        ...(contributor.source === undefined ? {} : { source: contributor.source }),
        ...(contributor.inactiveReason === undefined ? {} : { inactiveReason: contributor.inactiveReason }),
        ...(contributor.diagnosticRefs === undefined ? {} : { refs: contributor.diagnosticRefs }),
      })
      trace.push(event)
      traceRefs.push(event.id)
    })

    return {
      ...bucket,
      traceRefs,
    }
  })

  return {
    buckets: tracedBuckets,
    trace,
  }
}

function getDamageLevelMultiplier(level: number): number {
  return clamp(1 + ((Math.min(Math.max(level, 1), 60) - 1) / 59), 1, 2)
}

interface ManualEventBaseValue {
  value: number
  error?: Diagnostic
}

function getManualEventBaseValue(snapshot: BattleSnapshot, event: ManualEvent): ManualEventBaseValue {
  if (event.basePath === "enemy.maxHp") {
    if (snapshot.enemy.maxHp !== undefined)
      return { value: snapshot.enemy.maxHp }

    return {
      value: 0,
      error: error("ERR-EVENT-001", "enemy.maxHp", {
        eventId: event.id,
        basePath: event.basePath,
      }),
    }
  }

  if (event.basePath === "part.maxHp") {
    return {
      value: 0,
      error: error("ERR-EVENT-003", `manualEvents[?id=${event.id}].partId`, {
        eventId: event.id,
        partId: "partId" in event ? event.partId : "unknown",
        enemyId: snapshot.enemy.enemyId ?? "unknown",
      }),
    }
  }

  return {
    value: 0,
    error: error("ERR-EVENT-001", `manualEvents[?id=${event.id}].basePath`, {
      eventId: event.id,
      basePath: event.basePath,
    }),
  }
}

function getManualEventMultiplier(event: ManualEvent): number {
  if (event.multiplier !== undefined)
    return event.multiplier

  if (event.kind === "corruptedShieldCleanse") {
    switch (event.trueDamageRule) {
      case "pre22CorruptionPriest3Percent":
        return 0.03
      case "post22ShieldBoss25Permille":
        return 0.025
      case "default15Percent":
      default:
        return 0.15
    }
  }

  return 0
}

function getManualEventFlatValue(event: ManualEvent): number | undefined {
  return "flatValue" in event ? event.flatValue : undefined
}

function getActiveActor(snapshot: BattleSnapshot): AgentSnapshot {
  const actor = snapshot.team.find(agent => agent.agentId === snapshot.activeActor.agentId)
  if (actor === undefined)
    throw new Error("activeActor.agentId must reference a team agent")

  return actor
}

function getSummaryDamageType(
  attackSegments: SegmentResult[],
  manualEvents: ManualEventResult[],
): DamageType {
  if (attackSegments.length > 0)
    return attackSegments[0]!.damageType

  if (manualEvents.length > 0)
    return "trueDamage"

  return "regular"
}

function getUnsupportedFeatureWarnings(snapshot: BattleSnapshot): Diagnostic[] {
  const warnings: Diagnostic[] = []
  snapshot.team.forEach((agent, index) => {
    if (agent.subordinate !== undefined) {
      warnings.push(warning(
        "ERR-UI-003",
        `team[${index}].subordinate`,
        { field: "subordinate" },
      ))
    }
  })
  return warnings
}

function getContributorSourceFields(
  source: SourceRef | undefined,
  path: string,
  warnings: Diagnostic[],
): { source: SourceRef } | { sourceMissing: true; diagnosticRefs: string[] } {
  if (source !== undefined)
    return { source }

  warnings.push(warning(sourceMissingDiagnosticRef, path, { path }))
  return {
    sourceMissing: true,
    diagnosticRefs: [sourceMissingDiagnosticRef],
  }
}

function getModifierContributors(evaluation: ModifierEvaluation, bucket: MultiplierBucket): BucketContributor[] {
  return evaluation.contributorsByBucket.get(bucket) ?? []
}

function sumBucketContributors(contributors: BucketContributor[] | undefined): number {
  return sum((contributors ?? [])
    .filter(contributor => contributor.active)
    .map(contributor => contributor.value))
}

function getModifierInactiveReason(
  modifier: TypedModifier,
  handlerKnown: boolean,
  targetMatches: boolean,
  conditionMatches: boolean,
): string | undefined {
  if (modifier.active === false)
    return "inactive-flag"

  if (!handlerKnown)
    return "unknown-handler"

  if (!targetMatches)
    return "target-not-matched"

  if (!conditionMatches)
    return "condition-not-met"

  return undefined
}

function doesTargetMatch(
  selector: TargetSelector,
  snapshot: BattleSnapshot,
  activeActor: AgentSnapshot,
  segment: AttackSegment,
): boolean {
  const actorId = segment.actorId ?? activeActor.agentId
  switch (selector.kind) {
    case "self":
    case "activeActor":
      return actorId === activeActor.agentId
    case "agent":
      return actorId === selector.agentId
    case "team":
      return selector.includeSelf === true || actorId !== activeActor.agentId
    case "enemy":
    case "segment":
    case "global":
      return true
  }
}

function getTargetValue(
  selector: TargetSelector,
  snapshot: BattleSnapshot,
  activeActor: AgentSnapshot,
  segment: AttackSegment,
): unknown {
  switch (selector.kind) {
    case "enemy":
      return snapshot.enemy
    case "segment":
      return segment
    case "agent":
      return snapshot.team.find(agent => agent.agentId === selector.agentId)
    case "team":
      return snapshot.team
    case "self":
    case "activeActor":
    case "global":
      return activeActor
  }
}
