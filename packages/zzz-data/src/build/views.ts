import type {
  ResolveStaticBuildInput,
  ResolveStaticBuildSourceDamageViewsResult,
  StaticBuildBaseMode,
  StaticBuildCatalogEntry,
  StaticBuildResolvedLoadout,
} from "./types.js"
import {
  getStaticBuildAgent,
  getStaticBuildDriveDisc,
  getStaticBuildWEngine,
} from "./catalog.js"

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

  return {
    mode,
    manualBaseMode:
      input.mode === "manual" ? resolveBaseMode(input) : undefined,
    loadout,
    entries: [],
    assumptions: [],
  }
}
