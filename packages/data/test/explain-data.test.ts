import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { afterEach, describe, expect, it } from "vitest"
import { loadAgentActionIndex } from "../scripts/data-product/agent-actions.ts"
import {
  explainDataIdentity,
  formatExplainText,
  identifyDataIdentity,
  supportedInputForms,
  type ExplainResult,
} from "../scripts/data-product/explain.ts"
import { loadStaticEffectsProduct } from "../scripts/data-product/manifests.ts"
import { queryStaticCoverage } from "../scripts/data-product/static-coverage.ts"
import { isMainModuleEntry, runExplainCli } from "../scripts/explain-data.ts"

// 真实 ID 与数值取自 static effects revision 51；数据修订后按稳定身份更新。
const effectId =
  "agent:1211:zzz-hp:eff-ms46w5pz-93ry6b:blk-ms46w5pz-zdpplb:mindscape:0"
const multiOptionEffectId = "agent:1311:zzz-hp:mindscape-2:attack-conversion"
const optionId =
  "agents:alexandrina:mindscape:0:blk-ms46w5pz-zdpplb:eff-ms46w5pz-93ry6b"
const unsupportedOptionId =
  "agents:jane:mindscape:0:blk-ms34gorp-m9dlxw:eff-ms34hzuh-214aho"
const actionId = "action:agent:1011:action:0010"
const actionWithoutTargetsId = "action:agent:1011:action:0001"
const pointer = "/agents/1/mindscapeBuffs/0/effectBlocks/0/effects/0"
const supplementalEffectId = "agent:1621:nanoka:m1-hit-resistance-reduction"
const supplementalOptionId = "nanoka:agents:1621:m1-hit-resistance-reduction"

const product = loadStaticEffectsProduct()
const sources = {
  staticEffects: product,
  agentActions: loadAgentActionIndex(),
}

const fixtureRoots: string[] = []

afterEach(() => {
  for (const root of fixtureRoots.splice(0))
    rmSync(root, { recursive: true, force: true })
})

function writeFixture(files: Readonly<Record<string, unknown>>): string {
  const root = mkdtempSync(join(tmpdir(), "fairy-explain-data-"))
  fixtureRoots.push(root)
  for (const [relativePath, value] of Object.entries(files)) {
    const path = join(root, relativePath)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, JSON.stringify(value))
  }
  return root
}

interface SyntheticDefinitionOptions {
  readonly skillTargets?: readonly unknown[]
  readonly actions?: readonly unknown[]
}

