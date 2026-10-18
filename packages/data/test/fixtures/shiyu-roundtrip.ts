import { deepStrictEqual } from "node:assert"
import { expect } from "vitest"
import type { IntegratedShiyu } from "../../src/integration/integrate-shiyu.ts"
import { expectJsonFidelity } from "./json-fidelity.ts"

/** 独立测试侧还原：按同一来源路径合并数值骨架与各语言文本；不引用生产 schema 或拆分函数。 */
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function define(result: Record<string, unknown>, key: string, value: unknown) {
  Object.defineProperty(result, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  })
}

/**
 * 已登记结构的还原形状：只沿实际结构路径逆向改名。
 * 字典 key 一律原样保留（含恰好与登记字段同名的 key）；未登记成员不存在于封闭结构。
 */
type RestoreShape =
  | { kind: "array"; items: RestoreShape }
  | { kind: "dict"; values: RestoreShape }
  | {
      kind: "object"
      /** 本层结构字段的输出名 → 来源拼写。 */
      renamed: Readonly<Record<string, string>>
      /** 需要继续按子形状还原的成员；未列出的成员整个值原样保留。 */
      children: Readonly<Record<string, RestoreShape>>
    }

const encounterSkeletonShape: RestoreShape = {
  kind: "object",
  // id、element、stats 没有登记改名，整个值原样保留。
  renamed: {},
  children: {},
}

const roomSkeletonShape: RestoreShape = {
  kind: "object",
  renamed: {
    wavesNum: "waves_num",
    monsterList: "monster_list",
  },
  children: {
    monsterList: { kind: "dict", values: encounterSkeletonShape },
  },
}

const stageSkeletonShape: RestoreShape = {
  kind: "object",
  renamed: {
    stageNum: "stage_num",
    monsterLevel: "monster_level",
    goalType: "goal_type",
    ssRankGoal: "ss_rank_goal",
    sRankGoal: "s_rank_goal",
    aRankGoal: "a_rank_goal",
    bRankGoal: "b_rank_goal",
    layerRoom: "layer_room",
  },
  // child 数组没有登记改名，整个值原样保留；只有房间条目继续按结构还原。
  children: { layerRoom: { kind: "dict", values: roomSkeletonShape } },
}

const encounterTextShape: RestoreShape = {
  kind: "object",
  // name、image 没有登记改名，整个值原样保留。
  renamed: {},
  children: {},
}

const roomTextShape: RestoreShape = {
  kind: "object",
  renamed: {
    monsterIcon: "monster_icon",
    monsterList: "monster_list",
    monsterWeakness: "monster_weakness",
    monsterResistance: "monster_resistance",
  },
  children: {
    monsterList: { kind: "dict", values: encounterTextShape },
  },
}

const stageTextShape: RestoreShape = {
  kind: "object",
  renamed: { layerBuff: "layer_buff", layerRoom: "layer_room" },
  children: { layerRoom: { kind: "dict", values: roomTextShape } },
}

/** data 的顶层结构字段；zone 数值骨架按阶段字典还原。 */
const dataShape: RestoreShape = {
  kind: "object",
  renamed: { beginTime: "begin_time", endTime: "end_time" },
  children: { zone: { kind: "dict", values: stageSkeletonShape } },
}

/** details 的顶层结构：zone 文本部分按阶段字典还原，文本成员内部没有登记改名。 */
const detailsShape: RestoreShape = {
  kind: "object",
  renamed: {},
  children: { zone: { kind: "dict", values: stageTextShape } },
}

function restoreShape(value: unknown, shape: RestoreShape): unknown {
  switch (shape.kind) {
    case "array":
      return Array.isArray(value)
        ? value.map((item) => restoreShape(item, shape.items))
        : value
    case "dict": {
      if (!object(value)) return value
      const restored: Record<string, unknown> = {}
      for (const [key, item] of Object.entries(value))
        define(restored, key, restoreShape(item, shape.values))
      return restored
    }
    case "object": {
      if (!object(value)) return value
      const restored: Record<string, unknown> = {}
      for (const [key, item] of Object.entries(value)) {
        // 只认形状表的自有 key：constructor、__proto__、toString 等原型链成员不得误判为命中。
        const child = Object.hasOwn(shape.children, key)
          ? shape.children[key]
          : undefined
        define(
          restored,
          Object.hasOwn(shape.renamed, key) ? shape.renamed[key]! : key,
          child === undefined ? item : restoreShape(item, child),
        )
      }
      return restored
    }
  }
}

/**
 * 骨架与文本的递归合并：双方都持有的 key 必须都是普通对象（阶段、房间、encounter 层级），
 * 否则属于还原载荷重叠，必须拒绝，不能任选一侧掩盖冲突；单侧持有的 key 原样保留。
 */
function mergeSkeletonWithText(
  skeleton: Record<string, unknown>,
  text: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(skeleton)) {
    if (!Object.hasOwn(text, key)) {
      define(merged, key, value)
      continue
    }
    const other = text[key]
    if (!object(value) || !object(other))
      throw new Error(`还原载荷重叠：zone 内 ${key}`)
    define(merged, key, mergeSkeletonWithText(value, other))
  }
  for (const [key, value] of Object.entries(text))
    if (!Object.hasOwn(merged, key)) define(merged, key, value)
  return merged
}

export function expectShiyuRoundtrip(
  result: IntegratedShiyu,
  input: { sourceRecord: unknown; details: Record<string, unknown> },
): void {
  expectJsonFidelity(result.sourceRecord, input.sourceRecord)
  for (const [locale, source] of Object.entries(input.details)) {
    const details = structuredClone(
      result.details[locale as "zh" | "en"],
    ) as unknown as Record<string, unknown>
    const data = structuredClone(result.data) as unknown as Record<
      string,
      unknown
    >
    expect(details.locale).toBe(locale)
    expect(details.id).toBe(data.id)
    delete details.locale
    delete details.id
    // data 数值骨架与 details 文本各自按来源拼写还原，再按 zone 层级合并成完整关卡结构。
    const restored = restoreShape(data, dataShape) as Record<string, unknown>
    const detailsRestored = restoreShape(details, detailsShape) as Record<
      string,
      unknown
    >
    const zone = mergeSkeletonWithText(
      object(restored.zone) ? restored.zone : {},
      object(detailsRestored.zone) ? detailsRestored.zone : {},
    )
    delete restored.zone
    delete detailsRestored.zone
    // data 与 details 之间规范允许的重复只有身份副本 id 与派生辅助字段 locale；
    // 两者已在上方核对并剔除。其余同名成员属于错误字段归属，同值重复也必须拒绝，
    // 不能任选一侧掩盖冲突。
    for (const [key, value] of Object.entries(detailsRestored)) {
      if (Object.hasOwn(restored, key)) throw new Error(`还原载荷重叠：${key}`)
      define(restored, key, value)
    }
    define(restored, "zone", zone)
    deepStrictEqual(restored, source)
  }
}
