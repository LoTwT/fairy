import { deepStrictEqual } from "node:assert"
import { expect } from "vitest"
import type { IntegratedSimul } from "../../src/integration/integrate-simul.ts"

/** 独立测试侧还原：按同一来源路径合并公共字段与各语言内容；不引用生产 schema 或拆分函数。 */
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
 * 字典 key 一律原样保留（含恰好与登记字段同名的 key）；未登记成员及其整个值原样保留，
 * 不继续推断或改写内部字段。
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

const roomShape: RestoreShape = {
  kind: "object",
  renamed: {
    monsterIcon: "monster_icon",
    monsterList: "monster_list",
    monsterWeakness: "monster_weakness",
    wavesNum: "waves_num",
  },
  // encounter 与弱点文本内部没有登记改名，整个值原样保留。
  children: {},
}

const layerShape: RestoreShape = {
  kind: "object",
  renamed: {
    monsterLevel: "monster_level",
    goalType: "goal_type",
    sRankGoal: "s_rank_goal",
    aRankGoal: "a_rank_goal",
    bRankGoal: "b_rank_goal",
    layerBuff: "layer_buff",
    layerRoom: "layer_room",
  },
  // layer_buff 内部没有登记改名，整个值原样保留；只有房间条目继续按结构还原。
  children: { layerRoom: { kind: "dict", values: roomShape } },
}

const battleShape: RestoreShape = {
  kind: "object",
  renamed: {
    tagType: "tag_type",
    aRankScoreLayerBuff: "a_rank_score_layer_buff",
    bRankScoreLayerBuff: "b_rank_score_layer_buff",
    sRankScoreLayerBuff: "s_rank_score_layer_buff",
    selectableBuff: "selectable_buff",
    layerRoom: "layer_room",
  },
  // 三个评级增益与 selectable_buff 内部没有登记改名，整个值原样保留。
  children: {
    layer: layerShape,
    layerRoom: { kind: "dict", values: roomShape },
  },
}

/** 剧情页面：三个解锁列表指向不同目标集合，数组内部没有登记改名，整个值原样保留。 */
const pageShape: RestoreShape = {
  kind: "object",
  renamed: {
    nextPage: "next_page",
    nextNodeUnlock: "next_node_unlock",
    nextRecordUnlock: "next_record_unlock",
  },
  children: {},
}

/** 剧情节点：story_event 是事件 key → 页面 key 的两层字典，battle 是战斗字典。 */
const nodeShape: RestoreShape = {
  kind: "object",
  renamed: { prevNode: "prev_node", storyEvent: "story_event" },
  children: {
    storyEvent: { kind: "dict", values: { kind: "dict", values: pageShape } },
    battle: { kind: "dict", values: battleShape },
  },
}

/** data 的顶层结构字段；bossAdjust 条目内部没有登记改名，整个值原样保留。 */
const dataShape: RestoreShape = {
  kind: "object",
  renamed: { endTime: "end_time", bossAdjust: "boss_adjust" },
  children: {},
}

/** details 的顶层结构：record 条目内部没有登记改名，整个值原样保留。 */
const detailsShape: RestoreShape = {
  kind: "object",
  renamed: {},
  children: { node: { kind: "dict", values: nodeShape } },
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

export function expectSimulRoundtrip(
  result: IntegratedSimul,
  input: { sourceRecord: unknown; details: Record<string, unknown> },
): void {
  expect(result.sourceRecord).toStrictEqual(input.sourceRecord)
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
    // data 提取的字段回到顶层；details 剩余内容（record、node 及未登记字段）按来源拼写合并。
    const restored = restoreShape(data, dataShape) as Record<string, unknown>
    const detailsRestored = restoreShape(details, detailsShape) as Record<
      string,
      unknown
    >
    for (const [key, value] of Object.entries(detailsRestored))
      if (!Object.hasOwn(restored, key)) define(restored, key, value)
    deepStrictEqual(restored, source)
  }
}
