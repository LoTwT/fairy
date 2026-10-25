import type { AuthoringSupplementalRecord } from "./types.ts"

/**
 * P2-4d 一次性转录：revision 52 的音擎补充记录。生成路径不读取这些
 * 基线条目；编译按 supplementId 原位替换并沿用基线键序。
 */
/** nanoka:w-engines:13111 */
export const P2_4D_NANOKA_W_ENGINES_13111_SUPPLEMENT = {
  supplementId: "nanoka:w-engines:13111",
  source: "nanoka-integrated@3.3.12+19634983 w-engines/13111 /talents/1—5/desc",
  kind: "entity",
  optionId: "nanoka:w-engines:13111:refinement:red-axis",
  effectIds: ["w-engine:13111:nanoka:red-axis-talent"],
  supportedRanks: "refinement 1—5",
  computationTarget: "catalog entity + option",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:w-engines:12013:defense-on-hit */
export const P2_4D_NANOKA_W_ENGINES_12013_DEFENSE_ON_HIT_SUPPLEMENT = {
  supplementId: "nanoka:w-engines:12013:defense-on-hit",
  source: "nanoka-integrated@3.3.12+19634983 w-engines/12013 /talents/1—5/desc",
  kind: "option",
  optionId: "nanoka:w-engines:12013:defense-on-hit",
  effectIds: ["w-engine:12013:nanoka:defense-on-hit"],
  supportedRanks: "refinement 1—5",
  computationTarget: "catalog option on the mapped w-engine entity",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:w-engines:14114:basic-attack-damage-stacks */
export const P2_4D_NANOKA_W_ENGINES_14114_BASIC_ATTACK_DAMAGE_STACKS_SUPPLEMENT =
  {
    supplementId: "nanoka:w-engines:14114:basic-attack-damage-stacks",
    source:
      "nanoka-integrated@3.3.12+19634983 w-engines/14114 /talents/1—5/desc",
    kind: "option",
    optionId: "nanoka:w-engines:14114:basic-attack-damage-stacks",
    effectIds: ["w-engine:14114:nanoka:basic-attack-damage-stacks"],
    supportedRanks: "refinement 1—5；层数 0—5",
    computationTarget: "catalog option on the mapped w-engine entity",
    status: "integrated",
  } satisfies AuthoringSupplementalRecord

/** nanoka:w-engines:12004:team-impact-after-ex */
export const P2_4D_NANOKA_W_ENGINES_12004_TEAM_IMPACT_AFTER_EX_SUPPLEMENT = {
  supplementId: "nanoka:w-engines:12004:team-impact-after-ex",
  source: "nanoka-integrated@3.3.12+19634983 w-engines/12004 /talents/1—5/desc",
  kind: "option",
  optionId: "nanoka:w-engines:12004:team-impact-after-ex",
  effectIds: ["w-engine:12004:nanoka:team-impact-after-ex"],
  supportedRanks: "refinement 1—5",
  computationTarget: "catalog option on the mapped w-engine entity",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:w-engines:12009:impact-as-active-character */
export const P2_4D_NANOKA_W_ENGINES_12009_IMPACT_AS_ACTIVE_CHARACTER_SUPPLEMENT =
  {
    supplementId: "nanoka:w-engines:12009:impact-as-active-character",
    source:
      "nanoka-integrated@3.3.12+19634983 w-engines/12009 /talents/1—5/desc",
    kind: "option",
    optionId: "nanoka:w-engines:12009:impact-as-active-character",
    effectIds: ["w-engine:12009:nanoka:impact-as-active-character"],
    supportedRanks: "refinement 1—5",
    computationTarget: "catalog option on the mapped w-engine entity",
    status: "integrated",
  } satisfies AuthoringSupplementalRecord

/** nanoka:w-engines:13005:impact-per-retained-layer */
export const P2_4D_NANOKA_W_ENGINES_13005_IMPACT_PER_RETAINED_LAYER_SUPPLEMENT =
  {
    supplementId: "nanoka:w-engines:13005:impact-per-retained-layer",
    source:
      "nanoka-integrated@3.3.12+19634983 w-engines/13005 /talents/1—5/desc",
    kind: "option",
    optionId: "nanoka:w-engines:13005:impact-per-retained-layer",
    effectIds: ["w-engine:13005:nanoka:impact-per-retained-layer"],
    supportedRanks: "refinement 1—5；层数 0—8",
    computationTarget: "catalog option on the mapped w-engine entity",
    status: "integrated",
  } satisfies AuthoringSupplementalRecord

/** nanoka:w-engines:13007:impact-on-hit */
export const P2_4D_NANOKA_W_ENGINES_13007_IMPACT_ON_HIT_SUPPLEMENT = {
  supplementId: "nanoka:w-engines:13007:impact-on-hit",
  source: "nanoka-integrated@3.3.12+19634983 w-engines/13007 /talents/1—5/desc",
  kind: "option",
  optionId: "nanoka:w-engines:13007:impact-on-hit",
  effectIds: ["w-engine:13007:nanoka:impact-on-hit"],
  supportedRanks: "refinement 1—5",
  computationTarget: "catalog option on the mapped w-engine entity",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:w-engines:14110:impact-per-stack-after-ex */
export const P2_4D_NANOKA_W_ENGINES_14110_IMPACT_PER_STACK_AFTER_EX_SUPPLEMENT =
  {
    supplementId: "nanoka:w-engines:14110:impact-per-stack-after-ex",
    source:
      "nanoka-integrated@3.3.12+19634983 w-engines/14110 /talents/1—5/desc",
    kind: "option",
    optionId: "nanoka:w-engines:14110:impact-per-stack-after-ex",
    effectIds: ["w-engine:14110:nanoka:impact-per-stack-after-ex"],
    supportedRanks: "refinement 1—5；层数 0—2",
    computationTarget: "catalog option on the mapped w-engine entity",
    status: "integrated",
  } satisfies AuthoringSupplementalRecord

/** nanoka:w-engines:14116:impact-after-assist */
export const P2_4D_NANOKA_W_ENGINES_14116_IMPACT_AFTER_ASSIST_SUPPLEMENT = {
  supplementId: "nanoka:w-engines:14116:impact-after-assist",
  source: "nanoka-integrated@3.3.12+19634983 w-engines/14116 /talents/1—5/desc",
  kind: "option",
  optionId: "nanoka:w-engines:14116:impact-after-assist",
  effectIds: ["w-engine:14116:nanoka:impact-after-assist"],
  supportedRanks: "refinement 1—5",
  computationTarget: "catalog option on the mapped w-engine entity",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:w-engines:14125:impact-per-tea-layer */
export const P2_4D_NANOKA_W_ENGINES_14125_IMPACT_PER_TEA_LAYER_SUPPLEMENT = {
  supplementId: "nanoka:w-engines:14125:impact-per-tea-layer",
  source: "nanoka-integrated@3.3.12+19634983 w-engines/14125 /talents/1—5/desc",
  kind: "option",
  optionId: "nanoka:w-engines:14125:impact-per-tea-layer",
  effectIds: ["w-engine:14125:nanoka:impact-per-tea-layer"],
  supportedRanks: "refinement 1—5；层数 0—30",
  computationTarget: "catalog option on the mapped w-engine entity",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:w-engines:14136:soul-chain-1-layer */
export const P2_4D_NANOKA_W_ENGINES_14136_SOUL_CHAIN_1_LAYER_SUPPLEMENT = {
  supplementId: "nanoka:w-engines:14136:soul-chain-1-layer",
  source: "nanoka-integrated@3.3.12+19634983 w-engines/14136 /talents/1—5/desc",
  kind: "option",
  optionId: "nanoka:w-engines:14136:soul-chain-1-layer",
  effectIds: ["w-engine:14136:nanoka:soul-chain-1-layer"],
  supportedRanks: "refinement 1—5；有效[魂锁] 1 层完整档位（0/1）",
  computationTarget: "catalog option on the mapped w-engine entity",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:w-engines:14136:soul-chain-2-layer */
export const P2_4D_NANOKA_W_ENGINES_14136_SOUL_CHAIN_2_LAYER_SUPPLEMENT = {
  supplementId: "nanoka:w-engines:14136:soul-chain-2-layer",
  source: "nanoka-integrated@3.3.12+19634983 w-engines/14136 /talents/1—5/desc",
  kind: "option",
  optionId: "nanoka:w-engines:14136:soul-chain-2-layer",
  effectIds: ["w-engine:14136:nanoka:soul-chain-2-layer"],
  supportedRanks: "refinement 1—5；有效[魂锁] 2 层完整档位（0/1）",
  computationTarget: "catalog option on the mapped w-engine entity",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:w-engines:14136:soul-chain-3-layer */
export const P2_4D_NANOKA_W_ENGINES_14136_SOUL_CHAIN_3_LAYER_SUPPLEMENT = {
  supplementId: "nanoka:w-engines:14136:soul-chain-3-layer",
  source: "nanoka-integrated@3.3.12+19634983 w-engines/14136 /talents/1—5/desc",
  kind: "option",
  optionId: "nanoka:w-engines:14136:soul-chain-3-layer",
  effectIds: ["w-engine:14136:nanoka:soul-chain-3-layer"],
  supportedRanks: "refinement 1—5；有效[魂锁] 3 层完整档位（0/1）",
  computationTarget: "catalog option on the mapped w-engine entity",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:w-engines:14157:fixed-impact-points */
export const P2_4D_NANOKA_W_ENGINES_14157_FIXED_IMPACT_POINTS_SUPPLEMENT = {
  supplementId: "nanoka:w-engines:14157:fixed-impact-points",
  source: "nanoka-integrated@3.3.12+19634983 w-engines/14157 /talents/1—5/desc",
  kind: "option",
  optionId: "nanoka:w-engines:14157:fixed-impact-points",
  effectIds: ["w-engine:14157:nanoka:fixed-impact-points"],
  supportedRanks: "refinement 1—5",
  computationTarget: "catalog option on the mapped w-engine entity",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:w-engines:14162:crit-rate */
export const P2_4D_NANOKA_W_ENGINES_14162_CRIT_RATE_SUPPLEMENT = {
  supplementId: "nanoka:w-engines:14162:crit-rate",
  source: "nanoka-integrated@3.3.12+19634983 w-engines/14162 /talents/1—5/desc",
  kind: "entity",
  optionId: "nanoka:w-engines:14162:crit-rate",
  effectIds: ["w-engine:14162:nanoka:crit-rate"],
  supportedRanks: "精炼 1—5",
  computationTarget: "catalog entity + option",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:w-engines:14162:wind-resistance-ignore */
export const P2_4D_NANOKA_W_ENGINES_14162_WIND_RESISTANCE_IGNORE_SUPPLEMENT = {
  supplementId: "nanoka:w-engines:14162:wind-resistance-ignore",
  source: "nanoka-integrated@3.3.12+19634983 w-engines/14162 /talents/1—5/desc",
  kind: "option",
  optionId: "nanoka:w-engines:14162:wind-resistance-ignore",
  effectIds: ["w-engine:14162:nanoka:wind-resistance-ignore"],
  supportedRanks: "精炼 1—5",
  computationTarget: "catalog option on the supplement entity",
  status: "integrated",
} satisfies AuthoringSupplementalRecord
