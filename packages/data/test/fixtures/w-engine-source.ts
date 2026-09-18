/** 满足规则 nanoka-w-engine-reference/1 必需结构的合成输入；不读取真实 raw，不使用生产登记表生成 fixture。 */
export function wEngineSource() {
  return {
    id: 940001,
    code_name: "Weapon_B_Common_Example",
    name: "示例音擎",
    desc: "示例音擎的完整介绍。\n第二段保留换行。",
    desc2: "装备后可提升[强攻]代理人的战斗能力",
    desc3: "示例音擎的简短介绍。",
    rarity: 2,
    icon: "Assets/NapResources/UI/Sprite/Example/Weapon_Example.png",
    weapon_type: { "1": "强攻" },
    base_property: {
      name: "基础攻击力",
      name2: "基础攻击力",
      format: "{0:0.#}",
      value: 32,
    },
    rand_property: {
      name: "攻击力",
      name2: "攻击力百分比",
      format: "{0:0.#%}",
      value: 800,
    },
    level: {
      "0": { exp: 30, rate: 0, rate2: 10000 },
      "1": { exp: 60, rate: 1568, rate2: 10000 },
    },
    stars: {
      "0": { star_rate: 0, rand_rate: 0 },
      "1": { star_rate: 8922, rand_rate: 3000 },
    },
    materials: "10:7200,101010:2|10:16800,101020:7",
    talents: {
      "1": {
        name: "满月",
        desc: "<color=#FFFFFF>[普通攻击]</color>造成的伤害提升<color=#2BAD00>12%</color>。",
      },
      "2": {
        name: "满月",
        desc: "<color=#FFFFFF>[普通攻击]</color>造成的伤害提升<color=#2BAD00>14%</color>。",
      },
    },
  }
}

/**
 * 双语合成输入：共享字段两语言一致，本地化文本各自保留。
 * 索引记录的 `en` 与详情英文名称故意不同：名称必须取自详情顶层 name，不是索引摘要名。
 */
export function wEngineInput() {
  const zh = wEngineSource()
  const en = wEngineSource()
  en.name = "Example W-Engine"
  en.desc = "A synthetic W-Engine introduction.\nSecond paragraph."
  en.desc2 = "Equip to increase Attack Agents' combat capabilities"
  en.desc3 = "A synthetic W-Engine overview."
  en.weapon_type = { "1": "Attack" }
  en.base_property = {
    name: "Base ATK",
    name2: "Base ATK",
    format: "{0:0.#}",
    value: 32,
  }
  en.rand_property = {
    name: "ATK",
    name2: "Percent ATK",
    format: "{0:0.#%}",
    value: 800,
  }
  en.talents = {
    "1": {
      name: "Full Moon",
      desc: "Basic Attack DMG increases by 12%.",
    },
    "2": {
      name: "Full Moon",
      desc: "Basic Attack DMG increases by 14%.",
    },
  }
  return {
    entityId: "940001",
    detailLocales: ["zh", "en"] as const,
    sourceRecord: {
      icon: "Weapon_B_Common_Example",
      rank: 2,
      type: 1,
      en: "Index Example W-Engine",
      atk: 475,
      desc: "Index summary description.",
      sub: "ATK",
      ko: "예시",
      zh: "索引示例音擎",
      ja: "サンプル",
    },
    details: { zh, en },
  }
}

/**
 * 多成员合成输入的英文详情名称：按成员 ID 派生，类内唯一且与索引 `sourceRecord.en`
 * 及任何单成员 fixture 名称不同，用于捕获发布目录生成取错名称来源。
 */
export function syntheticWEngineEnglishName(memberId: string): string {
  return `Example W-Engine ${memberId}`
}
