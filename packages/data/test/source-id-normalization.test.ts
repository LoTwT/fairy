import { describe, expect, it } from "vitest"
import {
  normalizeSourceIds,
  type SourceIdNormalization,
} from "../scripts/static-effects/source-id-normalization.ts"
import type {
  SourceData,
  SourceEffect,
} from "../scripts/static-effects/source.ts"

const effect = (id: string, value = 10): SourceEffect => ({
  id,
  applyTarget: "self",
  elementFilter: "all",
  kind: "fixed",
  stat: "critRate",
  value,
  stackable: false,
  maxStacks: 1,
  valuePerStack: 0,
  defaultStacks: 1,
  appliesToAnomaly: false,
  enabledDefault: true,
  note: "",
})

const expected = (value = 10) =>
  ({
    applyTarget: "self",
    elementFilter: "all",
    kind: "fixed",
    stat: "critRate",
    value,
    stackable: false,
    maxStacks: 1,
    valuePerStack: 0,
    defaultStacks: 1,
    appliesToAnomaly: false,
    enabledDefault: true,
    note: "",
  }) as const

const dataWithBlock = (
  effects: SourceEffect[] = [effect("upstream-effect")],
): SourceData => ({
  agents: [
    {
      id: "test-agent",
      name: "Test",
      mindscapeBuffs: [
        {},
        {},
        {
          effectBlocks: [
            {
              id: "upstream-block",
              name: "M2",
              note: "",
              effects,
            },
          ],
        },
      ],
    },
  ],
  wengines: [],
  driveDiscs: [],
  skillSubcategories: [],
  followUpSkillRules: [],
})

const registration = (
  overrides: Partial<SourceIdNormalization> = {},
): SourceIdNormalization => ({
  sourceCommit: "commit-a",
  category: "agents",
  entityId: "test-agent",
  rankKind: "mindscape",
  rank: 2,
  upstream: { blockId: "upstream-block", effectId: "upstream-effect" },
  frozen: { blockId: "frozen-block", effectId: "frozen-effect" },
  expectedRaw: expected(),
  explanation: "test",
  ...overrides,
})

const normalize = (
  data: SourceData,
  registrations: readonly SourceIdNormalization[],
) => normalizeSourceIds(data, registrations, "commit-a")

describe("source ID normalization", () => {
  it("is a no-op when the source commit does not match", () => {
    const data = dataWithBlock()
    normalizeSourceIds(data, [registration()], "commit-b")
    expect(data.agents[0]!.mindscapeBuffs?.[2]?.effectBlocks?.[0]?.id).toBe(
      "upstream-block",
    )
  })

  it("is a no-op for an empty registry", () => {
    const data = dataWithBlock()
    normalizeSourceIds(data, [], "commit-a")
    expect(data.agents[0]!.mindscapeBuffs?.[2]?.effectBlocks?.[0]?.id).toBe(
      "upstream-block",
    )
  })

  it("rewrites the block and effect while preserving the record shape", () => {
    const data = dataWithBlock()
    normalize(data, [registration()])
    const block = data.agents[0]!.mindscapeBuffs?.[2]?.effectBlocks?.[0]
    expect(block?.id).toBe("frozen-block")
    expect(block?.effects[0]?.id).toBe("frozen-effect")
  })

  it("rejects a missing registration target", () => {
    const data = dataWithBlock()
    expect(() =>
      normalize(data, [
        registration({
          upstream: { blockId: "missing-block", effectId: "upstream-effect" },
        }),
      ]),
    ).toThrow("lost block")
  })

  it("rejects raw shape drift", () => {
    const data = dataWithBlock()
    expect(() =>
      normalize(data, [registration({ expectedRaw: expected(11) })]),
    ).toThrow("raw shape drift")
  })

  it("rejects a frozen block ID that already exists in the same pack", () => {
    const data = dataWithBlock()
    data.agents[0]!.mindscapeBuffs![2]!.effectBlocks!.push({
      id: "frozen-block",
      name: "existing",
      note: "",
      effects: [effect("existing-effect")],
    })
    expect(() => normalize(data, [registration()])).toThrow("Frozen block ID")
  })

  it("rejects a frozen effect ID that already exists in the same block", () => {
    const data = dataWithBlock([
      effect("upstream-effect"),
      effect("frozen-effect"),
    ])
    expect(() =>
      normalize(data, [
        registration(),
        registration({
          upstream: { blockId: "upstream-block", effectId: "frozen-effect" },
          frozen: { blockId: "frozen-block", effectId: "other-frozen" },
        }),
      ]),
    ).toThrow("Frozen effect ID")
  })

  it("rejects duplicate upstream and frozen identities", () => {
    const data = dataWithBlock()
    expect(() => normalize(data, [registration(), registration()])).toThrow(
      "Duplicate source ID normalization",
    )
    expect(() =>
      normalize(data, [
        registration(),
        registration({
          upstream: { blockId: "upstream-block", effectId: "second" },
        }),
      ]),
    ).toThrow("Duplicate frozen source identity")
  })

  it("rejects partial block coverage", () => {
    const data = dataWithBlock([
      effect("upstream-effect"),
      effect("unregistered-effect"),
    ])
    expect(() => normalize(data, [registration()])).toThrow(
      "only partially covers block",
    )
  })

  it("rewrites direct legacy effects without moving blocks", () => {
    const data: SourceData = {
      ...dataWithBlock(),
      agents: [
        {
          id: "test-agent",
          name: "Test",
          mindscapeBuffs: [{}, {}, { effects: [effect("legacy-effect")] }],
        },
      ],
    }
    normalize(data, [
      registration({
        upstream: { blockId: "legacy", effectId: "legacy-effect" },
        frozen: { blockId: "legacy", effectId: "frozen-legacy-effect" },
      }),
    ])
    expect(data.agents[0]!.mindscapeBuffs?.[2]?.effects?.[0]?.id).toBe(
      "frozen-legacy-effect",
    )
  })
})
