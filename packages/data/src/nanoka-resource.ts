export interface NanokaAdrenalinePanelSource {
  stats: Record<string, unknown>
}

export interface NanokaSkillResourceParam {
  fever_recovery?: unknown
  fever_recovery_growth?: unknown
  rp_recovery?: unknown
  rp_recovery_growth?: unknown
}

export interface NanokaAdrenalinePanel {
  maxAdrenaline: number
  automaticAdrenalineAccumulation: number
}

export interface NanokaSkillResourceRecovery {
  resonanceRecovery: number
  resonanceRecoveryGrowth: number
  adrenalineRecovery: number
  adrenalineRecoveryGrowth: number
}

export const nanokaResourceUnitRules = {
  maxAdrenaline: "stats.rp_max",
  automaticAdrenalineAccumulation: "stats.rp_recover / 100",
  resonanceRecovery: "fever_recovery / 1000",
  resonanceRecoveryGrowth: "fever_recovery_growth / 1000",
  adrenalineRecovery: "rp_recovery / 10000",
  adrenalineRecoveryGrowth: "rp_recovery_growth / 10000",
} as const

export function deriveNanokaAdrenalinePanel(
  source: NanokaAdrenalinePanelSource,
): NanokaAdrenalinePanel {
  return {
    maxAdrenaline: requiredNumber(source.stats.rp_max, "stats.rp_max"),
    automaticAdrenalineAccumulation: requiredNumber(source.stats.rp_recover, "stats.rp_recover") / 100,
  }
}

export function deriveNanokaSkillResourceRecovery(
  param: NanokaSkillResourceParam,
): NanokaSkillResourceRecovery {
  return {
    resonanceRecovery: requiredNumber(param.fever_recovery, "fever_recovery") / 1000,
    resonanceRecoveryGrowth: requiredNumber(param.fever_recovery_growth, "fever_recovery_growth") / 1000,
    adrenalineRecovery: requiredNumber(param.rp_recovery, "rp_recovery") / 10000,
    adrenalineRecoveryGrowth: requiredNumber(param.rp_recovery_growth, "rp_recovery_growth") / 10000,
  }
}

function requiredNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error(`Missing numeric nanoka resource field ${path}`)
  return value
}
