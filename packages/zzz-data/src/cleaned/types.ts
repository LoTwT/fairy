import type {
  DAEnemyItem,
  ElementMult,
  EnemyBase,
  GameModeBuffEffect,
  GameModeBuffIconUrl,
  GameModeBuffKey,
  GameModeBuffName,
  GameModeEnemyDaze,
  GameModeEnemyDefense,
  GameModeEnemyId,
  GameModeEnemyName,
  GameModeStunMultiplier,
  GameModeStunTime,
  SDEnemyItem,
  TSBossEnemyItem,
  TSRegularEnemyItem,
} from "../game-modes.js"
import type { BaseResistanceAttribute } from "../terms.js"

export interface ElementMultiplierMap {
  ice: number
  fire: number
  electric: number
  ether: number
  physical: number
}

export interface EncounterFilter {
  node?: number
  side?: number
}

export type ElementMultiplierTuple =
  | ElementMult
  | readonly [number, number, number, number, number]

export interface ElementMultiplierCarrier {
  elementMult: ElementMultiplierTuple
}

export interface EnemyDamageContextSource {
  id: GameModeEnemyId
  name: GameModeEnemyName
  elementMult: ElementMultiplierTuple
  stunMult: GameModeStunMultiplier
  stunTime: GameModeStunTime
  def: GameModeEnemyDefense
  daze: GameModeEnemyDaze
}

export interface EnemyDamageContext {
  enemyId: string
  enemyName: string
  baseDefense: number
  dazeGauge: number
  dazeMultiplier: number
  dazeDuration: number
  resistanceBucket: BaseResistanceAttribute
  elementMultiplier: number
  multipliers: ElementMultiplierMap
}

export interface FlattenedEnemyView<TEnemy extends EnemyBase = EnemyBase> {
  node?: number
  side?: number
  wave?: number
  enemyIndex: number
  count: number
  enemy: TEnemy
  sideElementMultRaw?: ElementMultiplierTuple
  sideElementMult?: ElementMultiplierMap
}

export interface EncounterSelectionResult<
  TEncounter extends FlattenedEnemyView = FlattenedEnemyView,
> {
  selected?: TEncounter
  matches: EncounterMatchList<TEncounter>
  candidates: EncounterCandidateList
}

export type EncounterMatchList<
  TEncounter extends FlattenedEnemyView = FlattenedEnemyView,
> = TEncounter[]

export type EncounterCandidate = string

export type EncounterCandidateList = EncounterCandidate[]

export type EncounterWeakness = string

export type EncounterWeaknessList = EncounterWeakness[]

export type EncounterResistance = string

export type EncounterResistanceList = EncounterResistance[]

export interface EncounterDamageContext extends EnemyDamageContext {
  node?: number
  side?: number
  wave?: number
  enemyIndex: number
  weaknesses: EncounterWeaknessList
  resistances: EncounterResistanceList
  mechanics?: string
  sideMultipliers?: ElementMultiplierMap
  sideElementMultiplier?: number
}

export type DABuffViewName = string

export type DABuffViewNameList = DABuffViewName[]

export interface DABuffView {
  key: string
  names: DABuffViewNameList
  effect: string
  iconUrl?: string
}

export interface DAEnemyView {
  node?: number
  side?: number
  wave?: number
  enemyIndex: number
  count: number
  enemy: DAEnemyItem
  sideElementMultRaw?: ElementMultiplierTuple
  sideElementMult?: ElementMultiplierMap
}

export interface SDSideView {
  side: number
  nodeLevel: number
  sideElementMultRaw: ElementMultiplierTuple
  sideElementMult: ElementMultiplierMap
  sideHPMult: number
  hp60k: number
  altHp: number
  enemies: SDSideEnemyViewList
}
export interface SDSideEnemyView {
  node?: number
  side?: number
  wave?: number
  enemyIndex: number
  count: number
  enemy: SDEnemyItem
  sideElementMultRaw?: ElementMultiplierTuple
  sideElementMult?: ElementMultiplierMap
}
export type SDSideEnemyViewList = SDSideEnemyView[]

export type SDNodeBuffName = string
export type SDNodeBuffNameList = SDNodeBuffName[]

export type SDNodeBuffDescription = string
export type SDNodeBuffDescriptionList = SDNodeBuffDescription[]

export type SDSideViewList = SDSideView[]

export interface SDNodeView {
  node: number
  buffNames: SDNodeBuffNameList
  buffDescriptions: SDNodeBuffDescriptionList
  sides: SDSideViewList
}

export type TSSideRole = "boss" | "regular"

export interface TSFlattenedEnemyView<
  TEnemy extends TSBossEnemyItem | TSRegularEnemyItem =
    | TSBossEnemyItem
    | TSRegularEnemyItem,
> extends FlattenedEnemyView<TEnemy> {
  sideRole: TSSideRole
}

export interface TSBossSideView {
  side: number
  sideRole: "boss"
  nodeLevel: number
  hp60k: number
  altHp: number
  enemies: TSBossSideEnemyViewList
}

export interface TSRegularSideView {
  side: number
  sideRole: "regular"
  nodeLevel: number
  sideElementMultRaw?: ElementMultiplierTuple
  sideElementMult?: ElementMultiplierMap
  sideHPMult: number
  hp60k: number
  altHp: number
  enemies: TSRegularSideEnemyViewList
}

export type TSSideView = TSBossSideView | TSRegularSideView
export interface TSBossSideEnemyView {
  node?: number
  side?: number
  wave?: number
  enemyIndex: number
  count: number
  enemy: TSBossEnemyItem
  sideElementMultRaw?: ElementMultiplierTuple
  sideElementMult?: ElementMultiplierMap
  sideRole: "boss"
}
export type TSBossSideEnemyViewList = TSBossSideEnemyView[]
export interface TSRegularSideEnemyView {
  node?: number
  side?: number
  wave?: number
  enemyIndex: number
  count: number
  enemy: TSRegularEnemyItem
  sideElementMultRaw?: ElementMultiplierTuple
  sideElementMult?: ElementMultiplierMap
  sideRole: "regular"
}
export type TSRegularSideEnemyViewList = TSRegularSideEnemyView[]
export type TSNodeBuffName = string
export type TSNodeBuffNameList = TSNodeBuffName[]
export type TSSideViewList = TSSideView[]

export interface TSNodeView {
  node: number
  buffNames: TSNodeBuffNameList
  sides: TSSideViewList
}

export type VersionPeriodText = string

export type VersionPeriodLabel = string

export interface VersionPeriodInfo {
  raw: VersionPeriodText
  startLabel?: VersionPeriodLabel
  endLabel?: VersionPeriodLabel
  isRange: boolean
  isOngoing: boolean
  isPlaceholder: boolean
}

export type ElementMultiplierSource =
  | ElementMultiplierCarrier
  | ElementMultiplierTuple

export interface DABuffSource {
  key: GameModeBuffKey
  name?: GameModeBuffName
  iconUrl?: GameModeBuffIconUrl
  effect: GameModeBuffEffect
}
