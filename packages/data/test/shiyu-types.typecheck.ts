/**
 * 由包 tsc 真正检查的 Shiyu 类型正反例；负例的 @ts-expect-error 必须实际匹配错误。
 * 文件不参与 vitest，只表达正式类型允许与拒绝的结构。
 * 封闭类型：未登记字段在类型层面即被拒绝，不存在“原样保留的未知字段”形态。
 */
import type {
  ShiyuData,
  ShiyuDetails,
  ShiyuZoneEncounter,
  ShiyuZoneEncounterData,
  ShiyuZoneRoom,
  ShiyuZoneRoomData,
  ShiyuZoneStage,
  ShiyuZoneStageData,
} from "../src/integration/shiyu-types.ts"
import type { ShiyuFieldKind } from "../src/integration/shiyu-schema.ts"
import type {
  IntegratedShiyu,
  IntegrateShiyuInput,
} from "../src/integration/integrate-shiyu.ts"
import type { UnknownFieldDiagnostic } from "../src/integration/source-json.ts"

const encounterData: ShiyuZoneEncounterData = {
  id: 10019,
  element: { ice: 1, fire: 0, electric: 0, ether: 0, physical: 1, wind: 0 },
  stats: {
    hp: 18723.601000000002,
    attack: 601.3636363636364,
    defence: 177.60000000000002,
    stun: 936,
    attribute_infliction: 0,
  },
}

const encounterText: ShiyuZoneEncounter = {
  name: "袭击者",
  image:
    "UI/Sprite/A1DynamicLoad/BossCard/UnPacker/BossCardLv01/Monster_Example.png",
}

const roomData: ShiyuZoneRoomData = {
  wavesNum: 2,
  monsterList: { "11314": encounterData },
}

const room: ShiyuZoneRoom = {
  monsterIcon: "",
  monsterList: { "11314": encounterText },
  monsterWeakness: { "200": "物理", "202": "冰属性" },
  monsterResistance: { "200": "物理" },
}

const stageData: ShiyuZoneStageData = {
  stageNum: 1,
  monsterLevel: 25,
  child: [],
  goalType: 1,
  ssRankGoal: 300,
  sRankGoal: 240,
  aRankGoal: 180,
  bRankGoal: 120,
  layerRoom: { "97001011": roomData },
}

const stage: ShiyuZoneStage = {
  name: "稳定防线一",
  layerBuff: {
    "97001011": { title: "强击特化", desc: "说明原文。" },
  },
  layerRoom: { "97001011": room },
}

export const minimalData: ShiyuData = {
  id: 970001,
  priority: 3,
  zone: { "9700101": stageData },
}

/** 常驻记录没有时间字段：可选成员不补默认值。 */
export const permanentData: ShiyuData = minimalData

/** 轮换记录提取条件公共时间字段。 */
export const rotatingData: ShiyuData = {
  ...minimalData,
  beginTime: "2024-07-04 04:00:00",
  endTime: "2024-08-01 03:59:59",
}

export const dataWithUnknownFields: ShiyuData = {
  ...minimalData,
  // @ts-expect-error 未登记的顶层字段在封闭类型上被拒绝。
  future_container: { nested: [0, { empty: {}, nil: null, text: "" }] },
}

export const minimalDetails: ShiyuDetails = {
  id: 970001,
  locale: "zh",
  name: "",
  zone: {},
}

export const detailsWithZoneText: ShiyuDetails = {
  ...minimalDetails,
  zone: { "9700101": stage },
}

export const detailsWithUnknownMembers: ShiyuDetails = {
  ...minimalDetails,
  zone: {
    "9700101": {
      ...stage,
      // @ts-expect-error zone 各层未登记成员在封闭类型上被拒绝。
      future_stage_member: 0,
    },
  },
}

export const detailsWithSkeletonMember: ShiyuDetails = {
  ...minimalDetails,
  zone: {
    "9700101": {
      ...stage,
      // @ts-expect-error 数值骨架成员不属于 details 的 zone 文本结构。
      stageNum: 1,
    },
  },
}

export const detailsWithSingleLocaleTime: ShiyuDetails = {
  ...minimalDetails,
  // @ts-expect-error 条件公共时间字段只进 data；单语言独有不再留在 details。
  beginTime: "2024-07-04 04:00:00",
}

export const wrongStageNumType: ShiyuZoneStageData = {
  ...stageData,
  // @ts-expect-error stageNum 是数值字段，不接受字符串。
  stageNum: "1",
}

// @ts-expect-error 阶段的必需成员 child 缺失。
export const missingChild: ShiyuZoneStageData = {
  stageNum: 1,
  monsterLevel: 25,
  goalType: 1,
  ssRankGoal: 0,
  sRankGoal: 0,
  aRankGoal: 0,
  bRankGoal: 0,
  layerRoom: {},
}

// @ts-expect-error id 必须为安全数值，不接受字符串。
export const wrongIdType: ShiyuData = { ...minimalData, id: "970001" }

// @ts-expect-error 缺失 priority 不能由未知字段补位。
export const missingPriority: ShiyuData = {
  id: 970001,
  zone: { "9700101": stageData },
}

// @ts-expect-error 缺失 zone 的 data 不完整。
export const missingZone: ShiyuData = {
  id: 970001,
  priority: 3,
}

// @ts-expect-error details 的必需成员 zone 缺失。
export const missingDetailsZone: ShiyuDetails = {
  id: 970001,
  locale: "zh",
  name: "",
}

export const wrongLocale: ShiyuDetails = {
  ...minimalDetails,
  // @ts-expect-error locale 只接受已支持语言。
  locale: "ja",
}

export const wrongEncounterStatsType: ShiyuZoneEncounterData = {
  ...encounterData,
  // @ts-expect-error stats 的成员是数值，不接受字符串。
  stats: { ...encounterData.stats, hp: "18723.601" },
}

export const wrongWavesNumType: ShiyuZoneRoomData = {
  ...roomData,
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
        locale: "index",
        pointer: "/future_field",
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
  detailsWithZoneText,
  wrongStageNumType,
  missingChild,
  wrongIdType,
  missingPriority,
  missingZone,
  missingDetailsZone,
  wrongLocale,
  wrongEncounterStatsType,
  wrongWavesNumType,
  wrongInputLocales,
  integrated,
  fullInput,
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
