import type { DetailLocale } from "../../src/integration/agent-types.ts"
import { integrateAgent } from "../../src/integration/integrate-agent.ts"
import { integrateBangboo } from "../../src/integration/integrate-bangboo.ts"
import { integrateDriveDisc } from "../../src/integration/integrate-drive-disc.ts"
import { integrateMonster } from "../../src/integration/integrate-monster.ts"
import { integrateWEngine } from "../../src/integration/integrate-w-engine.ts"
import type { JsonObject } from "../../src/integration/source-json.ts"
import type { EntityName } from "../nanoka/policy.ts"
import { supportedEntityNames } from "../nanoka/policy.ts"
import { completeLocaleRecord, requireValue } from "./artifact-files.ts"

/** 成员文件的身份检查上下文；由验证器按实际文件位置提供。 */
export interface IntegratedSnapshotMemberFileContext {
  /** 该成员文件在制品中的路径，相对 integrated/。 */
  path: string

  /** 成员 ID；与索引 key、成员目录名一致。 */
  memberId: string

  /** 实体文件种类；details 文件另有 locale。 */
  file: "data" | "details"

  /** details 文件对应的语言；data 文件不提供。 */
  locale?: DetailLocale
}

/**
 * 已接入类别的静态契约：类别名、来源实体、规则版本与成员文件身份检查。
 *
 * 身份规则由每个类别明确实现，不统一假定所有实体都有同一种 id 字段；函数必填，
 * 避免漏登记后静默跳过身份检查。验证与旧快照复验只需要这一部分。
 */
export interface IntegratedSnapshotEntityContract {
  /** 类别登记名；同时是制品目录名与索引 entities 的 key，如 agents。 */
  name: string

  /** 上游来源实体名；决定 zzz/{version}/{entity}.json 与详情资源路径，如 character。 */
  sourceEntity: EntityName

  /** 该类别当前的整合规则版本，如 nanoka-agent-reference/4。 */
  rulesVersion: string

  /** 成员文件身份检查；不含路径、摘要与预算检查。 */
  verifyMemberFile: (
    value: JsonObject,
    context: IntegratedSnapshotMemberFileContext,
  ) => void
}

/** 一个成员的纯整合结果；文件内容与来源记录均为已解析 JSON。 */
export interface IntegratedSnapshotMemberResult {
  /** data.json 对应的顶层对象。 */
  data: unknown

  /** 语言 → details.{locale}.json 顶层对象；必须覆盖调用传入的全部语言。 */
  details: Record<DetailLocale, unknown>

  /** 独立来源索引记录副本；保持原 key 与原值。 */
  sourceRecord: unknown

  /** 该成员的维护信息；只写入制品外的维护报告，缺失时报告记录 null。 */
  maintenance?: unknown
}

/** 生成能力 = 静态契约 + 纯整合函数；只处理已解析 JSON，不读取文件。 */
export interface IntegratedSnapshotEntityProducer extends IntegratedSnapshotEntityContract {
  integrate: (input: {
    /** 成员 ID，与来源索引 key 一致。 */
    memberId: string
    /** 来源索引记录的已解析原值，由类别自行运行时校验。 */
    sourceRecord: unknown
    /** 语言 → 原始详情；覆盖全部传入语言。 */
    details: Record<DetailLocale, unknown>
    /** 显式有序的已取得详情语言；首个语言决定类别内取值特例。 */
    detailLocales: readonly DetailLocale[]
  }) => IntegratedSnapshotMemberResult
}

const entityNamePattern = /^[a-z][a-z0-9-]*$/u
const rulesVersionPattern = /^[a-z0-9-]+\/[1-9]\d*$/u

/** 校验类别登记表：名称唯一且可作为目录名、来源实体已登记且不复用、规则版本、身份检查必备。 */
export function validateSnapshotEntityContracts(
  entities: readonly IntegratedSnapshotEntityContract[],
): void {
  if (!entities.length) throw new Error("已接入类别登记表不能为空")
  const names = new Set<string>()
  const sourceEntities = new Set<string>()
  for (const entity of entities) {
    if (
      typeof entity.name !== "string" ||
      entity.name.length > 64 ||
      !entityNamePattern.test(entity.name)
    )
      throw new Error(`类别登记名无效：${String(entity.name)}`)
    if (names.has(entity.name))
      throw new Error(`类别登记名重复：${entity.name}`)
    names.add(entity.name)
    if (!supportedEntityNames.includes(entity.sourceEntity))
      throw new Error(`类别 ${entity.name}: 来源实体未登记`)
    if (sourceEntities.has(entity.sourceEntity))
      throw new Error(
        `类别 ${entity.name}: 来源实体 ${entity.sourceEntity} 已被其他类别使用`,
      )
    sourceEntities.add(entity.sourceEntity)
    if (
      typeof entity.rulesVersion !== "string" ||
      !rulesVersionPattern.test(entity.rulesVersion)
    )
      throw new Error(`类别 ${entity.name}: 规则版本无效`)
    if (typeof entity.verifyMemberFile !== "function")
      throw new Error(`类别 ${entity.name}: 缺少成员文件身份检查`)
  }
}

