import type { SupportedLanguage } from "./policy.ts"
import {
  createBangbooDetailResource,
  discoverBangbooIds,
  validateBangbooDetail,
  validateBangbooEntityDetails,
} from "./bangboo.ts"
import {
  bossMonsterReferenceValidator,
  bossSimulBossAdjustConsistencyValidator,
  bossSimulBuffConsistencyValidator,
  createBossDetailResource,
  discoverBossIds,
  validateBossDetail,
  validateBossEntityDetails,
} from "./boss.ts"
import {
  createCharacterDetailResource,
  discoverCharacterIds,
  validateCharacterDetail,
} from "./characters.ts"
import {
  createEquipmentDetailResource,
  discoverEquipmentIds,
  validateEquipmentDetail,
} from "./equipment.ts"

import {
  createMonsterDetailResource,
  discoverMonsterIds,
  validateMonsterDetail,
  validateMonsterEntityDetails,
} from "./monster.ts"
import {
  createShiyuDetailResource,
  discoverShiyuIds,
  shiyuMonsterReferenceValidator,
  validateShiyuDetail,
  validateShiyuEntityDetails,
} from "./shiyu.ts"
import {
  createSimulDetailResource,
  discoverSimulIds,
  simulMonsterReferenceValidator,
  validateSimulDetail,
  validateSimulEntityDetails,
} from "./simul.ts"
import {
  createWeaponDetailResource,
  discoverWeaponIds,
  validateWeaponDetail,
  validateWeaponEntityDetails,
} from "./weapon.ts"

export const historicalV2EntityEpochs = [
  ["character", "equipment"],
  ["character", "equipment", "weapon"],
  ["character", "equipment", "weapon", "bangboo"],
  ["character", "equipment", "weapon", "bangboo", "monster"],
  ["character", "equipment", "weapon", "bangboo", "monster", "shiyu"],
  ["character", "equipment", "weapon", "bangboo", "monster", "shiyu", "simul"],
  [
    "character",
    "equipment",
    "weapon",
    "bangboo",
    "monster",
    "shiyu",
    "simul",
    "boss",
  ],
] as const
export const supportedEntityNames = [
  "character",
  "equipment",
  "weapon",
  "bangboo",
  "monster",
  "shiyu",
  "simul",
  "boss",
] as const
export type EntityName = (typeof supportedEntityNames)[number]

export interface EntityDetailResource {
  entityId: string
  language: SupportedLanguage
  assetId: string
  localPath: string
}

export interface EntityValidationData {
  indexValue: unknown
  ids: string[]
  detailsByLanguage: Record<SupportedLanguage, Map<string, unknown>>
}

export interface CrossEntityValidationRecord {
  checkId: string
  fromEntity: EntityName
  toEntity: EntityName
  status: "passed" | "not-run" | "not-applicable"
  checkedReferenceCount: number
  unresolvedReferenceCount: number
  reason: string | null
}

export interface CrossEntityValidationContext {
  entities: ReadonlyMap<EntityName, EntityValidationData>
}

export interface CrossEntityValidator {
  checkId: string
  fromEntity: EntityName
  toEntity: EntityName
  introducedInEntityEpoch: readonly EntityName[]
  validate(context: CrossEntityValidationContext): {
    checkedReferenceCount: number
    unresolvedReferenceCount: number
  }
}

export interface EntityAdapter {
  name: EntityName
  displayName: string
  discoverIds(value: unknown): string[]
  createDetailResource(
    entityId: string,
    language: SupportedLanguage,
  ): EntityDetailResource
  validateDetail(
    value: unknown,
    expectedEntityId: string,
    indexValue: unknown,
    language: SupportedLanguage,
  ): void
  validateEntityDetails?(
    detailsByLanguage: Record<SupportedLanguage, Map<string, unknown>>,
  ): void
}

