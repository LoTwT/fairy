import { createScorer } from "@mastra/core/evals"
import { createCompletenessScorer } from "@mastra/evals/scorers/prebuilt"
import {
  extractToolCalls,
  getAssistantMessageFromRunOutput,
  getUserMessageFromRunInput,
} from "@mastra/evals/scorers/utils"
import { z } from "zod"

export type ZzzAgentScorerResponseText = string

export type ZzzAgentScorerToolName = string

export type ZzzAgentScorerToolNameList = readonly ZzzAgentScorerToolName[]

export type ZzzAgentOutputFormatSectionName = string

export type ZzzAgentOutputFormatMatchedFlag = boolean

export type ZzzAgentOutputFormatSectionNameList =
  ZzzAgentOutputFormatSectionName[]

export type ZzzAgentOutputFormatMatchList = ZzzAgentOutputFormatMatch[]

export type ZzzAgentOutputFormatScore = number

export interface ZzzAgentOutputFormatMatch {
  name: ZzzAgentOutputFormatSectionName
  matched: ZzzAgentOutputFormatMatchedFlag
}

const outputFormatChecks = [
  { name: "队伍配置", pattern: /^## 队伍配置\s*\n\|/m },
  { name: "增益清单", pattern: /^## .+增益清单\s*\n\|/m },
  { name: "乘区汇总", pattern: /^## .+乘区汇总\s*\n\|/m },
  { name: "技能伤害", pattern: /^## .+技能伤害\s*\n\|/m },
] as const

export function getOutputFormatMatches(
  response: ZzzAgentScorerResponseText,
): ZzzAgentOutputFormatMatchList {
  return outputFormatChecks.map(({ name, pattern }) => ({
    name,
    matched: pattern.test(response),
  }))
}

export function scoreOutputFormat(
  response: ZzzAgentScorerResponseText,
  tools: ZzzAgentScorerToolNameList,
): ZzzAgentOutputFormatScore {
  if (!tools.includes("calcDamage") && !tools.includes("calc-damage")) return 1

  const matches = getOutputFormatMatches(response)
  const matched = matches.filter((item) => item.matched).length
  return matched / matches.length
}

/**
 * 回复完整性评分 — 检查回复是否完整覆盖用户请求的所有要点
 */
export const completenessScorer = createCompletenessScorer()

/**
 * 输出格式评分 — 检查回复是否包含规定的表格结构
 * （队伍配置 / 增益清单 / 乘区汇总 / 技能伤害）
 */
export const outputFormatScorer = createScorer({
  id: "output-format-scorer",
  name: "Output Format",
  description: "检查伤害计算回复是否包含规定的 Markdown 表格结构",
  type: "agent",
})
  .preprocess(({ run }) => {
    const response = getAssistantMessageFromRunOutput(run.output) ?? ""
    const userMessage = getUserMessageFromRunInput(run.input) ?? ""
    const { tools } = extractToolCalls(run.output)
    return { response, userMessage, tools }
  })
  .generateScore(({ results }) => {
    const response = results.preprocessStepResult?.response ?? ""
    const tools: ZzzAgentScorerToolNameList =
      results.preprocessStepResult?.tools ?? []
    return scoreOutputFormat(response, tools)
  })
  .generateReason(({ results, score }) => {
    const response = results.preprocessStepResult?.response ?? ""
    const tools: ZzzAgentScorerToolNameList =
      results.preprocessStepResult?.tools ?? []
    if (!tools.includes("calcDamage") && !tools.includes("calc-damage")) {
      return "未发生伤害计算，跳过输出格式评分"
    }
    const found: ZzzAgentOutputFormatSectionNameList = []
    const missing: ZzzAgentOutputFormatSectionNameList = []

    for (const { name, matched } of getOutputFormatMatches(response)) {
      if (matched) found.push(name)
      else missing.push(name)
    }

    return `格式评分: ${score}。包含: [${found.join(", ")}]${missing.length ? `，缺少: [${missing.join(", ")}]` : ""}`
  })

/**
 * 乘区提取准确性评分 — LLM 判断是否正确识别并归类了伤害乘区
 */
export const multiplierAccuracyScorer = createScorer({
  id: "multiplier-accuracy-scorer",
  name: "Multiplier Accuracy",
  description:
    "评估 Agent 是否正确识别、归类了技能/音擎/核心技/驱动盘中的伤害乘区",
  type: "agent",
  judge: {
    model: "zhipuai/glm-4.6v",
    instructions:
      "你是绝区零伤害计算审核专家。评估 AI 助手是否正确地从角色技能、核心技、音擎效果、驱动盘效果中提取了伤害乘区，" +
      "并正确归类到增伤区、暴击区、防御区、抗性区、易伤区等对应的伤害公式分区中。" +
      "仅返回符合 schema 的 JSON。",
  },
})
  .preprocess(({ run }) => {
    const userText = getUserMessageFromRunInput(run.input) ?? ""
    const assistantText = getAssistantMessageFromRunOutput(run.output) ?? ""
    const { tools } = extractToolCalls(run.output)
    return { userText, assistantText, tools }
  })
  .analyze({
    description: "分析乘区提取的正确性",
    outputSchema: z.object({
      hasCalculation: z.boolean().describe("回复中是否包含伤害计算"),
      multiplierZonesIdentified: z
        .number()
        .min(0)
        .max(10)
        .describe("正确识别的乘区数量"),
      multiplierZonesTotal: z
        .number()
        .min(0)
        .max(10)
        .describe("应该识别的乘区总数"),
      misclassified: z.string().default("").describe("错误归类的乘区（如有）"),
      explanation: z.string().default(""),
    }),
    createPrompt: ({ results }) => `
你正在评估一个绝区零伤害计算 AI 的回复质量。

用户请求：
"""
${results.preprocessStepResult.userText}
"""

AI 回复：
"""
${results.preprocessStepResult.assistantText}
"""

请评估：
1. 回复是否包含伤害计算（如果用户只是查询数据而非计算伤害，则 hasCalculation=false）
2. 如果包含计算，AI 是否正确识别了以下乘区：
   - 基础攻击力（角色ATK + 音擎ATK + 百分比/固定加成）
   - 增伤区（属性伤害加成、技能类型加成、通用增伤）
   - 暴击区（暴击率、暴击伤害）
   - 防御区（穿透、减防）
   - 抗性区（敌人抗性、减抗）
   - 易伤区（受到的伤害提升）
   - 失衡易伤区（失衡状态增伤）
3. 是否有乘区被错误归类（如把增伤区的效果算到了易伤区）

返回 JSON，格式：
{
  "hasCalculation": boolean,
  "multiplierZonesIdentified": number,
  "multiplierZonesTotal": number,
  "misclassified": "string",
  "explanation": "string"
}`,
  })
  .generateScore(({ results }) => {
    const r = (results as Record<string, any>)?.analyzeStepResult ?? {}
    if (!r.hasCalculation) return 1 // Not a calculation, skip
    if (!r.multiplierZonesTotal || r.multiplierZonesTotal === 0) return 1
    const accuracy = r.multiplierZonesIdentified / r.multiplierZonesTotal
    const penalty = r.misclassified ? 0.1 : 0
    return Math.max(0, Math.min(1, accuracy - penalty))
  })
  .generateReason(({ results, score }) => {
    const r = (results as Record<string, any>)?.analyzeStepResult ?? {}
    if (!r.hasCalculation) return "非伤害计算请求，跳过评分"
    return `乘区准确性: ${r.multiplierZonesIdentified}/${r.multiplierZonesTotal}，评分=${score}。${r.misclassified ? `错误归类: ${r.misclassified}。` : ""}${r.explanation ?? ""}`
  })
