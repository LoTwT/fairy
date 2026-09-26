import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { loadStaticCalculationData, resolveAgentAction } from "../src/index.ts"
import {
  calculateStaticActionDamage,
  staticSourceBindingId,
} from "../../core/src/index.ts"
import type {
  StaticActionCalculationInput,
  StaticActionCalculationResult,
  StaticActorConfiguration,
  StaticPanelValues,
} from "../../core/src/index.ts"
import { STAT_UNIT_MAP } from "@randomplay/shared"
import { builds, effects, scenarios } from "./fixtures/static-e2e-cases.ts"
import type { AcceptanceScenario } from "./fixtures/static-e2e-cases.ts"

interface ReferencePanel {
  stats: Record<string, number>
  penetrationValue: number
  damageBonuses: Record<string, number>
}
interface ReferenceDamage {
  action: {
    multipliers: number[]
    effectiveLevel: number
    element: string
    individual: boolean
  }
  conversionBase: number | null
  contributions: {
    optionId: string
    holderId: string
    pointer: string
    stat: string
    sourceValue: number
  }[]
  finalStats: Record<string, number>
  factors: Record<string, number>
  hits: { nonCritical: number; critical: number; expected: number }[]
  totals: {
    nonCritical: number
    critical: number
    expected: number
    displayedNonCritical: number | null
    displayedCritical: number | null
  }
}
const reference = JSON.parse(
  readFileSync(
    new URL("./fixtures/static-e2e-reference.json", import.meta.url),
    "utf8",
  ),
) as {
  provenance: { repository: string; commit: string }
  builds: Record<string, { panel: ReferencePanel; permanentConversion: number }>
  cases: Record<
    string,
    {
      reference: ReferenceDamage
      upstreamAlignedTotals: ReferenceDamage["totals"]
      upstreamAttackConversion?: number
    }
  >
}

