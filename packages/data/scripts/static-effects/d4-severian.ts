import type { Supplement } from "./supplements.ts"

const evidence = (pointer: string) => ({
  source: "data-package" as const,
  sourceId: "zzz-hp" as const,
  version: "2628b32cece086e371bafa05518a9a12650d9f74",
  locale: "zh" as const,
  path: "scripts/static-effects/evidence/zzz-hp-325-entities.json",
  pointer,
  sha256: "5826e29d7527e8013299c8cc9cee8a4d2725d3a522719893b3c7b123f611edca",
})

const severian: Supplement = {
  kind: "unsupported-option",
  supplementId: "nanoka:agents:1631:unregistered-buffs",
  source: "zzz-hp@2628b32 agents/severian",
  catalogEntityId: "agents:severian",
  optionId: "nanoka:agents:1631:unregistered-buffs",
  name: "赛维里安 · 未登记增益",
  conditionDescription:
    "3.2.5 冻结摘录只有赛维里安的身份、17 条技能与基础面板；七个影画位置与固定增益块均为空，没有可执行的效果记录。",
  target: "self",
  configuration: {},
  reason: "formula-out-of-scope",
  explanation:
    "D4-3 只登记赛维里安（1631）的目录身份、17 条技能与基础面板；2628b32 没有他的影画/固定增益机器记录，不能从名称或空块推断倍率、暴击或属性。显式选择本选项会得到本条具名拒绝；D5 rebaseline 后再按新来源核对。",
  supportedRanks: "未登记（不可选）",
  computationTarget:
    "declared unavailable option on the supplemental Severian entity",
  evidence: [evidence("/agents/1")],
  verification:
    "ZZZ-HP 2628b32 的 agents 块中赛维里安只有身份与基础字段；七个 mindscapeBuffs 均为空，fixedBuffs 没有 effects，技能清单另由 d4SkillInventory 记录 17 条。该登记不创建规则，也不把空块当作零贡献或声称已覆盖。",
}

const gripNotes = [1, 2, 3, 4, 5].map((rank) =>
  evidence(`/wengines/1/refinementBuffs/${rank - 1}/effectBlocks/0/note`),
)

const incarceratingGrip: Supplement = {
  kind: "unsupported-option",
  supplementId: "nanoka:w-engines:14163:passive",
  source: "zzz-hp@2628b32 w-engines/Incarcerating_Grip /refinementBuffs/1—5",
  catalogEntityId: "w-engines:Incarcerating_Grip",
  optionId: "nanoka:w-engines:14163:passive",
  name: "禁罪囚笼 · 被动",
  conditionDescription:
    "装备者暴击率提升 20/23/26/29/32%；装备者[普通攻击]命中敌人时，攻击力提升 10/11.5/13/14.5/16%，本次伤害无视目标 15/17.3/19.5/21.8/24% 风属性伤害抗性，持续 16 秒（按精炼 1—5）。",
  target: "self",
  configuration: { refinements: [1, 2, 3, 4, 5] },
  reason: "formula-out-of-scope",
  explanation:
    "3.2.5 五个精炼块只有完整 note，effects 为空；暴击率、条件攻击力与风抗无视都没有机器记录。D4-3 不按描述自造触发窗口或把 16 秒状态当作常驻，显式选择本选项会得到本条具名拒绝。基础面板中的 externalDefPercent 32 也留待 D5 映射，不在本批折算成防御或增伤。",
  supportedRanks: "精炼 1—5（不可选）",
  computationTarget:
    "declared unavailable option on the supplemental Incarcerating Grip entity",
  evidence: gripNotes,
  verification:
    "ZZZ-HP 2628b32 禁罪囚笼（14163）五档 note 逐档核对：暴击率 +20/23/26/29/32%；普通攻击命中后攻击力 +10/11.5/13/14.5/16%、风抗无视 15/17.3/19.5/21.8/24%，持续 16 秒。五个块的 effects 均为空，不能编译为常驻或无条件贡献；本批只登记缺口与基础面板清单（baseAtk 713、critRate 24%、externalDefPercent 32%，后者 D5 pending），不新增规则。",
}

/** D4-3：赛维里安与禁罪囚笼的目录身份、技能/面板清单与明确缺口。 */
export const D4_SEVERIAN_GRIP_SUPPLEMENTS: readonly Supplement[] = [
  severian,
  incarceratingGrip,
]
