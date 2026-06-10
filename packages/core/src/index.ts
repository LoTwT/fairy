export type ZoneMode =
  | "constant"
  | "additive-one-plus"
  | "ratio"
  | "basic-regular"
  | "basic-sheer"
  | "basic-anomaly"
  | "crit"
  | "defence"
  | "resist"
  | "vulnerability"
  | "stun-vulnerability"
  | "anomaly-mastery"
  | "damage-level"
  | "anomaly-boost"
  | "anomaly-crit"
  | "disorder-multiplier"

export type DisorderAnomalyType =
  | "burn"
  | "shock"
  | "etherCorruption"
  | "iceFrostbite"
  | "physicalFlinch"
  | "auricInkCorruption"
  | "frostFrostbite"

export interface DamageContext {
  readonly [key: string]: unknown
}

export interface NumberPath {
  readonly path: string
}

export interface BooleanPath {
  readonly path: string
}

export type NumberInput = number | NumberPath
export type BooleanInput = boolean | BooleanPath
export type ClampRange = readonly [min: number, max: number]

export interface ProductTerm {
  readonly multiplier: NumberInput
  readonly stat: NumberInput
}

export interface ConstantParams {
  readonly value: NumberInput
}

export interface AdditiveOnePlusParams {
  readonly values?: readonly NumberInput[]
  readonly valuesPath?: string
}

export interface RatioParams {
  readonly numerator: NumberInput
  readonly denominator: NumberInput
}

export interface SumProductsParams {
  readonly entries?: readonly ProductTerm[]
  readonly entriesPath?: string
}

export interface CritParams {
  readonly crit?: BooleanInput
  readonly expectation?: BooleanInput
  readonly critRate: NumberInput
  readonly critDmg: NumberInput
}

export interface DefenceParams {
  readonly attackerLevelBase: NumberInput
  readonly effectiveDef: NumberInput
}

export interface ResistParams {
  readonly resist: NumberInput
  readonly resistDown?: NumberInput
  readonly ignoreResist?: NumberInput
}

export interface VulnerabilityParams {
  readonly vulnerability?: NumberInput
  readonly damageReduction?: NumberInput
}

export interface StunVulnerabilityParams {
  readonly staggered: BooleanInput
  readonly targetHasStaggerBar?: BooleanInput
  readonly stunVulnMult?: NumberInput
  readonly unstaggeredStunVulnMult?: NumberInput
}

export interface AnomalyMasteryParams {
  readonly anomalyMastery: NumberInput
}

export interface DamageLevelParams {
  readonly level: NumberInput
}

export interface DisorderMultiplierParams {
  readonly anomalyType: DisorderAnomalyType
  readonly remainingDuration: NumberInput
}

export type ZoneParams =
  | ConstantParams
  | AdditiveOnePlusParams
  | RatioParams
  | SumProductsParams
  | CritParams
  | DefenceParams
  | ResistParams
  | VulnerabilityParams
  | StunVulnerabilityParams
  | AnomalyMasteryParams
  | DamageLevelParams
  | DisorderMultiplierParams

export interface ZoneSpec<TParams extends ZoneParams = ZoneParams> {
  readonly key: string
  readonly label?: string
  readonly order: number
  readonly mode: ZoneMode
  readonly params: TParams
  readonly clamp?: ClampRange
  readonly tags?: readonly string[]
  readonly source?: string
}

export interface CompiledZone {
  readonly key: string
  readonly order: number
  readonly clamp?: ClampRange
  readonly clampFor?: (ctx: DamageContext) => ClampRange | undefined
  readonly evaluate: (ctx: DamageContext) => number
}

export interface ZoneBreakdownEntry {
  readonly raw: number
  readonly clamped: number
  readonly clampApplied: boolean
}

export interface DamageResult {
  readonly rawTotal: number
  readonly total: number
  readonly breakdown: Record<string, ZoneBreakdownEntry>
}

export interface MultiHitDamageResult {
  readonly rawTotal: number
  readonly total: number
  readonly hits: readonly DamageResult[]
}

export interface EffectiveDefenceInput {
  readonly baseDef: number
  readonly defBonus?: number
  readonly defDown?: number
  readonly ignoreDef?: number
  readonly penRatio?: number
  readonly penValue?: number
}

const MAX_DAMAGE_FACTOR = Number.MAX_SAFE_INTEGER

