import type { TSVersionItem } from "../../src"

import { describe, expect, it } from "vitest"
import {
  buildTSDamageContext,
  findTSVersionsByEnemyName,
  flattenTSEnemies,
  selectTSEnemy,
  toTSNodeViews,
} from "../../src"

describe("cleaned threshold-simulation helpers", () => {
  const version: Pick<TSVersionItem, "nodes"> = {
    nodes: [
      {
        buffNames: ["Spirit Break"],
        sides: [
          {
            nodeLvl: 55,
            hp60k: 67901735,
            altHp: 67901735,
            waves: [
              {
                enemies: [
                  {
                    id: "15300",
                    type: 1 as const,
                    mult: 240,
                    name: "Dead End Butcher",
                    image: "dead-end-butcher-not",
                    elementMult: [0.8, 1, 1, 0.8, 1],
                    stunMult: 150,
                    stunTime: 12,
                    hp: 67901735,
                    def: 826,
                    daze: 12653,
                    altHp: 67901735,
                  },
                ],
              },
            ],
          },
          {
            sideElementMult: [1, 1.2, 0.8, 1, 1],
            sideHPMult: 220,
            nodeLvl: 55,
            hp60k: 6852767,
            altHp: 5680715,
            waves: [
              {
                enemies: [
                  {
                    id: "10026",
                    type: 1 as const,
                    count: 2,
                    name: "Patrol Jaeger",
                    image: "patrol-jaeger",
                    elementMult: [1, 1, 0.8, 1, 1],
                    stunMult: 125,
                    stunTime: 6.5,
                    hp: 390684,
                    def: 633,
                    daze: 1728,
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

  it("normalizes TS nodes with boss and regular side views", () => {
    expect(toTSNodeViews(version)).toEqual([
      {
        node: 1,
        buffNames: ["Spirit Break"],
        sides: [
          {
            side: 1,
            sideRole: "boss",
            nodeLevel: 55,
            hp60k: 67901735,
            altHp: 67901735,
            enemies: [
              {
                node: 1,
                side: 1,
                wave: 1,
                enemyIndex: 1,
                count: 1,
                sideRole: "boss",
                enemy: {
                  id: "15300",
                  type: 1,
                  mult: 240,
                  name: "Dead End Butcher",
                  image: "dead-end-butcher-not",
                  elementMult: [0.8, 1, 1, 0.8, 1],
                  stunMult: 150,
                  stunTime: 12,
                  hp: 67901735,
                  def: 826,
                  daze: 12653,
                  altHp: 67901735,
                },
              },
            ],
          },
          {
            side: 2,
            sideRole: "regular",
            nodeLevel: 55,
            sideElementMultRaw: [1, 1.2, 0.8, 1, 1],
            sideElementMult: {
              ice: 1,
              fire: 1.2,
              electric: 0.8,
              ether: 1,
              physical: 1,
            },
            sideHPMult: 220,
            hp60k: 6852767,
            altHp: 5680715,
            enemies: [
              {
                node: 1,
                side: 2,
                wave: 1,
                enemyIndex: 1,
                count: 2,
                sideRole: "regular",
                sideElementMultRaw: [1, 1.2, 0.8, 1, 1],
                sideElementMult: {
                  ice: 1,
                  fire: 1.2,
                  electric: 0.8,
                  ether: 1,
                  physical: 1,
                },
                enemy: {
                  id: "10026",
                  type: 1,
                  count: 2,
                  name: "Patrol Jaeger",
                  image: "patrol-jaeger",
                  elementMult: [1, 1, 0.8, 1, 1],
                  stunMult: 125,
                  stunTime: 6.5,
                  hp: 390684,
                  def: 633,
                  daze: 1728,
                },
              },
            ],
          },
        ],
      },
    ])
  })

  it("flattens TS enemies with filters and preserves side roles", () => {
    expect(flattenTSEnemies(version, { node: 1 })).toHaveLength(2)
    expect(flattenTSEnemies(version, { node: 1, side: 1 })[0]?.sideRole).toBe(
      "boss",
    )
    expect(flattenTSEnemies(version, { node: 1, side: 2 })[0]?.sideRole).toBe(
      "regular",
    )
  })

  it("selects TS enemies and exposes both enemy and side multipliers", () => {
    const selected = selectTSEnemy(version, {
      node: 1,
      side: 2,
      enemyName: "Patrol",
    }).selected

    expect(selected?.sideRole).toBe("regular")

    expect(
      buildTSDamageContext(version, "火属性", {
        node: 1,
        side: 2,
        enemyName: "Patrol",
      }),
    ).toMatchObject({
      enemyName: "Patrol Jaeger",
      elementMultiplier: 1,
      sideElementMultiplier: 1.2,
      node: 1,
      side: 2,
      wave: 1,
    })
  })

  it("finds TS versions by enemy name", () => {
    expect(
      findTSVersionsByEnemyName(
        {
          versions: [
            {
              versionKey: "2.7.0",
              versionName: "2.7.0",
              versionTime: "14/10/2025 - PRESENT",
              versionBossDazeMult: 100,
              versionEnemyDazeMult: 100,
              versionBossAnomMult: 110,
              versionEnemyAnomMult: 100,
              nodes: version.nodes,
            },
          ],
        },
        "Patrol",
      ),
    ).toHaveLength(1)
  })
})
