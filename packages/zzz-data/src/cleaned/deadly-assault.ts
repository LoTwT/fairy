import type { DAVersionItem, DeadlyAssaultJson } from "../game-modes.js"
import type { AgentAttributeLabel } from "../terms.js"
import type {
  DABuffSource,
  DABuffView,
  DAEnemyView,
  EncounterDamageContext,
  EncounterSelectionResult,
} from "./types.js"
import {
  buildEncounterDamageContext,
  selectEncounterByEnemyName,
} from "./encounter.js"

export function toDABuffView(buff: DABuffSource): DABuffView {
  return {
    key: buff.key,
    names: buff.name ? [buff.name] : [],
    effect: buff.effect,
    iconUrl: buff.iconUrl,
  }
}

export function getDABuffViews(
  version: Pick<DAVersionItem, "buffs">,
): DABuffView[] {
  return version.buffs.map(toDABuffView)
}

export function flattenDAEnemies(
  version: Pick<DAVersionItem, "versionEnemies">,
): DAEnemyView[] {
  return version.versionEnemies.map((enemy, enemyIndex) => ({
    enemy,
    enemyIndex: enemyIndex + 1,
    count: 1,
  }))
}

export function selectDAEnemy(
  version: Pick<DAVersionItem, "versionEnemies">,
  enemyName?: string,
): EncounterSelectionResult<DAEnemyView> {
  return selectEncounterByEnemyName(flattenDAEnemies(version), enemyName)
}

export function buildDADamageContext(
  version: Pick<DAVersionItem, "versionEnemies">,
  attribute: AgentAttributeLabel | undefined,
  enemyName?: string,
): EncounterDamageContext | undefined {
  return buildEncounterDamageContext(
    selectDAEnemy(version, enemyName).selected,
    attribute,
  )
}

export function findDAVersionsByEnemyName(
  data: DeadlyAssaultJson,
  enemyName: string,
): DAVersionItem[] {
  const normalizedName = enemyName.toLowerCase()
  return data.filter((version) =>
    version.versionEnemies.some((enemy) =>
      enemy.name.toLowerCase().includes(normalizedName),
    ),
  )
}
