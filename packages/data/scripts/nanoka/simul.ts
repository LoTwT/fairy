import type { CrossEntityValidator, EntityValidationData } from "./entities.ts"
import type { SupportedLanguage } from "./policy.ts"
import { isPlainObject } from "./policy.ts"

const canonicalIdPattern = /^(0|[1-9]\d*)$/u
const positiveIdPattern = /^[1-9]\d*$/u
const rankingBuffFields = [
  "a_rank_score_layer_buff",
  "b_rank_score_layer_buff",
  "s_rank_score_layer_buff",
] as const
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

export function isValidSimulId(value: string): boolean {
  return canonicalIdPattern.test(value)
}

export function createSimulDetailResource(
  entityId: string,
  language: SupportedLanguage,
): {
  entityId: string
  language: SupportedLanguage
  assetId: string
  localPath: string
} {
  if (!isValidSimulId(entityId)) throw new Error(`Simul ID 无效：${entityId}`)
  return {
    entityId,
    language,
    assetId: `entity-detail:simul:${language}:${entityId}`,
    localPath: `${language}/simul/${entityId}.json`,
  }
}

export function discoverSimulIds(value: unknown): string[] {
  if (!isPlainObject(value)) throw new Error("simul.json 顶层必须是普通对象")
  const ids = Object.keys(value)
  if (ids.length === 0) throw new Error("simul.json 不能为空")
  for (const id of ids) {
    if (!isValidSimulId(id))
      throw new Error(`simul.json 包含非法 Simul ID：${id}`)
    validateSimulSummary(value[id], id)
  }
  return ids.toSorted(compareDecimalIds)
}

export function validateSimulDetail(
  value: unknown,
  expectedEntityId: string,
  indexValue?: unknown,
): void {
  const description = `Simul ${expectedEntityId}`
  if (!isPlainObject(value))
    throw new Error(`${description} 详情必须是普通对象`)
  requireMemberId(value, expectedEntityId, `${description} 详情`)
  requireString(value, "end_time", `${description} 详情`)
  validateBossAdjust(value.boss_adjust, `${description}.boss_adjust`)
  const recordIds = validateRecords(value.record, `${description}.record`)
  if (!isPlainObject(value.node))
    throw new Error(`${description}.node 必须是普通对象`)

  const storyEventGroupIds = new Set<string>()
  const storyEventIds = new Set<string>()
  const battleIds = new Set<string>()
  const nodeIds = Object.keys(value.node)
  for (const nodeId of nodeIds) {
    requirePositiveObjectKey(nodeId, `${description}.node`)
    const node = value.node[nodeId]
    if (!isPlainObject(node))
      throw new Error(`${description}.node.${nodeId} 必须是普通对象`)
    if (isPlainObject(node.story_event))
      for (const groupId of Object.keys(node.story_event)) {
        requirePositiveObjectKey(
          groupId,
          `${description}.node.${nodeId}.story_event`,
        )
        if (storyEventGroupIds.has(groupId))
          throw new Error(
            `${description} 包含重复 story-event group ID：${groupId}`,
          )
        storyEventGroupIds.add(groupId)
        const group = node.story_event[groupId]
        if (!isPlainObject(group))
          throw new Error(
            `${description}.node.${nodeId}.story_event.${groupId} 必须是普通对象`,
          )
        for (const eventId of Object.keys(group)) {
          requirePositiveObjectKey(
            eventId,
            `${description}.node.${nodeId}.story_event.${groupId}`,
          )
          if (storyEventIds.has(eventId))
            throw new Error(
              `${description} 包含重复 story-event ID：${eventId}`,
            )
          storyEventIds.add(eventId)
        }
      }
    if (isPlainObject(node.battle))
      for (const battleId of Object.keys(node.battle)) {
        requirePositiveObjectKey(
          battleId,
          `${description}.node.${nodeId}.battle`,
        )
        if (battleIds.has(battleId))
          throw new Error(`${description} 包含重复 battle ID：${battleId}`)
        battleIds.add(battleId)
      }
  }

  for (const nodeId of nodeIds)
    validateNode(
      value.node[nodeId],
      nodeId,
      description,
      storyEventGroupIds,
      storyEventIds,
      recordIds,
      battleIds,
    )

  if (indexValue !== undefined) {
    if (!isPlainObject(indexValue))
      throw new Error("simul.json 顶层必须是普通对象")
    const summaryValue = indexValue[expectedEntityId]
    validateSimulSummary(summaryValue, expectedEntityId)
    if ((summaryValue as Record<string, unknown>).end !== value.end_time)
      throw new Error(`${description} 的摘要 end 与详情 end_time 不一致`)
  }
}

