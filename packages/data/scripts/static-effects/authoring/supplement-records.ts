import type { AuthoringSupplementalRecord } from "./types.ts"

/**
 * P2-4c 一次性转录：revision 52 中已有作者选项的 23 条 integrated
 * 补充来源记录。生成路径不读取这些基线条目；编译按 supplementId 原位
 * 替换并沿用基线键序。剩余 44 条 integrated 记录尚缺作者选项，33 条
 * out-of-scope 记录仍不进入作者层。
 */
/** nanoka:agents:1621:m6-giant-windstorm */
export const P2_4C_NANOKA_AGENTS_1621_M6_GIANT_WINDSTORM_SUPPLEMENT = {
  supplementId: "nanoka:agents:1621:m6-giant-windstorm",
  source:
    "nanoka-integrated@3.3.12+19634983 agents/1621 /talent/6/desc + /skill/special/description/4/desc + /skill/special/description/9/param/3",
  kind: "option",
  optionId: "nanoka:agents:1621:m6-giant-windstorm",
  effectIds: ["agent:1621:nanoka:m6-giant-windstorm"],
  supportedRanks: "影画6；核心1—7；层数0—1",
  computationTarget: "original giant windstorm one-second damage multiplier",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:agents:1621:additional-level-damage */
export const P2_4C_NANOKA_AGENTS_1621_ADDITIONAL_LEVEL_DAMAGE_SUPPLEMENT = {
  supplementId: "nanoka:agents:1621:additional-level-damage",
  source:
    "nanoka-integrated@3.3.12+19634983 agents/1621 /passive/level/1621501—1621507/desc/1",
  kind: "option",
  optionId: "nanoka:agents:1621:additional-level-damage",
  effectIds: ["agent:1621:nanoka:additional-level-damage"],
  supportedRanks: "核心 1—7；影画 0—6；层数 0—1",
  computationTarget: "catalog option on the existing supplement agent entity",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:agents:1621:additional-weathered-direct-damage */
export const P2_4C_NANOKA_AGENTS_1621_ADDITIONAL_WEATHERED_DIRECT_DAMAGE_SUPPLEMENT =
  {
    supplementId: "nanoka:agents:1621:additional-weathered-direct-damage",
    source:
      "nanoka-integrated@3.3.12+19634983 agents/1621 /passive/level/1621501—1621507/desc/1",
    kind: "option",
    optionId: "nanoka:agents:1621:additional-weathered-direct-damage",
    effectIds: ["agent:1621:nanoka:additional-weathered-direct-damage"],
    supportedRanks: "核心 1—7；影画 0—6；层数 0—1",
    computationTarget: "catalog option on the existing supplement agent entity",
    status: "integrated",
  } satisfies AuthoringSupplementalRecord

/** nanoka:agents:yixuan:m2-talisman-suppression-break-damage */
export const P2_4C_NANOKA_AGENTS_YIXUAN_M2_TALISMAN_SUPPRESSION_BREAK_DAMAGE_SUPPLEMENT =
  {
    supplementId: "nanoka:agents:yixuan:m2-talisman-suppression-break-damage",
    source: "nanoka-integrated@3.3.12+19634983 agents/1371 /talent/2/desc",
    kind: "option",
    optionId: "nanoka:agents:yixuan:m2-talisman-suppression-break-damage",
    effectIds: [
      "agent:1371:nanoka:m2-talisman-suppression-break-damage:mindscape:2",
    ],
    supportedRanks: "影画 2 及以上；层数 0—1",
    computationTarget: "catalog option on the mapped agent entity",
    status: "integrated",
  } satisfies AuthoringSupplementalRecord

/** nanoka:agents:yixuan:m1-falling-thunder-damage */
export const P2_4C_NANOKA_AGENTS_YIXUAN_M1_FALLING_THUNDER_DAMAGE_SUPPLEMENT = {
  supplementId: "nanoka:agents:yixuan:m1-falling-thunder-damage",
  source: "nanoka-integrated@3.3.12+19634983 agents/1371 /talent/1/desc",
  kind: "option",
  optionId: "nanoka:agents:yixuan:m1-falling-thunder-damage",
  effectIds: ["agent:1371:nanoka:m1-falling-thunder-damage:mindscape:1"],
  supportedRanks: "影画 1 及以上；层数 0—1",
  computationTarget: "catalog option on the mapped agent entity",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:agents:yixuan:aa-falling-thunder-damage */
export const P2_4C_NANOKA_AGENTS_YIXUAN_AA_FALLING_THUNDER_DAMAGE_SUPPLEMENT = {
  supplementId: "nanoka:agents:yixuan:aa-falling-thunder-damage",
  source:
    "nanoka-integrated@3.3.12+19634983 agents/1371 /passive/level/1371501—1371507/desc/1",
  kind: "option",
  optionId: "nanoka:agents:yixuan:aa-falling-thunder-damage",
  effectIds: ["agent:1371:nanoka:aa-falling-thunder-damage:mindscape:0"],
  supportedRanks: "影画 0—6；核心 1—7；层数 0—1",
  computationTarget: "catalog option on the mapped agent entity",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:agents:1621:core-element-critical-damage */
export const P2_4C_NANOKA_AGENTS_1621_CORE_ELEMENT_CRITICAL_DAMAGE_SUPPLEMENT =
  {
    supplementId: "nanoka:agents:1621:core-element-critical-damage",
    source:
      "nanoka-integrated@3.3.12+19634983 agents/1621 /passive/level/1621501—1621507/desc/0",
    kind: "option",
    optionId: "nanoka:agents:1621:core-element-critical-damage",
    effectIds: ["agent:1621:nanoka:core-element-critical-damage"],
    supportedRanks: "核心1—7；影画0—6；0—1开关；显式有效元素集合",
    computationTarget:
      "critical damage on the union of explicitly active elemental buffs and wind",
    status: "integrated",
  } satisfies AuthoringSupplementalRecord

/** nanoka:agents:1621:core-element-sharp-critical-damage */
export const P2_4C_NANOKA_AGENTS_1621_CORE_ELEMENT_SHARP_CRITICAL_DAMAGE_SUPPLEMENT =
  {
    supplementId: "nanoka:agents:1621:core-element-sharp-critical-damage",
    source:
      "nanoka-integrated@3.3.12+19634983 agents/1621 /passive/level/1621501—1621507/desc/0",
    kind: "option",
    optionId: "nanoka:agents:1621:core-element-sharp-critical-damage",
    effectIds: ["agent:1621:nanoka:core-element-sharp-critical-damage"],
    supportedRanks: "核心1—7；影画0—6；0—1开关；显式有效元素集合",
    computationTarget:
      "critical damage on the union of explicitly active elemental buffs and wind",
    status: "integrated",
  } satisfies AuthoringSupplementalRecord

/** nanoka:agents:astrayao:m4-quick-assist-bonus-damage */
export const P2_4C_NANOKA_AGENTS_ASTRAYAO_M4_QUICK_ASSIST_BONUS_DAMAGE_SUPPLEMENT =
  {
    supplementId: "nanoka:agents:astrayao:m4-quick-assist-bonus-damage",
    source: "nanoka-integrated@3.3.12+19634983 agents/1311 /talent/4/desc",
    kind: "option",
    optionId: "nanoka:agents:astrayao:m4-quick-assist-bonus-damage",
    effectIds: ["agent:1311:nanoka:m4-quick-assist-bonus-damage:mindscape:4"],
    supportedRanks: "影画 4—6；核心 1—7；层数 0—1",
    computationTarget:
      "one declared Attack teammate quick-assist heavy hit bonus, 3×Astra Yao current ATK",
    status: "integrated",
  } satisfies AuthoringSupplementalRecord

/** nanoka:agents:grace:m6-special-grenades */
export const P2_4C_NANOKA_AGENTS_GRACE_M6_SPECIAL_GRENADES_SUPPLEMENT = {
  supplementId: "nanoka:agents:grace:m6-special-grenades",
  source:
    "nanoka-integrated@3.3.12+19634983 agents/1181 /talent/6/desc + /skill/special/description",
  kind: "option",
  optionId: "nanoka:agents:grace:m6-special-grenades",
  effectIds: ["agent:1181:nanoka:m6-special-grenades:mindscape:6"],
  supportedRanks: "影画 6；潜能 0—6；层数 0—1",
  computationTarget: "original grenade combination damage multiplier",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:agents:grace:m6-ex-special-grenades */
export const P2_4C_NANOKA_AGENTS_GRACE_M6_EX_SPECIAL_GRENADES_SUPPLEMENT = {
  supplementId: "nanoka:agents:grace:m6-ex-special-grenades",
  source:
    "nanoka-integrated@3.3.12+19634983 agents/1181 /talent/6/desc + /skill/special/description",
  kind: "option",
  optionId: "nanoka:agents:grace:m6-ex-special-grenades",
  effectIds: ["agent:1181:nanoka:m6-ex-special-grenades:mindscape:6"],
  supportedRanks: "影画 6；潜能 0—6；层数 0—1",
  computationTarget: "original grenade combination damage multiplier",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:agents:evelyn:m6-lunalux-garrote-follow-up */
export const P2_4C_NANOKA_AGENTS_EVELYN_M6_LUNALUX_GARROTE_FOLLOW_UP_SUPPLEMENT =
  {
    supplementId: "nanoka:agents:evelyn:m6-lunalux-garrote-follow-up",
    source: "nanoka-integrated@3.3.12+19634983 agents/1321 /talent/6/desc",
    kind: "option",
    optionId: "nanoka:agents:evelyn:m6-lunalux-garrote-follow-up",
    effectIds: ["agent:1321:nanoka:m6-lunalux-garrote-follow-up:mindscape:6"],
    supportedRanks: "影画 6 及以上；层数 0—1",
    computationTarget: "catalog option on the mapped agent entity",
    status: "integrated",
  } satisfies AuthoringSupplementalRecord

/** nanoka:agents:s0anby:m6-electromagnetic-vortex */
export const P2_4C_NANOKA_AGENTS_S0ANBY_M6_ELECTROMAGNETIC_VORTEX_SUPPLEMENT = {
  supplementId: "nanoka:agents:s0anby:m6-electromagnetic-vortex",
  source: "nanoka-integrated@3.3.12+19634983 agents/1381 /talent/6/desc",
  kind: "option",
  optionId: "nanoka:agents:s0anby:m6-electromagnetic-vortex",
  effectIds: ["agent:1381:nanoka:m6-electromagnetic-vortex:mindscape:6"],
  supportedRanks: "影画 6 及以上；层数 0—1",
  computationTarget: "catalog option on the mapped agent entity",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:agents:dialyn:m6-aftertone-echo */
export const P2_4C_NANOKA_AGENTS_DIALYN_M6_AFTERTONE_ECHO_SUPPLEMENT = {
  supplementId: "nanoka:agents:dialyn:m6-aftertone-echo",
  source: "nanoka-integrated@3.3.12+19634983 agents/1481 /talent/6/desc",
  kind: "option",
  optionId: "nanoka:agents:dialyn:m6-aftertone-echo",
  effectIds: ["agent:1481:nanoka:m6-aftertone-echo:mindscape:6"],
  supportedRanks: "影画 6 及以上；层数 0—1",
  computationTarget: "catalog option on the mapped agent entity",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:agents:lighter:mindscape-4-frontline-energy-regen */
export const P2_4C_NANOKA_AGENTS_LIGHTER_MINDSCAPE_4_FRONTLINE_ENERGY_REGEN_SUPPLEMENT =
  {
    supplementId: "nanoka:agents:lighter:mindscape-4-frontline-energy-regen",
    source: "nanoka-integrated@3.3.12+19634983 agents/1161 /talent/4/desc",
    kind: "option",
    optionId: "nanoka:agents:lighter:mindscape-4-frontline-energy-regen",
    effectIds: [
      "agent:1161:nanoka:mindscape-4-frontline-energy-regen:mindscape:4",
    ],
    supportedRanks: "影画 4 及以上",
    computationTarget: "catalog option on the mapped agent entity",
    status: "integrated",
  } satisfies AuthoringSupplementalRecord

/** nanoka:w-engines:14162:squad-damage-bonus */
export const P2_4C_NANOKA_W_ENGINES_14162_SQUAD_DAMAGE_BONUS_SUPPLEMENT = {
  supplementId: "nanoka:w-engines:14162:squad-damage-bonus",
  source: "nanoka-integrated@3.3.12+19634983 w-engines/14162 /talents/1—5/desc",
  kind: "option",
  optionId: "nanoka:w-engines:14162:squad-damage-bonus",
  effectIds: ["w-engine:14162:nanoka:squad-damage-bonus"],
  supportedRanks: "精炼 1—5",
  computationTarget: "catalog option on the supplement entity",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:agents:nangongyu:m6-vibrato-modified-nonphysical */
export const P2_4C_NANOKA_AGENTS_NANGONGYU_M6_VIBRATO_MODIFIED_NONPHYSICAL_SUPPLEMENT =
  {
    supplementId: "nanoka:agents:nangongyu:m6-vibrato-modified-nonphysical",
    source: "nanoka-integrated@3.3.12+19634983 agents/1511 /talent/6/desc",
    kind: "option",
    optionId: "nanoka:agents:nangongyu:m6-vibrato-modified-nonphysical",
    effectIds: [
      "agent:1511:nanoka:m6-vibrato-modified-nonphysical:mindscape:6",
    ],
    supportedRanks: "影画 6 及以上；层数 0—4（0 关闭，有效层 1—4）",
    computationTarget: "catalog option on the mapped agent entity",
    status: "integrated",
  } satisfies AuthoringSupplementalRecord

/** nanoka:agents:nangongyu:m6-vibrato-modified-physical */
export const P2_4C_NANOKA_AGENTS_NANGONGYU_M6_VIBRATO_MODIFIED_PHYSICAL_SUPPLEMENT =
  {
    supplementId: "nanoka:agents:nangongyu:m6-vibrato-modified-physical",
    source: "nanoka-integrated@3.3.12+19634983 agents/1511 /talent/6/desc",
    kind: "option",
    optionId: "nanoka:agents:nangongyu:m6-vibrato-modified-physical",
    effectIds: ["agent:1511:nanoka:m6-vibrato-modified-physical:mindscape:6"],
    supportedRanks: "影画 6 及以上；层数 0—4（0 关闭，有效层 1—4）",
    computationTarget: "catalog option on the mapped agent entity",
    status: "integrated",
  } satisfies AuthoringSupplementalRecord

/** nanoka:w-engines:13112:retaliation-defense-damage */
export const P2_4C_NANOKA_W_ENGINES_13112_RETALIATION_DEFENSE_DAMAGE_SUPPLEMENT =
  {
    supplementId: "nanoka:w-engines:13112:retaliation-defense-damage",
    source:
      "nanoka-integrated@3.3.12+19634983 w-engines/13112 /talents/1—5/desc",
    kind: "option",
    optionId: "nanoka:w-engines:13112:retaliation-defense-damage",
    effectIds: [
      "w-engine:13112:nanoka:retaliation-defense-damage",
      "w-engine:13112:nanoka:retaliation-defense-damage:guaranteed-critical",
    ],
    supportedRanks: "refinement 1—5；层数 0—1",
    computationTarget:
      "catalog option on the mapped w-engine entity (two-rule complete state)",
    status: "integrated",
  } satisfies AuthoringSupplementalRecord

/** nanoka:w-engines:14001:critical-hit-bonus-damage */
export const P2_4C_NANOKA_W_ENGINES_14001_CRITICAL_HIT_BONUS_DAMAGE_SUPPLEMENT =
  {
    supplementId: "nanoka:w-engines:14001:critical-hit-bonus-damage",
    source:
      "nanoka-integrated@3.3.12+19634983 w-engines/14001 /talents/1—5/desc",
    kind: "option",
    optionId: "nanoka:w-engines:14001:critical-hit-bonus-damage",
    effectIds: ["w-engine:14001:nanoka:critical-hit-bonus-damage"],
    supportedRanks: "refinement 1—5；层数 0—1",
    computationTarget: "catalog option on the mapped w-engine entity",
    status: "integrated",
  } satisfies AuthoringSupplementalRecord

/** nanoka:agents:benbigger:m2-block-counter-defense-damage */
export const P2_4C_NANOKA_AGENTS_BENBIGGER_M2_BLOCK_COUNTER_DEFENSE_DAMAGE_SUPPLEMENT =
  {
    supplementId: "nanoka:agents:benbigger:m2-block-counter-defense-damage",
    source: "nanoka-integrated@3.3.12+19634983 agents/1121 /talent/2/desc",
    kind: "option",
    optionId: "nanoka:agents:benbigger:m2-block-counter-defense-damage",
    effectIds: [
      "agent:1121:nanoka:m2-block-counter-defense-damage:mindscape:2",
    ],
    supportedRanks: "影画 2—6；层数 0—1",
    computationTarget: "catalog option on the mapped agent entity",
    status: "integrated",
  } satisfies AuthoringSupplementalRecord

/** nanoka:agents:jane:m6-proficiency-damage */
export const P2_4C_NANOKA_AGENTS_JANE_M6_PROFICIENCY_DAMAGE_SUPPLEMENT = {
  supplementId: "nanoka:agents:jane:m6-proficiency-damage",
  source: "nanoka-integrated@3.3.12+19634983 agents/1261 /talent/6/desc",
  kind: "option",
  optionId: "nanoka:agents:jane:m6-proficiency-damage",
  effectIds: ["agent:1261:nanoka:m6-proficiency-damage:mindscape:6"],
  supportedRanks: "影画 6；层数 0—1",
  computationTarget: "catalog option on the mapped agent entity",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:agents:alice:m6-proficiency-damage */
export const P2_4C_NANOKA_AGENTS_ALICE_M6_PROFICIENCY_DAMAGE_SUPPLEMENT = {
  supplementId: "nanoka:agents:alice:m6-proficiency-damage",
  source: "nanoka-integrated@3.3.12+19634983 agents/1401 /talent/6/desc",
  kind: "option",
  optionId: "nanoka:agents:alice:m6-proficiency-damage",
  effectIds: [
    "agent:1401:nanoka:m6-proficiency-damage:mindscape:6",
    "agent:1401:nanoka:m6-proficiency-damage:mindscape:6:guaranteed-critical",
  ],
  supportedRanks: "影画 6；层数 0—1",
  computationTarget: "catalog option on the mapped agent entity",
  status: "integrated",
} satisfies AuthoringSupplementalRecord
