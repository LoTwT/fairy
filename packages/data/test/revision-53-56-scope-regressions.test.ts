import { readFileSync } from "node:fs"
import { beforeAll, describe, expect, it } from "vitest"
import {
  agentSourceIds,
  loadStaticCalculationData,
  wEngineSourceIds,
} from "../src/index.ts"
import {
  calculateStaticDamage,
  calculateStaticDamageFromCatalog,
  staticSourceBindingId,
} from "../../core/src/index.ts"
import type { DamageElement, EffectId } from "@randomplay/shared"
import type {
  DirectStatInput,
  GeneralStatInput,
  StaticCatalogDamageInput,
  StaticDamageInput,
  StaticDamageResult,
} from "../../core/src/index.ts"
import {
  scopeCases,
  scopePanel,
  scopeTarget,
} from "./fixtures/revision-53-56-scope-cases.ts"
import type {
  ScopeCase,
  ScopeDamageKind,
  ScopeSelection,
} from "./fixtures/revision-53-56-scope-cases.ts"

/**
 * effects revision 54—56 的伤害种类范围端到端回归。
 *
 * - 输入由 `fixtures/revision-53-56-scope-cases.ts` 实时构造；冻结参考只提供
 *   期望值与上游投影，不用 Fairy 输出回填。
 * - 独立期望来自 Nanoka 原文与修正文档引用的原文，使用中立面板和精确十进制
 *   有理数算式生成；上游值来自 ZZZ-HP 991bb0e 固定原始记录及固定乘区表达式。
 * - 普通异常与上游一致时断言一致；已登记差异断言 `Fairy − 上游` 的具体差值。
 * - 普通测试离线运行，不访问上游仓库、raw、网络或本机临时路径。
 */
interface ReferenceTotals {
  nonCritical: string
  critical: string | null
  expected: string
  criticalRate: string
  factors: {
    nonCritical: Record<string, string>
    critical: Record<string, string> | null
  }
}
interface ReferenceCase {
  correction: ScopeCase["correction"]
  hit: ScopeCase["hit"]
  holder: ScopeCase["holder"]
  wEngine: ScopeCase["wEngine"]
  selections: readonly {
    optionId: string
    layers: number
    channel: ScopeSelection["channel"]
    perLayer: string
    correctedKinds: readonly ScopeDamageKind[]
    correctedElements: readonly DamageElement[] | null
    differenceId: string | null
    source: { pointer: string }
  }[]
  expected: ReferenceTotals
  upstream: {
    nonCritical: string
    critical: string | null
    expected: string
    criticalRate: string
  } | null
  difference: {
    nonCritical: string
    critical: string | null
    expected: string
    criticalRate: string
  } | null
}

const reference = JSON.parse(
  readFileSync(
    new URL("./fixtures/revision-53-56-scope-reference.json", import.meta.url),
    "utf8",
  ),
) as {
  provenance: {
    fairyBaseline: string
    effectsRevision: number
    zzzHpCommit: string
    resources: readonly { path: string; commit: string; sha256: string }[]
    generatorSha256: string
    precision: string
    layers: readonly string[]
  }
  cases: Record<string, ReferenceCase>
}

const HOLDER_ID = "entity:scope-holder" as const
const PLAYER_TEAM_ID = "team:players" as const
let loaded: Awaited<ReturnType<typeof loadStaticCalculationData>>

beforeAll(async () => {
  loaded = await loadStaticCalculationData({
    agents: [...new Set(scopeCases.map((entry) => entry.holder.agentName))].map(
      (name) => agentSourceIds[name],
    ),
    wEngines: [
      ...new Set(
        scopeCases.flatMap((entry) =>
          entry.wEngine === null ? [] : [entry.wEngine.name],
        ),
      ),
    ].map((name) => wEngineSourceIds[name]),
  })
})

function close(
  actual: number | null,
  expected: string | number | null,
  label: string,
): void {
  if (expected === null) {
    expect(actual, label).toBeNull()
    return
  }
  const value = typeof expected === "string" ? Number(expected) : expected
  expect(actual, label).toBeTypeOf("number")
  expect(Math.abs(actual! - value), label).toBeLessThanOrEqual(
    Math.max(1e-9, Math.abs(value) * 1e-12),
  )
}

