import type { DAVersionItem } from "../../src"

import { describe, expect, it } from "vitest"

import {
  buildDADamageContext,
  findDAVersionsByEnemyName,
  flattenDAEnemies,
  getDABuffViews,
  selectDAEnemy,
} from "../../src"

describe("cleaned deadly-assault helpers", () => {
  it("normalizes DA buffs into a stable view", () => {
    expect(
      getDABuffViews({
        buffs: [
          {
            key: "heartcrusher",
            name: "Heartcrusher",
            iconUrl: "heartcrusher.png",
            effect: "Increase CRIT DMG.",
          },
          {
            key: "anonymous",
            effect: "Anonymous buff.",
          },
        ],
      }),
    ).toEqual([
      {
        key: "heartcrusher",
        names: ["Heartcrusher"],
        iconUrl: "heartcrusher.png",
        effect: "Increase CRIT DMG.",
      },
      {
        key: "anonymous",
        names: [],
        iconUrl: undefined,
        effect: "Anonymous buff.",
      },
    ])
  })

  it("flattens DA enemies into stable encounter refs", () => {
    expect(
      flattenDAEnemies({
        versionEnemies: [
          {
            id: "27300",
            type: 1,
            mult: 190,
            name: "Sanguine Sweeper",
            image: "sanguine-sweeper",
            elementMult: [1, 1.2, 0.8, 0.8, 1],
            stunMult: 150,
            stunTime: 15,
            hp: 250238491,
            def: 476,
            daze: 17876,
            altHp: 238977759,
          },
        ],
      }),
    ).toEqual([
      {
        enemyIndex: 1,
        count: 1,
        enemy: {
          id: "27300",
          type: 1,
          mult: 190,
          name: "Sanguine Sweeper",
          image: "sanguine-sweeper",
          elementMult: [1, 1.2, 0.8, 0.8, 1],
          stunMult: 150,
          stunTime: 15,
          hp: 250238491,
          def: 476,
          daze: 17876,
          altHp: 238977759,
        },
      },
    ])
  })

  it("selects DA enemies and builds damage context", () => {
    const version: Pick<DAVersionItem, "versionEnemies"> = {
      versionEnemies: [
        {
          id: "27300",
          type: 1 as const,
          mult: 190,
          name: "Sanguine Sweeper",
          image: "sanguine-sweeper",
          elementMult: [1, 1.2, 0.8, 0.8, 1],
          stunMult: 150,
          stunTime: 15,
          hp: 250238491,
          def: 476,
          daze: 17876,
          altHp: 238977759,
          weaknesses: ["Ether"],
          resistances: ["Electric"],
          mechanics: "Counter heavy attacks.",
        },
      ],
    }

    expect(selectDAEnemy(version, "Sweeper").selected?.enemy.name).toBe(
      "Sanguine Sweeper",
    )
    expect(
      buildDADamageContext(version, "玄墨", "Sanguine")?.elementMultiplier,
    ).toBe(0.8)
    expect(
      buildDADamageContext(version, "玄墨", "Sanguine")?.resistances,
    ).toEqual(["Electric"])
  })

  it("finds DA versions by enemy name", () => {
    expect(
      findDAVersionsByEnemyName(
        [
          {
            versionKey: "2.7.3",
            versionName: "2.7.3",
            versionTime: "04/07/2024 - PRESENT",
            versionDazeMult: 100,
            versionAnomMult: 100,
            buffs: [],
            versionEnemies: [
              {
                id: "27300",
                type: 1,
                mult: 190,
                name: "Sanguine Sweeper",
                image: "sanguine-sweeper",
                elementMult: [1, 1.2, 0.8, 0.8, 1],
                stunMult: 150,
                stunTime: 15,
                hp: 250238491,
                def: 476,
                daze: 17876,
                altHp: 238977759,
              },
            ],
          },
        ],
        "Sweeper",
      ),
    ).toHaveLength(1)
  })
})
