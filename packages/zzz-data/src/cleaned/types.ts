import type {
  DABuff,
  DAEnemyItem,
  ElementMult,
  EnemyBase,
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

export interface EnemyDamageContextSource extends Omit<
  Pick<
    EnemyBase,
    "id" | "name" | "elementMult" | "stunMult" | "stunTime" | "def" | "daze"
  >,
  "elementMult"
> {
  elementMult: ElementMultiplierTuple
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
  matches: TEncounter[]
  candidates: string[]
}

export interface EncounterDamageContext extends EnemyDamageContext {
  node?: number
  side?: number
  wave?: number
  enemyIndex: number
  weaknesses: string[]
  resistances: string[]
  mechanics?: string
  sideMultipliers?: ElementMultiplierMap
  sideElementMultiplier?: number
}

export interface DABuffView {
  key: string
  names: string[]
  effect: string
  iconUrl?: string
}

export interface DAEnemyView extends FlattenedEnemyView<DAEnemyItem> {}

export interface SDSideView {
  side: number
  nodeLevel: number
  sideElementMultRaw: ElementMultiplierTuple
  sideElementMult: ElementMultiplierMap
  sideHPMult: number
  hp60k: number
  altHp: number
  enemies: FlattenedEnemyView<SDEnemyItem>[]
}

export interface SDNodeView {
  node: number
  buffNames: string[]
  buffDescriptions: string[]
  sides: SDSideView[]
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
  enemies: TSFlattenedEnemyView<TSBossEnemyItem>[]
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
  enemies: TSFlattenedEnemyView<TSRegularEnemyItem>[]
}

export type TSSideView = TSBossSideView | TSRegularSideView

export interface TSNodeView {
  node: number
  buffNames: string[]
  sides: TSSideView[]
}

export interface VersionPeriodInfo {
  raw: string
  startLabel?: string
  endLabel?: string
  isRange: boolean
  isOngoing: boolean
  isPlaceholder: boolean
}

export type ElementMultiplierSource =
  | ElementMultiplierCarrier
  | ElementMultiplierTuple

export type DABuffSource = Pick<DABuff, "key" | "name" | "iconUrl" | "effect">