export const entityRegistry: readonly EntityAdapter[] = [
  {
    name: "character",
    displayName: "Agents",
    discoverIds: discoverCharacterIds,
    createDetailResource(entityId, language) {
      const resource = createCharacterDetailResource(entityId, language)
      return {
        ...resource,
        entityId: resource.characterId,
        assetId: `entity-detail:character:${language}:${entityId}`,
      }
    },
    validateDetail(value, expectedEntityId) {
      validateCharacterDetail(value, expectedEntityId)
    },
  },
  {
    name: "equipment",
    displayName: "Drive Discs",
    discoverIds: discoverEquipmentIds,
    createDetailResource: createEquipmentDetailResource,
    validateDetail(value, expectedEntityId, indexValue, language) {
      validateEquipmentDetail(value, expectedEntityId, indexValue, language)
    },
  },
  {
    name: "weapon",
    displayName: "W-Engines",
    discoverIds: discoverWeaponIds,
    createDetailResource: createWeaponDetailResource,
    validateDetail(value, expectedEntityId, indexValue, language) {
      validateWeaponDetail(value, expectedEntityId, indexValue, language)
    },
    validateEntityDetails: validateWeaponEntityDetails,
  },
  {
    name: "bangboo",
    displayName: "Bangboos",
    discoverIds: discoverBangbooIds,
    createDetailResource: createBangbooDetailResource,
    validateDetail(value, expectedEntityId, indexValue, language) {
      validateBangbooDetail(value, expectedEntityId, indexValue, language)
    },
    validateEntityDetails: validateBangbooEntityDetails,
  },
  {
    name: "monster",
    displayName: "Monsters",
    discoverIds: discoverMonsterIds,
    createDetailResource: createMonsterDetailResource,
    validateDetail(value, expectedEntityId, indexValue, language) {
      validateMonsterDetail(value, expectedEntityId, indexValue, language)
    },
    validateEntityDetails: validateMonsterEntityDetails,
  },
  {
    name: "shiyu",
    displayName: "Shiyu Defense",
    discoverIds: discoverShiyuIds,
    createDetailResource: createShiyuDetailResource,
    validateDetail(value, expectedEntityId, indexValue) {
      validateShiyuDetail(value, expectedEntityId, indexValue)
    },
    validateEntityDetails: validateShiyuEntityDetails,
  },
  {
    name: "simul",
    displayName: "Hollow Zero",
    discoverIds: discoverSimulIds,
    createDetailResource: createSimulDetailResource,
    validateDetail(value, expectedEntityId, indexValue) {
      validateSimulDetail(value, expectedEntityId, indexValue)
    },
    validateEntityDetails: validateSimulEntityDetails,
  },
  {
    name: "boss",
    displayName: "Deadly Assault",
    discoverIds: discoverBossIds,
    createDetailResource: createBossDetailResource,
    validateDetail(value, expectedEntityId, indexValue) {
      validateBossDetail(value, expectedEntityId, indexValue)
    },
    validateEntityDetails: validateBossEntityDetails,
  },
]

export const crossEntityValidatorRegistry: readonly CrossEntityValidator[] = [
  shiyuMonsterReferenceValidator,
  simulMonsterReferenceValidator,
  bossMonsterReferenceValidator,
  bossSimulBossAdjustConsistencyValidator,
  bossSimulBuffConsistencyValidator,
]

