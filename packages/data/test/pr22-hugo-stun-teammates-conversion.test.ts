import { describe, expect, it } from "vitest"
import { convertSource } from "../scripts/static-effects/convert.ts"
import type {
  SourceData,
  SourceEffect,
  SourceEntity,
  SourceNormalization,
} from "../scripts/static-effects/source.ts"
import fixture from "./fixtures/hugo-stun-teammates-source.json" with { type: "json" }
import {
  hugoAttackEffectId,
  hugoAttackOptionId,
  hugoTeammateCountInputName,
  makeHugoAttackRequest,
} from "./fixtures/hugo-stun-teammates-consumer.ts"
import {
  calculateStaticDamageFromCatalog,
  parseEffectRuleSet,
} from "../../core/src/effects/index.ts"
import type { StaticEffectCatalog } from "../../core/src/effects/types.ts"
import definitionsJson from "../definitions/effects/static.json" with { type: "json" }
import catalogJson from "../definitions/effects/static-catalog.json" with { type: "json" }

const source = (): SourceData => ({
  agents: [
    structuredClone(fixture.raw) as SourceEntity,
    structuredClone(fixture.reorderCompanion.raw) as SourceEntity,
  ],
  wengines: [],
  driveDiscs: [],
  skillSubcategories: structuredClone(fixture.skillSubcategories),
  followUpSkillRules: structuredClone(fixture.followUpSkillRules),
})
const normalization: SourceNormalization = {
  normalizeAgent: (entity) =>
    structuredClone(
      entity.id === "hugo"
        ? fixture.normalized
        : entity.id === "anby"
          ? fixture.reorderCompanion.normalized
          : entity,
    ) as SourceEntity,
  normalizeWengine: (entity) => structuredClone(entity),
  normalizeDriveDisc: (entity) => structuredClone(entity),
  collectEffectsFromPack: (pack) => {
    const blocks = pack.effectBlocks?.flatMap((b) => b.effects)
    return blocks?.length ? blocks : (pack.effects ?? [])
  },
  applyAnomalyFlagsToPack: (pack) => pack,
}
const convert = (data = source(), functions = normalization) =>
  convertSource(data, functions, [], [])
const block = (entity: SourceEntity) =>
  entity.mindscapeBuffs![0]!.effectBlocks!.find((b) => b.id === "blk-legacy")!
const attack = (entity: SourceEntity) =>
  block(entity).effects.find((e) => e.id === "legacy-self-atk")!

