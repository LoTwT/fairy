import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../src/effects/index.ts"
import type {
  MindscapeRank,
  StaticCatalogDamageInput,
  StaticEffectCatalog,
} from "../../src/effects/index.ts"
import { general } from "./static-fixtures.ts"

type CatalogAnomalySource = Extract<
  StaticCatalogDamageInput["damage"],
  { readonly refringe: unknown }
>["anomalySource"]

const read = (path: string) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"))
const parsed = parseEffectRuleSet(
  read("../../../data/definitions/effects/static.json"),
)
if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues))
const definitions = parsed.value
const catalog = read(
  "../../../data/definitions/effects/static-catalog.json",
) as StaticEffectCatalog

const REMIEL_BINDING = "binding:remiel-agent" as const
const REMIEL_ENGINE_BINDING = "binding:remiel-engine" as const
const REMIEL_DISC_BINDING = "binding:remiel-disc" as const
const JANE_AGENT_BINDING = "binding:jane-agent" as const
const JANE_ENGINE_BINDING = "binding:jane-engine" as const
const VELINA_BINDING = "binding:velina-agent" as const
const GRACE_BINDING = "binding:grace-agent" as const
const ASTRAYAO_BINDING = "binding:astrayao-agent" as const
const FANCY_BINDING = "binding:remiel-fancy" as const

const corePassiveOptions = [
  "agents:remiel:mindscape:0:blk-legacy:eff-ms7t5hb1-fqvxkz",
  "agents:remiel:mindscape:0:blk-legacy:eff-ms7tarv6-tfz2kz",
  "agents:remiel:mindscape:0:blk-ms7tc2w4-mzvc69:eff-ms7tc2w3-mzcr6z",
] as const
const convertOption =
  "agents:remiel:mindscape:0:blk-ms7td2gs-rk1vtd:eff-ms7td2gs-4vbpdh"
const convertInputName =
  "agent:1581:zzz-hp:eff-ms7td2gs-4vbpdh:blk-ms7td2gs-rk1vtd:mindscape:0:source"
const mindspaceOneOption =
  "agents:remiel:mindscape:1:blk-legacy:eff-ms7tin2y-0pja8e"
const mindspaceFourOption =
  "agents:remiel:mindscape:4:blk-ms7tnn2n-4zw15u:eff-ms7tnn2n-mz69ez"
const mindspaceSixAdditionOption =
  "agents:remiel:mindscape:6:blk-ms95n6ab-y7ct9d:eff-ms95n6ab-ohj30v"
const mindspaceSixIncreaseOption =
  "agents:remiel:mindscape:6:blk-ms95n6ab-y7ct9d:eff-ms95qlik-s85i8l"
const engineMasteryOption =
  "w-engines:Ode_Of_Resurrected_Wings:refinement:blk-ms8fa1dg-ysnes9:eff-ms8fa1dg-tcuhq7"
const engineAnomalyBonusOption =
  "w-engines:Ode_Of_Resurrected_Wings:refinement:blk-ms8fa1dg-ysnes9:eff-ms8faem4-ob6m8b"
const engineDamageBonusOption =
  "w-engines:Ode_Of_Resurrected_Wings:refinement:blk-ms8fa1dg-ysnes9:eff-ms8faog5-gmbzko"
const fourPieceMasteryOption =
  "drive-discs:SuitFeatheredFate:setPieces:4:blk-ms0fq2lr-qfzbac:eff-ms0fq2lr-16g8q5"
const fourPieceAnomalyBonusOption =
  "drive-discs:SuitFeatheredFate:setPieces:4:blk-ms0fq2lr-qfzbac:eff-ms0fqlbs-bv91qb"
const fancyMasteryOption =
  "w-engines:Flight_of_Fancy:refinement:blk-legacy:legacy-self-mastery"
const joyauTeamMasteryOption =
  "w-engines:Joyau_Dore:refinement:blk-legacy:legacy-team-mastery"
const astrayaoResPenOption =
  "agents:astrayao:mindscape:1:blk-legacy:legacy-team-resPen"

