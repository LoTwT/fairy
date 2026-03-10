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
  expect(base.includes("禁止把驱动盘写成“圣遗物”")).toBe(true)
  expect(full.includes("图片识别指南")).toBe(true)
  expect(off.includes("截图处理摘要")).toBe(false)
})
