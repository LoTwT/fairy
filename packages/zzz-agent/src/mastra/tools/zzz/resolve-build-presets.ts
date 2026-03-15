import {
  getCompatibleStaticBuildUtilityWEngines,
  getCompatibleStaticBuildWEngines,
  supportedStaticBuildAgents,
  supportedStaticBuildDriveDiscs,
  supportedStaticBuildMatrixAgents,
  supportedStaticBuildSourceUtilityViewWEngines,
  supportedStaticBuildSourceViewAgents,
  supportedStaticBuildTriggerMatrixAgents,
  supportedStaticBuildUtilityAgents,
  supportedStaticBuildUtilityWEngines,
  supportedStaticBuildWEngines,
} from "zzz-data"

export const buildToolDamageCatalogPreset = {
  supportedAgents: supportedStaticBuildAgents,
  supportedWEngines: supportedStaticBuildWEngines,
  supportedDriveDiscs: supportedStaticBuildDriveDiscs,
  getCompatibleWEngines: (agent: (typeof supportedStaticBuildAgents)[number]) =>
    getCompatibleStaticBuildWEngines(agent.specialty),
} as const

export const buildToolSkillMatrixCatalogPreset = {
  supportedAgents: supportedStaticBuildMatrixAgents,
  supportedWEngines: supportedStaticBuildWEngines,
  supportedDriveDiscs: supportedStaticBuildDriveDiscs,
  getCompatibleWEngines: (
    agent: (typeof supportedStaticBuildMatrixAgents)[number],
  ) => getCompatibleStaticBuildWEngines(agent.specialty),
} as const

export const buildToolTriggerMatrixCatalogPreset = {
  supportedAgents: supportedStaticBuildTriggerMatrixAgents,
  supportedWEngines: supportedStaticBuildWEngines,
  supportedDriveDiscs: supportedStaticBuildDriveDiscs,
  getCompatibleWEngines: (
    agent: (typeof supportedStaticBuildTriggerMatrixAgents)[number],
  ) => getCompatibleStaticBuildWEngines(agent.specialty),
} as const

export const buildToolSourceDamageViewCatalogPreset = {
  supportedAgents: supportedStaticBuildSourceViewAgents,
  supportedWEngines: supportedStaticBuildWEngines,
  supportedDriveDiscs: supportedStaticBuildDriveDiscs,
  getCompatibleWEngines: (
    agent: (typeof supportedStaticBuildSourceViewAgents)[number],
  ) => getCompatibleStaticBuildWEngines(agent.specialty),
} as const

export const buildToolSourceUtilityViewCatalogPreset = {
  supportedAgents: supportedStaticBuildUtilityAgents,
  supportedWEngines: supportedStaticBuildUtilityWEngines,
  supportedSourceUtilityWEngines: supportedStaticBuildSourceUtilityViewWEngines,
  supportedDriveDiscs: supportedStaticBuildDriveDiscs,
  getCompatibleWEngines: (
    agent: (typeof supportedStaticBuildUtilityAgents)[number],
  ) => getCompatibleStaticBuildUtilityWEngines(agent.specialty),
} as const

export const buildToolSourceEntryCatalogPreset = {
  supportedAgents: supportedStaticBuildAgents,
  supportedUtilityAgents: supportedStaticBuildUtilityAgents,
  supportedSourceViewAgents: supportedStaticBuildSourceViewAgents,
  supportedWEngines: supportedStaticBuildWEngines,
  supportedUtilityWEngines: supportedStaticBuildUtilityWEngines,
  supportedSourceUtilityWEngines: supportedStaticBuildSourceUtilityViewWEngines,
  supportedDriveDiscs: supportedStaticBuildDriveDiscs,
  getCompatibleWEngines: (agent: (typeof supportedStaticBuildAgents)[number]) =>
    getCompatibleStaticBuildWEngines(agent.specialty),
  getCompatibleUtilityWEngines: (
    agent: (typeof supportedStaticBuildUtilityAgents)[number],
  ) => getCompatibleStaticBuildUtilityWEngines(agent.specialty),
} as const
