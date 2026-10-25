import type { AuthoringSupplementalRecord } from "./types.ts"

/**
 * P2-4g 一次性转录：revision 52 中洛克茜的 8 条单规则、单变体补充记录。
 * 生成路径不读取这些基线条目；编译按 supplementId 原位替换并沿用基线键序。
 * initial-energy-regen-conversion 的两个规则共享一个变体，留给后续通用多规则批次。
 */
/** nanoka:agents:1621:m1-hit-resistance-reduction */
export const P2_4G_NANOKA_AGENTS_1621_M1_HIT_RESISTANCE_REDUCTION_SUPPLEMENT = {
  supplementId: "nanoka:agents:1621:m1-hit-resistance-reduction",
  source: "nanoka-integrated@3.3.12+19634983 agents/1621 /talent/1/desc",
  kind: "option",
  optionId: "nanoka:agents:1621:m1-hit-resistance-reduction",
  effectIds: ["agent:1621:nanoka:m1-hit-resistance-reduction"],
  supportedRanks: "影画 1 及以上；核心 1—7",
  computationTarget: "catalog option on the existing supplement agent entity",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:agents:1621:m1-critical-damage */
export const P2_4G_NANOKA_AGENTS_1621_M1_CRITICAL_DAMAGE_SUPPLEMENT = {
  supplementId: "nanoka:agents:1621:m1-critical-damage",
  source: "nanoka-integrated@3.3.12+19634983 agents/1621 /talent/1/desc",
  kind: "option",
  optionId: "nanoka:agents:1621:m1-critical-damage",
  effectIds: ["agent:1621:nanoka:m1-critical-damage"],
  supportedRanks: "影画 1 及以上；核心 1—7",
  computationTarget: "catalog option on the existing supplement agent entity",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:agents:1621:m2-stun-damage */
export const P2_4G_NANOKA_AGENTS_1621_M2_STUN_DAMAGE_SUPPLEMENT = {
  supplementId: "nanoka:agents:1621:m2-stun-damage",
  source: "nanoka-integrated@3.3.12+19634983 agents/1621 /talent/2/desc",
  kind: "option",
  optionId: "nanoka:agents:1621:m2-stun-damage",
  effectIds: ["agent:1621:nanoka:m2-stun-damage"],
  supportedRanks: "影画 2 及以上；核心 1—7",
  computationTarget: "catalog option on the existing supplement agent entity",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:agents:1621:m4-ultimate-damage */
export const P2_4G_NANOKA_AGENTS_1621_M4_ULTIMATE_DAMAGE_SUPPLEMENT = {
  supplementId: "nanoka:agents:1621:m4-ultimate-damage",
  source: "nanoka-integrated@3.3.12+19634983 agents/1621 /talent/4/desc",
  kind: "option",
  optionId: "nanoka:agents:1621:m4-ultimate-damage",
  effectIds: ["agent:1621:nanoka:m4-ultimate-damage"],
  supportedRanks: "影画 4 及以上；核心 1—7",
  computationTarget: "catalog option on the existing supplement agent entity",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:agents:1621:m6-wind-resistance-ignore */
export const P2_4G_NANOKA_AGENTS_1621_M6_WIND_RESISTANCE_IGNORE_SUPPLEMENT = {
  supplementId: "nanoka:agents:1621:m6-wind-resistance-ignore",
  source: "nanoka-integrated@3.3.12+19634983 agents/1621 /talent/6/desc",
  kind: "option",
  optionId: "nanoka:agents:1621:m6-wind-resistance-ignore",
  effectIds: ["agent:1621:nanoka:m6-wind-resistance-ignore"],
  supportedRanks: "影画 6 及以上；核心 1—7",
  computationTarget: "catalog option on the existing supplement agent entity",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:agents:1621:additional-hit-stun-damage */
export const P2_4G_NANOKA_AGENTS_1621_ADDITIONAL_HIT_STUN_DAMAGE_SUPPLEMENT = {
  supplementId: "nanoka:agents:1621:additional-hit-stun-damage",
  source:
    "nanoka-integrated@3.3.12+19634983 agents/1621 /passive/level/1621501—1621507/desc/1",
  kind: "option",
  optionId: "nanoka:agents:1621:additional-hit-stun-damage",
  effectIds: ["agent:1621:nanoka:additional-hit-stun-damage"],
  supportedRanks: "核心 1—7；影画 0—6；层数 0—1",
  computationTarget: "catalog option on the existing supplement agent entity",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:agents:1621:core-wind-critical-damage */
export const P2_4G_NANOKA_AGENTS_1621_CORE_WIND_CRITICAL_DAMAGE_SUPPLEMENT = {
  supplementId: "nanoka:agents:1621:core-wind-critical-damage",
  source:
    "nanoka-integrated@3.3.12+19634983 agents/1621 /passive/level/1621501—1621507/desc/0",
  kind: "option",
  optionId: "nanoka:agents:1621:core-wind-critical-damage",
  effectIds: ["agent:1621:nanoka:core-wind-critical-damage"],
  supportedRanks: "核心1—7；影画0—6；单有效状态0—1",
  computationTarget:
    "single-state wind hit critical damage with one effective source per consumed output",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:agents:1621:core-wind-sharp-critical-damage */
export const P2_4G_NANOKA_AGENTS_1621_CORE_WIND_SHARP_CRITICAL_DAMAGE_SUPPLEMENT =
  {
    supplementId: "nanoka:agents:1621:core-wind-sharp-critical-damage",
    source:
      "nanoka-integrated@3.3.12+19634983 agents/1621 /passive/level/1621501—1621507/desc/0",
    kind: "option",
    optionId: "nanoka:agents:1621:core-wind-sharp-critical-damage",
    effectIds: ["agent:1621:nanoka:core-wind-sharp-critical-damage"],
    supportedRanks: "核心1—7；影画0—6；单有效状态0—1",
    computationTarget:
      "single-state wind hit critical damage with one effective source per consumed output",
    status: "integrated",
  } satisfies AuthoringSupplementalRecord