export function validateSimulEntityDetails(
  detailsByLanguage: Record<SupportedLanguage, Map<string, unknown>>,
): void {
  if (detailsByLanguage.zh.size !== detailsByLanguage.en.size)
    throw new Error("Simul zh/en 详情集合不一致")
  for (const [entityId, zhValue] of detailsByLanguage.zh) {
    if (!detailsByLanguage.en.has(entityId))
      throw new Error(`Simul ${entityId} 缺少 en 详情`)
    compareCrossLanguageValue(
      zhValue,
      detailsByLanguage.en.get(entityId),
      `Simul ${entityId}`,
    )
  }
}

export const simulMonsterReferenceValidator: CrossEntityValidator = {
  checkId: "simul-monster-reference/v1",
  fromEntity: "simul",
  toEntity: "monster",
  introducedInEntityEpoch: [
    "character",
    "equipment",
    "weapon",
    "bangboo",
    "monster",
    "shiyu",
    "simul",
  ],
  validate({ entities }) {
    const simul = requireValidationData(entities.get("simul"), "simul")
    const monster = requireValidationData(entities.get("monster"), "monster")
    const monsterIds = new Set(monster.ids)
    let checkedReferenceCount = 0

    for (const language of ["zh", "en"] as const)
      for (const simulId of simul.ids) {
        const detail = simul.detailsByLanguage[language].get(simulId)
        if (!isPlainObject(detail) || !isPlainObject(detail.node))
          throw new Error(`simul ${simulId} ${language} 详情缺少 node`)
        for (const [nodeId, node] of Object.entries(detail.node)) {
          if (!isPlainObject(node) || !isPlainObject(node.battle)) continue
          for (const [battleId, battle] of Object.entries(node.battle)) {
            if (!isPlainObject(battle) || !isPlainObject(battle.layer_room))
              continue
            for (const [roomId, room] of Object.entries(battle.layer_room)) {
              if (!isPlainObject(room) || !isPlainObject(room.monster_list))
                continue
              for (const [monsterListEntryKey, entry] of Object.entries(
                room.monster_list,
              )) {
                checkedReferenceCount += 1
                const path = `node.${nodeId}.battle.${battleId}.layer_room.${roomId}.monster_list.${monsterListEntryKey}.id`
                const monsterId =
                  isPlainObject(entry) && Number.isSafeInteger(entry.id)
                    ? String(entry.id)
                    : String(isPlainObject(entry) ? entry.id : undefined)
                if (!monsterIds.has(monsterId))
                  throw new Error(
                    `simul ${simulId} 的 ${language}.${path}（monsterListEntryKey=${monsterListEntryKey}）引用了未解析 Monster ID ${monsterId}`,
                  )
              }
            }
          }
        }
      }
    return { checkedReferenceCount, unresolvedReferenceCount: 0 }
  },
}

function validateSimulSummary(value: unknown, entityId: string): void {
  if (!isPlainObject(value))
    throw new Error(`simul.json 的 Simul ${entityId} 必须是普通对象`)
  requireString(value, "end", `simul.json 的 Simul ${entityId}`)
}

