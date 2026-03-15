import type {
  StaticBuildProfileDefinition,
  StaticBuildProfileId,
} from "./types.js"

export const staticBuildProfiles = {
  "standard-normal": {
    id: "standard-normal",
    name: "Standard Normal Profile",
    supportsDamageType: (damageType: string) => damageType === "normal",
    resolveBaseDamageValue: ({ panel }) => panel.attack,
    baseDamageStat: "attack",
  },
  "standard-sheer": {
    id: "standard-sheer",
    name: "Standard Sheer Profile",
    supportsDamageType: (damageType: string) => damageType === "sheer",
    resolveBaseDamageValue: ({ panel }) => {
      if (panel.sheerForce !== undefined) return panel.sheerForce
      throw new RangeError("命破 profile 需要 finalPanel.sheerForce")
    },
    baseDamageStat: "sheerForce",
  },
  "standard-anomaly": {
    id: "standard-anomaly",
    name: "Standard Anomaly Profile",
    supportsDamageType: (damageType: string) => damageType === "anomaly",
    resolveBaseDamageValue: ({ panel }) => panel.attack,
    baseDamageStat: "attack",
  },
  "standard-disorder": {
    id: "standard-disorder",
    name: "Standard Disorder Profile",
    supportsDamageType: (damageType: string) => damageType === "disorder",
    resolveBaseDamageValue: ({ panel }) => panel.attack,
    baseDamageStat: "attack",
  },
  "yixuan-sheer": {
    id: "yixuan-sheer",
    name: "Yixuan Sheer Profile",
    supportsDamageType: (damageType: string) => damageType === "sheer",
    resolveBaseDamageValue: ({ panel, assumptions }) => {
      if (panel.sheerForce !== undefined) return panel.sheerForce
      if (panel.hp !== undefined) {
        assumptions.push(
          "未提供贯穿力，按仪玄核心技使用生命值 × 0.1 推导贯穿力",
        )
        return panel.hp * 0.1
      }
      throw new RangeError(
        "仪玄 profile 需要 finalPanel.sheerForce 或 finalPanel.hp",
      )
    },
    baseDamageStat: "sheerForce",
  },
} as const satisfies Record<StaticBuildProfileId, StaticBuildProfileDefinition>

export function getStaticBuildProfile(id: StaticBuildProfileId) {
  return staticBuildProfiles[id]
}
