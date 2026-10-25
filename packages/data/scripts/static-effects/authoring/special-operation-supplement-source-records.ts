import type { AuthoringSupplementalRecord } from "./types.ts"

/**
 * P2-4i 一次性转录：revision 52 中最后 4 条专用结算补充记录。
 * 生成路径不读取这些基线条目；编译按 supplementId 原位替换并沿用基线键序。
 */
/** nanoka:agents:lucy:guard-boar-inheritance */
export const P2_4I_NANOKA_AGENTS_LUCY_GUARD_BOAR_INHERITANCE_SUPPLEMENT = {
  supplementId: "nanoka:agents:lucy:guard-boar-inheritance",
  source: "nanoka-integrated@3.3.12+19634983 agents/1151 passive core1—7",
  kind: "option",
  optionId: "nanoka:agents:lucy:guard-boar-inheritance",
  effectIds: ["agent:1151:nanoka:guard-boar-inheritance:mindscape:0"],
  supportedRanks: "核心1—7；影画0—6；层数0—1",
  computationTarget:
    "explicit own plus Lucy current guard-boar attributes, selected Cheer On deduplicated",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:agents:lucy:m6-boar-rain */
export const P2_4I_NANOKA_AGENTS_LUCY_M6_BOAR_RAIN_SUPPLEMENT = {
  supplementId: "nanoka:agents:lucy:m6-boar-rain",
  source: "nanoka-integrated@3.3.12+19634983 agents/1151 /talent/6/desc",
  kind: "option",
  optionId: "nanoka:agents:lucy:m6-boar-rain",
  effectIds: ["agent:1151:nanoka:m6-boar-rain:mindscape:6"],
  supportedRanks: "影画6；核心1—7；层数0—1",
  computationTarget:
    "one explicit guard-boar M6 fire explosion, 3×resolved boar ATK",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:agents:alice:core-periodic-damage */
export const P2_4I_NANOKA_AGENTS_ALICE_CORE_PERIODIC_DAMAGE_SUPPLEMENT = {
  supplementId: "nanoka:agents:alice:core-periodic-damage",
  source:
    "nanoka-integrated@3.3.12+19634983 agents/1401 /passive/level/1401501—1401507/desc/0",
  kind: "option",
  optionId: "nanoka:agents:alice:core-periodic-damage",
  effectIds: ["agent:1401:nanoka:core-periodic-damage:mindscape:0"],
  supportedRanks: "核心 1—7；影画 0—6；层数 0—1",
  computationTarget:
    "one declared Alice core periodic event, using the original settled actual physical Assault damage",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:agents:yeshunguang:veil-vulnerability */
export const P2_4I_NANOKA_AGENTS_YESHUNGUANG_VEIL_VULNERABILITY_SUPPLEMENT = {
  supplementId: "nanoka:agents:yeshunguang:veil-vulnerability",
  source:
    "nanoka-integrated@3.3.12+19634983 agents/1431 /passive/level/1431501—1431507/desc/0 + /talent/4/desc",
  kind: "option",
  optionId: "nanoka:agents:yeshunguang:veil-vulnerability",
  effectIds: ["agent:1431:nanoka:veil-vulnerability:mindscape:0"],
  supportedRanks: "核心 1—7；影画 0—6；层数 0—1",
  computationTarget:
    "declared entry veil bonus replaces this hit's ordinary stun damage factor",
  status: "integrated",
} satisfies AuthoringSupplementalRecord