function voidflareInput(
  overrides: Partial<{
    mindscapeRank: MindscapeRank
    strength: "full" | "mindscape-6-quarter"
    level: number
    attack: number
    proficiency: number
    targetBaseDefense: number
    targetResistance: number
    selections: StaticCatalogDamageInput["selections"]
    inputs: StaticCatalogDamageInput["inputs"]
    engine: "ode" | "fancy"
    teammates: "jane-velina" | "grace-velina" | "astrayao-velina" | "none"
    anomalySource: CatalogAnomalySource
    damage: Partial<
      Extract<StaticCatalogDamageInput["damage"], { kind: "luminize" }>
    >
    hit: Partial<StaticCatalogDamageInput["hit"]>
    catalog: StaticEffectCatalog
    snapshots: StaticCatalogDamageInput["snapshots"]
  }>,
): StaticCatalogDamageInput {
  const {
    mindscapeRank = 1,
    strength = "full",
    level = 60,
    attack = 1000,
    proficiency = 100,
    targetBaseDefense = 0,
    targetResistance = 0,
    selections,
    inputs,
    engine = "ode",
    teammates = "jane-velina",
    anomalySource = {
      mechanism: "remielle-special-voidflare",
      entityId: "entity:remiel",
      level,
      strength,
    },
    damage,
    hit,
    snapshots,
  } = overrides
  const teammateActors: {
    entityId: `entity:${string}`
    agentEntityId: string
  }[] = []
  const teammateBindings: StaticCatalogDamageInput["bindings"][number][] = []
  if (teammates === "jane-velina") {
    teammateActors.push(
      { entityId: "entity:jane", agentEntityId: "1261" },
      { entityId: "entity:velina", agentEntityId: "1561" },
    )
    teammateBindings.push(
      {
        bindingId: JANE_AGENT_BINDING,
        kind: "agent",
        holderId: "entity:jane",
        sourceEntityId: "1261",
        eligible: true,
        configuration: { mindscapeRank: 0, coreSkillLevel: 7 },
      },
      {
        bindingId: VELINA_BINDING,
        kind: "agent",
        holderId: "entity:velina",
        sourceEntityId: "1561",
        eligible: true,
        configuration: { mindscapeRank: 0, coreSkillLevel: 7 },
      },
      {
        bindingId: JANE_ENGINE_BINDING,
        kind: "w-engine",
        holderId: "entity:jane",
        sourceEntityId: "14156",
        eligible: true,
        configuration: { refinement: 5 },
      },
    )
  }
  if (teammates === "grace-velina" || teammates === "astrayao-velina") {
    const support = teammates === "grace-velina"
    teammateActors.push(
      {
        entityId: support ? "entity:grace" : "entity:astrayao",
        agentEntityId: support ? "1181" : "1311",
      },
      { entityId: "entity:velina", agentEntityId: "1561" },
    )
    teammateBindings.push(
      {
        bindingId: support ? GRACE_BINDING : ASTRAYAO_BINDING,
        kind: "agent",
        holderId: support ? "entity:grace" : "entity:astrayao",
        sourceEntityId: support ? "1181" : "1311",
        eligible: true,
        configuration: {
          mindscapeRank: (support ? 2 : 1) as MindscapeRank,
          coreSkillLevel: 7,
        },
      },
      {
        bindingId: VELINA_BINDING,
        kind: "agent",
        holderId: "entity:velina",
        sourceEntityId: "1561",
        eligible: true,
        configuration: { mindscapeRank: 0, coreSkillLevel: 7 },
      },
    )
  }
  const selected: StaticCatalogDamageInput["selections"] = (
    selections ??
    ([
      ...corePassiveOptions.map((optionId) => ({
        optionId,
        bindingId: REMIEL_BINDING,
        layers: 1,
      })),
      {
        optionId: convertOption,
        bindingId: REMIEL_BINDING,
        layers: 1,
      },
      {
        optionId: engine === "ode" ? engineMasteryOption : fancyMasteryOption,
        bindingId: engine === "ode" ? REMIEL_ENGINE_BINDING : FANCY_BINDING,
        layers: engine === "ode" ? 1 : 6,
      },
      {
        optionId: fourPieceMasteryOption,
        bindingId: REMIEL_DISC_BINDING,
        layers: 1,
      },
    ] as StaticCatalogDamageInput["selections"][number][])
  ).map((entry) => ({ ...entry }))
  const bindings: StaticCatalogDamageInput["bindings"] = [
    {
      bindingId: REMIEL_BINDING,
      kind: "agent",
      holderId: "entity:remiel",
      sourceEntityId: "1581",
      eligible: true,
      configuration: { mindscapeRank, coreSkillLevel: 7 },
    },
    engine === "ode"
      ? {
          bindingId: REMIEL_ENGINE_BINDING,
          kind: "w-engine",
          holderId: "entity:remiel",
          sourceEntityId: "14158",
          eligible: true,
          configuration: { refinement: 1 },
        }
      : {
          bindingId: FANCY_BINDING,
          kind: "w-engine",
          holderId: "entity:remiel",
          sourceEntityId: "14133",
          eligible: true,
          configuration: { refinement: 1 },
        },
    {
      bindingId: REMIEL_DISC_BINDING,
      kind: "drive-disc",
      holderId: "entity:remiel",
      sourceEntityId: "34100",
      eligible: true,
      configuration: { setPieces: 4 },
    },
    ...teammateBindings,
  ]
  const base: StaticCatalogDamageInput = {
    definitions,
    ...(snapshots === undefined ? {} : { snapshots }),
    catalog: overrides.catalog ?? catalog,
    bindings,
    actorSources: [
      { entityId: "entity:remiel", agentEntityId: "1581" },
      ...teammateActors,
    ],
    selections: selected,
    inputs: inputs ?? [
      {
        bindingId: REMIEL_BINDING,
        name: convertInputName,
        value: { unit: "attack-points", value: attack },
      },
    ],
    world: {
      entities: [
        {
          kind: "actor",
          entityId: "entity:remiel",
          teamId: "team:players",
          generalStats: {
            attack: general(attack),
            health: general(24000),
            anomalyProficiency: general(proficiency),
          },
          directStats: {
            criticalRate: { baseValue: 0.05, additions: [] },
            criticalDamage: { baseValue: 0.5, additions: [] },
            penetrationRatio: { baseValue: 0, additions: [] },
          },
        },
        ...teammateActors.map(
          (
            actor,
          ): {
            kind: "actor"
            entityId: `entity:${string}`
            teamId: "team:players"
            generalStats: Record<string, never>
            directStats: Record<string, never>
          } => ({
            kind: "actor",
            entityId: actor.entityId,
            teamId: "team:players",
            generalStats: {},
            directStats: {},
          }),
        ),
        {
          kind: "actor",
          entityId: "entity:enemy",
          teamId: "team:enemies",
          generalStats: {},
          directStats: {},
        },
      ],
      states: [],
      distances: [],
    },
    hit: {
      actorId: "entity:remiel",
      targetId: "entity:enemy",
      actionId: "action:agent:1581:action:0007",
      skillCategory: "uncategorized",
      element: "lumiflux",
      skillTags: [],
      skillTargetIds: ["zzz-hp:skill:remiel-assist-ms8eijmj"],
      damageItems: [
        {
          mode: "direct",
          role: "base",
          itemId: "special-voidflare",
          stat: "attack",
          statSource: { entityId: "entity:remiel" },
          damageMultiplier: 1,
        },
      ],
      ...hit,
    },
    damage: {
      kind: "luminize",
      damageBonus: [],
      anomalyDamageBonus: [],
      refringe: { mode: "from-effects" },
      anomalySource,
      luminizeMultiplier: {
        baseLuminizeMultiplier: 3.2,
        multiplicativeLuminizeMultiplierAdjustments: [],
      },
      defense: {
        attackerLevel: level,
        targetBaseDefense,
        defensePercentageAdjustments: [],
        penetrationValues: [],
      },
      resistance: {
        targetResistance,
        targetResistanceReductions: [],
        attackerResistanceIgnoreValues: [],
      },
      damageTaken: {
        targetDamageTakenIncreases: [],
        targetDamageTakenReductions: [],
      },
      stunDamage: {
        isTargetStunned: false,
        targetBaseStunDamageMultiplier: 1,
        targetStunDamageMultiplierAdjustments: [],
      },
      ...damage,
    },
  }
  return base
}

