import type {
  ResolveStaticBuildInput,
  ResolveStaticBuildResult,
  StaticBuildBaseMode,
  StaticBuildBucket,
  StaticBuildDiagnosticEntry,
  StaticBuildDiagnosticKind,
  StaticBuildDiagnosticOwner,
  StaticBuildEffectDefinition,
  StaticBuildResolvedBuckets,
  StaticBuildSourceNoteEntry,
  StaticBuildSourceNoteOwner,
  StaticBuildSourceNoteStatus,
  StaticBuildTraceItem,
  StaticBuildValueContext,
} from "./types.js"
import {
  calcAnomalyDamage,
  calcAnomalyDamageCrit,
  calcAnomalyDamageNoCrit,
  calcDisorderDamage,
  calcDisorderDamageCrit,
  calcDisorderDamageNoCrit,
  calcNormalDamage,
  calcNormalDamageCrit,
  calcNormalDamageNoCrit,
  calcSheerDamage,
  calcSheerDamageCrit,
  calcSheerDamageNoCrit,
  getAttackerLevelBase,
} from "../calculator/index.js"
import { toAgentAttribute } from "../terms.js"
import {
  getStaticBuildAgent,
  getStaticBuildDriveDisc,
  getStaticBuildWEngine,
} from "./catalog.js"
import {
  getStaticBuildEffectsForLoadout,
  getStaticBuildSourceNoteEntries,
  hasStaticBuildCoverageForSource,
} from "./definitions.js"
import { getStaticBuildProfile } from "./profiles.js"

const diagnosticLabels: Record<StaticBuildDiagnosticKind, string> = {
  "defaulted-input": "默认输入",
  "coverage-gap": "覆盖缺口",
  "unsupported-effect": "未支持效果",
  "fallback": "回退处理",
}

const sourceNoteLabels: Record<StaticBuildSourceNoteStatus, string> = {
  "missing-input": "缺少输入",
  "resolved": "已展开",
  "process-only": "仅流程说明",
  "research-only": "仅研究说明",
}

function parseSkillMultiplier(value: number | string): number {
  if (typeof value === "number") return value
  const trimmed = value.trim()
  if (trimmed.endsWith("%")) {
    return Number.parseFloat(trimmed) / 100
  }
  return Number.parseFloat(trimmed)
}

function createEmptyBuckets(): StaticBuildResolvedBuckets {
  return {
    attackPercent: 0,
    flatAttack: 0,
    bonusDamageSum: 0,
    critRate: 0,
    critDamage: 0,
    defenseReduction: 0,
    penetrationRate: 0,
    penetrationValue: 0,
    resistanceReduction: 0,
    ignoreResistance: 0,
    vulnerabilityBonus: 0,
    damageReduction: 0,
    stunVulnerability: 0,
    nonStunVulnerability: 0,
    sheerBonusSum: 0,
    anomalyMastery: 0,
    anomalyProficiency: 0,
    anomalyBonusDamageSum: 0,
    anomalyCritRate: 0,
    anomalyCritDamage: 0,
    skillMultiplierFactor: 1,
  }
}

function summarizeDiagnostics(diagnostics: StaticBuildDiagnosticEntry[]) {
  return (Object.keys(diagnosticLabels) as StaticBuildDiagnosticKind[])
    .map((key) => ({
      key,
      label: diagnosticLabels[key],
      count: diagnostics.filter((entry) => entry.kind === key).length,
    }))
    .filter((group) => group.count > 0)
}

export function summarizeDiagnosticEntries(
  diagnostics: StaticBuildDiagnosticEntry[],
) {
  const kindGroups = summarizeDiagnostics(diagnostics)
  const ownerGroups = (
    [
      "loadout",
      "finalPanel",
      "scenario",
      "source",
      "process",
    ] as const satisfies StaticBuildDiagnosticOwner[]
  )
    .map((key) => ({
      key,
      count: diagnostics.filter((entry) => entry.owner === key).length,
    }))
    .filter((group) => group.count > 0)

  return {
    count: diagnostics.length,
    hasDiagnostics: diagnostics.length > 0,
    hasDefaultedInput: diagnostics.some(
      (entry) => entry.kind === "defaulted-input",
    ),
    hasCoverageGap: diagnostics.some((entry) => entry.kind === "coverage-gap"),
    hasUnsupportedEffect: diagnostics.some(
      (entry) => entry.kind === "unsupported-effect",
    ),
    hasFallback: diagnostics.some((entry) => entry.kind === "fallback"),
    kindGroups,
    ownerGroups,
  }
}

function summarizeSourceNotes(sourceNotes: StaticBuildSourceNoteEntry[]) {
  return (Object.keys(sourceNoteLabels) as StaticBuildSourceNoteStatus[])
    .map((key) => ({
      key,
      label: sourceNoteLabels[key],
      count: sourceNotes.filter((entry) => entry.status === key).length,
    }))
    .filter((group) => group.count > 0)
}

export function summarizeSourceNoteEntries(
  sourceNotes: StaticBuildSourceNoteEntry[],
) {
  const statusGroups = summarizeSourceNotes(sourceNotes)
  const ownerGroups = (
    [
      "finalPanel",
      "dynamicSnapshot",
      "stateSnapshot",
      "resolvedSnapshot",
      "sourceView",
      "process",
    ] as const satisfies StaticBuildSourceNoteOwner[]
  )
    .map((key) => ({
      key,
      count: sourceNotes.filter((entry) => entry.owner === key).length,
    }))
    .filter((group) => group.count > 0)

  return {
    count: sourceNotes.length,
    hasSourceNotes: sourceNotes.length > 0,
    hasMissingInput: sourceNotes.some(
      (entry) => entry.status === "missing-input",
    ),
    hasProcessOnly: sourceNotes.some(
      (entry) => entry.status === "process-only",
    ),
    hasResearchOnly: sourceNotes.some(
      (entry) => entry.status === "research-only",
    ),
    statusGroups,
    ownerGroups,
  }
}