export function createCrossEntityValidationRecords(
  entities: readonly EntityName[],
  validationData: ReadonlyMap<EntityName, EntityValidationData>,
  validators: readonly CrossEntityValidator[] = crossEntityValidatorRegistry,
): CrossEntityValidationRecord[] {
  validateCrossEntityValidatorRegistry(validators)
  const presentEntities = new Set(entities)
  return validators
    .filter((validator) =>
      isValidatorIntroducedForEpoch(validator, presentEntities),
    )
    .map((validator) => {
      if (!presentEntities.has(validator.fromEntity))
        return {
          checkId: validator.checkId,
          fromEntity: validator.fromEntity,
          toEntity: validator.toEntity,
          status: "not-applicable",
          checkedReferenceCount: 0,
          unresolvedReferenceCount: 0,
          reason: `来源实体 ${validator.fromEntity} 不在当前快照 epoch`,
        }
      if (!presentEntities.has(validator.toEntity))
        return {
          checkId: validator.checkId,
          fromEntity: validator.fromEntity,
          toEntity: validator.toEntity,
          status: "not-run",
          checkedReferenceCount: 0,
          unresolvedReferenceCount: 0,
          reason: `目标实体 ${validator.toEntity} 不在当前快照 epoch`,
        }
      if (!validationData.has(validator.fromEntity))
        throw new Error(
          `${validator.checkId} 缺少来源实体 ${validator.fromEntity} 的验证数据`,
        )
      if (!validationData.has(validator.toEntity))
        throw new Error(
          `${validator.checkId} 缺少目标实体 ${validator.toEntity} 的验证数据`,
        )
      let result: ReturnType<CrossEntityValidator["validate"]>
      try {
        result = validator.validate({ entities: validationData })
      } catch (error) {
        throw new Error(
          `${validator.checkId} 执行失败：${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        )
      }
      validateCrossEntityValidationResult(validator.checkId, result)
      if (result.unresolvedReferenceCount !== 0)
        throw new Error(
          `${validator.checkId} 存在 ${result.unresolvedReferenceCount} 个未解析引用`,
        )
      return {
        checkId: validator.checkId,
        fromEntity: validator.fromEntity,
        toEntity: validator.toEntity,
        status: "passed",
        checkedReferenceCount: result.checkedReferenceCount,
        unresolvedReferenceCount: 0,
        reason: null,
      }
    })
}

function validateCrossEntityValidatorRegistry(
  validators: readonly CrossEntityValidator[],
): void {
  const checkIds = new Set<string>()
  for (const validator of validators) {
    if (validator.checkId.length === 0)
      throw new Error("跨实体 validator checkId 不能为空")
    if (checkIds.has(validator.checkId))
      throw new Error(`重复跨实体 validator checkId：${validator.checkId}`)
    checkIds.add(validator.checkId)
    if (!isValidEntityEpoch(validator.introducedInEntityEpoch))
      throw new Error(
        `${validator.checkId} introducedInEntityEpoch 不是合法实体 epoch`,
      )
  }
}

function isValidatorIntroducedForEpoch(
  validator: CrossEntityValidator,
  presentEntities: ReadonlySet<EntityName>,
): boolean {
  return validator.introducedInEntityEpoch.every((entity) =>
    presentEntities.has(entity),
  )
}

function isValidEntityEpoch(entities: readonly EntityName[]): boolean {
  const enabled = entityRegistry.map(({ name }) => name)
  return (
    entities.length > 0 &&
    entities.every((entity, index) => entity === enabled[index])
  )
}

function validateCrossEntityValidationResult(
  checkId: string,
  result: ReturnType<CrossEntityValidator["validate"]>,
): void {
  if (
    !Number.isSafeInteger(result.checkedReferenceCount) ||
    result.checkedReferenceCount < 0 ||
    !Number.isSafeInteger(result.unresolvedReferenceCount) ||
    result.unresolvedReferenceCount < 0 ||
    result.unresolvedReferenceCount > result.checkedReferenceCount
  )
    throw new Error(`${checkId} 返回了无效引用计数`)
}

export function getEntityAdapter(name: string): EntityAdapter {
  const adapter = entityRegistry.find((candidate) => candidate.name === name)
  if (adapter === undefined)
    throw new Error(`未知或未实现的 Nanoka 实体：${name}`)
  return adapter
}

export function normalizeSelectedEntities(
  names?: readonly string[],
): EntityName[] {
  if (names === undefined || names.length === 0)
    return entityRegistry.map(({ name }) => name)
  const requested = new Set<EntityName>()
  for (const name of names) requested.add(getEntityAdapter(name).name)
  return entityRegistry
    .map(({ name }) => name)
    .filter((name) => requested.has(name))
}

export function isEntityName(value: unknown): value is EntityName {
  return (
    typeof value === "string" &&
    supportedEntityNames.includes(value as EntityName)
  )
}