function generalStat(value: number): GeneralStatInput {
  return {
    settledInitialValue: value,
    finalPercentage: [],
    finalFixed: [],
  }
}
function directStat(value: number): DirectStatInput {
  return { baseValue: value, additions: [] }
}

function holderEntity() {
  return {
    kind: "actor" as const,
    entityId: HOLDER_ID,
    teamId: PLAYER_TEAM_ID,
    generalStats: {
      attack: generalStat(scopePanel.attack),
      health: generalStat(scopePanel.health),
      defense: generalStat(scopePanel.defense),
      impact: generalStat(scopePanel.impact),
      anomalyProficiency: generalStat(scopePanel.anomalyProficiency),
      anomalyMastery: generalStat(scopePanel.anomalyMastery),
      energyRegen: generalStat(scopePanel.energyRegen),
    },
    directStats: {
      criticalRate: directStat(scopePanel.criticalRate),
      criticalDamage: directStat(scopePanel.criticalDamage),
      penetrationRatio: directStat(scopePanel.penetrationRatio),
      sharpCriticalDamage: directStat(scopePanel.sharpCriticalDamage),
    },
  }
}
function targetEntity() {
  return {
    kind: "actor" as const,
    entityId: scopeTarget.entityId,
    teamId: scopeTarget.teamId,
    generalStats: {},
    directStats: {},
  }
}

function bindingFor(caseEntry: ScopeCase) {
  const agentEntityId = agentSourceIds[caseEntry.holder.agentName]
  if (caseEntry.wEngine !== null) {
    const sourceEntityId = wEngineSourceIds[caseEntry.wEngine.name]
    return {
      kind: "w-engine" as const,
      bindingId: staticSourceBindingId(HOLDER_ID, "w-engine", sourceEntityId),
      holderId: HOLDER_ID,
      sourceEntityId,
      eligible: true,
      configuration: { refinement: caseEntry.wEngine.refinement },
    }
  }
  return {
    kind: "agent" as const,
    bindingId: staticSourceBindingId(HOLDER_ID, "agent", agentEntityId),
    holderId: HOLDER_ID,
    sourceEntityId: agentEntityId,
    eligible: true,
    configuration: {
      mindscapeRank: caseEntry.holder.mindscapeRank,
      coreSkillLevel: caseEntry.holder.coreSkillLevel,
      potentialLevel: caseEntry.holder.potentialLevel,
    },
  }
}

function resistanceFactor() {
  return {
    targetResistance: 0,
    targetResistanceReductions: [],
    attackerResistanceIgnoreValues: [],
  }
}
function damageTakenFactor() {
  return {
    targetDamageTakenIncreases: [],
    targetDamageTakenReductions: [],
  }
}
function stunDamageFactor() {
  return {
    isTargetStunned: scopeTarget.isStunned,
    targetBaseStunDamageMultiplier: scopeTarget.baseStunDamageMultiplier,
    targetStunDamageMultiplierAdjustments: [],
  }
}
function defenseFactor() {
  return {
    attackerLevel: 1,
    targetBaseDefense: scopeTarget.baseDefense,
    defensePercentageAdjustments: [],
    penetrationValues: [],
  }
}

function damageParameters(
  caseEntry: ScopeCase,
): StaticCatalogDamageInput["damage"] {
  const common = {
    resistance: resistanceFactor(),
    damageTaken: damageTakenFactor(),
    stunDamage: stunDamageFactor(),
  }
  if (caseEntry.hit.kind === "sheer") {
    return {
      kind: "sheer",
      damageBonus: [],
      sheerDamageBonus: [],
      ...common,
    }
  }
  const anomalyCommon = {
    damageBonus: { settledMultiplier: 1 },
    anomalyDamageBonus: [],
    refringe: { mode: "from-effects" as const },
    anomalySource: { entityId: HOLDER_ID, level: 1 },
    defense: defenseFactor(),
    ...common,
  }
  if (caseEntry.hit.kind === "luminize") {
    return {
      kind: "luminize",
      ...anomalyCommon,
      luminizeMultiplier: {
        baseLuminizeMultiplier: 1,
        multiplicativeLuminizeMultiplierAdjustments: [],
      },
    }
  }
  const kind = caseEntry.hit.kind
  if (kind !== "anomaly" && kind !== "anomaly-settlement" && kind !== "vortex")
    throw new Error(`Unsupported anomaly scope kind: ${kind}`)
  return {
    kind,
    ...anomalyCommon,
    anomalyCriticalRate: 0,
    anomalyCriticalDamage: [],
  }
}

