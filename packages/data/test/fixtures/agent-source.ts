/** 满足 v4 必需结构的合成输入；不读取真实 raw，不使用生产登记表生成 fixture。 */
export function parameter(main = 0) {
  return {
    main,
    growth: 0,
    format: "%",
    damage_percentage: 0,
    damage_percentage_growth: 0,
    stun_ratio: 0,
    stun_ratio_growth: 0,
    sp_recovery: 0,
    sp_recovery_growth: 0,
    fever_recovery: 0,
    fever_recovery_growth: 0,
    attribute_infliction: 0,
    sp_consume: 0,
    attack_data: [0],
    rp_recovery: 0,
    rp_recovery_growth: 0,
    ether_purify: 0,
  }
}

const property = () => ({ prop: 0, icon: "", name: "", format: "{0:0.#%}" })

export function agentSource() {
  return {
    id: 900001,
    code_name: "Example",
    name: "示例",
    icon: "raw_icon",
    rarity: 0,
    gender: 0,
    weapon_type: { "2": "职业", "10": "其他" },
    element_type: { "203": "属性" },
    hit_type: { "101": "类型" },
    camp: { "1": "阵营" },
    special_element_type: {},
    partner_info: { inter_knot_icon: "raw/path.png" },
    stats: {
      armor: 0,
      armor_growth: 0,
      attack: 0,
      attack_growth: 0,
      avatar_piece_id: 0,
      break_stun: 0,
      crit: 0,
      crit_damage: 0,
      crit_dmg_res: 0,
      crit_res: 0,
      defence: 0,
      defence_growth: 0,
      element_abnormal_power: 0,
      element_mystery: 0,
      endurance: 0,
      hp_growth: 0,
      hp_max: 0,
      pen_delta: 0,
      pen_rate: 0,
      rbl: 0,
      rbl_correction_factor: 0,
      rbl_probability: 0,
      shield: 0,
      shield_growth: 0,
      sp_bar_point: 0,
      sp_recover: 0,
      stun: 0,
      tags: ["raw_tag", "raw_tag"],
      rp_max: 0,
      rp_recover: 0,
    },
    level: {
      low_stage: {
        hp_max: 0,
        attack: 0,
        defence: 0,
        level_max: 0,
        level_min: 0,
        materials: { "1": 0 },
      },
    },
    level_exp: [10, 0],
    skin: { "1": { image: "original_image", name: "", desc: "" } },
    extra_level: {
      stage_key: {
        max_level: 0,
        extra: { prop_key: { prop: 0, value: 0, name: "", format: "" } },
      },
    },
    skill: {
      "g/~": {
        material: { stage_key: { "1": 0 } },
        description: [
          { name: "说明", desc: "原文\n{CAL:1+2}", potential: [] as number[] },
          {
            name: "参数",
            potential: [0],
            param: [
              {
                name: "倍率",
                desc: "{Skill:1}+{Skill:2}",
                potential: [],
                param: { "1": parameter(100), "2": parameter(200) },
              },
              {
                name: "失衡",
                desc: "",
                potential: [],
                param: { "1": parameter(50) },
              },
              { name: "消耗", desc: "60点", potential: [] },
            ],
          },
        ],
      },
    },
    skill_priority: [
      {
        id: 0,
        avatar_id: 900001,
        first_priority: [2, 1, 2],
        second_priority: [],
        third_priority: [],
        potential_levels: [0],
      },
    ],
    skill_list: {
      "1": {
        name: "独立元数据",
        desc: "",
        element_type: 203,
        hit_type: 101,
        potential: [],
      },
    },
    passive: {
      materials: {},
      level: {
        "1": {
          id: 1,
          level: 0,
          name: [""],
          desc: [],
          extra_property: {},
          potential: [0],
        },
      },
    },
    talent: { stage_key: { level: 0, name: "", desc: "", desc2: "" } },
    fairy_recommend: {
      slot4: 0,
      slot2: 0,
      slot_sub: 0,
      part_sub_list: [2, 1, 2],
      part4: property(),
      part5: property(),
      part6: property(),
      part_sub: property(),
    },
    strategy: {},
    potential: [0],
    potential_detail: {},
  }
}

export function agentInput() {
  const zh = agentSource()
  const en = agentSource()
  en.name = "Example Agent"
  en.weapon_type["2"] = "Specialty"
  en.skill["g/~"].description.reverse()
  return {
    entityId: "900001",
    detailLocales: ["zh", "en"] as const,
    sourceRecord: {
      zh: "独立索引",
      en: "Independent",
      ja: "索引のみ",
      ko: "색인",
      code_name: "Index identity",
    },
    details: { zh, en },
  }
}
