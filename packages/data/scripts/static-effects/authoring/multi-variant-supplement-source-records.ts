import type { AuthoringSupplementalRecord } from "./types.ts"

/**
 * P2-4f 一次性转录：revision 52 中 5 条多 variant 补充记录。
 * 生成路径不读取这些基线条目；编译按 supplementId 原位替换并沿用基线键序。
 */
/** nanoka:nekomata:ordinary-dmg-bonus */
export const P2_4F_NANOKA_NEKOMATA_ORDINARY_DMG_BONUS_SUPPLEMENT = {
  supplementId: "nanoka:nekomata:ordinary-dmg-bonus",
  source:
    "nanoka-integrated@3.3.12+19634983 agents/1021 /passive/level/1021507/desc/0",
  kind: "option-variant",
  optionId: "agents:nekomata:mindscape:0:blk-legacy:legacy-self-dmgBonus",
  effectIds: ["agent:1021:nanoka:ordinary-dmgBonus:blk-legacy:mindscape:0"],
  supportedRanks: "core 7；潜能 0",
  computationTarget: "catalog option variant",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:nekomata:ordinary-show */
export const P2_4F_NANOKA_NEKOMATA_ORDINARY_SHOW_SUPPLEMENT = {
  supplementId: "nanoka:nekomata:ordinary-show",
  source:
    "nanoka-integrated@3.3.12+19634983 agents/1021 /passive/level/1021507/desc/1",
  kind: "option-variant",
  optionId:
    "agents:nekomata:mindscape:0:blk-ms4f4rbb-id7p58:eff-ms4f4rbb-y2jon7",
  effectIds: [
    "agent:1021:nanoka:ordinary-show:blk-ms4f4rbb-id7p58:mindscape:0",
  ],
  supportedRanks: "core 7；潜能 0；层数 1—2",
  computationTarget: "catalog option variant",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:ellen:ordinary-blade-dance */
export const P2_4F_NANOKA_ELLEN_ORDINARY_BLADE_DANCE_SUPPLEMENT = {
  supplementId: "nanoka:ellen:ordinary-blade-dance",
  source:
    "nanoka-integrated@3.3.12+19634983 agents/1191 /passive/level/1191507/desc/0",
  kind: "option-variant",
  optionId: "agents:ellen:mindscape:0:blk-legacy:legacy-self-critDmg",
  effectIds: ["agent:1191:nanoka:ordinary-blade-dance:mindscape:0"],
  supportedRanks: "core 7；潜能 0",
  computationTarget: "catalog option variant",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:harumasa:ordinary-crit-rate */
export const P2_4F_NANOKA_HARUMASA_ORDINARY_CRIT_RATE_SUPPLEMENT = {
  supplementId: "nanoka:harumasa:ordinary-crit-rate",
  source:
    "nanoka-integrated@3.3.12+19634983 agents/1201 /passive/level/1201507/desc/0",
  kind: "option-variant",
  optionId: "agents:harumasa:mindscape:0:blk-legacy:legacy-self-critRate",
  effectIds: ["agent:1201:nanoka:ordinary-crit-rate:mindscape:0"],
  supportedRanks: "core 7；潜能 0",
  computationTarget: "catalog option variant",
  status: "integrated",
} satisfies AuthoringSupplementalRecord

/** nanoka:harumasa:ordinary-crit-dmg */
export const P2_4F_NANOKA_HARUMASA_ORDINARY_CRIT_DMG_SUPPLEMENT = {
  supplementId: "nanoka:harumasa:ordinary-crit-dmg",
  source:
    "nanoka-integrated@3.3.12+19634983 agents/1201 /passive/level/1201507/desc/0",
  kind: "option-variant",
  optionId: "agents:harumasa:mindscape:0:blk-legacy:eff-ms4gx7ds-ijkzuy",
  effectIds: ["agent:1201:nanoka:ordinary-crit-dmg:mindscape:0"],
  supportedRanks: "core 7；潜能 0；层数 1—6",
  computationTarget: "catalog option variant",
  status: "integrated",
} satisfies AuthoringSupplementalRecord
