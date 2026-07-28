import type { CrossEntityValidator, EntityValidationData } from "./entities.ts"
import type { SupportedLanguage } from "./policy.ts"
import { isPlainObject } from "./policy.ts"

const canonicalIdPattern = /^(0|[1-9]\d*)$/u
const positiveIdPattern = /^[1-9]\d*$/u
const languages = ["zh", "en"] as const
const elementFields = [
  "physical",
  "fire",
  "ice",
  "electric",
  "ether",
  "wind",
] as const
const monsterStatFields = [
  "hp",
  "attack",
  "defence",
  "stun",
  "attribute_infliction",
] as const
const bossValidatorEpoch = [
  "character",
  "equipment",
  "weapon",
  "bangboo",
  "monster",
  "shiyu",
  "simul",
  "boss",
] as const

export function isValidBossId(value: string): boolean {
  return canonicalIdPattern.test(value)
}

export function createBossDetailResource(
  entityId: string,
  language: SupportedLanguage,
): {
  entityId: string
  language: SupportedLanguage
  assetId: string
  localPath: string
} {
  if (!isValidBossId(entityId)) throw new Error(`Boss ID 无效：${entityId}`)
  return {
    entityId,
    language,
    assetId: `entity-detail:boss:${language}:${entityId}`,
    localPath: `${language}/boss/${entityId}.json`,
  }
}

export function discoverBossIds(value: unknown): string[] {
  if (!isPlainObject(value)) throw new Error("boss.json 顶层必须是普通对象")
  const ids = Object.keys(value)
  if (ids.length === 0) throw new Error("boss.json 不能为空")
  for (const id of ids) {
    if (!isValidBossId(id)) throw new Error(`boss.json 包含非法 Boss ID：${id}`)
    validateBossSummary(value[id], id)
  }
  return ids.toSorted(compareDecimalIds)
}

export function validateBossDetail(
  value: unknown,
  expectedEntityId: string,
  indexValue?: unknown,
): void {
  const description = `Boss ${expectedEntityId}`
  if (!isPlainObject(value))
    throw new Error(`${description} 详情必须是普通对象`)
  requireMemberId(value, expectedEntityId, `${description} 详情`)
  requireString(value, "name", `${description} 详情`)
  requireInteger(value, "priority", `${description} 详情`)
  requireInteger(value, "zone_type", `${description} 详情`)
  validateBossAdjust(value.boss_adjust, `${description}.boss_adjust`)
  validateOptionalStringPair(value, "begin_time", "end_time", description)

  const hasZone = Object.hasOwn(value, "zone")
  const hasModes = Object.hasOwn(value, "modes")
  if (hasZone === hasModes)
    throw new Error(`${description} 必须恰好包含 zone 或 modes 一个结构分支`)
  if (hasZone) validateZoneMap(value.zone, `${description}.zone`)
  else validateModes(value.modes, expectedEntityId, `${description}.modes`)

  if (indexValue !== undefined) {
    if (!isPlainObject(indexValue))
      throw new Error("boss.json 顶层必须是普通对象")
    const summary = indexValue[expectedEntityId]
    validateBossSummary(summary, expectedEntityId)
    if (isPlainObject(summary) && Object.hasOwn(summary, "begin")) {
      if (value.begin_time !== summary.begin || value.end_time !== summary.end)
        throw new Error(
          `${description} 的摘要 begin/end 与详情 begin_time/end_time 不一致`,
        )
    }
  }
}

export function validateBossEntityDetails(
  detailsByLanguage: Record<SupportedLanguage, Map<string, unknown>>,
): void {
  if (detailsByLanguage.zh.size !== detailsByLanguage.en.size)
    throw new Error("Boss zh/en 详情集合不一致")
  for (const [entityId, zhValue] of detailsByLanguage.zh) {
    if (!detailsByLanguage.en.has(entityId))
      throw new Error(`Boss ${entityId} 缺少 en 详情`)
    compareCrossLanguageValue(
      zhValue,
      detailsByLanguage.en.get(entityId),
      `Boss ${entityId}`,
    )
  }
}