const zoneOrder = {
  basic: 10,
  boost: 20,
  crit: 30,
  defence: 40,
  sheerBoost: 40,
  resist: 50,
  vulnerability: 60,
  stunVulnerability: 70,
  damageLevel: 80,
  anomalyBoost: 90,
  anomalyCrit: 100,
  special: 110,
} as const

export function finalStat(
  base: number,
  initBonusPct = 0,
  initFixed = 0,
  finalBonusPct = 0,
  finalFixed = 0,
): number {
  const initial =
    finite(base, "base") * (1 + finite(initBonusPct, "initBonusPct")) +
    finite(initFixed, "initFixed")

  return (
    initial * (1 + finite(finalBonusPct, "finalBonusPct")) +
    finite(finalFixed, "finalFixed")
  )
}

export function effectiveDefence(input: EffectiveDefenceInput): number {
  const baseDef = finite(input.baseDef, "baseDef")
  const defBonus = finite(input.defBonus ?? 0, "defBonus")
  const defDown = finite(input.defDown ?? 0, "defDown")
  const ignoreDef = finite(input.ignoreDef ?? 0, "ignoreDef")
  const penRatio = finite(input.penRatio ?? 0, "penRatio")
  const penValue = finite(input.penValue ?? 0, "penValue")

  return Math.max(
    0,
    baseDef * (1 + defBonus - defDown - ignoreDef) * (1 - penRatio) - penValue,
  )
}

export function sumProducts(
  entries: readonly ProductTerm[],
  ctx: DamageContext,
): number {
  return entries.reduce((total, entry, index) => {
    const multiplier = resolveNumber(
      entry.multiplier,
      ctx,
      `entries[${index}].multiplier`,
    )
    const stat = resolveNumber(entry.stat, ctx, `entries[${index}].stat`)

    return total + multiplier * stat
  }, 0)
}

export function damageLevelMultiplier(level: number): number {
  const raw = 1 + (finite(level, "level") - 1) / 59

  return Math.trunc(raw * 10000) / 10000
}

export function disorderMultiplier(
  anomalyType: DisorderAnomalyType,
  remainingDuration: number,
): number {
  const duration = finite(remainingDuration, "remainingDuration")
  const config = disorderMultiplierConfig[anomalyType]

  if (!config) {
    throw new Error(`Unknown disorder anomaly type: ${anomalyType}`)
  }

  return config.base + Math.floor(duration / config.stepSeconds) * config.step
}

export function compile(spec: ZoneSpec): CompiledZone {
  validateZoneSpec(spec)
  const clampFor = dynamicClampFor(spec)

  return {
    key: spec.key,
    order: spec.order,
    ...(spec.clamp ? { clamp: spec.clamp } : {}),
    ...(clampFor ? { clampFor } : {}),
    evaluate: (ctx) => evaluateZoneSpec(spec, ctx),
  }
}

export function computeDamage(
  pipeline: readonly ZoneSpec[],
  ctx: DamageContext = {},
): DamageResult {
  assertUniqueKeys(pipeline)

  const compiledZones = pipeline
    .map((spec, index) => ({ zone: compile(spec), index }))
    .toSorted(
      (left, right) =>
        left.zone.order - right.zone.order || left.index - right.index,
    )

  const breakdown: Record<string, ZoneBreakdownEntry> = {}
  let rawTotal = 1

  for (const { zone } of compiledZones) {
    const raw = finite(zone.evaluate(ctx), `${zone.key}.raw`)
    const clamped = clamp(raw, zone.clampFor?.(ctx) ?? zone.clamp)

    breakdown[zone.key] = {
      raw,
      clamped,
      clampApplied: clamped !== raw,
    }
    rawTotal *= clamped
  }

  return {
    rawTotal,
    total: Math.ceil(rawTotal),
    breakdown,
  }
}

export function computeMultiHitDamage(
  hits: readonly {
    readonly pipeline: readonly ZoneSpec[]
    readonly ctx?: DamageContext
  }[],
): MultiHitDamageResult {
  const results = hits.map((hit) => computeDamage(hit.pipeline, hit.ctx ?? {}))

  return {
    rawTotal: results.reduce((total, result) => total + result.rawTotal, 0),
    total: results.reduce((total, result) => total + result.total, 0),
    hits: results,
  }
}

export function addZone(
  pipeline: readonly ZoneSpec[],
  spec: ZoneSpec,
): ZoneSpec[] {
  assertUniqueKeys(pipeline)
  validateZoneSpec(spec)

  if (pipeline.some((zone) => zone.key === spec.key)) {
    throw new Error(`Zone already exists: ${spec.key}`)
  }

  return [...pipeline, spec]
}

