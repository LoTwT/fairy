import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  calculateStaticDamage,
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
  prepareEffects,
  supplyEffectState,
  evaluateEffects,
} from "../../src/effects/index.ts"
import type {
  CoreSkillLevel,
  EffectRule,
  EntityId,
  HitContext,
  MindscapeRank,
  StaticCatalogDamageInput,
  StaticDamageInput,
  StaticDamageResult,
  StaticEffectCatalog,
} from "../../src/effects/index.ts"
import {
  makeRoxyMindscapeRequest,
  roxyMindscapeOptions,
} from "../../../data/test/fixtures/roxy-mindscape-consumer.ts"

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

const [
  resistanceOption,
  criticalOption,
  stunOption,
  ultimateOption,
  ignoreOption,
] = roxyMindscapeOptions
const preciseTarget = "zzz-hp:skill:roxy-requiem-for-the-night-burial"
const ranks = [1, 1, 2, 4, 6] as const
const effectIdFor = (optionId: string) =>
  optionId.replace("nanoka:agents:1621:", "agent:1621:nanoka:")
function request(
  rank: MindscapeRank = 6,
  core: CoreSkillLevel = 7,
): ReturnType<typeof makeRoxyMindscapeRequest> {
  const input = makeRoxyMindscapeRequest(definitions, catalog, rank, core)
  return { ...input, hit: { ...input.hit, skillTargetIds: [preciseTarget] } }
}
const select = (
  optionId: string,
  layers = 1,
  bindingId: `binding:${string}` = "binding:roxy",
) => ({ optionId, layers, bindingId })
function calculate(input: StaticCatalogDamageInput): StaticDamageResult {
  const result = calculateStaticDamageFromCatalog(input)
  expect(result.ok, result.ok ? "" : JSON.stringify(result.issues)).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  expect(result.value.expected).toBeGreaterThan(0)
  return result.value
}
const contribution = (result: StaticDamageResult, optionId: string) =>
  [
    ...result.evaluation.contributions,
    ...(result.preparations ?? []).flatMap((value) => value.contributions),
  ].filter((value) => value.origin.effectId === effectIdFor(optionId))
const valueFor = (result: StaticDamageResult, optionId: string) =>
  contribution(result, optionId).reduce(
    (sum, value) => sum + value.value.value,
    0,
  )

const damageKinds = [
  "regular",
  "anomaly",
  "disorder",
  "vortex",
  "anomaly-settlement",
] as const
function providerRequest(
  kind: (typeof damageKinds)[number],
  actor: EntityId,
  provider: EntityId,
  element: "wind" | "fire",
  history = false,
): StaticCatalogDamageInput {
  const input = request()
  const statSource = {
    entityId: provider,
    ...(history ? { snapshotId: "snapshot:history" as const } : {}),
  }
  return {
    ...input,
    hit: {
      ...input.hit,
      actorId: actor,
      element,
      skillTargetIds: [],
      damageItems: [{ ...input.hit.damageItems[0]!, statSource }],
    },
    ...(history
      ? {
          snapshots: [
            {
              snapshotId: "snapshot:history" as const,
              atSeconds: 0,
              world: input.world,
              attributes: [
                {
                  entityId: provider,
                  stat: "attack" as const,
                  stage: "current" as const,
                  value: { unit: "attack-points" as const, value: 1300 },
                },
                {
                  entityId: provider,
                  stat: "anomalyProficiency" as const,
                  stage: "current" as const,
                  value: {
                    unit: "anomaly-proficiency-points" as const,
                    value: 270,
                  },
                },
                {
                  entityId: provider,
                  stat: "penetrationRatio" as const,
                  stage: "current" as const,
                  value: { unit: "ratio" as const, value: 0.17 },
                },
              ],
            },
          ],
        }
      : {}),
    damage:
      kind === "regular"
        ? input.damage
        : {
            ...input.damage,
            kind,
            anomalySource: { ...statSource, level: 60 },
            anomalyDamageBonus: [],
            refringe: { mode: "settled", multiplier: 1 },
            anomalyCriticalRate: 0,
            anomalyCriticalDamage: [],
          },
  }
}
function lowRequest(
  input: StaticCatalogDamageInput,
  layers = 1,
): StaticDamageInput {
  const { skillTargetIds: _targets, ...hit } = input.hit
  const anomaly =
    "anomalySource" in input.damage ? input.damage.anomalySource : undefined
  const damage = { ...input.damage } as Record<string, unknown>
  delete damage["anomalySource"]
  if ("refringe" in damage) damage["refringe"] = { settledMultiplier: 1 }
  return {
    definitions,
    bindings: input.bindings,
    world: input.world,
    ...(input.snapshots ? { snapshots: input.snapshots } : {}),
    selections: [
      {
        effectId: effectIdFor(ignoreOption) as `agent:${string}`,
        bindingId: "binding:roxy",
        layers,
      },
    ],
    hit: {
      ...hit,
      damageItems: hit.damageItems.map((item) => ({
        itemId: item.itemId,
        stat: item.stat,
        statSource: item.statSource,
        damageMultiplier: item.mode === "direct" ? item.damageMultiplier : 0,
      })) as unknown as StaticDamageInput["hit"]["damageItems"],
      ...(anomaly
        ? {
            attributeSources: {
              anomalyProficiency: {
                entityId: anomaly.entityId,
                ...("snapshotId" in anomaly && anomaly.snapshotId
                  ? { snapshotId: anomaly.snapshotId }
                  : {}),
              },
              penetrationRatio: {
                entityId: anomaly.entityId,
                ...("snapshotId" in anomaly && anomaly.snapshotId
                  ? { snapshotId: anomaly.snapshotId }
                  : {}),
              },
            },
          }
        : {}),
    },
    damage: damage as unknown as StaticDamageInput["damage"],
  }
}