export const bossMonsterReferenceValidator: CrossEntityValidator = {
  checkId: "boss-monster-reference/v1",
  fromEntity: "boss",
  toEntity: "monster",
  introducedInEntityEpoch: bossValidatorEpoch,
  validate({ entities }) {
    const boss = requireValidationData(entities.get("boss"), "boss")
    const monster = requireValidationData(entities.get("monster"), "monster")
    const monsterIds = new Set(monster.ids)
    let checkedReferenceCount = 0
    for (const language of languages)
      for (const bossId of boss.ids) {
        const detail = boss.detailsByLanguage[language].get(bossId)
        for (const zone of collectBossZones(
          detail,
          `boss ${bossId} ${language}`,
        )) {
          const layerRoom = zone.value.layer_room
          if (!isPlainObject(layerRoom))
            throw new Error(
              `boss ${bossId} ${language}.${zone.path}.layer_room 无效`,
            )
          for (const [roomId, room] of Object.entries(layerRoom)) {
            if (!isPlainObject(room) || !isPlainObject(room.monster_list))
              continue
            for (const [entryKey, entry] of Object.entries(room.monster_list)) {
              checkedReferenceCount += 1
              const monsterPath = `boss ${bossId} 的 ${language}.${zone.path}.layer_room.${roomId}.monster_list.${entryKey}.id（monsterListEntryKey=${entryKey}）`
              if (
                !isPlainObject(entry) ||
                !Number.isSafeInteger(entry.id) ||
                Number(entry.id) <= 0
              )
                throw new Error(
                  `${monsterPath} 必须是正安全整数 Monster ID，实际为 ${String(isPlainObject(entry) ? entry.id : undefined)}`,
                )
              const monsterId = String(entry.id)
              if (!monsterIds.has(monsterId))
                throw new Error(
                  `${monsterPath} 引用了未解析 Monster ID ${monsterId}`,
                )
            }
          }
        }
      }
    return { checkedReferenceCount, unresolvedReferenceCount: 0 }
  },
}

export const bossSimulBossAdjustConsistencyValidator: CrossEntityValidator = {
  checkId: "boss-simul-boss-adjust-consistency/v1",
  fromEntity: "boss",
  toEntity: "simul",
  introducedInEntityEpoch: bossValidatorEpoch,
  validate({ entities }) {
    const boss = requireValidationData(entities.get("boss"), "boss")
    const simul = requireValidationData(entities.get("simul"), "simul")
    let checkedReferenceCount = 0
    for (const language of languages) {
      const bossAdjust = requireConsistentAdjust(boss, language, "Boss")
      const simulAdjust = requireConsistentAdjust(simul, language, "Simul")
      checkedReferenceCount += boss.ids.length - 1 + (simul.ids.length - 1)
      if (!deepEqualJson(bossAdjust, simulAdjust))
        throw new Error(`Boss 与 Simul 的 ${language}.boss_adjust 不一致`)
      checkedReferenceCount += 1
    }
    return { checkedReferenceCount, unresolvedReferenceCount: 0 }
  },
}

export const bossSimulBuffConsistencyValidator: CrossEntityValidator = {
  checkId: "boss-simul-buff-consistency/v1",
  fromEntity: "boss",
  toEntity: "simul",
  introducedInEntityEpoch: bossValidatorEpoch,
  validate({ entities }) {
    const boss = requireValidationData(entities.get("boss"), "boss")
    const simul = requireValidationData(entities.get("simul"), "simul")
    let checkedReferenceCount = 0
    for (const language of languages) {
      const bossBuffs = collectBossBuffs(boss, language)
      const simulBuffs = collectSimulBuffs(simul, language)
      for (const category of ["layer_buff", "selectable_buff"] as const)
        for (const [id, bossBuff] of bossBuffs[category]) {
          const simulBuff = simulBuffs[category].get(id)
          if (simulBuff === undefined) continue
          checkedReferenceCount += 1
          if (!deepEqualJson(bossBuff.value, simulBuff.value))
            throw new Error(
              `Boss 与 Simul 的 ${language}.${category}.${id} 不一致：${bossBuff.path} 与 ${simulBuff.path}`,
            )
        }
    }
    return { checkedReferenceCount, unresolvedReferenceCount: 0 }
  },
}

