/**
 * 由包 tsc 真正检查的 Boss 类型正反例；负例的 @ts-expect-error 必须实际匹配错误。
 * 文件不参与 vitest，只表达正式类型允许与拒绝的结构。
 */
import type {
  BossAdjustEntry,
  BossData,
  BossDetails,
  BossMode,
  BossZoneEncounter,
  BossZoneRoom,
  BossZoneStage,
} from "../src/integration/boss-types.ts"
import type { BossFieldKind } from "../src/integration/boss-schema.ts"
import type {
  IntegratedBoss,
  IntegrateBossInput,
} from "../src/integration/integrate-boss.ts"
import type { UnknownFieldDiagnostic } from "../src/integration/source-json.ts"

const encounter: BossZoneEncounter = {
  id: 30024,
  name: "示例首领",
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

const room: BossZoneRoom = {
  monsterIcon:
    "Assets/NapResources/UI/Sprite/A1DynamicLoad/IconBossGeneral/UnPacker/IconMonster_Example.png",
  monsterList: { "11818": encounter },
  monsterWeakness: { "202": "冰属性" },
  wavesNum: 1,
}

const stage: BossZoneStage = {
  name: "示例首领·一阶",
  stageNum: 1,
  monsterLevel: 70,
  layerBuff: {
    "98010110": { title: "", desc: "说明原文。" },
  },
  layerRoom: { "98001011": room },
  goalType: 2,
  sRankGoal: 20000,
  aRankGoal: 14000,
  bRankGoal: 6000,
  selectableBuff: {
    "98010101": { title: "诛心", desc: "说明原文。" },
  },
}

const mode: BossMode = {
  id: 980001,
  zoneType: 1001,
  zone: { "9800101": stage },
}

const adjust: BossAdjustEntry = { hp: 1200, atk: -5000, points: 1000 }

export const minimalData: BossData = {
  id: 980001,
  priority: 5,
  zoneType: 1001,
  beginTime: "2024-07-04 04:00:00",
  endTime: "2024-08-01 03:59:59",
  bossAdjust: { "1001": adjust },
}

/** bossAdjust 未登记成员随块保留并参与完整值比较。 */
export const dataWithAdjustUnknownMembers: BossData = {
  ...minimalData,
  bossAdjust: {
    "1001": { ...adjust, future_member: "说明" },
  },
}

/** 未登记的顶层来源字段仍是可保留的 JSON 值，不因类型声明被否定。 */
export const dataWithUnknownFields: BossData = {
  ...minimalData,
  future_container: { nested: [0, { empty: {}, nil: null, text: "" }] },
}

/** 当前结构变体：顶层 modes 数组，顺序保持来源原样。 */
export const detailsWithModes: BossDetails = {
  id: 980001,
  locale: "zh",
  name: "试炼",
  modes: [mode],
}

/** 旧结构变体：顶层 zone 字典，与 modes 互斥，不转换也不丢弃原层级。 */
export const detailsWithLegacyZone: BossDetails = {
  id: 980001,
  locale: "zh",
  name: "试炼",
  zone: { "9800101": stage },
}

/** zone 各层未登记成员原样保留。 */
export const detailsWithUnknownMembers: BossDetails = {
  ...detailsWithModes,
  untouched: { raw_key: [null, "", {}, [], 0] },
  modes: [
    {
      ...mode,
      future_mode_member: 0,
      zone: {
        "9800101": {
          ...stage,
          future_stage_member: 0,
          layerRoom: {
            "98001011": {
              ...room,
              future_room_member: "text",
              monsterList: {
                "11818": { ...encounter, future_encounter_member: 0 },
              },
            },
          },
        },
      },
    },
  ],
}

export const wrongStageNumType: BossZoneStage = {
  ...stage,
  // @ts-expect-error stageNum 是数值字段，不接受字符串。
  stageNum: "1",
}

// @ts-expect-error 阶段的必需成员 selectable_buff 缺失。
export const missingSelectableBuff: BossZoneStage = {
  name: "",
  stageNum: 1,
  monsterLevel: 70,
  layerBuff: {},
  layerRoom: {},
  goalType: 2,
  sRankGoal: 0,
  aRankGoal: 0,
  bRankGoal: 0,
}

// @ts-expect-error mode 的必需成员 zone 缺失。
export const missingModeZone: BossMode = {
  id: 980001,
  zoneType: 1001,
}

// @ts-expect-error id 必须为安全数值，不接受字符串。
export const wrongIdType: BossData = { ...minimalData, id: "980001" }

// @ts-expect-error 缺失 bossAdjust 不能由未知字段补位。
export const missingBossAdjust: BossData = {
  id: 980001,
  priority: 5,
  zoneType: 1001,
  beginTime: "",
  endTime: "",
}

export const wrongAdjustType: BossAdjustEntry = {
  ...adjust,
  // @ts-expect-error atk 是数值字段，不接受字符串。
  atk: "-5000",
}

// @ts-expect-error details 的必需成员 name 缺失。
export const missingName: BossDetails = {
  id: 980001,
  locale: "zh",
}

export const wrongLocale: BossDetails = {
  ...detailsWithModes,
  // @ts-expect-error locale 只接受已支持语言。
  locale: "ja",
}

export const wrongWavesNumType: BossZoneRoom = {
  ...room,
  // @ts-expect-error wavesNum 是数值字段，不接受字符串。
  wavesNum: "1",
}

export const wrongEncounterStatsType: BossZoneEncounter = {
  ...encounter,
  // @ts-expect-error stats 的成员是数值，不接受字符串。
  stats: { ...encounter.stats, hp: "8737162.92" },
}

export const wrongInputLocales: IntegrateBossInput = {
  entityId: "980001",
  sourceRecord: {},
  details: {},
  // @ts-expect-error IntegrateBossInput 的 detailLocales 是只读语言数组。
  detailLocales: "zh",
}

export const integrated: IntegratedBoss = {
  data: minimalData,
  details: { zh: detailsWithModes },
  sourceRecord: { sort: 5, zh: "试炼" },
  maintenance: {
    diagnostics: [
      {
        entityId: "980001",
        locale: "zh",
        pointer: "/untouched",
        kind: "unknown-field",
      },
    ],
  },
}

export const fullInput: IntegrateBossInput = {
  entityId: "980001",
  sourceRecord: detailsWithModes,
  details: { zh: detailsWithModes },
  detailLocales: ["zh"],
}

// 未使用变量仅用于类型检查；引用以避免 noUnusedLocals 报错。
export const checks: unknown[] = [
  dataWithAdjustUnknownMembers,
  dataWithUnknownFields,
  detailsWithModes,
  detailsWithLegacyZone,
  detailsWithUnknownMembers,
  wrongStageNumType,
  missingSelectableBuff,
  missingModeZone,
  wrongIdType,
  missingBossAdjust,
  missingName,
  wrongLocale,
  wrongAdjustType,
  wrongWavesNumType,
  wrongEncounterStatsType,
  wrongInputLocales,
]

/** 诊断与字段种类的结构约束同样进入类型检查。 */
export const diagnostic: UnknownFieldDiagnostic = {
  entityId: "980001",
  locale: "index",
  pointer: "/future_field",
  kind: "unknown-field",
}

// @ts-expect-error BossFieldKind 不接受未登记的字段种类。
const wrongFieldKind: BossFieldKind = "boolean"

export const fieldKindCheck: unknown = wrongFieldKind
