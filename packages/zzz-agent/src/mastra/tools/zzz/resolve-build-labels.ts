export const specialtyLabels = {
  Attack: "强攻",
  Stun: "击破",
  Anomaly: "异常",
  Support: "支援",
  Defense: "防护",
  Rupture: "命破",
} as const

export type BuildToolSpecialtyKey = keyof typeof specialtyLabels
