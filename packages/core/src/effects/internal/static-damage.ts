import {
  anomalyDamageFormula,
  calculateDefenseLevelBase,
  calculateRefringeMultiplier,
  calculateTargetEffectiveDefense,
  damageBonusFactor,
  luminizeDamageFormula,
  regularDamageFormula,
  sheerDamageFormula,
} from "../../formulas.ts"
import type {
  EffectInstance,
  EntityId,
  FactorChannel,
  HitContext,
  NonEmpty,
  Result,
  StaticDamageInput,
  StaticDamageParameters,
  StaticDamageResult,
  StaticEffectSelection,
  Stat,
} from "../types.ts"
import {
  expectArray,
  expectBoolean,
  expectFiniteNumber,
  expectObject,
  rejectUnknownFields,
  type FieldChecks,
} from "./checks.ts"
import { evaluateEffects } from "./evaluate.ts"
import { IssueCollector, failure } from "./issues.ts"
import { prepareSelectedEffects, readPreparedInternal } from "./prepare.ts"
import { supplyEffectState } from "./state.ts"
import { DAMAGE_KINDS, isEffectId, isIdentityString } from "./vocabulary.ts"
import {
  validateHitContext,
  validateSnapshots,
  validateWorldObservation,
} from "./world.ts"

function validateNumberArray(value: unknown, checks: FieldChecks): void {
  const values = expectArray(value, checks, "numeric contributions")
  if (values === undefined) return
  for (const [index, entry] of values.entries()) {
    expectFiniteNumber(
      entry,
      { ...checks, pointer: `${checks.pointer}/${index}` },
      "numeric contribution",
    )
  }
}