/** 构建入口在静态契约之外要求纯整合函数；验证与历史复验不要求。 */
export function validateSnapshotEntityProducers(
  entities: readonly IntegratedSnapshotEntityProducer[],
): void {
  validateSnapshotEntityContracts(entities)
  for (const entity of entities)
    if (typeof (entity as { integrate?: unknown }).integrate !== "function")
      throw new Error(`类别 ${entity.name}: 缺少纯整合函数`)
}

/** 代理人成员文件身份：data 与全部 details 都核对 id，另核对语言副本。 */
export function verifyAgentSnapshotMemberFile(
  value: JsonObject,
  { path, memberId, file, locale }: IntegratedSnapshotMemberFileContext,
): void {
  requireValue(
    Number.isSafeInteger(value.id) && String(value.id) === memberId,
    `${path}/id`,
    "身份错误",
  )
  requireValue(
    file === "data" ? !Object.hasOwn(value, "locale") : value.locale === locale,
    `${path}/locale`,
    "语言错误",
  )
}

/** 代理人类别：复用既有单实体纯整合函数，来源实体与规则版本在此显式登记。 */
export const nanokaAgentsSnapshotEntity: IntegratedSnapshotEntityProducer = {
  name: "agents",
  sourceEntity: "character",
  rulesVersion: "nanoka-agent-reference/4",
  verifyMemberFile: verifyAgentSnapshotMemberFile,
  integrate({ memberId, sourceRecord, details, detailLocales }) {
    const result = integrateAgent({
      entityId: memberId,
      sourceRecord,
      details,
      detailLocales,
    })
    const integratedDetails = new Map<DetailLocale, unknown>()
    for (const locale of detailLocales) {
      const value = result.details[locale]
      if (value === undefined)
        throw new Error(`代理人 ${memberId}: 缺少 ${locale} 详情整合结果`)
      integratedDetails.set(locale, value)
    }
    return {
      data: result.data,
      details: completeLocaleRecord(
        integratedDetails,
        `代理人 ${memberId} 详情整合结果`,
      ),
      sourceRecord: result.sourceRecord,
      maintenance: result.maintenance,
    }
  },
}

/** 驱动盘成员文件身份：data 与全部 details 都核对 id，另核对语言副本；规则与代理人各自独立登记。 */
export function verifyDriveDiscSnapshotMemberFile(
  value: JsonObject,
  { path, memberId, file, locale }: IntegratedSnapshotMemberFileContext,
): void {
  requireValue(
    Number.isSafeInteger(value.id) && String(value.id) === memberId,
    `${path}/id`,
    "身份错误",
  )
  requireValue(
    file === "data" ? !Object.hasOwn(value, "locale") : value.locale === locale,
    `${path}/locale`,
    "语言错误",
  )
}

/** 驱动盘类别：复用既有单实体纯整合函数，来源实体与规则版本在此显式登记。 */
export const nanokaDriveDiscsSnapshotEntity: IntegratedSnapshotEntityProducer =
  {
    name: "drive-discs",
    sourceEntity: "equipment",
    rulesVersion: "nanoka-drive-disc-reference/1",
    verifyMemberFile: verifyDriveDiscSnapshotMemberFile,
    integrate({ memberId, sourceRecord, details, detailLocales }) {
      const result = integrateDriveDisc({
        entityId: memberId,
        sourceRecord,
        details,
        detailLocales,
      })
      const integratedDetails = new Map<DetailLocale, unknown>()
      for (const locale of detailLocales) {
        const value = result.details[locale]
        if (value === undefined)
          throw new Error(`驱动盘 ${memberId}: 缺少 ${locale} 详情整合结果`)
        integratedDetails.set(locale, value)
      }
      return {
        data: result.data,
        details: completeLocaleRecord(
          integratedDetails,
          `驱动盘 ${memberId} 详情整合结果`,
        ),
        sourceRecord: result.sourceRecord,
        maintenance: result.maintenance,
      }
    },
  }

/** WEngine 成员文件身份：data 与全部 details 都核对 id，另核对语言副本；规则与代理人、驱动盘各自独立登记。 */
export function verifyWEngineSnapshotMemberFile(
  value: JsonObject,
  { path, memberId, file, locale }: IntegratedSnapshotMemberFileContext,
): void {
  requireValue(
    Number.isSafeInteger(value.id) && String(value.id) === memberId,
    `${path}/id`,
    "身份错误",
  )
  requireValue(
    file === "data" ? !Object.hasOwn(value, "locale") : value.locale === locale,
    `${path}/locale`,
    "语言错误",
  )
}