function validateBossSummary(value: unknown, entityId: string): void {
  const description = `boss.json 的 Boss ${entityId}`
  if (!isPlainObject(value)) throw new Error(`${description} 必须是普通对象`)
  for (const field of ["zh", "en", "ja", "ko"] as const)
    requireString(value, field, description)
  requireInteger(value, "sort", description)
  requireInteger(value, "zone_type", description)
  validateOptionalStringPair(value, "begin", "end", description)
  validateOptionalStringPair(value, "live_begin", "live_end", description)
}

function validateOptionalStringPair(
  value: Record<string, unknown>,
  first: string,
  second: string,
  description: string,
): void {
  const hasFirst = Object.hasOwn(value, first)
  const hasSecond = Object.hasOwn(value, second)
  if (hasFirst !== hasSecond)
    throw new Error(`${description}.${first}/${second} 必须同时存在或缺失`)
  if (hasFirst) {
    requireString(value, first, description)
    requireString(value, second, description)
  }
}

function validateBossAdjust(value: unknown, description: string): void {
  if (!isPlainObject(value)) throw new Error(`${description} 必须是普通对象`)
  for (const [key, entry] of Object.entries(value)) {
    requirePositiveObjectKey(key, description)
    if (!isPlainObject(entry))
      throw new Error(`${description}.${key} 必须是普通对象`)
    requireNonNegativeInteger(entry, "hp", `${description}.${key}`)
    requireInteger(entry, "atk", `${description}.${key}`)
    requireNonNegativeInteger(entry, "points", `${description}.${key}`)
  }
}

function validateModes(
  value: unknown,
  detailId: string,
  description: string,
): void {
  if (!Array.isArray(value) || value.length === 0)
    throw new Error(`${description} 必须是非空数组`)
  const ids = new Set<string>()
  let containsDetailId = false
  for (let index = 0; index < value.length; index += 1) {
    const mode = value[index]
    const modeDescription = `${description}[${index}]`
    if (!isPlainObject(mode))
      throw new Error(`${modeDescription} 必须是普通对象`)
    const id = requirePositiveMemberId(mode, modeDescription)
    if (ids.has(id)) throw new Error(`${description} 包含重复 mode ID：${id}`)
    ids.add(id)
    if (id === detailId) containsDetailId = true
    requireInteger(mode, "zone_type", modeDescription)
    validateZoneMap(mode.zone, `${modeDescription}.zone`)
  }
  if (!containsDetailId)
    throw new Error(
      `${description} 至少一个 mode ID 必须等于顶层 Boss ID ${detailId}`,
    )
}

function validateZoneMap(value: unknown, description: string): void {
  if (!isPlainObject(value) || Object.keys(value).length === 0)
    throw new Error(`${description} 必须是非空普通对象`)
  for (const [zoneId, zone] of Object.entries(value)) {
    requirePositiveObjectKey(zoneId, description)
    validateZone(zone, `${description}.${zoneId}`)
  }
}

function validateZone(value: unknown, description: string): void {
  if (!isPlainObject(value)) throw new Error(`${description} 必须是普通对象`)
  requireString(value, "name", description)
  for (const field of [
    "stage_num",
    "monster_level",
    "goal_type",
    "s_rank_goal",
    "a_rank_goal",
    "b_rank_goal",
  ] as const)
    requireInteger(value, field, description)
  validateBuffMap(value.layer_buff, `${description}.layer_buff`)
  validateBuffMap(value.selectable_buff, `${description}.selectable_buff`)
  validateRoomMap(value.layer_room, `${description}.layer_room`)
}

