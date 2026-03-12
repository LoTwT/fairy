import type {
  ResolveStaticBuildInput,
  ResolveStaticBuildResult,
  ResolveStaticBuildSourceDamageViewsResult,
  StaticBuildBaseMode,
  StaticBuildCatalogEntry,
  StaticBuildResolvedLoadout,
  StaticBuildSourceDamageViewEntry,
  StaticBuildSourceDamageViewRequirement,
} from "./types.js"
import {
  getStaticBuildAgent,
  getStaticBuildDriveDisc,
  getStaticBuildWEngine,
  supportedStaticBuildAgents,
} from "./catalog.js"
import { getStaticBuildSourceNoteEntries } from "./definitions.js"
import { resolveStaticBuildDamage } from "./resolver.js"

const sourceViewAgentIds = ["1091", "1171", "1401", "1501"] as const
const sourceViewAgentIdSet = new Set<string>(sourceViewAgentIds)

export const supportedStaticBuildSourceViewAgents = supportedStaticBuildAgents
  .filter((item) => sourceViewAgentIdSet.has(item.id))
  .sort((left, right) => left.name.localeCompare(right.name, "zh-Hans-CN"))

export function hasStaticBuildSourceViewCoverage(agentId: string) {
  return sourceViewAgentIdSet.has(agentId)
}

function resolveBaseMode(input: ResolveStaticBuildInput): StaticBuildBaseMode {
  if (input.mode === "full-buff") return "full-buff"
  if (input.mode === "manual") return input.manualBaseMode ?? "baseline"
  return "baseline"
}

function resolveDriveDiscSets(
  sets: ResolveStaticBuildInput["loadout"]["driveDiscSets"],
): Array<StaticBuildCatalogEntry & { pieces: 2 | 4 }> {
  return (sets ?? []).map((set) => {
    const disc = getStaticBuildDriveDisc(set.id)
    if (!disc) {
      throw new RangeError(`Unsupported driveDiscId: ${set.id}`)
    }
    return {
      ...disc,
      pieces: set.pieces,
    }
  })
}

function resolveLoadout(
  input: ResolveStaticBuildInput,
): StaticBuildResolvedLoadout {
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

  return {
    agent,
    wEngine,
    driveDiscSets: resolveDriveDiscSets(input.loadout.driveDiscSets),
    agentLevel: input.loadout.agentLevel ?? 60,
    agentMindscape: input.loadout.agentMindscape ?? 0,
    coreSkillLevel: input.loadout.coreSkillLevel ?? 7,
    wEngineRefinement: input.loadout.wEngineRefinement ?? 1,
  }
}

export function resolveStaticBuildSourceDamageViews(
  input: ResolveStaticBuildInput,
): ResolveStaticBuildSourceDamageViewsResult {
  const mode = input.mode ?? "baseline"
  const loadout = resolveLoadout(input)
  const entries: StaticBuildSourceDamageViewEntry[] = []

  if (input.loadout.agentId === "1401") {
    entries.push(resolveAlicePolarityAssaultView(input))
  }

  if (input.loadout.agentId === "1091") {
    entries.push(resolveMiyabiFrostburnBreakView(input))
  }

  if (input.loadout.agentId === "1171") {
    entries.push(resolveBurniceEmberView(input))
  }

  if (input.loadout.agentId === "1501") {
    entries.push(resolveAriaExflowView(input))
  }

  return {
    mode,
    manualBaseMode:
      input.mode === "manual" ? resolveBaseMode(input) : undefined,
    loadout,
    entries,
    assumptions: [],
  }
}

function createRequirement(
  kind: StaticBuildSourceDamageViewRequirement["kind"],
  key: string,
  satisfied: boolean,
): StaticBuildSourceDamageViewRequirement {
  return { kind, key, satisfied }
}

function createEntryBase(
  input: ResolveStaticBuildInput,
  entry: Pick<
    StaticBuildSourceDamageViewEntry,
    "id" | "label" | "sourceType" | "sourceId" | "resolutionMode"
  >,
  requirements: StaticBuildSourceDamageViewRequirement[],
): StaticBuildSourceDamageViewEntry {
  const sourceNotes = getStaticBuildSourceNoteEntries({
    sourceType: entry.sourceType,
    sourceId: entry.sourceId,
    damageType: input.scenario.damageType,
    agentMindscape: input.loadout.agentMindscape ?? 0,
    energyGenerationRate: input.panel.energyGenerationRate,
    anomalyMastery: input.panel.anomalyMastery,
    dynamicSnapshot: input.scenario.dynamicSnapshot,
    stateSnapshot: input.scenario.stateSnapshot,
    resolvedSnapshot: input.scenario.resolvedSnapshot,
    isStunned: input.scenario.enemy.isStunned,
    disorderSourceType:
      input.scenario.damageType === "disorder"
        ? input.scenario.anomalyType
        : undefined,
  })
  return {
    ...entry,
    damageType: input.scenario.damageType,
    supported: requirements.every((item) => item.satisfied),
    requirements,
    diagnostics: [],
    sourceNotes,
    assumptions: [],
  }
}

