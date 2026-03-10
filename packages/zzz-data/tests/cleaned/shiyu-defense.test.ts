import type { SDVersionItem } from "../../src"

import { describe, expect, it } from "vitest"
import {
  buildSDDamageContext,
  findSDVersionsByEnemyName,
  flattenSDEnemies,
  selectSDEnemy,
  toSDNodeViews,
} from "../../src"

describe("cleaned shiyu-defense helpers", () => {
  const version: Pick<SDVersionItem, "nodes"> = {
    nodes: [
      {
        buffName: "Assault Up",
        buffDesc: ["Boost anomaly", "Boost assault"],
        sides: [
          {
            sideElementMult: [0.8, 1, 1, 1, 0.8],
            sideHPMult: 130,
            nodeLvl: 25,
            hp60k: 269970,
            altHp: 178086,
            waves: [
              {
                enemies: [
                  {
                    id: "10031",
                    type: 1 as const,
                    count: 2,
                    name: "Raider",
                    image: "raider",
                    elementMult: [0.8, 1, 1, 1, 0.8],
                    stunMult: 200,
                    stunTime: 2,
                    hp: 22024,
                    def: 177,
                    daze: 936,
                  },
                ],
              },
            ],
          },
          null,
        ],
      },
    ],
  }

  it("normalizes SD nodes and removes null sides", () => {
    expect(toSDNodeViews(version)).toEqual([
      {
        node: 1,
        buffNames: ["Assault Up"],
        buffDescriptions: ["Boost anomaly", "Boost assault"],
        sides: [
          {
            side: 1,
            nodeLevel: 25,
            sideElementMultRaw: [0.8, 1, 1, 1, 0.8],
            sideElementMult: {
              ice: 0.8,
              fire: 1,
              electric: 1,
              ether: 1,
              physical: 0.8,
            },
            sideHPMult: 130,
            hp60k: 269970,
            altHp: 178086,
            enemies: [
              {
                node: 1,
                side: 1,
                wave: 1,
                enemyIndex: 1,
                count: 2,
                sideElementMultRaw: [0.8, 1, 1, 1, 0.8],
                sideElementMult: {
                  ice: 0.8,
                  fire: 1,
                  electric: 1,
                  ether: 1,
                  physical: 0.8,
                },
                enemy: {
                  id: "10031",
                  type: 1,
                  count: 2,
                  name: "Raider",
                  image: "raider",
                  elementMult: [0.8, 1, 1, 1, 0.8],
                  stunMult: 200,
                  stunTime: 2,
                  hp: 22024,
                  def: 177,
                  daze: 936,
                },
              },
            ],
          },
        ],
      },
    ])
  })

  it("flattens SD enemies with node/side filters", () => {
    expect(flattenSDEnemies(version, { node: 1, side: 1 })).toHaveLength(1)
    expect(flattenSDEnemies(version, { node: 1, side: 2 })).toEqual([])
  })

  it("selects SD enemies and builds damage context with side multipliers", () => {
    const selected = selectSDEnemy(version, {
      node: 1,
      side: 1,
      enemyName: "Raid",
    }).selected

    expect(selected?.enemy.name).toBe("Raider")

    expect(
      buildSDDamageContext(version, "冰属性", {
        node: 1,
        side: 1,
        enemyName: "Raider",
      }),
    ).toMatchObject({
      enemyName: "Raider",
      node: 1,
      side: 1,
      wave: 1,
      enemyIndex: 1,
      elementMultiplier: 0.8,
      sideElementMultiplier: 0.8,
    })
  })

  it("finds SD versions by enemy name", () => {
    expect(
      findSDVersionsByEnemyName(
        {
          versions: [
            {
              versionKey: "2.7.3",
              versionName: "2.7.3",
              versionTime: "04/07/2024 - PRESENT",
              versionDazeMult: 100,
              versionAnomMult: 100,
              nodes: version.nodes,
            },
          ],
        },
        "Raid",
      ),
    ).toHaveLength(1)
  })
})