export function replaceZone(
  pipeline: readonly ZoneSpec[],
  key: string,
  spec: ZoneSpec,
): ZoneSpec[] {
  assertUniqueKeys(pipeline)
  validateZoneSpec(spec)

  if (spec.key !== key) {
    throw new Error(
      `Replacement key mismatch: expected ${key}, got ${spec.key}`,
    )
  }

  let replaced = false
  const next = pipeline.map((zone) => {
    if (zone.key !== key) {
      return zone
    }

    replaced = true
    return spec
  })

  if (!replaced) {
    throw new Error(`Zone does not exist: ${key}`)
  }

  return next
}

export function removeZone(
  pipeline: readonly ZoneSpec[],
  key: string,
): ZoneSpec[] {
  assertUniqueKeys(pipeline)

  if (!pipeline.some((zone) => zone.key === key)) {
    throw new Error(`Zone does not exist: ${key}`)
  }

  return pipeline.filter((zone) => zone.key !== key)
}

export function upsertZone(
  pipeline: readonly ZoneSpec[],
  spec: ZoneSpec,
): ZoneSpec[] {
  assertUniqueKeys(pipeline)
  validateZoneSpec(spec)

  if (!pipeline.some((zone) => zone.key === spec.key)) {
    return [...pipeline, spec]
  }

  return pipeline.map((zone) => (zone.key === spec.key ? spec : zone))
}

export function regularPipeline(): ZoneSpec[] {
  return [
    basicZone("basic-regular"),
    boostZone(),
    critZone("crit", zoneOrder.crit, [1, 6]),
    defenceZone(),
    resistZone(),
    vulnerabilityZone(),
    stunVulnerabilityZone(),
    specialZone(),
  ]
}

export function sheerPipeline(): ZoneSpec[] {
  return [
    basicZone("basic-sheer"),
    boostZone(),
    critZone("crit", zoneOrder.crit, [1, 6]),
    sheerBoostZone(),
    resistZone(),
    vulnerabilityZone(),
    stunVulnerabilityZone(),
    specialZone(),
  ]
}

export function anomalyPipeline(): ZoneSpec[] {
  return [
    basicZone("basic-anomaly"),
    boostZone(),
    anomalyMasteryZone(),
    defenceZone(),
    resistZone(),
    vulnerabilityZone(),
    stunVulnerabilityZone(),
    damageLevelZone(),
    anomalyBoostZone(),
    critZone("anomalyCrit", zoneOrder.anomalyCrit, [1, 3], "anomaly-crit"),
  ]
}

export function disorderPipeline(
  anomalyType: DisorderAnomalyType,
  remainingDuration: number,
): ZoneSpec[] {
  return replaceZone(anomalyPipeline(), "basic", {
    key: "basic",
    label: "BasicZone",
    order: zoneOrder.basic,
    mode: "basic-anomaly",
    params: {
      entries: [
        {
          multiplier: disorderMultiplier(anomalyType, remainingDuration),
          stat: { path: "basic.stat" },
        },
      ],
    },
    clamp: [0, MAX_DAMAGE_FACTOR],
  })
}

function basicZone(
  mode: "basic-regular" | "basic-sheer" | "basic-anomaly",
): ZoneSpec {
  return {
    key: "basic",
    label: "BasicZone",
    order: zoneOrder.basic,
    mode,
    params: {
      entriesPath: "basic.entries",
    },
    clamp: [0, MAX_DAMAGE_FACTOR],
  }
}

function boostZone(): ZoneSpec {
  return {
    key: "boost",
    label: "BoostZone",
    order: zoneOrder.boost,
    mode: "additive-one-plus",
    params: {
      valuesPath: "boost.values",
    },
    clamp: [0, 6],
  }
}

function critZone(
  key: string,
  order: number,
  clampRange: ClampRange,
  mode: "crit" | "anomaly-crit" = "crit",
): ZoneSpec {
  return {
    key,
    label: mode === "crit" ? "CritZone" : "AnomalyCritZone",
    order,
    mode,
    params: {
      expectation: { path: `${key}.expectation` },
      crit: { path: `${key}.isCrit` },
      critRate: { path: `${key}.rate` },
      critDmg: { path: `${key}.damage` },
    },
    clamp: clampRange,
  }
}

function defenceZone(): ZoneSpec {
  return {
    key: "defence",
    label: "DefenceZone",
    order: zoneOrder.defence,
    mode: "defence",
    params: {
      attackerLevelBase: { path: "defence.attackerLevelBase" },
      effectiveDef: { path: "defence.effectiveDef" },
    },
    clamp: [0, 1],
  }
}

