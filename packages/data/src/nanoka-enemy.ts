export type NanokaEnemyAttribute =
  | "physical"
  | "fire"
  | "ice"
  | "electric"
  | "ether"
  | "wind"

export interface NanokaMonsterStats {
  hp?: unknown
  attack?: unknown
  defence?: unknown
  stun?: unknown
  auto_recover_rate?: unknown
  base_buildup_ratio?: unknown
  physical_damage_res?: unknown
  fire_damage_res?: unknown
  ice_damage_res?: unknown
  electric_damage_res?: unknown
  ether_damage_res?: unknown
  [key: string]: unknown
}

export interface NanokaMonsterInfo {
  code_name?: unknown
  type?: unknown
  tag?: unknown
  element?: unknown
  stats?: NanokaMonsterStats
}

export interface NanokaMonsterDetail {
  id: number
  name?: unknown
  monster_id?: unknown
  group_id?: unknown
  monster_info?: Record<string, NanokaMonsterInfo>
}

export interface NanokaEnemyVariantMappingSpec {
  cleanedEnemyId: string
  sourceVersion: string
  detailId: number
  monsterInfoId: number
  expectedName: string
  expectedCodeName: string
  requiredTags: string[]
  goldenAnchors: string[]
}

export interface NanokaEnemyVariantMapping {
  cleanedEnemyId: string
  sourceVersion: string
  nanokaDetailId: number
  nanokaMonsterInfoId: number
  nanokaName: string
  nanokaCodeName: string
  nanokaGroupId: number
  infoType: string
  tags: string[]
  goldenAnchors: string[]
  variantSelectionRule: "detail.monster_id -> monster_info[monster_id]"
  statsRaw: {
    hp: number
    attack: number
    defense: number
    daze: number
    autoRecoverRate: number
    baseBuildupRatio: number
  }
  elementProfile: Partial<Record<NanokaEnemyAttribute, number>>
  runtimeCutoverReady: false
}

const enemyAttributes = new Set<NanokaEnemyAttribute>([
  "physical",
  "fire",
  "ice",
  "electric",
  "ether",
  "wind",
])

export function deriveNanokaEnemyVariantMapping(
  detail: NanokaMonsterDetail,
  spec: NanokaEnemyVariantMappingSpec,
): NanokaEnemyVariantMapping {
  if (detail.id !== spec.detailId)
    throw new Error(`${spec.cleanedEnemyId}: nanoka monster detail id mismatch`)

  const selectedMonsterInfoId = requiredFinite(detail.monster_id, `${spec.cleanedEnemyId}.monster_id`)
  if (selectedMonsterInfoId !== spec.monsterInfoId)
    throw new Error(`${spec.cleanedEnemyId}: nanoka monster_info id mismatch`)

  const info = detail.monster_info?.[String(spec.monsterInfoId)]
  if (info === undefined)
    throw new Error(`${spec.cleanedEnemyId}: missing monster_info.${spec.monsterInfoId}`)

  const name = requiredString(detail.name, `${spec.cleanedEnemyId}.name`)
  if (name !== spec.expectedName)
    throw new Error(`${spec.cleanedEnemyId}: nanoka monster name mismatch`)

  const codeName = requiredString(info.code_name, `${spec.cleanedEnemyId}.monster_info.${spec.monsterInfoId}.code_name`)
  if (codeName !== spec.expectedCodeName)
    throw new Error(`${spec.cleanedEnemyId}: nanoka monster_info code_name mismatch`)

  const tags = requiredStringArray(info.tag, `${spec.cleanedEnemyId}.monster_info.${spec.monsterInfoId}.tag`)
  for (const tag of spec.requiredTags) {
    if (!tags.includes(tag))
      throw new Error(`${spec.cleanedEnemyId}: missing required monster_info tag ${tag}`)
  }

  const stats = requiredObject(info.stats, `${spec.cleanedEnemyId}.monster_info.${spec.monsterInfoId}.stats`) as NanokaMonsterStats

  return {
    cleanedEnemyId: spec.cleanedEnemyId,
    sourceVersion: spec.sourceVersion,
    nanokaDetailId: detail.id,
    nanokaMonsterInfoId: spec.monsterInfoId,
    nanokaName: name,
    nanokaCodeName: codeName,
    nanokaGroupId: requiredFinite(detail.group_id, `${spec.cleanedEnemyId}.group_id`),
    infoType: requiredString(info.type, `${spec.cleanedEnemyId}.monster_info.${spec.monsterInfoId}.type`),
    tags,
    goldenAnchors: [...spec.goldenAnchors],
    variantSelectionRule: "detail.monster_id -> monster_info[monster_id]",
    statsRaw: {
      hp: requiredFinite(stats.hp, `${spec.cleanedEnemyId}.monster_info.${spec.monsterInfoId}.stats.hp`),
      attack: requiredFinite(stats.attack, `${spec.cleanedEnemyId}.monster_info.${spec.monsterInfoId}.stats.attack`),
      defense: requiredFinite(stats.defence, `${spec.cleanedEnemyId}.monster_info.${spec.monsterInfoId}.stats.defence`),
      daze: requiredFinite(stats.stun, `${spec.cleanedEnemyId}.monster_info.${spec.monsterInfoId}.stats.stun`),
      autoRecoverRate: requiredFinite(stats.auto_recover_rate, `${spec.cleanedEnemyId}.monster_info.${spec.monsterInfoId}.stats.auto_recover_rate`),
      baseBuildupRatio: requiredFinite(stats.base_buildup_ratio, `${spec.cleanedEnemyId}.monster_info.${spec.monsterInfoId}.stats.base_buildup_ratio`),
    },
    elementProfile: normalizeElementProfile(info.element, `${spec.cleanedEnemyId}.monster_info.${spec.monsterInfoId}.element`),
    runtimeCutoverReady: false,
  }
}

export function deriveNanokaEnemyVariantMappings(
  details: readonly NanokaMonsterDetail[],
  specs: readonly NanokaEnemyVariantMappingSpec[],
): NanokaEnemyVariantMapping[] {
  const detailsById = new Map(details.map(detail => [detail.id, detail]))
  return specs.map((spec) => {
    const detail = detailsById.get(spec.detailId)
    if (detail === undefined)
      throw new Error(`${spec.cleanedEnemyId}: missing nanoka monster detail ${spec.detailId}`)
    return deriveNanokaEnemyVariantMapping(detail, spec)
  })
}

function normalizeElementProfile(value: unknown, path: string): Partial<Record<NanokaEnemyAttribute, number>> {
  const record = requiredObject(value, path)
  const result: Partial<Record<NanokaEnemyAttribute, number>> = {}
  for (const [key, raw] of Object.entries(record)) {
    if (!enemyAttributes.has(key as NanokaEnemyAttribute))
      continue
    result[key as NanokaEnemyAttribute] = requiredFinite(raw, `${path}.${key}`)
  }
  return result
}

function requiredObject(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error(`Missing object nanoka enemy field ${path}`)
  return value as Record<string, unknown>
}

function requiredString(value: unknown, path: string): string {
  if (typeof value !== "string")
    throw new Error(`Missing nanoka enemy text field ${path}`)
  return value
}

function requiredStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value) || !value.every(item => typeof item === "string"))
    throw new Error(`Missing nanoka enemy string array field ${path}`)
  return value
}

function requiredFinite(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error(`Missing numeric nanoka enemy field ${path}`)
  return value
}
