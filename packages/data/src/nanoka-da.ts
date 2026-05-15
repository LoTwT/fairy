export type NanokaDaAttribute =
  | "physical"
  | "fire"
  | "ice"
  | "electric"
  | "ether"
  | "wind"

export interface NanokaDaIndexEntry {
  sort: number
  begin?: string
  end?: string
  live_begin?: string
  live_end?: string
  zh: string
  en?: string
  ja?: string
  ko?: string
}

export type NanokaDaIndex = Record<string, NanokaDaIndexEntry>

export interface NanokaDaTextRecord {
  title?: string
  desc: string
}

export interface NanokaDaMonsterRecord {
  id: number
  name: string
  element: Partial<Record<NanokaDaAttribute, number>>
  stats: {
    hp: number
    attack: number
    defence: number
    stun: number
    attribute_infliction: number
  }
}

export interface NanokaDaRoomRecord {
  monster_list: Record<string, NanokaDaMonsterRecord>
  monster_weakness: Record<string, string>
  waves_num: number
}

export interface NanokaDaZoneRecord {
  name: string
  stage_num: number
  monster_level: number
  layer_buff: Record<string, NanokaDaTextRecord>
  layer_room: Record<string, NanokaDaRoomRecord>
  selectable_buff: Record<string, NanokaDaTextRecord>
  goal_type: number
  s_rank_goal: number
  a_rank_goal: number
  b_rank_goal: number
}

export interface NanokaDaBossAdjustRecord {
  hp: number
  atk: number
  points: number
}

export interface NanokaDaDetail {
  id: number
  name: string
  begin_time?: string
  end_time?: string
  zone: Record<string, NanokaDaZoneRecord>
  boss_adjust: Record<string, NanokaDaBossAdjustRecord>
}

export interface DeadlyAssaultBuff {
  id: string
  title: string
  description: string
}

export interface DeadlyAssaultMonster {
  slotId: string
  monsterId: number
  name: string
  elementProfile: Partial<Record<NanokaDaAttribute, number>>
  weaknessAttributes: NanokaDaAttribute[]
  stats: {
    hp: number
    attack: number
    defense: number
    daze: number
    anomalyBuildupResistance: number
  }
}

export interface DeadlyAssaultBossAdjustment {
  id: string
  hpAdjustmentRaw: number
  attackAdjustmentRaw: number
  operationScorePoints: number
}

export interface DeadlyAssaultZone {
  zoneId: string
  stageNumber: number
  name: string
  monsterLevel: number
  goalType: number
  rankGoals: {
    s: number
    a: number
    b: number
  }
  layerBuffs: DeadlyAssaultBuff[]
  selectableBuffs: DeadlyAssaultBuff[]
  rooms: Array<{
    roomId: string
    waves: number
    monsters: DeadlyAssaultMonster[]
  }>
}

export interface DeadlyAssaultPeriod {
  id: string
  title: string
  sourceVersion: string
  beginAt: string
  endAt: string
  zones: DeadlyAssaultZone[]
  bossAdjustments: DeadlyAssaultBossAdjustment[]
  runtimeCutoverReady: false
}

export interface HistoricalDeadlyAssaultPeriod {
  id: string
  title: string
  sourceVersion: string
  beginAt?: string
  endAt?: string
  scheduleStatus: "source-known" | "missing-in-historical-source"
  zones: DeadlyAssaultZone[]
  bossAdjustments: DeadlyAssaultBossAdjustment[]
  runtimeCutoverReady: false
}

export interface DeriveNanokaDeadlyAssaultOptions {
  sourceVersion: string
  configuredLiveSnapshotDate: string
  allowConfiguredLiveScheduledPeriods?: boolean
}

const weaknessCodeMap: Record<string, NanokaDaAttribute> = {
  "200": "physical",
  "201": "fire",
  "202": "ice",
  "203": "electric",
  "204": "wind",
  "205": "ether",
}

