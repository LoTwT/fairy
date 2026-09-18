/** 合成 fixture 的宽松来源记录类型：允许测试按来源 snake_case 结构做结构性改动。 */
export interface SimulSourceEncounter {
  id: number
  name: string
  image: string
  element: Record<string, number>
  stats: Record<string, number>
}

/** 来源 `layer_room` 房间条目。 */
export interface SimulSourceRoom {
  monster_icon: string
  monster_list: Record<string, SimulSourceEncounter>
  monster_weakness: Record<string, string>
  waves_num: number
}

/** 来源 `layer` 关卡对象。 */
export interface SimulSourceLayer {
  id: number
  monster_level: number
  layer_buff: Record<string, { title: string; desc: string }>
  layer_room: Record<string, SimulSourceRoom>
  goal_type: number
  s_rank_goal: number
  a_rank_goal: number
  b_rank_goal: number
}

/** 来源 `battle` 战斗条目。 */
export interface SimulSourceBattle {
  id: number
  name: string
  tag: string
  tag_type: number
  a_rank_score_layer_buff: Record<string, { title: string; desc: string }>
  b_rank_score_layer_buff: Record<string, { title: string; desc: string }>
  s_rank_score_layer_buff: Record<string, { title: string; desc: string }>
  layer: SimulSourceLayer
  selectable_buff: Record<string, { title: string; desc: string }>
  layer_room: Record<string, SimulSourceRoom>
}

/** 来源 `choice` 选项条目。 */
export interface SimulSourceChoice {
  id: number
  name: string
  desc: string
}

/** 来源 `story_event` 页面条目。 */
export interface SimulSourceStoryPage {
  id: number
  name: string
  desc: string
  icon: string
  choice: SimulSourceChoice[]
  next_page: number[]
  next_node_unlock: number[]
  next_record_unlock: number[]
}

/** 来源 `node` 剧情节点条目。 */
export interface SimulSourceNode {
  id: number
  name: string
  icon: string
  type: number
  prev_node: number
  story_event: Record<string, Record<string, SimulSourceStoryPage>>
  battle: Record<string, SimulSourceBattle>
}

/** 来源 `record` 结局记录条目。 */
export interface SimulSourceRecordEntry {
  id: number
  name: string
  desc: string
  text: string
  icon: string
}

/** 合成 fixture 的完整来源详情结构。 */
export interface SimulSourceFixture {
  id: number
  end_time: string
  boss_adjust: Record<string, { hp: number; atk: number; points: number }>
  record: Record<string, SimulSourceRecordEntry>
  node: Record<string, SimulSourceNode>
}

/** 单个怪物 encounter 的合成输入；外层 key 故意与其 id 不同号，元素值含负数原值。 */
function simulSourceEncounter(id: number, name: string): SimulSourceEncounter {
  return {
    id,
    name,
    image:
      "UI/Sprite/A1DynamicLoad/BossCard/UnPacker/BossCardLv03/Monster_Example.png",
    element: { ice: 1, fire: 0, electric: 0, ether: 0, physical: -1, wind: 0 },
    stats: {
      hp: 9123456.78,
      attack: 4104.5939393939398,
      defence: 987.8000000000001,
      stun: 17247.4,
      attribute_infliction: 0,
    },
  }
}

/** 单个房间条目的合成输入。 */
function simulSourceRoom(
  roomKey: string,
  encounterName: string,
  weakness: string,
): Record<string, SimulSourceRoom> {
  return {
    [roomKey]: {
      monster_icon:
        "Assets/NapResources/UI/Sprite/A1DynamicLoad/IconBossGeneral/UnPacker/IconMonster_Example.png",
      monster_list: {
        // 外层 key 不是 Monster ID：与条目自身 id 分属两个身份空间。
        "11818": simulSourceEncounter(30024, encounterName),
      },
      monster_weakness: { "202": weakness },
      waves_num: 1,
    },
  }
}

/** 单个战斗条目的合成输入。 */
function simulSourceBattle(
  id: number,
  name: string,
  buffTitle: string,
): SimulSourceBattle {
  return {
    id,
    name,
    tag: "<color=#ff4e00>终局</color>",
    tag_type: 1,
    a_rank_score_layer_buff: {
      "2003102": { title: "", desc: "· A 评级示例增益。" },
    },
    b_rank_score_layer_buff: {},
    s_rank_score_layer_buff: {
      "2003104": { title: buffTitle, desc: "· S 评级示例增益。" },
    },
    layer: {
      id: 7009901,
      monster_level: 60,
      layer_buff: {
        "69013010": { title: "", desc: "· 层级示例增益。" },
      },
      layer_room: {},
      goal_type: 2,
      s_rank_goal: 40000,
      a_rank_goal: 28000,
      b_rank_goal: 12000,
    },
    selectable_buff: {
      "99010301": { title: "示例强化", desc: "· 可选示例增益。" },
    },
    layer_room: simulSourceRoom("70799001", "示例首领", "冰属性"),
  }
}

