/** 合成 fixture 的宽松来源记录类型：允许测试按来源 snake_case 结构做结构性改动。 */
export interface BangbooSourceStage {
  hp_max: number
  attack: number
  defence: number
  level_max: number
  level_min: number
  materials: Record<string, number>
  extra: Record<string, BangbooSourceExtraEntry>
}

/** 来源 extra 属性条目：prop/value 公共数值与 name/format 本语言文本。 */
export interface BangbooSourceExtraEntry {
  prop: number
  name: string
  format: string
  value: number
}

/** 来源技能类别：登记成员为 `level` 技能等级字典。 */
export interface BangbooSourceSkillCategory {
  level: Record<string, BangbooSourceSkillLevelEntry>
}

/** 来源技能等级条目：完全本地化文本。 */
export interface BangbooSourceSkillLevelEntry {
  name: string
  desc: string
  property: string[]
  param: string
}

/** 来源 skill_prop 条目：数字属性 key 的参数表与 element_accumulation_value 混合。 */
export interface BangbooSourceSkillPropEntry {
  element_accumulation_value: number
  [propId: string]: unknown
}

/** 合成 fixture 的完整来源详情结构。 */
export interface BangbooSourceFixture {
  id: number
  code_name: string
  name: string
  desc: string
  rarity: number
  icon: string
  stats: Record<string, number>
  level: Record<string, BangbooSourceStage>
  skill: Record<string, BangbooSourceSkillCategory>
  skill_prop: Record<string, BangbooSourceSkillPropEntry>
}

/** 满足规则 nanoka-bangboo-reference/1 必需结构的合成输入；不读取真实 raw，不使用生产登记表生成 fixture。 */
export function bangbooSource(): BangbooSourceFixture {
  return {
    id: 950001,
    code_name: "Bangboo_Example",
    name: "示例布",
    desc: "示例邦布的完整介绍。\n第二段保留换行。",
    rarity: 3,
    icon: "UI/Sprite/A1DynamicLoad/BangbooModGarage/UnPacker/BangbooRole/BangbooGarageRoleExample.png",
    stats: {
      endurance: 180,
      hp_max: 360,
      hpupgrade: 428397,
      attack: 50,
      attack_upgrade: 252034,
      break_stun: 90,
      element_abnormal_power: 120,
      defence: 30,
      def_upgrade: 85729,
      crit: 500,
      pen_ratio: 0,
      crit_dmg: 5000,
    },
    level: {
      "1": {
        hp_max: 0,
        attack: 0,
        defence: 0,
        level_max: 10,
        level_min: 0,
        materials: { "10": 15000, "102010": 4 },
        extra: {
          "20101": {
            prop: 20101,
            name: "暴击率",
            format: "{0:0.#%}",
            value: 0,
          },
          "21101": {
            prop: 21101,
            name: "暴击伤害",
            format: "{0:0.#%}",
            value: 0,
          },
        },
      },
      "2": {
        hp_max: 188,
        attack: 47,
        defence: 38,
        level_max: 20,
        level_min: 10,
        materials: {},
        extra: {
          "20101": {
            prop: 20101,
            name: "暴击率",
            format: "{0:0.#%}",
            value: 450,
          },
        },
      },
    },
    skill: {
      a: {
        level: {
          "1": {
            name: "冰刀舞",
            desc: "<color=#FFFFFF>[主动技]</color>\n招式发动时，舞动冰刀对敌人进行连续斩击，造成<color=#98EFF0>冰属性伤害</color>。",
            property: ["伤害倍率", "失衡倍率", "冷却时间"],
            param: "{Skill:9500101, Prop:1001}|{Skill:9500101, Prop:1002}|20秒",
          },
          "2": {
            name: "冰刀舞",
            desc: "<color=#FFFFFF>[主动技]</color>\n招式发动时，舞动冰刀对敌人进行连续斩击，造成<color=#98EFF0>冰属性伤害</color>。",
            property: ["伤害倍率", "失衡倍率", "冷却时间"],
            param: "{Skill:9500101, Prop:1001}|{Skill:9500101, Prop:1002}|18秒",
          },
        },
      },
      b: {
        level: {
          "1": {
            name: "干冰场地",
            desc: "队伍中存在2名或以上<color=#98EFF0>[冰属性]</color>角色时触发：属性异常积蓄值提升60%。",
            property: ["属性异常积蓄值提升"],
            param: "60%",
          },
        },
      },
      c: {
        level: {},
      },
    },
    skill_prop: {
      "9500101": {
        "1001": { main: 46200, growth: 4620, format: "%" },
        "1002": { main: 27000, growth: 2700, format: "%" },
        "element_accumulation_value": 34600,
      },
      "9500102": {
        "1001": { main: 95700, growth: 9570, format: "%" },
        "element_accumulation_value": 41000,
      },
    },
  }
}