function toEntryDamage(result: ResolveStaticBuildResult) {
  return {
    expected: result.damage.expected.total,
    crit: result.damage.crit.total,
    noCrit: result.damage.noCrit.total,
  }
}

function withResolvedSkillMultiplierFactor(
  input: ResolveStaticBuildInput,
  factor: number,
): ResolveStaticBuildInput {
  const previous =
    input.scenario.resolvedSnapshot?.multiplierFactors?.skillMultiplierFactor ??
    1

  return {
    ...input,
    scenario: {
      ...input.scenario,
      resolvedSnapshot: {
        ...input.scenario.resolvedSnapshot,
        multiplierFactors: {
          ...input.scenario.resolvedSnapshot?.multiplierFactors,
          skillMultiplierFactor: previous * factor,
        },
      },
    },
  }
}

function withoutBurniceEmberSnapshot(
  input: ResolveStaticBuildInput,
): ResolveStaticBuildInput {
  const flags = { ...input.scenario.dynamicSnapshot?.flags }
  const counts = { ...input.scenario.dynamicSnapshot?.counts }
  const values = { ...input.scenario.dynamicSnapshot?.values }

  delete flags.burniceEmberState
  delete counts.burniceEmberExtraTriggers
  delete values.burniceEmberDamageRatio

  return {
    ...input,
    scenario: {
      ...input.scenario,
      dynamicSnapshot: {
        ...input.scenario.dynamicSnapshot,
        flags,
        counts,
        values,
      },
    },
  }
}

function resolveAlicePolarityAssaultView(
  input: ResolveStaticBuildInput,
): StaticBuildSourceDamageViewEntry {
  const requirements = [
    createRequirement(
      "state-flag",
      "alicePolarityAssaultState",
      input.scenario.stateSnapshot?.flags?.alicePolarityAssaultState === true,
    ),
    createRequirement(
      "state-value",
      "alicePolarityAssaultDamageRatio",
      input.scenario.stateSnapshot?.values?.alicePolarityAssaultDamageRatio !==
        undefined,
    ),
  ]
  const entry = createEntryBase(
    input,
    {
      id: "alice-polarity-assault",
      label: "爱丽丝：[极性强击]",
      sourceType: "agent",
      sourceId: "1401",
      resolutionMode: "standalone",
    },
    requirements,
  )

  if (!entry.supported) {
    entry.assumptions.push(
      "需要通过 scenario.stateSnapshot 显式提供 [极性强击] 的状态与倍率快照。",
    )
    return entry
  }

  const build = resolveStaticBuildDamage(input)
  entry.build = build
  entry.damage = toEntryDamage(build)
  entry.diagnostics = build.diagnostics
  entry.assumptions.push(
    "当前 view 直接复用主 resolver，并按 scenario.stateSnapshot 记录的 [极性强击] 倍率结算。",
  )
  return entry
}

function resolveMiyabiFrostburnBreakView(
  input: ResolveStaticBuildInput,
): StaticBuildSourceDamageViewEntry {
  const ratio =
    input.scenario.stateSnapshot?.values?.miyabiFrostburnBreakDamageRatio
  const requirements = [
    createRequirement(
      "state-flag",
      "miyabiFrostburnBreakState",
      input.scenario.stateSnapshot?.flags?.miyabiFrostburnBreakState === true,
    ),
    createRequirement(
      "state-value",
      "miyabiFrostburnBreakDamageRatio",
      ratio !== undefined,
    ),
  ]
  const entry = createEntryBase(
    input,
    {
      id: "miyabi-frostburn-break",
      label: "雅：[霜灼·破]",
      sourceType: "agent",
      sourceId: "1091",
      resolutionMode: "standalone",
    },
    requirements,
  )

  if (!entry.supported || ratio === undefined) {
    entry.assumptions.push(
      "需要通过 scenario.stateSnapshot 显式提供 [霜灼·破] 的状态与倍率快照。",
    )
    return entry
  }

  const build = resolveStaticBuildDamage(
    withResolvedSkillMultiplierFactor(input, ratio),
  )
  entry.build = build
  entry.damage = toEntryDamage(build)
  entry.diagnostics = build.diagnostics
  entry.assumptions.push(
    "当前 view 以 scenario.stateSnapshot 的 [霜灼·破] 倍率快照驱动独立条目结算，不回写主公式。",
  )
  return entry
}