describe("Hugo real-source count correction", () => {
  it("keeps independent raw and normalized execution shapes and full source identity", () => {
    expect(attack(fixture.raw as SourceEntity)).toEqual(
      attack(fixture.normalized as SourceEntity),
    )
    expect(attack(fixture.raw as SourceEntity).convert).toEqual({
      from: "atk",
      panelSource: "external",
      ratioPercent: 0,
      cap: null,
      defaultBase: null,
      initialBase: 0,
    })
    const result = convert()
    const option = result.catalog.options.find(
      (o) => o.optionId === hugoAttackOptionId,
    )!
    expect(option.variants[0]).toMatchObject({
      status: "corrected",
      maximumLayers: 2,
      layerCountInputName: hugoTeammateCountInputName,
      configuration: { coreSkillLevels: [1, 2, 3, 4, 5, 6, 7] },
      effectIds: [hugoAttackEffectId],
    })
    expect(
      result.definitions.effects.find((e) => e.effectId === hugoAttackEffectId),
    ).toMatchObject({
      activation: {
        kind: "supplied",
        maximumLayers: { kind: "literal", unit: "count", value: 1 },
      },
      operation: {
        kind: "stat-adjustment",
        stat: "attack",
        stage: "final-fixed",
      },
    })
    expect(
      result.coverage.records.find((e) => e.optionId === hugoAttackOptionId),
    ).toMatchObject({ rawValue: 0, normalizedValue: 0, status: "corrected" })
  })
  const mutations: readonly (readonly [
    string,
    (entity: SourceEntity) => void,
  ])[] = [
    [
      "record deletion",
      (entity) => {
        block(entity).effects = block(entity).effects.filter(
          (e) => e.id !== "legacy-self-atk",
        )
      },
    ],
    [
      "record identity",
      (entity) => {
        attack(entity).id = "renamed"
      },
    ],
    [
      "block identity",
      (entity) => {
        block(entity).id = "renamed"
      },
    ],
    [
      "rank relocation",
      (entity) => {
        ;[entity.mindscapeBuffs![0], entity.mindscapeBuffs![3]] = [
          entity.mindscapeBuffs![3]!,
          entity.mindscapeBuffs![0]!,
        ]
      },
    ],
    [
      "note append",
      (entity) => {
        block(entity).note += "新条款"
      },
    ],
    [
      "note missing",
      (entity) => {
        delete block(entity).note
      },
    ],
    [
      "unknown field",
      (entity) => {
        Object.assign(attack(entity), { unreviewed: 1 })
      },
    ],
    [
      "unknown undefined field",
      (entity) => {
        Object.assign(attack(entity), { unreviewed: undefined })
      },
    ],
    [
      "new same-clause ATK",
      (entity) => {
        block(entity).effects.push({ ...attack(entity), id: "second-attack" })
      },
    ],
    ...Object.entries({
      origin: "new",
      scope: "skill",
      applyTarget: "team",
      applySituation: "stagger",
      applyProfession: "击破",
      teamProfession: "击破",
      teamProfessionValues: [1, 2, 3],
      teamProfessionMinCount: 1,
      skillCategory: "ultimate",
      skillSubcategoryId: "new",
      skillTargets: [{ category: "ultimate", subcategoryId: null }],
      elementFilter: ["冰"],
      kind: "fixed",
      stat: "unknownStat",
      value: 300,
      stackable: true,
      maxStacks: 2,
      valuePerStack: 900,
      defaultStacks: 2,
      convert: {
        from: "atk",
        panelSource: "manual",
        ratioPercent: 0,
        cap: null,
        defaultBase: null,
        initialBase: 0,
      },
      enabledDefault: false,
      note: "new",
      appliesToAnomaly: false,
    }).map(
      ([name, value]) =>
        [
          name,
          (entity: SourceEntity) => {
            Object.assign(attack(entity), { [name]: value })
          },
        ] as const,
    ),
  ]
  it.each(
    mutations.flatMap(([name, mutate]) =>
      ["raw", "normalized"].map((side) => ({ name, mutate, side })),
    ),
  )("rejects $side $name before fallback", ({ mutate, side }) => {
    const data = source()
    const functions = { ...normalization }
    if (side === "raw") mutate(data.agents[0]!)
    else
      functions.normalizeAgent = (entity) => {
        const normalized = normalization.normalizeAgent(entity)
        if (entity.id === "hugo") mutate(normalized)
        return normalized
      }
    expect(() => convert(data, functions)).toThrow(
      /Hugo|Duplicate source effect|Normalization generated/,
    )
  })
  it.each(
    ["raw", "normalized"].flatMap((side) =>
      ["same", "changed", "another-block"].flatMap((kind) =>
        ["before", "after"].map((order) => ({ side, kind, order })),
      ),
    ),
  )("rejects $side $kind duplicate $order folding", ({ side, kind, order }) => {
    const mutate = (entity: SourceEntity) => {
      const original = block(entity),
        copy = structuredClone(attack(entity))
      if (kind === "changed") copy.valuePerStack = 1
      if (kind === "another-block") {
        const blocks = entity.mindscapeBuffs![0]!.effectBlocks!
        const another = {
          ...original,
          id: "duplicate-block",
          note: "another clause",
          effects: [copy],
        }
        if (order === "before") blocks.unshift(another)
        else blocks.push(another)
      } else if (order === "before") original.effects.unshift(copy)
      else original.effects.push(copy)
    }
    const data = source(),
      functions = { ...normalization }
    if (side === "raw") mutate(data.agents[0]!)
    else
      functions.normalizeAgent = (entity) => {
        const normalized = normalization.normalizeAgent(entity)
        if (entity.id === "hugo") mutate(normalized)
        return normalized
      }
    expect(() => convert(data, functions)).toThrow(
      /Hugo|Duplicate source effect/,
    )
  })
  it("accepts genuine blocks/flat mirrors and a source without Hugo", () => {
    expect(
      fixture.normalized.mindscapeBuffs[0]!.effects.some(
        (e) => e.id === "legacy-self-atk",
      ),
    ).toBe(true)
    expect(
      convert().catalog.options.filter(
        (o) => o.optionId === hugoAttackOptionId,
      ),
    ).toHaveLength(1)
    const data = source()
    data.agents.shift()
    expect(
      convert(data).catalog.entities.map((e) => e.catalogEntityId),
    ).toEqual(["agents:anby"])
  })
})

