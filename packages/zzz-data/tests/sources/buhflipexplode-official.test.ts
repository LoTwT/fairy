import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import {
  type BuhflipexplodeSourceData,
  DEADLY_ASSAULT_NO_LEAKS_VERSION_COUNT,
  filterBuhflipexplodeOfficialData,
  SHIYU_DEFENSE_CRITICAL_NO_LEAKS_VERSION_COUNT,
  THRESHOLD_SIMULATION_HARD_NO_LEAKS_VERSION_COUNT,
} from "../../scripts/sources/buhflipexplode-official.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BUHFLIPEXPLODE_SOURCE_DIR = path.resolve(
  __dirname,
  "../../data/source/buhflipexplode/en",
)

function createDeadlyAssaultVersions(count: number) {
  return Object.fromEntries(
    Array.from({ length: count }, (_, index) => {
      const version = index + 1
      const key = `da-${version.toString().padStart(2, "0")}`

      return [
        key,
        {
          versionName: key,
          versionTime: key,
          buffNames: [`da-buff-${version}`],
          versionEnemies: [{ id: `da-enemy-${version}` }],
        },
      ]
    }),
  )
}

function createNestedVersion(
  enemyId: string,
  buffName?: string,
  buffNames?: string[],
) {
  return {
    versionName: enemyId,
    versionTime: enemyId,
    versionEnemies: {
      nodes: [
        {
          ...(buffName ? { buffName } : {}),
          ...(buffNames ? { buffNames } : {}),
          sides: [
            {
              waves: [
                {
                  enemies: [{ id: enemyId, type: 0, count: 1 }],
                },
              ],
            },
          ],
        },
      ],
    },
  }
}

function createModeVersions(
  prefix: string,
  count: number,
  options?: {
    buffNamePrefix?: string
    buffNamesPrefix?: string
  },
) {
  return Object.fromEntries(
    Array.from({ length: count }, (_, index) => {
      const version = index + 1
      const key = `${prefix}-${version.toString().padStart(2, "0")}`

      return [
        key,
        createNestedVersion(
          `${prefix}-enemy-${version}`,
          options?.buffNamePrefix
            ? `${options.buffNamePrefix}-${version}`
            : undefined,
          options?.buffNamesPrefix
            ? [`${options.buffNamesPrefix}-${version}`]
            : undefined,
        ),
      ]
    }),
  )
}

function collectReferencedIdsAndBuffNames(value: unknown) {
  const enemyIds = new Set<string>()
  const buffNames = new Set<string>()

  function walk(entry: unknown): void {
    if (Array.isArray(entry)) {
      entry.forEach(walk)
      return
    }

    if (entry === null || typeof entry !== "object") {
      return
    }

    if ("id" in entry && typeof entry.id === "string") {
      enemyIds.add(entry.id)
    }

    if ("buffName" in entry && typeof entry.buffName === "string") {
      buffNames.add(entry.buffName)
    }

    if ("buffNames" in entry && Array.isArray(entry.buffNames)) {
      entry.buffNames.forEach((name) => {
        if (typeof name === "string") {
          buffNames.add(name)
        }
      })
    }

    Object.values(entry).forEach(walk)
  }

  walk(value)

  return { enemyIds, buffNames }
}