function resultFor(input: StaticCatalogDamageInput) {
  const result = calculateStaticDamageFromCatalog(input)
  return result
}

function closeTo(
  actual: number | null | undefined,
  expected: number,
  label: string,
) {
  expect(typeof actual, label).toBe("number")
  expect(Math.abs(actual! - expected), label).toBeLessThanOrEqual(
    Math.max(1e-9, Math.abs(expected) * 1e-12),
  )
}

describe("calculateStaticDamageFromCatalog: remielle special Voidflare", () => {
  it("computes the controlled reading split between restricted and full proficiency", () => {
    // 局外 A=1000、自身转模 40%×1000=400 → 受限 A=1400；
    // 局外精通 100 + 音擎 96 + 四件 50 → 受限 P=246；
    // R 与耀变倍率读完整当前精通：无队友时同为 246。
    const result = resultFor(voidflareInput({ mindscapeRank: 1 }))
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (!result.ok) return
    const factors = result.value.factors.nonCritical
    closeTo(factors.baseDamage!, 1400, "restricted attack")
    closeTo(factors.damageBonus!, 2.5, "level-60 settled bonus")
    closeTo(factors.anomalyProficiency!, 2.46, "restricted proficiency")
    closeTo(factors.refringe!, 1.1492, "full-proficiency refringe")
    closeTo(factors.luminizeMultiplier!, 3.692, "full-proficiency multiplier")
    closeTo(factors.anomalyDamageLevel!, 2, "untruncated level zone")
    closeTo(factors.defense!, 1, "defense")
    closeTo(factors.resistance!, 1, "resistance")
    closeTo(
      result.value.nonCritical,
      1400 * 2.5 * 2.46 * 1.1492 * 3.692 * 2,
      "controlled value",
    )
  })

  it("keeps the restricted proficiency while a teammate team-mastery effect feeds only R and the multiplier", () => {
    // 队友简·乔艾 R5 团队精通 +96：受限 P 仍 246，完整 P=342 只进入
    // R=1.1684 与耀变倍率 3.884。
    const result = resultFor(
      voidflareInput({
        mindscapeRank: 1,
        selections: [
          ...corePassiveOptions.map((optionId) => ({
            optionId,
            bindingId: REMIEL_BINDING,
            layers: 1,
          })),
          { optionId: convertOption, bindingId: REMIEL_BINDING, layers: 1 },
          {
            optionId: engineMasteryOption,
            bindingId: REMIEL_ENGINE_BINDING,
            layers: 1,
          },
          {
            optionId: fourPieceMasteryOption,
            bindingId: REMIEL_DISC_BINDING,
            layers: 1,
          },
          {
            optionId: joyauTeamMasteryOption,
            bindingId: JANE_ENGINE_BINDING,
            layers: 1,
          },
        ],
      }),
    )
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (!result.ok) return
    const factors = result.value.factors.nonCritical
    closeTo(
      factors.anomalyProficiency!,
      2.46,
      "restricted proficiency unchanged",
    )
    closeTo(factors.refringe!, 1.1684, "full proficiency refringe")
    closeTo(factors.luminizeMultiplier!, 3.884, "full proficiency multiplier")
    closeTo(
      result.value.nonCritical,
      1400 * 2.5 * 2.46 * 1.1684 * 3.884 * 2,
      "teammate value",
    )
  })

  it("applies the Flight_of_Fancy element exemption only to the restricted reading", () => {
    // 飞鸟星梦 R1 六层 +120：专用受限读取不计以太白名单（流明可读），
    // 普通 current 精通读取仍被以太条件排除 → R/倍率只读 100。
    const result = resultFor(
      voidflareInput({
        engine: "fancy",
        selections: [
          ...corePassiveOptions.map((optionId) => ({
            optionId,
            bindingId: REMIEL_BINDING,
            layers: 1,
          })),
          { optionId: convertOption, bindingId: REMIEL_BINDING, layers: 1 },
          { optionId: fancyMasteryOption, bindingId: FANCY_BINDING, layers: 6 },
        ],
      }),
    )
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (!result.ok) return
    const factors = result.value.factors.nonCritical
    closeTo(factors.anomalyProficiency!, 2.2, "restricted proficiency 100+120")
    closeTo(factors.refringe!, 1.12, "full proficiency refringe 100")
    closeTo(factors.luminizeMultiplier!, 3.4, "full proficiency multiplier 100")
    closeTo(
      result.value.nonCritical,
      1400 * 2.5 * 2.2 * 1.12 * 3.4 * 2,
      "exempt reading value",
    )
  })

  it("splits generic and radiance-specific resistance ignores by the named mechanism metadata", () => {
    // 蕾米 M1 耀变抗穿 .5（自身标记来源）与耀嘉音 M1 团队通用抗穿 .06 都进入
    // （支援位使三异常门槛失败，异化只剩精通换算 1.0492）；把耀嘉音的通用抗穿
    // 伪造为耀变标记后，非自身持有者的贡献被排除。
    const withBoth = resultFor(
      voidflareInput({
        mindscapeRank: 1,
        teammates: "astrayao-velina",
        targetResistance: 0,
        selections: [
          ...corePassiveOptions.map((optionId) => ({
            optionId,
            bindingId: REMIEL_BINDING,
            layers: 1,
          })),
          { optionId: convertOption, bindingId: REMIEL_BINDING, layers: 1 },
          {
            optionId: engineMasteryOption,
            bindingId: REMIEL_ENGINE_BINDING,
            layers: 1,
          },
          {
            optionId: fourPieceMasteryOption,
            bindingId: REMIEL_DISC_BINDING,
            layers: 1,
          },
          {
            optionId: mindspaceOneOption,
            bindingId: REMIEL_BINDING,
            layers: 1,
          },
          {
            optionId: astrayaoResPenOption,
            bindingId: ASTRAYAO_BINDING,
            layers: 1,
          },
        ],
      }),
    )
    expect(withBoth.ok, JSON.stringify(withBoth)).toBe(true)
    if (withBoth.ok) {
      closeTo(
        withBoth.value.factors.nonCritical.resistance!,
        1 + 0.5 + 0.06,
        "own radiance plus teammate generic ignores",
      )
      closeTo(
        withBoth.value.factors.nonCritical.refringe!,
        1.0492,
        "team gate fails with a support teammate",
      )
    }

    const astrayaoEffectId =
      "agent:1311:zzz-hp:legacy-team-resPen:blk-legacy:mindscape:1"
    const markedCatalog: StaticEffectCatalog = {
      ...catalog,
      mechanisms: catalog.mechanisms!.map((mechanism) =>
        mechanism.mechanism === "remielle-special-voidflare"
          ? {
              ...mechanism,
              radianceResistanceIgnoreEffectIds: [
                ...mechanism.radianceResistanceIgnoreEffectIds,
                astrayaoEffectId,
              ],
            }
          : mechanism,
      ),
    }
    const excluded = resultFor(
      voidflareInput({
        mindscapeRank: 1,
        teammates: "astrayao-velina",
        catalog: markedCatalog,
        selections: [
          ...corePassiveOptions.map((optionId) => ({
            optionId,
            bindingId: REMIEL_BINDING,
            layers: 1,
          })),
          { optionId: convertOption, bindingId: REMIEL_BINDING, layers: 1 },
          {
            optionId: engineMasteryOption,
            bindingId: REMIEL_ENGINE_BINDING,
            layers: 1,
          },
          {
            optionId: fourPieceMasteryOption,
            bindingId: REMIEL_DISC_BINDING,
            layers: 1,
          },
          {
            optionId: mindspaceOneOption,
            bindingId: REMIEL_BINDING,
            layers: 1,
          },
          {
            optionId: astrayaoResPenOption,
            bindingId: ASTRAYAO_BINDING,
            layers: 1,
          },
        ],
      }),
    )
    expect(excluded.ok, JSON.stringify(excluded)).toBe(true)
    if (excluded.ok)
      closeTo(
        excluded.value.factors.nonCritical.resistance!,
        1.5,
        "radiance-marked teammate ignore is excluded",
      )
  })

  it("applies M4 once and the mindscape-6 quarter once, together and separately", () => {
    const base = resultFor(voidflareInput({ mindscapeRank: 4 }))
    expect(base.ok, JSON.stringify(base)).toBe(true)
    if (base.ok)
      closeTo(
        base.value.factors.nonCritical.luminizeMultiplier!,
        3.692,
        "M4 off",
      )

    const m4 = resultFor(
      voidflareInput({
        mindscapeRank: 4,
        selections: [
          ...corePassiveOptions.map((optionId) => ({
            optionId,
            bindingId: REMIEL_BINDING,
            layers: 1,
          })),
          { optionId: convertOption, bindingId: REMIEL_BINDING, layers: 1 },
          {
            optionId: engineMasteryOption,
            bindingId: REMIEL_ENGINE_BINDING,
            layers: 1,
          },
          {
            optionId: fourPieceMasteryOption,
            bindingId: REMIEL_DISC_BINDING,
            layers: 1,
          },
          {
            optionId: mindspaceFourOption,
            bindingId: REMIEL_BINDING,
            layers: 1,
          },
        ],
      }),
    )
    expect(m4.ok, JSON.stringify(m4)).toBe(true)
    if (m4.ok) {
      closeTo(
        m4.value.factors.nonCritical.luminizeMultiplier!,
        3.692 * 1.12,
        "M4 once",
      )
      closeTo(
        m4.value.nonCritical,
        base.ok ? base.value.nonCritical * 1.12 : 0,
        "M4 value",
      )
    }

    const quarter = resultFor(
      voidflareInput({
        mindscapeRank: 6,
        strength: "mindscape-6-quarter",
        selections: [
          ...corePassiveOptions.map((optionId) => ({
            optionId,
            bindingId: REMIEL_BINDING,
            layers: 1,
          })),
          { optionId: convertOption, bindingId: REMIEL_BINDING, layers: 1 },
          {
            optionId: engineMasteryOption,
            bindingId: REMIEL_ENGINE_BINDING,
            layers: 1,
          },
          {
            optionId: fourPieceMasteryOption,
            bindingId: REMIEL_DISC_BINDING,
            layers: 1,
          },
          {
            optionId: mindspaceFourOption,
            bindingId: REMIEL_BINDING,
            layers: 1,
          },
        ],
      }),
    )
    expect(quarter.ok, JSON.stringify(quarter)).toBe(true)
    if (quarter.ok)
      closeTo(
        quarter.value.factors.nonCritical.luminizeMultiplier!,
        3.692 * 1.12 * 0.25,
        "M4 plus quarter",
      )
  })

  it("rejects the superseded M6 anchor options while zero layers stay identity-checked only", () => {
    for (const optionId of [
      mindspaceSixAdditionOption,
      mindspaceSixIncreaseOption,
    ]) {
      const result = resultFor(
        voidflareInput({
          mindscapeRank: 6,
          selections: [
            ...corePassiveOptions.map((id) => ({
              optionId: id,
              bindingId: REMIEL_BINDING,
              layers: 1,
            })),
            { optionId: convertOption, bindingId: REMIEL_BINDING, layers: 1 },
            {
              optionId: engineMasteryOption,
              bindingId: REMIEL_ENGINE_BINDING,
              layers: 1,
            },
            {
              optionId: fourPieceMasteryOption,
              bindingId: REMIEL_DISC_BINDING,
              layers: 1,
            },
            { optionId, bindingId: REMIEL_BINDING, layers: 1 },
          ],
        }),
      )
      expect(result.ok, optionId).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some(
            (issue) =>
              issue.code === "CONTEXT_MISMATCH" &&
              issue.message.includes(optionId),
          ),
          optionId,
        ).toBe(true)
    }
    const zeroLayers = resultFor(
      voidflareInput({
        mindscapeRank: 6,
        strength: "mindscape-6-quarter",
        selections: [
          ...corePassiveOptions.map((id) => ({
            optionId: id,
            bindingId: REMIEL_BINDING,
            layers: 1,
          })),
          { optionId: convertOption, bindingId: REMIEL_BINDING, layers: 1 },
          {
            optionId: engineMasteryOption,
            bindingId: REMIEL_ENGINE_BINDING,
            layers: 1,
          },
          {
            optionId: fourPieceMasteryOption,
            bindingId: REMIEL_DISC_BINDING,
            layers: 1,
          },
          {
            optionId: mindspaceFourOption,
            bindingId: REMIEL_BINDING,
            layers: 0,
          },
        ],
      }),
    )
    expect(zeroLayers.ok, JSON.stringify(zeroLayers)).toBe(true)
    if (zeroLayers.ok)
      closeTo(
        zeroLayers.value.factors.nonCritical.luminizeMultiplier!,
        3.692 * 0.25,
        "M4 layers zero",
      )
  })

  it("rejects per-hit multiplier selections from other agents", () => {
    const graceMultiplierOption = catalog.options.find(
      (option) =>
        option.catalogEntityId === "agents:grace" &&
        option.variants.some((variant) =>
          variant.effectIds.some((effectId) => {
            const rule = definitions.effects.find(
              (r) => r.effectId === effectId,
            )
            return (
              rule?.kind === "contribution" &&
              rule.operation.kind === "factor-contribution" &&
              rule.operation.channel === "base-multiplier-addition"
            )
          }),
        ),
    )!
    expect(
      graceMultiplierOption,
      "grace carries a base-multiplier option",
    ).toBeTruthy()
    const held = resultFor(
      voidflareInput({
        mindscapeRank: 1,
        teammates: "grace-velina",
        selections: [
          ...corePassiveOptions.map((id) => ({
            optionId: id,
            bindingId: REMIEL_BINDING,
            layers: 1,
          })),
          { optionId: convertOption, bindingId: REMIEL_BINDING, layers: 1 },
          {
            optionId: engineMasteryOption,
            bindingId: REMIEL_ENGINE_BINDING,
            layers: 1,
          },
          {
            optionId: fourPieceMasteryOption,
            bindingId: REMIEL_DISC_BINDING,
            layers: 1,
          },
          {
            optionId: graceMultiplierOption.optionId,
            bindingId: GRACE_BINDING,
            layers: 1,
          },
        ],
      }),
    )
    expect(held.ok).toBe(false)
    if (!held.ok)
      expect(
        held.issues.some(
          (issue) =>
            issue.code === "CONTEXT_MISMATCH" &&
            issue.message.includes("rejects per-hit"),
        ),
      ).toBe(true)
  })

  it("validates level, strength gates and the unique level source", () => {
    for (const level of [0, 61, 2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = resultFor(
        voidflareInput({ level: Number.isNaN(level) ? level : level }),
      )
      expect(result.ok, `level ${String(level)}`).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some((issue) =>
            issue.pointer.includes("/damage/anomalySource/level"),
          ),
          `level ${String(level)}`,
        ).toBe(true)
    }
    // 低层目录显式数值入口开放 1—60 的等级。
    for (const [level, bonus, levelZone] of [
      [1, 1.025, 1],
      [30, 1.75, 88 / 59],
      [59, 1 + 0.025 * 59, 117 / 59],
    ] as const) {
      const result = resultFor(voidflareInput({ level }))
      expect(result.ok, `level ${level}`).toBe(true)
      if (result.ok) {
        closeTo(
          result.value.factors.nonCritical.damageBonus!,
          bonus,
          `bonus ${level}`,
        )
        closeTo(
          result.value.factors.nonCritical.anomalyDamageLevel!,
          levelZone,
          `level zone ${level}`,
        )
      }
    }
    // strength 门槛。
    const rank0 = resultFor(voidflareInput({ mindscapeRank: 0 }))
    expect(rank0.ok).toBe(false)
    if (!rank0.ok)
      expect(
        rank0.issues.some((issue) =>
          issue.message.includes("requires mindscape rank 1"),
        ),
      ).toBe(true)
    const quarterAtFive = resultFor(
      voidflareInput({ mindscapeRank: 5, strength: "mindscape-6-quarter" }),
    )
    expect(quarterAtFive.ok).toBe(false)
    if (!quarterAtFive.ok)
      expect(
        quarterAtFive.issues.some((issue) =>
          issue.message.includes("requires mindscape rank 6"),
        ),
      ).toBe(true)
    // 独立防御等级被拒绝。
    const divergentDefense = resultFor(
      voidflareInput({
        damage: {
          defense: {
            attackerLevel: 30,
            targetBaseDefense: 0,
            defensePercentageAdjustments: [],
            penetrationValues: [],
          },
        } as never,
      }),
    )
    expect(divergentDefense.ok).toBe(false)
    if (!divergentDefense.ok)
      expect(
        divergentDefense.issues.some((issue) =>
          issue.pointer.includes("/damage/defense/attackerLevel"),
        ),
      ).toBe(true)
  })

  it("validates the hit shape and identity contract", () => {
    const wrongElement = resultFor(
      voidflareInput({ hit: { element: "ether" } }),
    )
    expect(wrongElement.ok).toBe(false)
    if (!wrongElement.ok)
      expect(
        wrongElement.issues.some((issue) => issue.pointer === "/hit/element"),
      ).toBe(true)

    const actionSnapshot = resultFor(
      voidflareInput({ hit: { actionSnapshotId: "snapshot:history" } }),
    )
    expect(actionSnapshot.ok).toBe(false)
    if (!actionSnapshot.ok)
      expect(
        actionSnapshot.issues.some((issue) =>
          issue.pointer.includes("actionSnapshotId"),
        ),
      ).toBe(true)

    const twoItems = resultFor(
      voidflareInput({
        hit: {
          damageItems: [
            {
              mode: "direct",
              role: "base",
              itemId: "one",
              stat: "attack",
              statSource: { entityId: "entity:remiel" },
              damageMultiplier: 1,
            },
            {
              mode: "direct",
              role: "base",
              itemId: "two",
              stat: "attack",
              statSource: { entityId: "entity:remiel" },
              damageMultiplier: 1,
            },
          ],
        },
      }),
    )
    expect(twoItems.ok).toBe(false)

    const wrongStat = resultFor(
      voidflareInput({
        hit: {
          damageItems: [
            {
              mode: "direct",
              role: "base",
              itemId: "one",
              stat: "health",
              statSource: { entityId: "entity:remiel" },
              damageMultiplier: 1,
            },
          ],
        },
      }),
    )
    expect(wrongStat.ok).toBe(false)

    const wrongMultiplier = resultFor(
      voidflareInput({
        hit: {
          damageItems: [
            {
              mode: "direct",
              role: "base",
              itemId: "one",
              stat: "attack",
              statSource: { entityId: "entity:remiel" },
              damageMultiplier: 2,
            },
          ],
        },
      }),
    )
    expect(wrongMultiplier.ok).toBe(false)

    const wrongStatSource = resultFor(
      voidflareInput({
        hit: {
          damageItems: [
            {
              mode: "direct",
              role: "base",
              itemId: "one",
              stat: "attack",
              statSource: { entityId: "entity:jane" },
              damageMultiplier: 1,
            },
          ],
        },
      }),
    )
    expect(wrongStatSource.ok).toBe(false)

    const snapshottedStatSource = resultFor(
      voidflareInput({
        hit: {
          damageItems: [
            {
              mode: "direct",
              role: "base",
              itemId: "one",
              stat: "attack",
              statSource: {
                entityId: "entity:remiel",
                snapshotId: "snapshot:history",
              },
              damageMultiplier: 1,
            },
          ],
        },
      }),
    )
    expect(snapshottedStatSource.ok).toBe(false)

    const sourceMismatch = resultFor(
      voidflareInput({
        hit: { actorId: "entity:jane" },
      }),
    )
    expect(sourceMismatch.ok).toBe(false)

    const wrongAgent = resultFor(
      voidflareInput({
        anomalySource: {
          mechanism: "remielle-special-voidflare",
          entityId: "entity:velina",
          level: 60,
          strength: "full",
        },
        hit: { actorId: "entity:velina" },
      }),
    )
    expect(wrongAgent.ok).toBe(false)
  })

  it("validates damage baseline fields of the mechanism branch", () => {
    const settledBonus = resultFor(
      voidflareInput({
        damage: {
          damageBonus: { settledMultiplier: 1.5 },
        } as never,
      }),
    )
    expect(settledBonus.ok).toBe(false)
    if (!settledBonus.ok)
      expect(
        settledBonus.issues.some((issue) =>
          issue.pointer.includes("/damage/damageBonus"),
        ),
      ).toBe(true)

    const nonEmptyBonus = resultFor(
      voidflareInput({ damage: { damageBonus: [0.3] } as never }),
    )
    expect(nonEmptyBonus.ok).toBe(false)

    const settledRefringe = resultFor(
      voidflareInput({
        damage: { refringe: { mode: "settled", multiplier: 1.2 } },
      }),
    )
    expect(settledRefringe.ok).toBe(false)

    const callerAdjustment = resultFor(
      voidflareInput({
        damage: {
          luminizeMultiplier: {
            baseLuminizeMultiplier: 3.2,
            multiplicativeLuminizeMultiplierAdjustments: [1.2],
          },
        },
      }),
    )
    expect(callerAdjustment.ok).toBe(false)

    const wrongKind = calculateStaticDamageFromCatalog({
      ...voidflareInput({}),
      damage: {
        ...voidflareInput({}).damage,
        kind: "anomaly",
        anomalyCriticalRate: 0,
        anomalyCriticalDamage: [],
      } as never,
    })
    expect(wrongKind.ok).toBe(false)
  })

  it("keeps rejecting Remielle as a plain anomaly source for every anomaly kind", () => {
    for (const kind of ["luminize", "anomaly"] as const) {
      const plain = calculateStaticDamageFromCatalog({
        ...voidflareInput({}),
        damage: {
          ...(kind === "luminize"
            ? voidflareInput({}).damage
            : {
                ...voidflareInput({}).damage,
                kind: "anomaly",
                anomalyCriticalRate: 0,
                anomalyCriticalDamage: [],
              }),
          anomalySource: { entityId: "entity:remiel", level: 60 },
        } as never,
      })
      expect(plain.ok, kind).toBe(false)
      if (!plain.ok)
        expect(
          plain.issues.some((issue) =>
            issue.message.includes("remielle-special-voidflare"),
          ),
          kind,
        ).toBe(true)
    }
  })

  it("rejects the mechanism when the catalog does not declare it while normal calls stay compatible", () => {
    const legacyCatalog: StaticEffectCatalog = { ...catalog }
    delete (legacyCatalog as { mechanisms?: unknown }).mechanisms
    const requested = resultFor(voidflareInput({ catalog: legacyCatalog }))
    expect(requested.ok).toBe(false)
    if (!requested.ok)
      expect(
        requested.issues.some((issue) =>
          issue.message.includes(
            "does not declare the remielle-special-voidflare mechanism",
          ),
        ),
      ).toBe(true)
    // 普通旧目录调用保持可用：蕾米触发、维琳娜作为普通异常来源的耀变。
    const baseInput = voidflareInput({ mindscapeRank: 1 })
    const normal = calculateStaticDamageFromCatalog({
      ...baseInput,
      catalog: legacyCatalog,
      bindings: baseInput.bindings.filter(
        (binding) =>
          binding.bindingId === REMIEL_BINDING ||
          binding.bindingId === VELINA_BINDING,
      ),
      selections: [
        {
          optionId: "agents:remiel:mindscape:0:blk-legacy:eff-ms7tarv6-tfz2kz",
          bindingId: REMIEL_BINDING,
          layers: 1,
        },
      ],
      inputs: [],
      world: {
        ...baseInput.world,
        entities: baseInput.world.entities.map((entity) =>
          entity.kind === "actor" && entity.entityId === "entity:velina"
            ? {
                ...entity,
                generalStats: {
                  attack: general(2000),
                  anomalyProficiency: general(120),
                },
                directStats: {
                  criticalRate: { baseValue: 0.05, additions: [] },
                  criticalDamage: { baseValue: 0.5, additions: [] },
                  penetrationRatio: { baseValue: 0, additions: [] },
                },
              }
            : entity,
        ),
      },
      hit: {
        ...baseInput.hit,
        damageItems: [
          {
            mode: "direct",
            role: "base",
            itemId: "base",
            stat: "attack",
            statSource: { entityId: "entity:velina" },
            damageMultiplier: 2,
          },
        ],
      },
      damage: {
        ...baseInput.damage,
        anomalySource: { entityId: "entity:velina", level: 60 },
      },
    } as unknown as StaticCatalogDamageInput)
    expect(normal.ok, JSON.stringify(normal)).toBe(true)
  })

  it("keeps ordinary damage-bonus selections out of the special base zone", () => {
    const unaffected = resultFor(
      voidflareInput({
        mindscapeRank: 1,
        selections: [
          ...corePassiveOptions.map((id) => ({
            optionId: id,
            bindingId: REMIEL_BINDING,
            layers: 1,
          })),
          { optionId: convertOption, bindingId: REMIEL_BINDING, layers: 1 },
          {
            optionId: engineMasteryOption,
            bindingId: REMIEL_ENGINE_BINDING,
            layers: 1,
          },
          {
            optionId: engineDamageBonusOption,
            bindingId: REMIEL_ENGINE_BINDING,
            layers: 1,
          },
          {
            optionId: fourPieceMasteryOption,
            bindingId: REMIEL_DISC_BINDING,
            layers: 1,
          },
        ],
      }),
    )
    expect(unaffected.ok, JSON.stringify(unaffected)).toBe(true)
    if (!unaffected.ok) return
    closeTo(
      unaffected.value.factors.nonCritical.damageBonus!,
      2.5,
      "settled bonus unchanged",
    )
    expect(
      unaffected.value.notApplicableContributions.some(
        (contribution) =>
          contribution.address.kind === "factor" &&
          contribution.address.channel === "damage-bonus",
      ),
      "the ordinary damage bonus is reported as not applicable",
    ).toBe(true)
  })

  it("combines the anomaly damage bonus zone from effects", () => {
    const result = resultFor(
      voidflareInput({
        mindscapeRank: 1,
        selections: [
          ...corePassiveOptions.map((id) => ({
            optionId: id,
            bindingId: REMIEL_BINDING,
            layers: 1,
          })),
          { optionId: convertOption, bindingId: REMIEL_BINDING, layers: 1 },
          {
            optionId: engineMasteryOption,
            bindingId: REMIEL_ENGINE_BINDING,
            layers: 1,
          },
          {
            optionId: engineAnomalyBonusOption,
            bindingId: REMIEL_ENGINE_BINDING,
            layers: 1,
          },
          {
            optionId: fourPieceMasteryOption,
            bindingId: REMIEL_DISC_BINDING,
            layers: 1,
          },
          {
            optionId: fourPieceAnomalyBonusOption,
            bindingId: REMIEL_DISC_BINDING,
            layers: 1,
          },
        ],
      }),
    )
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (result.ok)
      closeTo(
        result.value.factors.nonCritical.anomalyDamageBonus!,
        1.35,
        "w-engine 0.20 plus four-piece 0.15",
      )
  })

  it("caps the self attack conversion at the source cap", () => {
    const capped = resultFor(
      voidflareInput({
        attack: 5000,
        inputs: [
          {
            bindingId: REMIEL_BINDING,
            name: convertInputName,
            value: { unit: "attack-points", value: 5000 },
          },
        ],
      }),
    )
    expect(capped.ok, JSON.stringify(capped)).toBe(true)
    if (capped.ok)
      closeTo(
        capped.value.factors.nonCritical.baseDamage!,
        5000 + 1600,
        "cap 1600",
      )
    const belowCap = resultFor(
      voidflareInput({
        attack: 4000,
        inputs: [
          {
            bindingId: REMIEL_BINDING,
            name: convertInputName,
            value: { unit: "attack-points", value: 4000 },
          },
        ],
      }),
    )
    expect(belowCap.ok, JSON.stringify(belowCap)).toBe(true)
    if (belowCap.ok)
      closeTo(
        belowCap.value.factors.nonCritical.baseDamage!,
        4000 + 1600,
        "cap boundary",
      )
  })

  it("tolerates unreferenced snapshots and does not leak state across consecutive calls", () => {
    const withSnapshots = resultFor(
      voidflareInput({
        snapshots: [
          {
            snapshotId: "snapshot:unreferenced",
            atSeconds: 0,
            attributes: [
              {
                entityId: "entity:remiel",
                stat: "attack",
                stage: "current",
                value: { unit: "attack-points", value: 999 },
              },
            ],
            world: {
              entities: [
                {
                  kind: "actor",
                  entityId: "entity:remiel",
                  teamId: "team:players",
                  generalStats: {},
                  directStats: {},
                },
              ],
              states: [],
              distances: [],
            },
          },
        ],
      }),
    )
    expect(withSnapshots.ok, JSON.stringify(withSnapshots)).toBe(true)
    if (withSnapshots.ok)
      closeTo(
        withSnapshots.value.factors.nonCritical.baseDamage!,
        1400,
        "unreferenced snapshot ignored",
      )

    const teammateInput = voidflareInput({
      mindscapeRank: 1,
      selections: [
        ...corePassiveOptions.map((id) => ({
          optionId: id,
          bindingId: REMIEL_BINDING,
          layers: 1,
        })),
        { optionId: convertOption, bindingId: REMIEL_BINDING, layers: 1 },
        {
          optionId: engineMasteryOption,
          bindingId: REMIEL_ENGINE_BINDING,
          layers: 1,
        },
        {
          optionId: fourPieceMasteryOption,
          bindingId: REMIEL_DISC_BINDING,
          layers: 1,
        },
        {
          optionId: joyauTeamMasteryOption,
          bindingId: JANE_ENGINE_BINDING,
          layers: 1,
        },
      ],
    })
    const first = resultFor(teammateInput)
    const second = resultFor(voidflareInput({ mindscapeRank: 1 }))
    const third = resultFor(teammateInput)
    expect(first.ok && second.ok && third.ok).toBe(true)
    if (first.ok && second.ok && third.ok) {
      closeTo(first.value.factors.nonCritical.refringe!, 1.1684, "call one")
      closeTo(second.value.factors.nonCritical.refringe!, 1.1492, "call two")
      closeTo(third.value.factors.nonCritical.refringe!, 1.1684, "call three")
      expect(third.value.nonCritical).toBe(first.value.nonCritical)
    }
  })
})
