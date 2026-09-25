import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"
import {
  calculationDataVersion,
  staticPanelRules,
} from "../.generated/calculation-data.ts"
import { resolveAgentAction } from "../src/skills/resolve.ts"
import { calculateStaticActionDamage } from "../../core/src/static/calculate.ts"
import type {
  StaticActionCalculationInput,
  StaticActionCalculationResult,
  StaticActorConfiguration,
} from "../../core/src/static/types.ts"
import type { StaticCalculationData } from "@randomplay/shared"

const json = async (path: string) =>
  JSON.parse(
    await readFile(
      new URL(`../.generated/definitions/${path}`, import.meta.url),
      "utf8",
    ),
  )
const emptyDiscs = {
  1: null,
  2: null,
  3: null,
  4: null,
  5: null,
  6: null,
} as const
function equippedDisc(
  setEntityId: string,
  attribute: "health" | "attack" | "defense",
) {
  return { setEntityId, mainStat: { attribute }, substats: [] }
}

async function fixture(id = "1121"): Promise<StaticActionCalculationInput> {
  const attributes = await json(`attributes/agents/${id}.json`)
  const actions = await json(`skills/agents/${id}.json`)
  const data: StaticCalculationData = {
    version: calculationDataVersion,
    agents: [{ attributes, actions }],
    wEngines: [],
    driveDiscAffixes: await json("attributes/drive-disc-affixes.json"),
    definitions: await json("effects/static.json"),
    catalog: await json("effects/static-catalog.json"),
    panelRules: staticPanelRules,
  }
  const action = data.agents[0]!.actions.actions.find(
    (a) =>
      a.calculation.kind === "damage" &&
      a.skillCategory &&
      a.inputs.length === 0,
  )!
  return {
    data,
    actors: [
      {
        entityId: "entity:actor",
        teamId: "team:players",
        agentEntityId: id,
        mindscapeRank: 0,
        coreSkillLevel: 7,
        wEngine: null,
        driveDiscs: emptyDiscs,
        panel: { mode: "equipment" },
      },
    ],
    actorId: "entity:actor",
    action: resolveAgentAction({
      agent: actions,
      actionId: action.actionId,
      mindscapeRank: 0,
      levels: {
        basic: { mode: "trained", value: 12 },
        dodge: { mode: "trained", value: 12 },
        assist: { mode: "trained", value: 12 },
        special: { mode: "trained", value: 12 },
        chain: { mode: "trained", value: 12 },
      },
    }),
    target: {
      entityId: "entity:target",
      teamId: "team:enemies",
      baseDefense: 1000,
      resistances: {
        "physical": 0,
        "fire": 0,
        "ice": 0,
        "electric": 0,
        "ether": 0,
        "auric-ink": 0,
        "wind": 0,
        "frost": 0,
        "lumiflux": 0,
      },
      isStunned: false,
      baseStunDamageMultiplier: 1,
    },
    selections: [],
  }
}
function calculate(
  input: StaticActionCalculationInput,
): Extract<StaticActionCalculationResult, { kind: "damage" }> {
  const result = calculateStaticActionDamage(input)
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok || result.value.kind !== "damage")
    throw new Error(JSON.stringify(result))
  return result.value
}
function manual(
  actor: StaticActorConfiguration,
  panel: StaticActionCalculationResult["panels"][number],
): StaticActorConfiguration {
  return {
    ...actor,
    panel: {
      mode: "out-of-combat",
      stats: panel.stats,
      penetrationValue: panel.penetrationValue,
      damageBonuses: panel.damageBonuses,
    },
  }
}