function syntheticDefinitions(
  options: SyntheticDefinitionOptions = {},
): string {
  const source = {
    repository: "test/source",
    commit: "test-commit",
    files: [{ path: "source.json", sha256: "c".repeat(64) }],
  }
  return writeFixture({
    "effects/static.json": {
      schemaVersion: 1,
      ruleSetId: "test-effects",
      revision: "1",
      effects: [
        {
          kind: "contribution",
          effectId: "agent:1:test:target",
          source: {
            identity: { kind: "agent", entityId: "1" },
            section: "测试目标",
            references: [
              {
                sourceId: "test-source",
                version: "1",
                locale: "zh",
                resourcePath: "source.json",
                pointer: "/target",
              },
            ],
          },
          config: { kind: "literal", unit: "count", value: 1 },
          parameters: {
            amount: { kind: "constant", unit: "ratio", value: 0.1 },
          },
          activation: {
            kind: "supplied",
            maximumLayers: { kind: "literal", unit: "count", value: 1 },
          },
          scope: "hit",
          beneficiary: { kind: "holder" },
          when: { kind: "all", conditions: [] },
          operation: {
            kind: "factor-contribution",
            channel: "damage-bonus",
            value: { kind: "parameter", unit: "ratio", name: "amount" },
          },
        },
        {
          kind: "instant",
          effectId: "agent:1:test:instant",
          source: {
            identity: { kind: "agent", entityId: "1" },
            section: "测试即时规则",
            references: [
              {
                sourceId: "test-source",
                version: "1",
                locale: "zh",
                resourcePath: "source.json",
                pointer: "/instant",
              },
            ],
          },
          trigger: {
            eventKinds: ["hit"],
            when: { kind: "constant", value: true },
          },
          beneficiary: { kind: "holder" },
          operation: {
            kind: "resource-generation",
            resource: "energy",
            amount: { kind: "literal", unit: "energy-points", value: 1 },
          },
        },
        {
          kind: "modification",
          effectId: "agent:1:test:modifier",
          phase: "configuration",
          source: {
            identity: { kind: "agent", entityId: "1" },
            section: "测试修改",
            references: [
              {
                sourceId: "test-source",
                version: "1",
                locale: "zh",
                resourcePath: "source.json",
                pointer: "/modifier",
              },
            ],
          },
          config: { kind: "literal", unit: "count", value: 1 },
          parameters: {},
          target: { kind: "effect", effectId: "agent:1:test:target" },
          modifications: [
            {
              field: "output",
              unit: "ratio",
              change: {
                operator: "scale",
                value: { kind: "literal", unit: "multiplier", value: 2 },
              },
            },
          ],
        },
        {
          kind: "modification",
          effectId: "agent:1:test:state-modifier",
          phase: "configuration",
          source: {
            identity: { kind: "agent", entityId: "1" },
            section: "测试状态修改",
            references: [
              {
                sourceId: "test-source",
                version: "1",
                locale: "zh",
                resourcePath: "source.json",
                pointer: "/state-modifier",
              },
            ],
          },
          config: { kind: "literal", unit: "count", value: 1 },
          parameters: {},
          target: { kind: "state", stateId: "state:test" },
          modifications: [
            {
              field: "parameter",
              name: "amount",
              unit: "ratio",
              change: {
                operator: "add",
                value: { kind: "literal", unit: "ratio", value: 0.1 },
              },
            },
          ],
        },
      ],
      actions: [],
      states: [],
    },
    "effects/static-catalog.json": {
      schemaVersion: 1,
      ruleSetId: "test-effects",
      revision: "1",
      source,
      entities: [],
      mechanisms: [],
      skillTargets: options.skillTargets ?? [],
      differences: [],
      options: [],
    },
    "effects/static-coverage.json": {
      schemaVersion: 1,
      ruleSetId: "test-effects",
      revision: "1",
      source,
      summary: {
        entities: 0,
        packs: 0,
        emptyPacks: 0,
        rawEffects: 0,
        rules: 1,
        options: 0,
        converted: 0,
        corrected: 0,
        unsupported: 0,
        supplements: {
          records: 0,
          rules: 0,
          options: 0,
          entities: 0,
          integrated: 0,
          outOfScope: 0,
        },
      },
      records: [],
      supplementalRecords: [],
      deferredMechanisms: [],
      fieldMappings: {},
      packs: [],
      entities: [],
      reverseGaps: [],
    },
    ...(options.actions === undefined
      ? {}
      : {
          "skills/agents/1.json": {
            entityId: "1",
            schemaVersion: 1,
            futureTopLevel: true,
            skillLevelBonuses: [],
            actions: options.actions,
          },
        }),
  })
}

function onlyModificationTargetProduct() {
  return loadStaticEffectsProduct(syntheticDefinitions())
}

function syntheticAction(
  overrides: Readonly<Record<string, unknown>> = {},
): Readonly<Record<string, unknown>> {
  return {
    actionId: "action:agent:1:action:0001",
    branchId: "agent:1:branch:basic",
    name: "测试动作",
    rowName: "伤害倍率",
    levelGroup: "basic",
    skillCategory: "basic",
    skillTargetIds: ["zzz-hp:skill:test"],
    skillTags: [],
    source: {
      path: "agents/1/details.zh.json",
      pointer: "/skill/basic/description/0/param/0",
    },
    descriptionSources: [],
    description: "测试",
    parameterIds: ["1"],
    sourceExpression: "{Skill:1, Prop:1001}",
    damageCoefficient: {
      levelGroup: "basic",
      base: 1,
      growth: 0.1,
    },
    dazeCoefficient: null,
    calculation: { kind: "damage", segments: [] },
    inputs: [],
    limitations: [],
    upstreamSkillId: null,
    ...overrides,
  }
}