/** WEngine 类别：复用既有单实体纯整合函数，来源实体与规则版本在此显式登记。 */
export const nanokaWEnginesSnapshotEntity: IntegratedSnapshotEntityProducer = {
  name: "w-engines",
  sourceEntity: "weapon",
  rulesVersion: "nanoka-w-engine-reference/1",
  verifyMemberFile: verifyWEngineSnapshotMemberFile,
  integrate({ memberId, sourceRecord, details, detailLocales }) {
    const result = integrateWEngine({
      entityId: memberId,
      sourceRecord,
      details,
      detailLocales,
    })
    const integratedDetails = new Map<DetailLocale, unknown>()
    for (const locale of detailLocales) {
      const value = result.details[locale]
      if (value === undefined)
        throw new Error(`WEngine ${memberId}: 缺少 ${locale} 详情整合结果`)
      integratedDetails.set(locale, value)
    }
    return {
      data: result.data,
      details: completeLocaleRecord(
        integratedDetails,
        `WEngine ${memberId} 详情整合结果`,
      ),
      sourceRecord: result.sourceRecord,
      maintenance: result.maintenance,
    }
  },
}

/** Bangboo 成员文件身份：data 与全部 details 都核对 id，另核对语言副本；规则与其他类别各自独立登记。 */
export function verifyBangbooSnapshotMemberFile(
  value: JsonObject,
  { path, memberId, file, locale }: IntegratedSnapshotMemberFileContext,
): void {
  requireValue(
    Number.isSafeInteger(value.id) && String(value.id) === memberId,
    `${path}/id`,
    "身份错误",
  )
  requireValue(
    file === "data" ? !Object.hasOwn(value, "locale") : value.locale === locale,
    `${path}/locale`,
    "语言错误",
  )
}

/** Bangboo 类别：复用既有单实体纯整合函数，来源实体与规则版本在此显式登记。 */
export const nanokaBangboosSnapshotEntity: IntegratedSnapshotEntityProducer = {
  name: "bangboos",
  sourceEntity: "bangboo",
  rulesVersion: "nanoka-bangboo-reference/1",
  verifyMemberFile: verifyBangbooSnapshotMemberFile,
  integrate({ memberId, sourceRecord, details, detailLocales }) {
    const result = integrateBangboo({
      entityId: memberId,
      sourceRecord,
      details,
      detailLocales,
    })
    const integratedDetails = new Map<DetailLocale, unknown>()
    for (const locale of detailLocales) {
      const value = result.details[locale]
      if (value === undefined)
        throw new Error(`Bangboo ${memberId}: 缺少 ${locale} 详情整合结果`)
      integratedDetails.set(locale, value)
    }
    return {
      data: result.data,
      details: completeLocaleRecord(
        integratedDetails,
        `Bangboo ${memberId} 详情整合结果`,
      ),
      sourceRecord: result.sourceRecord,
      maintenance: result.maintenance,
    }
  },
}

/** Monster 成员文件身份：data 与全部 details 都核对 id，另核对语言副本；规则与其他类别各自独立登记。 */
export function verifyMonsterSnapshotMemberFile(
  value: JsonObject,
  { path, memberId, file, locale }: IntegratedSnapshotMemberFileContext,
): void {
  requireValue(
    Number.isSafeInteger(value.id) && String(value.id) === memberId,
    `${path}/id`,
    "身份错误",
  )
  requireValue(
    file === "data" ? !Object.hasOwn(value, "locale") : value.locale === locale,
    `${path}/locale`,
    "语言错误",
  )
}

/** Monster 类别：复用既有单实体纯整合函数，来源实体与规则版本在此显式登记。 */
export const nanokaMonstersSnapshotEntity: IntegratedSnapshotEntityProducer = {
  name: "monsters",
  sourceEntity: "monster",
  rulesVersion: "nanoka-monster-reference/1",
  verifyMemberFile: verifyMonsterSnapshotMemberFile,
  integrate({ memberId, sourceRecord, details, detailLocales }) {
    const result = integrateMonster({
      entityId: memberId,
      sourceRecord,
      details,
      detailLocales,
    })
    const integratedDetails = new Map<DetailLocale, unknown>()
    for (const locale of detailLocales) {
      const value = result.details[locale]
      if (value === undefined)
        throw new Error(`Monster ${memberId}: 缺少 ${locale} 详情整合结果`)
      integratedDetails.set(locale, value)
    }
    return {
      data: result.data,
      details: completeLocaleRecord(
        integratedDetails,
        `Monster ${memberId} 详情整合结果`,
      ),
      sourceRecord: result.sourceRecord,
      maintenance: result.maintenance,
    }
  },
}

/** 当前已接入类别；新类别必须在此显式登记，不从 raw 目录或抓取器支持列表推断。 */
export const onboardedSnapshotEntities: readonly IntegratedSnapshotEntityProducer[] =
  [
    nanokaAgentsSnapshotEntity,
    nanokaDriveDiscsSnapshotEntity,
    nanokaWEnginesSnapshotEntity,
    nanokaBangboosSnapshotEntity,
    nanokaMonstersSnapshotEntity,
  ]
