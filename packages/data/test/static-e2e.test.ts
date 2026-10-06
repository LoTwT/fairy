import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { loadStaticCalculationData, resolveAgentAction } from "../src/index.ts"
import {
  calculateStaticActionDamage,
  staticSourceBindingId,
} from "../../core/src/index.ts"
import type {
  RemielleSpecialVoidflareAnomalySource,
  StaticActionCalculationInput,
  StaticActionCalculationResult,
  StaticActorConfiguration,
  StaticCatalogDamageInput,
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
    gameVersion: "3.2",
    snapshotId:
      "sha256:360ba2a28482b2421fd3270e6d736fc335b9bdbf0a90197e2566979d866b3e5b",
  })
  expect(data.catalog.source.commit).toBe(reference.provenance.commit)
  expect(data.catalog.source.repository).toBe(reference.provenance.repository)
  const expected = reference.cases[scenario.id]!.reference
  const luminize: StaticActionCalculationInput["luminize"] | undefined =
    scenario.luminize
      ? {
          hit: {
            element: "lumiflux" as const,
            damageItems: [
              {
                mode: "direct" as const,
                role: "base" as const,
                itemId: "special-voidflare",
                stat: "attack" as const,
                statSource: { entityId: actor.entityId },
                damageMultiplier: 1,
              },
            ],
          },
          damage: {
            kind: "luminize" as const,
            damageBonus: [],
            anomalyDamageBonus: [],
            refringe: { mode: "from-effects" as const },
            anomalySource: {
              mechanism: "remielle-special-voidflare" as const,
              entityId: actor.entityId,
              level: 60,
              strength: scenario.luminize.strength,
            },
            luminizeMultiplier: {
              baseLuminizeMultiplier: expected.action.multipliers[0]!,
              multiplicativeLuminizeMultiplierAdjustments: [],
            },
            // 特殊虚曜分支：防御等级唯一来自具名来源，不提供 attackerLevel。
            defense: {
              targetBaseDefense: scenario.target.baseDefense,
              defensePercentageAdjustments: [],
              penetrationValues: [],
            },
            resistance: {
              targetResistance: scenario.luminize.equivalentElementResistance,
              targetResistanceReductions: [],
              attackerResistanceIgnoreValues: [],
            },
            damageTaken: {
              targetDamageTakenIncreases: [],
              targetDamageTakenReductions: [],
            },
            stunDamage: {
              isTargetStunned: scenario.target.isStunned,
              targetBaseStunDamageMultiplier:
                scenario.target.baseStunDamageMultiplier,
              targetStunDamageMultiplierAdjustments: [],
            },
          },
        }
      : undefined
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
    inputs: luminize
      ? [
          {
            bindingId: staticSourceBindingId(
              actor.entityId,
              "agent",
              actor.agentEntityId,
            ),
            name: "agent:1581:zzz-hp:eff-ms7td2gs-4vbpdh:blk-ms7td2gs-rk1vtd:mindscape:0:source",
            value: { unit: "attack-points", value: expected.conversionBase! },
          },
        ]
      : expected.conversionBase === null
        ? []
        : [
            {
              bindingId: staticSourceBindingId("entity:astra", "agent", "1311"),
              name: "agent:1311:zzz-hp:eff-ms38hwcr-m9hn4v:blk-ms38hwcr-q7y9sx:mindscape:0:source",
              value: { unit: "attack-points", value: expected.conversionBase },
            },
          ],
    requireIndividualHits: expected.action.individual,
    ...(luminize ? { luminize } : {}),
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
type LuminizeCatalogDamage = Extract<
  StaticCatalogDamageInput["damage"],
  { readonly kind: "luminize" }
>
type SpecialVoidflareLuminizeDamage = Extract<
  LuminizeCatalogDamage,
  { readonly anomalySource: RemielleSpecialVoidflareAnomalySource }