describe("Roxy fixed mindscape clauses", () => {
  it("keeps a legal nonzero pre-existing request", () => {
    const result = calculateStaticDamageFromCatalog(
      makeRoxyMindscapeRequest(definitions, catalog),
    )
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (result.ok) expect(result.value.expected).toBe(2362.5)
  })
  it.each(roxyMindscapeOptions)(
    "provides the independent option %s",
    (optionId) => {
      expect(
        catalog.options.find((option) => option.optionId === optionId),
      ).toBeDefined()
    },
  )

  it.each(
    roxyMindscapeOptions.flatMap((optionId, index) =>
      [0, 1, 2, 3, 4, 5, 6].map((rank) => ({
        optionId,
        minimum: ranks[index]!,
        rank: rank as MindscapeRank,
      })),
    ),
  )(
    "$optionId at M$rank enforces the cultivation threshold $minimum",
    ({ optionId, minimum, rank }) => {
      const input = request(rank)
      expect(calculate({ ...input, selections: [] }).expected).toBe(2362.5)
      // 目录0层仍先验证培养，低层supplied 0 的正整数契约单独验证。
      for (const layers of [0, 1]) {
        const result = calculateStaticDamageFromCatalog({
          ...input,
          selections: [select(optionId, layers)],
        })
        expect(result.ok).toBe(rank >= minimum)
        if (!result.ok)
          expect(
            result.issues.some((issue) => issue.code === "CONTEXT_MISMATCH"),
          ).toBe(true)
        else
          expect(valueFor(result.value, optionId)).toBeCloseTo(
            layers === 0
              ? 0
              : [0.15, 0.4, 0.3, 0.2, 0.15][
                  roxyMindscapeOptions.indexOf(optionId)
                ]!,
            12,
          )
      }
    },
  )
  it.each(
    roxyMindscapeOptions.flatMap((optionId) =>
      [1, 2, 3, 4, 5, 6, 7].map((core) => ({
        optionId,
        core: core as CoreSkillLevel,
      })),
    ),
  )("$optionId is fixed at core $core", ({ optionId, core }) => {
    const result = calculate({
      ...request(6, core),
      selections: [select(optionId)],
    })
    expect(valueFor(result, optionId)).toBeCloseTo(
      [0.15, 0.4, 0.3, 0.2, 0.15][roxyMindscapeOptions.indexOf(optionId)]!,
      12,
    )
  })
  it.each(
    roxyMindscapeOptions.flatMap((optionId) =>
      [-1, 0.5, 2, NaN, Infinity].map((layers) => ({ optionId, layers })),
    ),
  )("rejects $optionId layers=$layers", ({ optionId, layers }) => {
    const result = calculateStaticDamageFromCatalog({
      ...request(),
      selections: [select(optionId, layers)],
    })
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(
        result.issues.some((issue) => issue.code === "INVALID_INPUT"),
      ).toBe(true)
  })
  it.each(roxyMindscapeOptions)(
    "rejects duplicate and wrong binding for %s",
    (optionId) => {
      for (const selections of [
        [select(optionId), select(optionId)],
        [select(optionId, 1, "binding:missing")],
      ])
        expect(
          calculateStaticDamageFromCatalog({ ...request(), selections }).ok,
        ).toBe(false)
      const input = request()
      expect(
        calculateStaticDamageFromCatalog({
          ...input,
          bindings: [{ ...input.bindings[0]!, sourceEntityId: "1251" }],
          selections: [select(optionId)],
        }).ok,
      ).toBe(false)
    },
  )
  it.each([
    [false, false, 2362.5],
    [true, false, 2868.75],
    [false, true, 2572.5],
    [true, true, 3123.75],
  ] as const)(
    "M1 reduction=%s and CD=%s are independent",
    (resistance, critical, expected) => {
      const result = calculate({
        ...request(),
        selections: [
          ...(resistance ? [select(resistanceOption)] : []),
          ...(critical ? [select(criticalOption)] : []),
        ],
      })
      expect(result.expected).toBeCloseTo(expected, 10)
      expect(valueFor(result, resistanceOption)).toBe(resistance ? 0.15 : 0)
      expect(valueFor(result, criticalOption)).toBe(critical ? 0.4 : 0)
    },
  )
  it.each(["entity:enemy", "entity:enemy2"] as const)(
    "M1/M2 declaration applies to current target %s for a teammate",
    (targetId) => {
      const input = request()
      const hit = {
        ...input.hit,
        actorId: "entity:other" as const,
        targetId,
        actionId: "action:other-basic" as const,
        skillCategory: "basic" as const,
        skillTargetIds: [],
        element: "electric" as const,
        damageItems: [
          {
            ...input.hit.damageItems[0]!,
            statSource: { entityId: "entity:other" as const },
          },
        ] as StaticCatalogDamageInput["hit"]["damageItems"],
      }
      const result = calculate({
        ...input,
        hit,
        selections: [
          select(resistanceOption),
          select(criticalOption),
          select(stunOption),
        ],
      })
      expect(result.factors.nonCritical["resistance"]).toBeCloseTo(0.85, 12)
      expect(result.factors.nonCritical["stunDamage"]).toBeCloseTo(1.8, 12)
      expect(valueFor(result, criticalOption)).toBe(0)
      expect(contribution(result, resistanceOption)[0]!.origin).toMatchObject({
        bindingId: "binding:roxy",
        beneficiaryId: "entity:other",
      })
      const without = calculate({ ...input, hit, selections: [] })
      expect(without.factors.nonCritical["resistance"]).toBe(0.7)
    },
  )
  it("isolates two Roxy holders and other teams", () => {
    const input = request()
    const second = {
      ...input.bindings[0]!,
      bindingId: "binding:second" as const,
      holderId: "entity:other" as const,
    }
    const two = {
      ...input,
      bindings: [...input.bindings, second],
      actorSources: [
        input.actorSources[0]!,
        { entityId: "entity:other" as const, agentEntityId: "1621" },
      ],
      selections: [
        select(criticalOption),
        select(criticalOption, 1, "binding:second"),
        select(ignoreOption),
        select(ignoreOption, 1, "binding:second"),
      ],
    }
    const result = calculate(two)
    expect(valueFor(result, criticalOption)).toBe(0.4)
    expect(valueFor(result, ignoreOption)).toBe(0.15)
    expect(contribution(result, ignoreOption)[0]!.origin.bindingId).toBe(
      "binding:roxy",
    )
    const foreign = calculate({
      ...input,
      world: {
        ...input.world,
        entities: input.world.entities.map((entity) =>
          entity.entityId === "entity:other"
            ? { ...entity, teamId: "team:foreign" as const }
            : entity,
        ),
      },
      hit: { ...input.hit, actorId: "entity:other", skillTargetIds: [] },
      selections: [select(resistanceOption), select(stunOption)],
    })
    expect(valueFor(foreign, resistanceOption)).toBe(0)
    expect(valueFor(foreign, stunOption)).toBe(0)
  })
  it.each([
    [0.3, true, false, 0.85],
    [0.3, false, true, 0.85],
    [0.3, true, true, 1],
    [0.15, true, false, 1],
    [0.1, true, true, 1.2],
    [-0.1, true, true, 1.4],
    [-0.9, true, true, 2],
    [1.4, true, true, 0],
  ] as const)(
    "resistance %s, M1=%s M6=%s follows the existing clamp",
    (targetResistance, m1, m6, expected) => {
      const input = request()
      const result = calculateStaticDamageFromCatalog({
        ...input,
        damage: {
          ...input.damage,
          resistance: { ...input.damage.resistance, targetResistance },
        },
        selections: [
          ...(m1 ? [select(resistanceOption)] : []),
          ...(m6 ? [select(ignoreOption)] : []),
        ],
      })
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.value.factors.nonCritical["resistance"]).toBeCloseTo(
        expected,
        12,
      )
      expect(result.value.nonCritical).toBeCloseTo(2000 * 1.5 * expected, 9)
      if (m1)
        expect(
          contribution(result.value, resistanceOption)[0]!.address,
        ).toMatchObject({ channel: "target-resistance-reduction" })
      if (m6)
        expect(
          contribution(result.value, ignoreOption)[0]!.address,
        ).toMatchObject({ channel: "attacker-resistance-ignore" })
    },
  )
  it("adds M2 to ordinary stun and respects non-stunned state", () => {
    const input = request()
    expect(
      calculate({ ...input, selections: [select(stunOption)] }).factors
        .nonCritical["stunDamage"],
    ).toBe(1.8)
    const notStunned = calculate({
      ...input,
      damage: {
        ...input.damage,
        stunDamage: {
          ...input.damage.stunDamage,
          isTargetStunned: false,
          targetBaseStunDamageMultiplier: 1,
        },
      },
      selections: [select(stunOption)],
    })
    expect(notStunned.factors.nonCritical["stunDamage"]).toBe(1)
    expect(valueFor(notStunned, stunOption)).toBe(0)
    const otherBinding = {
      kind: "agent" as const,
      bindingId: "binding:dialyn" as const,
      holderId: "entity:other" as const,
      sourceEntityId: "1481",
      eligible: true,
      configuration: { mindscapeRank: 2 as const, coreSkillLevel: 7 as const },
    }
    const result = calculate({
      ...input,
      bindings: [...input.bindings, otherBinding],
      actorSources: [
        input.actorSources[0]!,
        { entityId: "entity:other", agentEntityId: "1481" },
      ],
      selections: [
        select(stunOption),
        select(
          "agents:dialyn:mindscape:2:blk-legacy:legacy-team-staggerVulnerable",
          1,
          "binding:dialyn",
        ),
      ],
    })
    expect(result.factors.nonCritical["stunDamage"]).toBe(2)
    expect(result.nonCritical).toBeCloseTo(2000 * 0.7 * 2, 10)
  })
  it("adds M4 to +0.30 in the same damage bonus channel", () => {
    const input = request()
    const result = calculate({
      ...input,
      damage: { ...input.damage, damageBonus: [0.3] },
      selections: [select(ultimateOption)],
    })
    expect(result.factors.nonCritical["damageBonus"]).toBe(1.5)
    expect(result.nonCritical).toBeCloseTo(3150, 10)
  })
  it.each([
    "basic",
    "wrong-action",
    "missing-target",
    "wrong-target",
    "other-actor",
  ])("M4 excludes %s", (scenario) => {
    const input = request()
    const hit = {
      ...input.hit,
      ...(scenario === "basic"
        ? { skillCategory: "basic" as const, skillTargetIds: [] }
        : {}),
      ...(scenario === "wrong-action"
        ? { actionId: "action:other-ultimate" as const }
        : {}),
      ...(scenario === "missing-target" ? { skillTargetIds: [] } : {}),
      ...(scenario === "wrong-target"
        ? {
            skillTargetIds: [
              catalog.skillTargets.find(
                (target) =>
                  target.category === "ultimate" &&
                  target.agentEntityId !== "1621",
              )!.targetId,
            ],
          }
        : {}),
      ...(scenario === "other-actor"
        ? { actorId: "entity:other" as const, skillTargetIds: [] }
        : {}),
    }
    const result = calculateStaticDamageFromCatalog({
      ...input,
      hit,
      selections: [select(ultimateOption)],
    })
    if (scenario === "wrong-target") {
      expect(result.ok).toBe(false)
      return
    }
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.expected).toBeGreaterThan(0)
      expect(valueFor(result.value, ultimateOption)).toBe(0)
    }
  })
  it("retains the original ATK/Impact complete state and wind-energy refusal", () => {
    const input = request()
    const oldOption = "nanoka:agents:1621:initial-energy-regen-conversion"
    const result = calculate({
      ...input,
      hit: {
        ...input.hit,
        damageItems: [
          ...input.hit.damageItems,
          {
            mode: "direct",
            role: "base",
            itemId: "impact-probe",
            stat: "impact",
            statSource: { entityId: "entity:roxy" },
            damageMultiplier: 1,
          },
        ],
      },
      inputs: [
        {
          bindingId: "binding:roxy",
          name: "roxy:initial-energy-regen:source",
          value: { unit: "energy-per-second", value: 1.4 },
        },
      ],
      selections: [
        select(oldOption),
        select(resistanceOption),
        select(criticalOption),
        select(stunOption),
        select(ignoreOption),
      ],
    })
    const attrs = result.evaluation.attributes
    expect(
      attrs.find((a) => a.stat === "attack" && a.entityId === "entity:roxy")!
        .value.value,
    ).toBeCloseTo(1100, 10)
    expect(
      attrs.find((a) => a.stat === "impact" && a.entityId === "entity:roxy")!
        .value.value,
    ).toBeCloseTo(178, 10)
    expect(
      calculateStaticDamageFromCatalog({
        ...input,
        selections: [select("nanoka:agents:1621:wind-energy-acquisition")],
      }).ok,
    ).toBe(false)
  })

  it.each(
    damageKinds.flatMap((kind) =>
      ["wind", "fire"].flatMap((element) =>
        ["entity:roxy", "entity:other"].flatMap((actor) =>
          ["entity:roxy", "entity:other"].map((provider) => ({
            kind,
            element: element as "wind" | "fire",
            actor: actor as EntityId,
            provider: provider as EntityId,
          })),
        ),
      ),
    ),
  )(
    "M6 $kind $element actor=$actor provider=$provider",
    ({ kind, element, actor, provider }) => {
      const input = providerRequest(kind, actor, provider, element)
      const closed = calculate(input)
      const result = calculate({ ...input, selections: [select(ignoreOption)] })
      const applies =
        element === "wind" &&
        actor === "entity:roxy" &&
        provider === "entity:roxy"
      expect(result.factors.nonCritical["baseDamage"]).toBe(
        provider === "entity:roxy" ? 2000 : 3400,
      )
      if (kind !== "regular")
        expect(result.factors.nonCritical["anomalyProficiency"]).toBe(
          provider === "entity:roxy" ? 3 : 2.3,
        )
      expect(valueFor(result, ignoreOption)).toBe(applies ? 0.15 : 0)
      expect(result.factors.nonCritical["resistance"]).toBeCloseTo(
        applies ? 0.85 : 0.7,
        12,
      )
      expect(result.expected / closed.expected).toBeCloseTo(
        applies ? 0.85 / 0.7 : 1,
        12,
      )
    },
  )
  it.each(
    damageKinds.flatMap((kind) =>
      ["entity:roxy", "entity:other"].map((provider) => ({
        kind,
        provider: provider as EntityId,
      })),
    ),
  )(
    "M6 preserves historical $kind provider=$provider",
    ({ kind, provider }) => {
      const input = providerRequest(kind, "entity:roxy", provider, "wind", true)
      const result = calculate({ ...input, selections: [select(ignoreOption)] })
      expect(result.factors.nonCritical["baseDamage"]).toBe(2600)
      if (kind !== "regular")
        expect(result.factors.nonCritical["anomalyProficiency"]).toBe(2.7)
      expect(valueFor(result, ignoreOption)).toBe(
        provider === "entity:roxy" ? 0.15 : 0,
      )
    },
  )
  it.each(damageKinds)(
    "M6 low-level %s honors the same provider guard",
    (kind) => {
      for (const provider of ["entity:roxy", "entity:other"] as const) {
        const input = lowRequest(
          providerRequest(kind, "entity:roxy", provider, "wind"),
        )
        const result = calculateStaticDamage(input)
        expect(result.ok, result.ok ? "" : JSON.stringify(result.issues)).toBe(
          true,
        )
        if (result.ok) {
          expect(result.value.expected).toBeGreaterThan(0)
          expect(valueFor(result.value, ignoreOption)).toBe(
            provider === "entity:roxy" ? 0.15 : 0,
          )
        }
      }
    },
  )
  it.each(roxyMindscapeOptions)(
    "low-level supplied 0 remains invalid for %s",
    (optionId) => {
      const input = lowRequest(
        providerRequest("regular", "entity:roxy", "entity:roxy", "wind"),
        0,
      )
      const result = calculateStaticDamage({
        ...input,
        selections: [
          {
            ...input.selections[0]!,
            effectId: effectIdFor(optionId) as `agent:${string}`,
          },
        ],
      })
      expect(result.ok).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some((issue) => issue.code === "INVALID_INPUT"),
        ).toBe(true)
    },
  )
  it.each(damageKinds.filter((kind) => kind !== "regular"))(
    "M6 %s checks actual AP and base item providers separately",
    (kind) => {
      const input = providerRequest(kind, "entity:roxy", "entity:roxy", "wind")
      const differentItem: StaticCatalogDamageInput = {
        ...input,
        hit: {
          ...input.hit,
          damageItems: [
            {
              ...input.hit.damageItems[0]!,
              statSource: { entityId: "entity:other" as const },
            },
          ],
        },
        selections: [select(ignoreOption)],
      }
      const result = calculate(differentItem)
      expect(result.factors.nonCritical["baseDamage"]).toBe(3400)
      expect(result.factors.nonCritical["anomalyProficiency"]).toBe(3)
      expect(valueFor(result, ignoreOption)).toBe(0)
    },
  )
})

