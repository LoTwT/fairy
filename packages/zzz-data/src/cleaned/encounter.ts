import type { EnemyBase } from "../game-modes.js"
import type { AgentAttributeLabel } from "../terms.js"
import type {
  EncounterCandidateList,
  EncounterDamageContext,
  EncounterMatchList,
  EncounterResistanceList,
  EncounterSelectionResult,
  EncounterWeaknessList,
  FlattenedEnemyView,
} from "./types.js"
import { buildEnemyDamageContext, getEnemyElementMultiplier } from "./enemy.js"

interface EncounterEnemy extends EnemyBase {
  weaknesses?: EncounterWeaknessList
  resistances?: EncounterResistanceList
  mechanics?: string
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[\s\-_]/g, "")
}

function getCandidateNames<
  TEncounter extends FlattenedEnemyView<EncounterEnemy>,
>(encounters: readonly TEncounter[]): EncounterCandidateList {
  return [...new Set(encounters.map((encounter) => encounter.enemy.name))]
}

export function selectEncounterByEnemyName<
  TEncounter extends FlattenedEnemyView<EncounterEnemy>,
>(
  encounters: readonly TEncounter[],
  enemyName?: string,
): EncounterSelectionResult<TEncounter> {
  if (!enemyName) {
    return encounters.length === 1
      ? {
          selected: encounters[0],
          matches: [encounters[0]],
          candidates: [encounters[0].enemy.name],
        }
      : {
          matches: [],
          candidates: getCandidateNames(encounters),
        }
  }

  const normalizedName = normalizeText(enemyName)
  const matches: EncounterMatchList<TEncounter> = encounters.filter(
    (encounter) => normalizeText(encounter.enemy.name).includes(normalizedName),
  )

  if (matches.length === 1) {
    return {
      selected: matches[0],
      matches,
      candidates: [matches[0].enemy.name],
    }
  }

  return {
    matches,
    candidates: getCandidateNames(matches.length > 0 ? matches : encounters),
  }
}

export function buildEncounterDamageContext<
  TEncounter extends FlattenedEnemyView<EncounterEnemy>,
>(
  encounter: TEncounter | undefined,
  attribute: AgentAttributeLabel | undefined,
): EncounterDamageContext | undefined {
  if (!encounter) return undefined

  const context = buildEnemyDamageContext(encounter.enemy, attribute)
  if (!context) return undefined

  return {
    ...context,
    node: encounter.node,
    side: encounter.side,
    wave: encounter.wave,
    enemyIndex: encounter.enemyIndex,
    weaknesses: encounter.enemy.weaknesses ?? [],
    resistances: encounter.enemy.resistances ?? [],
    mechanics: encounter.enemy.mechanics,
    sideMultipliers: encounter.sideElementMult,
    sideElementMultiplier: encounter.sideElementMultRaw
      ? getEnemyElementMultiplier(encounter.sideElementMultRaw, attribute)
      : undefined,
  }
}