function validateBuffMap(value: unknown, description: string): void {
  if (!isPlainObject(value)) throw new Error(`${description} 必须是普通对象`)
  for (const [key, buff] of Object.entries(value)) {
    requirePositiveObjectKey(key, description)
    if (!isPlainObject(buff))
      throw new Error(`${description}.${key} 必须是普通对象`)
    requireString(buff, "title", `${description}.${key}`)
    requireString(buff, "desc", `${description}.${key}`)
  }
}

function validateRoomMap(value: unknown, description: string): void {
  if (!isPlainObject(value)) throw new Error(`${description} 必须是普通对象`)
  for (const [roomId, room] of Object.entries(value)) {
    requirePositiveObjectKey(roomId, description)
    validateEncounter(room, `${description}.${roomId}`)
  }
}

function validateEncounter(value: unknown, description: string): void {
  if (!isPlainObject(value)) throw new Error(`${description} 必须是普通对象`)
  requireString(value, "monster_icon", description)
  requireInteger(value, "waves_num", description)
  if (!isPlainObject(value.monster_weakness))
    throw new Error(`${description}.monster_weakness 必须是普通对象`)
  for (const [key, weakness] of Object.entries(value.monster_weakness)) {
    requirePositiveObjectKey(key, `${description}.monster_weakness`)
    if (typeof weakness !== "string")
      throw new Error(`${description}.monster_weakness.${key} 必须是字符串`)
  }
  if (!isPlainObject(value.monster_list))
    throw new Error(`${description}.monster_list 必须是普通对象`)
  for (const [key, monster] of Object.entries(value.monster_list)) {
    requirePositiveObjectKey(key, `${description}.monster_list`)
    validateEncounterMonster(monster, `${description}.monster_list.${key}`)
  }
}

function validateEncounterMonster(value: unknown, description: string): void {
  if (!isPlainObject(value)) throw new Error(`${description} 必须是普通对象`)
  requirePositiveMemberId(value, description)
  requireString(value, "name", description)
  requireString(value, "image", description)
  if (!isPlainObject(value.element))
    throw new Error(`${description}.element 必须是普通对象`)
  for (const field of elementFields)
    requireInteger(value.element, field, `${description}.element`)
  if (!isPlainObject(value.stats))
    throw new Error(`${description}.stats 必须是普通对象`)
  for (const field of monsterStatFields)
    requireNumber(value.stats, field, `${description}.stats`)
}

function compareCrossLanguageValue(
  zhValue: unknown,
  enValue: unknown,
  description: string,
): void {
  if (Array.isArray(zhValue)) {
    if (!Array.isArray(enValue) || zhValue.length !== enValue.length)
      throw new Error(`${description} 的 zh/en 容器结构不一致`)
    for (let index = 0; index < zhValue.length; index += 1)
      compareCrossLanguageValue(
        zhValue[index],
        enValue[index],
        `${description}[${index}]`,
      )
    return
  }
  if (isPlainObject(zhValue)) {
    if (!isPlainObject(enValue))
      throw new Error(`${description} 的 zh/en 容器结构不一致`)
    const zhKeys = Object.keys(zhValue).toSorted()
    const enKeys = Object.keys(enValue).toSorted()
    if (
      zhKeys.length !== enKeys.length ||
      zhKeys.some((key, index) => key !== enKeys[index])
    )
      throw new Error(`${description} 的 zh/en 对象字段集合不一致`)
    for (const key of zhKeys)
      compareCrossLanguageValue(
        zhValue[key],
        enValue[key],
        `${description}.${key}`,
      )
    return
  }
  if (
    typeof zhValue !== typeof enValue ||
    (zhValue === null) !== (enValue === null)
  )
    throw new Error(`${description} 的 zh/en 标量类型不一致`)
  if (
    (typeof zhValue === "number" || typeof zhValue === "boolean") &&
    !Object.is(zhValue, enValue)
  )
    throw new Error(`${description} 的 zh/en 机器值不一致`)
  if (
    typeof zhValue === "string" &&
    zhValue !== enValue &&
    !isLocalizedStringPath(description)
  )
    throw new Error(`${description} 的 zh/en 机器字符串不一致`)
}