function validateBossAdjust(value: unknown, description: string): void {
  if (!isPlainObject(value)) throw new Error(`${description} 必须是普通对象`)
  for (const [key, entry] of Object.entries(value)) {
    requirePositiveObjectKey(key, description)
    if (!isPlainObject(entry))
      throw new Error(`${description}.${key} 必须是普通对象`)
    for (const field of ["hp", "atk", "points"] as const)
      requireInteger(entry, field, `${description}.${key}`)
  }
}

function validateRecords(value: unknown, description: string): Set<string> {
  if (!isPlainObject(value)) throw new Error(`${description} 必须是普通对象`)
  const ids = new Set<string>()
  for (const [outerKey, record] of Object.entries(value)) {
    if (!isPlainObject(record))
      throw new Error(`${description}.${outerKey} 必须是普通对象`)
    const id = requirePositiveMemberId(record, `${description}.${outerKey}`)
    if (ids.has(id))
      throw new Error(`${description} 包含重复 record 成员 ID：${id}`)
    ids.add(id)
    for (const field of ["name", "desc", "text", "icon"] as const)
      requireString(record, field, `${description}.${outerKey}`)
  }
  return ids
}

function validateNode(
  value: unknown,
  nodeId: string,
  detailDescription: string,
  storyEventGroupIds: ReadonlySet<string>,
  storyEventIds: ReadonlySet<string>,
  recordIds: ReadonlySet<string>,
  battleIds: ReadonlySet<string>,
): void {
  const description = `${detailDescription}.node.${nodeId}`
  if (!isPlainObject(value)) throw new Error(`${description} 必须是普通对象`)
  requireMemberId(value, nodeId, description)
  for (const field of ["name", "icon"] as const)
    requireString(value, field, description)
  requireInteger(value, "type", description)
  requireOpaqueNonNegativeId(value.prev_node, `${description}.prev_node`)
  if (!isPlainObject(value.story_event))
    throw new Error(`${description}.story_event 必须是普通对象`)
  if (!isPlainObject(value.battle))
    throw new Error(`${description}.battle 必须是普通对象`)

  for (const [groupId, group] of Object.entries(value.story_event))
    validateStoryEventGroup(
      group,
      `${description}.story_event.${groupId}`,
      storyEventGroupIds,
      storyEventIds,
      recordIds,
      battleIds,
    )
  for (const [battleId, battle] of Object.entries(value.battle))
    validateBattle(battle, battleId, `${description}.battle.${battleId}`)
}

function validateStoryEventGroup(
  value: unknown,
  description: string,
  storyEventGroupIds: ReadonlySet<string>,
  storyEventIds: ReadonlySet<string>,
  recordIds: ReadonlySet<string>,
  battleIds: ReadonlySet<string>,
): void {
  if (!isPlainObject(value)) throw new Error(`${description} 必须是普通对象`)
  for (const [eventKey, event] of Object.entries(value)) {
    requirePositiveObjectKey(eventKey, description)
    const eventDescription = `${description}.${eventKey}`
    if (!isPlainObject(event))
      throw new Error(`${eventDescription} 必须是普通对象`)
    requireMemberId(event, eventKey, eventDescription)
    for (const field of ["name", "desc", "icon"] as const)
      requireString(event, field, eventDescription)
    validateReferenceArray(
      event.next_page,
      `${eventDescription}.next_page`,
      storyEventIds,
      "story-event ID",
    )
    validateChoices(event.choice, `${eventDescription}.choice`)
    validateReferenceArray(
      event.next_node_unlock,
      `${eventDescription}.next_node_unlock`,
      storyEventGroupIds,
      "story-event group key",
    )
    validateReferenceArray(
      event.next_record_unlock,
      `${eventDescription}.next_record_unlock`,
      new Set([...recordIds, ...battleIds]),
      "record 成员 ID 与 battle ID 两个目标命名空间",
    )
  }
}

function validateChoices(value: unknown, description: string): void {
  if (!Array.isArray(value)) throw new Error(`${description} 必须是数组`)
  for (let index = 0; index < value.length; index += 1) {
    const choice = value[index]
    if (!isPlainObject(choice))
      throw new Error(`${description}[${index}] 必须是普通对象`)
    requirePositiveMemberId(choice, `${description}[${index}]`)
    for (const field of ["name", "desc"] as const)
      requireString(choice, field, `${description}[${index}]`)
  }
}