function inputFor(caseEntry: ScopeCase): StaticCatalogDamageInput {
  const binding = bindingFor(caseEntry)
  return {
    definitions: loaded.definitions,
    catalog: loaded.catalog,
    bindings: [binding],
    selections: caseEntry.selections.map((selection) => ({
      optionId: selection.optionId,
      bindingId: binding.bindingId,
      layers: selection.layers,
    })),
    actorSources: [
      {
        entityId: HOLDER_ID,
        agentEntityId: agentSourceIds[caseEntry.holder.agentName],
      },
    ],
    world: {
      entities: [holderEntity(), targetEntity()],
      states: [],
      distances: [],
    },
    hit: {
      actorId: HOLDER_ID,
      targetId: scopeTarget.entityId,
      actionId: "action:public-anomaly:scope-regression",
      skillCategory: "uncategorized",
      skillTags: [],
      element: caseEntry.hit.element,
      damageItems: [
        {
          mode: "direct",
          role: "base",
          itemId: "scope-base",
          stat: "attack",
          statSource: { entityId: HOLDER_ID },
          damageMultiplier: 1,
        },
      ],
    },
    damage: damageParameters(caseEntry),
  }
}

function effectIdsFor(
  caseEntry: ScopeCase,
  selection: ScopeSelection,
): readonly string[] {
  const option = loaded.catalog.options.find(
    (candidate) => candidate.optionId === selection.optionId,
  )
  if (!option) throw new Error(`missing option ${selection.optionId}`)
  const variant = option.variants.find((candidate) =>
    variantMatches(
      candidate.configuration as unknown as Record<string, unknown>,
      caseEntry,
    ),
  )
  if (!variant) throw new Error(`missing variant ${selection.optionId}`)
  return variant.effectIds
}

/**
 * 目录的耀变分支要求恰好一个蕾米埃尔异常精通映射，非蕾米埃尔行动者的
 * 耀变事件无法通过该分支建模。耀变反例改用同一公开低层入口
 * `calculateStaticDamage`：规则、绑定与受益者求值相同，只跳过目录的
 * 蕾米埃尔专属映射装配。普通异常、异放与乱流仍走目录链路。
 */
function luminizeInputFor(caseEntry: ScopeCase): StaticDamageInput {
  const binding = bindingFor(caseEntry)
  return {
    definitions: loaded.definitions,
    bindings: [binding],
    selections: caseEntry.selections.flatMap((selection) =>
      effectIdsFor(caseEntry, selection).map((effectId) => ({
        effectId: effectId as EffectId,
        bindingId: binding.bindingId,
        layers: selection.layers,
      })),
    ),
    world: {
      entities: [holderEntity(), targetEntity()],
      states: [],
      distances: [],
    },
    hit: {
      actorId: HOLDER_ID,
      targetId: scopeTarget.entityId,
      actionId: "action:public-anomaly:scope-regression",
      skillCategory: "uncategorized",
      skillTags: [],
      element: caseEntry.hit.element,
      damageItems: [
        {
          itemId: "scope-base",
          stat: "attack",
          statSource: { entityId: HOLDER_ID },
          damageMultiplier: 1,
        },
      ],
    },
    damage: {
      kind: "luminize",
      damageBonus: { settledMultiplier: 1 },
      anomalyDamageBonus: [],
      refringe: { settledMultiplier: 1 },
      defense: defenseFactor(),
      luminizeMultiplier: {
        baseLuminizeMultiplier: 1,
        remielleAnomalyProficiency: 0,
        anomalyProficiencyConversionRate: 0,
        multiplicativeLuminizeMultiplierAdjustments: [],
      },
      resistance: resistanceFactor(),
      damageTaken: damageTakenFactor(),
      stunDamage: stunDamageFactor(),
    },
  }
}

function calculateFor(caseEntry: ScopeCase): StaticDamageResult {
  const result =
    caseEntry.hit.kind === "luminize"
      ? calculateStaticDamage(luminizeInputFor(caseEntry))
      : calculateStaticDamageFromCatalog(inputFor(caseEntry))
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result))
  return result.value
}