function isLocalizedStringPath(description: string): boolean {
  return (
    /\.(?:name|title|desc)$/u.test(description) ||
    description.includes(".monster_weakness.")
  )
}

function collectBossZones(
  detail: unknown,
  description: string,
): Array<{ path: string; value: Record<string, unknown> }> {
  if (!isPlainObject(detail))
    throw new Error(`${description} 详情必须是普通对象`)
  const zones: Array<{ path: string; value: Record<string, unknown> }> = []
  if (isPlainObject(detail.zone))
    for (const [zoneId, zone] of Object.entries(detail.zone)) {
      if (!isPlainObject(zone))
        throw new Error(`${description}.zone.${zoneId} 无效`)
      zones.push({ path: `zone.${zoneId}`, value: zone })
    }
  if (Array.isArray(detail.modes))
    for (let index = 0; index < detail.modes.length; index += 1) {
      const mode = detail.modes[index]
      if (!isPlainObject(mode) || !isPlainObject(mode.zone))
        throw new Error(`${description}.modes[${index}].zone 无效`)
      for (const [zoneId, zone] of Object.entries(mode.zone)) {
        if (!isPlainObject(zone))
          throw new Error(`${description}.modes[${index}].zone.${zoneId} 无效`)
        zones.push({ path: `modes[${index}].zone.${zoneId}`, value: zone })
      }
    }
  return zones
}

function requireConsistentAdjust(
  data: EntityValidationData,
  language: SupportedLanguage,
  entity: string,
): unknown {
  let first: unknown
  let firstId: string | undefined
  for (const id of data.ids) {
    const detail = data.detailsByLanguage[language].get(id)
    if (!isPlainObject(detail))
      throw new Error(`${entity} ${id} ${language} 详情无效`)
    if (firstId === undefined) {
      first = detail.boss_adjust
      firstId = id
    } else if (!deepEqualJson(first, detail.boss_adjust))
      throw new Error(
        `${entity} ${language} 详情 ${firstId} 与 ${id} 的 boss_adjust 不一致`,
      )
  }
  if (firstId === undefined) throw new Error(`${entity} ${language} 没有详情`)
  return first
}

type BuffSource = { value: unknown; path: string }

type BuffCollections = Record<
  "layer_buff" | "selectable_buff",
  Map<string, BuffSource>
>

function collectBossBuffs(
  data: EntityValidationData,
  language: SupportedLanguage,
): BuffCollections {
  const result: BuffCollections = {
    layer_buff: new Map(),
    selectable_buff: new Map(),
  }
  for (const id of data.ids) {
    const detail = data.detailsByLanguage[language].get(id)
    for (const zone of collectBossZones(detail, `Boss ${id} ${language}`))
      for (const category of ["layer_buff", "selectable_buff"] as const)
        addBuffMap(
          result[category],
          zone.value[category],
          `Boss ${id} ${language}.${zone.path}.${category}`,
        )
  }
  return result
}