function validateDamageFields(
  value: unknown,
  collector: IssueCollector,
): value is StaticDamageParameters {
  const checks = {
    collector,
    structureCode: "INVALID_INPUT" as const,
    pointer: "/damage",
  }
  const object = expectObject(value, checks, "static damage parameters")
  if (object === undefined) return false
  const kind = object["kind"]
  if (
    typeof kind !== "string" ||
    !DAMAGE_KINDS.includes(kind as StaticDamageParameters["kind"])
  ) {
    collector.report(
      "INVALID_INPUT",
      "/damage/kind",
      "A supported damage kind is required",
    )
    return false
  }
  const fields = [
    "kind",
    "damageBonus",
    "resistance",
    "damageTaken",
    "stunDamage",
  ]
  if (kind === "sheer") fields.push("sheerDamageBonus")
  else fields.push("defense")
  if (kind !== "regular" && kind !== "sheer") {
    fields.push("anomalyDamageBonus", "refringe")
    if (kind === "luminize") fields.push("luminizeMultiplier")
    else fields.push("anomalyCriticalRate", "anomalyCriticalDamage")
  }
  rejectUnknownFields(object, fields, checks, "static damage parameters")
  if (Array.isArray(object["damageBonus"])) {
    validateNumberArray(object["damageBonus"], {
      ...checks,
      pointer: "/damage/damageBonus",
    })
  } else {
    if (kind === "regular" || kind === "sheer") {
      collector.report(
        "INVALID_INPUT",
        "/damage/damageBonus",
        "Regular and sheer damage require damage bonus contributions",
      )
    } else {
      const bonusChecks = { ...checks, pointer: "/damage/damageBonus" }
      const bonus = expectObject(
        object["damageBonus"],
        bonusChecks,
        "settled damage bonus",
      )
      if (bonus !== undefined) {
        rejectUnknownFields(
          bonus,
          ["settledMultiplier"],
          bonusChecks,
          "settled damage bonus",
        )
        expectFiniteNumber(
          bonus["settledMultiplier"],
          { ...checks, pointer: "/damage/damageBonus/settledMultiplier" },
          "settled damage bonus multiplier",
        )
      }
    }
  }
  for (const field of fields) {
    if (object[field] === undefined)
      collector.report(
        "INVALID_INPUT",
        `/damage/${field}`,
        `Required field "${field}" is missing`,
      )
  }
  for (const field of [
    "sheerDamageBonus",
    "anomalyDamageBonus",
    "anomalyCriticalDamage",
  ]) {
    if (fields.includes(field))
      validateNumberArray(object[field], {
        ...checks,
        pointer: `/damage/${field}`,
      })
  }
  if (fields.includes("anomalyCriticalRate"))
    expectFiniteNumber(
      object["anomalyCriticalRate"],
      { ...checks, pointer: "/damage/anomalyCriticalRate" },
      "anomaly critical rate",
    )
  const nestedFields: Readonly<
    Record<
      string,
      Readonly<Record<string, "number" | "number-array" | "boolean">>
    >
  > = {
    resistance: {
      targetResistance: "number",
      targetResistanceReductions: "number-array",
      attackerResistanceIgnoreValues: "number-array",
    },
    damageTaken: {
      targetDamageTakenIncreases: "number-array",
      targetDamageTakenReductions: "number-array",
    },
    stunDamage: {
      isTargetStunned: "boolean",
      targetBaseStunDamageMultiplier: "number",
      targetStunDamageMultiplierAdjustments: "number-array",
    },
    defense: {
      attackerLevel: "number",
      targetBaseDefense: "number",
      defensePercentageAdjustments: "number-array",
      penetrationValues: "number-array",
    },
    refringe: {
      remielleAnomalyProficiency: "number",
      refringeCoefficientIncreases: "number-array",
    },
    luminizeMultiplier: {
      baseLuminizeMultiplier: "number",
      remielleAnomalyProficiency: "number",
      anomalyProficiencyConversionRate: "number",
      multiplicativeLuminizeMultiplierAdjustments: "number-array",
    },
  }
  for (const field of fields) {
    const allowed =
      field === "refringe" &&
      typeof object[field] === "object" &&
      object[field] !== null &&
      "settledMultiplier" in object[field]
        ? { settledMultiplier: "number" as const }
        : nestedFields[field]
    if (allowed === undefined) continue
    const nestedChecks = { ...checks, pointer: `/damage/${field}` }
    const nested = expectObject(object[field], nestedChecks, field)
    if (nested === undefined) continue
    rejectUnknownFields(nested, Object.keys(allowed), nestedChecks, field)
    for (const [key, type] of Object.entries(allowed)) {
      const valueChecks = {
        ...checks,
        pointer: `${nestedChecks.pointer}/${key}`,
      }
      if (type === "number-array") validateNumberArray(nested[key], valueChecks)
      else if (type === "boolean") expectBoolean(nested[key], valueChecks, key)
      else expectFiniteNumber(nested[key], valueChecks, key)
    }
  }
  return collector.isEmpty
}

function validateSelections(
  value: unknown,
  collector: IssueCollector,
): readonly StaticEffectSelection[] | undefined {
  const checks = {
    collector,
    structureCode: "INVALID_INPUT" as const,
    pointer: "/selections",
  }
  const selections = expectArray(value, checks, "effect selections")
  if (selections === undefined) return undefined
  const seen = new Set<string>()
  for (const [index, selection] of selections.entries()) {
    const pointer = `/selections/${index}`
    const object = expectObject(
      selection,
      { ...checks, pointer },
      "effect selection",
    )
    if (object === undefined) continue
    if (!isEffectId(object["effectId"]))
      collector.report(
        "INVALID_INPUT",
        `${pointer}/effectId`,
        "A stable effect identity is required",
      )
    if (!isIdentityString(object["bindingId"], "binding"))
      collector.report(
        "INVALID_INPUT",
        `${pointer}/bindingId`,
        "A binding identity is required",
      )
    const layers = object["layers"]
    if (
      typeof layers !== "number" ||
      !Number.isSafeInteger(layers) ||
      layers < 1
    ) {
      collector.report(
        "INVALID_INPUT",
        `${pointer}/layers`,
        "Selected layers must be a positive safe integer",
      )
    }
    const key = JSON.stringify([object["bindingId"], object["effectId"]])
    if (seen.has(key))
      collector.report(
        "DUPLICATE_ID",
        pointer,
        "Select each bound effect only once",
      )
    seen.add(key)
    if (object["trigger"] !== undefined)
      expectObject(
        object["trigger"],
        { ...checks, pointer: `${pointer}/trigger` },
        "trigger context",
      )
    rejectUnknownFields(
      object,
      ["effectId", "bindingId", "layers", "trigger"],
      { ...checks, pointer },
      "effect selection",
    )
  }
  return collector.isEmpty
    ? (selections as unknown as readonly StaticEffectSelection[])
    : undefined
}