function runCli(arguments_: readonly string[]) {
  const stdout: string[] = []
  const stderr: string[] = []
  const code = runExplainCli(arguments_, {
    io: {
      stdout: (text) => stdout.push(text),
      stderr: (text) => stderr.push(text),
    },
  })
  return { code, stdout: stdout.join(""), stderr: stderr.join("") }
}

function expectResultType<Type extends ExplainResult["type"]>(
  result: ExplainResult,
  type: Type,
): Extract<ExplainResult, { type: Type }> {
  expect(result.type).toBe(type)
  if (result.type !== type)
    throw new Error(`expected ${type}, received ${result.type}`)
  return result as Extract<ExplainResult, { type: Type }>
}

describe("data explain identity recognition", () => {
  it("recognizes the four documented input forms", () => {
    expect(identifyDataIdentity(effectId)).toEqual({
      type: "effect",
      value: effectId,
    })
    expect(identifyDataIdentity(optionId)).toEqual({
      type: "option",
      value: optionId,
    })
    expect(identifyDataIdentity(actionId)).toEqual({
      type: "action",
      value: actionId,
    })
    expect(identifyDataIdentity(pointer)).toEqual({
      type: "pointer",
      value: pointer,
    })
  })

  it("returns undefined for unknown input and rejects a conflicting --type", () => {
    expect(identifyDataIdentity("not-an-id")).toBeUndefined()
    expect(identifyDataIdentity(effectId, "option")).toBeUndefined()
    expect(identifyDataIdentity(optionId, "option")).toEqual({
      type: "option",
      value: optionId,
    })
  })
})

describe("data explain effect", () => {
  it("traces an effect to its rule, catalog variant, coverage and limitations", () => {
    const result = expectResultType(
      explainDataIdentity(effectId, sources),
      "effect",
    )
    expect(result.effectId).toBe(effectId)
    expect(result.rule).toMatchObject({
      kind: "contribution",
      operationKind: "stat-adjustment",
      scope: "entity",
    })
    expect(result.rule?.source.references[0]?.pointer).toBe(pointer)
    expect(result.catalogReferences).toHaveLength(1)
    expect(result.catalogReferences[0]).toMatchObject({
      optionId,
      variantIndex: 0,
      status: "converted",
    })
    expect(result.coverage.records).toHaveLength(1)
    expect(result.coverage.records[0]).toMatchObject({
      pointer,
      status: "converted",
      rawValue: 12,
      normalizedValue: 12,
      optionId,
    })
    expect(result.modifications).toEqual([])
    expect(formatExplainText(result)).toContain(
      "以该 effectId 为 target 的 modification（0）：",
    )
    expect(result.relatedTestsAndDocs).toBe("未自动关联测试/文档")
    expect(formatExplainText(result)).toContain("未自动关联测试/文档")
  })

  it("lists every option and variant that references one effectId", () => {
    const result = expectResultType(
      explainDataIdentity(multiOptionEffectId, sources),
      "effect",
    )
    expect(result.rule?.kind).toBe("modification")
    expect(
      new Set(result.catalogReferences.map((reference) => reference.optionId)),
    ).toEqual(
      new Set([
        "agents:astrayao:mindscape:2:blk-legacy:eff-muhxkum2-5x20c1",
        "agents:astrayao:mindscape:2:blk-legacy:legacy-team-atk",
      ]),
    )
    expect(result.coverage.records).toHaveLength(2)
    expect(
      queryStaticCoverage(
        { catalog: product.catalog, coverage: product.coverage },
        { effectId: multiOptionEffectId },
      ).matches,
    ).toHaveLength(2)
  })

  it("lists every variant of one option that references the effect", () => {
    const refinementEffectId =
      "w-engine:12001:zzz-hp:legacy-self-skillDmgBonus:blk-legacy:refinement"
    const result = expectResultType(
      explainDataIdentity(refinementEffectId, sources),
      "effect",
    )
    expect(result.catalogReferences).toHaveLength(5)
    expect(
      new Set(result.catalogReferences.map((reference) => reference.optionId)),
    ).toEqual(
      new Set([
        "w-engines:Lunar_Pleniluna:refinement:blk-legacy:legacy-self-skillDmgBonus",
      ]),
    )
    expect(
      result.catalogReferences.map((reference) => reference.variantIndex),
    ).toEqual([0, 1, 2, 3, 4])
  })

  it("finds an effect with no catalog or coverage links but a modification reference", () => {
    const synthetic = onlyModificationTargetProduct()
    const result = expectResultType(
      explainDataIdentity("agent:1:test:target", {
        staticEffects: synthetic,
        agentActions: { files: [] },
      }),
      "effect",
    )
    expect(result.rule?.kind).toBe("contribution")
    expect(result.catalogReferences).toEqual([])
    expect(result.coverage.records).toEqual([])
    expect(result.coverage.supplementalRecords).toEqual([])
    expect(result.modifications).toHaveLength(1)
    expect(result.modifications[0]).toMatchObject({
      effectId: "agent:1:test:modifier",
      kind: "modification",
      targetEffectId: "agent:1:test:target",
    })
    expect(result.limitations.join("\n")).toContain(
      "未找到引用该 effectId 的 catalog variants/options",
    )
    expect(result.limitations.join("\n")).toContain(
      "static-coverage.json 中未找到按 effectId 关联的 records 或 supplementalRecords",
    )
    expect(
      synthetic.rules.some(
        (rule) =>
          rule.kind === "modification" &&
          rule.target.kind === "state" &&
          rule.target.stateId === "state:test",
      ),
    ).toBe(true)
    expect(
      synthetic.rules.some(
        (rule) =>
          rule.kind === "instant" && rule.effectId === "agent:1:test:instant",
      ),
    ).toBe(true)
  })

  it("finds an effect that is only present in supplementalRecords", () => {
    const result = expectResultType(
      explainDataIdentity(supplementalEffectId, sources),
      "effect",
    )
    expect(result.coverage.records).toEqual([])
    expect(result.coverage.supplementalRecords).toHaveLength(1)
    expect(result.coverage.supplementalRecords[0]).toMatchObject({
      status: "integrated",
      optionId: supplementalOptionId,
      effectIds: [supplementalEffectId],
    })
    expect(
      result.catalogReferences.map((reference) => reference.optionId),
    ).toContain(supplementalOptionId)
  })
})