function validateReferenceArray(
  value: unknown,
  description: string,
  targets: ReadonlySet<string>,
  targetDescription: string,
): void {
  if (!Array.isArray(value)) throw new Error(`${description} 必须是数组`)
  for (let index = 0; index < value.length; index += 1) {
    const id = requirePositiveIdValue(value[index], `${description}[${index}]`)
    if (!targets.has(id))
      throw new Error(
        `${description}[${index}] 引用未在${targetDescription}中闭合：${id}`,
      )
  }
}

function validateBattle(
  value: unknown,
  battleId: string,
  description: string,
): void {
  if (!isPlainObject(value)) throw new Error(`${description} 必须是普通对象`)
  requireMemberId(value, battleId, description)
  for (const field of ["name", "tag"] as const)
    requireString(value, field, description)
  requireInteger(value, "tag_type", description)
  for (const field of rankingBuffFields)
    validateBuffMap(value[field], `${description}.${field}`)
  validateLayer(value.layer, `${description}.layer`)
  validateBuffMap(value.selectable_buff, `${description}.selectable_buff`)
  validateRoomMap(value.layer_room, `${description}.layer_room`, false)
}

function validateBuffMap(value: unknown, description: string): void {
  if (!isPlainObject(value)) throw new Error(`${description} 必须是普通对象`)
  for (const [key, buff] of Object.entries(value)) {
    requirePositiveObjectKey(key, description)
    if (!isPlainObject(buff))
      throw new Error(`${description}.${key} 必须是普通对象`)
    for (const field of ["title", "desc"] as const)
      requireString(buff, field, `${description}.${key}`)
  }
}

function validateLayer(value: unknown, description: string): void {
  if (!isPlainObject(value)) throw new Error(`${description} 必须是普通对象`)
  for (const field of [
    "id",
    "monster_level",
    "goal_type",
    "s_rank_goal",
    "a_rank_goal",
    "b_rank_goal",
  ] as const)
    requireInteger(value, field, description)
  validateBuffMap(value.layer_buff, `${description}.layer_buff`)
  validateRoomMap(value.layer_room, `${description}.layer_room`, true)
}

function validateRoomMap(
  value: unknown,
  description: string,
  requireEmpty: boolean,
): void {
  if (!isPlainObject(value)) throw new Error(`${description} 必须是普通对象`)
  if (requireEmpty && Object.keys(value).length !== 0)
    throw new Error(`${description} 当前必须为空对象，以检测未来结构漂移`)
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
  for (const [entryKey, monster] of Object.entries(value.monster_list)) {
    requirePositiveObjectKey(entryKey, `${description}.monster_list`)
    validateEncounterMonster(monster, `${description}.monster_list.${entryKey}`)
  }
}

function validateEncounterMonster(value: unknown, description: string): void {
  if (!isPlainObject(value)) throw new Error(`${description} 必须是普通对象`)
  requirePositiveMemberId(value, description)
  for (const field of ["name", "image"] as const)
    requireString(value, field, description)
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
    /\.(?:name|desc|text|title|tag|icon|image|monster_icon)$/u.test(
      description,
    ) || description.includes(".monster_weakness.")
  )
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
  return requirePositiveIdValue(value.id, `${description}.id`)
}

function requirePositiveIdValue(value: unknown, description: string): string {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0)
    return String(value)
  if (typeof value === "string" && positiveIdPattern.test(value)) return value
  throw new Error(`${description} 必须是正整数或规范十进制 ID`)
}

function requireOpaqueNonNegativeId(value: unknown, description: string): void {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0)
    return
  if (typeof value === "string" && canonicalIdPattern.test(value)) return
  throw new Error(`${description} 必须是 opaque 非负整数或规范十进制 ID`)
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
    throw new Error(`${description}.${field} 必须是整数`)
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
