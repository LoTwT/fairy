/** 合成 fixture 的宽松来源记录类型：允许测试按来源 snake_case 结构做结构性改动。 */
export interface BossSourceEncounter {
  id: number
  name: string
  image: string
  element: Record<string, number>
  stats: Record<string, number>
}

/** 来源 `layer_room` 房间条目。 */
export interface BossSourceRoom {
  monster_icon: string
  monster_list: Record<string, BossSourceEncounter>
  monster_weakness: Record<string, string>
  waves_num: number
}

/** 来源 `zone` 阶段条目（`modes[].zone` 与旧顶层 `zone` 共用）。 */
export interface BossSourceZoneStage {
  name: string
  stage_num: number
  monster_level: number
  layer_buff: Record<string, { title: string; desc: string }>
  layer_room: Record<string, BossSourceRoom>
  goal_type: number
  s_rank_goal: number
  a_rank_goal: number
  b_rank_goal: number
  selectable_buff: Record<string, { title: string; desc: string }>
}

/** 来源 `modes` 数组条目。 */
export interface BossSourceMode {
  id: number
  zone_type: number
  zone: Record<string, BossSourceZoneStage>
}

/** 合成 fixture 的完整来源详情结构（当前 modes 变体）。 */
export interface BossSourceFixture {
  id: number
  name: string
  priority: number
  boss_adjust: Record<string, { hp: number; atk: number; points: number }>
  zone_type: number
  modes: BossSourceMode[]
  begin_time: string
  end_time: string
}

/** 单个怪物 encounter 的合成输入；外层 key 故意与其 id 不同号，元素值含负数原值。 */
function bossSourceEncounter(id: number, name: string): BossSourceEncounter {
  return {
    id,
    name,
    image:
      "UI/Sprite/A1DynamicLoad/BossCard/UnPacker/BossCardLv03/Monster_Example.png",
    element: { ice: 1, fire: 0, electric: 0, ether: 0, physical: -1, wind: 0 },
    stats: {
      hp: 8737162.92,
      attack: 3948.5939393939398,
      defence: 952.8000000000001,
      stun: 16647.4,
      attribute_infliction: 0,
    },
  }
}

/** 单个首领关卡阶段的合成输入。 */
function bossSourceZoneStage(name: string): BossSourceZoneStage {
  return {
    name,
    stage_num: 1,
    monster_level: 70,
    layer_buff: {
      "98010110": {
        title: "",
        desc: "· 成功<color=#FFAF2C>打断吟唱</color>时获得操作得分。",
      },
    },
    layer_room: {
      "98001011": {
        monster_icon:
          "Assets/NapResources/UI/Sprite/A1DynamicLoad/IconBossGeneral/UnPacker/IconMonster_Example.png",
        monster_list: {
          // 外层 key 不是 Monster ID：与条目自身 id 分属两个身份空间。
          "11818": bossSourceEncounter(30024, "示例首领"),
        },
        monster_weakness: { "202": "冰属性" },
        waves_num: 1,
      },
    },
    goal_type: 2,
    s_rank_goal: 20000,
    a_rank_goal: 14000,
    b_rank_goal: 6000,
    selectable_buff: {
      "98010101": {
        title: "诛心",
        desc: "· 代理人的属性异常积蓄效率<color=#2BAD00>提升30%</color>。",
      },
    },
  }
}

/** 满足规则 nanoka-boss-reference/1 必需结构的合成输入；不读取真实 raw，不使用生产登记表生成 fixture。 */
export function bossSource(): BossSourceFixture {
  return {
    id: 980001,
    name: "试炼",
    priority: 5,
    boss_adjust: {
      "1001": { hp: 1200, atk: -5000, points: 1000 },
      "1002": { hp: 1700, atk: -2500, points: 1200 },
    },
    zone_type: 1001,
    modes: [
      {
        id: 980001,
        zone_type: 1001,
        zone: { "9800101": bossSourceZoneStage("示例首领·一阶") },
      },
    ],
    begin_time: "2024-07-04 04:00:00",
    end_time: "2024-08-01 03:59:59",
  }
}