describe("data explain option", () => {
  it("summarizes variants, references, differences and coverage", () => {
    const result = expectResultType(
      explainDataIdentity(optionId, sources),
      "option",
    )
    expect(result.option.effectIds).toEqual([effectId])
    expect(result.option.statuses).toEqual(["converted"])
    expect(result.option.variants).toHaveLength(1)
    expect(result.option.variants[0]).toMatchObject({
      index: 0,
      status: "converted",
      maximumLayers: 1,
      configuration: {
        minimumMindscape: 0,
        coreSkillLevels: [7],
      },
    })
    expect(result.option.variants[0]?.references.length).toBeGreaterThan(0)
    expect(result.option.rules).toHaveLength(1)
    expect(result.coverage.records).toHaveLength(1)
    expect(
      queryStaticCoverage(
        { catalog: product.catalog, coverage: product.coverage },
        { optionId },
      ).matches,
    ).toHaveLength(1)
  })

  it("explains an unsupported option with no effectIds", () => {
    const result = expectResultType(
      explainDataIdentity(unsupportedOptionId, sources),
      "option",
    )
    expect(result.option.effectIds).toEqual([])
    expect(result.option.statuses).toEqual(["unsupported"])
    expect(result.option.variants[0]).toMatchObject({
      status: "unsupported",
      effectIds: [],
      reason: "semantic-conflict",
    })
    expect(result.option.rules).toEqual([])
    expect(result.coverage.records).toHaveLength(1)
    expect(result.coverage.records[0]).toMatchObject({
      status: "unsupported",
      reason: "semantic-conflict",
      effectIds: [],
    })
    expect(result.limitations.join("\n")).toContain("semantic-conflict")
  })

  it("finds an option that is only present in supplementalRecords", () => {
    const result = expectResultType(
      explainDataIdentity(supplementalOptionId, sources),
      "option",
    )
    expect(result.option.effectIds).toContain(supplementalEffectId)
    expect(result.coverage.records).toEqual([])
    expect(result.coverage.supplementalRecords).toHaveLength(1)
    expect(result.coverage.supplementalRecords[0]).toMatchObject({
      status: "integrated",
      optionId: supplementalOptionId,
      effectIds: [supplementalEffectId],
    })
    expect(
      queryStaticCoverage(
        { catalog: product.catalog, coverage: product.coverage },
        { optionId: supplementalOptionId },
      ).matches,
    ).toHaveLength(1)
  })
})