function collectSimulBuffs(
  data: EntityValidationData,
  language: SupportedLanguage,
): BuffCollections {
  const result: BuffCollections = {
    layer_buff: new Map(),
    selectable_buff: new Map(),
  }
  for (const id of data.ids) {
    const detail = data.detailsByLanguage[language].get(id)
    if (!isPlainObject(detail) || !isPlainObject(detail.node))
      throw new Error(`Simul ${id} ${language} 详情无效`)
    for (const [nodeId, node] of Object.entries(detail.node)) {
      if (!isPlainObject(node) || !isPlainObject(node.battle)) continue
      for (const [battleId, battle] of Object.entries(node.battle)) {
        if (!isPlainObject(battle)) continue
        if (isPlainObject(battle.layer))
          addBuffMap(
            result.layer_buff,
            battle.layer.layer_buff,
            `Simul ${id} ${language}.node.${nodeId}.battle.${battleId}.layer.layer_buff`,
          )
        addBuffMap(
          result.selectable_buff,
          battle.selectable_buff,
          `Simul ${id} ${language}.node.${nodeId}.battle.${battleId}.selectable_buff`,
        )
      }
    }
  }
  return result
}

function addBuffMap(
  target: Map<string, BuffSource>,
  value: unknown,
  description: string,
): void {
  if (!isPlainObject(value)) throw new Error(`${description} 必须是普通对象`)
  for (const [id, buff] of Object.entries(value)) {
    const path = `${description}.${id}`
    const existing = target.get(id)
    if (existing !== undefined && !deepEqualJson(existing.value, buff))
      throw new Error(`${path} 的内部重复副本与 ${existing.path} 不一致`)
    if (existing === undefined) target.set(id, { value: buff, path })
  }
}

function deepEqualJson(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (Array.isArray(left))
    return (
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => deepEqualJson(value, right[index]))
    )
  if (isPlainObject(left)) {
    if (!isPlainObject(right)) return false
    const leftKeys = Object.keys(left).toSorted()
    const rightKeys = Object.keys(right).toSorted()
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key, index) =>
          key === rightKeys[index] && deepEqualJson(left[key], right[key]),
      )
    )
  }
  return false
}

function requireMemberId(
  value: Record<string, unknown>,
  expectedId: string,
  description: string,
): void {
  const id = requirePositiveMemberId(value, description)
  if (id !== expectedId) throw new Error(`${description} 的 key 与 id 不一致`)
}

function requirePositiveMemberId(
  value: Record<string, unknown>,
  description: string,
): string {
  if (
    typeof value.id === "number" &&
    Number.isSafeInteger(value.id) &&
    value.id > 0
  )
    return String(value.id)
  throw new Error(`${description}.id 必须是正安全整数`)
}

function requirePositiveObjectKey(key: string, description: string): void {
  if (!positiveIdPattern.test(key))
    throw new Error(`${description} 包含非法正整数 key：${key}`)
}

function requireValidationData(
  value: EntityValidationData | undefined,
  entity: string,
): EntityValidationData {
  if (value === undefined) throw new Error(`缺少 ${entity} 验证数据`)
  return value
}

function requireString(
  value: Record<string, unknown>,
  field: string,
  description: string,
): void {
  if (typeof value[field] !== "string")
    throw new Error(`${description}.${field} 必须是字符串`)
}

function requireInteger(
  value: Record<string, unknown>,
  field: string,
  description: string,
): void {
  if (!Number.isSafeInteger(value[field]))
    throw new Error(`${description}.${field} 必须是安全整数`)
}

function requireNonNegativeInteger(
  value: Record<string, unknown>,
  field: string,
  description: string,
): void {
  requireInteger(value, field, description)
  if (Number(value[field]) < 0)
    throw new Error(`${description}.${field} 必须是非负安全整数`)
}

function requireNumber(
  value: Record<string, unknown>,
  field: string,
  description: string,
): void {
  if (typeof value[field] !== "number" || !Number.isFinite(value[field]))
    throw new Error(`${description}.${field} 必须是有限数值`)
}

function compareDecimalIds(left: string, right: string): number {
  const leftNumber = BigInt(left)
  const rightNumber = BigInt(right)
  return leftNumber < rightNumber ? -1 : leftNumber > rightNumber ? 1 : 0
}