export function summarizeAssumptions(assumptions: string[]) {
  return {
    count: assumptions.length,
    hasAssumptions: assumptions.length > 0,
  }
}

function buildResolveSummary(
  result: Pick<
    ResolveStaticBuildResult,
    | "resolvedPanel"
    | "damage"
    | "diagnostics"
    | "sourceNotes"
    | "assumptions"
    | "unsupportedEffects"
  >,
) {
  const formulaMultipliers = Object.fromEntries(
    Object.entries(result.damage.expected.breakdown).filter(
      ([key]) => key !== "baseDamage",
    ),
  )
  const diagnosticGroups = summarizeDiagnostics(result.diagnostics)
  const sourceNoteSummary = summarizeSourceNoteEntries(result.sourceNotes)
  const diagnosticSummary = summarizeDiagnosticEntries(result.diagnostics)

  return {
    baseDamageStat: result.resolvedPanel.baseDamageStat,
    baseDamageValue: result.resolvedPanel.baseDamageValue,
    expectedTotal: result.damage.expected.total,
    critTotal: result.damage.crit.total,
    noCritTotal: result.damage.noCrit.total,
    formulaMultipliers,
    assumptionCount: result.assumptions.length,
    diagnosticCount: diagnosticSummary.count,
    sourceNoteCount: sourceNoteSummary.count,
    unsupportedEffectCount: result.unsupportedEffects.length,
    hasDiagnostics: diagnosticSummary.hasDiagnostics,
    hasSourceNotes: sourceNoteSummary.hasSourceNotes,
    hasUnsupportedEffects: result.unsupportedEffects.length > 0,
    hasDefaultedInput: diagnosticSummary.hasDefaultedInput,
    hasCoverageGap: diagnosticSummary.hasCoverageGap,
    hasUnsupportedEffect: diagnosticSummary.hasUnsupportedEffect,
    hasFallback: diagnosticSummary.hasFallback,
    hasMissingInputSourceNote: sourceNoteSummary.hasMissingInput,
    hasProcessOnlySourceNote: sourceNoteSummary.hasProcessOnly,
    hasResearchOnlySourceNote: sourceNoteSummary.hasResearchOnly,
    diagnosticGroups,
    sourceNoteGroups: sourceNoteSummary.statusGroups,
  }
}

function createResolveResult(
  result: Omit<ResolveStaticBuildResult, "summary">,
): ResolveStaticBuildResult {
  return {
    ...result,
    summary: buildResolveSummary(result),
  }
}

function mergeBucket(
  buckets: StaticBuildResolvedBuckets,
  bucket: StaticBuildBucket,
  value: number,
  combine: "sum" | "multiply",
) {
  if (combine === "multiply") {
    buckets[bucket] *= value
    return
  }
  buckets[bucket] += value
}

function resolveBaseMode(input: ResolveStaticBuildInput): StaticBuildBaseMode {
  if (input.mode === "full-buff") return "full-buff"
  if (input.mode === "manual") return input.manualBaseMode ?? "baseline"
  return "baseline"
}

function resolveEffectState(
  effect: StaticBuildEffectDefinition,
  baseMode: StaticBuildBaseMode,
  overrides: Map<string, { enabled?: boolean; stacks?: number }>,
) {
  const defaultEnabled =
    baseMode === "full-buff"
      ? (effect.fullBuffEnabled ?? effect.baselineEnabled ?? false)
      : (effect.baselineEnabled ?? false)
  const defaultStacks =
    baseMode === "full-buff" ? effect.fullBuffStacks : effect.baselineStacks
  const override = overrides.get(effect.id)
  const maxStacks = effect.maxStacks ?? 1

  const enabled = override?.enabled ?? defaultEnabled
  if (!enabled) return { enabled: false, stacks: 0 }

  const stacks = Math.max(
    1,
    Math.min(override?.stacks ?? defaultStacks ?? 1, maxStacks),
  )

  return { enabled: true, stacks }
}

