/**
 * 由包 tsc 真正检查的 Simul 类型正反例；负例的 @ts-expect-error 必须实际匹配错误。
 * 文件不参与 vitest，只表达正式类型允许与拒绝的结构。
 */
import type {
  SimulAdjustEntry,
  SimulBattle,
  SimulBuff,
  SimulData,
  SimulDetails,
  SimulEncounter,
  SimulLayer,
  SimulNode,
  SimulRecordEntry,
  SimulRoom,
  SimulStoryChoice,
  SimulStoryPage,
} from "../src/integration/simul-types.ts"
import type { SimulFieldKind } from "../src/integration/simul-schema.ts"
import type {
  IntegratedSimul,
  IntegrateSimulInput,
} from "../src/integration/integrate-simul.ts"

const encounter: SimulEncounter = {
  id: 30024,
  name: "示例首领",
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

const room: SimulRoom = {
  monsterIcon:
    "Assets/NapResources/UI/Sprite/A1DynamicLoad/IconBossGeneral/UnPacker/IconMonster_Example.png",
  monsterList: { "11818": encounter },
  monsterWeakness: { "202": "冰属性" },
  wavesNum: 1,
}

const buff: SimulBuff = { title: "", desc: "说明原文。" }

const layer: SimulLayer = {
  id: 7009901,
  monsterLevel: 60,
  goalType: 2,
  sRankGoal: 40000,
  aRankGoal: 28000,
  bRankGoal: 12000,
  layerBuff: { "69013010": buff },
  layerRoom: {},
}

const battle: SimulBattle = {
  id: 9900201,
  name: "STAGE 01",
  tag: "<color=#ff4e00>终局</color>",
  tagType: 1,
  aRankScoreLayerBuff: { "2003102": buff },
  bRankScoreLayerBuff: {},
  sRankScoreLayerBuff: { "2003104": buff },
  layer,
  selectableBuff: { "99010301": { title: "示例强化", desc: "说明原文。" } },
  layerRoom: { "70799001": room },
}

const choice: SimulStoryChoice = { id: 1, name: "优先营救伤者", desc: "" }

const page: SimulStoryPage = {
  id: 9900001,
  name: "危机四伏的旅程",
  desc: "剧情正文原文。",
  icon: "",
  choice: [choice],
  nextPage: [9900002],
  nextNodeUnlock: [99002],
  nextRecordUnlock: [9900801],
}

const node: SimulNode = {
  id: 99001,
  name: "INTRO",
  icon: "Assets/NapResources/UI/Sprite/A1DynamicLoad/VoldFront/UnPacker/Level/Tale_01.png",
  type: 4,
  prevNode: 0,
  storyEvent: { "9900101": { "9900001": page } },
  battle: {},
}

const recordEntry: SimulRecordEntry = {
  id: 9900801,
  name: "结局一·示例",
  desc: "结局简介原文。",
  text: "结局正文原文，保留<color=#FFAF2C>富文本标记</color>。",
  icon: "Assets/NapResources/UI/Sprite/A1DynamicLoad/VoldFront/UnPacker/Record/Example.png",
}

const adjust: SimulAdjustEntry = { hp: 1200, atk: -5000, points: 1000 }

export const minimalData: SimulData = {
  id: 990001,
  endTime: "2025-12-31 03:59:59",
  bossAdjust: { "1001": adjust },
}

/** 空字符串 endTime 是合法原值。 */
export const dataWithEmptyEndTime: SimulData = {
  ...minimalData,
  endTime: "",
}

/** bossAdjust 未登记成员随块保留并参与完整值比较。 */
export const dataWithAdjustUnknownMembers: SimulData = {
  ...minimalData,
  bossAdjust: {
    "1001": { ...adjust, future_member: "说明" },
  },
}

/** 未登记的顶层来源字段仍是可保留的 JSON 值，不因类型声明被否定。 */
export const dataWithUnknownFields: SimulData = {
  ...minimalData,
  future_container: { nested: [0, { empty: {}, nil: null, text: "" }] },
}

export const details: SimulDetails = {
  id: 990001,
  locale: "zh",
  record: { "1": recordEntry },
  node: { "99001": node, "99002": { ...node, battle: { "9900201": battle } } },
}

/** 空 record 与空 battle 字典合法保留。 */
export const detailsWithEmptyContainers: SimulDetails = {
  ...details,
  record: {},
  node: { "99003": { ...node, storyEvent: {}, battle: {} } },
}

/** 各层未登记成员原样保留。 */
export const detailsWithUnknownMembers: SimulDetails = {
  ...details,
  untouched: { raw_key: [null, "", {}, [], 0] },
  node: {
    ...details.node,
    "99001": {
      ...node,
      future_node_member: 0,
      battle: {},
      storyEvent: {
        "9900101": {
          "9900001": {
            ...page,
            future_page_member: 0,
            choice: [{ ...choice, future_choice_member: 0 }],
          },
        },
      },
    },
    "99002": {
      ...node,
      battle: {
        "9900201": {
          ...battle,
          future_battle_member: 0,
          layer: { ...layer, future_layer_member: 0 },
          layerRoom: {
            "70799001": { ...room, future_room_member: "text" },
          },
        },
      },
    },
  },
  record: { "1": { ...recordEntry, future_record_member: 0 } },
}

export const wrongEndTimeType: SimulData = {
  ...minimalData,
  // @ts-expect-error endTime 是字符串字段，不接受数值。
  endTime: 0,
}

// @ts-expect-error id 必须为安全数值，不接受字符串。
export const wrongIdType: SimulData = { ...minimalData, id: "990001" }

// @ts-expect-error 缺失 bossAdjust 不能由未知字段补位。
export const missingBossAdjust: SimulData = {
  id: 990001,
  endTime: "",
}

export const wrongAdjustType: SimulAdjustEntry = {
  ...adjust,
  // @ts-expect-error atk 是数值字段，不接受字符串。
  atk: "-5000",
}

// @ts-expect-error details 的必需成员 node 缺失。
export const missingNode: SimulDetails = {
  id: 990001,
  locale: "zh",
  record: {},
}

export const wrongLocale: SimulDetails = {
  ...details,
  // @ts-expect-error locale 只接受已支持语言。
  locale: "ja",
}

// @ts-expect-error Simul 无顶层 name；未知成员虽可保留，但这里缺失的是必需成员 record。
export const missingRecord: SimulDetails = {
  id: 990001,
  locale: "zh",
  node: {},
  name: "不存在的顶层名称",
}

export const wrongPrevNodeType: SimulNode = {
  ...node,
  // @ts-expect-error prevNode 是数值字段，不接受字符串。
  prevNode: "0",
}

export const wrongNextPageType: SimulStoryPage = {
  ...page,
  // @ts-expect-error nextPage 的成员是数值，不接受字符串。
  nextPage: ["9900002"],
}

export const wrongWavesNumType: SimulRoom = {
  ...room,
  // @ts-expect-error wavesNum 是数值字段，不接受字符串。
  wavesNum: "1",
}

export const wrongEncounterStatsType: SimulEncounter = {
  ...encounter,
  // @ts-expect-error stats 的成员是数值，不接受字符串。
  stats: { ...encounter.stats, hp: "9123456.78" },
}

export const wrongInputLocales: IntegrateSimulInput = {
  entityId: "990001",
  sourceRecord: {},
  details: {},
  // @ts-expect-error IntegrateSimulInput 的 detailLocales 是只读语言数组。
  detailLocales: "zh",
}

export const integrated: IntegratedSimul = {
  data: minimalData,
  details: { zh: details },
  sourceRecord: { end: "2025-12-31 03:59:59" },
  maintenance: {
    diagnostics: [
      {
        entityId: "990001",
        locale: "zh",
        pointer: "/untouched",
        kind: "unknown-field",
      },
    ],
  },
}

export const fullInput: IntegrateSimulInput = {
  entityId: "990001",
  sourceRecord: details,
  details: { zh: details },
  detailLocales: ["zh"],
}

// 未使用变量仅用于类型检查；引用以避免 noUnusedLocals 报错。
export const checks: unknown[] = [
  dataWithEmptyEndTime,
  dataWithAdjustUnknownMembers,
  dataWithUnknownFields,
  details,
  detailsWithEmptyContainers,
  detailsWithUnknownMembers,
  wrongEndTimeType,
  wrongIdType,
  missingBossAdjust,
  missingNode,
  missingRecord,
  wrongLocale,
  wrongAdjustType,
  wrongPrevNodeType,
  wrongNextPageType,
  wrongWavesNumType,
  wrongEncounterStatsType,
  wrongInputLocales,
  integrated,
  fullInput,
]

// 字段种类登记表与来源工具的类型组合在类型层保持可用。
const kinds: SimulFieldKind[] = [
  "string",
  "number",
  "stringArray",
  "numberArray",
  "object",
]
void kinds