describe("data explain action", () => {
  it("outputs the action definition and structured skill target", () => {
    const result = expectResultType(
      explainDataIdentity(actionId, sources),
      "action",
    )
    expect(result.action).toMatchObject({
      actionId,
      branchId: "agent:1011:branch:basic-4",
      name: "普通攻击：落雷",
      levelGroup: "basic",
      skillCategory: "basic",
      source: {
        path: "agents/1011/details.zh.json",
        pointer: "/skill/basic/description/3/param/0",
      },
    })
    expect(result.action.damageCoefficient).toEqual({
      levelGroup: "basic",
      base: 3.286,
      growth: 0.299,
    })
    expect(result.skillTargetAssociation).toBe("structured")
    expect(result.skillTargets.map((target) => target.targetId)).toContain(
      "zzz-hp:skill:anby-basic-ms47yaat",
    )
    expect(result.skillLevelBonuses).toHaveLength(2)
  })

  it("states explicitly when the static catalog has no skill target association", () => {
    const result = expectResultType(
      explainDataIdentity(actionWithoutTargetsId, sources),
      "action",
    )
    expect(result.skillTargetAssociation).toBe("none")
    expect(result.conditionalSkillTargetAssociation).toBe("none")
    expect(result.skillTargets).toEqual([])
    expect(result.conditionalSkillTargets).toEqual([])
    expect(result.limitations.join("\n")).toContain(
      "静态目录未提供与该动作的结构化 skill target 关联",
    )
  })

  it("keeps a conditional-only target association distinct", () => {
    const result = expectResultType(
      explainDataIdentity("action:agent:1381:action:0014", sources),
      "action",
    )
    expect(result.skillTargetAssociation).toBe("none")
    expect(result.conditionalSkillTargetAssociation).toBe("structured")
    expect(result.skillTargets).toEqual([])
    expect(result.conditionalSkillTargets.length).toBeGreaterThan(0)
    expect(result.limitations.join("\n")).not.toContain(
      "静态目录未提供与该动作的结构化 skill target 关联",
    )
  })

  it("reports a partial association with the missing target id", () => {
    const root = syntheticDefinitions({
      skillTargets: [
        {
          targetId: "zzz-hp:skill:test",
          upstreamId: "test",
          agentEntityId: "1",
          category: "basic",
          name: "测试目标",
          countsAsFollowUp: false,
        },
      ],
      actions: [
        syntheticAction({
          skillTargetIds: ["zzz-hp:skill:test", "zzz-hp:skill:missing"],
        }),
      ],
    })
    const result = expectResultType(
      explainDataIdentity("action:agent:1:action:0001", {
        staticEffects: loadStaticEffectsProduct(root),
        agentActions: loadAgentActionIndex(root),
      }),
      "action",
    )
    expect(result.skillTargetAssociation).toBe("partial")
    expect(result.skillTargets.map((target) => target.targetId)).toEqual([
      "zzz-hp:skill:test",
    ])
    expect(result.limitations.join("\n")).toContain("zzz-hp:skill:missing")
  })

  it("ignores unknown action fields but still requires known fields", () => {
    const tolerantRoot = syntheticDefinitions({
      actions: [syntheticAction({ futureActionField: true })],
    })
    const tolerantIndex = loadAgentActionIndex(tolerantRoot)
    expect(tolerantIndex.files[0]?.actions[0]?.actionId).toBe(
      "action:agent:1:action:0001",
    )

    const missingRoot = syntheticDefinitions({
      actions: [syntheticAction({ name: undefined })],
    })
    expect(() => loadAgentActionIndex(missingRoot)).toThrowError(
      'missing required field "name"',
    )
  })
})