/** 满足规则 nanoka-simul-reference/1 必需结构的合成输入；不读取真实 raw，不使用生产登记表生成 fixture。 */
export function simulSource(): SimulSourceFixture {
  return {
    id: 990001,
    end_time: "2025-12-31 03:59:59",
    boss_adjust: {
      "1001": { hp: 1200, atk: -5000, points: 1000 },
      "1002": { hp: 1700, atk: -2500, points: 1200 },
    },
    record: {
      "1": {
        id: 9900801,
        name: "结局一·示例",
        desc: "示例结局简介",
        text: "示例结局正文，保留<color=#FFAF2C>富文本标记</color>。",
        icon: "Assets/NapResources/UI/Sprite/A1DynamicLoad/VoldFront/UnPacker/Record/Example.png",
      },
    },
    node: {
      "99001": {
        id: 99001,
        name: "INTRO",
        icon: "Assets/NapResources/UI/Sprite/A1DynamicLoad/VoldFront/UnPacker/Level/Tale_01.png",
        type: 4,
        prev_node: 0,
        story_event: {
          "9900101": {
            "9900001": {
              id: 9900001,
              name: "危机四伏的旅程",
              desc: "示例剧情正文，保留<color=#FFAF2C>富文本标记</color>。",
              icon: "",
              choice: [
                {
                  id: 1,
                  name: "优先营救伤者",
                  desc: "",
                },
                {
                  id: 2,
                  name: "继续深入空洞",
                  desc: "",
                },
              ],
              next_page: [9900002],
              next_node_unlock: [99002],
              next_record_unlock: [9900801],
            },
          },
        },
        battle: {},
      },
      "99002": {
        id: 99002,
        name: "STAGE 01",
        icon: "Assets/NapResources/UI/Sprite/A1DynamicLoad/VoldFront/UnPacker/Level/Battle_01.png",
        type: 1,
        prev_node: 99001,
        story_event: {},
        battle: {
          "9900201": simulSourceBattle(9900201, "STAGE 01", "S 评级"),
        },
      },
    },
  }
}

/**
 * 双语合成输入：共享字段（end_time、boss_adjust）两语言一致并提取到 data；
 * record 与 node 内的剧情文本、战斗名称与 encounter 全部本地化。
 * 空字典（INTRO 的 battle、STAGE 01 的 story_event、layer 的 layer_room、b_rank_score_layer_buff）
 * 与来源顺序原样保留；prev_node、next_page、next_node_unlock、next_record_unlock 是不同目标集合。
 */
export function simulInput() {
  const zh = simulSource()
  const en = simulSource()
  // 本地化 record。
  en.record["1"] = {
    ...en.record["1"]!,
    name: "Ending I · Example",
    desc: "Example ending summary",
    text: "Example ending body with <color=#FFAF2C>rich text markers</color> kept.",
  }
  // 本地化 node 名称与剧情内容。
  en.node["99001"] = {
    ...en.node["99001"]!,
    name: "INTRO",
    story_event: {
      "9900101": {
        "9900001": {
          ...en.node["99001"]!.story_event["9900101"]!["9900001"]!,
          name: "A Perilous Journey",
          desc: "Example story body with <color=#FFAF2C>rich text markers</color> kept.",
          choice: [
            { id: 1, name: "Rescue the wounded first", desc: "" },
            { id: 2, name: "Push deeper into the Hollow", desc: "" },
          ],
        },
      },
    },
  }
  en.node["99002"] = {
    ...en.node["99002"]!,
    name: "BATTLE 01",
    battle: {
      "9900201": simulSourceBattle(9900201, "BATTLE 01", "S rank"),
    },
  }
  en.node["99002"]!.battle["9900201"]!.layer_room["70799001"]!.monster_list[
    "11818"
  ] = simulSourceEncounter(30024, "Example Overlord")
  en.node["99002"]!.battle["9900201"]!.layer_room[
    "70799001"
  ]!.monster_weakness = { "202": "Ice" }
  return {
    entityId: "990001",
    detailLocales: ["zh", "en"] as const,
    sourceRecord: {
      end: "2025-12-31 03:59:59",
    },
    details: { zh, en },
  }
}

/**
 * 第二个成员的合成输入：endTime 为空字符串（合法原值），record 为空字典，
 * node 只有一个纯剧情节点，用于钉住空 record 与空 battle 的保留。
 */
export function simulSecondInput() {
  const zh = simulSource()
  const en = simulSource()
  for (const fixture of [zh, en]) {
    fixture.id = 990002
    fixture.end_time = ""
    fixture.record = {}
    fixture.node = {
      "99003": {
        id: 99003,
        name: "PLOT 01",
        icon: "",
        type: 2,
        prev_node: 0,
        story_event: {
          "9900301": {
            "9900003": {
              id: 9900003,
              name: "示例剧情页",
              desc: "示例剧情正文。",
              icon: "",
              choice: [],
              next_page: [],
              next_node_unlock: [],
              next_record_unlock: [],
            },
          },
        },
        battle: {},
      },
    }
  }
  en.node["99003"] = {
    ...en.node["99003"]!,
    name: "STORY 01",
    story_event: {
      "9900301": {
        "9900003": {
          ...en.node["99003"]!.story_event["9900301"]!["9900003"]!,
          name: "Example story page",
          desc: "Example story body.",
        },
      },
    },
  }
  return {
    entityId: "990002",
    detailLocales: ["zh", "en"] as const,
    sourceRecord: {
      end: "",
    },
    details: { zh, en },
  }
}
