import { expect, it } from "vitest"
import { zzzAgent } from "../src/mastra/agents/zzz-agent"

function getInstructionText(value: unknown): string {
  if (typeof value === "string") return value
  if (value && typeof value === "object" && "content" in value) {
    const content = (value as { content?: unknown }).content
    if (typeof content === "string") return content
    if (Array.isArray(content)) return JSON.stringify(content)
  }
  return String(value)
}

it("keeps screenshot summary by default", async () => {
  const base = getInstructionText(
    await zzzAgent.getInstructions({
      requestContext: { get: () => undefined } as any,
    }),
  )
  const full = getInstructionText(
    await zzzAgent.getInstructions({
      requestContext: {
        get: (key: string) => (key === "includeScreenshot" ? true : undefined),
      } as any,
    }),
  )
  const off = getInstructionText(
    await zzzAgent.getInstructions({
      requestContext: {
        get: (key: string) => (key === "includeScreenshot" ? false : undefined),
      } as any,
    }),
  )

  expect(base.includes("截图处理摘要")).toBe(true)
  expect(base.includes("图片识别指南")).toBe(false)
  expect(base.includes("必须先调用 lookupGameMode")).toBe(true)
  expect(base.includes("只有 skillMultiplier 可以直接传")).toBe(true)
  expect(base.includes("如果只有 1 位候选主C，直接继续计算")).toBe(true)
  expect(base.includes("优先调用 resolveBuildDamage")).toBe(true)
  expect(base.includes("resolveBuildSkillMatrix")).toBe(true)
  expect(base.includes("resolveBuildTriggerMatrix")).toBe(true)
  expect(base.includes("resolveBuildSourceEntries")).toBe(true)
  expect(base.includes("resolveBuildSourceDamageViews")).toBe(true)
  expect(base.includes("resolveBuildSourceUtilityViews")).toBe(true)
  expect(base.includes("matrix.effectSummary")).toBe(true)
  expect(base.includes("commonFormulaMultipliers")).toBe(true)
  expect(base.includes("额外结算条目")).toBe(true)
  expect(base.includes("额外来源条目")).toBe(true)
  expect(base.includes("触发条目矩阵")).toBe(true)
  expect(base.includes("matrix.summary.hasSourceViews")).toBe(true)
  expect(base.includes("matrix.summary.groups")).toBe(true)
  expect(base.includes("entry.metadata.canonicalLabel")).toBe(true)
  expect(base.includes("entry.metadata.stableKey")).toBe(true)
  expect(base.includes("views.summary.groups")).toBe(true)
  expect(base.includes("views.summary.standaloneCount")).toBe(true)
  expect(base.includes("views.summary.deltaCount")).toBe(true)
  expect(base.includes("views.summary.triggerCount")).toBe(true)
  expect(base.includes("views.summary.rateCount")).toBe(true)
  expect(base.includes("views.summary.requirementSummary")).toBe(true)
  expect(base.includes("entry.requirementSummary")).toBe(true)
  expect(base.includes("collection.summary.isUtilityOnly")).toBe(true)
  expect(base.includes("collection.summary.groups")).toBe(true)
  expect(base.includes("build.summary.formulaMultipliers")).toBe(true)
  expect(base.includes("build.summary.diagnosticGroups")).toBe(true)
  expect(base.includes("build.summary.sourceNoteGroups")).toBe(true)
  expect(base.includes("diagnostics")).toBe(true)
  expect(base.includes("sourceNotes")).toBe(true)
  expect(base.includes("sourceNotes 带 guidance")).toBe(true)
  expect(base.includes("provide-input")).toBe(true)
  expect(base.includes("input-applied")).toBe(true)
  expect(base.includes("keep-process-only")).toBe(true)
  expect(base.includes("keep-research-only")).toBe(true)
  expect(base.includes("row.metadata.canonicalLabel")).toBe(true)
  expect(base.includes("row.metadata.stableKey")).toBe(true)
  expect(base.includes("如果只是判断当前 resolver 是否支持")).toBe(true)
  expect(base.includes("如果高层 resolver 返回 found=false")).toBe(true)
  expect(base.includes("基础贯穿力")).toBe(true)
  expect(
    base.includes(
      "不要把一次 resolveBuildDamage 的单场景结果擅自扩写成整套技能表",
    ),
  ).toBe(true)
  expect(base.includes("不要编造“影6”“核心F”之类的默认值")).toBe(true)
  expect(base.includes("禁止把驱动盘写成“圣遗物”")).toBe(true)
  expect(full.includes("图片识别指南")).toBe(true)
  expect(off.includes("截图处理摘要")).toBe(false)
})
