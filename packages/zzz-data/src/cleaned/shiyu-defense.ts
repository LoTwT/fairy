import type { SDModeItem, SDVersionItem } from "../game-modes.js"
import type { AgentAttributeLabel } from "../terms.js"
import type {
  EncounterDamageContext,
  EncounterFilter,
  EncounterSelectionResult,
  FlattenedEnemyView,
  SDNodeView,
} from "./types.js"
import {
  buildEncounterDamageContext,
  selectEncounterByEnemyName,
} from "./encounter.js"
import { toElementMultiplierMap } from "./enemy.js"

function normalizeTextList(value?: string | string[]): string[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function matchesFilter(index: number, expected: number | undefined): boolean {
  return expected === undefined || index === expected
}

export function toSDNodeViews(
  version: Pick<SDVersionItem, "nodes">,
  filter: EncounterFilter = {},
): SDNodeView[] {
  const nodes: SDNodeView[] = []

  for (const [nodeIndex, node] of version.nodes.entries()) {
    const currentNode = nodeIndex + 1
    if (!matchesFilter(currentNode, filter.node)) continue

    const sides: SDNodeView["sides"] = node.sides.flatMap((side, sideIndex) => {
      const currentSide = sideIndex + 1
      if (!side || !matchesFilter(currentSide, filter.side)) return []

      const enemies: FlattenedEnemyView<
        NonNullable<(typeof side)["waves"][number]["enemies"][number]>
      >[] = []

      for (const [waveIndex, wave] of side.waves.entries()) {
        for (const [enemyIndex, enemy] of wave.enemies.entries()) {
          enemies.push({
            node: currentNode,
            side: currentSide,
            wave: waveIndex + 1,
            enemyIndex: enemyIndex + 1,
            count: enemy.count,
            enemy,
            sideElementMultRaw: side.sideElementMult,
            sideElementMult: toElementMultiplierMap(side.sideElementMult),
          })
        }
      }

      return [
        {
          side: currentSide,
          nodeLevel: side.nodeLvl,
          sideElementMultRaw: side.sideElementMult,
          sideElementMult: toElementMultiplierMap(side.sideElementMult),
          sideHPMult: side.sideHPMult,
          hp60k: side.hp60k,
          altHp: side.altHp,
          enemies,
        },
      ]
    })

    nodes.push({
      node: currentNode,
      buffNames: normalizeTextList(node.buffName),
      buffDescriptions: normalizeTextList(node.buffDesc),
      sides,
    })
  }

  return nodes
}

export function flattenSDEnemies(
  version: Pick<SDVersionItem, "nodes">,
  filter: EncounterFilter = {},
): SDNodeView["sides"][number]["enemies"] {
  return toSDNodeViews(version, filter)
    .flatMap((node) => node.sides)
    .flatMap((side) => side.enemies)
}

export function selectSDEnemy(
  version: Pick<SDVersionItem, "nodes">,
  options: EncounterFilter & { enemyName?: string } = {},
): EncounterSelectionResult<FlattenedEnemyView> {
  return selectEncounterByEnemyName(
    flattenSDEnemies(version, options),
    options.enemyName,
  )
}

export function buildSDDamageContext(
  version: Pick<SDVersionItem, "nodes">,
  attribute: AgentAttributeLabel | undefined,
  options: EncounterFilter & { enemyName?: string } = {},
): EncounterDamageContext | undefined {
  return buildEncounterDamageContext(
    selectSDEnemy(version, options).selected,
    attribute,
  )
}

export function findSDVersionsByEnemyName(
  mode: Pick<SDModeItem, "versions">,
  enemyName: string,
): SDVersionItem[] {
  const normalizedName = enemyName.toLowerCase()

  return mode.versions.filter((version) =>
    flattenSDEnemies(version).some((encounter) =>
      encounter.enemy.name.toLowerCase().includes(normalizedName),
    ),
  )
}