describe("data explain pointer", () => {
  it("returns the coverage record and linked option/rule", () => {
    const result = expectResultType(
      explainDataIdentity(pointer, sources),
      "pointer",
    )
    expect(result.pointer).toBe(pointer)
    expect(result.records).toHaveLength(1)
    expect(result.records[0]).toMatchObject({
      pointer,
      status: "converted",
      rawValue: 12,
      normalizedValue: 12,
      optionId,
      effectIds: [effectId],
    })
    expect(result.options.map((option) => option.optionId)).toEqual([optionId])
    expect(result.rules.map((rule) => rule.effectId)).toEqual([effectId])
    expect(result.limitations.join("\n")).toContain(
      "supplementalRecords 不携带结构化 pointer",
    )
  })
})

describe("data explain errors and CLI", () => {
  it("rejects an unknown input with supported forms", () => {
    expect(() => explainDataIdentity("not-an-id", sources)).toThrowError(
      /无法识别或无法唯一识别输入/u,
    )
    const result = runCli(["not-an-id"])
    expect(result.code).toBe(1)
    expect(result.stdout).toBe("")
    expect(result.stderr).toContain("支持的形式")
    for (const form of supportedInputForms)
      expect(result.stderr).toContain(form)
  })

  it("reports a well-formed but unknown identity as not found", () => {
    const result = runCli(["agent:not-registered"])
    expect(result.code).toBe(1)
    expect(result.stderr).toContain("未找到 effectId")
    expect(result.stderr).toContain("支持的形式")
  })

  it("emits stable JSON and a JSON error object", () => {
    const first = runCli([effectId, "--json"])
    const second = runCli([effectId, "--json"])
    expect(first.code).toBe(0)
    expect(first.stderr).toBe("")
    expect(second.code).toBe(0)
    expect(second.stdout).toBe(first.stdout)

    const parsed = JSON.parse(first.stdout) as {
      readonly schemaVersion: number
      readonly type: string
      readonly effectId: string
      readonly rule: { readonly effectId: string }
    }
    expect(parsed.schemaVersion).toBe(1)
    expect(parsed.type).toBe("effect")
    expect(parsed.effectId).toBe(effectId)
    expect(parsed.rule.effectId).toBe(effectId)

    const failure = runCli(["not-an-id", "--json"])
    expect(failure.code).toBe(1)
    const error = JSON.parse(failure.stderr) as {
      readonly error: { readonly code: string }
      readonly supportedInputs: readonly string[]
    }
    expect(error.error.code).toBe("UNKNOWN_INPUT_TYPE")
    expect(error.supportedInputs).toEqual(supportedInputForms)
  })

  it("honors --type only when the input matches that shape", () => {
    const explicit = runCli([optionId, "--type", "option", "--json"])
    expect(explicit.code).toBe(0)
    expect(JSON.parse(explicit.stdout)).toMatchObject({
      type: "option",
      optionId,
    })

    const conflict = runCli([effectId, "--type", "option"])
    expect(conflict.code).toBe(1)
    expect(conflict.stderr).toContain("--type option")
  })

  it("prints help even when other arguments are present", () => {
    const result = runCli(["--help", "--unknown-option"])
    expect(result.code).toBe(0)
    expect(result.stdout).toContain("用法：")
    expect(result.stdout).toContain("支持的形式")
  })

  it.skipIf(process.platform === "win32")(
    "detects the CLI entry through a symlink",
    () => {
      const cliPath = fileURLToPath(
        new URL("../scripts/explain-data.ts", import.meta.url),
      )
      const root = mkdtempSync(join(tmpdir(), "fairy-explain-entry-"))
      fixtureRoots.push(root)
      const link = join(root, "explain-link.ts")
      symlinkSync(cliPath, link)
      const moduleUrl = pathToFileURL(cliPath).href
      expect(isMainModuleEntry(link, moduleUrl)).toBe(true)
      expect(isMainModuleEntry(cliPath, moduleUrl)).toBe(true)
      expect(isMainModuleEntry(undefined, moduleUrl)).toBe(false)
      expect(isMainModuleEntry(join(root, "missing.ts"), moduleUrl)).toBe(false)
      expect(isMainModuleEntry(cliPath, import.meta.url)).toBe(false)
    },
  )
})
