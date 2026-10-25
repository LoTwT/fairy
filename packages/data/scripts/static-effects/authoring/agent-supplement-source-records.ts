import type { AuthoringSupplementalRecord } from "./types.ts"

/**
 * P2-4e 一次性转录：revision 52 中 10 条单变体代理人/驱动盘补充记录。
 * 生成路径不读取这些基线条目；编译按 supplementId 原位替换并沿用基线键序。
 */
/** nanoka:soldier11:flame-prowess */
export const P2_4E_NANOKA_SOLDIER11_FLAME_PROWESS_SUPPLEMENT = {
  supplementId: "nanoka:soldier11:flame-prowess",
  source:
    "nanoka-integrated@3.3.12+19634983 agents/1041 /potentialDetail/104101—104105/desc",
  kind: "option",
  optionId: "nanoka:agents:soldier11:potential:flame-prowess",
  effectIds: ["agent:1041:nanoka:flame-prowess:mindscape:0"],
  supportedRanks: "潜能 2—6",
  computationTarget: "catalog option on the mapped agent entity",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:lycaon:ice-hunt-impact */
export const P2_4E_NANOKA_LYCAON_ICE_HUNT_IMPACT_SUPPLEMENT = {
  supplementId: "nanoka:lycaon:ice-hunt-impact",
  source:
    "nanoka-integrated@3.3.12+19634983 agents/1141 /potentialDetail/114101—114105/desc",
  kind: "option",
  optionId: "nanoka:agents:lycaon:potential:ice-hunt-impact",
  effectIds: ["agent:1141:nanoka:ice-hunt-impact:mindscape:0"],
  supportedRanks: "潜能 2—6",
  computationTarget: "catalog option on the mapped agent entity",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:alexandrina:perfect-service-pierce */
export const P2_4E_NANOKA_ALEXANDRINA_PERFECT_SERVICE_PIERCE_SUPPLEMENT = {
  supplementId: "nanoka:alexandrina:perfect-service-pierce",
  source:
    "nanoka-integrated@3.3.12+19634983 agents/1211 /potentialDetail/121101—121105/desc",
  kind: "option",
  optionId: "nanoka:agents:alexandrina:potential:perfect-service-pierce",
  effectIds: ["agent:1211:nanoka:perfect-service-pierce:mindscape:0"],
  supportedRanks: "潜能 2—6",
  computationTarget: "catalog option on the mapped agent entity",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:drive-discs:31200:two-piece-impact-percent */
export const P2_4E_NANOKA_DRIVE_DISCS_31200_TWO_PIECE_IMPACT_PERCENT_SUPPLEMENT =
  {
    supplementId: "nanoka:drive-discs:31200:two-piece-impact-percent",
    source: "nanoka-integrated@3.3.12+19634983 drive-discs/31200 /desc2",
    kind: "option",
    optionId: "nanoka:drive-discs:31200:two-piece-impact-percent",
    effectIds: ["disc:31200:nanoka:two-piece-impact-percent:setPieces:2"],
    supportedRanks: "2 件起",
    computationTarget: "catalog option on the mapped drive-disc entity",
    status: "integrated",
  } satisfies AuthoringSupplementalRecord

/** nanoka:koleda:enhanced-basic-second-per-layer */
export const P2_4E_NANOKA_KOLEDA_ENHANCED_BASIC_SECOND_PER_LAYER_SUPPLEMENT = {
  supplementId: "nanoka:koleda:enhanced-basic-second-per-layer",
  source:
    "nanoka-integrated@3.3.12+19634983 agents/1101 /skill/basic/description/1/desc",
  kind: "option",
  optionId: "nanoka:agents:koleda:enhanced-basic-second-per-layer",
  effectIds: ["agent:1101:nanoka:enhanced-basic-second-per-layer:mindscape:0"],
  supportedRanks: "潜能 1—6；消耗层数 0—2",
  computationTarget: "catalog option on the mapped agent entity",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:agents:caesar:stance-switch-impact */
export const P2_4E_NANOKA_AGENTS_CAESAR_STANCE_SWITCH_IMPACT_SUPPLEMENT = {
  supplementId: "nanoka:agents:caesar:stance-switch-impact",
  source:
    "nanoka-integrated@3.3.12+19634983 agents/1071 /skill/special/description/4/desc",
  kind: "option",
  optionId: "nanoka:agents:caesar:stance-switch-impact",
  effectIds: ["agent:1071:nanoka:stance-switch-impact:mindscape:0"],
  supportedRanks: "特殊技最终等级 1—16",
  computationTarget: "catalog option on the mapped agent entity",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:agents:lighter:morale-burst-impact */
export const P2_4E_NANOKA_AGENTS_LIGHTER_MORALE_BURST_IMPACT_SUPPLEMENT = {
  supplementId: "nanoka:agents:lighter:morale-burst-impact",
  source:
    "nanoka-integrated@3.3.12+19634983 agents/1161 /passive/level/1161501—1161507/desc/0",
  kind: "option",
  optionId: "nanoka:agents:lighter:morale-burst-impact",
  effectIds: ["agent:1161:nanoka:morale-burst-impact:mindscape:0"],
  supportedRanks: "核心 1—7；层数 0—10",
  computationTarget: "catalog option on the mapped agent entity",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:agents:jufufu:tigers-roar-impact */
export const P2_4E_NANOKA_AGENTS_JUFUFU_TIGERS_ROAR_IMPACT_SUPPLEMENT = {
  supplementId: "nanoka:agents:jufufu:tigers-roar-impact",
  source:
    "nanoka-integrated@3.3.12+19634983 agents/1391 /passive/level/1391501—1391507/desc/0",
  kind: "option",
  optionId: "nanoka:agents:jufufu:tigers-roar-impact",
  effectIds: ["agent:1391:nanoka:tigers-roar-impact:mindscape:0"],
  supportedRanks: "核心 1—7",
  computationTarget: "catalog option on the mapped agent entity",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:agents:dialyn:initial-crit-rate-impact */
export const P2_4E_NANOKA_AGENTS_DIALYN_INITIAL_CRIT_RATE_IMPACT_SUPPLEMENT = {
  supplementId: "nanoka:agents:dialyn:initial-crit-rate-impact",
  source:
    "nanoka-integrated@3.3.12+19634983 agents/1481 /passive/level/1481049—1481055/desc/0",
  kind: "option",
  optionId: "nanoka:agents:dialyn:initial-crit-rate-impact",
  effectIds: ["agent:1481:nanoka:initial-crit-rate-impact:mindscape:0"],
  supportedRanks: "核心 1—7",
  computationTarget: "catalog option on the mapped agent entity",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:agents:alexandrina:mindscape-4-deployed-dolls-energy-regen */
export const P2_4E_NANOKA_AGENTS_ALEXANDRINA_MINDSCAPE_4_DEPLOYED_DOLLS_ENERGY_REGEN_SUPPLEMENT =
  {
    supplementId:
      "nanoka:agents:alexandrina:mindscape-4-deployed-dolls-energy-regen",
    source: "nanoka-integrated@3.3.12+19634983 agents/1211 /talent/4/desc",
    kind: "option",
    optionId:
      "nanoka:agents:alexandrina:mindscape-4-deployed-dolls-energy-regen",
    effectIds: [
      "agent:1211:nanoka:mindscape-4-deployed-dolls-energy-regen:mindscape:4",
    ],
    supportedRanks: "影画 4 及以上",
    computationTarget: "catalog option on the mapped agent entity",
    status: "integrated",
  } satisfies AuthoringSupplementalRecord