describe("M6 provider ruling", () => {
  const effectId = "agent:1621:nanoka:m6-wind-resistance-ignore"
  const sourceRule = definitions.effects.find(
    (rule) => rule.effectId === effectId,
  )!
  const simpleDefinitions = { ...definitions, effects: [sourceRule] }
  const requireLow = (input: StaticDamageInput) => {
    const result = calculateStaticDamage(input)
    expect(result.ok, result.ok ? "" : JSON.stringify(result.issues)).toBe(true)
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    expect(result.value.expected).toBeGreaterThan(0)
    return result.value
  }
  const mixedRequest = (
    kind: (typeof damageKinds)[number] = "regular",
  ): StaticCatalogDamageInput => {
    const input = providerRequest(kind, "entity:roxy", "entity:roxy", "wind")
    return {
      ...input,
      selections: [select(ignoreOption)],
      hit: {
        ...input.hit,
        damageItems: [
          input.hit.damageItems[0]!,
          {
            ...input.hit.damageItems[0]!,
            itemId: "other-base",
            statSource: { entityId: "entity:other" },
          },
        ],
      },
    }
  }
  it.each(damageKinds)(
    "rejects an active mixed-provider %s hit with precise provenance",
    (kind) => {
      const input = mixedRequest(kind)
      const baseline = calculate({ ...input, selections: [] })
      expect(baseline.factors.nonCritical["baseDamage"]).toBe(5400)
      for (const result of [
        calculateStaticDamageFromCatalog(input),
        calculateStaticDamage(lowRequest(input)),
      ]) {
        expect(result.ok).toBe(false)
        if (!result.ok)
          expect(result.issues).toContainEqual(
            expect.objectContaining({
              code: "CONTEXT_MISMATCH",
              pointer: "/hit/damageItems",
              effectId,
              bindingId: "binding:roxy",
            }),
          )
      }
    },
  )
  it.each(["unselected", "zero", "fire", "foreign-actor", "external-ap"])(
    "keeps mixed-provider %s requests legal and nonzero",
    (scenario) => {
      const input = mixedRequest("anomaly")
      const modified: StaticCatalogDamageInput = {
        ...input,
        selections:
          scenario === "unselected"
            ? []
            : [select(ignoreOption, scenario === "zero" ? 0 : 1)],
        hit: {
          ...input.hit,
          ...(scenario === "fire" ? { element: "fire" } : {}),
          ...(scenario === "foreign-actor" ? { actorId: "entity:other" } : {}),
        },
        ...(scenario === "external-ap" && input.damage.kind === "anomaly"
          ? {
              damage: {
                ...input.damage,
                anomalySource: { entityId: "entity:other", level: 60 },
              },
            }
          : {}),
      }
      const result = calculate(modified)
      expect(valueFor(result, ignoreOption)).toBe(0)
      expect(result.factors.nonCritical["baseDamage"]).toBe(5400)
      if (scenario === "external-ap")
        expect(result.factors.nonCritical["anomalyProficiency"]).toBe(2.3)
    },
  )
  it.each(["entity:roxy", "entity:other"] as const)(
    "adds once for all-own items and none for all-external: %s",
    (provider) => {
      const input = mixedRequest()
      const result = calculate({
        ...input,
        hit: {
          ...input.hit,
          damageItems: input.hit.damageItems.map((item) => ({
            ...item,
            statSource: { entityId: provider },
          })) as unknown as StaticCatalogDamageInput["hit"]["damageItems"],
        },
      })
      expect(result.factors.nonCritical["baseDamage"]).toBe(
        provider === "entity:roxy" ? 4000 : 6800,
      )
      expect(valueFor(result, ignoreOption)).toBe(
        provider === "entity:roxy" ? 0.15 : 0,
      )
      expect(contribution(result, ignoreOption)).toHaveLength(
        provider === "entity:roxy" ? 1 : 0,
      )
    },
  )
  it("does not erase mixed identity when the foreign item has a zero multiplier", () => {
    const input = mixedRequest()
    const result = calculateStaticDamageFromCatalog({
      ...input,
      hit: {
        ...input.hit,
        damageItems: [
          input.hit.damageItems[0]!,
          { ...input.hit.damageItems[1]!, mode: "direct", damageMultiplier: 0 },
        ],
      },
    })
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(
        result.issues.some(
          (issue) =>
            issue.code === "CONTEXT_MISMATCH" &&
            issue.pointer === "/hit/damageItems",
        ),
      ).toBe(true)
  })
  it.each([
    {
      name: "item overrides external hit source",
      item: "entity:roxy",
      hit: "entity:other",
      base: 2000,
      applies: true,
    },
    {
      name: "external item overrides own hit source",
      item: "entity:other",
      hit: "entity:roxy",
      base: 3400,
      applies: false,
    },
    {
      name: "hit source overrides actor default",
      hit: "entity:other",
      base: 3400,
      applies: false,
    },
    { name: "own hit source", hit: "entity:roxy", base: 2000, applies: true },
    { name: "actor default", base: 2000, applies: true },
  ])("honors actual source priority: $name", (scenario) => {
    const input = lowRequest(
      providerRequest("regular", "entity:roxy", "entity:roxy", "wind"),
    )
    const { statSource: _source, ...item } = input.hit.damageItems[0]!
    const result = requireLow({
      ...input,
      hit: {
        ...input.hit,
        damageItems: [
          {
            ...item,
            ...(scenario.item
              ? { statSource: { entityId: scenario.item as EntityId } }
              : {}),
          },
        ],
        ...(scenario.hit
          ? {
              attributeSources: {
                attack: { entityId: scenario.hit as EntityId },
              },
            }
          : {}),
      },
    })
    expect(result.factors.nonCritical["baseDamage"]).toBe(scenario.base)
    expect(valueFor(result, ignoreOption)).toBe(scenario.applies ? 0.15 : 0)
  })
  it("checks AP separately in the low-level input and preserves other attribute providers", () => {
    const anomaly = lowRequest(
      providerRequest("anomaly", "entity:roxy", "entity:roxy", "wind"),
    )
    const externalAp = requireLow({
      ...anomaly,
      hit: {
        ...anomaly.hit,
        attributeSources: {
          ...anomaly.hit.attributeSources,
          anomalyProficiency: { entityId: "entity:other" },
        },
      },
    })
    expect(externalAp.factors.nonCritical["baseDamage"]).toBe(2000)
    expect(externalAp.factors.nonCritical["anomalyProficiency"]).toBe(2.3)
    expect(valueFor(externalAp, ignoreOption)).toBe(0)
    const regular = lowRequest(
      providerRequest("regular", "entity:roxy", "entity:roxy", "wind"),
    )
    if (regular.damage.kind !== "regular") throw new Error("wrong fixture kind")
    const externalOtherStats = requireLow({
      ...regular,
      hit: {
        ...regular.hit,
        attributeSources: {
          criticalDamage: { entityId: "entity:other" },
          penetrationRatio: { entityId: "entity:other" },
        },
      },
      damage: {
        ...regular.damage,
        defense: { ...regular.damage.defense, targetBaseDefense: 1000 },
      } as StaticDamageInput["damage"],
    })
    expect(valueFor(externalOtherStats, ignoreOption)).toBe(0.15)
    expect(externalOtherStats.evaluation.attributes).toContainEqual(
      expect.objectContaining({
        entityId: "entity:other",
        stat: "criticalDamage",
        value: { unit: "ratio", value: 0.7 },
      }),
    )
    expect(externalOtherStats.evaluation.attributes).toContainEqual(
      expect.objectContaining({
        entityId: "entity:other",
        stat: "penetrationRatio",
        value: { unit: "ratio", value: 0.2 },
      }),
    )
  })
  it("preserves own historical readings and fails when a required saved fact is missing", () => {
    const input = providerRequest(
      "anomaly",
      "entity:roxy",
      "entity:roxy",
      "wind",
      true,
    )
    const result = calculate({ ...input, selections: [select(ignoreOption)] })
    expect(result.evaluation.attributes).toContainEqual(
      expect.objectContaining({
        entityId: "entity:roxy",
        snapshotId: "snapshot:history",
        stat: "attack",
        value: { unit: "attack-points", value: 1300 },
      }),
    )
    expect(valueFor(result, ignoreOption)).toBe(0.15)
    const missing = calculateStaticDamageFromCatalog({
      ...input,
      selections: [select(ignoreOption)],
      snapshots: input.snapshots!.map((snapshot) => ({
        ...snapshot,
        attributes: snapshot.attributes.filter(
          (attribute) => attribute.stat !== "attack",
        ),
      })),
    })
    expect(missing.ok).toBe(false)
    if (!missing.ok)
      expect(
        missing.issues.some(
          (issue) =>
            issue.code === "MISSING_FACT" || issue.code === "MISSING_SNAPSHOT",
        ),
      ).toBe(true)
  })
  function publicQuery(provider: EntityId, omitKind = false) {
    const input = lowRequest(
      providerRequest("anomaly", "entity:roxy", provider, "wind"),
    )
    const prepared = prepareEffects(simpleDefinitions, input.bindings)
    expect(prepared.ok, JSON.stringify(prepared)).toBe(true)
    if (!prepared.ok) throw new Error(JSON.stringify(prepared.issues))
    const state = supplyEffectState(prepared.value, {
      sessionId: "session:m6",
      atSeconds: 0,
      instances: [
        {
          instanceId: "instance:m6",
          effectId,
          bindingId: "binding:roxy",
          beneficiaryIds: ["entity:roxy"],
          stackKey: [],
          lifetime: { kind: "supplied" },
          layers: [
            {
              layerId: "layer:m6",
              startedAt: 0,
              expiresAt: null,
              trigger: null,
            },
          ],
        },
      ],
      snapshots: [],
      cooldowns: [],
      eventHistory: { processedIds: [], last: null },
    })
    expect(state.ok, JSON.stringify(state)).toBe(true)
    if (!state.ok) throw new Error(JSON.stringify(state.issues))
    const hit: HitContext = {
      ...input.hit,
      hitId: "hit:m6",
      actionInstanceId: "action-instance:m6",
      actionSnapshotId: "snapshot:m6",
      origin: { kind: "direct" },
      element: "wind",
      ...(omitKind ? {} : { damageKind: "anomaly" }),
    }
    return evaluateEffects(prepared.value, state.value, {
      kind: "hit",
      atSeconds: 0,
      world: input.world,
      observedSnapshots: [],
      hit,
    })
  }
  it.each(["entity:roxy", "entity:other"] as const)(
    "uses the same identity in public evaluateEffects for %s",
    (provider) => {
      const result = publicQuery(provider)
      expect(result.ok, JSON.stringify(result)).toBe(true)
      if (!result.ok) throw new Error(JSON.stringify(result.issues))
      const values = result.value.contributions.filter(
        (value) => value.origin.effectId === effectId,
      )
      expect(values).toHaveLength(provider === "entity:roxy" ? 1 : 0)
      if (provider === "entity:roxy")
        expect(values[0]).toMatchObject({
          value: { value: 0.15 },
          origin: {
            effectId,
            bindingId: "binding:roxy",
            beneficiaryId: "entity:roxy",
          },
        })
    },
  )
  it("keeps missing damageKind observable before the provider applicability check", () => {
    const result = publicQuery("entity:other", true)
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(result.issues.some((issue) => issue.code === "MISSING_FACT")).toBe(
        true,
      )
  })
  it.each([
    [
      "source",
      (rule: any) => {
        rule.source.identity.entityId = "1251"
      },
      "/source/identity",
    ],
    [
      "scope",
      (rule: any) => {
        rule.scope = "entity"
        rule.when = { kind: "constant", value: true }
      },
      "/scope",
    ],
    [
      "beneficiary",
      (rule: any) => {
        rule.beneficiary = { kind: "team" }
      },
      "/beneficiary",
    ],
    [
      "channel",
      (rule: any) => {
        rule.operation.channel = "damage-bonus"
      },
      "/operation",
    ],
    [
      "operation",
      (rule: any) => {
        rule.operation = {
          kind: "stat-adjustment",
          stat: "criticalDamage",
          stage: "direct",
          value: { kind: "literal", unit: "ratio", value: 0.15 },
        }
      },
      "/operation",
    ],
  ] as const)(
    "rejects reserved identity drift for %s",
    (_name, mutate, pointer) => {
      const changed = structuredClone(sourceRule)
      mutate(changed)
      const result = parseEffectRuleSet({
        ...simpleDefinitions,
        effects: [changed],
      })
      expect(result.ok).toBe(false)
      if (!result.ok)
        expect(
          result.issues.some(
            (issue) =>
              issue.code === "INVALID_DEFINITION" &&
              issue.pointer === `/effects/0${pointer}` &&
              issue.effectId === effectId,
          ),
        ).toBe(true)
    },
  )
  it("does not treat an ordinary neighboring resistance rule as reserved M6", () => {
    const input = lowRequest(
      providerRequest("regular", "entity:roxy", "entity:other", "wind"),
    )
    const ordinary = {
      ...sourceRule,
      effectId: "agent:1621:ordinary-resistance-ignore" as const,
    }
    const result = requireLow({
      ...input,
      definitions: { ...definitions, effects: [ordinary] },
      selections: [{ ...input.selections[0]!, effectId: ordinary.effectId }],
    })
    expect(result.factors.nonCritical["resistance"]).toBeCloseTo(0.85, 12)
    expect(
      result.evaluation.contributions.some(
        (value) =>
          value.origin.effectId === ordinary.effectId &&
          value.value.value === 0.15,
      ),
    ).toBe(true)
  })
  it("additional same-agent instance still remains an external provider", () => {
    const input = providerRequest(
      "anomaly",
      "entity:roxy",
      "entity:other",
      "wind",
    )
    const result = calculate({
      ...input,
      actorSources: input.actorSources.map((source) => ({
        ...source,
        agentEntityId: "1621",
      })),
      selections: [select(ignoreOption)],
    })
    expect(result.factors.nonCritical["baseDamage"]).toBe(3400)
    expect(result.factors.nonCritical["anomalyProficiency"]).toBe(2.3)
    expect(contribution(result, ignoreOption)).toEqual([])
  })
  it("additional current and historical items from the same holder apply once", () => {
    const input = providerRequest(
      "regular",
      "entity:roxy",
      "entity:roxy",
      "wind",
      true,
    )
    const result = calculate({
      ...input,
      selections: [select(ignoreOption)],
      hit: {
        ...input.hit,
        damageItems: [
          input.hit.damageItems[0]!,
          {
            ...input.hit.damageItems[0]!,
            itemId: "current-base",
            mode: "direct",
            damageMultiplier: 1,
            statSource: { entityId: "entity:roxy" },
          },
        ],
      },
    })
    expect(result.factors.nonCritical["baseDamage"]).toBe(3600)
    expect(valueFor(result, ignoreOption)).toBe(0.15)
    expect(contribution(result, ignoreOption)).toHaveLength(1)
  })
  it("additional external historical CD and penetration remain legal", () => {
    const input = lowRequest(
      providerRequest("regular", "entity:roxy", "entity:roxy", "wind"),
    )
    const external = {
      entityId: "entity:other" as const,
      snapshotId: "snapshot:other-stats" as const,
    }
    const result = requireLow({
      ...input,
      snapshots: [
        {
          snapshotId: "snapshot:other-stats",
          atSeconds: 0,
          world: input.world,
          attributes: [
            {
              entityId: "entity:other",
              stat: "criticalDamage",
              stage: "current",
              value: { unit: "ratio", value: 0.83 },
            },
            {
              entityId: "entity:other",
              stat: "penetrationRatio",
              stage: "current",
              value: { unit: "ratio", value: 0.24 },
            },
          ],
        },
      ],
      hit: {
        ...input.hit,
        attributeSources: {
          criticalDamage: external,
          penetrationRatio: external,
        },
      },
    })
    expect(valueFor(result, ignoreOption)).toBe(0.15)
    expect(result.critical).not.toBeNull()
    expect(result.critical! / result.nonCritical).toBeCloseTo(1.83, 12)
    expect(result.evaluation.attributes).toContainEqual(
      expect.objectContaining({
        entityId: "entity:other",
        snapshotId: "snapshot:other-stats",
        stat: "penetrationRatio",
        value: { unit: "ratio", value: 0.24 },
      }),
    )
  })
  it("additional legal contribution modifications preserve the provider guard", () => {
    const modification: EffectRule = {
      kind: "modification",
      effectId: "agent:1621:test:m6-output",
      source: sourceRule.source,
      config: { kind: "constant", value: true },
      parameters: {},
      phase: "contribution",
      when: { kind: "constant", value: true },
      target: { kind: "effect", effectId },
      modifications: [
        {
          field: "output",
          unit: "ratio",
          change: {
            operator: "add",
            value: { kind: "literal", unit: "ratio", value: 0.05 },
          },
        },
      ],
    }
    for (const provider of ["entity:roxy", "entity:other"] as const) {
      const input = lowRequest(
        providerRequest("regular", "entity:roxy", provider, "wind"),
      )
      const result = requireLow({
        ...input,
        definitions: {
          ...simpleDefinitions,
          effects: [sourceRule, modification],
        },
      })
      expect(valueFor(result, ignoreOption)).toBeCloseTo(
        provider === "entity:roxy" ? 0.2 : 0,
        12,
      )
      expect(result.factors.nonCritical["resistance"]).toBeCloseTo(
        provider === "entity:roxy" ? 0.9 : 0.7,
        12,
      )
    }
    const neighboring = {
      ...sourceRule,
      effectId: "agent:1621:test:ordinary-ignore" as const,
    }
    const badKind: EffectRule = {
      ...modification,
      effectId,
      target: { kind: "effect", effectId: neighboring.effectId },
    }
    const parsed = parseEffectRuleSet({
      ...simpleDefinitions,
      effects: [neighboring, badKind],
    })
    expect(parsed.ok).toBe(false)
    if (!parsed.ok)
      expect(parsed.issues).toContainEqual(
        expect.objectContaining({
          code: "INVALID_DEFINITION",
          pointer: "/effects/1/kind",
          effectId,
        }),
      )
  })
})
