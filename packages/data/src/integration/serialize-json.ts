import type { SourceJson } from "./agent-types.ts"
import { copyJson } from "./source-json.ts"

/**
 * 规范十进制 key（不受实体 ID 长度约束）优先；其余按 UTF-16 代码单元排序。
 *
 * 序列化与维护报告的键顺序共用这一处定义，报告顺序因此不受对象遍历偶然顺序影响。
 */
export function compareJsonKeys(left: string, right: string): number {
  const decimal = /^(0|[1-9]\d*)$/u
  const leftDecimal = decimal.test(left)
  const rightDecimal = decimal.test(right)
  if (leftDecimal && rightDecimal)
    return (
      left.length - right.length || (left < right ? -1 : left > right ? 1 : 0)
    )
  if (leftDecimal !== rightDecimal) return leftDecimal ? -1 : 1
  return left < right ? -1 : left > right ? 1 : 0
}

/** 先拒绝不能往返的值，再直接生成文本，避免 JS 对整数属性的枚举重排。 */
export function serializeJson(value: unknown): Uint8Array {
  const json = copyJson(value, { entityId: "", locale: "input", pointer: "" })
  function render(current: SourceJson, depth: number): string {
    if (current === null || typeof current !== "object")
      return JSON.stringify(current)
    const array = Array.isArray(current)
    const entries = array
      ? current.map((item) => render(item, depth + 1))
      : Object.keys(current)
          .toSorted(compareJsonKeys)
          .map(
            (key) =>
              `${JSON.stringify(key)}: ${render(current[key], depth + 1)}`,
          )
    const [open, close] = array ? ["[", "]"] : ["{", "}"]
    if (!entries.length) return open + close
    const indent = "  ".repeat(depth + 1)
    return `${open}\n${indent}${entries.join(`,\n${indent}`)}\n${"  ".repeat(depth)}${close}`
  }
  return new TextEncoder().encode(`${render(json, 0)}\n`)
}