describe("Hugo source identity positive controls", () => {
  it("preserves all semantics on actual entity, block and effect reordering", () => {
    const before = source(),
      after = source()
    const reorder = (entity: SourceEntity) => {
      for (const pack of entity.mindscapeBuffs ?? []) {
        pack.effectBlocks?.reverse()
        for (const entry of pack.effectBlocks ?? []) entry.effects.reverse()
        pack.effects?.reverse()
      }
      return entity
    }
    after.agents.reverse()
    after.agents.forEach(reorder)
    expect(after.agents.map((e) => e.id)).not.toEqual(
      before.agents.map((e) => e.id),
    )
    const changed = after.agents.find((e) => e.id === "hugo")!
    expect(
      changed.mindscapeBuffs![0]!.effectBlocks!.map((b) => b.id),
    ).not.toEqual(
      before.agents[0]!.mindscapeBuffs![0]!.effectBlocks!.map((b) => b.id),
    )
    expect(block(changed).effects.map((e) => e.id)).not.toEqual(
      block(before.agents[0]!).effects.map((e) => e.id),
    )
    const reorderedFunctions = {
      ...normalization,
      normalizeAgent: (entity: SourceEntity) =>
        reorder(normalization.normalizeAgent(entity)),
    }
    const canonical = (result: ReturnType<typeof convert>) => {
      const stable = JSON.parse(
        JSON.stringify(result, (key, value) =>
          key === "pointer" &&
          typeof value === "string" &&
          /^\/(agents|wengines|driveDiscs)\/\d+(?:\/|$)/.test(value)
            ? "<source-array-position>"
            : value,
        ),
      ) as typeof result
      stable.coverage.records.sort((a, b) =>
        a.optionId.localeCompare(b.optionId),
      )
      stable.coverage.packs.sort(
        (a, b) =>
          a.catalogEntityId.localeCompare(b.catalogEntityId) ||
          a.rankKind.localeCompare(b.rankKind) ||
          a.rank - b.rank,
      )
      return stable
    }
    expect(canonical(convert(after, reorderedFunctions))).toEqual(
      canonical(convert(before)),
    )
  })
  it("does not globally reserve the local legacy-self-atk ID or unrelated Hugo ranks", () => {
    const data = source()
    const companion = data.agents[1]!
    const record = structuredClone(attack(data.agents[0]!))
    record.maxStacks = 1
    record.valuePerStack = 17
    companion.mindscapeBuffs![1] = {
      effectBlocks: [
        {
          id: "other-attack",
          name: "独立条款",
          note: "独立固定攻击力",
          effects: [record],
        },
      ],
    }
    data.agents[0]!.mindscapeBuffs![3] = {
      effectBlocks: [
        {
          id: "other-rank",
          name: "独立条款",
          effects: [{ ...record, valuePerStack: 19 }],
        },
      ],
    }
    const functions = {
      ...normalization,
      normalizeAgent: (entity: SourceEntity) => {
        const normalized = normalization.normalizeAgent(entity)
        if (entity.id === "anby")
          normalized.mindscapeBuffs![1] = structuredClone(
            companion.mindscapeBuffs![1]!,
          )
        if (entity.id === "hugo")
          normalized.mindscapeBuffs![3] = structuredClone(
            entity.mindscapeBuffs![3]!,
          )
        return normalized
      },
    }
    const result = convert(data, functions)
    expect(result.definitions.effects).toContainEqual(
      expect.objectContaining({
        effectId: "agent:1011:zzz-hp:legacy-self-atk:other-attack:mindscape:1",
        parameters: {
          amount: { kind: "constant", unit: "attack-points", value: 17 },
        },
      }),
    )
    expect(result.definitions.effects).toContainEqual(
      expect.objectContaining({
        effectId: "agent:1291:zzz-hp:legacy-self-atk:other-rank:mindscape:3",
        parameters: {
          amount: { kind: "constant", unit: "attack-points", value: 19 },
        },
      }),
    )
  })
  it("checks the consumed normalized copy and normalized entity identity", () => {
    for (const functions of [
      {
        ...normalization,
        normalizeAgent: (entity: SourceEntity) => ({
          ...normalization.normalizeAgent(entity),
          id: entity.id === "hugo" ? "wrong" : entity.id,
        }),
      },
      {
        ...normalization,
        collectEffectsFromPack: (
          pack: Parameters<SourceNormalization["collectEffectsFromPack"]>[0],
        ) =>
          normalization
            .collectEffectsFromPack(pack)
            .map((effect) =>
              effect.id === "legacy-self-atk"
                ? { ...effect, valuePerStack: 1 }
                : effect,
            ),
      },
    ])
      expect(() => convert(source(), functions)).toThrow(/Hugo/)
  })
  it.each([1, 2, 3, 4, 5, 6, 7])(
    "keeps bilingual Nanoka attack evidence separate from Totalize at core %s",
    (core) => {
      const pair = [
        [25, 75],
        [50, 150],
        [80, 240],
        [120, 360],
        [180, 540],
        [270, 810],
        [300, 900],
      ][core - 1]!
      for (const language of ["zh", "en"] as const) {
        const text =
          fixture.nanoka[language].level[
            `129150${core}` as keyof typeof fixture.nanoka.zh.level
          ].desc[0]!.split("\n")[1]!
        expect(text).toContain(
          `<color=#2BAD00>${pair[0]}</color>/<color=#2BAD00>${pair[1]}</color>`,
        )
        expect(text).toContain(language === "zh" ? "其他1/2名" : "1/2")
      }
    },
  )
})

