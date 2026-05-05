import type {
  AgentSnapshot,
  AnomalyStatus,
  AttackSegment,
  BattleSnapshot,
  BucketContributor,
  BucketResult,
  CalcResult,
  DamageType,
  Diagnostic,
  EnemyRank,
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
  getResistanceAttribute,
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
  const modifierEvaluation = evaluateModifiers(snapshot, activeActor, segment, index)
  warnings.push(...modifierEvaluation.warnings)
  errors.push(...modifierEvaluation.errors)
  const formulaActor = getFormulaActor(snapshot, activeActor, segment, index)

  const baseDamage = getBaseDamage(formulaActor.actor, segment, formulaActor.disorderMultiplier)
  const damageBonusValue = getDamageBonus(formulaActor.actor, segment)
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
          value: getDamageBonus(formulaActor.actor, segment),
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
      attackerLevel: formulaActor.actor.level,
      enemy: snapshot.enemy,
      ...(formulaActor.actor.panel.penetrationRate === undefined ? {} : { penetrationRate: formulaActor.actor.panel.penetrationRate }),
      ...(formulaActor.actor.panel.flatPenetration === undefined ? {} : { flatPenetration: formulaActor.actor.panel.flatPenetration }),
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
    const sheerDamageBonusValue = (formulaActor.actor.panel.sheerDamageBonus ?? 0)
      + sumBucketContributors(modifierEvaluation.contributorsByBucket.get("sheerDamageBonusZone"))
    const sheerDamageBonusMultiplier = clamp(1 + sheerDamageBonusValue, 0.2, 9)
    bucketInputs.push(makeBucket({
      bucketId: "sheerDamageBonusZone",
      after: sheerDamageBonusMultiplier,
      effectiveMultiplier: sheerDamageBonusMultiplier,
      contributors: [
        makeContributor({
          id: `${segment.id}:sheer-damage-bonus`,
          value: formulaActor.actor.panel.sheerDamageBonus ?? 0,
          operation: "add",
          ...sourceFields,
        }),
        ...getModifierContributors(modifierEvaluation, "sheerDamageBonusZone"),
      ],
    }))
  }

  if (damageType === "anomaly" || damageType === "disorder") {
    const anomalyProficiencyValue = clamp(
      (formulaActor.actor.panel.anomalyProficiency ?? 100) / 100
      + sumBucketContributors(modifierEvaluation.contributorsByBucket.get("anomalyProficiencyZone")),
      0,
      10,
    )
    const damageLevelValue = getDamageLevelMultiplier(formulaActor.actor.level)
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
            value: formulaActor.actor.panel.anomalyProficiency ?? 100,
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
            value: formulaActor.actor.level,
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

  if (damageType === "disorder") {
    const disorderDazeLevelMultiplier = formulaActor.disorderDazeMultiplier ?? 1
    bucketInputs.push(makeBucket({
      bucketId: "disorderDazeLevelZone",
      after: disorderDazeLevelMultiplier,
      effectiveMultiplier: disorderDazeLevelMultiplier,
      contributors: [
        makeContributor({
          id: `${segment.id}:disorder-daze-level`,
          value: disorderDazeLevelMultiplier,
          operation: "multiply",
          ...sourceFields,
        }),
      ],
    }))
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

  if (segment.baseDazeMultiplier !== undefined || damageType === "disorder") {
    bucketInputs.push(
      makeBucket({
        bucketId: "dazeValueZone",
        after: getBaseDaze(formulaActor.actor, segment),
        effectiveMultiplier: getBaseDaze(formulaActor.actor, segment),
        contributors: [
          makeContributor({
            id: `${segment.id}:base-daze`,
            value: getBaseDaze(formulaActor.actor, segment),
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
    ...formulaActor.trace,
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
  const dazeValue = getDazeValue(formulaActor.actor, segment, buckets, formulaActor.disorderDazeMultiplier)
  const dazeRatio = dazeValue === undefined || snapshot.enemy.dazeCap === undefined || snapshot.enemy.dazeCap <= 0
    ? undefined
    : {
        raw: (dazeValue / snapshot.enemy.dazeCap) * 100,
        display: Math.floor((dazeValue / snapshot.enemy.dazeCap) * 100),
      }
  if (dazeRatio !== undefined) {
    trace.push(
      makeTraceEvent({
        kind: "formula",
        path: `attackSegments[${index}].dazeRatioRaw`,
        inputs: {
          dazeValue,
          enemyDazeCap: snapshot.enemy.dazeCap,
        },
        formula: "dazeRatioRaw = dazeValue / enemy.dazeCap * 100",
        rawValue: dazeRatio.raw,
      }),
      makeTraceEvent({
        kind: "rounding",
        path: `attackSegments[${index}].dazeRatioDisplay`,
        rawValue: dazeRatio.raw,
        displayValue: dazeRatio.display,
        rounding: {
          mode: "floorForDisplay",
          input: dazeRatio.raw,
          output: dazeRatio.display,
          reason: "Daze ratio display floors the percentage value.",
        },
      }),
    )
  }

  const anomalyBuildup = segment.anomalyContribution?.buildup === undefined
    ? undefined
    : getAnomalyBuildup(snapshot, formulaActor.actor, segment)
  if (anomalyBuildup !== undefined) {
    const resistanceAttribute = getResistanceAttribute(segment.attribute)
    const anomalyBuildupResistance = snapshot.enemy.anomalyBuildupResistance?.[resistanceAttribute] ?? 0
    trace.push(makeTraceEvent({
      kind: "formula",
      path: `attackSegments[${index}].anomalyBuildup`,
      inputs: {
        buildup: segment.anomalyContribution?.buildup ?? 0,
        anomalyMastery: formulaActor.actor.panel.anomalyMastery ?? 100,
        flooredAnomalyMastery: Math.floor(formulaActor.actor.panel.anomalyMastery ?? 100),
        resistanceAttribute,
        anomalyBuildupResistance,
        anomalyBuildupResistanceMultiplier: getAnomalyBuildupResistanceMultiplier(anomalyBuildupResistance),
      },
      formula: "anomalyBuildup = buildup * floor(anomalyMastery) / 100 * anomalyBuildupResistanceMultiplier",
      rawValue: anomalyBuildup,
      displayValue: "floorForFormula",
    }))
  }

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
      ...(segment.baseDazeMultiplier === undefined && segment.damageType !== "disorder" ? {} : { baseDaze: getBaseDaze(formulaActor.actor, segment) }),
      ...(dazeValue === undefined ? {} : { dazeValue }),
      ...(dazeRatio === undefined ? {} : { dazeRatioRaw: dazeRatio.raw, dazeRatioDisplay: dazeRatio.display }),
      ...(anomalyBuildup === undefined ? {} : { anomalyBuildup }),
      traceRefs: trace.map(event => event.id),
    },
    buckets,
    modifiers: modifierEvaluation.modifiers,
    trace,
    warnings,
    errors,
  }
}

interface FormulaActorContext {
  actor: AgentSnapshot
  trace: TraceEvent[]
  disorderMultiplier?: number
  disorderDazeMultiplier?: number
}

function getFormulaActor(
  snapshot: BattleSnapshot,
  activeActor: AgentSnapshot,
  segment: AttackSegment,
  index: number,
): FormulaActorContext {
  if (segment.damageType !== "anomaly" && segment.damageType !== "disorder") {
    return {
      actor: activeActor,
      trace: [],
    }
  }

  const hasContributorEvidence = (segment.anomalyContribution?.contributors?.length ?? 0) > 0
  const formulaActor = hasContributorEvidence
    ? getVirtualAgent(snapshot, activeActor, segment)
    : { actor: activeActor, traceRows: [] }
  const threshold = getAnomalyThreshold(snapshot, segment)
  const trace = [
    ...(hasContributorEvidence
      ? [
          makeTraceEvent({
            kind: "formula",
            path: `attackSegments[${index}].anomalyContribution.virtualAgent`,
            inputs: {
              virtualAgent: formulaActor.traceRows,
              flooredLevel: formulaActor.actor.level,
              overflowBuildup: segment.anomalyContribution?.overflowBuildup ?? 0,
              excludedReasons: formulaActor.traceRows
                .filter(row => row.excludedReason !== undefined)
                .map(row => `excludedReason:${row.excludedReason}`),
            },
            formula: "virtualAgent = weighted average of included buildup contributors; Bangboo and overflow are excluded",
            rawValue: formulaActor.actor.agentId,
            displayValue: "virtualAgent",
          }),
        ]
      : []),
    makeTraceEvent({
      kind: "formula",
      path: `attackSegments[${index}].anomalyContribution.anomalyThreshold`,
      inputs: threshold,
      formula: "anomalyThreshold = rankTriggerTable[enemy.rank][triggerCount] * physicalMultiplier",
      rawValue: threshold.threshold,
      displayValue: "anomalyThreshold",
    }),
  ]

  if (segment.damageType === "disorder") {
    const disorder = getDisorderFormula(segment)
    trace.push(makeTraceEvent({
      kind: "formula",
      path: `attackSegments[${index}].disorderFormulaId`,
      inputs: {
        disorderFormulaId: disorder.formulaId,
        remainingDurationT: disorder.remainingDurationSeconds,
        status: segment.anomalyContribution?.status,
        attribute: segment.attribute,
        sourceAnchor: "guide-3.4.1",
      },
      formula: disorder.formula,
      rawValue: disorder.multiplier,
      displayValue: disorder.formulaId,
      sourceAnchor: "guide-3.4.1",
    }))
    trace.push(makeTraceEvent({
      kind: "formula",
      path: `attackSegments[${index}].disorderDazeLevelZone`,
      inputs: {
        level: formulaActor.actor.level,
        dazeLevelZone: getDisorderDazeLevelMultiplier(formulaActor.actor.level),
      },
      formula: "disorderDazeLevelZone = 1 + 0.0075 * level",
      rawValue: getDisorderDazeLevelMultiplier(formulaActor.actor.level),
      displayValue: "dazeLevelZone",
      sourceAnchor: "guide-3.4.2",
    }))

    return {
      actor: formulaActor.actor,
      trace,
      disorderMultiplier: disorder.multiplier,
      disorderDazeMultiplier: getDisorderDazeLevelMultiplier(formulaActor.actor.level),
    }
  }

  return {
    actor: formulaActor.actor,
    trace,
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

function getBaseDamage(activeActor: AgentSnapshot, segment: AttackSegment, disorderMultiplier?: number): number {
  const multiplier = segment.multiplier ?? 1
  if (segment.damageType === "sheer")
    return (activeActor.panel.sheerForce ?? 0) * multiplier

  if (segment.damageType === "daze")
    return 0

  if (segment.damageType === "disorder")
    return activeActor.panel.attack * (disorderMultiplier ?? multiplier)

  return activeActor.panel.attack * multiplier
}

function getBaseDaze(activeActor: AgentSnapshot, segment: AttackSegment): number {
  const multiplier = segment.damageType === "disorder"
    ? segment.baseDazeMultiplier ?? 2
    : segment.baseDazeMultiplier ?? 0
  return (activeActor.panel.impact ?? 0) * multiplier
}

function getDazeValue(
  activeActor: AgentSnapshot,
  segment: AttackSegment,
  buckets: BucketResult[],
  extraMultiplier = 1,
): number | undefined {
  if (segment.baseDazeMultiplier === undefined && segment.damageType !== "disorder")
    return undefined

  const multiplier = buckets
    .filter(bucket => bucket.bucketId === "dazeInflictZone" || bucket.bucketId === "dazeReceiveZone")
    .reduce((total, bucket) => total * bucket.effectiveMultiplier, 1)

  return getBaseDaze(activeActor, segment) * multiplier * extraMultiplier
}

function getAnomalyBuildup(snapshot: BattleSnapshot, activeActor: AgentSnapshot, segment: AttackSegment): number {
  const baseBuildup = segment.anomalyContribution?.buildup ?? 0
  const resistanceAttribute = getResistanceAttribute(segment.attribute)
  const buildupResistance = snapshot.enemy.anomalyBuildupResistance?.[resistanceAttribute] ?? 0
  return baseBuildup
    * (Math.floor(activeActor.panel.anomalyMastery ?? 100) / 100)
    * getAnomalyBuildupResistanceMultiplier(buildupResistance)
}

function getAnomalyBuildupResistanceMultiplier(resistance: number): number {
  return clamp(1 - resistance, 0, 2)
}

function getDamageBonus(activeActor: AgentSnapshot, segment: AttackSegment): number {
  if (segment.damageType === "sheer" || segment.damageType === "daze")
    return 0

  const panelRecord = activeActor.panel as unknown as Record<string, unknown>
  const attributeBonus = getAttributeDamageBonus(panelRecord, segment.attribute)
  return typeof attributeBonus === "number" ? attributeBonus : 0
}

interface VirtualAgentTraceRow {
  actorId: string
  included: boolean
  buildup: number
  effectiveBuildup: number
  buildupContributionRatio: number
  level: number
  flooredLevel: number
  excludedReason?: string
}

function getVirtualAgent(
  snapshot: BattleSnapshot,
  activeActor: AgentSnapshot,
  segment: AttackSegment,
): {
  actor: AgentSnapshot
  traceRows: VirtualAgentTraceRow[]
} {
  const contribution = segment.anomalyContribution
  const contributors = contribution?.contributors ?? [
    {
      actorId: segment.actorId ?? activeActor.agentId,
      buildup: contribution?.buildup ?? 1,
      included: true,
    },
  ]
  const overflowBuildup = contribution?.overflowBuildup ?? 0
  const effectiveBuildupByIndex = getEffectiveBuildupByContributor(contributors, overflowBuildup)
  const rows: Array<VirtualAgentTraceRow & { attack: number; impact: number; anomalyProficiency: number; anomalyMastery: number; penetrationRate: number; flatPenetration: number }> = []

  contributors.forEach((contributor, contributorIndex) => {
    const agent = snapshot.team.find(candidate => candidate.agentId === contributor.actorId) ?? activeActor
    const effectiveBuildup = contributor.included && contributor.excludedReason === undefined
      ? effectiveBuildupByIndex.get(contributorIndex) ?? contributor.buildup
      : 0

    rows.push({
      actorId: contributor.actorId,
      included: contributor.included,
      buildup: contributor.buildup,
      effectiveBuildup,
      buildupContributionRatio: 0,
      level: contributor.level ?? agent.level,
      flooredLevel: Math.floor(contributor.level ?? agent.level),
      ...(contributor.excludedReason === undefined ? {} : { excludedReason: contributor.excludedReason }),
      attack: agent.panel.attack,
      impact: agent.panel.impact ?? 0,
      anomalyProficiency: contributor.anomalyProficiency ?? agent.panel.anomalyProficiency ?? 100,
      anomalyMastery: Math.floor(contributor.anomalyMastery ?? agent.panel.anomalyMastery ?? 100),
      penetrationRate: agent.panel.penetrationRate ?? 0,
      flatPenetration: agent.panel.flatPenetration ?? 0,
    })
  })

  const totalEffectiveBuildup = sum(rows.map(row => row.effectiveBuildup))
  if (totalEffectiveBuildup <= 0) {
    return {
      actor: activeActor,
      traceRows: rows.map(row => ({
        actorId: row.actorId,
        included: row.included,
        buildup: row.buildup,
        effectiveBuildup: row.effectiveBuildup,
        buildupContributionRatio: 0,
        level: row.level,
        flooredLevel: row.flooredLevel,
        ...(row.excludedReason === undefined ? {} : { excludedReason: row.excludedReason }),
      })),
    }
  }

  rows.forEach((row) => {
    row.buildupContributionRatio = row.effectiveBuildup / totalEffectiveBuildup
  })

  const weightedLevel = Math.floor(sum(rows.map(row => row.flooredLevel * row.buildupContributionRatio)))
  const panel = {
    ...activeActor.panel,
    attack: sum(rows.map(row => row.attack * row.buildupContributionRatio)),
    impact: sum(rows.map(row => row.impact * row.buildupContributionRatio)),
    anomalyProficiency: sum(rows.map(row => row.anomalyProficiency * row.buildupContributionRatio)),
    anomalyMastery: sum(rows.map(row => row.anomalyMastery * row.buildupContributionRatio)),
    penetrationRate: sum(rows.map(row => row.penetrationRate * row.buildupContributionRatio)),
    flatPenetration: sum(rows.map(row => row.flatPenetration * row.buildupContributionRatio)),
  }

  return {
    actor: {
      ...activeActor,
      agentId: `virtual:${segment.id}`,
      level: Math.max(1, weightedLevel),
      panel,
    },
    traceRows: rows.map(row => ({
      actorId: row.actorId,
      included: row.included,
      buildup: row.buildup,
      effectiveBuildup: row.effectiveBuildup,
      buildupContributionRatio: row.buildupContributionRatio,
      level: row.level,
      flooredLevel: row.flooredLevel,
      ...(row.excludedReason === undefined ? {} : { excludedReason: row.excludedReason }),
    })),
  }
}

function getEffectiveBuildupByContributor(
  contributors: Array<{ buildup: number; included: boolean; excludedReason?: string | undefined }>,
  overflowBuildup: number,
): Map<number, number> {
  const effective = new Map<number, number>()
  let remainingOverflow = Math.max(0, overflowBuildup)

  for (let index = contributors.length - 1; index >= 0; index -= 1) {
    const contributor = contributors[index]!
    if (!contributor.included || contributor.excludedReason !== undefined)
      continue

    const overflowDeduction = Math.min(contributor.buildup, remainingOverflow)
    effective.set(index, contributor.buildup - overflowDeduction)
    remainingOverflow -= overflowDeduction
  }

  contributors.forEach((contributor, index) => {
    if (contributor.included && contributor.excludedReason === undefined && !effective.has(index))
      effective.set(index, contributor.buildup)
  })

  return effective
}

function getAnomalyThreshold(snapshot: BattleSnapshot, segment: AttackSegment): {
  threshold: number
  enemyRank: EnemyRank
  triggerCount: number
  status: AnomalyStatus | undefined
  physicalMultiplier: number
} {
  const status = segment.anomalyContribution?.status
  const triggerCount = clampTriggerCount(
    segment.anomalyContribution?.triggerCountBefore
    ?? (status === undefined ? 0 : snapshot.enemy.anomalyTriggerCounts?.[status] ?? 0),
  )
  const rank = snapshot.enemy.rank === "special" ? "boss" : snapshot.enemy.rank
  const physicalMultiplier = isPhysicalAnomaly(segment) ? 1.2 : 1
  const baseThreshold = anomalyThresholdTable[rank][triggerCount] ?? anomalyThresholdTable[rank][0]!
  return {
    threshold: segment.anomalyContribution?.thresholdOverride ?? baseThreshold * physicalMultiplier,
    enemyRank: snapshot.enemy.rank,
    triggerCount,
    status,
    physicalMultiplier,
  }
}

const anomalyThresholdTable: Record<Exclude<EnemyRank, "special">, number[]> = {
  normal: [600, 612, 624, 636, 648, 660, 673, 686, 699, 712],
  elite: [2250, 2295, 2340, 2386, 2433, 2481, 2530, 2580, 2631, 2683],
  boss: [3000, 3060, 3121, 3183, 3246, 3310, 3376, 3443, 3511, 3581],
}

function clampTriggerCount(count: number): number {
  return Math.max(0, Math.min(9, Math.floor(count)))
}

function isPhysicalAnomaly(segment: AttackSegment): boolean {
  return segment.attribute === "physical"
    || segment.anomalyContribution?.status === "assault"
    || segment.anomalyContribution?.status === "flinch"
}

function getDisorderFormula(segment: AttackSegment): {
  formulaId: string
  formula: string
  multiplier: number
  remainingDurationSeconds: number
} {
  const status = segment.anomalyContribution?.status ?? "disorder"
  const remainingDurationSeconds = segment.anomalyContribution?.remainingDurationSeconds ?? getDefaultDisorderDuration(segment)
  const formulaId = getDisorderFormulaId(segment, status)
  switch (formulaId) {
    case "disorder-polarity":
      return {
        formulaId,
        remainingDurationSeconds,
        formula: "polarity disorder multiplier = electric disorder multiplier * 0.15 unless segment.multiplier overrides it",
        multiplier: segment.multiplier ?? (4.5 + Math.floor(remainingDurationSeconds) * 1.25) * 0.15,
      }
    case "disorder-burn":
      return {
        formulaId,
        remainingDurationSeconds,
        formula: "burn disorder multiplier = 4.5 + floor(T / 0.5) * 0.5",
        multiplier: 4.5 + Math.floor(remainingDurationSeconds / 0.5) * 0.5,
      }
    case "disorder-shock":
      return {
        formulaId,
        remainingDurationSeconds,
        formula: "shock disorder multiplier = 4.5 + floor(T) * 1.25",
        multiplier: 4.5 + Math.floor(remainingDurationSeconds) * 1.25,
      }
    case "disorder-corruption":
      return {
        formulaId,
        remainingDurationSeconds,
        formula: "corruption disorder multiplier = 4.5 + floor(T / 0.5) * 0.625",
        multiplier: 4.5 + Math.floor(remainingDurationSeconds / 0.5) * 0.625,
      }
    case "disorder-frost":
      return {
        formulaId,
        remainingDurationSeconds,
        formula: "frost disorder multiplier = 6 + floor(T) * 0.75",
        multiplier: 6 + Math.floor(remainingDurationSeconds) * 0.75,
      }
    case "disorder-physical-or-ice":
    default:
      return {
        formulaId,
        remainingDurationSeconds,
        formula: "physical/ice disorder multiplier = 4.5 + floor(T) * 0.075",
        multiplier: 4.5 + Math.floor(remainingDurationSeconds) * 0.075,
      }
  }
}

function getDefaultDisorderDuration(segment: AttackSegment): number {
  return segment.attribute === "frost" ? 20 : 10
}

function getDisorderFormulaId(segment: AttackSegment, status: AnomalyStatus): string {
  if (status === "polarityDisorder")
    return "disorder-polarity"
  if (status === "burn")
    return "disorder-burn"
  if (status === "shock")
    return "disorder-shock"
  if (status === "corruption" || segment.attribute === "ether" || segment.attribute === "auricInk")
    return "disorder-corruption"
  if (segment.attribute === "frost")
    return "disorder-frost"
  return "disorder-physical-or-ice"
}

function getDisorderDazeLevelMultiplier(level: number): number {
  return 1 + 0.0075 * level
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
      return "baseDamageZone * damageBonusZone * anomalyProficiencyZone * defenseZone * resistanceZone * vulnerabilityZone * dazeVulnerabilityZone * damageLevelZone * anomalyDamageBonusZone * anomalyCritZone * disorderDazeLevelZone * specialZone"
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