function resistZone(): ZoneSpec {
  return {
    key: "resist",
    label: "ResistZone",
    order: zoneOrder.resist,
    mode: "resist",
    params: {
      resist: { path: "resist.value" },
      resistDown: { path: "resist.down" },
      ignoreResist: { path: "resist.ignore" },
    },
    clamp: [0, 2],
  }
}

function vulnerabilityZone(): ZoneSpec {
  return {
    key: "vulnerability",
    label: "VulnZone",
    order: zoneOrder.vulnerability,
    mode: "vulnerability",
    params: {
      vulnerability: { path: "vulnerability.value" },
      damageReduction: { path: "vulnerability.damageReduction" },
    },
    clamp: [0.2, 2],
  }
}

function stunVulnerabilityZone(): ZoneSpec {
  return {
    key: "stunVulnerability",
    label: "StunVulnZone",
    order: zoneOrder.stunVulnerability,
    mode: "stun-vulnerability",
    params: {
      staggered: { path: "stun.staggered" },
      targetHasStaggerBar: { path: "stun.targetHasStaggerBar" },
      stunVulnMult: { path: "stun.vulnerability" },
      unstaggeredStunVulnMult: { path: "stun.unstaggeredVulnerability" },
    },
  }
}

function sheerBoostZone(): ZoneSpec {
  return {
    key: "sheerBoost",
    label: "SheerBoostZone",
    order: zoneOrder.sheerBoost,
    mode: "additive-one-plus",
    params: {
      valuesPath: "sheerBoost.values",
    },
    clamp: [0.2, 9],
  }
}

function specialZone(): ZoneSpec {
  return {
    key: "special",
    label: "SpecialZone",
    order: zoneOrder.special,
    mode: "constant",
    params: {
      value: 1,
    },
  }
}

function anomalyMasteryZone(): ZoneSpec {
  return {
    key: "anomalyMastery",
    label: "AnomalyMasteryZone",
    order: zoneOrder.crit,
    mode: "anomaly-mastery",
    params: {
      anomalyMastery: { path: "anomaly.mastery" },
    },
    clamp: [0, 10],
  }
}

function damageLevelZone(): ZoneSpec {
  return {
    key: "damageLevel",
    label: "DamageLevelZone",
    order: zoneOrder.damageLevel,
    mode: "damage-level",
    params: {
      level: { path: "damageLevel.level" },
    },
    clamp: [1, 2],
  }
}

function anomalyBoostZone(): ZoneSpec {
  return {
    key: "anomalyBoost",
    label: "AnomalyBoostZone",
    order: zoneOrder.anomalyBoost,
    mode: "anomaly-boost",
    params: {
      valuesPath: "anomalyBoost.values",
    },
    clamp: [0, 3],
  }
}

function evaluateZoneSpec(spec: ZoneSpec, ctx: DamageContext): number {
  switch (spec.mode) {
    case "constant":
      return resolveNumber(
        (spec.params as ConstantParams).value,
        ctx,
        `${spec.key}.value`,
      )
    case "additive-one-plus":
    case "anomaly-boost":
      return (
        1 +
        sumInputs(
          resolveNumberInputs(spec.params as AdditiveOnePlusParams, ctx),
          ctx,
        )
      )
    case "ratio":
      return evaluateRatio(spec.params as RatioParams, ctx)
    case "basic-regular":
    case "basic-sheer":
    case "basic-anomaly":
      return sumProducts(
        resolveProductTerms(spec.params as SumProductsParams, ctx),
        ctx,
      )
    case "crit":
    case "anomaly-crit":
      return evaluateCrit(spec.params as CritParams, ctx)
    case "defence":
      return evaluateDefence(spec.params as DefenceParams, ctx)
    case "resist":
      return evaluateResist(spec.params as ResistParams, ctx)
    case "vulnerability":
      return evaluateVulnerability(spec.params as VulnerabilityParams, ctx)
    case "stun-vulnerability":
      return evaluateStunVulnerability(
        spec.params as StunVulnerabilityParams,
        ctx,
      )
    case "anomaly-mastery":
      return (
        resolveNumber(
          (spec.params as AnomalyMasteryParams).anomalyMastery,
          ctx,
          `${spec.key}.anomalyMastery`,
        ) / 100
      )
    case "damage-level":
      return damageLevelMultiplier(
        resolveNumber(
          (spec.params as DamageLevelParams).level,
          ctx,
          `${spec.key}.level`,
        ),
      )
    case "disorder-multiplier": {
      const params = spec.params as DisorderMultiplierParams

      return disorderMultiplier(
        params.anomalyType,
        resolveNumber(
          params.remainingDuration,
          ctx,
          `${spec.key}.remainingDuration`,
        ),
      )
    }
    default:
      return unreachable(spec.mode)
  }
}

