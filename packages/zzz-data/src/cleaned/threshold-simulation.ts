import type {
  TSBossEnemyItem,
  TSBossSideItem,
  TSModeItem,
  TSRegularEnemyItem,
  TSRegularSideItem,
  TSVersionItem,
} from "../game-modes.js"
import type { AgentAttributeLabel } from "../terms.js"
import type {
  EncounterDamageContext,
  EncounterFilter,
  EncounterSelectionResult,
  TSFlattenedEnemyView,
  TSNodeView,
  TSSideView,
} from "./types.js"
import {
  buildEncounterDamageContext,
  selectEncounterByEnemyName,
} from "./encounter.js"
import { toElementMultiplierMap } from "./enemy.js"

function matchesFilter(index: number, expected: number | undefined): boolean {
  return expected === undefined || index === expected
}

export function toTSNodeViews(
  version: Pick<TSVersionItem, "nodes">,
  filter: EncounterFilter = {},
): TSNodeView[] {
  const nodes: TSNodeView[] = []

  for (const [nodeIndex, node] of version.nodes.entries()) {
    const currentNode = nodeIndex + 1
    if (!matchesFilter(currentNode, filter.node)) continue

    const sides: TSSideView[] = []

    for (const [sideIndex, side] of node.sides.entries()) {
      const currentSide = sideIndex + 1
      if (!side || !matchesFilter(currentSide, filter.side)) continue

      if (sideIndex === 0) {
        const sideRole = "boss"
        const bossSide = side as TSBossSideItem
        const bossEnemies: TSFlattenedEnemyView<TSBossEnemyItem>[] = []
        for (const [waveIndex, wave] of bossSide.waves.entries()) {
          for (const [enemyIndex, enemy] of wave.enemies.entries()) {
            bossEnemies.push({
              node: currentNode,
              side: currentSide,
              wave: waveIndex + 1,
              enemyIndex: enemyIndex + 1,
              count: 1,
              sideRole,
              enemy,
            })
          }
        }
        sides.push({
          side: currentSide,
          sideRole,
          nodeLevel: bossSide.nodeLvl,
          hp60k: bossSide.hp60k,
          altHp: bossSide.altHp,
          enemies: bossEnemies,
        })
      } else {
        const sideRole = "regular"
        const regularSide = side as TSRegularSideItem
        const regularEnemies: TSFlattenedEnemyView<TSRegularEnemyItem>[] = []
        for (const [waveIndex, wave] of regularSide.waves.entries()) {
          for (const [enemyIndex, enemy] of wave.enemies.entries()) {
            regularEnemies.push({
              node: currentNode,
              side: currentSide,
              wave: waveIndex + 1,
              enemyIndex: enemyIndex + 1,
              count: enemy.count,
              sideRole,
              enemy,
              sideElementMultRaw: regularSide.sideElementMult,
              sideElementMult: regularSide.sideElementMult
                ? toElementMultiplierMap(regularSide.sideElementMult)
                : undefined,
            })
          }
        }
        sides.push({
          side: currentSide,
          sideRole,
          nodeLevel: regularSide.nodeLvl,
          sideElementMultRaw: regularSide.sideElementMult,
          sideElementMult: regularSide.sideElementMult
            ? toElementMultiplierMap(regularSide.sideElementMult)
            : undefined,
          sideHPMult: regularSide.sideHPMult,
          hp60k: regularSide.hp60k,
          altHp: regularSide.altHp,
          enemies: regularEnemies,
        })
      }
    }

    nodes.push({
      node: currentNode,
      buffNames: node.buffNames,
      sides,
    })
  }

  return nodes
}

export function flattenTSEnemies(
  version: Pick<TSVersionItem, "nodes">,
  filter: EncounterFilter = {},
): Array<TSFlattenedEnemyView> {
  const enemies: TSFlattenedEnemyView[] = []

  for (const node of toTSNodeViews(version, filter)) {
    for (const side of node.sides) {
      enemies.push(...(side.enemies as TSFlattenedEnemyView[]))
    }
  }

  return enemies
}

export function selectTSEnemy(
  version: Pick<TSVersionItem, "nodes">,
  options: EncounterFilter & { enemyName?: string } = {},
): EncounterSelectionResult<TSFlattenedEnemyView> {
  return selectEncounterByEnemyName(
    flattenTSEnemies(version, options),
    options.enemyName,
  )
}

export function buildTSDamageContext(
  version: Pick<TSVersionItem, "nodes">,
  attribute: AgentAttributeLabel | undefined,
  options: EncounterFilter & { enemyName?: string } = {},
): EncounterDamageContext | undefined {
  return buildEncounterDamageContext(
    selectTSEnemy(version, options).selected,
    attribute,
  )
}

export function findTSVersionsByEnemyName(
  mode: Pick<TSModeItem, "versions">,
  enemyName: string,
): TSVersionItem[] {
  const normalizedName = enemyName.toLowerCase()

  return mode.versions.filter((version) =>
    flattenTSEnemies(version).some((encounter) =>
      encounter.enemy.name.toLowerCase().includes(normalizedName),
    ),
  )
}
