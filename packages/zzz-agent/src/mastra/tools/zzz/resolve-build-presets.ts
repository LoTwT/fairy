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

export const buildToolDescriptions = {
  resolver:
    "基于 zzz-data 的静态构筑解析器直接计算伤害。当前支持全部强攻/命破/异常代理人，以及对应特性的强攻/命破/异常音擎；异常代理人当前支持 anomaly / disorder 单次 resolver，不支持 skill matrix。",
  skillMatrix:
    "基于 zzz-data 的静态构筑解析器批量计算全技能/全段伤害矩阵。当前仅支持强攻/命破代理人，以及对应特性的强攻/命破音擎；异常代理人暂只支持单次 resolver。",
  triggerMatrix:
    "查询 anomaly / disorder 的 trigger-entry matrix。当前只覆盖已有 source view 的异常代理人：爱丽丝、雅、柏妮思、爱芮、薇薇安；结果会并列返回主公式结算与 source-specific 额外结算条目。",
  sourceDamageView:
    "查询 anomaly / disorder 的 source-specific 额外结算条目。当前覆盖爱丽丝 [极性强击]、雅 [霜灼·破]、柏妮思 [燃点]/[余烬]、爱芮 [异放]、薇薇安 [异放]，不会把这些条目并回主公式。",
  sourceUtilityView:
    "查询 source-specific utility / resource 条目。当前覆盖稳定可表达的音擎回能、后场回能速率与喧响值条目，不并回主伤害公式。",
  sourceEntryCollection:
    "统一查询当前构筑的 source-specific 条目集合：可一次性返回 anomaly / disorder 的独立额外结算条目，以及音擎提供的 utility / resource 条目。不会把这些条目并回主公式。",
} as const

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