function dynamicClampFor(
  spec: ZoneSpec,
): ((ctx: DamageContext) => ClampRange | undefined) | undefined {
  if (spec.mode !== "stun-vulnerability") {
    return undefined
  }

  return (ctx) => {
    const params = spec.params as StunVulnerabilityParams
    const targetHasStaggerBar = resolveOptionalBoolean(
      params.targetHasStaggerBar,
      ctx,
      "targetHasStaggerBar",
      true,
    )

    if (!targetHasStaggerBar) {
      return undefined
    }

    return resolveBoolean(params.staggered, ctx, "staggered")
      ? [0.2, 5]
      : [1, 3]
  }
}

function evaluateRatio(params: RatioParams, ctx: DamageContext): number {
  const denominator = resolveNumber(params.denominator, ctx, "denominator")

  if (denominator === 0) {
    throw new Error("Ratio denominator must not be 0")
  }

  return resolveNumber(params.numerator, ctx, "numerator") / denominator
}

function evaluateCrit(params: CritParams, ctx: DamageContext): number {
  const critDmg = resolveNumber(params.critDmg, ctx, "critDmg")

  if (
    params.expectation &&
    resolveBoolean(params.expectation, ctx, "expectation")
  ) {
    return 1 + resolveNumber(params.critRate, ctx, "critRate") * critDmg
  }

  if (params.crit && resolveBoolean(params.crit, ctx, "crit")) {
    return 1 + critDmg
  }

  return 1
}

function evaluateDefence(params: DefenceParams, ctx: DamageContext): number {
  const attackerLevelBase = resolveNumber(
    params.attackerLevelBase,
    ctx,
    "attackerLevelBase",
  )
  const effectiveDef = resolveNumber(params.effectiveDef, ctx, "effectiveDef")

  if (attackerLevelBase <= 0) {
    throw new Error("attackerLevelBase must be greater than 0")
  }

  if (effectiveDef < 0) {
    throw new Error("effectiveDef must be greater than or equal to 0")
  }

  return attackerLevelBase / (effectiveDef + attackerLevelBase)
}

function evaluateResist(params: ResistParams, ctx: DamageContext): number {
  return (
    1 -
    resolveNumber(params.resist, ctx, "resist") +
    resolveOptionalNumber(params.resistDown, ctx, "resistDown", 0) +
    resolveOptionalNumber(params.ignoreResist, ctx, "ignoreResist", 0)
  )
}

function evaluateVulnerability(
  params: VulnerabilityParams,
  ctx: DamageContext,
): number {
  return (
    1 +
    resolveOptionalNumber(params.vulnerability, ctx, "vulnerability", 0) -
    resolveOptionalNumber(params.damageReduction, ctx, "damageReduction", 0)
  )
}

function evaluateStunVulnerability(
  params: StunVulnerabilityParams,
  ctx: DamageContext,
): number {
  const targetHasStaggerBar = resolveOptionalBoolean(
    params.targetHasStaggerBar,
    ctx,
    "targetHasStaggerBar",
    true,
  )

  if (!targetHasStaggerBar) {
    return 1
  }

  if (resolveBoolean(params.staggered, ctx, "staggered")) {
    return (
      1 + resolveOptionalNumber(params.stunVulnMult, ctx, "stunVulnMult", 0)
    )
  }

  return (
    1 +
    resolveOptionalNumber(
      params.unstaggeredStunVulnMult,
      ctx,
      "unstaggeredStunVulnMult",
      0,
    )
  )
}

function resolveNumberInputs(
  params: AdditiveOnePlusParams,
  ctx: DamageContext,
): readonly NumberInput[] {
  if (params.valuesPath) {
    const value = readPath(ctx, params.valuesPath)

    if (!Array.isArray(value)) {
      throw new Error(`Expected number array at path: ${params.valuesPath}`)
    }

    return value.map((item, index) =>
      toNumberInput(item, `${params.valuesPath}[${index}]`),
    )
  }

  return params.values ?? []
}

