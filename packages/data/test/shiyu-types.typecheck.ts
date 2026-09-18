/**
 * 由包 tsc 真正检查的 Shiyu 类型正反例；负例的 @ts-expect-error 必须实际匹配错误。
 * 文件不参与 vitest，只表达正式类型允许与拒绝的结构。
 */
import type {
  ShiyuData,
  ShiyuDetails,
  ShiyuZoneEncounter,
  ShiyuZoneRoom,
  ShiyuZoneStage,
} from "../src/integration/shiyu-types.ts"
import type { ShiyuFieldKind } from "../src/integration/shiyu-schema.ts"
import type {
  IntegratedShiyu,
  IntegrateShiyuInput,
} from "../src/integration/integrate-shiyu.ts"
import type { UnknownFieldDiagnostic } from "../src/integration/source-json.ts"

const encounter: ShiyuZoneEncounter = {
  id: 10019,
  name: "袭击者",
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

const room: ShiyuZoneRoom = {
  monsterIcon: "",
  monsterList: { "11314": encounter },
  monsterWeakness: { "200": "物理", "202": "冰属性" },
  wavesNum: 2,
}

const stage: ShiyuZoneStage = {
  name: "稳定防线一",
  stageNum: 1,
  monsterLevel: 25,
  layerBuff: {
    "97001011": { title: "强击特化", desc: "说明原文。" },
  },
  child: [],
  layerRoom: { "97001011": room },
  goalType: 1,
  ssRankGoal: 300,
  sRankGoal: 240,
  aRankGoal: 180,
  bRankGoal: 120,
}

export const minimalData: ShiyuData = {
  id: 970001,
  priority: 3,
}

/** 常驻记录没有时间字段：可选成员不补默认值。 */
export const permanentData: ShiyuData = minimalData

/** 轮换记录提取条件公共时间字段。 */
export const rotatingData: ShiyuData = {
  ...minimalData,
  beginTime: "2024-07-04 04:00:00",
  endTime: "2024-08-01 03:59:59",
}

/** 未登记的顶层来源字段仍是可保留的 JSON 值，不因类型声明被否定。 */
export const dataWithUnknownFields: ShiyuData = {
  ...minimalData,
  future_container: { nested: [0, { empty: {}, nil: null, text: "" }] },
}

export const minimalDetails: ShiyuDetails = {
  id: 970001,
  locale: "zh",
  name: "",
  zone: {},
}

/** zone 各层未登记成员原样保留。 */
export const detailsWithUnknownMembers: ShiyuDetails = {
  ...minimalDetails,
  zone: {
    "9700101": {
      ...stage,
      future_stage_member: 0,
      layerRoom: {
        "97001011": {
          ...room,
          future_room_member: "text",
          monsterList: {
            "11314": { ...encounter, future_encounter_member: 0 },
          },
        },
      },
    },
  },
  untouched: { raw_key: [null, "", {}, [], 0] },
}

/** 单语言独有的时间字段留在该语言 details。 */
export const detailsWithSingleLocaleTime: ShiyuDetails = {
  ...minimalDetails,
  beginTime: "2024-07-04 04:00:00",
}

export const wrongStageNumType: ShiyuZoneStage = {
  ...stage,
  // @ts-expect-error stageNum 是数值字段，不接受字符串。
  stageNum: "1",
}

// @ts-expect-error 阶段的必需成员 child 缺失。
export const missingChild: ShiyuZoneStage = {
  name: "",
  stageNum: 1,
  monsterLevel: 25,
  layerBuff: {},
  layerRoom: {},
  goalType: 1,
  ssRankGoal: 0,
  sRankGoal: 0,
  aRankGoal: 0,
  bRankGoal: 0,
}

// @ts-expect-error id 必须为安全数值，不接受字符串。
export const wrongIdType: ShiyuData = { ...minimalData, id: "970001" }

// @ts-expect-error 缺失 priority 不能由未知字段补位。
export const missingPriority: ShiyuData = {
  id: 970001,
}

// @ts-expect-error details 的必需成员 zone 缺失。
export const missingZone: ShiyuDetails = {
  id: 970001,
  locale: "zh",
  name: "",
}

export const wrongLocale: ShiyuDetails = {
  ...minimalDetails,
  // @ts-expect-error locale 只接受已支持语言。
  locale: "ja",
}

export const wrongEncounterStatsType: ShiyuZoneEncounter = {
  ...encounter,
  // @ts-expect-error stats 的成员是数值，不接受字符串。
  stats: { ...encounter.stats, hp: "18723.601" },
}

export const wrongWavesNumType: ShiyuZoneRoom = {
  ...room,
  // @ts-expect-error wavesNum 是数值字段，不接受字符串。
  wavesNum: "2",
}

export const wrongInputLocales: IntegrateShiyuInput = {
  entityId: "970001",
  sourceRecord: {},
  details: {},
  // @ts-expect-error IntegrateShiyuInput 的 detailLocales 是只读语言数组。
  detailLocales: "zh",
}

export const integrated: IntegratedShiyu = {
  data: minimalData,
  details: { zh: minimalDetails },
  sourceRecord: { sort: 2, zh: "常驻示例节点" },
  maintenance: {
    diagnostics: [
      {
        entityId: "970001",
        locale: "zh",
        pointer: "/untouched",
        kind: "unknown-field",
      },
    ],
  },
}

export const fullInput: IntegrateShiyuInput = {
  entityId: "970001",
  sourceRecord: minimalDetails,
  details: { zh: minimalDetails },
  detailLocales: ["zh"],
}

// 未使用变量仅用于类型检查；引用以避免 noUnusedLocals 报错。
export const checks: unknown[] = [
  permanentData,
  rotatingData,
  dataWithUnknownFields,
  detailsWithUnknownMembers,
  detailsWithSingleLocaleTime,
  wrongStageNumType,
  missingChild,
  wrongIdType,
  missingPriority,
  missingZone,
  wrongLocale,
  wrongEncounterStatsType,
  wrongWavesNumType,
  wrongInputLocales,
]

/** 诊断与字段种类的结构约束同样进入类型检查。 */
export const diagnostic: UnknownFieldDiagnostic = {
  entityId: "970001",
  locale: "index",
  pointer: "/future_field",
  kind: "unknown-field",
}

// @ts-expect-error ShiyuFieldKind 不接受未登记的字段种类。
const wrongFieldKind: ShiyuFieldKind = "boolean"

export const fieldKindCheck: unknown = wrongFieldKind
