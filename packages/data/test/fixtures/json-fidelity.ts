import { deepStrictEqual } from "node:assert"

/**
 * 独立测试侧 JSON 保真断言：按自有可枚举数据属性比较实际值与预期值。
 *
 * Node `deepStrictEqual` 把对象值 `constructor`、`__proto__`、`toString` 等被遮蔽的
 * 自有属性当作普通数据成员参与比较，既不忽略这些 key，也不会把两侧对象值的
 * `constructor` 当作类型判断；Vitest `toStrictEqual` 存在后者，会把合法复制误报为
 * 不相等，因此来源 JSON 不使用它。本函数不调用生产 `equalJson`、schema 或转换函数。
 */
export function expectJsonFidelity(actual: unknown, expected: unknown): void {
  deepStrictEqual(actual, expected)
}
