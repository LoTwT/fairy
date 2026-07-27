import type { SupportedLanguage } from "./policy.ts"
import {
  createBangbooDetailResource,
  discoverBangbooIds,
  validateBangbooDetail,
  validateBangbooEntityDetails,
} from "./bangboo.ts"
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
  createWeaponDetailResource,
  discoverWeaponIds,
  validateWeaponDetail,
  validateWeaponEntityDetails,
} from "./weapon.ts"

export const historicalV2EntityEpochs = [
  ["character", "equipment"],
  ["character", "equipment", "weapon"],
] as const
export const supportedEntityNames = [
  "character",
  "equipment",
  "weapon",
  "bangboo",
] as const
export type EntityName = (typeof supportedEntityNames)[number]

export interface EntityDetailResource {
  entityId: string
  language: SupportedLanguage
  assetId: string
  localPath: string
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
]

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
