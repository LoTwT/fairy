// The order matches buhflipexplode enemy arrays such as elementMult.
export const ATTRIBUTE_KEYS = [
  "ice",
  "fire",
  "electric",
  "ether",
  "physical",
] as const

export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number]