>
function isSpecialVoidflareDamage(
  damage: LuminizeCatalogDamage,
): damage is SpecialVoidflareLuminizeDamage {
  return damage.anomalySource.mechanism !== undefined
}
/** 端到端耀变场景均为具名机制输入；返回已收窄的具名分支成员。 */
function luminizeDamageOf(
  input: StaticActionCalculationInput,
): SpecialVoidflareLuminizeDamage {
  const damage = input.luminize!.damage
  if (damage.kind !== "luminize")
    throw new Error("Expected the luminize damage")
  if (!isSpecialVoidflareDamage(damage))
    throw new Error("Expected the special Voidflare source")
  return damage
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
  it.each([
    ["nicole-self", "Caesar", "1071", 2, 2, 0, 135, 67.5],
    ["yixuan-self", "Pan Yinhu", "1421", 6, 6, 3200, 528, 192],
    ["yixuan-self", "Pan Yinhu", "1421", 6, 1, 4800, 432, 288],
    ["yixuan-self", "Pan Yinhu", "1421", 6, 7, 3200, 540, 180],
  ] as const)(
    "%s with %s (%s) core-dependent buffs at M%i/core%i preserves complete build and settled-panel equivalence",
    async (
      scenarioId,
      agentName,
      agentEntityId,
      mindscapeRank,
      coreSkillLevel,
      initialAttack,
      baseAmount,
      increment,
    ) => {
      const scenario = scenarios.find((entry) => entry.id === scenarioId)!
      const base = await inputFor(scenario)
      const build = builds[scenario.buildIds[0]!]!
      const expected = reference.cases[scenarioId]!.reference
      const data = await loadStaticCalculationData({
        agents: [build.agentName, agentName],
        wEngines: [build.wEngineName],
      })
      const support: StaticActorConfiguration = {
        entityId: "entity:core-support",
        teamId: base.actors[0]!.teamId,
        agentEntityId,
        mindscapeRank,
        coreSkillLevel,
        wEngine: null,
        driveDiscs: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
        // 显式初始攻击与当前来源面板故意不同，防止误读面板替代施加时读数。
        panel: {
          mode: "out-of-combat",
          stats: {
            attack: { unit: "attack-points", value: 2000 },
            health: { unit: "health-points", value: 10000 },
          },
          penetrationValue: 0,
          damageBonuses: { physical: 0, ether: 0 },
        },
      }
      const agentKey = agentEntityId === "1071" ? "caesar" : "panyinhu"
      const effectKey =
        agentEntityId === "1071" ? "legacy-team-atk" : "legacy-team-pierce"
      const optionIds = [0, mindscapeRank].map(
        (rank) =>
          `agents:${agentKey}:mindscape:${rank}:blk-legacy:${effectKey}`,
      )
      const inputs: StaticActionCalculationInput["inputs"] =
        agentEntityId === "1071"
          ? []
          : [0, 6].map((rank) => ({
              bindingId: staticSourceBindingId(
                support.entityId,
                "agent",
                agentEntityId,
              ),
              name: `agent:${agentEntityId}:zzz-hp:${effectKey}:blk-legacy:mindscape:${rank}:source`,
              value: { unit: "attack-points", value: initialAttack },
            }))
      for (const [selected, increase] of [
        [[], 0],
        [[optionIds[0]!], baseAmount],
        [[optionIds[1]!], increment],
        [optionIds, baseAmount + increment],
      ] as const) {
        const input: StaticActionCalculationInput = {
          ...base,
          data,
          actors: [...base.actors, support],
          inputs,
          selections: [
            ...base.selections,
            ...selected.map((optionId) => ({
              holderId: support.entityId,
              optionId,
              layers: 1,
            })),
          ],
        }
        const finalStat =
          expected.finalStats[
            agentEntityId === "1071" ? "attack" : "sheerForce"
          ]!
        for (const actors of [
          input.actors,
          [
            settledActor(
              base.actors[0]!,
              reference.builds[scenario.buildIds[0]!]!.panel,
            ),
            support,
          ],
        ]) {
          const result = calculate({ ...input, actors })
          for (const field of ["nonCritical", "critical", "expected"] as const)
            close(
              result.totals[field],
              (expected.totals[field] * (finalStat + increase)) / finalStat,
              `core buff ${field}`,
            )
          for (const segment of result.segments)
            close(
              segment.damage.evaluation.hit!.damageItems[0]!.finalStat,
              finalStat + increase,
              "core buff final stat",
            )
          close(
            result.panels[0]!.stats.attack!.value,
            reference.builds[scenario.buildIds[0]!]!.panel.stats["attack"]!,
            "unchanged out-of-combat attack",
          )
        }
      }
      if (agentEntityId === "1421") {
        const missing = calculateStaticActionDamage({
          ...base,
          data,
          actors: [...base.actors, support],
          selections: [
            ...base.selections,
            { holderId: support.entityId, optionId: optionIds[1]!, layers: 1 },
          ],
          inputs: [],
        })
        expect(missing.ok).toBe(false)
        if (!missing.ok)
          expect(
            missing.issues.some((issue) => issue.code === "MISSING_FACT"),
          ).toBe(true)
      }
    },
    // 完整数据加载与四种选择 × 两种面板计算在 CI 并行负载下可超过默认 5 秒。
    30_000,
  )
  for (const scenario of scenarios.filter((entry) => !entry.luminize))
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
      const sharpen = input.action.calculation.segments.some(
        (segment) => segment.damageKind === "sharpen",
      )
      const criticalFactorKey = sharpen ? "sharpCritical" : "critical"
      for (const [index, segment] of result.segments.entries()) {
        const damage = segment.damage
        expect(damage.criticalSemantics).toBe(
          sharpen ? "sharp-critical-forced-first-layer" : "critical-hit",
        )
        const hit = expected.hits[index]!
        close(damage.nonCritical, hit.nonCritical, "noncritical hit")
        close(damage.critical, hit.critical, "critical hit")
        close(damage.expected, hit.expected, "expected hit")
        const item = damage.evaluation.hit!.damageItems[0]!
        close(
          item.finalStat,
          expected.finalStats[
            sharpen
              ? "defense"
              : expected.action.element === "auric-ink"
                ? "sheerForce"
                : "attack"
          ]!,
          "final scaling stat",
        )
        for (const [factor, value] of Object.entries(expected.factors)) {
          if (factor === "expectedCritical")
            close(
              1 +
                damage.criticalRate *
                  (damage.factors.critical![criticalFactorKey]! - 1),
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
              (["critical", "sharpCritical"].includes(factor)
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

describe("remielle special Voidflare scenarios against the independent reference", () => {
  const voidflareScenarios = scenarios.filter((entry) => entry.luminize)

  it.each(voidflareScenarios.map((scenario) => [scenario.id, scenario.label]))(
    "%s",
    async (scenarioId) => {
      const scenario = voidflareScenarios.find((s) => s.id === scenarioId)!
      const input = await inputFor(scenario)
      const unchanged = structuredClone(input)
      const expected = reference.cases[scenario.id]!.reference
      const result = calculate(input)
      expect(input).toEqual(unchanged)
      expect(result.segments).toHaveLength(1)
      const segment = result.segments[0]!
      expect(segment.granularity).toBe("aggregate")
      const damage = segment.damage
      expect(damage.critical).toBeNull()
      expect(damage.criticalSemantics).toBe("no-critical-settlement")
      // 蕾米局外面板与独立参考一致（攻击 3387.246696、异常精通 322）。
      const panel = result.panels[0]!
      close(
        panel.stats["attack"]!.value,
        expected.finalStats.attack!,
        "remiel panel attack",
      )
      close(
        panel.stats["anomalyProficiency"]!.value,
        expected.finalStats.anomalyProficiency!,
        "remiel panel mastery",
      )
      for (const [factor, value] of Object.entries(expected.factors)) {
        if (factor === "luminizeMultiplier" || factor === "specialMultiplier")
          continue
        close(
          damage.factors.nonCritical[factor],
          value,
          `${scenarioId} factor ${factor}`,
        )
      }
      // Fairy 把 strength 档位（与 M4）并入耀变倍率乘区，不单列因子。
      close(
        damage.factors.nonCritical.luminizeMultiplier!,
        expected.factors.luminizeMultiplier! *
          expected.factors.specialMultiplier!,
        `${scenarioId} luminize multiplier with strength`,
      )
      close(
        damage.evaluation.hit!.damageItems[0]!.finalStat,
        expected.factors.baseDamage!,
        `${scenarioId} restricted attack`,
      )
      close(
        damage.nonCritical,
        expected.totals.nonCritical,
        `${scenarioId} total`,
      )
      expect(damage.nonCritical).toBe(damage.expected)
      // 动作倍率严格来自 resolveAgentAction。
      if (!input.action.ok || input.action.calculation.kind !== "luminize")
        throw new Error("Expected the luminize action")
      expect(input.action.calculation.multiplier).toBe(
        expected.action.multipliers[0],
      )
    },
  )

  it("keeps the pinned handoff oracle values for the three mindscape tiers", async () => {
    // 父会话按固定来源数据与独立 Decimal 算式得到的验收值；此处逐项复验。
    // 精确十进制保留为字符串，比较按最近 IEEE 754 值加容差执行。
    const oracle: Record<string, string> = {
      "remiel-voidflare": "554657.7594933146483712",
      "remiel-voidflare-m4": "621216.690632512406175744",
      "remiel-voidflare-m6-quarter": "155304.172658128101543936",
    }
    for (const [id, value] of Object.entries(oracle)) {
      const result = calculate(
        await inputFor(scenarios.find((s) => s.id === id)!),
      )
      close(result.totals.nonCritical, Number(value), `${id} oracle`)
    }
  })

  it("derives the equivalent element resistance by the pinned next-non-lumiflux rule", async () => {
    const scenario = voidflareScenarios.find(
      (s) => s.id === "remiel-voidflare-elements",
    )!
    const base = await inputFor(scenario)
    // 队伍槽位 [蕾米, 简, 维琳娜]：下一位非流明队友是简（物理）。
    const equivalent = (actors: typeof base.actors) => {
      const order = actors.map((actor, index) => ({ actor, index }))
      const slot = order.findIndex(
        (entry) => entry.actor.entityId === "entity:remiel",
      )
      for (const offset of [1, 2]) {
        const next = order[(slot + offset) % order.length]!
        const element = base.data.catalog.entities.find(
          (e) =>
            e.identity?.kind === "agent" &&
            e.identity.entityId === next.actor.agentEntityId,
        )!.element
        if (element !== null && element !== "lumiflux") return element
      }
      return null
    }
    expect(equivalent(base.actors)).toBe("physical")
    const baseInput = await inputFor(scenario)
    const reordered: StaticActionCalculationInput = {
      ...baseInput,
      actors: [
        baseInput.actors[2]!,
        baseInput.actors[1]!,
        baseInput.actors[0]!,
      ],
    }
    expect(equivalent(reordered.actors)).toBe("wind")
    // 等效属性抗性沿用显式基线接口：维琳娜在下一槽时取风抗 0.2，不用蕾米的流明抗性。
    const reorderedDamage = luminizeDamageOf(reordered)
    const result = calculateStaticActionDamage({
      ...reordered,
      luminize: {
        hit: reordered.luminize!.hit,
        damage: {
          ...reorderedDamage,
          resistance: {
            ...reorderedDamage.resistance,
            targetResistance: reordered.target.resistances.wind!,
          },
        },
      },
    })
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (result.ok && result.value.kind === "damage") {
      const windResistance =
        result.value.segments[0]!.damage.factors.nonCritical.resistance!
      close(windResistance, 1 - 0.2 + 0.5, "wind equivalent resistance")
      const physical = calculate(await inputFor(scenario))
      const physicalResistance =
        physical.segments[0]!.damage.factors.nonCritical.resistance!
      close(physicalResistance, 1 - 0.1 + 0.5, "physical equivalent resistance")
      // 蕾米自身的流明抗性 -0.05 不参与该基线；两个等效元素抗性保持差值。
      close(
        physicalResistance - windResistance,
        0.1,
        "unequal element resistances stay distinct",
      )
    }
  })

  it("falls back to zero resistance when no non-lumiflux teammate exists", async () => {
    const scenario = voidflareScenarios.find(
      (s) => s.id === "remiel-voidflare",
    )!
    const base = await inputFor(scenario)
    const soloDamage = luminizeDamageOf(base)
    const solo: StaticActionCalculationInput = {
      ...base,
      actors: [base.actors[0]!],
      // 三异常门槛的选项在单人队伍没有受益者，不参与选择。
      selections: base.selections.filter(
        (selection) =>
          selection.optionId !==
            "agents:remiel:mindscape:0:blk-ms7tc2w4-mzvc69:eff-ms7tc2w3-mzcr6z" &&
          selection.optionId !==
            "agents:remiel:mindscape:0:blk-ms7td2gs-rk1vtd:eff-ms7td2gs-4vbpdh",
      ),
      inputs: [],
      luminize: {
        hit: base.luminize!.hit,
        damage: {
          ...soloDamage,
          resistance: {
            ...soloDamage.resistance,
            // 没有非流明队友：等效属性抗性取 0，不用简的物理抗性。
            targetResistance: 0,
          },
        },
      },
    }
    const result = calculateStaticActionDamage(solo)
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (!result.ok || result.value.kind !== "damage") return
    const factors = result.value.segments[0]!.damage.factors.nonCritical
    // A0=3387.246696（无转模）、受限/完整 P=468。
    close(factors.baseDamage!, 3387.246696, "solo restricted attack")
    close(factors.anomalyProficiency!, 4.68, "solo restricted mastery")
    close(
      factors.refringe!,
      1 + 0.0002 * 468,
      "solo refringe without the team gate",
    )
    close(
      factors.luminizeMultiplier!,
      3.2 + 0.002 * 468,
      "solo luminize multiplier",
    )
    close(factors.resistance!, 1.5, "zero equivalent resistance with own M1")
  })

  it("rejects non-60 levels at this entry while the catalog entry keeps 1-60", async () => {
    const scenario = voidflareScenarios.find(
      (s) => s.id === "remiel-voidflare",
    )!
    const base = await inputFor(scenario)
    const original = luminizeDamageOf(base)
    const rejected = calculateStaticActionDamage({
      ...base,
      luminize: {
        hit: base.luminize!.hit,
        damage: {
          ...original,
          anomalySource: { ...original.anomalySource, level: 30 },
        },
      },
    })
    expect(rejected.ok).toBe(false)
    if (!rejected.ok)
      expect(
        rejected.issues.some((issue) =>
          issue.message.includes("only supports level 60"),
        ),
      ).toBe(true)
  })

  it("keeps historical full luminize hit objects assignable and reused by the identity auto-fill", async () => {
    const scenario = voidflareScenarios.find(
      (s) => s.id === "remiel-voidflare",
    )!
    const base = await inputFor(scenario)
    // 历史完整 hit 形状（含动作身份字段与 actionSnapshotId 缺省）必须仍可赋值
    // 给公开输入类型；身份字段由入口按已解析动作覆盖，不采用调用方提供的值。
    const historicalHit: NonNullable<StaticActionCalculationInput["luminize"]> =
      {
        hit: {
          actorId: "entity:stale-actor",
          targetId: "entity:stale-target",
          actionId: "action:stale-action",
          skillCategory: "special",
          skillTags: ["stale"],
          skillTargetIds: ["stale-target-id"],
          element: base.luminize!.hit.element,
          damageItems: base.luminize!.hit.damageItems,
        },
        damage: base.luminize!.damage,
      }
    const reused = calculateStaticActionDamage({
      ...base,
      luminize: historicalHit,
    })
    const concise = calculateStaticActionDamage({
      ...base,
      luminize: { hit: base.luminize!.hit, damage: base.luminize!.damage },
    })
    expect(reused.ok, JSON.stringify(reused)).toBe(true)
    expect(concise.ok, JSON.stringify(concise)).toBe(true)
    if (reused.ok && concise.ok) {
      expect(reused.value.kind).toBe("damage")
      expect(concise.value.kind).toBe("damage")
      if (reused.value.kind === "damage" && concise.value.kind === "damage") {
        expect(reused.value.segments[0]!.damage.nonCritical).toBe(
          concise.value.segments[0]!.damage.nonCritical,
        )
        expect(reused.value.totals.nonCritical).toBe(
          concise.value.totals.nonCritical,
        )
      }
    }
    // 特殊虚曜分支仍拒绝 actionSnapshotId 快照覆盖（既定行为不变）。
    // 特殊虚曜分支仍拒绝 actionSnapshotId 快照覆盖（既定行为不变）；
    // luminizeDamageOf 同时保证此处是具名机制输入。
    luminizeDamageOf(base)
    const snapshotted = calculateStaticActionDamage({
      ...base,
      luminize: {
        hit: {
          ...base.luminize!.hit,
          actionSnapshotId: "snapshot:history",
        },
        damage: base.luminize!.damage,
      },
    })
    expect(snapshotted.ok).toBe(false)
    if (!snapshotted.ok)
      expect(
        snapshotted.issues.some((issue) =>
          issue.pointer.includes("actionSnapshotId"),
        ),
      ).toBe(true)
  })

  it("keeps the normal luminize branch consumable at this entry with an explicit plain source", async () => {
    // 普通分支回归：蕾米耀变动作 + 维琳娜作为普通异常来源（等级显式、defense
    // 携带旧契约的 attackerLevel），历史完整 hit 同样可复用。
    const scenario = voidflareScenarios.find(
      (s) => s.id === "remiel-voidflare",
    )!
    const base = await inputFor(scenario)
    const velinaActor = base.actors.find(
      (actor) => actor.agentEntityId === "1561",
    )
    if (velinaActor === undefined)
      throw new Error("Expected Velina in the team")
    const damage = luminizeDamageOf(base)
    const plain = calculateStaticActionDamage({
      ...base,
      actorId: base.actorId,
      luminize: {
        hit: {
          ...base.luminize!.hit,
          damageItems: [
            {
              mode: "direct" as const,
              role: "base" as const,
              itemId: "plain-luminize",
              stat: "attack" as const,
              statSource: { entityId: velinaActor.entityId },
              damageMultiplier: 1,
            },
          ],
        },
        damage: {
          ...damage,
          anomalySource: { entityId: velinaActor.entityId, level: 60 },
          defense: {
            attackerLevel: 60,
            targetBaseDefense: scenario.target.baseDefense,
            defensePercentageAdjustments: [],
            penetrationValues: [],
          },
        } as never,
      },
    })
    expect(plain.ok, JSON.stringify(plain)).toBe(true)
    if (plain.ok && plain.value.kind === "damage") {
      const factors = plain.value.segments[0]!.damage.factors.nonCritical
      expect(factors.anomalyDamageLevel).toBeDefined()
    }
  })
})

describe("Velina Condensed Cyclone complete build", () => {
  it("calculates the micro-domain cyclone from the reviewed equipment with independent expectations", async () => {
    const build = builds.velina!
    const data = await loadStaticCalculationData({
      agents: [build.agentName],
      wEngines: [build.wEngineName],
    })
    const actions = data.agents.find(
      (entry) => entry.actions.entityId === build.actor.agentEntityId,
    )!.actions
    const actionId = "action:agent:1561:action:0021"
    const resolution = {
      agent: actions,
      actionId,
      mindscapeRank: build.actor.mindscapeRank,
      levels: { special: { mode: "effective", value: 12 } },
    } as const
    const resolved = resolveAgentAction(resolution)
    expect(resolved.ok).toBe(true)
    if (!resolved.ok || resolved.calculation.kind !== "damage")
      throw new Error("Expected an available micro-domain action")
    expect(resolved.skillCategory).toBe("uncategorized")
    expect(resolved.skillTargetIds).toEqual([
      "zzz-hp:skill:velina-special-ms4tnsha",
    ])
    expect(resolved.calculation.segments[0]).toMatchObject({
      damageKind: "regular",
      element: "wind",
      granularity: "aggregate",
      repeat: 1,
    })
    const input: StaticActionCalculationInput = {
      data,
      actors: [build.actor],
      actorId: build.actor.entityId,
      action: resolved,
      target: {
        entityId: "entity:target",
        teamId: "team:enemies",
        baseDefense: 1000,
        resistances: { wind: 0.2 },
        isStunned: false,
        baseStunDamageMultiplier: 1,
      },
      selections: [],
    }
    const result = calculate(input)
    // 独立纯算式（来源属性 + 词条 + 音擎面板，不复用被测输出）：
    // (797.574 + 75 + 684.02) × 1.6 + 316 = 2806.5504；
    // 暴击率 0.05 + 0.08、暴伤 0.5、穿透 0.24。
    close(result.panels[0]!.stats.attack!.value, 2806.5504, "panel attack")
    close(result.panels[0]!.stats.criticalRate!.value, 0.13, "panel crit rate")
    close(
      result.panels[0]!.stats.criticalDamage!.value,
      0.5,
      "panel crit damage",
    )
    close(
      result.panels[0]!.stats.penetrationRatio!.value,
      0.24,
      "panel penetration ratio",
    )
    // 非暴击 = 2806.5504 × 0.655 × 794/(794 + 1000 × (1 − 0.24)) × 0.8。
    close(result.totals.nonCritical, 751.404204132819, "non-critical hit")
    close(result.totals.critical, 1127.106306199228, "critical hit")
    close(result.totals.expected, 800.245477401452, "expected hit")
    expect(result.totals.displayedNonCritical).toBeNull()
    expect(result.totals.displayedCritical).toBeNull()
    expect(result.segments[0]!.granularity).toBe("aggregate")
    expect(
      resolveAgentAction({ ...resolution, requireIndividualHits: true }),
    ).toMatchObject({
      ok: false,
      issues: [{ code: "individual-hits-required" }],
    })
    expect(
      calculateStaticActionDamage({ ...input, requireIndividualHits: true }).ok,
    ).toBe(false)
  })
})

describe("generic assist entry-action complete builds", () => {
  // 具名通用 assist 登场技直伤约定：两位角色 60 级、M0、核心 7、辅助最终 12；
  // 1—4 槽混沌爵士（31800）、5—6 槽啄木鸟（31000），主词条生命/攻击/防御/攻击/攻击/攻击，
  // 无副词条；照装备半糖雪兔（14134 R1）、叶瞬光装备星徽引擎（13004 R1）。
  // 只比较四件套选项开关，不选择角色或音擎战斗效果。独立 Decimal 算式：
  // 照 (690.6593 + 75 + 713.76) × 1.9 + 316 = 3126.89667，
  //   非暴击 = 3126.89667 × 13.612 × 794/1794 × 0.8 = 15070.356331237351；
  // 叶瞬光 (863.2102 + 75 + 594.8) × 2.15 + 316 = 3611.97193，
  //   非暴击 = 3611.97193 × 8.008 × 794/1794 × 0.8 = 10241.332862902725。
  // 暴击 = 非暴击 × 1.5；期望 = 非暴击 × (1 + CR × 0.5)，CR 分别 0.13 / 0.274。
  // 独立 Decimal 期望值以十进制文本给出；运行时取最近的双精度表示参与容差比较。
  const rows = [
    {
      agentName: "Zhao",
      wEngineName: "Half-Sugar Bunny",
      wEngineEntityId: "14134",
      agentEntityId: "1341",
      resistance: { ice: 0.2 },
      panelAttack: 3126.89667,
      criticalRate: 0.13,
      closedNonCritical: Number("15070.356331237351"),
      openNonCritical: Number("18084.427597484821"),
      openExpected: Number("19259.915391321335"),
    },
    {
      agentName: "Ye Shunguang",
      wEngineName: "Starlight Engine",
      wEngineEntityId: "13004",
      agentEntityId: "1431",
      resistance: { physical: 0.2 },
      panelAttack: 3611.97193,
      criticalRate: 0.274,
      closedNonCritical: Number("10241.332862902725"),
      openNonCritical: Number("12289.59943548327"),
      openExpected: Number("13973.274558144477"),
    },
  ] as const
  const chaosJazzOption =
    "drive-discs:chaos-jazz:setPieces:4:blk-legacy:eff-ms0fd373-nsyrwm"
  const chaosJazzEffect =
    "disc:31800:zzz-hp:eff-ms0fd373-nsyrwm:blk-legacy:setPieces:4"

  it.each(rows)(
    "reproduces $agentName entry damage with the reviewed four-piece switch",
    async (row) => {
      const data = await loadStaticCalculationData({
        agents: [row.agentName],
        wEngines: [row.wEngineName],
      })
      const actor: StaticActorConfiguration = {
        entityId: "entity:actor",
        teamId: "team:players",
        agentEntityId: row.agentEntityId,
        coreSkillLevel: 7,
        mindscapeRank: 0,
        wEngine: {
          entityId: row.wEngineEntityId,
          refinement: 1,
          eligible: true,
        },
        driveDiscs: {
          1: {
            setEntityId: "31800",
            mainStat: { attribute: "health" },
            substats: [],
          },
          2: {
            setEntityId: "31800",
            mainStat: { attribute: "attack" },
            substats: [],
          },
          3: {
            setEntityId: "31800",
            mainStat: { attribute: "defense" },
            substats: [],
          },
          4: {
            setEntityId: "31800",
            mainStat: { attribute: "attack" },
            substats: [],
          },
          5: {
            setEntityId: "31000",
            mainStat: { attribute: "attack" },
            substats: [],
          },
          6: {
            setEntityId: "31000",
            mainStat: { attribute: "attack" },
            substats: [],
          },
        },
        panel: { mode: "equipment" },
      }
      const resolved = resolveAgentAction({
        agent: data.agents[0]!.actions,
        actionId: `action:agent:${row.agentEntityId}:action:0001`,
        mindscapeRank: 0,
        levels: { assist: { mode: "effective", value: 12 } },
      })
      expect(resolved.ok).toBe(true)
      if (!resolved.ok || resolved.calculation.kind !== "damage")
        throw new Error("Expected the available entry action")
      expect(resolved.skillCategory).toBe("assist")
      expect(resolved.skillTargetIds).toEqual([])
      const input: StaticActionCalculationInput = {
        data,
        actors: [actor],
        actorId: actor.entityId,
        action: resolved,
        target: {
          entityId: "entity:target",
          teamId: "team:enemies",
          baseDefense: 1000,
          resistances: row.resistance,
          isStunned: false,
          baseStunDamageMultiplier: 1,
        },
        selections: [],
      }
      const closed = calculate(input)
      close(closed.panels[0]!.stats.attack!.value, row.panelAttack, "attack")
      close(
        closed.panels[0]!.stats.criticalRate!.value,
        row.criticalRate,
        "critical rate",
      )
      close(
        closed.panels[0]!.stats.criticalDamage!.value,
        0.5,
        "critical damage",
      )
      close(
        closed.panels[0]!.stats.penetrationRatio?.value ?? 0,
        0,
        "penetration ratio",
      )
      close(
        closed.totals.nonCritical,
        row.closedNonCritical,
        "closed non-critical",
      )
      close(closed.totals.critical!, row.closedNonCritical * 1.5, "closed crit")
      close(
        closed.totals.expected,
        row.closedNonCritical * (1 + row.criticalRate * 0.5),
        "closed expected",
      )
      const opened = calculate({
        ...input,
        selections: [
          { holderId: actor.entityId, optionId: chaosJazzOption, layers: 1 },
        ],
      })
      close(opened.totals.nonCritical, row.openNonCritical, "open non-critical")
      close(opened.totals.critical!, row.openNonCritical * 1.5, "open crit")
      close(opened.totals.expected, row.openExpected, "open expected")
      expect(opened.panels).toEqual(closed.panels)
      expect(opened.totals.displayedNonCritical).toBeNull()
      expect(opened.totals.displayedCritical).toBeNull()
      expect(
        opened.segments[0]!.damage.evaluation.contributions.filter(
          (entry) => entry.origin.effectId === chaosJazzEffect,
        ),
      ).toMatchObject([{ value: { value: 0.2 } }])
      expect(
        calculateStaticActionDamage({ ...input, requireIndividualHits: true })
          .ok,
      ).toBe(false)
    },
  )
})
