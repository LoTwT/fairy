/**
 * 由包 tsc 真正检查的 Bangboo 类型正反例；负例的 @ts-expect-error 必须实际匹配错误。
 * 文件不参与 vitest，只表达正式类型允许与拒绝的结构。
 */
import type {
  BangbooData,
  BangbooDetails,
  BangbooLevelStageLocalization,
  BangbooSkillPropParameter,
} from "../src/integration/bangboo-types.ts"
import type { BangbooFieldKind } from "../src/integration/bangboo-schema.ts"
import type {
  IntegratedBangboo,
  IntegrateBangbooInput,
} from "../src/integration/integrate-bangboo.ts"
import type { UnknownFieldDiagnostic } from "../src/integration/source-json.ts"

export const minimalData: BangbooData = {
  id: 950001,
  rarity: 3,
  icon: "",
  stats: {
    endurance: 0,
    hpMax: 0,
    hpupgrade: 0,
    attack: 0,
    attackUpgrade: 0,
    breakStun: 0,
    elementAbnormalPower: 0,
    defence: 0,
    defUpgrade: 0,
    crit: 0,
    penRatio: 0,
    critDmg: 0,
  },
  skillProp: {},
  level: {},
}

/** 未登记的顶层来源字段仍是可保留的 JSON 值，不因类型声明被否定。 */
export const dataWithUnknownFields: BangbooData = {
  ...minimalData,
  future_container: { nested: [0, { empty: {}, nil: null, text: "" }] },
}

/** 共享块与阶段内部的未登记成员同样原样保留。 */
export const dataWithUnknownMembers: BangbooData = {
  ...minimalData,
  stats: { ...minimalData.stats, future_stat: 1 },
  skillProp: {
    "9500101": {
      "elementAccumulationValue": 34600,
      "note": "说明",
      "1001": { main: 46200, growth: 4620, format: "%", future_member: 0 },
    },
  },
  level: {
    "1": {
      hpMax: 0,
      attack: 0,
      defence: 0,
      levelMax: 10,
      levelMin: 0,
      materials: { "10": 15000 },
      extra: { "20101": { prop: 20101, value: 0 } },
      future_stage_member: "text",
    },
  },
}

export const minimalDetails: BangbooDetails = {
  id: 950001,
  locale: "zh",
  codeName: "Bangboo_Example",
  name: "",
  desc: "",
  skill: {},
  level: {},
}

/** details 的等级阶段：共有阶段只剩 extra 文本，独有阶段保留完整结构。 */
export const detailsWithSplitLevel: BangbooDetails = {
  ...minimalDetails,
  skill: {
    a: {
      level: {
        "1": {
          name: "冰刀舞",
          desc: "说明",
          property: ["倍率"],
          param: "20秒",
        },
      },
    },
    c: { level: {} },
  },
  level: {
    "1": {
      extra: { "20101": { name: "暴击率", format: "{0:0.#%}" } },
    },
    "3": {
      hpMax: 376,
      attack: 233,
      defence: 75,
      levelMax: 30,
      levelMin: 20,
      materials: { "10": 75000 },
      extra: {
        "21101": {
          prop: 21101,
          name: "暴击伤害",
          format: "{0:0.#%}",
          value: 2500,
        },
      },
    },
  },
}

export const detailsWithUnknownFields: BangbooDetails = {
  ...minimalDetails,
  untouched: { raw_key: [null, "", {}, [], 0] },
}

/** 单语言独有阶段的可选成员只在存在时声明，不补默认值。 */
export const stageWithoutOptionalMembers: BangbooLevelStageLocalization = {
  extra: {},
}

export const wrongStatsType: BangbooData = {
  ...minimalData,
  // @ts-expect-error hpMax 是数值字段，不接受字符串。
  stats: { ...minimalData.stats, hpMax: "360" },
}

// @ts-expect-error id 必须为安全数值，不接受字符串。
export const wrongIdType: BangbooData = { ...minimalData, id: "950001" }

// @ts-expect-error 缺失 rarity 不能由未知字段补位。
export const missingRarity: BangbooData = {
  id: 950001,
  icon: "",
  stats: minimalData.stats,
  skillProp: {},
  level: {},
}

// @ts-expect-error 参数表的必需成员 main 缺失。
export const missingParameterMember: BangbooSkillPropParameter = {
  growth: 0,
  format: "%",
}

export const missingStageMember: BangbooData = {
  ...minimalData,
  level: {
    // @ts-expect-error 必需成员 materials 缺失。
    "1": {
      hpMax: 0,
      attack: 0,
      defence: 0,
      levelMax: 10,
      levelMin: 0,
      extra: {},
    },
  },
}

export const wrongLocale: BangbooDetails = {
  ...minimalDetails,
  // @ts-expect-error locale 只接受已支持语言。
  locale: "ja",
}

// @ts-expect-error details 的共有阶段不要求数值成员，但 extra 必须存在。
export const missingExtra: BangbooLevelStageLocalization = {}

export const wrongPropertyType: BangbooDetails = {
  ...minimalDetails,
  skill: {
    a: {
      level: {
        "1": {
          name: "",
          desc: "",
          // @ts-expect-error property 是字符串数组，不接受字符串。
          property: "倍率",
          param: "",
        },
      },
    },
  },
}

export const wrongParamType: BangbooDetails = {
  ...minimalDetails,
  skill: {
    a: {
      level: {
        "1": {
          name: "",
          desc: "",
          property: [],
          // @ts-expect-error param 按字符串保留，不接受数值。
          param: 20,
        },
      },
    },
  },
}

export const wrongInputLocales: IntegrateBangbooInput = {
  entityId: "950001",
  sourceRecord: {},
  details: {},
  // @ts-expect-error IntegrateBangbooInput 的 detailLocales 是只读语言数组。
  detailLocales: "zh",
}

export const integrated: IntegratedBangboo = {
  data: minimalData,
  details: { zh: minimalDetails },
  sourceRecord: { icon: "BangbooGarageRoleExample.png", zh: "示例布" },
  maintenance: {
    diagnostics: [
      {
        entityId: "950001",
        locale: "zh",
        pointer: "/untouched",
        kind: "unknown-field",
      },
    ],
  },
}

export const fullInput: IntegrateBangbooInput = {
  entityId: "950001",
  sourceRecord: minimalDetails,
  details: { zh: minimalDetails },
  detailLocales: ["zh"],
}

// 未使用变量仅用于类型检查；引用以避免 noUnusedLocals 报错。
export const checks: unknown[] = [
  wrongStatsType,
  wrongIdType,
  missingRarity,
  missingParameterMember,
  missingStageMember,
  wrongLocale,
  missingExtra,
  wrongPropertyType,
  wrongParamType,
  wrongInputLocales,
  dataWithUnknownFields,
  dataWithUnknownMembers,
  detailsWithSplitLevel,
  detailsWithUnknownFields,
  stageWithoutOptionalMembers,
]

/** 诊断与字段种类的结构约束同样进入类型检查。 */
export const diagnostic: UnknownFieldDiagnostic = {
  entityId: "950001",
  locale: "index",
  pointer: "/future_field",
  kind: "unknown-field",
}

// @ts-expect-error BangbooFieldKind 不接受未登记的字段种类。
const wrongFieldKind: BangbooFieldKind = "boolean"

export const fieldKindCheck: unknown = wrongFieldKind