function effectMatches(
  effect: StaticBuildEffectDefinition,
  context: {
    attribute: string | undefined
    damageType: string
    disorderSourceType?: string
    agentMindscape: number
    skillTag: string
    extraAbilityActive: boolean
    combatTags: Set<string>
    dynamicSnapshot?: StaticBuildValueContext["dynamicSnapshot"]
    stateSnapshot?: StaticBuildValueContext["stateSnapshot"]
    isStunned: boolean
    resolvedCritRate?: number
    resolvedAnomalyProficiency?: number
  },
) {
  const condition = effect.condition
  if (!condition) return true

  if (
    condition.damageTypes &&
    !condition.damageTypes.includes(context.damageType as never)
  ) {
    return false
  }

  if (
    condition.skillTags &&
    !condition.skillTags.includes(context.skillTag as never)
  ) {
    return false
  }

  if (
    condition.attributes &&
    (!context.attribute ||
      !condition.attributes.includes(context.attribute as never))
  ) {
    return false
  }

  if (
    condition.minimumMindscape !== undefined &&
    context.agentMindscape < condition.minimumMindscape
  ) {
    return false
  }

  if (condition.requireExtraAbility && !context.extraAbilityActive) {
    return false
  }

  if (condition.requireStunned && !context.isStunned) {
    return false
  }

  if (
    condition.disorderSourceTypes &&
    (context.damageType !== "disorder" ||
      !context.disorderSourceType ||
      !condition.disorderSourceTypes.includes(
        context.disorderSourceType as never,
      ))
  ) {
    return false
  }

  if (
    condition.combatTags &&
    condition.combatTags.some((tag) => !context.combatTags.has(tag))
  ) {
    return false
  }

  if (
    condition.dynamicSnapshotFlags &&
    condition.dynamicSnapshotFlags.some(
      (key) => context.dynamicSnapshot?.flags?.[key] !== true,
    )
  ) {
    return false
  }

  if (
    condition.stateSnapshotFlags &&
    condition.stateSnapshotFlags.some(
      (key) => context.stateSnapshot?.flags?.[key] !== true,
    )
  ) {
    return false
  }

  if (
    condition.requiredDynamicCounts &&
    condition.requiredDynamicCounts.some(
      (key) => context.dynamicSnapshot?.counts?.[key] === undefined,
    )
  ) {
    return false
  }

  if (
    condition.requiredDynamicValues &&
    condition.requiredDynamicValues.some(
      (key) => context.dynamicSnapshot?.values?.[key] === undefined,
    )
  ) {
    return false
  }

  if (
    condition.requiredStateValues &&
    condition.requiredStateValues.some(
      (key) => context.stateSnapshot?.values?.[key] === undefined,
    )
  ) {
    return false
  }

  if (
    condition.minimumDynamicCounts &&
    Object.entries(condition.minimumDynamicCounts).some(
      ([key, value]) =>
        (context.dynamicSnapshot?.counts?.[
          key as keyof NonNullable<
            NonNullable<typeof context.dynamicSnapshot>["counts"]
          >
        ] ?? 0) < (value ?? 0),
    )
  ) {
    return false
  }

  if (
    condition.minimumDynamicValues &&
    Object.entries(condition.minimumDynamicValues).some(
      ([key, value]) =>
        (context.dynamicSnapshot?.values?.[
          key as keyof NonNullable<
            NonNullable<typeof context.dynamicSnapshot>["values"]
          >
        ] ?? 0) < (value ?? 0),
    )
  ) {
    return false
  }

  if (
    condition.minimumStateValues &&
    Object.entries(condition.minimumStateValues).some(
      ([key, value]) =>
        (context.stateSnapshot?.values?.[
          key as keyof NonNullable<
            NonNullable<typeof context.stateSnapshot>["values"]
          >
        ] ?? 0) < (value ?? 0),
    )
  ) {
    return false
  }

  if (
    condition.minimumResolvedCritRate !== undefined &&
    (context.resolvedCritRate === undefined ||
      context.resolvedCritRate < condition.minimumResolvedCritRate)
  ) {
    return false
  }

  if (
    condition.minimumResolvedAnomalyProficiency !== undefined &&
    (context.resolvedAnomalyProficiency === undefined ||
      context.resolvedAnomalyProficiency <
        condition.minimumResolvedAnomalyProficiency)
  ) {
    return false
  }

  return true
}

function applyEffects(
  effects: StaticBuildEffectDefinition[],
  context: {
    attribute: string | undefined
    damageType: string
    disorderSourceType?: string
    agentMindscape: number
    skillTag: string
    extraAbilityActive: boolean
    combatTags: Set<string>
    isStunned: boolean
    resolvedCritRate?: number
    resolvedAnomalyProficiency?: number
    baseMode: StaticBuildBaseMode
    valueContext: StaticBuildValueContext
    overrides: Map<string, { enabled?: boolean; stacks?: number }>
    assumptions: string[]
    diagnostics: StaticBuildDiagnosticEntry[]
    unsupportedEffects: string[]
    usesAttackAsBase: boolean
    hasBaseAttack: boolean
  },
) {
  const buckets = createEmptyBuckets()
  const trace: StaticBuildTraceItem[] = []

  for (const effect of effects) {
    if (effect.alreadyInPanel) {
      trace.push({
        effectId: effect.id,
        sourceType: effect.sourceType,
        sourceName: effect.sourceName,
        label: effect.label,
        status: "skipped",
        reason: "已视为包含在用户提供的 finalPanel 中",
      })
      continue
    }

    const state = resolveEffectState(
      effect,
      context.baseMode,
      context.overrides,
    )
    if (!state.enabled) {
      trace.push({
        effectId: effect.id,
        sourceType: effect.sourceType,
        sourceName: effect.sourceName,
        label: effect.label,
        status: "skipped",
        reason: "当前模式下默认未启用",
      })
      continue
    }

    if (
      !effectMatches(effect, {
        attribute: context.attribute,
        damageType: context.damageType,
        disorderSourceType: context.disorderSourceType,
        agentMindscape: context.agentMindscape,
        skillTag: context.skillTag,
        extraAbilityActive: context.extraAbilityActive,
        combatTags: context.combatTags,
        dynamicSnapshot: context.valueContext.dynamicSnapshot,
        stateSnapshot: context.valueContext.stateSnapshot,
        isStunned: context.isStunned,
        resolvedCritRate: context.resolvedCritRate,
        resolvedAnomalyProficiency: context.resolvedAnomalyProficiency,
      })
    ) {
      trace.push({
        effectId: effect.id,
        sourceType: effect.sourceType,
        sourceName: effect.sourceName,
        label: effect.label,
        status: "skipped",
        reason: "当前场景条件不满足",
        stacks: state.stacks,
      })
      continue
    }

    const unsupportedReason = effect.modifiers.some((modifier) => {
      if (
        (modifier.bucket === "attackPercent" ||
          modifier.bucket === "flatAttack") &&
        !context.usesAttackAsBase
      ) {
        return true
      }
      if (modifier.bucket === "attackPercent" && !context.hasBaseAttack) {
        return true
      }
      return false
    })

    if (unsupportedReason) {
      const reason = !context.usesAttackAsBase
        ? "当前 profile 不使用攻击力作为基础乘区，相关攻击力 buff 已跳过"
        : "缺少 finalPanel.baseAttack，无法精确结算战斗中的攻击力% buff"
      const message = `${effect.label}: ${reason}`
      context.unsupportedEffects.push(message)
      context.diagnostics.push({
        kind: "unsupported-effect",
        owner: context.usesAttackAsBase ? "finalPanel" : "process",
        sourceType: effect.sourceType,
        sourceId: effect.sourceId,
        keys: context.usesAttackAsBase
          ? ["finalPanel.baseAttack"]
          : ["profile.baseDamageStat"],
        message,
      })
      trace.push({
        effectId: effect.id,
        sourceType: effect.sourceType,
        sourceName: effect.sourceName,
        label: effect.label,
        status: "unsupported",
        reason,
        stacks: state.stacks,
      })
      continue
    }

    const appliedModifiers = effect.modifiers.map((modifier) => {
      const rawValue = modifier.value(context.valueContext)
      const value =
        modifier.combine === "multiply"
          ? rawValue ** state.stacks
          : rawValue * state.stacks
      mergeBucket(buckets, modifier.bucket, value, modifier.combine ?? "sum")
      return {
        bucket: modifier.bucket,
        value,
        combine: modifier.combine ?? "sum",
      }
    })

    trace.push({
      effectId: effect.id,
      sourceType: effect.sourceType,
      sourceName: effect.sourceName,
      label: effect.label,
      status: "applied",
      stacks: state.stacks,
      modifiers: appliedModifiers,
    })
  }

  return { buckets, trace }
}