function resolveBurniceEmberView(
  input: ResolveStaticBuildInput,
): StaticBuildSourceDamageViewEntry {
  const requirements = [
    createRequirement(
      "dynamic-flag",
      "burniceEmberState",
      input.scenario.dynamicSnapshot?.flags?.burniceEmberState === true,
    ),
    createRequirement(
      "dynamic-count",
      "burniceEmberExtraTriggers",
      input.scenario.dynamicSnapshot?.counts?.burniceEmberExtraTriggers !==
        undefined,
    ),
    createRequirement(
      "dynamic-value",
      "burniceEmberDamageRatio",
      input.scenario.dynamicSnapshot?.values?.burniceEmberDamageRatio !==
        undefined,
    ),
  ]
  const entry = createEntryBase(
    input,
    {
      id: "burnice-ember",
      label: "柏妮思：[燃点]/[余烬]",
      sourceType: "agent",
      sourceId: "1171",
      resolutionMode: "delta",
    },
    requirements,
  )

  if (!entry.supported) {
    entry.assumptions.push(
      "需要通过 scenario.dynamicSnapshot 显式提供 [燃点]/[余烬] 的状态、次数和倍率快照。",
    )
    return entry
  }

  const withSnapshot = resolveStaticBuildDamage(input)
  const withoutSnapshot = resolveStaticBuildDamage(
    withoutBurniceEmberSnapshot(input),
  )
  entry.diagnostics = withSnapshot.diagnostics
  entry.damage = {
    expected:
      withSnapshot.damage.expected.total -
      withoutSnapshot.damage.expected.total,
    crit: withSnapshot.damage.crit.total - withoutSnapshot.damage.crit.total,
    noCrit:
      withSnapshot.damage.noCrit.total - withoutSnapshot.damage.noCrit.total,
  }
  entry.assumptions.push(
    "当前 view 使用“含 [余烬] 快照结果 - 去除 [余烬] 快照结果”的差值，表达额外结算的静态贡献。",
  )
  return entry
}

function withoutAriaExflowSnapshot(
  input: ResolveStaticBuildInput,
): ResolveStaticBuildInput {
  const values = { ...input.scenario.dynamicSnapshot?.values }

  delete values.ariaExflowDamageRatio
  delete values.ariaStunnedDamageRatio

  return {
    ...input,
    scenario: {
      ...input.scenario,
      dynamicSnapshot: {
        ...input.scenario.dynamicSnapshot,
        values,
      },
    },
  }
}

function resolveAriaExflowView(
  input: ResolveStaticBuildInput,
): StaticBuildSourceDamageViewEntry {
  const isStunned = input.scenario.enemy.isStunned === true
  const requirements = [
    createRequirement(
      "dynamic-value",
      "ariaExflowDamageRatio",
      input.scenario.dynamicSnapshot?.values?.ariaExflowDamageRatio !==
        undefined,
    ),
    createRequirement(
      "dynamic-value",
      "ariaStunnedDamageRatio",
      !isStunned ||
        input.scenario.dynamicSnapshot?.values?.ariaStunnedDamageRatio !==
          undefined,
    ),
  ]
  const entry = createEntryBase(
    input,
    {
      id: "aria-exflow",
      label: "爱芮：[异放]",
      sourceType: "agent",
      sourceId: "1501",
      resolutionMode: "delta",
    },
    requirements,
  )

  if (!entry.supported) {
    entry.assumptions.push(
      isStunned
        ? "目标处于失衡时，需要通过 scenario.dynamicSnapshot 显式提供 [异放] 基础倍率和失衡追加倍率快照。"
        : "需要通过 scenario.dynamicSnapshot 显式提供 [异放] 基础倍率快照。",
    )
    return entry
  }

  const withSnapshot = resolveStaticBuildDamage(input)
  const withoutSnapshot = resolveStaticBuildDamage(
    withoutAriaExflowSnapshot(input),
  )
  entry.diagnostics = withSnapshot.diagnostics
  entry.damage = {
    expected:
      withSnapshot.damage.expected.total -
      withoutSnapshot.damage.expected.total,
    crit: withSnapshot.damage.crit.total - withoutSnapshot.damage.crit.total,
    noCrit:
      withSnapshot.damage.noCrit.total - withoutSnapshot.damage.noCrit.total,
  }
  entry.assumptions.push(
    "当前 view 使用“含 [异放] 快照结果 - 去除 [异放] 快照结果”的差值，表达额外结算的静态贡献。",
  )
  return entry
}