describe("static calculation assembly", () => {
  it.each([
    [0, 6],
    [6, 0],
    [0, 1],
  ] as const)(
    "rejects configured mindscape %i with an action resolved for %i",
    async (configuredRank, resolvedRank) => {
      const input = await fixture("1031")
      const actor = input.actors[0]!
      const action = resolveAgentAction({
        agent: input.data.agents[0]!.actions,
        actionId: "action:agent:1031:basic-enhanced-1",
        mindscapeRank: resolvedRank,
        levels: { basic: { mode: "trained", value: 12 } },
      })
      // Matching contexts remain valid, including different ranks with identical skill bonuses.
      calculate({
        ...input,
        action,
        actors: [{ ...actor, mindscapeRank: resolvedRank }],
      })
      expect(
        calculateStaticActionDamage({
          ...input,
          action,
          actors: [{ ...actor, mindscapeRank: configuredRank }],
        }),
      ).toMatchObject({
        ok: false,
        issues: [
          { code: "CONTEXT_MISMATCH", pointer: "/action/resolutionContext" },
        ],
      })
    },
  )

  it("rejects missing or foreign action resolution contexts", async () => {
    const input = await fixture()
    if (!input.action.ok) throw new Error("Expected resolved action")
    for (const resolutionContext of [
      undefined,
      { ...input.action.resolutionContext, agentEntityId: "1031" },
    ])
      expect(
        calculateStaticActionDamage({
          ...input,
          action: { ...input.action, resolutionContext },
        } as unknown as StaticActionCalculationInput),
      ).toMatchObject({
        ok: false,
        issues: [
          { code: "CONTEXT_MISMATCH", pointer: "/action/resolutionContext" },
        ],
      })
  })

  it.each([
    ["1371", "auric-ink", "ether", "32300"],
    ["1091", "frost", "ice", "32500"],
  ] as const)(
    "inherits %s elemental main stats and two-piece bonuses",
    async (id, special, base, setId) => {
      const input = await fixture(id)
      const actor: StaticActorConfiguration = {
        ...input.actors[0]!,
        driveDiscs: {
          ...emptyDiscs,
          1: {
            setEntityId: setId,
            mainStat: { attribute: "health" },
            substats: [],
          },
          5: {
            setEntityId: setId,
            mainStat: { attribute: "damageBonus", element: base },
            substats: [],
          },
        },
      }
      const result = calculate({ ...input, actors: [actor] })
      expect(result.panels[0]!.damageBonuses[base]).toBeCloseTo(0.4)
      expect(result.panels[0]!.damageBonuses[special]).toBeCloseTo(0.4)
      expect(
        calculate({ ...input, actors: [manual(actor, result.panels[0]!)] })
          .totals,
      ).toEqual(result.totals)
      expect(input.action.ok && input.action.calculation.kind).toBe("damage")
      if (input.action.ok && input.action.calculation.kind === "damage")
        expect(input.action.calculation.segments[0]!.element).toBe(special)
      const settledActor = manual(actor, result.panels[0]!)
      if (settledActor.panel.mode !== "out-of-combat") throw new Error("panel")
      const inherited = calculate({
        ...input,
        actors: [
          {
            ...settledActor,
            panel: { ...settledActor.panel, damageBonuses: { [base]: 0.4 } },
          },
        ],
        target: { ...input.target, resistances: { [base]: 0.2 } },
      })
      const explicit = calculate({
        ...input,
        actors: [
          {
            ...settledActor,
            panel: {
              ...settledActor.panel,
              damageBonuses: { [base]: 0.8, [special]: 0.4 },
            },
          },
        ],
        target: {
          ...input.target,
          resistances: { [base]: 0.8, [special]: 0.2 },
        },
      })
      expect(inherited.totals).toEqual(explicit.totals)
      expect(inherited.totals.expected).toBeCloseTo(
        result.totals.expected * 0.8,
      )
    },
  )

  it.each([
    [[31000, 31000, 31400, 31400, 31400, 31400], 2],
    [[31000, 31000, 31400, 31400, 34200, 34200], 3],
    [[31400, 31400, 31400, 31400, 31400, 31400], 1],
  ] as const)("settles each two-piece set once for %j", async (sets, count) => {
    const input = await fixture()
    const discs = Object.fromEntries(
      sets.map((id, index) => {
        const slot = (index + 1) as 1 | 2 | 3 | 4 | 5 | 6
        const bonus = input.data.driveDiscAffixes.mainStatsBySlot[slot][0]!
        return [
          slot,
          {
            setEntityId: String(id),
            mainStat: {
              attribute: bonus.attribute,
              ...(bonus.attribute === "damageBonus"
                ? { element: bonus.element }
                : {}),
            },
            substats: [],
          },
        ]
      }),
    ) as unknown as StaticActorConfiguration["driveDiscs"]
    const actor = { ...input.actors[0]!, driveDiscs: discs }
    const result = calculate({ ...input, actors: [actor] })
    const panel = result.panels[0]!
    expect(
      panel.contributions.filter((c) => c.origin.effectId.startsWith("disc:")),
    ).toHaveLength(count)
    const fourPieceIds = new Set(
      input.data.catalog.options.flatMap((o) =>
        o.variants
          .filter((v) => v.configuration.minimumSetPieces === 4)
          .flatMap((v) => v.effectIds),
      ),
    )
    expect(
      result.segments
        .flatMap((s) => s.damage.evaluation.contributions)
        .some((c) => fourPieceIds.has(c.origin.effectId)),
    ).toBe(false)
    expect(
      calculate({ ...input, actors: [manual(actor, panel)] }).totals,
    ).toEqual(result.totals)
  })

  it("distinguishes flat and percentage substats of the same attribute", async () => {
    const input = await fixture()
    const base = {
      setEntityId: "31400",
      mainStat: { attribute: "health" as const },
      substats: [],
    }
    const first = calculate({
      ...input,
      actors: [{ ...input.actors[0]!, driveDiscs: { ...emptyDiscs, 1: base } }],
    })
    const result = calculate({
      ...input,
      actors: [
        {
          ...input.actors[0]!,
          driveDiscs: {
            ...emptyDiscs,
            1: {
              ...base,
              substats: [
                { attribute: "attack", operation: "initial-fixed", rolls: 1 },
                {
                  attribute: "attack",
                  operation: "initial-percentage",
                  rolls: 1,
                },
              ],
            },
          },
        },
      ],
    })
    expect(
      result.panels[0]!.stats.attack!.value -
        first.panels[0]!.stats.attack!.value,
    ).toBeCloseTo(19 + 653.0866 * 0.03, 8)
  })

  it("uses the sourced permanent conversion and preserves input precision and immutability", async () => {
    const input = await fixture()
    const before = structuredClone(input)
    const result = calculate(input)
    expect(result.panels[0]!.stats.attack!.value).toBeCloseTo(1232.31468, 8)
    expect(
      result.panels[0]!.contributions.some(
        (c) => c.origin.effectId === "agent:1121:permanent:defense-to-attack",
      ),
    ).toBe(true)
    const second = calculate({
      ...input,
      actors: [manual(input.actors[0]!, result.panels[0]!)],
    })
    expect(second.segments).toEqual(result.segments)
    expect(input).toEqual(before)
  })

  it("includes two-piece defense before Ben's initial conversion and applies each set once", async () => {
    const input = await fixture()
    const actor = input.actors[0]!
    const equipped: StaticActorConfiguration = {
      ...actor,
      driveDiscs: {
        ...emptyDiscs,
        1: {
          setEntityId: "34200",
          mainStat: { attribute: "health" },
          substats: [],
        },
        3: {
          setEntityId: "34200",
          mainStat: { attribute: "defense" },
          substats: [],
        },
      },
    }
    const result = calculate({ ...input, actors: [equipped] })
    const panel = result.panels[0]!
    // Ben's F-core attack baseline is 653.0866; the passive converts 80% of settled initial defense.
    expect(panel.stats.attack!.value).toBeCloseTo(
      653.0866 + panel.stats.defense!.value * 0.8,
      8,
    )
    expect(
      panel.contributions.filter(
        (c) =>
          c.origin.effectId.startsWith("disc:34200:") &&
          c.address.kind === "stat",
      ),
    ).toHaveLength(1)
    const second = calculate({ ...input, actors: [manual(equipped, panel)] })
    expect(second.totals).toEqual(result.totals)
  })

  it("retains settled sheer force without repeating its health/attack conversion", async () => {
    const input = await fixture("1371")
    const result = calculate(input)
    const panel = result.panels[0]!
    expect(panel.stats.sheerForce!.value).toBeCloseTo(
      panel.stats.health!.value * 0.1 + panel.stats.attack!.value * 0.3,
      8,
    )
    const second = calculate({
      ...input,
      actors: [manual(input.actors[0]!, panel)],
    })
    expect(second.totals).toEqual(result.totals)
  })

  it("keeps elemental two-piece bonuses in the panel and avoids double counting on the manual path", async () => {
    const input = await fixture()
    const actor = {
      ...input.actors[0]!,
      driveDiscs: {
        ...emptyDiscs,
        1: {
          setEntityId: "32200",
          mainStat: { attribute: "health" as const },
          substats: [],
        },
        2: {
          setEntityId: "32200",
          mainStat: { attribute: "attack" as const },
          substats: [],
        },
      },
    }
    const withoutTwoPiece = calculate({
      ...input,
      actors: [
        {
          ...actor,
          driveDiscs: {
            ...actor.driveDiscs,
            2: equippedDisc("32300", "attack"),
          },
        },
      ],
    })
    const result = calculate({ ...input, actors: [actor] })
    expect(result.panels[0]!.damageBonuses.fire).toBe(0.1)
    expect(
      result.totals.nonCritical / withoutTwoPiece.totals.nonCritical,
    ).toBeCloseTo(1.1, 12)
    const second = calculate({
      ...input,
      actors: [manual(actor, result.panels[0]!)],
    })
    expect(second.totals).toEqual(result.totals)
  })

  it("applies a selected four-piece attack buff after settling the panel", async () => {
    const input = await fixture()
    const actor: StaticActorConfiguration = {
      ...input.actors[0]!,
      driveDiscs: {
        ...emptyDiscs,
        1: equippedDisc("31400", "health"),
        2: equippedDisc("31400", "attack"),
        3: equippedDisc("31400", "defense"),
        4: equippedDisc("31400", "attack"),
      },
    }
    const base = calculate({ ...input, actors: [actor] })
    const selections = [
      {
        holderId: actor.entityId,
        optionId:
          "drive-discs:hormone:setPieces:4:blk-legacy:legacy-self-inCombatAtkPercent",
        layers: 1,
      },
    ]
    const buffed = calculate({ ...input, actors: [actor], selections })
    expect(buffed.totals.nonCritical / base.totals.nonCritical).toBeCloseTo(
      1.25,
      12,
    )
    expect(buffed.panels).toEqual(base.panels)
    expect(
      calculate({
        ...input,
        actors: [manual(actor, base.panels[0]!)],
        selections,
      }).totals,
    ).toEqual(buffed.totals)
  })

  it("reproduces Nicole's observed 342 + 144 × 3 through the complete calculation", async () => {
    const input = await fixture("1031")
    const actor: StaticActorConfiguration = {
      ...input.actors[0]!,
      mindscapeRank: 6,
      panel: {
        mode: "out-of-combat",
        stats: {
          attack: { unit: "attack-points", value: 649.1691 },
          penetrationRatio: { unit: "ratio", value: 0 },
          criticalRate: { unit: "ratio", value: 0 },
          criticalDamage: { unit: "ratio", value: 0.5 },
        },
        penetrationValue: 0,
        damageBonuses: { physical: 0 },
      },
    }
    const action = resolveAgentAction({
      agent: input.data.agents[0]!.actions,
      actionId: "action:agent:1031:basic-enhanced-1",
      mindscapeRank: 6,
      levels: { basic: { mode: "effective", value: 15 } },
      requireIndividualHits: true,
    })
    // Independent observed values are recorded in docs/specs/data/skill-actions.md.
    const result = calculate({
      ...input,
      actors: [actor],
      action,
      target: { ...input.target, baseDefense: 921.04 },
      requireIndividualHits: true,
      selections: [
        {
          holderId: actor.entityId,
          optionId:
            "agents:nicole:mindscape:0:blk-legacy:legacy-team-reduceDefense",
          layers: 1,
        },
      ],
    })
    expect(
      result.segments.map((segment) => Math.ceil(segment.damage.nonCritical)),
    ).toEqual([342, 144, 144, 144])
    expect(result.totals.displayedNonCritical).toBe(774)
  })

  it("rejects an active per-hit addition on an aggregate action", async () => {
    const input = await fixture("1161")
    if (!input.action.ok) throw new Error("Expected resolved action")
    const actor: StaticActorConfiguration = {
      ...input.actors[0]!,
      mindscapeRank: 6,
    }
    const action = resolveAgentAction({
      agent: input.data.agents[0]!.actions,
      actionId: input.action.actionId,
      mindscapeRank: 6,
      levels: { assist: { mode: "trained", value: 12 } },
    })
    // The aggregate action is valid until Lighter's per-hit extra damage is selected.
    calculate({ ...input, actors: [actor], action })
    const result = calculateStaticActionDamage({
      ...input,
      actors: [actor],
      action,
      selections: [
        {
          holderId: actor.entityId,
          optionId:
            "agents:lighter:mindscape:6:blk-ms4b3uc2-5gulzo:eff-ms4b3uc2-oeaiao",
          layers: 1,
        },
      ],
    })
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(
        result.issues.some((issue) => issue.message.includes("per-hit")),
      ).toBe(true)
  })

  it("applies conditional two-piece damage only to the matching skill category", async () => {
    const input = await fixture()
    const actor: StaticActorConfiguration = {
      ...input.actors[0]!,
      driveDiscs: {
        ...emptyDiscs,
        1: equippedDisc("33300", "health"),
        2: equippedDisc("32300", "attack"),
      },
    }
    const equipped = {
      ...actor,
      driveDiscs: { ...actor.driveDiscs, 2: equippedDisc("33300", "attack") },
    }
    const agent = input.data.agents[0]!.actions
    const basic = agent.actions.find(
      (action) =>
        action.skillCategory === "basic" &&
        action.calculation.kind === "damage" &&
        action.inputs.length === 0,
    )!
    const action = resolveAgentAction({
      agent,
      actionId: basic.actionId,
      mindscapeRank: 0,
      levels: { basic: { mode: "trained", value: 12 } },
    })
    const base = calculate({ ...input, actors: [actor], action })
    const buffed = calculate({ ...input, actors: [equipped], action })
    expect(buffed.totals.nonCritical / base.totals.nonCritical).toBeCloseTo(
      1.15,
      12,
    )
    expect(calculate({ ...input, actors: [equipped] }).totals).toEqual(
      calculate({ ...input, actors: [actor] }).totals,
    )
  })

  it("rejects incompatible versions, battle panels, illegal units and unverified hit splitting", async () => {
    const input = await fixture()
    for (const version of [
      { ...input.data.version, packageVersion: "99.0.0" },
      { ...input.data.version, contractVersion: 2 as 1 },
      { ...input.data.version, gameVersion: "unknown" },
      { ...input.data.version, snapshotId: "" },
    ]) {
      expect(
        calculateStaticActionDamage({
          ...input,
          data: { ...input.data, version },
        }).ok,
      ).toBe(false)
    }
    const wrong = {
      ...input,
      actors: [{ ...input.actors[0]!, panel: { mode: "in-combat" } }],
    }
    expect(
      calculateStaticActionDamage(
        wrong as unknown as StaticActionCalculationInput,
      ).ok,
    ).toBe(false)
    const result = calculate(input)
    const actor = manual(input.actors[0]!, result.panels[0]!)
    const corrupt = structuredClone(actor) as unknown as {
      panel: { stats: { attack: { unit: string } } }
    }
    corrupt.panel.stats.attack.unit = "ratio"
    expect(
      calculateStaticActionDamage({
        ...input,
        actors: [corrupt as unknown as StaticActorConfiguration],
      }).ok,
    ).toBe(false)
    if (
      input.action.ok &&
      input.action.calculation.kind === "damage" &&
      input.action.calculation.segments.some(
        (s) => s.granularity === "aggregate",
      )
    ) {
      expect(
        calculateStaticActionDamage({ ...input, requireIndividualHits: true })
          .ok,
      ).toBe(false)
    }
  })
})
