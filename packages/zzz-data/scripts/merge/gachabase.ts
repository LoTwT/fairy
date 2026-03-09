import { readRaw, writeOut } from "./shared.js"

// ---- 类型定义（仅 prune 所需的最小结构）----

interface AgentDetail {
  profile: {
    details?: unknown
    details2?: unknown
    aptitude?: unknown
    titles?: unknown
    [key: string]: unknown
  }
  skins: Array<{ description?: unknown; [key: string]: unknown }>
  mindscapes: Array<{ flavorDesc?: unknown; [key: string]: unknown }>
  [key: string]: unknown
}

interface WEngineDetail {
  shortComment?: unknown
  longComment?: unknown
  [key: string]: unknown
}

// ---- Prune 函数 ----

function pruneAgentDetail(agent: AgentDetail): unknown {
  const { profile, skins, mindscapes, ...rest } = agent

  const { details, details2, aptitude, titles, ...profileRest } = profile

  return {
    ...rest,
    profile: profileRest,
    skins: skins.map(({ description, ...skin }) => skin),
    mindscapes: mindscapes.map(({ flavorDesc, ...m }) => m),
  }
}

function pruneWEngineDetail(engine: WEngineDetail): unknown {
  const { shortComment, longComment, ...rest } = engine
  return rest
}

// ---- Merge 任务 ----

function mergeGachabaseLocale(locale: string): void {
  // 直接复制（无需裁剪）
  for (const name of [
    "agents",
    "w-engines",
    "bangboo",
    "drive-discs",
  ] as const) {
    const data = readRaw(`${locale}/gachabase/${name}.json`)
    writeOut(locale, name, data)
  }

  // agent-details：裁剪 6 个字段
  const agentDetails = readRaw<AgentDetail[]>(
    `${locale}/gachabase/agent-details.json`,
  )
  writeOut(locale, "agent-details", agentDetails.map(pruneAgentDetail))

  // w-engine-details：裁剪 shortComment / longComment
  const wEngineDetails = readRaw<WEngineDetail[]>(
    `${locale}/gachabase/w-engine-details.json`,
  )
  writeOut(locale, "w-engine-details", wEngineDetails.map(pruneWEngineDetail))
}

export function mergeGachabase(): void {
  console.log("Merging gachabase...")
  for (const locale of ["en", "zh-CN"]) {
    mergeGachabaseLocale(locale)
  }
}