function resolveProductTerms(
  params: SumProductsParams,
  ctx: DamageContext,
): readonly ProductTerm[] {
  if (params.entriesPath) {
    const value = readPath(ctx, params.entriesPath)

    if (!Array.isArray(value)) {
      throw new Error(`Expected product terms at path: ${params.entriesPath}`)
    }

    return value.map((item, index) =>
      toProductTerm(item, `${params.entriesPath}[${index}]`),
    )
  }

  return params.entries ?? []
}

function sumInputs(inputs: readonly NumberInput[], ctx: DamageContext): number {
  return inputs.reduce<number>(
    (total, input, index) =>
      total + resolveNumber(input, ctx, `values[${index}]`),
    0,
  )
}

function resolveNumber(
  input: NumberInput,
  ctx: DamageContext,
  name: string,
): number {
  if (typeof input === "number") {
    return finite(input, name)
  }

  return finite(readPath(ctx, input.path), input.path)
}

function resolveOptionalNumber(
  input: NumberInput | undefined,
  ctx: DamageContext,
  name: string,
  fallback: number,
): number {
  if (!input) {
    return fallback
  }

  return resolveNumber(input, ctx, name)
}

function resolveBoolean(
  input: BooleanInput,
  ctx: DamageContext,
  name: string,
): boolean {
  if (typeof input === "boolean") {
    return input
  }

  const value = readPath(ctx, input.path)

  if (typeof value !== "boolean") {
    throw new Error(`Expected boolean for ${name}`)
  }

  return value
}

function resolveOptionalBoolean(
  input: BooleanInput | undefined,
  ctx: DamageContext,
  name: string,
  fallback: boolean,
): boolean {
  if (!input) {
    return fallback
  }

  return resolveBoolean(input, ctx, name)
}

function readPath(ctx: DamageContext, path: string): unknown {
  if (!path) {
    throw new Error("Path must not be empty")
  }

  let cursor: unknown = ctx

  for (const segment of path.split(".")) {
    if (!isRecord(cursor) || !(segment in cursor)) {
      throw new Error(`Missing context path: ${path}`)
    }

    cursor = cursor[segment]
  }

  return cursor
}

function toNumberInput(value: unknown, name: string): NumberInput {
  if (typeof value === "number") {
    return value
  }

  if (isRecord(value) && typeof value.path === "string") {
    return { path: value.path }
  }

  throw new Error(`Expected number input for ${name}`)
}

function toProductTerm(value: unknown, name: string): ProductTerm {
  if (!isRecord(value)) {
    throw new Error(`Expected product term for ${name}`)
  }

  return {
    multiplier: toNumberInput(value.multiplier, `${name}.multiplier`),
    stat: toNumberInput(value.stat, `${name}.stat`),
  }
}

function clamp(raw: number, range: ClampRange | undefined): number {
  if (!range) {
    return raw
  }

  const [min, max] = range
  finite(min, "clamp.min")
  finite(max, "clamp.max")

  if (min > max) {
    throw new Error(`Invalid clamp range: min ${min} > max ${max}`)
  }

  return Math.min(max, Math.max(min, raw))
}

function validateZoneSpec(spec: ZoneSpec): void {
  if (!spec.key) {
    throw new Error("Zone key must not be empty")
  }

  finite(spec.order, `${spec.key}.order`)

  if (spec.clamp) {
    clamp(0, spec.clamp)
  }
}

function assertUniqueKeys(pipeline: readonly ZoneSpec[]): void {
  const keys = new Set<string>()

  for (const zone of pipeline) {
    if (keys.has(zone.key)) {
      throw new Error(`Duplicate zone key: ${zone.key}`)
    }

    keys.add(zone.key)
  }
}

function finite(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Expected finite number for ${name}`)
  }

  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function unreachable(value: never): never {
  throw new Error(`Unsupported zone mode: ${String(value)}`)
}

const disorderMultiplierConfig: Record<
  DisorderAnomalyType,
  { readonly base: number; readonly stepSeconds: number; readonly step: number }
> = {
  burn: { base: 4.5, stepSeconds: 0.5, step: 0.5 },
  shock: { base: 4.5, stepSeconds: 1, step: 1.25 },
  etherCorruption: { base: 4.5, stepSeconds: 0.5, step: 0.625 },
  iceFrostbite: { base: 4.5, stepSeconds: 1, step: 0.075 },
  physicalFlinch: { base: 4.5, stepSeconds: 1, step: 0.075 },
  auricInkCorruption: { base: 4.5, stepSeconds: 0.5, step: 0.625 },
  frostFrostbite: { base: 6, stepSeconds: 1, step: 0.75 },
}
