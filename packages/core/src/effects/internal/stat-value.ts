import type { Stat } from "../types.ts"

/**
 * 异常掌控是面板上唯一的整数字段：无论从当前值、初始值还是快照读取，
 * 都按整数向下取整；其他属性保持原值。
 */
export function normalizeStatReadValue(stat: Stat, value: number): number {
  return stat === "anomalyMastery" ? Math.floor(value) : value
}