describe("filterBuhflipexplodeOfficialData", () => {
  it("trims each mode to the documented official-history ceiling", () => {
    const filtered = filterBuhflipexplodeOfficialData({
      deadlyAssault: createDeadlyAssaultVersions(
        DEADLY_ASSAULT_NO_LEAKS_VERSION_COUNT + 2,
      ),
      shiyuDefense: [
        {
          name: "Stable Node",
          versions: { "stable-01": createNestedVersion("stable-enemy") },
        },
        {
          name: "Critical Node",
          versions: createModeVersions(
            "critical",
            SHIYU_DEFENSE_CRITICAL_NO_LEAKS_VERSION_COUNT + 2,
          ),
        },
      ],
      thresholdSimulation: [
        {
          name: "Easy Mode",
          versions: { "easy-01": createNestedVersion("easy-enemy") },
        },
        {
          name: "Hard Mode",
          versions: createModeVersions(
            "hard",
            THRESHOLD_SIMULATION_HARD_NO_LEAKS_VERSION_COUNT + 2,
            { buffNamesPrefix: "hard-buff" },
          ),
        },
      ],
      enemies: Object.fromEntries([
        ...Array.from(
          { length: DEADLY_ASSAULT_NO_LEAKS_VERSION_COUNT + 2 },
          (_, index) => [`da-enemy-${index + 1}`, { name: `DA ${index + 1}` }],
        ),
        ...Array.from(
          { length: SHIYU_DEFENSE_CRITICAL_NO_LEAKS_VERSION_COUNT + 2 },
          (_, index) => [
            `critical-enemy-${index + 1}`,
            { name: `Critical ${index + 1}` },
          ],
        ),
        ...Array.from(
          { length: THRESHOLD_SIMULATION_HARD_NO_LEAKS_VERSION_COUNT + 2 },
          (_, index) => [
            `hard-enemy-${index + 1}`,
            { name: `Hard ${index + 1}` },
          ],
        ),
        ["stable-enemy", { name: "Stable" }],
        ["easy-enemy", { name: "Easy" }],
      ]),
      buffs: Object.fromEntries(
        Array.from(
          { length: DEADLY_ASSAULT_NO_LEAKS_VERSION_COUNT + 2 },
          (_, index) => [`da-buff-${index + 1}`, `DA Buff ${index + 1}`],
        ).concat(
          Array.from(
            { length: THRESHOLD_SIMULATION_HARD_NO_LEAKS_VERSION_COUNT + 2 },
            (_, index) => [`hard-buff-${index + 1}`, `Hard Buff ${index + 1}`],
          ),
        ),
      ),
    })

    expect(Object.keys(filtered.deadlyAssault)).toHaveLength(
      DEADLY_ASSAULT_NO_LEAKS_VERSION_COUNT,
    )
    expect(Object.keys(filtered.deadlyAssault).at(-1)).toBe("da-32")

    const criticalNode = filtered.shiyuDefense.find(
      (item) => item.name === "Critical Node",
    )
    expect(criticalNode).toBeDefined()
    expect(Object.keys(criticalNode!.versions)).toHaveLength(
      SHIYU_DEFENSE_CRITICAL_NO_LEAKS_VERSION_COUNT,
    )
    expect(Object.keys(criticalNode!.versions).at(-1)).toBe("critical-43")

    const hardMode = filtered.thresholdSimulation.find(
      (item) => item.name === "Hard Mode",
    )
    expect(hardMode).toBeDefined()
    expect(Object.keys(hardMode!.versions)).toHaveLength(
      THRESHOLD_SIMULATION_HARD_NO_LEAKS_VERSION_COUNT,
    )
    expect(Object.keys(hardMode!.versions).at(-1)).toBe("hard-02")

    expect(filtered.enemies["da-enemy-33"]).toBeUndefined()
    expect(filtered.enemies["critical-enemy-44"]).toBeUndefined()
    expect(filtered.enemies["hard-enemy-03"]).toBeUndefined()
    expect(filtered.buffs["da-buff-33"]).toBeUndefined()
    expect(filtered.buffs["hard-buff-03"]).toBeUndefined()
  })

  it("keeps nested SD and TS enemy references while pruning unreferenced globals", () => {
    const filtered = filterBuhflipexplodeOfficialData({
      deadlyAssault: {
        "2.6.3": {
          buffNames: ["Spirit Break"],
          versionEnemies: [{ id: "14301" }],
        },
      },
      shiyuDefense: [
        {
          name: "Stable Node",
          versions: {
            "Stable Node": createNestedVersion("10031", "Assault Up"),
          },
        },
      ],
      thresholdSimulation: [
        {
          name: "Easy Mode",
          versions: {
            "Easy Mode": createNestedVersion("15300", undefined, [
              "Raging Waves",
              "Inline Only",
            ]),
          },
        },
      ],
      enemies: {
        "10031": { name: "SD Enemy" },
        "14301": { name: "DA Enemy" },
        "15300": { name: "TS Enemy" },
        "99999": { name: "Unused Enemy" },
      },
      buffs: {
        "Spirit Break": "spirit",
        "Raging Waves": "raging",
        "Unused Buff": "unused",
      },
    })

    expect(Object.keys(filtered.enemies).sort()).toEqual([
      "10031",
      "14301",
      "15300",
    ])
    expect(Object.keys(filtered.buffs).sort()).toEqual([
      "Raging Waves",
      "Spirit Break",
    ])
  })

  it("keeps the committed official snapshot internally consistent", () => {
    const currentSnapshot = {
      deadlyAssault: JSON.parse(
        fs.readFileSync(
          path.join(BUHFLIPEXPLODE_SOURCE_DIR, "deadly-assault.json"),
          "utf-8",
        ),
      ),
      shiyuDefense: JSON.parse(
        fs.readFileSync(
          path.join(BUHFLIPEXPLODE_SOURCE_DIR, "shiyu-defense.json"),
          "utf-8",
        ),
      ),
      thresholdSimulation: JSON.parse(
        fs.readFileSync(
          path.join(BUHFLIPEXPLODE_SOURCE_DIR, "threshold-simulation.json"),
          "utf-8",
        ),
      ),
      enemies: JSON.parse(
        fs.readFileSync(
          path.join(BUHFLIPEXPLODE_SOURCE_DIR, "enemies.json"),
          "utf-8",
        ),
      ),
      buffs: JSON.parse(
        fs.readFileSync(
          path.join(BUHFLIPEXPLODE_SOURCE_DIR, "buffs.json"),
          "utf-8",
        ),
      ),
    } as BuhflipexplodeSourceData
    const { deadlyAssault, shiyuDefense, thresholdSimulation, enemies, buffs } =
      currentSnapshot
    const pageData = JSON.parse(
      fs.readFileSync(
        path.join(BUHFLIPEXPLODE_SOURCE_DIR, "deadly-assault-page-data.json"),
        "utf-8",
      ),
    ) as {
      versionOrder: string[]
      versions: Record<string, { hasLeaks: boolean; isBeta: boolean }>
    }
    const filteredSnapshot = filterBuhflipexplodeOfficialData({
      ...currentSnapshot,
    })

    const expectedEnemyIds = new Set<string>()
    const expectedBuffNames = new Set<string>()

    Object.values(deadlyAssault).forEach((version) => {
      const { enemyIds, buffNames } = collectReferencedIdsAndBuffNames(version)
      enemyIds.forEach((id) => expectedEnemyIds.add(id))
      buffNames.forEach((name) => {
        if (name in buffs) {
          expectedBuffNames.add(name)
        }
      })
    })

    shiyuDefense.forEach((item) => {
      Object.values(item.versions).forEach((version) => {
        const { enemyIds, buffNames } =
          collectReferencedIdsAndBuffNames(version)
        enemyIds.forEach((id) => expectedEnemyIds.add(id))
        buffNames.forEach((name) => {
          if (name in buffs) {
            expectedBuffNames.add(name)
          }
        })
      })
    })

    thresholdSimulation.forEach((item) => {
      Object.values(item.versions).forEach((version) => {
        const { enemyIds, buffNames } =
          collectReferencedIdsAndBuffNames(version)
        enemyIds.forEach((id) => expectedEnemyIds.add(id))
        buffNames.forEach((name) => {
          if (name in buffs) {
            expectedBuffNames.add(name)
          }
        })
      })
    })

    expect(filteredSnapshot.deadlyAssault).toEqual(deadlyAssault)
    expect(filteredSnapshot.shiyuDefense).toEqual(shiyuDefense)
    expect(filteredSnapshot.thresholdSimulation).toEqual(thresholdSimulation)
    expect(filteredSnapshot.enemies).toEqual(enemies)
    expect(filteredSnapshot.buffs).toEqual(buffs)

    expect(
      pageData.versionOrder.filter(
        (version) => pageData.versions[version].hasLeaks,
      ),
    ).toHaveLength(0)
    expect(
      pageData.versionOrder.filter(
        (version) => pageData.versions[version].isBeta,
      ),
    ).toHaveLength(0)
    expect(pageData.versionOrder).toEqual(Object.keys(deadlyAssault))
    expect(Object.keys(pageData.versions).sort()).toEqual(
      Object.keys(deadlyAssault).sort(),
    )

    expect(Object.keys(enemies).sort()).toEqual([...expectedEnemyIds].sort())
    expect(Object.keys(buffs).sort()).toEqual([...expectedBuffNames].sort())
    expect(
      Object.values(enemies).some((enemy) => {
        return (
          enemy !== null &&
          typeof enemy === "object" &&
          "tags" in enemy &&
          Array.isArray(enemy.tags) &&
          enemy.tags.includes("spoiler")
        )
      }),
    ).toBe(false)
  })
})
