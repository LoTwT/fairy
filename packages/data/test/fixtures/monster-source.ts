/** 合成 fixture 的宽松来源记录类型：允许测试按来源 snake_case 结构做结构性改动。 */
export interface MonsterSourceUnit {
  id: number
  code_name: string
  icon: string
  tag: string[]
  type: string
  element: Record<string, number>
  stats: Record<string, number | boolean>
  curves: Record<string, { curve: number[]; ratio: number }>
}

/** 合成 fixture 的完整来源详情结构。 */
export interface MonsterSourceFixture {
  id: number
  monster_id: number
  monster_info: Record<string, MonsterSourceUnit>
  image_path: string
  name: string
  desc: string
  rarity: number
  group_id: number
  group_desc: string
  card_obtain: string
  card_quote: string
  card_skill_desc: string
  element_abnormal: Record<string, number>
}

/** 单个内部战斗单位的合成输入；覆盖数值与布尔混合的属性、弱点字典与成长曲线。 */
function monsterSourceUnit(id: number, code_name: string): MonsterSourceUnit {
  return {
    id,
    code_name,
    icon: "",
    tag: ["Ether", "Demote", "Small"],
    type: "Monster",
    element: { ice: 1, fire: 0, electric: 0, ether: 1, physical: 0, wind: 0 },
    stats: {
      hp: 80,
      attack: 48,
      defence: 45,
      crit: 0,
      crit_damage: 5000,
      crit_dmg_res: 0,
      is_stun: false,
      can_interrupt_stun_recover: true,
      ether_damage_res: -2000,
    },
    curves: {
      hp: { curve: [100, 116, 136, 159, 183, 200], ratio: 100 },
      attack: { curve: [100, 116, 136, 159, 183, 200], ratio: 100 },
      defence: { curve: [100, 116, 136, 159, 183, 200], ratio: 100 },
      stun: { curve: [100, 100, 100, 103, 103, 103], ratio: 100 },
    },
  }
}

/** 满足规则 nanoka-monster-reference/1 必需结构的合成输入；不读取真实 raw，不使用生产登记表生成 fixture。 */
export function monsterSource(): MonsterSourceFixture {
  return {
    id: 960001,
    // monsterId 与内部单位 ID 是不同身份层次：本 fixture 中它不在单位集合内。
    monster_id: 960100,
    monster_info: {
      "960101": monsterSourceUnit(960101, "Monster_ExampleA"),
      "960102": monsterSourceUnit(960102, "Monster_ExampleB"),
    },
    image_path:
      "UI/Sprite/A1DynamicLoad/BossCard/UnPacker/BossCardLv01/Monster_Example.png",
    name: "示例怪",
    desc: "示例怪物的完整介绍。\n第二段保留换行。",
    rarity: 1,
    group_id: 201,
    group_desc: "以骸化 hostile 为原型的高级敌怪。",
    card_obtain: "空洞深潜获得",
    card_quote: "「示例引语。」",
    card_skill_desc: "技能说明原文。",
    element_abnormal: { "10001": 600, "20001": 2250, "30005": 3000 },
  }
}

/**
 * 双语合成输入：公共字段两语言一致，本地化文本各自保留。
 * 一个详情包含多个内部战斗单位；monsterId 故意不在单位集合内，单位 key 与单位 id 一致。
 */
export function monsterInput() {
  const zh = monsterSource()
  const en = monsterSource()
  en.name = "OfficialName_"
  en.desc = "A synthetic monster introduction.\nSecond paragraph."
  en.group_desc = "Ethereal hostile archetype."
  en.card_obtain = "Obtained from Hollow Deep dives."
  en.card_quote = '"An example quote."'
  en.card_skill_desc = "Original skill description."
  return {
    entityId: "960001",
    detailLocales: ["zh", "en"] as const,
    sourceRecord: {
      icon: "UI/Sprite/A1DynamicLoad/BossCard/UnPacker/BossCardLv01/Monster_Example.png",
      tag: null,
      tag2: null,
      rarity: 1,
      group: 201,
      en: "OfficialName_",
      desc: "Index summary description.",
      ko: "예시몬스터",
      zh: "索引示例怪",
      ja: "サンプルモンスター",
    },
    details: { zh, en },
  }
}

/**
 * 合法空 `monster_info` 样例：无内部战斗单位的条目（对应真实数据中 40 个空
 * `monster_info` 成员的形态）；`element_abnormal` 与文本字段仍完整保留。
 * monsterId 不要求出现在空单位集合中。
 */
export function monsterEmptyInfoInput() {
  const zh = { ...monsterSource(), monster_info: {} }
  const en = {
    ...zh,
    name: "OfficialName_",
    desc: "A synthetic empty-unit monster.",
    group_desc: "Ethereal archetype.",
    card_obtain: "Not obtainable.",
    card_quote: '"Quote."',
    card_skill_desc: "Skill description.",
  }
  return {
    entityId: "960001",
    detailLocales: ["zh", "en"] as const,
    sourceRecord: {
      icon: "",
      tag: null,
      tag2: null,
      rarity: 2,
      group: 202,
      en: "OfficialName_",
      zh: "空单位示例怪",
    },
    details: { zh, en },
  }
}
