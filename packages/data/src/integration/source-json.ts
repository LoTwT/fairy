import type { DetailLocale, SourceJson } from "./agent-types.ts"

export type JsonObject = Record<string, SourceJson>

/** 维护诊断使用来源 JSON Pointer；不是实体数据的一部分。 */
export interface SourceLocation {
  /** 明确输入的实体 ID。 */
  entityId: string
  /** 详情语言，或独立索引记录/调用配置。 */
  locale: DetailLocale | "index" | "input"
  /** 原始来源位置；根为实际输入记录。 */
  pointer: string
}

/** 未登记结构字段的维护提示；未知容器内部不猜测字段身份。 */
export interface UnknownFieldDiagnostic extends SourceLocation {
  /** 未登记字段提示，不影响原值保留。 */
  kind: "unknown-field"
}

/** 构造携带来源位置错误的整合错误类型；各实体类别提供具名子类。 */
export type SourceIntegrationErrorConstructor = new (
  location: SourceLocation,
  reason: string,
) => SourceIntegrationError

/** 整合失败时携带可定位来源位置的基础错误；不会返回部分整合结果。 */
export class SourceIntegrationError extends Error {
  /** 原始来源实体、语言和字段位置。 */
  readonly location: SourceLocation

  constructor(location: SourceLocation, reason: string) {
    super(
      `${JSON.stringify(location.entityId)} [${location.locale}] ${location.pointer || "/"}: ${reason}`,
    )
    this.name = "SourceIntegrationError"
    this.location = { ...location }
  }
}

/** 代理人整合失败；保留既有名称、消息格式与位置契约。 */
export class AgentIntegrationError extends SourceIntegrationError {
  constructor(location: SourceLocation, reason: string) {
    super(location, reason)
    this.name = "AgentIntegrationError"
  }
}

/** 驱动盘整合失败；与代理人分开具名，便于调用方按实体类别定位。 */
export class DriveDiscIntegrationError extends SourceIntegrationError {
  constructor(location: SourceLocation, reason: string) {
    super(location, reason)
    this.name = "DriveDiscIntegrationError"
  }
}

/** 失败时抛出指定类别的整合错误；默认沿用既有代理人错误契约，新实体类别显式传入自己的类型。 */
export function fail(
  location: SourceLocation,
  reason: string,
  ErrorClass: SourceIntegrationErrorConstructor = AgentIntegrationError,
): never {
  throw new ErrorClass(location, reason)
}

export function at(location: SourceLocation, key: string): SourceLocation {
  return { ...location, pointer: `${location.pointer}/${escapePointer(key)}` }
}

export function escapePointer(key: string): string {
  return key.replaceAll("~", "~0").replaceAll("/", "~1")
}

export function isObject(value: unknown): value is JsonObject {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  )
}

/** 特殊自有 key 也作为普通数据写入，不触发 __proto__ setter。 */
export function put<T>(
  object: Record<string, T>,
  key: string,
  value: NoInfer<T>,
): void {
  Object.defineProperty(object, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  })
}

export { isValidEntityId as isSourceId } from "../nanoka-identity.ts"

export function sortedIds(keys: string[]): string[] {
  return keys.toSorted((left, right) =>
    BigInt(left) < BigInt(right) ? -1 : BigInt(left) > BigInt(right) ? 1 : 0,
  )
}

/** 校验可无损往返的已解析 JSON，并复制所有自有成员；不读取访问器或继承成员。 */
export function copyJson(
  value: unknown,
  location: SourceLocation,
  ErrorClass: SourceIntegrationErrorConstructor = AgentIntegrationError,
  ancestors = new Set<object>(),
): SourceJson {
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return value
  if (typeof value === "number") {
    if (
      !Number.isFinite(value) ||
      (Number.isInteger(value) && !Number.isSafeInteger(value)) ||
      Object.is(value, -0)
    ) {
      fail(
        location,
        "非法数值：要求有限数值、安全整数且可无损 JSON 往返",
        ErrorClass,
      )
    }
    return value
  }
  if (!Array.isArray(value) && !isObject(value))
    fail(location, "要求普通 JSON 对象或可往返的 JSON 值", ErrorClass)
  if (ancestors.has(value)) fail(location, "JSON 值不能循环引用", ErrorClass)
  ancestors.add(value)
  const array = Array.isArray(value)
  if (array && Object.getPrototypeOf(value) !== Array.prototype)
    fail(location, "JSON 数组不能使用自定义原型", ErrorClass)
  const keys = Reflect.ownKeys(value)
  for (const key of keys) {
    if (array && key === "length") continue
    if (typeof key !== "string")
      fail(location, "JSON 值不能包含 Symbol key", ErrorClass)
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value"))
      fail(at(location, key), "JSON 成员必须是可枚举数据属性", ErrorClass)
    if (array && (!/^(0|[1-9]\d*)$/u.test(key) || Number(key) >= value.length))
      fail(at(location, key), "数组不能包含额外成员", ErrorClass)
  }
  let result: SourceJson
  if (array) {
    const items: SourceJson[] = []
    for (let index = 0; index < value.length; index++) {
      const key = String(index)
      if (!Object.hasOwn(value, key))
        fail(at(location, key), "JSON 数组不能有空洞", ErrorClass)
      items.push(
        copyJson(
          Object.getOwnPropertyDescriptor(value, key)!.value,
          at(location, key),
          ErrorClass,
          ancestors,
        ),
      )
    }
    result = items
  } else {
    const object: JsonObject = {}
    for (const key of Object.keys(value).toSorted())
      put(
        object,
        key,
        copyJson(
          Object.getOwnPropertyDescriptor(value, key)!.value,
          at(location, key),
          ErrorClass,
          ancestors,
        ),
      )
    result = object
  }
  ancestors.delete(value)
  return result
}

/** 对象排列无关、数组排列有关的完整 JSON 值相等判断。 */
export function equalJson(left: SourceJson, right: SourceJson): boolean {
  if (left === right) return true
  if (Array.isArray(left))
    return (
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => equalJson(value, right[index]))
    )
  if (!isObject(left) || !isObject(right)) return false
  const keys = Object.keys(left)
  return (
    keys.length === Object.keys(right).length &&
    keys.every(
      (key) => Object.hasOwn(right, key) && equalJson(left[key], right[key]),
    )
  )
}