/** 每次调用建立独立静态状态；不推进事件、不推断默认 buff 或历史读取值。 */
export function calculateStaticDamage(
  input: StaticDamageInput,
): Result<StaticDamageResult> {
  const evaluated = evaluateStaticDamage(input)
  if (!evaluated.ok) return evaluated
  const collector = new IssueCollector()
  try {
    return {
      ok: true,
      value: calculateDamageFromEvaluation(
        input.damage,
        evaluated.value.hit,
        evaluated.value.evaluation,
      ),
    }
  } catch (error) {
    collector.report(
      "INVALID_INPUT",
      "/damage",
      error instanceof Error ? error.message : String(error),
    )
    return failure(collector)
  }
}

/** 目录适配复用同一校验、选择、依赖展开与求值，再准备 core 的派生输入。 */
export function evaluateStaticDamage(input: StaticDamageInput): Result<{
  readonly hit: HitContext
  readonly evaluation: StaticDamageResult["evaluation"]
}> {
  const collector = new IssueCollector()
  const checks = {
    collector,
    structureCode: "INVALID_INPUT" as const,
    pointer: "",
  }
  const object = expectObject(input, checks, "static damage input")
  if (object === undefined) return failure(collector)
  rejectUnknownFields(
    object,
    [
      "definitions",
      "bindings",
      "selections",
      "world",
      "hit",
      "damage",
      "inputs",
      "snapshots",
      "atSeconds",
    ],
    checks,
    "static damage input",
  )
  const selections = validateSelections(object["selections"], collector)
  const world = validateWorldObservation(object["world"], collector, "/world")
  const snapshots = validateSnapshots(
    object["snapshots"] === undefined ? [] : object["snapshots"],
    collector,
    "/snapshots",
  )
  const atSeconds = expectFiniteNumber(
    object["atSeconds"] === undefined ? 0 : object["atSeconds"],
    { ...checks, pointer: "/atSeconds" },
    "snapshot time",
  )
  if (atSeconds !== undefined && atSeconds < 0)
    collector.report(
      "INVALID_INPUT",
      "/atSeconds",
      "Snapshot time must be non-negative",
    )
  const damageValid = validateDamageFields(object["damage"], collector)
  const hitObject = expectObject(
    object["hit"],
    { ...checks, pointer: "/hit" },
    "static hit",
  )
  if (hitObject !== undefined) {
    rejectUnknownFields(
      hitObject,
      [
        "actorId",
        "targetId",
        "actionId",
        "skillCategory",
        "skillTags",
        "attributeSources",
        "damageItems",
        "element",
        "actionSnapshotId",
      ],
      { ...checks, pointer: "/hit" },
      "static hit",
    )
    if (hitObject["element"] === undefined)
      collector.report(
        "MISSING_FACT",
        "/hit/element",
        "Static damage requires the hit element",
      )
  }
  if (
    !collector.isEmpty ||
    selections === undefined ||
    world === undefined ||
    snapshots === undefined ||
    atSeconds === undefined ||
    !damageValid ||
    hitObject === undefined
  )
    return failure(collector)
  const hit = validateHitContext(
    {
      ...hitObject,
      hitId: "hit:static",
      actionInstanceId: "action-instance:static",
      actionSnapshotId:
        hitObject["actionSnapshotId"] === undefined
          ? "snapshot:static-action"
          : hitObject["actionSnapshotId"],
      damageKind: input.damage.kind,
      targetState: input.damage.stunDamage.isTargetStunned
        ? "stunned"
        : "not-stunned",
      origin: { kind: "direct" },
    },
    collector,
    "/hit",
  )
  if (hit === undefined || !collector.isEmpty) return failure(collector)
  if (!world.actors.has(hit.actorId) || !world.actors.has(hit.targetId)) {
    collector.report(
      "MISSING_FACT",
      "/hit",
      "Both hit actor and target must be observed actors",
    )
    return failure(collector)
  }
  const prepared = prepareSelectedEffects(
    input.definitions,
    input.bindings,
    new Set(
      selections.map((selection) =>
        JSON.stringify([selection.bindingId, selection.effectId]),
      ),
    ),
  )
  if (!prepared.ok) return prepared
  const internal = readPreparedInternal(prepared.value)!
  const instances: EffectInstance[] = []
  for (const [index, selection] of selections.entries()) {
    const pointer = `/selections/${index}`
    const entry = internal.contributions.find(
      (candidate) =>
        candidate.bindingId === selection.bindingId &&
        candidate.rule.effectId === selection.effectId,
    )
    if (entry === undefined || entry.rule.activation.kind !== "supplied") {
      collector.report(
        "CONTEXT_MISMATCH",
        pointer,
        "A selected effect must be an eligible supplied contribution under this configuration",
        { bindingId: selection.bindingId, effectId: selection.effectId },
      )
      continue
    }
    // 旧 supplied 规则未声明叠层时，静态选择只允许一层。
    const maximum =
      entry.rule.activation.maximumLayers === undefined
        ? 1
        : entry.resolvedLayerMaximum
    if (selection.layers > maximum) {
      collector.report(
        "INVALID_INPUT",
        `${pointer}/layers`,
        `Selected layers exceed the declared maximum of ${maximum}`,
      )
      continue
    }
    const holder = world.actors.get(entry.holderId)
    if (holder === undefined) {
      collector.report(
        "MISSING_FACT",
        pointer,
        `Holder "${entry.holderId}" is not observed`,
      )
      continue
    }
    let beneficiaryIds: EntityId[]
    switch (entry.rule.beneficiary.kind) {
      case "holder":
        beneficiaryIds = [entry.holderId]
        break
      case "holder-and-trigger-actor": {
        const actorId = selection.trigger?.actorId
        if (
          actorId === undefined ||
          world.actors.get(actorId)?.teamId !== holder.teamId
        ) {
          collector.report(
            "MISSING_FACT",
            `${pointer}/trigger/actorId`,
            "This effect requires an observed trigger actor on the holder's team",
          )
          continue
        }
        beneficiaryIds = [...new Set([entry.holderId, actorId])]
        break
      }
      default:
        beneficiaryIds = [...world.actors.values()]
          .filter(
            (actor) =>
              actor.teamId === holder.teamId &&
              (entry.rule.beneficiary.kind === "team" ||
                actor.entityId !== entry.holderId),
          )
          .map((actor) => actor.entityId)
    }
    if (beneficiaryIds.length === 0) {
      collector.report(
        "MISSING_FACT",
        pointer,
        "The selected effect has no beneficiaries in this snapshot",
      )
      continue
    }
    const activationSnapshot =
      selection.trigger === undefined
        ? undefined
        : snapshots.find(
            (snapshot) =>
              snapshot.snapshotId === selection.trigger!.activationSnapshotId,
          )
    instances.push({
      instanceId: `instance:static:${index}`,
      effectId: selection.effectId,
      bindingId: selection.bindingId,
      beneficiaryIds: beneficiaryIds as unknown as NonEmpty<EntityId>,
      stackKey: [],
      lifetime: { kind: "supplied" },
      layers: Array.from({ length: selection.layers }, (_, layer) => ({
        layerId: `layer:static:${index}:${layer}` as const,
        startedAt: activationSnapshot?.atSeconds ?? atSeconds,
        expiresAt: null,
        trigger: selection.trigger ?? null,
      })) as unknown as EffectInstance["layers"],
    })
  }
  if (!collector.isEmpty) return failure(collector)
  const state = supplyEffectState(prepared.value, {
    sessionId: "session:static",
    atSeconds,
    instances,
    snapshots,
    cooldowns: [],
    eventHistory: { processedIds: [], last: null },
  })
  if (!state.ok) return state
  const kind = input.damage.kind
  const stats: NonEmpty<Stat> =
    kind === "regular"
      ? ["criticalDamage", "penetrationRatio"]
      : kind === "sheer"
        ? ["criticalDamage"]
        : ["anomalyProficiency", "penetrationRatio"]
  const evaluated = evaluateEffects(prepared.value, state.value, {
    kind: "hit",
    atSeconds,
    world: input.world,
    observedSnapshots: [],
    hit,
    stats,
    ...(input.inputs === undefined ? {} : { inputs: input.inputs }),
  })
  if (!evaluated.ok) return evaluated
  return { ok: true, value: { hit, evaluation: evaluated.value } }
}