export function deriveNanokaDeadlyAssaultPeriod(
  index: NanokaDaIndex,
  detail: NanokaDaDetail,
  options: DeriveNanokaDeadlyAssaultOptions,
): DeadlyAssaultPeriod {
  const periodId = String(detail.id)
  const indexEntry = index[periodId]
  if (indexEntry === undefined)
    throw new Error(`Missing Deadly Assault period ${periodId} from nanoka boss index`)

  const beginAt = normalizeNanokaChinaDate(
    detail.begin_time ?? indexEntry.begin ?? indexEntry.live_begin,
    "begin_time",
  )
  const endAt = normalizeNanokaChinaDate(
    detail.end_time ?? indexEntry.end ?? indexEntry.live_end,
    "end_time",
  )
  const configuredLiveSnapshotDate = parseDate(options.configuredLiveSnapshotDate, "configuredLiveSnapshotDate")
  if (options.allowConfiguredLiveScheduledPeriods !== true && Date.parse(beginAt) > configuredLiveSnapshotDate.getTime())
    throw new Error(`Deadly Assault period ${periodId} begins after configured live snapshot date`)
  if (normalizeNanokaChinaDate(indexEntry.begin ?? indexEntry.live_begin, "index.begin") !== beginAt)
    throw new Error(`Deadly Assault period ${periodId} begin_time does not match boss index`)
  if (normalizeNanokaChinaDate(indexEntry.end ?? indexEntry.live_end, "index.end") !== endAt)
    throw new Error(`Deadly Assault period ${periodId} end_time does not match boss index`)

  return {
    id: periodId,
    title: requiredString(detail.name, "name"),
    sourceVersion: options.sourceVersion,
    beginAt,
    endAt,
    zones: sortedEntries(detail.zone).map(([zoneId, zone]) => normalizeZone(zoneId, zone)),
    bossAdjustments: sortedEntries(detail.boss_adjust).map(([id, adjustment]) => normalizeBossAdjustment(id, adjustment)),
    runtimeCutoverReady: false,
  }
}

export function deriveNanokaHistoricalDeadlyAssaultPeriod(
  index: NanokaDaIndex,
  detail: NanokaDaDetail,
  options: Pick<DeriveNanokaDeadlyAssaultOptions, "sourceVersion">,
): HistoricalDeadlyAssaultPeriod {
  const periodId = String(detail.id)
  const indexEntry = index[periodId]
  if (indexEntry === undefined)
    throw new Error(`Missing Deadly Assault period ${periodId} from nanoka boss index`)

  const beginSource = detail.begin_time ?? indexEntry.begin ?? indexEntry.live_begin
  const endSource = detail.end_time ?? indexEntry.end ?? indexEntry.live_end
  const beginAt = beginSource === undefined ? undefined : normalizeNanokaChinaDate(beginSource, "begin_time")
  const endAt = endSource === undefined ? undefined : normalizeNanokaChinaDate(endSource, "end_time")
  const indexBegin = indexEntry.begin ?? indexEntry.live_begin
  const indexEnd = indexEntry.end ?? indexEntry.live_end
  if (indexBegin !== undefined && beginAt !== undefined && normalizeNanokaChinaDate(indexBegin, "index.begin") !== beginAt)
    throw new Error(`Deadly Assault period ${periodId} begin_time does not match boss index`)
  if (indexEnd !== undefined && endAt !== undefined && normalizeNanokaChinaDate(indexEnd, "index.end") !== endAt)
    throw new Error(`Deadly Assault period ${periodId} end_time does not match boss index`)

  return {
    id: periodId,
    title: requiredString(detail.name, "name"),
    sourceVersion: options.sourceVersion,
    ...(beginAt === undefined ? {} : { beginAt }),
    ...(endAt === undefined ? {} : { endAt }),
    scheduleStatus: beginAt === undefined || endAt === undefined ? "missing-in-historical-source" : "source-known",
    zones: sortedEntries(detail.zone).map(([zoneId, zone]) => normalizeZone(zoneId, zone)),
    bossAdjustments: sortedEntries(detail.boss_adjust).map(([id, adjustment]) => normalizeBossAdjustment(id, adjustment)),
    runtimeCutoverReady: false,
  }
}

