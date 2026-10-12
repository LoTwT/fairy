import type { SourceBlock } from "../../scripts/static-effects/source.ts"

/** fac62407 /wengines/60/refinementBuffs/4/effectBlocks/0 的独立冻结夹具。 */
export function blazingLaurelR5Block(): SourceBlock & { note: string } {
  return {
    id: "blk-legacy",
    name: "精5",
    note: "装备者的[普通攻击]命中敌人时，对目标施加一层[萎靡]，最多叠加20层，持续30秒，重复触发时刷新持续时间；队伍中任意角色攻击命中敌人时，目标每拥有一层[萎靡]，本次攻击中冰属性伤害和火属性伤害的暴击伤害提升2.4%，该效果全队唯一。",
    effects: [
      {
        id: "legacy-team-dmgBonus",
        origin: "",
        scope: "general",
        applyTarget: "team",
        applySituation: "global",
        applyProfession: null,
        teamProfession: null,
        teamProfessionValues: null,
        teamProfessionMinCount: null,
        skillSubcategoryId: null,
        elementFilter: ["火", "冰"],
        kind: "stacked",
        stat: "dmgBonus",
        value: 0,
        stackable: false,
        maxStacks: 20,
        valuePerStack: 2.4,
        defaultStacks: 20,
        enabledDefault: true,
        note: "",
      },
    ],
  }
}
