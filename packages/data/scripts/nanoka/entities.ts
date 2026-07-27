import type { SupportedLanguage } from "./policy.ts"
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

export const supportedEntityNames = ["character", "equipment"] as const
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