/**
 * 双语合成输入：公共字段两语言一致，本地化文本各自保留。
 * `code_name` 两语言故意不同：Bangboo 的 codeName 留在各语言 details，不要求跨语言相等。
 * 阶段 3 与属性 21101（阶段 1）为语言独有条目；技能文本完全本地化。
 */
export function bangbooInput() {
  const zh = bangbooSource()
  const en = bangbooSource()
  en.code_name = "Bangboo Example"
  en.name = "Exampleboo"
  en.desc = "A synthetic bangboo introduction.\nSecond paragraph."
  // 属性 21101（阶段 1）改为仅 en 提供：zh 删除该条目，en 完整保留。
  delete zh.level["1"].extra["21101"]
  en.level = {
    "1": {
      ...en.level["1"],
      extra: {
        "20101": {
          prop: 20101,
          name: "CRIT Rate",
          format: "{0:0.#%}",
          value: 0,
        },
      },
    },
    "2": {
      ...en.level["2"],
      extra: {
        "20101": {
          prop: 20101,
          name: "CRIT Rate",
          format: "{0:0.#%}",
          value: 450,
        },
      },
    },
  }
  zh.level["3"] = {
    hp_max: 376,
    attack: 233,
    defence: 75,
    level_max: 30,
    level_min: 20,
    materials: { "10": 75000 },
    extra: {
      "21101": {
        prop: 21101,
        name: "暴击伤害",
        format: "{0:0.#%}",
        value: 2500,
      },
    },
  }
  en.level["1"].extra["21101"] = {
    prop: 21101,
    name: "CRIT DMG",
    format: "{0:0.#%}",
    value: 0,
  }
  en.skill = {
    a: {
      level: {
        "1": {
          name: "Ice Blade Dance",
          desc: "<color=#FFFFFF>[Special Attack]</color>\nStrikes enemies with ice blades, dealing <color=#98EFF0>Ice DMG</color>.",
          property: ["DMG Multiplier", "Daze Multiplier", "Cooldown"],
          param: "{Skill:9500101, Prop:1001}|{Skill:9500101, Prop:1002}|20s",
        },
        "2": {
          name: "Ice Blade Dance",
          desc: "<color=#FFFFFF>[Special Attack]</color>\nStrikes enemies with ice blades, dealing <color=#98EFF0>Ice DMG</color>.",
          property: ["DMG Multiplier", "Daze Multiplier", "Cooldown"],
          param: "{Skill:9500101, Prop:1001}|{Skill:9500101, Prop:1002}|18s",
        },
      },
    },
    b: {
      level: {
        "1": {
          name: "Dry Ice Field",
          desc: "When 2 or more <color=#98EFF0>[Ice Attribute]</color> agents are in the squad: Anomaly Buildup increases by 60%.",
          property: ["Anomaly Buildup increase"],
          param: "60%",
        },
      },
    },
    c: { level: {} },
  }
  return {
    entityId: "950001",
    detailLocales: ["zh", "en"] as const,
    sourceRecord: {
      icon: "UI/Sprite/A1DynamicLoad/BangbooModGarage/UnPacker/BangbooRole/BangbooGarageRoleExample.png",
      rank: 3,
      codename: "Bangboo_Example",
      en: "Index Exampleboo",
      desc: "Index summary description.",
      ko: "예시부",
      zh: "索引示例布",
      ja: "サンプルブ",
    },
    details: { zh, en },
  }
}

/**
 * 合法空值样例：icon 为空字符串、level 为空对象、各技能类别 level 为空对象、
 * skill_prop 为空对象（对应真实成员 55098 伊埃斯的形态），stats 仍为完整数值块。
 */
export function bangbooEmptyValueInput() {
  const base = bangbooSource()
  const zh = {
    ...base,
    icon: "",
    code_name: "Eous_Example",
    name: "伊埃斯样例",
    level: {},
    skill: { a: { level: {} }, b: { level: {} }, c: { level: {} } },
    skill_prop: {},
  }
  const en = {
    ...zh,
    code_name: "Eous Example",
    name: "Eous Example",
    desc: "A synthetic empty-value bangboo.",
  }
  return {
    entityId: "950001",
    detailLocales: ["zh", "en"] as const,
    sourceRecord: {
      icon: "",
      rank: 4,
      codename: "Eous_Example",
      en: "Eous Example",
      zh: "伊埃斯样例",
    },
    details: { zh, en },
  }
}

/**
 * 多成员合成输入的英文详情名称：按成员 ID 派生，类内唯一且与索引 `sourceRecord.en`
 * 及任何单成员 fixture 名称不同，用于捕获发布目录生成取错名称来源。
 */
export function syntheticBangbooEnglishName(memberId: string): string {
  return `Exampleboo ${memberId}`
}