function finiteSum(values: readonly number[]): number {
  let sum = 0
  for (const value of values) {
    if (!Number.isFinite(value))
      throw new Error("Damage inputs must be finite numbers")
    sum += value
    if (!Number.isFinite(sum))
      throw new Error("Damage contribution sum is not finite")
  }
  return sum
}

export function calculateDamageFromEvaluation(
  damage: StaticDamageParameters,
  hit: HitContext,
  evaluation: StaticDamageResult["evaluation"],
): StaticDamageResult {
  const applicableChannels = new Set<FactorChannel>()
  const take = (channel: FactorChannel): number[] => {
    applicableChannels.add(channel)
    return evaluation.contributions
      .filter(
        (entry) =>
          entry.address.kind === "factor" &&
          entry.address.channel === channel &&
          entry.address.entityId === hit.actorId,
      )
      .map((entry) => entry.value.value)
  }
  const stat = (name: Stat): number => {
    const value = evaluation.attributes.find(
      (attribute) =>
        attribute.stat === name &&
        attribute.entityId ===
          (hit.attributeSources?.[name]?.entityId ?? hit.actorId) &&
        attribute.snapshotId === hit.attributeSources?.[name]?.snapshotId,
    )?.value.value
    if (value === undefined)
      throw new Error(`Required damage attribute "${name}" was not evaluated`)
    return value
  }
  const common = {
    baseDamage: evaluation.hit!.damageItems,
    damageBonus:
      "settledMultiplier" in damage.damageBonus
        ? []
        : [...damage.damageBonus, ...take("damage-bonus")],
    resistance: {
      targetResistance: damage.resistance.targetResistance,
      targetResistanceReductions: [
        ...damage.resistance.targetResistanceReductions,
        ...take("target-resistance-reduction"),
      ],
      attackerResistanceIgnoreValues: [
        ...damage.resistance.attackerResistanceIgnoreValues,
        ...take("attacker-resistance-ignore"),
      ],
    },
    damageTaken: {
      targetDamageTakenIncreases: [
        ...damage.damageTaken.targetDamageTakenIncreases,
        ...take("damage-taken-increase"),
      ],
      targetDamageTakenReductions: [
        ...damage.damageTaken.targetDamageTakenReductions,
        ...take("damage-taken-reduction"),
      ],
    },
    stunDamage: {
      ...damage.stunDamage,
      targetStunDamageMultiplierAdjustments: [
        ...damage.stunDamage.targetStunDamageMultiplierAdjustments,
        ...take("stun-damage-adjustment"),
      ],
    },
  }
  const defense =
    damage.kind === "sheer"
      ? undefined
      : {
          attackerLevelBase: calculateDefenseLevelBase(
            damage.defense.attackerLevel,
          ),
          targetEffectiveDefense: calculateTargetEffectiveDefense({
            targetBaseDefense: damage.defense.targetBaseDefense,
            defensePercentageAdjustments: [
              ...damage.defense.defensePercentageAdjustments,
              ...take("target-defense-adjustment"),
            ],
            penetrationRatios: [stat("penetrationRatio")],
            penetrationValues: [
              ...damage.defense.penetrationValues,
              ...take("attacker-penetration-value"),
            ],
          }),
        }
  let nonCritical: {
    value: number
    factorResults: Readonly<Record<string, number>>
  }
  let critical: typeof nonCritical | null
  let rate: number
  if (damage.kind === "regular" || damage.kind === "sheer") {
    const criticalInput = {
      isCritical: false,
      criticalDamageContributions: [stat("criticalDamage")],
    }
    if (damage.kind === "regular") {
      const input = { ...common, defense: defense!, critical: criticalInput }
      nonCritical = regularDamageFormula.calculate(input)
      critical = regularDamageFormula.calculate({
        ...input,
        critical: { ...criticalInput, isCritical: true },
      })
    } else {
      const input = {
        ...common,
        sheerDamageBonus: [
          ...damage.sheerDamageBonus,
          ...take("sheer-damage-bonus"),
        ],
        critical: criticalInput,
      }
      nonCritical = sheerDamageFormula.calculate(input)
      critical = sheerDamageFormula.calculate({
        ...input,
        critical: { ...criticalInput, isCritical: true },
      })
    }
    rate = evaluation.hit!.criticalRate
  } else {
    const input = {
      ...common,
      damageBonus:
        "settledMultiplier" in damage.damageBonus
          ? damage.damageBonus.settledMultiplier
          : damageBonusFactor.calculate(common.damageBonus),
      defense: defense!,
      anomalyProficiency: stat("anomalyProficiency"),
      anomalyDamageLevel: damage.defense.attackerLevel,
      anomalyDamageBonus: [
        ...damage.anomalyDamageBonus,
        ...take("anomaly-damage-bonus"),
      ],
      refringe:
        "settledMultiplier" in damage.refringe
          ? damage.refringe.settledMultiplier
          : calculateRefringeMultiplier({
              ...damage.refringe,
              refringeCoefficientIncreases: [
                ...damage.refringe.refringeCoefficientIncreases,
                ...take("refringe-coefficient-increase"),
              ],
            }),
    }
    if (damage.kind === "luminize") {
      nonCritical = luminizeDamageFormula.calculate({
        ...input,
        luminizeMultiplier: {
          ...damage.luminizeMultiplier,
          baseLuminizeMultiplier: finiteSum([
            damage.luminizeMultiplier.baseLuminizeMultiplier,
            ...take("luminize-multiplier-addition"),
          ]),
          multiplicativeLuminizeMultiplierAdjustments: [
            ...damage.luminizeMultiplier
              .multiplicativeLuminizeMultiplierAdjustments,
            ...take("luminize-multiplier-scale"),
          ],
        },
      })
      critical = null
      rate = 0
    } else {
      const anomalyCritical = {
        isAnomalyCritical: false,
        anomalyCriticalDamageContributions: [
          ...damage.anomalyCriticalDamage,
          ...take("anomaly-critical-damage"),
        ],
      }
      nonCritical = anomalyDamageFormula.calculate({
        ...input,
        anomalyCritical,
      })
      critical = anomalyDamageFormula.calculate({
        ...input,
        anomalyCritical: { ...anomalyCritical, isAnomalyCritical: true },
      })
      rate = finiteSum([
        damage.anomalyCriticalRate,
        ...take("anomaly-critical-rate"),
      ])
    }
  }
  if (!Number.isFinite(rate)) throw new Error("Critical rate must be finite")
  const criticalRate = Math.min(1, Math.max(0, rate))
  const expected =
    critical === null
      ? nonCritical.value
      : (1 - criticalRate) * nonCritical.value + criticalRate * critical.value
  if (!Number.isFinite(expected))
    throw new Error("Expected damage is not finite")
  return {
    evaluation,
    nonCritical: nonCritical.value,
    critical: critical?.value ?? null,
    criticalRate,
    expected,
    factors: {
      nonCritical: nonCritical.factorResults,
      critical: critical?.factorResults ?? null,
    },
    notApplicableContributions: evaluation.contributions.filter(
      (entry) =>
        entry.address.kind === "factor" &&
        !applicableChannels.has(entry.address.channel),
    ),
  }
}