/**
 * 双语合成输入：共享字段（priority、zone_type、时间、boss_adjust）两语言一致并提取到 data；
 * modes 内的关卡文本与 encounter 全部本地化。两个 mode 的顺序与顶层/自身 zone_type 差异保留。
 */
export function bossInput() {
  const zh = bossSource()
  const en = bossSource()
  // 第二个 mode：id 与 zone_type 均与顶层不同，用于钉住顺序保留与分别保留的 zone_type。
  zh.modes.push({
    id: 980002,
    zone_type: 1002,
    zone: { "9800201": bossSourceZoneStage("示例首领·二阶") },
  })
  en.modes.push({
    id: 980002,
    zone_type: 1002,
    zone: { "9800201": bossSourceZoneStage("Example Overlord · Phase II") },
  })
  en.modes[0]!.zone["9800101"] = bossSourceZoneStage(
    "Example Overlord · Phase I",
  )
  en.modes[0]!.zone["9800101"]!.layer_room["98001011"]!.monster_list = {
    "11818": bossSourceEncounter(30024, "Example Overlord"),
  }
  en.modes[0]!.zone["9800101"]!.layer_room["98001011"]!.monster_weakness = {
    "202": "Ice",
  }
  en.modes[0]!.zone["9800101"]!.layer_buff["98010110"] = {
    title: "",
    desc: "· Successfully <color=#FFAF2C>interrupting the chant</color> grants operation score.",
  }
  en.modes[0]!.zone["9800101"]!.selectable_buff["98010101"] = {
    title: "Heartseeker",
    desc: "· Agents' Anomaly Buildup Rate <color=#2BAD00>increases by 30%</color>.",
  }
  en.name = "Trial"
  return {
    entityId: "980001",
    detailLocales: ["zh", "en"] as const,
    sourceRecord: {
      sort: 5,
      begin: "2024-07-04 04:00:00",
      end: "2024-08-01 03:59:59",
      en: "Trial",
      ko: "시련",
      zh: "试炼",
      ja: "試練",
      live_begin: "2024-07-04 04:00:00",
      live_end: "2024-08-01 03:59:59",
      zone_type: 1001,
    },
    details: { zh, en },
  }
}

/**
 * 旧结构变体样例：历史版本使用顶层 `zone` 字典而不是 `modes` 数组（对应本地 3.0 缓存的形态）。
 * 阶段结构共用同一登记表；本层不把 zone 强行转换成 modes，也不丢弃原层级。
 */
export function bossLegacyZoneInput() {
  const zh = bossSource()
  const en = bossSource()
  const legacyZh: Record<string, unknown> = { ...zh }
  const legacyEn: Record<string, unknown> = { ...en }
  delete legacyZh.modes
  delete legacyEn.modes
  legacyZh.zone = zh.modes[0]!.zone
  legacyEn.name = "Trial"
  legacyEn.zone = {
    "9800101": {
      ...bossSourceZoneStage("Example Overlord · Phase I"),
      layer_room: {
        "98001011": {
          monster_icon:
            "Assets/NapResources/UI/Sprite/A1DynamicLoad/IconBossGeneral/UnPacker/IconMonster_Example.png",
          monster_list: {
            "11818": bossSourceEncounter(30024, "Example Overlord"),
          },
          monster_weakness: { "202": "Ice" },
          waves_num: 1,
        },
      },
    },
  }
  return {
    entityId: "980001",
    detailLocales: ["zh", "en"] as const,
    sourceRecord: {
      sort: 5,
      begin: "2024-07-04 04:00:00",
      end: "2024-08-01 03:59:59",
      en: "Trial",
      zh: "试炼",
      zone_type: 1001,
    },
    details: { zh: legacyZh, en: legacyEn },
  }
}
