import type {
  DAEnemyItem,
  EnemyBase,
  GameModeAltHP,
  GameModeAttributeText,
  GameModeBuffEffect,
  GameModeBuffIconUrl,
  GameModeBuffKey,
  GameModeBuffName,
  GameModeElementMultiplier,
  GameModeElementMultiplierTuple,
  GameModeEnemyCount,
  GameModeEnemyDaze,
  GameModeEnemyDefense,
  GameModeEnemyHPMult,
  GameModeEnemyId,
  GameModeEnemyName,
  GameModeHP60k,
  GameModeMechanicsText,
  GameModeNodeLevel,
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
  node?: EncounterNodeIndex
  side?: EncounterSideIndex
}

export type EncounterNodeIndex = number

export type EncounterSideIndex = number

export type EncounterWaveIndex = number

export type EncounterEnemyIndex = number

export type EncounterEnemyCount = GameModeEnemyCount

export type EncounterNodeLevel = GameModeNodeLevel

export type EncounterSideHPMult = GameModeEnemyHPMult

export type EncounterHP60k = GameModeHP60k

export type EncounterAltHP = GameModeAltHP

export type EncounterElementMultiplier = GameModeElementMultiplier

export type ElementMultiplierTuple = GameModeElementMultiplierTuple

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
  enemyId: GameModeEnemyId
  enemyName: GameModeEnemyName
  baseDefense: GameModeEnemyDefense
  dazeGauge: GameModeEnemyDaze
  dazeMultiplier: GameModeStunMultiplier
  dazeDuration: GameModeStunTime
  resistanceBucket: BaseResistanceAttribute
  elementMultiplier: EncounterElementMultiplier
  multipliers: ElementMultiplierMap
}

export interface FlattenedEnemyView<TEnemy extends EnemyBase = EnemyBase> {
  node?: EncounterNodeIndex
  side?: EncounterSideIndex
  wave?: EncounterWaveIndex
  enemyIndex: EncounterEnemyIndex
  count: EncounterEnemyCount
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

export type EncounterCandidate = GameModeEnemyName

export type EncounterCandidateList = EncounterCandidate[]

export type EncounterWeakness = GameModeAttributeText

export type EncounterWeaknessList = EncounterWeakness[]

export type EncounterResistance = GameModeAttributeText

export type EncounterResistanceList = EncounterResistance[]

export interface EncounterDamageContext extends EnemyDamageContext {
  node?: EncounterNodeIndex
  side?: EncounterSideIndex
  wave?: EncounterWaveIndex
  enemyIndex: EncounterEnemyIndex
  weaknesses: EncounterWeaknessList
  resistances: EncounterResistanceList
  mechanics?: GameModeMechanicsText
  sideMultipliers?: ElementMultiplierMap
  sideElementMultiplier?: EncounterElementMultiplier
}

export type DABuffViewName = GameModeBuffName

export type DABuffViewNameList = DABuffViewName[]

export interface DABuffView {
  key: GameModeBuffKey
  names: DABuffViewNameList
  effect: GameModeBuffEffect
  iconUrl?: GameModeBuffIconUrl
}

export interface DAEnemyView {
  node?: EncounterNodeIndex
  side?: EncounterSideIndex
  wave?: EncounterWaveIndex
  enemyIndex: EncounterEnemyIndex
  count: EncounterEnemyCount
  enemy: DAEnemyItem
  sideElementMultRaw?: ElementMultiplierTuple
  sideElementMult?: ElementMultiplierMap
}

export interface SDSideView {
  side: EncounterSideIndex
  nodeLevel: EncounterNodeLevel
  sideElementMultRaw: ElementMultiplierTuple
  sideElementMult: ElementMultiplierMap
  sideHPMult: EncounterSideHPMult
  hp60k: EncounterHP60k
  altHp: EncounterAltHP
  enemies: SDSideEnemyViewList
}
export interface SDSideEnemyView {
  node?: EncounterNodeIndex
  side?: EncounterSideIndex
  wave?: EncounterWaveIndex
  enemyIndex: EncounterEnemyIndex
  count: EncounterEnemyCount
  enemy: SDEnemyItem
  sideElementMultRaw?: ElementMultiplierTuple
  sideElementMult?: ElementMultiplierMap
}
export type SDSideEnemyViewList = SDSideEnemyView[]

export type SDNodeBuffName = GameModeBuffName
export type SDNodeBuffNameList = SDNodeBuffName[]

export type SDNodeBuffDescription = GameModeBuffEffect
export type SDNodeBuffDescriptionList = SDNodeBuffDescription[]

export type SDSideViewList = SDSideView[]

export interface SDNodeView {
  node: EncounterNodeIndex
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
  side: EncounterSideIndex
  sideRole: "boss"
  nodeLevel: EncounterNodeLevel
  hp60k: EncounterHP60k
  altHp: EncounterAltHP
  enemies: TSBossSideEnemyViewList
}

export interface TSRegularSideView {
  side: EncounterSideIndex
  sideRole: "regular"
  nodeLevel: EncounterNodeLevel
  sideElementMultRaw?: ElementMultiplierTuple
  sideElementMult?: ElementMultiplierMap
  sideHPMult: EncounterSideHPMult
  hp60k: EncounterHP60k
  altHp: EncounterAltHP
  enemies: TSRegularSideEnemyViewList
}

export type TSSideView = TSBossSideView | TSRegularSideView
export interface TSBossSideEnemyView {
  node?: EncounterNodeIndex
  side?: EncounterSideIndex
  wave?: EncounterWaveIndex
  enemyIndex: EncounterEnemyIndex
  count: EncounterEnemyCount
  enemy: TSBossEnemyItem
  sideElementMultRaw?: ElementMultiplierTuple
  sideElementMult?: ElementMultiplierMap
  sideRole: "boss"
}
export type TSBossSideEnemyViewList = TSBossSideEnemyView[]
export interface TSRegularSideEnemyView {
  node?: EncounterNodeIndex
  side?: EncounterSideIndex
  wave?: EncounterWaveIndex
  enemyIndex: EncounterEnemyIndex
  count: EncounterEnemyCount
  enemy: TSRegularEnemyItem
  sideElementMultRaw?: ElementMultiplierTuple
  sideElementMult?: ElementMultiplierMap
  sideRole: "regular"
}
export type TSRegularSideEnemyViewList = TSRegularSideEnemyView[]
export type TSNodeBuffName = GameModeBuffName
export type TSNodeBuffNameList = TSNodeBuffName[]
export type TSSideViewList = TSSideView[]

export interface TSNodeView {
  node: EncounterNodeIndex
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
