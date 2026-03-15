export type BuildToolSpecialtyKey =
  | "Attack"
  | "Stun"
  | "Anomaly"
  | "Support"
  | "Defense"
  | "Rupture"

export type BuildToolSpecialtyLabel =
  | "强攻"
  | "击破"
  | "异常"
  | "支援"
  | "防护"
  | "命破"

export const specialtyLabels = {
  Attack: "强攻",
  Stun: "击破",
  Anomaly: "异常",
  Support: "支援",
  Defense: "防护",
  Rupture: "命破",
} as const satisfies Record<BuildToolSpecialtyKey, BuildToolSpecialtyLabel>