function variantMatches(
  configuration: Record<string, unknown>,
  caseEntry: ScopeCase,
): boolean {
  if (caseEntry.wEngine !== null) {
    const refinements = configuration["refinements"]
    return (
      Array.isArray(refinements) &&
      refinements.includes(caseEntry.wEngine.refinement)
    )
  }
  const minimumMindscape = configuration["minimumMindscape"]
  if (
    typeof minimumMindscape === "number" &&
    minimumMindscape > caseEntry.holder.mindscapeRank
  )
    return false
  const coreSkillLevels = configuration["coreSkillLevels"]
  if (
    Array.isArray(coreSkillLevels) &&
    !coreSkillLevels.includes(caseEntry.holder.coreSkillLevel)
  )
    return false
  const potentialLevels = configuration["potentialLevels"]
  if (
    Array.isArray(potentialLevels) &&
    !potentialLevels.includes(caseEntry.holder.potentialLevel)
  )
    return false
  return true
}

describe("revision 53–56 scope regressions", () => {
  it("keeps the frozen fixtures aligned with the loaded calculation data", () => {
    expect(new Set(Object.keys(reference.cases))).toEqual(
      new Set(scopeCases.map((entry) => entry.caseId)),
    )
    expect(reference.provenance.effectsRevision).toBe(
      Number(loaded.definitions.revision),
    )
    expect(reference.provenance.zzzHpCommit).toBe(loaded.catalog.source.commit)
    expect(reference.provenance.resources.length).toBeGreaterThan(0)
    expect(reference.provenance.generatorSha256).toMatch(/^[0-9a-f]{64}$/u)
    for (const caseEntry of scopeCases) {
      const frozen = reference.cases[caseEntry.caseId]!
      expect(frozen.correction, caseEntry.caseId).toBe(caseEntry.correction)
      expect(frozen.hit, caseEntry.caseId).toEqual(caseEntry.hit)
      expect(frozen.holder, caseEntry.caseId).toEqual(caseEntry.holder)
      expect(frozen.wEngine, caseEntry.caseId).toEqual(caseEntry.wEngine)
      expect(
        frozen.selections.map((selection) => ({
          optionId: selection.optionId,
          layers: selection.layers,
          channel: selection.channel,
          perLayer: Number(selection.perLayer),
          correctedKinds: selection.correctedKinds,
          correctedElements: selection.correctedElements,
          differenceId: selection.differenceId,
          source: selection.source.pointer,
        })),
        caseEntry.caseId,
      ).toEqual(
        caseEntry.selections.map((selection) => ({
          optionId: selection.optionId,
          layers: selection.layers,
          channel: selection.channel,
          perLayer: selection.perLayer,
          correctedKinds: selection.correctedKinds,
          correctedElements: selection.correctedElements ?? null,
          differenceId: selection.differenceId,
          source: selection.source.pointer,
        })),
      )
      const entity = loaded.catalog.entities.find(
        (candidate) =>
          candidate.identity?.kind === "agent" &&
          candidate.identity.entityId ===
            agentSourceIds[caseEntry.holder.agentName],
      )
      expect(entity?.element, caseEntry.caseId).toBe(caseEntry.holder.element)
      for (const selection of caseEntry.selections) {
        if (selection.differenceId === null) continue
        expect(
          loaded.catalog.differences.some(
            (difference) => difference.differenceId === selection.differenceId,
          ),
          `${caseEntry.caseId} ${selection.differenceId}`,
        ).toBe(true)
      }
      expect(frozen.expected.critical === null).toBe(
        caseEntry.hit.kind === "luminize",
      )
      if (frozen.upstream === null)
        expect(caseEntry.upstreamProjection).toBe(false)
      else expect(caseEntry.upstreamProjection).toBe(true)
    }
  })

  it.each(scopeCases)(
    "$caseId keeps the corrected multiplier, damage and upstream delta",
    (caseEntry) => {
      const frozen = reference.cases[caseEntry.caseId]!
      const result = calculateFor(caseEntry)
      close(
        result.nonCritical,
        frozen.expected.nonCritical,
        `${caseEntry.caseId} nonCritical`,
      )
      close(
        result.critical,
        frozen.expected.critical,
        `${caseEntry.caseId} critical`,
      )
      close(
        result.expected,
        frozen.expected.expected,
        `${caseEntry.caseId} expected`,
      )
      close(
        result.criticalRate,
        frozen.expected.criticalRate,
        `${caseEntry.caseId} criticalRate`,
      )
      for (const [factor, value] of Object.entries(
        frozen.expected.factors.nonCritical,
      ))
        close(
          result.factors.nonCritical[factor] ?? null,
          value,
          `${caseEntry.caseId} nonCritical ${factor}`,
        )
      if (frozen.expected.factors.critical === null) {
        expect(result.factors.critical, caseEntry.caseId).toBeNull()
      } else {
        expect(result.factors.critical, caseEntry.caseId).not.toBeNull()
        for (const [factor, value] of Object.entries(
          frozen.expected.factors.critical,
        ))
          close(
            result.factors.critical![factor] ?? null,
            value,
            `${caseEntry.caseId} critical ${factor}`,
          )
      }

      for (const selection of caseEntry.selections) {
        const option = loaded.catalog.options.find(
          (candidate) => candidate.optionId === selection.optionId,
        )
        expect(option, selection.optionId).toBeDefined()
        const variant = option!.variants.find((candidate) =>
          variantMatches(
            candidate.configuration as unknown as Record<string, unknown>,
            caseEntry,
          ),
        )
        expect(
          variant,
          `${caseEntry.caseId} ${selection.optionId}`,
        ).toBeDefined()
        expect(
          variant!.references.some(
            (referenceEntry) =>
              referenceEntry.sourceId === "zzz-hp" &&
              referenceEntry.pointer === selection.source.pointer,
          ),
          `${caseEntry.caseId} ${selection.optionId} source pointer`,
        ).toBe(true)
        expect(variant!.status, selection.optionId).toBe(
          selection.differenceId === null ? "converted" : "corrected",
        )
        if (selection.differenceId === null)
          expect(variant!.differences, selection.optionId).toEqual([])
        else
          expect(variant!.differences, selection.optionId).toContain(
            selection.differenceId,
          )

        const effectIds = new Set(variant!.effectIds)
        const contributions = result.evaluation.contributions.filter(
          (contribution) => effectIds.has(contribution.origin.effectId),
        )
        const applies =
          selection.correctedKinds.includes(caseEntry.hit.kind) &&
          (selection.correctedElements === undefined ||
            selection.correctedElements.includes(caseEntry.hit.element))
        expect(
          contributions.length > 0,
          `${caseEntry.caseId} ${selection.optionId} applies=${String(applies)}`,
        ).toBe(applies)
        if (!applies) continue
        expect(
          contributions.some(
            (contribution) =>
              contribution.address.kind === "factor" &&
              contribution.address.channel === selection.channel &&
              contribution.origin.beneficiaryId === HOLDER_ID,
          ),
          `${caseEntry.caseId} ${selection.optionId} channel`,
        ).toBe(true)
        const total = contributions.reduce((sum, contribution) => {
          if (contribution.address.kind !== "factor") return sum
          return sum + contribution.value.value
        }, 0)
        close(
          total,
          selection.perLayer * selection.layers,
          `${caseEntry.caseId} ${selection.optionId} value`,
        )
      }

      if (frozen.upstream === null || frozen.difference === null) {
        expect(frozen.upstream, caseEntry.caseId).toBeNull()
        expect(frozen.difference, caseEntry.caseId).toBeNull()
        return
      }
      close(
        result.nonCritical - Number(frozen.upstream.nonCritical),
        frozen.difference.nonCritical,
        `${caseEntry.caseId} upstream delta nonCritical`,
      )
      if (
        frozen.upstream.critical === null ||
        frozen.difference.critical === null
      ) {
        expect(frozen.difference.critical, caseEntry.caseId).toBeNull()
      } else {
        close(
          result.critical === null
            ? null
            : result.critical - Number(frozen.upstream.critical),
          frozen.difference.critical,
          `${caseEntry.caseId} upstream delta critical`,
        )
      }
      close(
        result.expected - Number(frozen.upstream.expected),
        frozen.difference.expected,
        `${caseEntry.caseId} upstream delta expected`,
      )
      close(
        result.criticalRate - Number(frozen.upstream.criticalRate),
        frozen.difference.criticalRate,
        `${caseEntry.caseId} upstream delta criticalRate`,
      )
    },
  )
})