function normalizeZone(zoneId: string, zone: NanokaDaZoneRecord): DeadlyAssaultZone {
  return {
    zoneId,
    stageNumber: requiredFinite(zone.stage_num, `zone.${zoneId}.stage_num`),
    name: requiredString(zone.name, `zone.${zoneId}.name`),
    monsterLevel: requiredFinite(zone.monster_level, `zone.${zoneId}.monster_level`),
    goalType: requiredFinite(zone.goal_type, `zone.${zoneId}.goal_type`),
    rankGoals: {
      s: requiredFinite(zone.s_rank_goal, `zone.${zoneId}.s_rank_goal`),
      a: requiredFinite(zone.a_rank_goal, `zone.${zoneId}.a_rank_goal`),
      b: requiredFinite(zone.b_rank_goal, `zone.${zoneId}.b_rank_goal`),
    },
    layerBuffs: sortedEntries(zone.layer_buff).map(([id, buff]) => normalizeBuff(id, buff)),
    selectableBuffs: sortedEntries(zone.selectable_buff).map(([id, buff]) => normalizeBuff(id, buff)),
    rooms: sortedEntries(zone.layer_room).map(([roomId, room]) => ({
      roomId,
      waves: requiredFinite(room.waves_num, `zone.${zoneId}.layer_room.${roomId}.waves_num`),
      monsters: sortedEntries(room.monster_list).map(([slotId, monster]) =>
        normalizeMonster(slotId, monster, room.monster_weakness),
      ),
    })),
  }
}

function normalizeBuff(id: string, buff: NanokaDaTextRecord): DeadlyAssaultBuff {
  return {
    id,
    title: buff.title ?? "",
    description: requiredString(buff.desc, `buff.${id}.desc`),
  }
}

function normalizeMonster(
  slotId: string,
  monster: NanokaDaMonsterRecord,
  weakness: Record<string, string>,
): DeadlyAssaultMonster {
  return {
    slotId,
    monsterId: requiredFinite(monster.id, `monster.${slotId}.id`),
    name: requiredString(monster.name, `monster.${slotId}.name`),
    elementProfile: monster.element,
    weaknessAttributes: Object.keys(weakness)
      .map(code => weaknessCodeMap[code])
      .filter((attribute): attribute is NanokaDaAttribute => attribute !== undefined),
    stats: {
      hp: requiredFinite(monster.stats.hp, `monster.${slotId}.stats.hp`),
      attack: requiredFinite(monster.stats.attack, `monster.${slotId}.stats.attack`),
      defense: requiredFinite(monster.stats.defence, `monster.${slotId}.stats.defence`),
      daze: requiredFinite(monster.stats.stun, `monster.${slotId}.stats.stun`),
      anomalyBuildupResistance: requiredFinite(monster.stats.attribute_infliction, `monster.${slotId}.stats.attribute_infliction`),
    },
  }
}

function normalizeBossAdjustment(
  id: string,
  adjustment: NanokaDaBossAdjustRecord,
): DeadlyAssaultBossAdjustment {
  return {
    id,
    hpAdjustmentRaw: requiredFinite(adjustment.hp, `boss_adjust.${id}.hp`),
    attackAdjustmentRaw: requiredFinite(adjustment.atk, `boss_adjust.${id}.atk`),
    operationScorePoints: requiredFinite(adjustment.points, `boss_adjust.${id}.points`),
  }
}

function normalizeNanokaChinaDate(value: string | undefined, path: string): string {
  if (value === undefined)
    throw new Error(`Missing nanoka date ${path}`)
  const match = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/.exec(value)
  if (match === null)
    throw new Error(`Invalid nanoka date ${path}`)
  return `${match[1]}T${match[2]}+08:00`
}

function parseDate(value: string, path: string): Date {
  const date = new Date(value)
  if (Number.isNaN(date.getTime()))
    throw new Error(`Invalid date ${path}`)
  return date
}

function requiredString(value: unknown, path: string): string {
  if (typeof value !== "string")
    throw new Error(`Missing nanoka Deadly Assault text field ${path}`)
  return value
}

function requiredFinite(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error(`Missing numeric nanoka Deadly Assault field ${path}`)
  return value
}

function sortedEntries<T>(record: Record<string, T>): Array<[string, T]> {
  return Object.entries(record).sort(([left], [right]) => left.localeCompare(right, "en", { numeric: true }))
}
