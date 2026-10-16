import type { SourceBlock } from "../../scripts/static-effects/source.ts"

/** fac62407 /agents/6/mindscapeBuffs/1/effectBlocks/0 的独立冻结夹具。 */
export function claretMindscape1Block(): SourceBlock & { note: string } {
  return {
    id: "blk-mtrkovf7-dqmjh3",
    name: "影画1",
    note: "克拉蕾攻击命中敌人并造成锐暴时，残痕积蓄效率提升20%；克拉蕾触发[毁伤]造成的伤害倍率提升至原本的130%。",
    effects: [
      {
        id: "eff-mtse9xm8-q641yp",
        origin: "",
        scope: "skill",
        applyTarget: "self",
        applySituation: "global",
        applyProfession: null,
        teamProfession: null,
        teamProfessionValues: null,
        teamProfessionMinCount: null,
        skillCategory: "special",
        skillSubcategoryId: "claret-special-mtsecz30",
        skillTargets: [
          { category: "special", subcategoryId: "claret-special-mtsecz30" },
        ],
        elementFilter: "all",
        kind: "fixed",
        stat: "skillDmgBonus",
        value: 30,
        stackable: false,
        maxStacks: 1,
        valuePerStack: 0,
        defaultStacks: 1,
        enabledDefault: true,
        note: "",
      },
    ],
  }
}
