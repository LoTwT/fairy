import { deepStrictEqual } from "node:assert"
import { expect } from "vitest"
import type { IntegratedShiyu } from "../../src/integration/integrate-shiyu.ts"

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

/** 全部登记字段在所有层级上的还原拼写；各层级改名单义，可共用一张表。 */
const restoreNames: Readonly<Record<string, string>> = {
  priority: "priority",
  beginTime: "begin_time",
  endTime: "end_time",
  id: "id",
  name: "name",
  stageNum: "stage_num",
  monsterLevel: "monster_level",
  layerBuff: "layer_buff",
  child: "child",
  layerRoom: "layer_room",
  goalType: "goal_type",
  ssRankGoal: "ss_rank_goal",
  sRankGoal: "s_rank_goal",
  aRankGoal: "a_rank_goal",
  bRankGoal: "b_rank_goal",
  title: "title",
  desc: "desc",
  monsterIcon: "monster_icon",
  monsterList: "monster_list",
  monsterWeakness: "monster_weakness",
  wavesNum: "waves_num",
  image: "image",
  element: "element",
  stats: "stats",
}

/** 递归还原对象成员名：命中登记表则换回来源拼写，未登记成员按原 key 原样保留。 */
function restore(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(restore)
  if (!object(value)) return value
  const restored: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value))
    // 只认登记表的自有 key：constructor、__proto__、toString 等原型链成员不得误判为命中。
    define(
      restored,
      Object.hasOwn(restoreNames, key) ? restoreNames[key]! : key,
      restore(item),
    )
  return restored
}

export function expectShiyuRoundtrip(
  result: IntegratedShiyu,
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
    // data 提取的字段回到顶层；details 剩余内容（含单语言独有的时间字段）按来源拼写合并。
    const restored = restore(data) as Record<string, unknown>
    const detailsRestored = restore(details) as Record<string, unknown>
    for (const [key, value] of Object.entries(detailsRestored))
      if (!Object.hasOwn(restored, key)) define(restored, key, value)
    deepStrictEqual(restored, source)
  }
}
