/**
 * 由包 tsc 真正检查的 Monster 类型正反例；负例的 @ts-expect-error 必须实际匹配错误。
 * 文件不参与 vitest，只表达正式类型允许与拒绝的结构。
 */
import type {
  MonsterData,
  MonsterDetails,
  MonsterGrowthCurve,
  MonsterInfoUnit,
} from "../src/integration/monster-types.ts"
import type { MonsterFieldKind } from "../src/integration/monster-schema.ts"
import type {
  IntegratedMonster,
  IntegrateMonsterInput,
} from "../src/integration/integrate-monster.ts"
import type { UnknownFieldDiagnostic } from "../src/integration/source-json.ts"

const unit: MonsterInfoUnit = {
  id: 960101,
  codeName: "Monster_ExampleA",
  icon: "",
  tag: ["Ether", "Demote", "Small"],
  type: "Monster",
  element: { ice: 1, fire: 0, electric: 0, ether: 1, physical: 0, wind: 0 },
  stats: {
    hp: 80,
    attack: 48,
    defence: 45,
    crit_damage: 5000,
    is_stun: false,
    can_interrupt_stun_recover: true,
    ether_damage_res: -2000,
  },
  curves: {
    hp: { curve: [100, 116, 136], ratio: 100 },
    stun: { curve: [100, 100, 100], ratio: 100 },
  },
}

export const minimalData: MonsterData = {
  id: 960001,
  monsterId: 960100,
  imagePath:
    "UI/Sprite/A1DynamicLoad/BossCard/UnPacker/BossCardLv01/Monster_Example.png",
  rarity: 1,
  groupId: 201,
  monsterInfo: {},
  elementAbnormal: {},
}

/** 未登记的顶层来源字段仍是可保留的 JSON 值，不因类型声明被否定。 */
export const dataWithUnknownFields: MonsterData = {
  ...minimalData,
  future_container: { nested: [0, { empty: {}, nil: null, text: "" }] },
}

/** 共享块内部的未登记成员同样原样保留。 */
export const dataWithUnknownMembers: MonsterData = {
  ...minimalData,
  monsterInfo: {
    "960101": { ...unit, future_unit_member: "说明" },
    "960102": {
      ...unit,
      id: 960102,
      curves: { hp: { ...unit.curves.hp!, note: 0 } },
    },
  },
}

export const minimalDetails: MonsterDetails = {
  id: 960001,
  locale: "zh",
  name: "",
  desc: "",
  groupDesc: "",
  cardObtain: "",
  cardQuote: "",
  cardSkillDesc: "",
}

export const detailsWithUnknownFields: MonsterDetails = {
  ...minimalDetails,
  untouched: { raw_key: [null, "", {}, [], 0] },
}

/** 空字符串是合法占位名称；类型不要求名称非空或唯一。 */
export const detailsWithPlaceholderName: MonsterDetails = {
  ...minimalDetails,
  name: "OfficialName_",
}

export const wrongStatsType: MonsterData = {
  ...minimalData,
  monsterInfo: {
    "960101": {
      ...unit,
      // @ts-expect-error stats 的成员是数值或布尔，不接受字符串。
      stats: { ...unit.stats, hp: "80" },
    },
  },
}

export const wrongTagType: MonsterInfoUnit = {
  ...unit,
  // @ts-expect-error tag 是字符串数组，不接受字符串。
  tag: "Ether",
}

export const wrongCurveType: MonsterGrowthCurve = {
  ratio: 100,
  // @ts-expect-error curve 是数值数组，不接受字符串数组。
  curve: ["100", "116"],
}

// @ts-expect-error id 必须为安全数值，不接受字符串。
export const wrongIdType: MonsterData = { ...minimalData, id: "960001" }

// @ts-expect-error 缺失 monsterId 不能由未知字段补位。
export const missingMonsterId: MonsterData = {
  id: 960001,
  imagePath: "",
  rarity: 1,
  groupId: 201,
  monsterInfo: {},
  elementAbnormal: {},
}

// @ts-expect-error details 的必需文本成员缺失。
export const missingCardQuote: MonsterDetails = {
  id: 960001,
  locale: "zh",
  name: "",
  desc: "",
  groupDesc: "",
  cardObtain: "",
  cardSkillDesc: "",
}

export const wrongLocale: MonsterDetails = {
  ...minimalDetails,
  // @ts-expect-error locale 只接受已支持语言。
  locale: "ja",
}

export const wrongInputLocales: IntegrateMonsterInput = {
  entityId: "960001",
  sourceRecord: {},
  details: {},
  // @ts-expect-error IntegrateMonsterInput 的 detailLocales 是只读语言数组。
  detailLocales: "zh",
}

export const integrated: IntegratedMonster = {
  data: minimalData,
  details: { zh: minimalDetails },
  sourceRecord: { icon: "Monster_Example.png", zh: "索引示例怪" },
  maintenance: {
    diagnostics: [
      {
        entityId: "960001",
        locale: "zh",
        pointer: "/untouched",
        kind: "unknown-field",
      },
    ],
  },
}

export const fullInput: IntegrateMonsterInput = {
  entityId: "960001",
  sourceRecord: minimalDetails,
  details: { zh: minimalDetails },
  detailLocales: ["zh"],
}

// 未使用变量仅用于类型检查；引用以避免 noUnusedLocals 报错。
export const checks: unknown[] = [
  wrongStatsType,
  wrongTagType,
  wrongCurveType,
  wrongIdType,
  missingMonsterId,
  missingCardQuote,
  wrongLocale,
  wrongInputLocales,
  dataWithUnknownFields,
  dataWithUnknownMembers,
  detailsWithUnknownFields,
  detailsWithPlaceholderName,
]

/** 诊断与字段种类的结构约束同样进入类型检查。 */
export const diagnostic: UnknownFieldDiagnostic = {
  entityId: "960001",
  locale: "index",
  pointer: "/future_field",
  kind: "unknown-field",
}

// @ts-expect-error MonsterFieldKind 不接受未登记的字段种类。
const wrongFieldKind: MonsterFieldKind = "boolean"

export const fieldKindCheck: unknown = wrongFieldKind
