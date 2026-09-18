/** 合成 fixture 的宽松来源记录类型：允许测试按来源 snake_case 结构做结构性改动。 */
export interface ShiyuSourceEncounter {
  id: number
  name: string
  image: string
  element: Record<string, number>
  stats: Record<string, number>
}

/** 来源 `layer_room` 房间条目。 */
export interface ShiyuSourceRoom {
  monster_icon: string
  monster_list: Record<string, ShiyuSourceEncounter>
  monster_weakness: Record<string, string>
  waves_num: number
}

/** 来源 `zone` 阶段条目。 */
export interface ShiyuSourceZoneStage {
  name: string
  stage_num: number
  monster_level: number
  layer_buff: Record<string, { title: string; desc: string }>
  child: number[]
  layer_room: Record<string, ShiyuSourceRoom>
  goal_type: number
  ss_rank_goal: number
  s_rank_goal: number
  a_rank_goal: number
  b_rank_goal: number
}

/** 合成 fixture 的完整来源详情结构。 */
export interface ShiyuSourceFixture {
  id: number
  name: string
  priority: number
  zone: Record<string, ShiyuSourceZoneStage>
  begin_time?: string
  end_time?: string
}

/** 单个怪物 encounter 的合成输入；外层 key 故意与其 id 不同号。 */
function shiyuSourceEncounter(id: number, name: string): ShiyuSourceEncounter {
  return {
    id,
    name,
    image:
      "UI/Sprite/A1DynamicLoad/BossCard/UnPacker/BossCardLv01/Monster_Example.png",
    element: { ice: 1, fire: 0, electric: 0, ether: 0, physical: 1, wind: 0 },
    stats: {
      hp: 18723.601000000002,
      attack: 601.3636363636364,
      defence: 177.60000000000002,
      stun: 936,
      attribute_infliction: 0,
    },
  }
}

/** 满足规则 nanoka-shiyu-reference/1 必需结构的合成输入；不读取真实 raw，不使用生产登记表生成 fixture。 */
export function shiyuSource(): ShiyuSourceFixture {
  return {
    id: 970001,
    name: "示例节点",
    priority: 3,
    zone: {
      "9700101": {
        name: "稳定防线一",
        stage_num: 1,
        monster_level: 25,
        layer_buff: {
          "97001011": {
            title: "强击特化",
            desc: "· 代理人的<color=#F0D12B>物理异常积蓄效率</color>提升20%。",
          },
        },
        child: [],
        layer_room: {
          "97001011": {
            monster_icon: "",
            monster_list: {
              // 外层 key 不是 Monster ID：与条目自身 id 分属两个身份空间。
              "11314": shiyuSourceEncounter(10019, "袭击者"),
              "11323": shiyuSourceEncounter(10018, "偷猎者"),
            },
            monster_weakness: { "200": "物理", "202": "冰属性" },
            waves_num: 2,
          },
        },
        goal_type: 1,
        ss_rank_goal: 300,
        s_rank_goal: 240,
        a_rank_goal: 180,
        b_rank_goal: 120,
      },
      "9700102": {
        name: "稳定防线二",
        stage_num: 2,
        monster_level: 30,
        layer_buff: {},
        child: [97001021, 97001022],
        layer_room: {
          "97002011": {
            monster_icon:
              "UI/Sprite/A1DynamicLoad/BossCard/UnPacker/BossCardLv01/Monster_Example.png",
            monster_list: {
              "11331": shiyuSourceEncounter(10016, "纵火犯"),
            },
            monster_weakness: {},
            waves_num: 1,
          },
        },
        goal_type: 1,
        ss_rank_goal: 360,
        s_rank_goal: 280,
        a_rank_goal: 200,
        b_rank_goal: 140,
      },
    },
    begin_time: "2024-07-04 04:00:00",
    end_time: "2024-08-01 03:59:59",
  }
}

/**
 * 双语合成输入：`priority` 与时间字段两语言一致并提取到 data，zone 文本与 encounter 全部本地化。
 * 第二阶段的 `child` 非空，用于钉住来源顺序；两阶段 `stage_num` 连续但不承担身份。
 */
export function shiyuInput() {
  const zh = shiyuSource()
  const en = shiyuSource()
  en.name = "Example Node"
  en.zone["9700101"]!.name = "Stable Frontline I"
  en.zone["9700101"]!.layer_buff["97001011"] = {
    title: "Strike Specialization",
    desc: "· Agents gain 20% <color=#F0D12B>Physical Anomaly Buildup Rate</color>.",
  }
  en.zone["9700101"]!.layer_room["97001011"]!.monster_list = {
    "11314": shiyuSourceEncounter(10019, "Assaulter"),
    "11323": shiyuSourceEncounter(10018, "Poacher"),
  }
  en.zone["9700101"]!.layer_room["97001011"]!.monster_weakness = {
    "200": "Physical",
    "202": "Ice",
  }
  en.zone["9700102"]!.name = "Stable Frontline II"
  en.zone["9700102"]!.layer_room["97002011"]!.monster_list = {
    "11331": shiyuSourceEncounter(10016, "Pyromaniac"),
  }
  return {
    entityId: "970001",
    detailLocales: ["zh", "en"] as const,
    sourceRecord: {
      sort: 3,
      begin: "2024-07-04 04:00:00",
      end: "2024-08-01 03:59:59",
      en: "Example Node",
      ko: "예시 구간",
      zh: "示例节点",
      ja: "サンプル区間",
      live_begin: "2024-07-04 04:00:00",
      live_end: "2024-08-01 03:59:59",
    },
    details: { zh, en },
  }
}

/**
 * 常驻记录样例：详情与索引都没有时间字段（对应真实 3.1 中 2 条常驻记录的形态），
 * data 不补 `beginTime`/`endTime`，常驻记录没有时间字段是合法原值。
 */
export function shiyuPermanentInput() {
  const zh = shiyuSource()
  const en = shiyuSource()
  delete zh.begin_time
  delete zh.end_time
  delete en.begin_time
  delete en.end_time
  en.name = "Permanent Node"
  return {
    entityId: "970001",
    detailLocales: ["zh", "en"] as const,
    sourceRecord: {
      sort: 2,
      en: "Permanent Node",
      ko: "상주 구간",
      zh: "常驻示例节点",
      ja: "常駐サンプル区間",
    },
    details: { zh, en },
  }
}