describe("Hugo same-clause team ATK holder overlap", () => {
  const extraId = "same-clause-team-atk"
  const extraOptionId = `agents:hugo:mindscape:0:blk-legacy:${extraId}`
  const teamAttack = (
    filters: Pick<SourceEffect, "applyProfession" | "elementFilter"> = {},
  ): SourceEffect => ({
    ...structuredClone(attack(fixture.raw as SourceEntity)),
    id: extraId,
    applyTarget: "team",
    applySituation: "global",
    kind: "fixed",
    value: 900,
    maxStacks: 1,
    valuePerStack: 0,
    defaultStacks: 1,
    ...filters,
  })
  const withTeamAttack = (
    effect: SourceEffect,
    side: "raw" | "normalized" | "both" = "both",
    rank: 0 | 3 = 0,
  ) => {
    const data = source()
    const append = (entity: SourceEntity) => {
      if (rank === 3) {
        entity.mindscapeBuffs![3]!.effectBlocks!.push({
          id: "independent-attack",
          name: "独立影画攻击条款",
          note: "独立影画攻击条款",
          effects: [structuredClone(effect)],
        })
        return
      }
      const original = structuredClone(block(entity))
      block(entity).effects.push(structuredClone(effect))
      expect(block(entity).effects.slice(0, -1)).toEqual(original.effects)
      expect(block(entity).note).toBe(original.note)
    }
    if (side !== "normalized") append(data.agents[0]!)
    const functions: SourceNormalization = {
      ...normalization,
      normalizeAgent: (entity) => {
        const normalized = normalization.normalizeAgent(entity)
        if (entity.id === "hugo" && side !== "raw") append(normalized)
        return normalized
      },
    }
    return () => convert(data, functions)
  }
  // 两实体转换夹具保留生成出的规则/选项；其他目录引用从正式快照补齐。
  // 不手写新规则或受益筛选，以正式目录入口检验转换器实际输出。
  const consume = (
    converted: ReturnType<typeof convert>,
    extra: string | undefined,
    actor: "hugo" | "anby" = "hugo",
    mindscapeRank: 0 | 3 = 0,
  ) => {
    const parsed = parseEffectRuleSet({
      ...definitionsJson,
      effects: [
        ...new Map(
          [...definitionsJson.effects, ...converted.definitions.effects].map(
            (effect) => [effect.effectId, effect] as const,
          ),
        ).values(),
      ],
    })
    expect(parsed.ok, JSON.stringify(parsed)).toBe(true)
    if (!parsed.ok) throw new Error("Valid converted definitions required")
    const canonicalCatalog = catalogJson as unknown as StaticEffectCatalog
    const catalog: StaticEffectCatalog = {
      ...canonicalCatalog,
      options: [
        ...new Map(
          [...canonicalCatalog.options, ...converted.catalog.options].map(
            (option) => [option.optionId, option] as const,
          ),
        ).values(),
      ],
    }
    const request = makeHugoAttackRequest(parsed.value, catalog)
    const binding = request.bindings[0]!
    if (binding.kind !== "agent") throw new Error("Agent binding required")
    const result = calculateStaticDamageFromCatalog({
      ...request,
      bindings: [
        { ...binding, configuration: { coreSkillLevel: 7, mindscapeRank } },
      ],
      actorSources: [
        ...request.actorSources,
        { entityId: "entity:anby", agentEntityId: "1011" },
      ],
      world: {
        ...request.world,
        entities: [
          ...request.world.entities,
          {
            ...structuredClone(request.world.entities[0]!),
            entityId: "entity:anby",
          },
        ],
      },
      hit: {
        ...request.hit,
        actorId: `entity:${actor}`,
        element: actor === "hugo" ? "ice" : "electric",
        damageItems: [
          {
            mode: "direct",
            role: "base",
            itemId: "base",
            stat: "attack",
            statSource: { entityId: `entity:${actor}` },
            damageMultiplier: 2,
          },
        ],
      },
      selections: [
        { optionId: hugoAttackOptionId, bindingId: "binding:hugo", layers: 2 },
        ...(extra
          ? [{ optionId: extra, bindingId: "binding:hugo" as const, layers: 1 }]
          : []),
      ],
    })
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (!result.ok) throw new Error("Valid catalog calculation required")
    return {
      nonCritical: result.value.nonCritical,
      attack: result.value.evaluation.contributions.map((contribution) => ({
        effectId: contribution.origin.effectId,
        address: contribution.address,
        value: contribution.value,
      })),
    }
  }
  const expectAttack = (
    result: ReturnType<typeof consume>,
    actor: "hugo" | "anby",
    count: number,
  ) => {
    expect(result.attack).toHaveLength(count)
    for (const contribution of result.attack) {
      expect(contribution.address).toMatchObject({
        kind: "stat",
        stat: "attack",
        stage: "final-fixed",
        entityId: `entity:${actor}`,
      })
      expect(contribution.value).toEqual({ unit: "attack-points", value: 900 })
    }
  }

  it.each(
    [
      { name: "unrestricted", applyProfession: null, elementFilter: "all" },
      {
        name: "matching profession",
        applyProfession: "强攻",
        elementFilter: "all",
      },
      {
        name: "matching element",
        applyProfession: null,
        elementFilter: ["冰"],
      },
      {
        name: "matching profession and element",
        applyProfession: "强攻",
        elementFilter: ["冰"],
      },
      {
        name: "element list includes holder",
        applyProfession: null,
        elementFilter: ["电", "冰"],
      },
    ].flatMap((filters) =>
      (["raw", "normalized"] as const).map((side) => ({ ...filters, side })),
    ),
  )(
    "rejects $side team/global ATK with $name before fallback",
    ({ name: _name, side, ...filters }) => {
      const run = withTeamAttack(
        teamAttack(
          filters as Pick<SourceEffect, "applyProfession" | "elementFilter">,
        ),
        side,
      )
      expect(run).toThrow(
        new RegExp(
          `Hugo teammate count ${side} has an additional same-clause ATK encoding`,
        ),
      )
    },
  )

  it("rejects the legal team encoding that otherwise gives the holder two +900 contributions", () => {
    const original = consume(convert(), undefined)
    expect(original.nonCritical).toBe((1000 + 900) * 2)
    expectAttack(original, "hugo", 1)
    const run = withTeamAttack(teamAttack())
    expect(() => {
      const converted = run()
      const overlap = consume(converted, extraOptionId)
      expect(overlap.nonCritical).toBe((1000 + 900 + 900) * 2)
      expectAttack(overlap, "hugo", 2)
      expect(overlap.attack.map((entry) => entry.effectId)).toEqual([
        hugoAttackEffectId,
        `agent:1291:zzz-hp:${extraId}:blk-legacy:mindscape:0`,
      ])
      console.info(
        "Hugo overlap guard regression",
        JSON.stringify({ original, overlap }),
      )
    }).toThrow(
      /Hugo teammate count raw has an additional same-clause ATK encoding/,
    )
  })

  it.each([
    {
      name: "other profession",
      applyProfession: "击破",
      elementFilter: "all",
      teammateAmount: 900,
    },
    {
      name: "other element",
      applyProfession: null,
      elementFilter: ["电"],
      teammateAmount: 900,
    },
    {
      name: "matching profession but excluded element",
      applyProfession: "强攻",
      elementFilter: ["电"],
      teammateAmount: 0,
    },
    {
      name: "excluded profession but matching element",
      applyProfession: "击破",
      elementFilter: ["冰"],
      teammateAmount: 0,
    },
  ])(
    "preserves team ATK excluding holder by $name",
    ({ name: _name, teammateAmount, ...filters }) => {
      const converted = withTeamAttack(
        teamAttack(
          filters as Pick<SourceEffect, "applyProfession" | "elementFilter">,
        ),
      )()
      const option = converted.catalog.options.find(
        (entry) => entry.optionId === extraOptionId,
      )!
      expect(option.variants[0]!.status).toBe("converted")
      const holder = consume(converted, extraOptionId)
      expect(holder.nonCritical).toBe((1000 + 900) * 2)
      expectAttack(holder, "hugo", 1)
      const teammate = consume(converted, extraOptionId, "anby")
      expect(teammate.nonCritical).toBe((1000 + teammateAmount) * 2)
      expectAttack(teammate, "anby", teammateAmount === 900 ? 1 : 0)
    },
  )

  it("preserves the independent team ATK at unlocked mindscape 3", () => {
    const converted = withTeamAttack(teamAttack(), "both", 3)()
    const independent = `agents:hugo:mindscape:3:independent-attack:${extraId}`
    const result = consume(converted, independent, "hugo", 3)
    expect(result.nonCritical).toBe((1000 + 900 + 900) * 2)
    expectAttack(result, "hugo", 2)
  })
})
