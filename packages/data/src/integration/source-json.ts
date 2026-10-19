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

/**
 * 来源索引记录提升到 `data.names` 的名称容器。
 * `zh`、`en` 必填，`ja`、`ko` 可选；可选语言缺失时不补造，出现时必须为字符串。
 */
export interface SourceIndexNames {
  /** 来源索引 `zh` 名称原值。 */
  zh: string

  /** 来源索引 `en` 名称原值；发布目录以其作为名称类别的稳定来源。 */
  en: string

  /** 来源索引 `ja` 名称原值；索引记录提供时逐字复制。 */
  ja?: string

  /** 来源索引 `ko` 名称原值；索引记录提供时逐字复制。 */
  ko?: string
}

/** `data.names` 中必填的语言 key。 */
export const requiredSourceIndexNameLocales: readonly string[] = ["zh", "en"]

/** `data.names` 中可选的语言 key；缺失时不生成，出现时校验字符串。 */
export const optionalSourceIndexNameLocales: readonly string[] = ["ja", "ko"]

/**
 * 从来源索引记录提取 `data.names`：zh/en 必需，ja/ko 可选。
 * 名称按来源原值逐字复制，不与详情名称对账；索引记录本身的 key 与值不变。
 */
export function extractSourceIndexNames(
  record: JsonObject,
  location: SourceLocation,
  ErrorClass: SourceIntegrationErrorConstructor,
): SourceIndexNames {
  const names: JsonObject = {}
  for (const locale of requiredSourceIndexNameLocales) {
    if (!Object.hasOwn(record, locale))
      fail(at(location, locale), "缺失必需字段", ErrorClass)
    const value = record[locale]
    if (typeof value !== "string")
      fail(at(location, locale), "字段类型必须为 string", ErrorClass)
    put(names, locale, value)
  }
  for (const locale of optionalSourceIndexNameLocales) {
    if (!Object.hasOwn(record, locale)) continue
    const value = record[locale]
    if (typeof value !== "string")
      fail(at(location, locale), "字段类型必须为 string", ErrorClass)
    put(names, locale, value)
  }
  return names as unknown as SourceIndexNames
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

/** WEngine 整合失败；与代理人、驱动盘分开具名，便于调用方按实体类别定位。 */
export class WEngineIntegrationError extends SourceIntegrationError {
  constructor(location: SourceLocation, reason: string) {
    super(location, reason)
    this.name = "WEngineIntegrationError"
  }
}

/** Bangboo 整合失败；与代理人、驱动盘、WEngine 分开具名，便于调用方按实体类别定位。 */
export class BangbooIntegrationError extends SourceIntegrationError {
  constructor(location: SourceLocation, reason: string) {
    super(location, reason)
    this.name = "BangbooIntegrationError"
  }
}

/** Monster 整合失败；与代理人、驱动盘、WEngine、Bangboo 分开具名，便于调用方按实体类别定位。 */
export class MonsterIntegrationError extends SourceIntegrationError {
  constructor(location: SourceLocation, reason: string) {
    super(location, reason)
    this.name = "MonsterIntegrationError"
  }
}

/** Shiyu 整合失败；与代理人、驱动盘、WEngine、Bangboo、Monster 分开具名，便于调用方按实体类别定位。 */
export class ShiyuIntegrationError extends SourceIntegrationError {
  constructor(location: SourceLocation, reason: string) {
    super(location, reason)
    this.name = "ShiyuIntegrationError"
  }
}

/** Boss 整合失败；与代理人、驱动盘、WEngine、Bangboo、Monster、Shiyu 分开具名，便于调用方按实体类别定位。 */
export class BossIntegrationError extends SourceIntegrationError {
  constructor(location: SourceLocation, reason: string) {
    super(location, reason)
    this.name = "BossIntegrationError"
  }
}

/** Simul 整合失败；与代理人、驱动盘、WEngine、Bangboo、Monster、Shiyu、Boss 分开具名，便于调用方按实体类别定位。 */
export class SimulIntegrationError extends SourceIntegrationError {
  constructor(location: SourceLocation, reason: string) {
    super(location, reason)
    this.name = "SimulIntegrationError"
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