async function inputFor(
  scenario: AcceptanceScenario,
): Promise<StaticActionCalculationInput> {
  const selected = scenario.buildIds.map((id) => builds[id]!)
  const actor = selected[0]!.actor
  const data = await loadStaticCalculationData({
    agents: selected.map((b) => b.agentName),
    wEngines: [...new Set(selected.map((b) => b.wEngineName))],
  })
  expect(data.version).toEqual({
    packageVersion: "0.2.1",
    contractVersion: 1,
    gameVersion: "3.1",
    snapshotId:
      "sha256:ee99ec1e02f16aaef496dbdcb42d6bb20c2b0c7022ad9bf76cfa541daa9f41fe",
  })
  expect(data.catalog.source.commit).toBe(reference.provenance.commit)
  expect(data.catalog.source.repository).toBe(reference.provenance.repository)
  const expected = reference.cases[scenario.id]!.reference
  return {
    data,
    actors: selected.map((b) => b.actor),
    actorId: actor.entityId,
    action: resolveAgentAction({
      agent: data.agents.find(
        (a) => a.actions.entityId === actor.agentEntityId,
      )!.actions,
      actionId: scenario.actionId,
      mindscapeRank: actor.mindscapeRank,
      levels: scenario.levels,
      requireIndividualHits: expected.action.individual,
    }),
    target: scenario.target,
    selections: scenario.buffs.map(({ effect, layers }) => ({
      holderId: effects[effect].holderId,
      optionId: effects[effect].optionId,
      layers,
    })),
    inputs:
      expected.conversionBase === null
        ? []
        : [
            {
              bindingId: staticSourceBindingId("entity:astra", "agent", "1311"),
              name: "agent:1311:zzz-hp:eff-ms38hwcr-m9hn4v:blk-ms38hwcr-q7y9sx:mindscape:0:source",
              value: { unit: "attack-points", value: expected.conversionBase },
            },
          ],
    requireIndividualHits: expected.action.individual,
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
function settledActor(
  actor: StaticActorConfiguration,
  panel: ReferencePanel,
): StaticActorConfiguration {
  const stats = Object.fromEntries(
    Object.entries(panel.stats).map(([stat, value]) => [
      stat,
      { unit: STAT_UNIT_MAP[stat as keyof typeof STAT_UNIT_MAP], value },
    ]),
  ) as StaticPanelValues
  return {
    ...actor,
    panel: {
      mode: "out-of-combat",
      stats,
      penetrationValue: panel.penetrationValue,
      damageBonuses: { physical: 0, fire: 0, ether: 0, ...panel.damageBonuses },
    },
  }
}
function close(
  actual: number | null | undefined,
  expected: number,
  label: string,
) {
  expect(typeof actual, label).toBe("number")
  // Only floating-point operation order is tolerated; display integers use exact equality.
  expect(Math.abs(actual! - expected), label).toBeLessThanOrEqual(
    Math.max(1e-9, Math.abs(expected) * 1e-12),
  )
}

describe("complete static configurations against an independent pinned ZZZ-HP reference", () => {
  for (const scenario of scenarios)
    it(scenario.label, async () => {
      const input = await inputFor(scenario)
      const unchanged = structuredClone(input)
      const expected = reference.cases[scenario.id]!.reference
      const result = calculate(input)
      expect(input).toEqual(unchanged)
      for (const [index, buildId] of scenario.buildIds.entries()) {
        const panel = result.panels[index]!
        const baseline = reference.builds[buildId]!
        for (const [stat, value] of Object.entries(baseline.panel.stats))
          close(
            panel.stats[stat as keyof StaticPanelValues]?.value,
            value,
            `${buildId} panel ${stat}`,
          )
        close(
          panel.penetrationValue,
          baseline.panel.penetrationValue,
          `${buildId} penetration`,
        )
        for (const [element, value] of Object.entries(
          baseline.panel.damageBonuses,
        ))
          close(
            panel.damageBonuses[element as keyof typeof panel.damageBonuses],
            value,
            `${buildId} ${element} bonus`,
          )
        if (baseline.permanentConversion !== 0) {
          const conversions = panel.contributions.filter(
            (c) =>
              c.origin.effectId === "agent:1121:permanent:defense-to-attack",
          )
          expect(conversions).toHaveLength(1)
          close(
            conversions[0]!.value.value,
            baseline.permanentConversion,
            "Ben permanent conversion",
          )
        }
      }
      expect(input.action.ok).toBe(true)
      if (!input.action.ok || input.action.calculation.kind !== "damage")
        throw new Error("Expected an available damage action")
      expect(
        Object.values(input.action.levels).map((level) => level.effective),
      ).toEqual([expected.action.effectiveLevel])
      close(
        input.action.sourceDamageMultiplier,
        expected.action.multipliers.reduce((sum, value) => sum + value, 0),
        "source action total",
      )
      const resolvedMultipliers = input.action.calculation.segments.flatMap(
        (s) =>
          Array(s.repeat).fill(s.damageItems[0]!.damageMultiplier) as number[],
      )
      expect(resolvedMultipliers).toHaveLength(
        expected.action.multipliers.length,
      )
      resolvedMultipliers.forEach((value, index) =>
        close(value, expected.action.multipliers[index]!, "action multiplier"),
      )
      expect(
        input.action.calculation.segments.every(
          (s) => s.element === expected.action.element,
        ),
      ).toBe(true)
      expect(result.segments).toHaveLength(expected.hits.length)
      for (const [index, segment] of result.segments.entries()) {
        const damage = segment.damage
        const hit = expected.hits[index]!
        close(damage.nonCritical, hit.nonCritical, "noncritical hit")
        close(damage.critical, hit.critical, "critical hit")
        close(damage.expected, hit.expected, "expected hit")
        const item = damage.evaluation.hit!.damageItems[0]!
        close(
          item.finalStat,
          expected.finalStats[
            expected.action.element === "auric-ink" ? "sheerForce" : "attack"
          ]!,
          "final scaling stat",
        )
        for (const [factor, value] of Object.entries(expected.factors)) {
          if (factor === "expectedCritical")
            close(
              1 +
                damage.criticalRate *
                  (damage.factors.critical!["critical"]! - 1),
              value,
              factor,
            )
          else if (
            factor === "defense" &&
            expected.action.element === "auric-ink"
          )
            expect(damage.factors.nonCritical["defense"]).toBeUndefined()
          else
            close(
              (factor === "critical"
                ? damage.factors.critical
                : damage.factors.nonCritical)![factor],
              value,
              factor,
            )
        }
        for (const contribution of expected.contributions) {
          // Dependency-only attack contributions are intentionally absent from the public
          // contribution list for a sheer hit. The final sheer value and its delta are checked.
          if (
            expected.action.element === "auric-ink" &&
            contribution.stat === "atk"
          )
            continue
          const option = input.data.catalog.options.find(
            (o) => o.optionId === contribution.optionId,
          )!
          const ids = new Set(option.variants.flatMap((v) => v.effectIds))
          const received = damage.evaluation.contributions.filter(
            (c) =>
              ids.has(c.origin.effectId) &&
              c.origin.beneficiaryId === input.actorId,
          )
          expect(received.length, contribution.optionId).toBeGreaterThan(0)
          const amount =
            (contribution.sourceValue *
              (contribution.stat === "reduceDefense" ? -1 : 1)) /
            (contribution.stat === "atk" ? 1 : 100)
          close(
            received.reduce((sum, c) => sum + c.value.value, 0),
            amount,
            contribution.optionId,
          )
        }
        if (expected.action.individual) {
          expect(Math.ceil(damage.nonCritical)).toBe(Math.ceil(hit.nonCritical))
          expect(Math.ceil(damage.critical!)).toBe(Math.ceil(hit.critical))
        }
      }
      for (const field of ["nonCritical", "critical", "expected"] as const)
        close(result.totals[field], expected.totals[field], field)
      expect(result.totals.displayedNonCritical).toBe(
        expected.totals.displayedNonCritical,
      )
      expect(result.totals.displayedCritical).toBe(
        expected.totals.displayedCritical,
      )
      // The settled inputs also come from the independent reference, never from Fairy's output.
      const settled = calculate({
        ...input,
        actors: input.actors.map((actor, index) =>
          settledActor(
            actor,
            reference.builds[scenario.buildIds[index]!]!.panel,
          ),
        ),
      })
      for (const field of ["nonCritical", "critical", "expected"] as const)
        close(settled.totals[field], expected.totals[field], `settled ${field}`)
      expect(settled.totals.displayedNonCritical).toBe(
        expected.totals.displayedNonCritical,
      )
      expect(settled.totals.displayedCritical).toBe(
        expected.totals.displayedCritical,
      )
    })

  it("isolates one R3 stack, the M2 correction, and new attack-to-sheer contribution", async () => {
    const run = async (id: string) =>
      calculate(await inputFor(scenarios.find((s) => s.id === id)!))
    const one = await run("nicole-team-one")
    const two = await run("nicole-team-two")
    close(
      two.totals.nonCritical / one.totals.nonCritical,
      1.96 / 1.83,
      "one additional 13% damage stack",
    )
    const m2 = await run("nicole-astra-m2")
    const source = reference.cases["nicole-astra-m2"]!
    expect(source.upstreamAttackConversion).toBe(1600)
    close(
      m2.totals.expected,
      source.upstreamAlignedTotals.expected,
      "Astra M2 agrees with the fixed upstream",
    )
    const self = await run("yixuan-self")
    const team = await run("yixuan-team")
    close(
      team.segments[0]!.damage.evaluation.hit!.damageItems[0]!.finalStat -
        self.segments[0]!.damage.evaluation.hit!.damageItems[0]!.finalStat,
      1200 * 0.3,
      "only new attack contributes to sheer force",
    )
  })

  it.each([
    ["nicoleHormone", 1.25],
    ["vault", 1.5 / 1.3],
    ["nicoleDefense", (794 + 921.04 - 18) / (794 + 921.04 * 0.6 - 18)],
  ] as const)(
    "turning off %s removes only its independent contribution",
    async (effect, ratio) => {
      const input = await inputFor(
        scenarios.find((s) => s.id === "nicole-self")!,
      )
      const selected = calculate(input)
      const disabled = calculate({
        ...input,
        selections: input.selections.filter(
          (s) => s.optionId !== effects[effect].optionId,
        ),
      })
      close(
        selected.totals.nonCritical / disabled.totals.nonCritical,
        ratio,
        effect,
      )
      expect(selected.panels).toEqual(disabled.panels)
    },
  )
})