export function resolveStaticBuildDamage(
  input: ResolveStaticBuildInput,
): ResolveStaticBuildResult {
  const mode = input.mode ?? "baseline"
  const baseMode = resolveBaseMode(input)
  const agent = getStaticBuildAgent(input.loadout.agentId)

  if (!agent) {
    throw new RangeError(`Unsupported agentId: ${input.loadout.agentId}`)
  }

  const wEngine = getStaticBuildWEngine(input.loadout.wEngineId)
  if (input.loadout.wEngineId && !wEngine) {
    throw new RangeError(`Unsupported wEngineId: ${input.loadout.wEngineId}`)
  }
  if (wEngine && wEngine.specialty !== agent.specialty) {
    throw new RangeError(
      `${wEngine.name} specialty=${wEngine.specialty} is incompatible with ${agent.name} specialty=${agent.specialty}`,
    )
  }

  const driveDiscSets = (input.loadout.driveDiscSets ?? []).map((set) => {
    const disc = getStaticBuildDriveDisc(set.id)
    if (!disc) {
      throw new RangeError(`Unsupported driveDiscId: ${set.id}`)
    }
    return {
      ...disc,
      pieces: set.pieces,
    }
  })

  if (
    (input.scenario.damageType === "anomaly" ||
      input.scenario.damageType === "disorder") &&
    agent.specialty !== "Anomaly"
  ) {
    throw new RangeError(
      `${agent.name} specialty=${agent.specialty} does not support damageType=${input.scenario.damageType}`,
    )
  }

  const profileId =
    input.scenario.damageType === "disorder" && agent.specialty === "Anomaly"
      ? "standard-disorder"
      : agent.profileId

  const profile = getStaticBuildProfile(profileId)
  if (!profile.supportsDamageType(input.scenario.damageType)) {
    throw new RangeError(
      `${agent.name} profile does not support damageType=${input.scenario.damageType}`,
    )
  }

  const assumptions: string[] = []
  const diagnostics: StaticBuildDiagnosticEntry[] = []
  const unsupportedEffects: string[] = []
  const agentMindscape = input.loadout.agentMindscape ?? 0

  const attribute =
    toAgentAttribute(input.scenario.attribute) ?? agent.defaultAttribute
  if (!input.scenario.attribute) {
    const message = `未提供 attribute，按 ${agent.name} 默认属性 ${agent.defaultAttribute} 处理`
    assumptions.push(message)
    diagnostics.push({
      kind: "defaulted-input",
      owner: "scenario",
      keys: ["scenario.attribute"],
      message,
    })
  }

  const extraAbilityActive = input.scenario.extraAbilityActive ?? true
  if (input.scenario.extraAbilityActive === undefined) {
    const message = "未显式提供 extraAbilityActive，按已满足额外能力条件处理"
    assumptions.push(message)
    diagnostics.push({
      kind: "defaulted-input",
      owner: "scenario",
      keys: ["scenario.extraAbilityActive"],
      message,
    })
  }
  const isStunned = input.scenario.enemy.isStunned ?? false

  const effects = getStaticBuildEffectsForLoadout({
    agentId: agent.id,
    wEngineId: wEngine?.id,
    driveDiscSets,
  })
  if (
    input.loadout.agentMindscape === undefined &&
    effects.some((effect) => effect.condition?.minimumMindscape !== undefined)
  ) {
    const message =
      "未提供 agentMindscape，按 0 处理；未展开更高影画/潜能觉醒档位效果"
    assumptions.push(message)
    diagnostics.push({
      kind: "defaulted-input",
      owner: "loadout",
      keys: ["loadout.agentMindscape"],
      message,
    })
  }
  if (!hasStaticBuildCoverageForSource("agent", agent.id)) {
    const message = `${agent.name} 当前未收录 curated 代理人效果，结果主要基于 finalPanel、敌人参数和已支持的公共增益`
    assumptions.push(message)
    diagnostics.push({
      kind: "coverage-gap",
      owner: "source",
      sourceType: "agent",
      sourceId: agent.id,
      keys: ["loadout.agentId"],
      message,
    })
  }
  if (wEngine && !hasStaticBuildCoverageForSource("w-engine", wEngine.id)) {
    const message = `${wEngine.name} 当前未收录 curated 音擎效果，已仅按 finalPanel 面板处理`
    assumptions.push(message)
    diagnostics.push({
      kind: "coverage-gap",
      owner: "source",
      sourceType: "w-engine",
      sourceId: wEngine.id,
      keys: ["loadout.wEngineId"],
      message,
    })
  }
  for (const set of driveDiscSets) {
    if (!hasStaticBuildCoverageForSource("drive-disc", set.id)) {
      const message = `${set.name} ${set.pieces}件 当前未收录 curated 驱动盘效果，已仅按 finalPanel 面板处理`
      assumptions.push(message)
      diagnostics.push({
        kind: "coverage-gap",
        owner: "source",
        sourceType: "drive-disc",
        sourceId: set.id,
        keys: ["loadout.driveDiscSets"],
        message,
      })
    }
  }

  const sourceNotes = [
    ...getStaticBuildSourceNoteEntries({
      sourceType: "agent",
      sourceId: agent.id,
      damageType: input.scenario.damageType,
      agentMindscape,
      energyGenerationRate: input.panel.energyGenerationRate,
      anomalyMastery: input.panel.anomalyMastery,
      dynamicSnapshot: input.scenario.dynamicSnapshot,
      stateSnapshot: input.scenario.stateSnapshot,
      resolvedSnapshot: input.scenario.resolvedSnapshot,
      isStunned,
      disorderSourceType:
        input.scenario.damageType === "disorder"
          ? input.scenario.anomalyType
          : undefined,
    }),
  ]
  if (wEngine) {
    sourceNotes.push(
      ...getStaticBuildSourceNoteEntries({
        sourceType: "w-engine",
        sourceId: wEngine.id,
        damageType: input.scenario.damageType,
        agentMindscape,
        energyGenerationRate: input.panel.energyGenerationRate,
        anomalyMastery: input.panel.anomalyMastery,
        dynamicSnapshot: input.scenario.dynamicSnapshot,
        stateSnapshot: input.scenario.stateSnapshot,
        resolvedSnapshot: input.scenario.resolvedSnapshot,
        isStunned,
        disorderSourceType:
          input.scenario.damageType === "disorder"
            ? input.scenario.anomalyType
            : undefined,
      }),
    )
  }
  for (const set of driveDiscSets) {
    sourceNotes.push(
      ...getStaticBuildSourceNoteEntries({
        sourceType: "drive-disc",
        sourceId: set.id,
        damageType: input.scenario.damageType,
        agentMindscape,
        energyGenerationRate: input.panel.energyGenerationRate,
        anomalyMastery: input.panel.anomalyMastery,
        dynamicSnapshot: input.scenario.dynamicSnapshot,
        stateSnapshot: input.scenario.stateSnapshot,
        resolvedSnapshot: input.scenario.resolvedSnapshot,
        isStunned,
        disorderSourceType:
          input.scenario.damageType === "disorder"
            ? input.scenario.anomalyType
            : undefined,
        pieces: set.pieces,
      }),
    )
  }

  assumptions.push(
    ...sourceNotes
      .filter(
        (note) => note.sourceType === "agent" && note.sourceId === agent.id,
      )
      .map((note) => note.message),
  )
  if (wEngine) {
    assumptions.push(
      ...sourceNotes
        .filter(
          (note) =>
            note.sourceType === "w-engine" && note.sourceId === wEngine.id,
        )
        .map((note) => note.message),
    )
  }
  for (const set of driveDiscSets) {
    assumptions.push(
      ...sourceNotes
        .filter(
          (note) =>
            note.sourceType === "drive-disc" && note.sourceId === set.id,
        )
        .map((note) => note.message),
    )
  }
  const overrides = new Map(
    (input.effectOverrides ?? []).map((item) => [
      item.effectId,
      { enabled: item.enabled, stacks: item.stacks },
    ]),
  )
  const valueContext: StaticBuildValueContext = {
    agentMindscape,
    coreSkillLevel: input.loadout.coreSkillLevel ?? 7,
    wEngineRefinement: input.loadout.wEngineRefinement ?? 1,
    energyGenerationRate: input.panel.energyGenerationRate,
    anomalyMastery: input.panel.anomalyMastery,
    dynamicSnapshot: input.scenario.dynamicSnapshot,
    stateSnapshot: input.scenario.stateSnapshot,
    remainingTime:
      input.scenario.damageType === "disorder"
        ? input.scenario.remainingTime
        : undefined,
  }
  const combatTags = new Set(input.scenario.combatTags ?? [])
  const usesAttackAsBase = profile.baseDamageStat === "attack"

  const firstPass = applyEffects(effects, {
    attribute,
    damageType: input.scenario.damageType,
    disorderSourceType:
      input.scenario.damageType === "disorder"
        ? input.scenario.anomalyType
        : undefined,
    agentMindscape,
    skillTag: input.scenario.skillTag,
    extraAbilityActive,
    combatTags,
    isStunned,
    baseMode,
    valueContext,
    overrides,
    assumptions,
    diagnostics,
    unsupportedEffects,
    usesAttackAsBase,
    hasBaseAttack: input.panel.baseAttack !== undefined,
  })

  const interimCritRate = input.panel.critRate + firstPass.buckets.critRate
  const interimAnomalyProficiency =
    (input.panel.anomalyProficiency ?? 0) + firstPass.buckets.anomalyProficiency

  const secondPassCandidates = effects.filter(
    (effect) =>
      effect.condition?.minimumResolvedCritRate !== undefined ||
      effect.condition?.minimumResolvedAnomalyProficiency !== undefined,
  )
  const secondPass = applyEffects(secondPassCandidates, {
    attribute,
    damageType: input.scenario.damageType,
    disorderSourceType:
      input.scenario.damageType === "disorder"
        ? input.scenario.anomalyType
        : undefined,
    agentMindscape,
    skillTag: input.scenario.skillTag,
    extraAbilityActive,
    combatTags,
    isStunned,
    resolvedCritRate: interimCritRate,
    resolvedAnomalyProficiency: interimAnomalyProficiency,
    baseMode,
    valueContext: {
      ...valueContext,
      resolvedAnomalyProficiency: interimAnomalyProficiency,
    },
    overrides,
    assumptions,
    diagnostics,
    unsupportedEffects,
    usesAttackAsBase,
    hasBaseAttack: input.panel.baseAttack !== undefined,
  })

  const trace = [
    ...firstPass.trace.filter(
      (item) =>
        !secondPassCandidates.some((effect) => effect.id === item.effectId),
    ),
    ...secondPass.trace,
  ]

  const resolvedBuckets = createEmptyBuckets()
  for (const [source] of [firstPass.buckets, secondPass.buckets].entries()) {
    const current = source === 0 ? firstPass.buckets : secondPass.buckets
    for (const key of Object.keys(resolvedBuckets) as Array<
      keyof StaticBuildResolvedBuckets
    >) {
      if (key === "skillMultiplierFactor") {
        resolvedBuckets[key] *= current[key]
      } else {
        resolvedBuckets[key] += current[key]
      }
    }
  }

  const resolvedSnapshotBucketKeys = Object.entries(
    input.scenario.resolvedSnapshot?.bucketDeltas ?? {},
  ).filter(([, value]) => value !== undefined)
  for (const [key, value] of resolvedSnapshotBucketKeys) {
    resolvedBuckets[
      key as keyof Omit<StaticBuildResolvedBuckets, "skillMultiplierFactor">
    ] += value as number
  }
  if (resolvedSnapshotBucketKeys.length > 0) {
    assumptions.push(
      `已按 scenario.resolvedSnapshot.bucketDeltas 展开：${resolvedSnapshotBucketKeys
        .map(([key]) => key)
        .join("、")}`,
    )
  }

  const resolvedSkillMultiplierFactor =
    input.scenario.resolvedSnapshot?.multiplierFactors?.skillMultiplierFactor
  if (resolvedSkillMultiplierFactor !== undefined) {
    resolvedBuckets.skillMultiplierFactor *= resolvedSkillMultiplierFactor
    assumptions.push(
      "已按 scenario.resolvedSnapshot.multiplierFactors.skillMultiplierFactor 展开当前结算倍率快照",
    )
  }

  const resolvedAttack =
    input.panel.attack +
    (input.panel.baseAttack ?? 0) * resolvedBuckets.attackPercent +
    resolvedBuckets.flatAttack

  const resolvedAgentLevel = input.loadout.agentLevel ?? 60
  if (
    input.loadout.agentLevel === undefined &&
    input.scenario.damageType === "anomaly"
  ) {
    const message = "未提供 agentLevel，异常伤害按 60 级代理人处理"
    assumptions.push(message)
    diagnostics.push({
      kind: "defaulted-input",
      owner: "loadout",
      keys: ["loadout.agentLevel"],
      message,
    })
  }

  const baseDamageValue = profile.resolveBaseDamageValue({
    agent,
    panel: {
      ...input.panel,
      attack: resolvedAttack,
      critRate: input.panel.critRate + resolvedBuckets.critRate,
      critDamage: input.panel.critDamage + resolvedBuckets.critDamage,
      penetrationRate:
        (input.panel.penetrationRate ?? 0) + resolvedBuckets.penetrationRate,
      penetrationValue:
        (input.panel.penetrationValue ?? 0) + resolvedBuckets.penetrationValue,
    },
    assumptions,
  })

  const resolvedPanel = {
    attack: resolvedAttack,
    baseAttack: input.panel.baseAttack,
    agentLevel: resolvedAgentLevel,
    critRate: input.panel.critRate + resolvedBuckets.critRate,
    critDamage: input.panel.critDamage + resolvedBuckets.critDamage,
    hp: input.panel.hp,
    sheerForce: input.panel.sheerForce,
    energyGenerationRate: input.panel.energyGenerationRate,
    anomalyProficiency:
      (input.panel.anomalyProficiency ?? 0) +
      resolvedBuckets.anomalyProficiency,
    anomalyMastery:
      input.panel.anomalyMastery === undefined &&
      resolvedBuckets.anomalyMastery === 0
        ? undefined
        : (input.panel.anomalyMastery ?? 0) + resolvedBuckets.anomalyMastery,
    anomalyCritRate:
      (input.panel.anomalyCritRate ?? 0) + resolvedBuckets.anomalyCritRate,
    anomalyCritDamage:
      (input.panel.anomalyCritDamage ?? 0) + resolvedBuckets.anomalyCritDamage,
    penetrationRate:
      (input.panel.penetrationRate ?? 0) + resolvedBuckets.penetrationRate,
    penetrationValue:
      (input.panel.penetrationValue ?? 0) + resolvedBuckets.penetrationValue,
    baseDamageStat: profile.baseDamageStat,
    baseDamageValue,
  } as const

  const parsedDamageMultiplier =
    input.scenario.damageType === "anomaly"
      ? parseSkillMultiplier(input.scenario.damageMultiplier)
      : input.scenario.damageType === "disorder"
        ? 1
        : parseSkillMultiplier(input.scenario.skillMultiplier)
  const enemy = input.scenario.enemy
  const baseDamage =
    baseDamageValue *
    parsedDamageMultiplier *
    resolvedBuckets.skillMultiplierFactor

  if (input.scenario.damageType === "normal") {
    const damageParams = {
      baseDamage,
      bonusDamageSum: resolvedBuckets.bonusDamageSum,
      crit: {
        critRate: resolvedPanel.critRate,
        critDamage: resolvedPanel.critDamage,
      },
      defense: {
        attackerLevelBase: getAttackerLevelBase(enemy.attackerLevel ?? 60),
        defenderBaseDefense: enemy.defenderBaseDefense,
        defenseBonus: enemy.defenseBonus ?? 0,
        defenseReduction:
          (enemy.defenseReduction ?? 0) + resolvedBuckets.defenseReduction,
        penetrationRate: resolvedPanel.penetrationRate,
        penetrationValue: resolvedPanel.penetrationValue,
      },
      resistance: {
        defenderResistance: enemy.defenderResistance,
        resistanceReduction:
          (enemy.resistanceReduction ?? 0) +
          resolvedBuckets.resistanceReduction,
        ignoreResistance:
          (enemy.ignoreResistance ?? 0) + resolvedBuckets.ignoreResistance,
      },
      vulnerability: {
        vulnerabilityBonus:
          (enemy.vulnerabilityBonus ?? 0) + resolvedBuckets.vulnerabilityBonus,
        damageReduction:
          (enemy.damageReduction ?? 0) + resolvedBuckets.damageReduction,
      },
      dazeVulnerability: {
        isStunned,
        stunVulnerability:
          (enemy.stunVulnerability ?? 0) + resolvedBuckets.stunVulnerability,
        nonStunVulnerability:
          (enemy.nonStunVulnerability ?? 0) +
          resolvedBuckets.nonStunVulnerability,
      },
      specialMultiplier: enemy.specialMultiplier ?? 1,
    }

    return createResolveResult({
      profile: {
        id: profile.id,
        name: profile.name,
      },
      mode,
      manualBaseMode: input.mode === "manual" ? baseMode : undefined,
      loadout: {
        agent,
        wEngine,
        driveDiscSets,
        agentLevel: resolvedAgentLevel,
        agentMindscape,
        coreSkillLevel: valueContext.coreSkillLevel,
        wEngineRefinement: valueContext.wEngineRefinement,
      },
      resolvedPanel,
      resolvedBuckets,
      damageParams,
      damage: {
        expected: calcNormalDamage(damageParams),
        crit: calcNormalDamageCrit(damageParams),
        noCrit: calcNormalDamageNoCrit(damageParams),
      },
      trace,
      diagnostics,
      sourceNotes,
      assumptions,
      unsupportedEffects,
    })
  }

  if (input.scenario.damageType === "anomaly") {
    const damageParams = {
      virtualAgentLevel: resolvedPanel.agentLevel,
      virtualAgentAttack: resolvedPanel.attack,
      virtualAgentAnomalyProficiency: resolvedPanel.anomalyProficiency,
      damageMultiplier:
        parsedDamageMultiplier * resolvedBuckets.skillMultiplierFactor,
      bonusDamageSum: resolvedBuckets.bonusDamageSum,
      defense: {
        attackerLevelBase: getAttackerLevelBase(enemy.attackerLevel ?? 60),
        defenderBaseDefense: enemy.defenderBaseDefense,
        defenseBonus: enemy.defenseBonus ?? 0,
        defenseReduction:
          (enemy.defenseReduction ?? 0) + resolvedBuckets.defenseReduction,
        penetrationRate: resolvedPanel.penetrationRate,
        penetrationValue: resolvedPanel.penetrationValue,
      },
      resistance: {
        defenderResistance: enemy.defenderResistance,
        resistanceReduction:
          (enemy.resistanceReduction ?? 0) +
          resolvedBuckets.resistanceReduction,
        ignoreResistance:
          (enemy.ignoreResistance ?? 0) + resolvedBuckets.ignoreResistance,
      },
      vulnerability: {
        vulnerabilityBonus:
          (enemy.vulnerabilityBonus ?? 0) + resolvedBuckets.vulnerabilityBonus,
        damageReduction:
          (enemy.damageReduction ?? 0) + resolvedBuckets.damageReduction,
      },
      dazeVulnerability: {
        isStunned,
        stunVulnerability:
          (enemy.stunVulnerability ?? 0) + resolvedBuckets.stunVulnerability,
        nonStunVulnerability:
          (enemy.nonStunVulnerability ?? 0) +
          resolvedBuckets.nonStunVulnerability,
      },
      anomalyBonusDamageSum: resolvedBuckets.anomalyBonusDamageSum,
      anomalyCritRate: resolvedPanel.anomalyCritRate,
      anomalyCritDamage: resolvedPanel.anomalyCritDamage,
    }

    return createResolveResult({
      profile: {
        id: profile.id,
        name: profile.name,
      },
      mode,
      manualBaseMode: input.mode === "manual" ? baseMode : undefined,
      loadout: {
        agent,
        wEngine,
        driveDiscSets,
        agentLevel: resolvedAgentLevel,
        agentMindscape,
        coreSkillLevel: valueContext.coreSkillLevel,
        wEngineRefinement: valueContext.wEngineRefinement,
      },
      resolvedPanel,
      resolvedBuckets,
      damageParams,
      damage: {
        expected: calcAnomalyDamage(damageParams),
        crit: calcAnomalyDamageCrit(damageParams),
        noCrit: calcAnomalyDamageNoCrit(damageParams),
      },
      trace,
      diagnostics,
      sourceNotes,
      assumptions,
      unsupportedEffects,
    })
  }

  if (input.scenario.damageType === "disorder") {
    const damageParams = {
      virtualAgentLevel: resolvedPanel.agentLevel,
      virtualAgentAttack: resolvedPanel.attack,
      virtualAgentAnomalyProficiency: resolvedPanel.anomalyProficiency,
      bonusDamageSum: resolvedBuckets.bonusDamageSum,
      defense: {
        attackerLevelBase: getAttackerLevelBase(enemy.attackerLevel ?? 60),
        defenderBaseDefense: enemy.defenderBaseDefense,
        defenseBonus: enemy.defenseBonus ?? 0,
        defenseReduction:
          (enemy.defenseReduction ?? 0) + resolvedBuckets.defenseReduction,
        penetrationRate: resolvedPanel.penetrationRate,
        penetrationValue: resolvedPanel.penetrationValue,
      },
      resistance: {
        defenderResistance: enemy.defenderResistance,
        resistanceReduction:
          (enemy.resistanceReduction ?? 0) +
          resolvedBuckets.resistanceReduction,
        ignoreResistance:
          (enemy.ignoreResistance ?? 0) + resolvedBuckets.ignoreResistance,
      },
      vulnerability: {
        vulnerabilityBonus:
          (enemy.vulnerabilityBonus ?? 0) + resolvedBuckets.vulnerabilityBonus,
        damageReduction:
          (enemy.damageReduction ?? 0) + resolvedBuckets.damageReduction,
      },
      dazeVulnerability: {
        isStunned,
        stunVulnerability:
          (enemy.stunVulnerability ?? 0) + resolvedBuckets.stunVulnerability,
        nonStunVulnerability:
          (enemy.nonStunVulnerability ?? 0) +
          resolvedBuckets.nonStunVulnerability,
      },
      anomalyBonusDamageSum: resolvedBuckets.anomalyBonusDamageSum,
      anomalyCritRate: resolvedPanel.anomalyCritRate,
      anomalyCritDamage: resolvedPanel.anomalyCritDamage,
      damageMultiplierFactor: resolvedBuckets.skillMultiplierFactor,
      anomalyType: input.scenario.anomalyType,
      remainingTime: input.scenario.remainingTime,
    }

    return createResolveResult({
      profile: {
        id: profile.id,
        name: profile.name,
      },
      mode,
      manualBaseMode: input.mode === "manual" ? baseMode : undefined,
      loadout: {
        agent,
        wEngine,
        driveDiscSets,
        agentLevel: resolvedAgentLevel,
        agentMindscape,
        coreSkillLevel: valueContext.coreSkillLevel,
        wEngineRefinement: valueContext.wEngineRefinement,
      },
      resolvedPanel,
      resolvedBuckets,
      damageParams,
      damage: {
        expected: calcDisorderDamage(damageParams),
        crit: calcDisorderDamageCrit(damageParams),
        noCrit: calcDisorderDamageNoCrit(damageParams),
      },
      trace,
      diagnostics,
      sourceNotes,
      assumptions,
      unsupportedEffects,
    })
  }

  const damageParams = {
    baseDamage,
    bonusDamageSum: resolvedBuckets.bonusDamageSum,
    crit: {
      critRate: resolvedPanel.critRate,
      critDamage: resolvedPanel.critDamage,
    },
    sheerBonusSum: resolvedBuckets.sheerBonusSum,
    resistance: {
      defenderResistance: enemy.defenderResistance,
      resistanceReduction:
        (enemy.resistanceReduction ?? 0) + resolvedBuckets.resistanceReduction,
      ignoreResistance:
        (enemy.ignoreResistance ?? 0) + resolvedBuckets.ignoreResistance,
    },
    vulnerability: {
      vulnerabilityBonus:
        (enemy.vulnerabilityBonus ?? 0) + resolvedBuckets.vulnerabilityBonus,
      damageReduction:
        (enemy.damageReduction ?? 0) + resolvedBuckets.damageReduction,
    },
    dazeVulnerability: {
      isStunned,
      stunVulnerability:
        (enemy.stunVulnerability ?? 0) + resolvedBuckets.stunVulnerability,
      nonStunVulnerability:
        (enemy.nonStunVulnerability ?? 0) +
        resolvedBuckets.nonStunVulnerability,
    },
    specialMultiplier: enemy.specialMultiplier ?? 1,
  }

  return createResolveResult({
    profile: {
      id: profile.id,
      name: profile.name,
    },
    mode,
    manualBaseMode: input.mode === "manual" ? baseMode : undefined,
    loadout: {
      agent,
      wEngine,
      driveDiscSets,
      agentLevel: resolvedAgentLevel,
      agentMindscape,
      coreSkillLevel: valueContext.coreSkillLevel,
      wEngineRefinement: valueContext.wEngineRefinement,
    },
    resolvedPanel,
    resolvedBuckets,
    damageParams,
    damage: {
      expected: calcSheerDamage(damageParams),
      crit: calcSheerDamageCrit(damageParams),
      noCrit: calcSheerDamageNoCrit(damageParams),
    },
    trace,
    diagnostics,
    sourceNotes,
    assumptions,
    unsupportedEffects,
  })
}
