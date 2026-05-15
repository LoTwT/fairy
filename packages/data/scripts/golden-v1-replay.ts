import { createHash } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { calculate } from "../../core/src/index"
import * as XLSX from "xlsx"

const packageDir = fileURLToPath(new URL("..", import.meta.url))
const repoRoot = join(packageDir, "../..")

const workbookPath = join(repoRoot, "data/source/excel/data.xlsx")
const sourceManifestPath = join(repoRoot, "data/source/source-manifest.json")
const candidatePath = join(repoRoot, "data/cleaned/audit/v1-agent-source-candidates.json")
const nicoleAcceptancePath = join(repoRoot, "data/cleaned/audit/nicole.acceptance.json")
const yanagiAcceptancePath = join(repoRoot, "data/cleaned/audit/yanagi.acceptance.json")
const replayReportPath = join(repoRoot, "data/cleaned/golden/v1-replay-report.json")
const buhflipexplodeVersionsPath = join(
  repoRoot,
  "data/source/raw/buhflipexplode/2026-05-05T0445Z/da/da-versions.live.json",
)
const buhflipexplodeEnemiesPath = join(
  repoRoot,
  "data/source/raw/buhflipexplode/2026-05-05T0445Z/assets/zzz/enemies.live.json",
)
const nanokaYixuanPath = join(repoRoot, "data/source/raw/nanoka/zzz/2.8/zh/character/1371.json")
const nanokaPlugbooPath = join(repoRoot, "data/source/raw/nanoka/zzz/2.8/zh/bangboo/54008.json")

const sourceId = "lo-user-excel"
const parserVersion = "golden-v1-replay-v0.1.0"
const excelSourceVersion = "2.6.0_R14028417"
const nanokaSourceVersion = "2.8"
const replaySourceVersion = "excel-2.6.0_R14028417+buhflipexplode-2026-05-05T0445Z+nanoka-2.8"
const manualAcceptance = {
  acceptedBy: "@lo-user",
  acceptedAt: "2026-05-05T18:45:21+08:00",
  decisionRef: {
    target: "#fairy:e2e57d52",
    messageId: "6af6f017",
  },
  reason:
    "lo-user confirmed A/B as explicit active/inactive states and C as a skill-level-parameterized formula based on source formula, guide, and context.",
} as const

const v1AnchorIds = [
  "G01",
  "G02",
  "G03",
  "G04",
  "G05",
  "G06",
  "G07",
  "G08",
  "G09",
  "G10",
  "G11",
  "G12",
  "G13",
  "G14",
  "G15",
  "G16",
  "G17",
  "G18",
  "G19",
  "G20",
  "G21",
  "G22",
  "G23",
  "G24",
  "G25",
  "G26",
  "G27",
  "G28",
] as const

const deferredAnchorIds = [] as const

const agentSpecs = {
  nicole: { excelId: 1031, zh: "妮可", en: "Nicole" },
  yanagi: { excelId: 1221, zh: "柳", en: "Yanagi" },
  yixuan: { excelId: 1371, zh: "仪玄", en: "Yixuan" },
} as const

const attributeMap = {
  火: "fire",
  电: "electric",
  冰: "ice",
  物理: "physical",
  以太: "ether",
  烈霜: "frost",
  玄墨: "auricInk",
} as const

const specialtyMap = {
  强攻: "attack",
  击破: "stun",
  异常: "anomaly",
  支援: "support",
  防护: "defense",
  命破: "rupture",
} as const

const bangbooSpecs = {
  penguinboo: {
    excelId: 53001,
    zh: "企鹅布",
    en: "Penguinboo",
    attrRange: "邦布属性!A42:T42",
    activeRange: "邦布技能!A2:H2",
    chainRange: "邦布技能!A3:H3",
  },
  sharkboo: {
    excelId: 54001,
    zh: "鲨牙布",
    en: "Sharkboo",
    attrRange: "邦布属性!A24:T24",
    activeRange: "邦布技能!A17:H17",
    chainRange: "邦布技能!A18:H18",
  },
  plugboo: {
    excelId: 54008,
    zh: "插头布",
    en: "Plugboo",
    attrRange: "邦布属性!A18:T18",
    activeRange: "邦布技能!A29:H29",
    chainRange: "邦布技能!A30:H30",
  },
} as const

type AnchorStatus = "passed" | "pendingHarness" | "blocked" | "deferred"

interface AnchorReport {
  id: string
  status: AnchorStatus
  sourceRefs: Array<Record<string, string>>
  notes: string[]
  diagnostics?: Array<Record<string, unknown>>
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex")
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T
}

function writeJson(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`)
}

function parseArgs(argv: string[]): { command: string; flags: Record<string, string | true> } {
  const [command = "verify", ...rest] = argv
  const flags: Record<string, string | true> = {}

  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i]
    if (!token.startsWith("--"))
      throw new Error(`Unexpected positional argument: ${token}`)

    const key = token.slice(2)
    const next = rest[i + 1]
    if (next === undefined || next.startsWith("--")) {
      flags[key] = true
    }
    else {
      flags[key] = next
      i += 1
    }
  }

  return { command, flags }
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map(line => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function normalizeSourceTexts(values: readonly unknown[]): string {
  return values.map(normalizeText).filter(Boolean).join("\n---\n")
}

function rowsForSheet(workbook: XLSX.WorkBook, sheetName: string): unknown[][] {
  const sheet = workbook.Sheets[sheetName]
  if (sheet === undefined)
    throw new Error(`Missing workbook sheet: ${sheetName}`)

  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    blankrows: false,
    defval: null,
  }) as unknown[][]
}

function loadWorkbook(): {
  workbook: XLSX.WorkBook
  workbookSha256: string
  workbookVersion: string
} {
  const bytes = readFileSync(workbookPath)
  const manifest = readJson<{
    sources: Array<{ id: string; sha256: string }>
  }>(sourceManifestPath)
  const manifestSource = manifest.sources.find(source => source.id === sourceId)
  if (manifestSource === undefined)
    throw new Error(`Missing ${sourceId} in data/source/source-manifest.json`)

  const workbookSha256 = sha256(bytes)
  if (workbookSha256 !== manifestSource.sha256) {
    throw new Error(
      `Workbook hash mismatch: manifest=${manifestSource.sha256}, actual=${workbookSha256}`,
    )
  }

  const workbook = XLSX.read(bytes, {
    type: "buffer",
    cellDates: false,
    cellFormula: false,
    cellNF: false,
    cellStyles: false,
  })
  const workbookVersion = String(workbook.Sheets["首页"]?.A1?.v ?? "")
  if (workbookVersion !== "2.6.0_R14028417")
    throw new Error(`Unexpected workbook version: ${workbookVersion}`)

  return { workbook, workbookSha256, workbookVersion }
}

function headerMap(row: readonly unknown[]): Map<string, number> {
  return new Map(
    row.map((value, index) => [String(value ?? "").trim(), index] as const),
  )
}

function rowValue(row: readonly unknown[], headers: Map<string, number>, key: string): unknown {
  const index = headers.get(key)
  return index === undefined ? undefined : row[index]
}

function numberValue(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error(`Expected numeric ${field}, got ${String(value)}`)

  return value
}

function mappedValue<TMap extends Record<string, string>>(
  map: TMap,
  value: unknown,
  field: string,
): TMap[keyof TMap] {
  const key = String(value ?? "").trim()
  const mapped = map[key]
  if (mapped === undefined)
    throw new Error(`Unmapped ${field}: ${key}`)

  return mapped
}

function sourceRef(sourceAnchor: string): Record<string, string> {
  return {
    sourceId,
    sourceVersion: excelSourceVersion,
    sourceAnchor,
  }
}

function nanokaSourceRef(sourceAnchor: string, dataPath: string): Record<string, string> {
  return {
    sourceId: "nanoka-zzz",
    sourceVersion: nanokaSourceVersion,
    sourceAnchor,
    dataPath,
  }
}

function guideSourceRef(sourceAnchor: string): Record<string, string> {
  return {
    sourceId: "zzz-data-introduction",
    sourceVersion: "2026-05-05",
    sourceAnchor,
  }
}

function buildAgentCandidates(workbook: XLSX.WorkBook) {
  const rows = rowsForSheet(workbook, "代理人属性")
  const headers = headerMap(rows[0] ?? [])
  const agents: Record<string, Record<string, unknown>> = {}

  for (const [agentId, spec] of Object.entries(agentSpecs)) {
    const rowIndex = rows.findIndex(row => row[1] === spec.excelId)
    if (rowIndex < 0)
      throw new Error(`Missing agent row for ${agentId} (${spec.excelId})`)

    const row = rows[rowIndex]!
    const rowNumber = rowIndex + 1
    const anchor = `代理人属性!A${rowNumber}:AF${rowNumber}`
    agents[agentId] = {
      agentId,
      sourceKey: String(spec.excelId),
      label: {
        zh: String(rowValue(row, headers, "代理人") ?? spec.zh),
        en: String(rowValue(row, headers, "Name") ?? spec.en),
      },
      attribute: mappedValue(attributeMap, rowValue(row, headers, "属性"), "agent attribute"),
      agentSpecialty: mappedValue(specialtyMap, rowValue(row, headers, "特性"), "agent specialty"),
      sourceAliases: agentId === "yanagi" ? ["柳", "月城柳", "Yanagi"] : [spec.zh, spec.en],
      sourceRefs: [sourceRef(anchor)],
      baseStatsByLevel: {
        "60": {
          maxHp: numberValue(rowValue(row, headers, "60级基础生命值"), `${agentId}.maxHp60`),
          attack: numberValue(rowValue(row, headers, "60级基础攻击力"), `${agentId}.attack60`),
          defense: numberValue(rowValue(row, headers, "60级基础防御力"), `${agentId}.defense60`),
        },
      },
      sourceShape: {
        workbookSheet: "代理人属性",
        rowNumber,
        range: anchor,
        excelId: spec.excelId,
      },
    }
  }

  return agents
}

function buildBangbooCandidates(workbook: XLSX.WorkBook) {
  const attrRows = rowsForSheet(workbook, "邦布属性")
  const attrHeaders = headerMap(attrRows[0] ?? [])
  const skillRows = rowsForSheet(workbook, "邦布技能")
  const skillHeaders = headerMap(skillRows[0] ?? [])
  const bangboos: Record<string, Record<string, unknown>> = {}
  const bangbooSkills: Record<string, Record<string, unknown>> = {}

  for (const [bangbooId, spec] of Object.entries(bangbooSpecs)) {
    const attrRowIndex = attrRows.findIndex(row => rowValue(row, attrHeaders, "中文名称") === spec.zh && rowValue(row, attrHeaders, "ID") === spec.excelId)
    if (attrRowIndex < 0)
      throw new Error(`Missing Bangboo row for ${spec.zh} (${spec.excelId})`)

    const attrRow = attrRows[attrRowIndex]!
    const attrRowNumber = attrRowIndex + 1
    const attrRange = `邦布属性!A${attrRowNumber}:T${attrRowNumber}`
    const skillRowEntries = skillRows
      .map((row, index) => ({ row, rowNumber: index + 1 }))
      .filter(entry => rowValue(entry.row, skillHeaders, "名称") === spec.zh)

    if (skillRowEntries.length !== 2)
      throw new Error(`Expected two Bangboo skill rows for ${spec.zh}, got ${skillRowEntries.length}`)

    const sourceRefs = [
      sourceRef(attrRange),
      ...skillRowEntries.map(entry => sourceRef(`邦布技能!A${entry.rowNumber}:H${entry.rowNumber}`)),
    ]
    const skillIds = skillRowEntries.map((entry) => {
      const label = String(rowValue(entry.row, skillHeaders, "技能") ?? "")
      const key = label.includes("连携技") ? "chain" : "active"
      return `${bangbooId}-${key}`
    })

    bangboos[bangbooId] = {
      id: bangbooId,
      sourceKey: String(spec.excelId),
      label: {
        zh: spec.zh,
        en: spec.en,
      },
      sourceRefs,
      baseStatsByLevel: {
        "60": {
          maxHp: numberValue(rowValue(attrRow, attrHeaders, "60级生命值"), `${bangbooId}.60级生命值`),
          attack: numberValue(rowValue(attrRow, attrHeaders, "60级攻击力"), `${bangbooId}.60级攻击力`),
          defense: numberValue(rowValue(attrRow, attrHeaders, "60级防御力"), `${bangbooId}.60级防御力`),
          impact: numberValue(rowValue(attrRow, attrHeaders, "冲击力"), `${bangbooId}.冲击力`),
          critRate: numberValue(rowValue(attrRow, attrHeaders, "60级暴击率"), `${bangbooId}.60级暴击率`),
          critDamage: numberValue(rowValue(attrRow, attrHeaders, "60级暴击伤害"), `${bangbooId}.60级暴击伤害`),
          anomalyMastery: numberValue(rowValue(attrRow, attrHeaders, "异常掌控"), `${bangbooId}.异常掌控`),
        },
      },
      skillIds,
      sourceAliases: [spec.zh, spec.en],
      sourceShape: {
        workbookSheet: "邦布属性",
        rowNumber: attrRowNumber,
        range: attrRange,
        excelId: spec.excelId,
      },
    }

    for (const entry of skillRowEntries) {
      const label = String(rowValue(entry.row, skillHeaders, "技能") ?? "")
      const key = label.includes("连携技") ? "chain" : "active"
      const tag = key === "chain" ? "chain" : "special"
      const skillId = `${bangbooId}-${key}`
      const sourceAnchor = `邦布技能!A${entry.rowNumber}:H${entry.rowNumber}`
      bangbooSkills[skillId] = {
        id: skillId,
        bangbooId,
        label: { zh: label },
        sourceRefs: [sourceRef(sourceAnchor)],
        tags: [tag],
        segments: [
          {
            id: `${skillId}-hit`,
            levelKey: "default",
            multiplier: numberValue(rowValue(entry.row, skillHeaders, "伤害倍率"), `${skillId}.伤害倍率`),
            multiplierGrowth: numberValue(rowValue(entry.row, skillHeaders, "伤害倍率成长"), `${skillId}.伤害倍率成长`),
            dazeMultiplier: numberValue(rowValue(entry.row, skillHeaders, "失衡倍率"), `${skillId}.失衡倍率`),
            dazeMultiplierGrowth: numberValue(rowValue(entry.row, skillHeaders, "失衡倍率成长"), `${skillId}.失衡倍率成长`),
            anomalyBuildup: numberValue(rowValue(entry.row, skillHeaders, "异常积蓄"), `${skillId}.异常积蓄`),
            sourceRefs: [sourceRef(sourceAnchor)],
          },
        ],
      }
    }
  }

  return { bangboos, bangbooSkills }
}

function buildTextCandidates(workbook: XLSX.WorkBook) {
  const coreRows = rowsForSheet(workbook, "代理人核心技描述")
  const skillRows = rowsForSheet(workbook, "代理人技能描述")

  function coreRow(excelId: number): { row: unknown[]; rowNumber: number } {
    const rowIndex = coreRows.findIndex(row => row[0] === excelId)
    if (rowIndex < 0)
      throw new Error(`Missing core passive row for ${excelId}`)
    return { row: coreRows[rowIndex]!, rowNumber: rowIndex + 1 }
  }

  function skillRow(agentZh: string, skillName: string): { row: unknown[]; rowNumber: number } {
    const rowIndex = skillRows.findIndex(row => row[0] === agentZh && row[1] === skillName)
    if (rowIndex < 0)
      throw new Error(`Missing skill description row for ${agentZh} / ${skillName}`)
    return { row: skillRows[rowIndex]!, rowNumber: rowIndex + 1 }
  }

  const nicoleCore = coreRow(1031)
  const yanagiCore = coreRow(1221)
  const yanagiEx = skillRow("柳", "强化特殊技：月华流转")
  const yanagiUltimate = skillRow("柳", "终结技：雷影天华")
  const yixuanCore = coreRow(1371)

  return [
    makeEffectCandidate({
      id: "nicole-defense-reduction",
      agentId: "nicole",
      goldenAnchors: ["G22"],
      sourceAnchor: `代理人核心技描述!D${nicoleCore.rowNumber}:J${nicoleCore.rowNumber}`,
      sourceText: normalizeSourceTexts(nicoleCore.row.slice(3, 10)),
      suggestedEffect: {
        effectTemplateId: "excel-core-passive-defense-reduction-v1",
        handlerId: "defense-reduction",
        bucket: "defenseZone",
        operation: "add",
        appliesTo: { kind: "enemy" },
        params: {
          valueByCorePassiveLevel: {
            "1": 0.2,
            "2": 0.25,
            "3": 0.3,
            "4": 0.34,
            "5": 0.36,
            "6": 0.38,
            "7": 0.4,
          },
          durationSeconds: 3.5,
        },
        requiresActivation: true,
      },
      unparsedReason: "ambiguousCondition",
      notes: [
        "Value pattern is deterministic, but V1 does not simulate whether Nicole's enhanced bullet/field is currently active.",
      ],
    }),
    makeEffectCandidate({
      id: "nicole-ether-damage-bonus",
      agentId: "nicole",
      goldenAnchors: ["G22"],
      sourceAnchor: `代理人核心技描述!K${nicoleCore.rowNumber}:L${nicoleCore.rowNumber}`,
      sourceText: normalizeSourceTexts(nicoleCore.row.slice(10, 12)),
      suggestedEffect: {
        effectTemplateId: "excel-extra-ability-conditional-ether-bonus-v1",
        handlerId: "damage-bonus",
        bucket: "damageBonusZone",
        operation: "add",
        appliesTo: { kind: "team", includeSelf: true },
        params: {
          value: 0.25,
          attribute: "ether",
          durationSeconds: 3.5,
        },
        requiresActivation: true,
      },
      unparsedReason: "ambiguousCondition",
      severity: "nonBlocking",
      releaseGateRequired: false,
      notes: [
        "Not required for the pure G22 defense-reduction replay path unless the fixture explicitly activates Nicole's extra ability.",
      ],
    }),
    makeEffectCandidate({
      id: "yanagi-disorder-boost",
      agentId: "yanagi",
      goldenAnchors: ["G23"],
      sourceAnchor: `代理人核心技描述!D${yanagiCore.rowNumber}:J${yanagiCore.rowNumber}`,
      sourceText: normalizeSourceTexts(yanagiCore.row.slice(3, 10)),
      suggestedEffect: {
        effectTemplateId: "excel-core-passive-disorder-boost-v1",
        handlerId: "anomaly-damage-bonus",
        bucket: "anomalyDamageBonusZone",
        operation: "add",
        appliesTo: { kind: "segment" },
        params: {
          disorderDamageMultiplierBonusByCorePassiveLevel: {
            "1": 1.25,
            "2": 1.45,
            "3": 1.66,
            "4": 1.88,
            "5": 2.08,
            "6": 2.3,
            "7": 2.5,
          },
          electricDamageBonusByCorePassiveLevel: {
            "1": 0.1,
            "2": 0.116,
            "3": 0.133,
            "4": 0.15,
            "5": 0.166,
            "6": 0.183,
            "7": 0.2,
          },
          durationSeconds: 15,
        },
        requiresActivation: true,
      },
      unparsedReason: "ambiguousCondition",
      notes: [
        "The source text depends on a prior EX Special activation and an active 15s window. V1 needs manual acceptance before compiling this into replay modifiers.",
      ],
    }),
    makeEffectCandidate({
      id: "yanagi-polarity-disorder-ex-special",
      agentId: "yanagi",
      goldenAnchors: ["G23"],
      sourceAnchor: `代理人技能描述!C${yanagiEx.rowNumber}`,
      sourceText: normalizeText(yanagiEx.row[2]),
      suggestedEffect: {
        effectTemplateId: "excel-yanagi-polarity-disorder-v1",
        handlerId: "polarity-disorder",
        operation: "set",
        appliesTo: { kind: "segment" },
        params: {
          skill: "强化特殊技：月华流转",
          originalDisorderDamageRatio: 0.15,
          anomalyProficiencyFormula: "5 + AvatarSkillLevel(1) * 2.25",
          clearsOriginalAnomaly: false,
        },
        requiresActivation: true,
      },
      unparsedReason: "unknownHandler",
      notes: [
        "Core supports polarityDisorder status in snapshots, but the text-to-snapshot/template handler is not deterministic yet.",
      ],
    }),
    makeEffectCandidate({
      id: "yanagi-polarity-disorder-ultimate",
      agentId: "yanagi",
      goldenAnchors: ["G23"],
      sourceAnchor: `代理人技能描述!C${yanagiUltimate.rowNumber}`,
      sourceText: normalizeText(yanagiUltimate.row[2]),
      suggestedEffect: {
        effectTemplateId: "excel-yanagi-polarity-disorder-v1",
        handlerId: "polarity-disorder",
        operation: "set",
        appliesTo: { kind: "segment" },
        params: {
          skill: "终结技：雷影天华",
          originalDisorderDamageRatio: 0.15,
          anomalyProficiencyFormula: "5 + AvatarSkillLevel(3) * 2.25",
          clearsOriginalAnomaly: false,
        },
        requiresActivation: true,
      },
      unparsedReason: "unknownHandler",
      severity: "nonBlocking",
      releaseGateRequired: false,
      notes: [
        "Kept as a source-text candidate for G23; not applied automatically in V1 replay.",
      ],
    }),
    makeEffectCandidate({
      id: "yixuan-sheer-core-passive",
      agentId: "yixuan",
      goldenAnchors: ["G21"],
      sourceAnchor: `代理人核心技描述!D${yixuanCore.rowNumber}:J${yixuanCore.rowNumber}`,
      sourceText: normalizeSourceTexts(yixuanCore.row.slice(3, 10)),
      suggestedEffect: {
        effectTemplateId: "excel-yixuan-sheer-force-v1",
        handlerId: "sheer-force-derived-panel",
        operation: "set",
        appliesTo: { kind: "self" },
        params: {
          sheerForcePerMaxHp: 0.1,
          damageType: "sheer",
          attribute: "auricInk",
        },
        requiresActivation: false,
      },
      unparsedReason: "unknownHandler",
      severity: "nonBlocking",
      releaseGateRequired: false,
      notes: [
        "The replay harness uses explicit snapshot panel.sheerForce for G21 until the cleaned resolver supports derived panel fields.",
      ],
    }),
  ]
}

function makeEffectCandidate(input: {
  id: string
  agentId: string
  goldenAnchors: string[]
  sourceAnchor: string
  sourceText: string
  suggestedEffect: Record<string, unknown>
  unparsedReason: "unknownHandler" | "ambiguousCondition"
  severity?: "blocking" | "nonBlocking"
  releaseGateRequired?: boolean
  notes: string[]
}) {
  const sourceTextHash = sha256(input.sourceText)
  const severity = input.severity ?? "blocking"
  return {
    effectId: input.id,
    agentId: input.agentId,
    goldenAnchors: input.goldenAnchors,
    sourceRefs: [sourceRef(input.sourceAnchor)],
    sourceText: input.sourceText,
    sourceTextHash,
    parserVersion,
    suggestedEffect: input.suggestedEffect,
    trustStatus: "requiresManualAcceptance",
    releaseGateRequired: input.releaseGateRequired ?? true,
    unparsedEffect: {
      id: input.id,
      severity,
      reason: input.unparsedReason,
      diagnosticKey: "ERR-DAT-005",
      sourceText: input.sourceText,
      sourceRefs: [sourceRef(input.sourceAnchor)],
      sourceTextHash,
      parserVersion,
    },
    notes: input.notes,
  }
}

function candidateById(candidates: ReturnType<typeof buildCandidates>, effectId: string) {
  const candidate = candidates.effectCandidates.find(effect => effect.effectId === effectId)
  if (candidate === undefined)
    throw new Error(`Missing effect candidate ${effectId}`)
  return candidate
}

function acceptedRecord(
  candidates: ReturnType<typeof buildCandidates>,
  effectId: string,
  acceptedMapping: Record<string, unknown>,
) {
  const candidate = candidateById(candidates, effectId)
  return {
    agentId: candidate.agentId,
    effectId,
    sourceId,
    sourceRefs: candidate.sourceRefs,
    sourceTextHash: candidate.sourceTextHash,
    parserVersion,
    ...manualAcceptance,
    acceptedMapping,
  }
}

function buildAcceptanceArtifacts(generatedAt: string, candidates: ReturnType<typeof buildCandidates>) {
  const nicoleDefenseReduction = acceptedRecord(candidates, "nicole-defense-reduction", {
    effectTemplateId: "excel-core-passive-defense-reduction-v1",
    handlerId: "defense-reduction",
    bucket: "defenseZone",
    appliesTo: { kind: "enemy" },
    params: {
      value: 0.4,
      corePassiveLevel: 7,
      durationSeconds: 3.5,
    },
    requiresActivation: true,
    activationModel: "snapshotActiveFlag",
    inactiveStateMustHaveNoEffect: true,
  })

  const yanagiDisorderBoost = acceptedRecord(candidates, "yanagi-disorder-boost", {
    effectTemplateId: "excel-core-passive-disorder-boost-v1",
    handlerId: "anomaly-damage-bonus",
    bucket: "anomalyDamageBonusZone",
    appliesTo: { kind: "segment" },
    params: {
      value: 2.5,
      corePassiveLevel: 7,
      durationSeconds: 15,
    },
    requiresActivation: true,
    activationModel: "snapshotActiveFlag",
    inactiveStateMustHaveNoEffect: true,
  })

  const yanagiPolarityDisorder = acceptedRecord(candidates, "yanagi-polarity-disorder-ex-special", {
    effectTemplateId: "excel-yanagi-polarity-disorder-v1",
    templateKind: "attackSegment.anomalyContribution.polarityDisorder",
    handlerId: "polarity-disorder-template",
    appliesTo: { kind: "segment" },
    params: {
      providerActorId: "yanagi",
      skillLevelKey: "special",
      originalDisorderDamageRatio: 0.15,
      anomalyProficiencyBasePercent: 5,
      anomalyProficiencyPerSkillLevelPercent: 2.25,
      clearsOriginalAnomaly: false,
    },
    supportedSkillLevels: Array.from({ length: 16 }, (_, index) => index + 1),
    requiresActivation: true,
    activationModel: "snapshotAttackSegmentTemplate",
  })

  return {
    nicole: {
      schemaVersion: "fairy-manual-acceptance-v1",
      parserVersion,
      generatedAt,
      agentId: "nicole",
      records: [nicoleDefenseReduction],
    },
    yanagi: {
      schemaVersion: "fairy-manual-acceptance-v1",
      parserVersion,
      generatedAt,
      agentId: "yanagi",
      records: [yanagiDisorderBoost, yanagiPolarityDisorder],
    },
  }
}

function buildCandidates(generatedAt: string) {
  const { workbook, workbookSha256, workbookVersion } = loadWorkbook()
  const bangbooCandidates = buildBangbooCandidates(workbook)
  return {
    schemaVersion: "fairy-v1-agent-source-candidates-v1",
    parserVersion,
    generatedAt,
    policy: {
      scope:
        "Minimal reader output for executable V1/V1.1 replay. It extracts Yixuan/Nicole/Yanagi identity and calculation-relevant source text candidates plus Penguinboo/Sharkboo/Plugboo numeric Bangboo rows for G24-G26.",
      formalDataPolicy:
        "Candidates are not trusted cleaned modifiers. Effects with trustStatus=requiresManualAcceptance must emit ERR-DAT-005 until an accepted record exists.",
      enemyPolicy:
        "No Excel enemy rows are read; V1 DA boss fields must come from buhflipexplode/Mihoyo DA source snapshots.",
    },
    source: {
      sourceId,
      parserVersion,
      workbook: {
        path: "data/source/excel/data.xlsx",
        sha256: workbookSha256,
        version: workbookVersion,
      },
    },
    agents: buildAgentCandidates(workbook),
    bangboos: bangbooCandidates.bangboos,
    bangbooSkills: bangbooCandidates.bangbooSkills,
    effectCandidates: buildTextCandidates(workbook),
  }
}

function loadBuhflipexplodeBoss() {
  const versions = readJson<Record<string, {
    versionEnemies: Array<{ id: string; type: number }>
    versionHPMult: number[]
    versionDazeMult: number[]
    versionAnomMult: number
  }>>(buhflipexplodeVersionsPath)
  const enemies = readJson<Record<string, {
    name: string
    baseHP: number[]
    baseDEF: number[]
    baseDaze: number[]
    baseAnom: number
    elementMult?: number[]
  }>>(buhflipexplodeEnemiesPath)
  const period = versions["2.7.3"]
  if (period === undefined)
    throw new Error("Missing buhflipexplode DA period 2.7.3")

  const slotIndex = 0
  const enemyId = period.versionEnemies[slotIndex]?.id
  if (enemyId === undefined)
    throw new Error("Missing buhflipexplode DA period 2.7.3 slot 0 enemy")
  const enemy = enemies[enemyId]
  if (enemy === undefined)
    throw new Error(`Missing buhflipexplode enemy ${enemyId}`)

  return {
    enemyId,
    sourceRefs: [
      {
        sourceId: "buhflipexplode-zzz-da",
        sourceVersion: "2026-05-05T0445Z",
        sourceAnchor: `da/da-versions.live.json#2.7.3.versionEnemies[${slotIndex}]`,
      },
      {
        sourceId: "buhflipexplode-zzz-da",
        sourceVersion: "2026-05-05T0445Z",
        sourceAnchor: `assets/zzz/enemies.live.json#${enemyId}`,
      },
    ],
    snapshot: {
      enemyId: `buhflipexplode:${enemyId}`,
      level: 60,
      rank: "boss",
      maxHp: enemy.baseHP[slotIndex]! * period.versionHPMult[slotIndex]!,
      baseDaze: enemy.baseDaze[slotIndex] * (period.versionDazeMult[slotIndex]! / 100),
      dazeCap: enemy.baseDaze[slotIndex] * (period.versionDazeMult[slotIndex]! / 100),
    },
  }
}

function loadExcelEnemy(name: string, indexId: number) {
  const { workbook } = loadWorkbook()
  const rows = rowsForSheet(workbook, "敌人属性")
  const headers = headerMap(rows[0] ?? [])
  const rowIndex = rows.findIndex(row =>
    String(rowValue(row, headers, "完整名称") ?? "") === name
    && Number(rowValue(row, headers, "IndexID")) === indexId,
  )
  if (rowIndex < 0)
    throw new Error(`Missing enemy row for ${name} (${indexId})`)

  const row = rows[rowIndex]!
  const rowNumber = rowIndex + 1
  const tags = String(rowValue(row, headers, "标签列表") ?? "")
  const rank = tags.includes("首领")
    ? "boss"
    : tags.includes("中体型")
      ? "elite"
      : "normal"

  return {
    enemyId: `excel:${indexId}`,
    sourceRefs: [sourceRef(`敌人属性!A${rowNumber}:AU${rowNumber}`)],
    defaultDazeRecoveryTime: numberValue(rowValue(row, headers, "默认失衡恢复时间"), `${name}.默认失衡恢复时间`),
    snapshot: {
      enemyId: `excel:${indexId}`,
      level: 70,
      rank,
      maxHp: numberValue(rowValue(row, headers, "70级最大生命值"), `${name}.70级最大生命值`),
      baseDaze: numberValue(rowValue(row, headers, "70级最大失衡值上限"), `${name}.70级最大失衡值上限`),
      dazeCap: numberValue(rowValue(row, headers, "70级最大失衡值上限"), `${name}.70级最大失衡值上限`),
      defense: numberValue(rowValue(row, headers, "60级及以上防御力"), `${name}.60级及以上防御力`),
      dazeRecoveryRate: numberValue(rowValue(row, headers, "基础失衡恢复速度"), `${name}.基础失衡恢复速度`),
    },
  }
}

function agentSnapshot(
  candidates: ReturnType<typeof buildCandidates>,
  agentId: "yixuan" | "nicole" | "yanagi",
  overrides: Record<string, unknown> = {},
) {
  const agent = candidates.agents[agentId] as {
    attribute: string
    agentSpecialty: string
    baseStatsByLevel: { "60": { maxHp: number; attack: number; defense: number } }
  }
  const baseStats = agent.baseStatsByLevel["60"]
  const basePanel = {
    attack: baseStats.attack,
    maxHp: baseStats.maxHp,
    defense: baseStats.defense,
    impact: agentId === "yanagi" ? 86 : agentId === "nicole" ? 88 : 93,
    critRate: 0,
    critDamage: 0.5,
    anomalyMastery: agentId === "yanagi" ? 112 : agentId === "nicole" ? 90 : 92,
    anomalyProficiency: agentId === "yanagi" ? 114 : agentId === "nicole" ? 93 : 90,
    sheerForce: agentId === "yixuan" ? baseStats.maxHp * 0.1 : undefined,
  }

  return {
    agentId,
    level: 60,
    agentSpecialty: agent.agentSpecialty,
    attribute: agent.attribute,
    panel: {
      ...basePanel,
      ...overrides,
    },
  }
}

function bangbooSnapshot(
  candidates: ReturnType<typeof buildCandidates>,
  bangbooId: keyof typeof bangbooSpecs,
) {
  const bangboo = candidates.bangboos[bangbooId] as {
    baseStatsByLevel: {
      "60": {
        maxHp: number
        attack: number
        defense: number
        impact: number
        critRate: number
        critDamage: number
        anomalyMastery: number
      }
    }
    sourceRefs: Array<Record<string, string>>
  }
  const baseStats = bangboo.baseStatsByLevel["60"]

  return {
    bangbooId,
    level: 60,
    panel: baseStats,
    fieldProvenance: {
      "panel.maxHp": { provenance: "data", source: bangboo.sourceRefs[0] },
      "panel.attack": { provenance: "data", source: bangboo.sourceRefs[0] },
      "panel.defense": { provenance: "data", source: bangboo.sourceRefs[0] },
      "panel.impact": { provenance: "data", source: bangboo.sourceRefs[0] },
      "panel.critRate": { provenance: "data", source: bangboo.sourceRefs[0] },
      "panel.critDamage": { provenance: "data", source: bangboo.sourceRefs[0] },
      "panel.anomalyMastery": { provenance: "data", source: bangboo.sourceRefs[0] },
    },
  }
}

function bangbooSkillSegment(
  candidates: ReturnType<typeof buildCandidates>,
  skillId: string,
  source: Record<string, string>,
) {
  const skill = candidates.bangbooSkills[skillId] as {
    tags: string[]
    segments: Array<{
      multiplier: number
      dazeMultiplier: number
      anomalyBuildup: number
    }>
  }
  const segment = skill.segments[0]
  if (segment === undefined)
    throw new Error(`Missing Bangboo skill segment for ${skillId}`)

  return {
    id: `${skillId}-segment`,
    actor: { kind: "bangboo" as const },
    attribute: "ice" as const,
    tags: skill.tags,
    damageType: "regular" as const,
    multiplier: segment.multiplier,
    baseDazeMultiplier: segment.dazeMultiplier,
    anomalyContribution: {
      status: "frozen" as const,
      buildup: segment.anomalyBuildup,
    },
    source,
  }
}

function baseSnapshot(candidates: ReturnType<typeof buildCandidates>, enemy: ReturnType<typeof loadBuhflipexplodeBoss>) {
  const yixuan = agentSnapshot(candidates, "yixuan", {
    attack: 1000,
    maxHp: 12000,
    defense: 600,
    impact: 120,
    sheerForce: 1000,
  })

  return {
    schemaVersion: "1.0.0",
    gameVersion: "ZZZ-2.7.3",
    ruleSetVersion: "rules-v0.1",
    dataVersion: "data-v0.1.0",
    sourceVersion: replaySourceVersion,
    team: [yixuan],
    activeActor: { agentId: "yixuan" },
    attackSegments: [
      {
        id: "seg-1",
        attribute: "ether",
        tags: ["basic"],
        damageType: "regular",
        multiplier: 1,
        source: sourceRef("代理人属性!A37:AF37"),
      },
    ],
    enemy: enemy.snapshot,
  }
}

function bucket(result: ReturnType<typeof calculate>, bucketId: string) {
  const found = result.buckets.find(item => item.bucketId === bucketId)
  if (found === undefined)
    throw new Error(`Missing bucket ${bucketId}`)
  return found
}

function trace(result: ReturnType<typeof calculate>, path: string) {
  const found = result.trace.find(item => item.path === path)
  if (found === undefined)
    throw new Error(`Missing trace ${path}`)
  return found
}

function assertClose(actual: number | undefined, expected: number, tolerance: number, label: string): void {
  if (actual === undefined || Math.abs(actual - expected) > tolerance)
    throw new Error(`${label}: expected ${expected}, got ${actual}`)
}

function runtimePanelValue(
  source: Record<string, any>,
  { baseKey, levelKey, growthKey, level = 60, promotionPhase = "6" }: {
    baseKey: string
    levelKey: string
    growthKey: string
    level?: number
    promotionPhase?: string
  },
): number {
  const base = numberValue(source.stats?.[baseKey], `stats.${baseKey}`)
  const levelBonus = numberValue(source.level?.[promotionPhase]?.[levelKey], `level.${promotionPhase}.${levelKey}`)
  const growth = numberValue(source.stats?.[growthKey], `stats.${growthKey}`)
  return Number((base + levelBonus + growth * (level - 1) / 10000).toFixed(8))
}

function yixuanNanokaProof() {
  const yixuan = readJson<Record<string, any>>(nanokaYixuanPath)
  if (yixuan.id !== 1371)
    throw new Error("G27 Yixuan nanoka source id drifted")
  const firstBasic = yixuan.skill?.basic?.description?.[4]?.param?.[0]?.param?.["1371001"]
  if (firstBasic === undefined)
    throw new Error("G27 Yixuan first basic param 1371001 is missing")

  const maxHp = runtimePanelValue(yixuan, { baseKey: "hp_max", levelKey: "hp_max", growthKey: "hp_growth" })
  return {
    sourceRefs: [
      nanokaSourceRef("data/source/raw/nanoka/zzz/2.8/zh/character/1371.json", "/id"),
      nanokaSourceRef("data/source/raw/nanoka/zzz/2.8/zh/character/1371.json", "/stats"),
      nanokaSourceRef("data/source/raw/nanoka/zzz/2.8/zh/character/1371.json", "/level/6"),
      nanokaSourceRef("data/source/raw/nanoka/zzz/2.8/zh/character/1371.json", "/skill/basic/description/4/param/0/param/1371001"),
    ],
    agent: {
      agentId: "yixuan",
      level: 60,
      agentSpecialty: "rupture",
      attribute: "auricInk",
      panel: {
        maxHp,
        attack: runtimePanelValue(yixuan, { baseKey: "attack", levelKey: "attack", growthKey: "attack_growth" }),
        defense: runtimePanelValue(yixuan, { baseKey: "defence", levelKey: "defence", growthKey: "defence_growth" }),
        impact: numberValue(yixuan.stats?.break_stun, "stats.break_stun"),
        critRate: numberValue(yixuan.stats?.crit, "stats.crit") / 10000,
        critDamage: numberValue(yixuan.stats?.crit_damage, "stats.crit_damage") / 10000,
        anomalyMastery: numberValue(yixuan.stats?.element_abnormal_power, "stats.element_abnormal_power"),
        anomalyProficiency: numberValue(yixuan.stats?.element_mystery, "stats.element_mystery"),
        sheerForce: Number((maxHp * 0.1).toFixed(8)),
        maxAdrenaline: numberValue(yixuan.stats?.rp_max, "stats.rp_max"),
        automaticAdrenalineAccumulation: numberValue(yixuan.stats?.rp_recover, "stats.rp_recover") / 100,
      },
    },
    firstBasic: {
      damageMultiplier: numberValue(firstBasic.damage_percentage, "skill.basic.description.4.param.0.param.1371001.damage_percentage") / 10000,
      dazeMultiplier: numberValue(firstBasic.stun_ratio, "skill.basic.description.4.param.0.param.1371001.stun_ratio") / 10000,
      resonanceRecovery: numberValue(firstBasic.fever_recovery, "skill.basic.description.4.param.0.param.1371001.fever_recovery") / 1000,
      adrenalineRecovery: numberValue(firstBasic.rp_recovery, "skill.basic.description.4.param.0.param.1371001.rp_recovery") / 10000,
    },
    rupture: {
      ruptureLevel: numberValue(yixuan.stats?.rbl, "stats.rbl"),
      ruptureCorrectionFactor: numberValue(yixuan.stats?.rbl_correction_factor, "stats.rbl_correction_factor") / 10000,
      ruptureProbability: numberValue(yixuan.stats?.rbl_probability, "stats.rbl_probability") / 10000,
    },
  }
}

function plugbooNanokaProof() {
  const plugboo = readJson<Record<string, any>>(nanokaPlugbooPath)
  if (plugboo.id !== 54008)
    throw new Error("G28 Plugboo nanoka source id drifted")
  const active = plugboo.skill_prop?.["5400801"]
  if (active === undefined)
    throw new Error("G28 Plugboo active skill prop 5400801 is missing")

  return {
    sourceRefs: [
      nanokaSourceRef("data/source/raw/nanoka/zzz/2.8/zh/bangboo/54008.json", "/id"),
      nanokaSourceRef("data/source/raw/nanoka/zzz/2.8/zh/bangboo/54008.json", "/stats"),
      nanokaSourceRef("data/source/raw/nanoka/zzz/2.8/zh/bangboo/54008.json", "/level/6"),
      nanokaSourceRef("data/source/raw/nanoka/zzz/2.8/zh/bangboo/54008.json", "/skill/a"),
      nanokaSourceRef("data/source/raw/nanoka/zzz/2.8/zh/bangboo/54008.json", "/skill_prop/5400801"),
    ],
    bangboo: {
      bangbooId: "plugboo",
      level: 60,
      panel: {
        maxHp: runtimePanelValue(plugboo, { baseKey: "hp_max", levelKey: "hp_max", growthKey: "hpupgrade" }),
        attack: runtimePanelValue(plugboo, { baseKey: "attack", levelKey: "attack", growthKey: "attack_upgrade" }),
        defense: runtimePanelValue(plugboo, { baseKey: "defence", levelKey: "defence", growthKey: "def_upgrade" }),
        impact: numberValue(plugboo.stats?.break_stun, "stats.break_stun"),
        critRate: numberValue(plugboo.stats?.crit, "stats.crit") / 10000,
        critDamage: numberValue(plugboo.stats?.crit_dmg, "stats.crit_dmg") / 10000,
        anomalyMastery: numberValue(plugboo.stats?.element_abnormal_power, "stats.element_abnormal_power"),
      },
    },
    activeSkill: {
      damageMultiplier: numberValue(active["1001"]?.main, "skill_prop.5400801.1001.main") / 10000,
      dazeMultiplier: numberValue(active["1002"]?.main, "skill_prop.5400801.1002.main") / 10000,
      anomalyBuildup: numberValue(active.element_accumulation_value, "skill_prop.5400801.element_accumulation_value") / 100,
      element: "electric" as const,
    },
  }
}

function defensePenetrationBreakpoint(
  snapshot: ReturnType<typeof baseSnapshot>,
  input: { basePenetrationRate?: number; addedPenetrationRate: number; defenseReduction?: number },
): number {
  const source = guideSourceRef("docs/reference/zzz-data-introduction.txt:121-123")
  const modifiers = input.defenseReduction === undefined
    ? []
    : [
        {
          id: "g04-defense-reduction",
          handlerId: "defense-reduction",
          params: { value: input.defenseReduction },
          appliesTo: { kind: "activeActor" },
          source,
        },
      ]

  const withPenetration = (penetrationRate: number) => calculate({
    ...snapshot,
    team: [
      {
        ...snapshot.team[0]!,
        panel: {
          ...snapshot.team[0]!.panel,
          penetrationRate,
        },
      },
    ],
    modifiers,
  })

  const baseline = withPenetration(input.basePenetrationRate ?? 0)
  const increased = withPenetration((input.basePenetrationRate ?? 0) + input.addedPenetrationRate)
  const penetrationGain = increased.summary.rawTotalDamage / baseline.summary.rawTotalDamage - 1
  return 0.3 / penetrationGain
}

function passedAnchor(id: string, sourceRefs: Array<Record<string, string>>, notes: string[] = []): AnchorReport {
  return { id, status: "passed", sourceRefs, notes }
}

function acceptanceRecordFor(
  artifacts: ReturnType<typeof buildAcceptanceArtifacts>,
  agentId: "nicole" | "yanagi",
  effectId: string,
) {
  const record = artifacts[agentId].records.find(item => item.effectId === effectId)
  if (record === undefined)
    throw new Error(`Missing ${agentId} acceptance record for ${effectId}`)
  return record
}

function firstSourceRef(record: ReturnType<typeof acceptanceRecordFor>): Record<string, string> {
  const source = record.sourceRefs[0]
  if (source === undefined)
    throw new Error(`Missing accepted source ref for ${record.effectId}`)
  return source
}

function nicoleDefenseReductionModifier(
  artifacts: ReturnType<typeof buildAcceptanceArtifacts>,
  active: boolean,
) {
  const record = acceptanceRecordFor(artifacts, "nicole", "nicole-defense-reduction")
  return {
    id: "nicole-defense-reduction",
    handlerId: "defense-reduction",
    bucket: "defenseZone",
    params: { value: 0.4 },
    appliesTo: { kind: "enemy" },
    active,
    source: firstSourceRef(record),
  }
}

function yanagiDisorderBoostModifier(
  artifacts: ReturnType<typeof buildAcceptanceArtifacts>,
  active: boolean,
) {
  const record = acceptanceRecordFor(artifacts, "yanagi", "yanagi-disorder-boost")
  return {
    id: "yanagi-disorder-boost",
    handlerId: "anomaly-damage-bonus",
    bucket: "anomalyDamageBonusZone",
    params: { value: 2.5 },
    appliesTo: { kind: "segment" },
    when: { field: "segment.damageType", op: "eq", value: "disorder" },
    active,
    source: firstSourceRef(record),
  }
}

function yanagiPolarityDisorderInput(artifacts: ReturnType<typeof buildAcceptanceArtifacts>) {
  const record = acceptanceRecordFor(artifacts, "yanagi", "yanagi-polarity-disorder-ex-special")
  return {
    providerActorId: "yanagi",
    skillLevelKey: "special",
    originalDisorderDamageRatio: 0.15,
    anomalyProficiencyBasePercent: 5,
    anomalyProficiencyPerSkillLevelPercent: 2.25,
    source: firstSourceRef(record),
  }
}

function buildReplayReport(generatedAt: string, candidates = buildCandidates(generatedAt)) {
  const acceptanceArtifacts = buildAcceptanceArtifacts(generatedAt, candidates)
  const enemy = loadBuhflipexplodeBoss()
  const snapshot = baseSnapshot(candidates, enemy)
  const anchors: AnchorReport[] = []

  {
    const result = calculate(snapshot)
    assertClose(bucket(result, "defenseZone").effectiveMultiplier, 0.454545, 0.00001, "G01 defenseZone")
    anchors.push(passedAnchor("G01", enemy.sourceRefs, ["Default boss defense multiplier replays against sourced DA slot 0 boss context."]))
  }

  {
    const result = calculate({
      ...snapshot,
      enemy: {
        ...snapshot.enemy,
        corruptedShield: { active: true, defenseMultiplier: 1.8 },
      },
    })
    assertClose(bucket(result, "defenseZone").effectiveMultiplier, 0.316456, 0.00001, "G02 corrupted shield defenseZone")
    anchors.push(passedAnchor("G02", enemy.sourceRefs, ["Corrupted-shield state uses the core 1.8x defense multiplier with sourced boss context."]))
  }

  {
    const result = calculate({
      ...snapshot,
      team: [
        {
          ...snapshot.team[0]!,
          panel: {
            ...snapshot.team[0]!.panel,
            critRate: 0.5,
            critDamage: 1,
          },
        },
      ],
      options: { resultMode: "expected" },
    })
    assertClose(result.summary.expectedDamage, result.summary.nonCritDamage * 1.5, 0.00001, "G03 expected crit")
    anchors.push(passedAnchor("G03", [sourceRef("代理人属性!A37:AF37")], ["Crit expected value uses 1 + critRate * critDamage."]))
  }

  {
    const guideRef = guideSourceRef("docs/reference/zzz-data-introduction.txt:121-123")
    assertClose(
      defensePenetrationBreakpoint(snapshot, { addedPenetrationRate: 0.24 }),
      1.9917,
      0.0005,
      "G04 default penetration breakpoint",
    )
    assertClose(
      defensePenetrationBreakpoint(snapshot, { addedPenetrationRate: 0.24, defenseReduction: 0.4 }),
      2.6861,
      0.0005,
      "G04 Nicole defense-reduction penetration breakpoint",
    )
    assertClose(
      defensePenetrationBreakpoint(snapshot, { basePenetrationRate: 0.3, addedPenetrationRate: 0.24 }),
      1.6167,
      0.0005,
      "G04 Rina penetration breakpoint",
    )
    anchors.push(passedAnchor("G04", [guideRef], [
      "Executable bucket-scan replay reproduces the guide's 199.17%, 268.61%, and 161.67% penetration-vs-damage-bonus breakpoints.",
    ]))
  }

  {
    const regular = calculate({
      ...snapshot,
      enemy: {
        ...snapshot.enemy,
        corruptedShield: { active: true, defenseMultiplier: 1.8 },
      },
    })
    const sheer = calculate({
      ...snapshot,
      attackSegments: [
        {
          ...snapshot.attackSegments[0]!,
          id: "seg-sheer",
          damageType: "sheer",
        },
      ],
      enemy: {
        ...snapshot.enemy,
        corruptedShield: { active: true, defenseMultiplier: 1.8 },
      },
    })
    assertClose(sheer.summary.rawTotalDamage / regular.summary.rawTotalDamage, 3.16, 0.005, "G05 sheer ratio")
    anchors.push(passedAnchor("G05", enemy.sourceRefs, ["Sheer damage skips defense while regular damage sees corrupted-shield defense."]))
  }

  {
    const regular = calculate(snapshot)
    const sheer = calculate({
      ...snapshot,
      attackSegments: [
        {
          ...snapshot.attackSegments[0]!,
          id: "seg-sheer",
          damageType: "sheer",
        },
      ],
    })
    assertClose(sheer.summary.rawTotalDamage / regular.summary.rawTotalDamage, 2.2, 0.005, "G06 sheer ratio")
    anchors.push(passedAnchor("G06", enemy.sourceRefs, ["Sheer vs default boss ratio replays with the same sourced boss context."]))
  }

  {
    const result = calculate({
      ...snapshot,
      team: [
        {
          ...snapshot.team[0]!,
          panel: {
            ...snapshot.team[0]!.panel,
            sheerForce: 10,
          },
        },
      ],
      attackSegments: [
        {
          ...snapshot.attackSegments[0]!,
          id: "seg-a",
          damageType: "sheer",
          multiplier: 0.11,
        },
        {
          ...snapshot.attackSegments[0]!,
          id: "seg-b",
          damageType: "sheer",
          multiplier: 0.11,
        },
      ],
    })
    if (result.summary.displayTotalDamage !== 4)
      throw new Error(`G07 display total expected 4, got ${result.summary.displayTotalDamage}`)
    anchors.push(passedAnchor("G07", [sourceRef("代理人属性!A37:AF37")], ["Two fractional segments ceil before summing."]))
  }

  {
    const result = calculate({
      ...snapshot,
      team: [
        {
          ...snapshot.team[0]!,
          panel: {
            ...snapshot.team[0]!.panel,
            anomalyMastery: 123.9,
          },
        },
      ],
      attackSegments: [
        {
          ...snapshot.attackSegments[0]!,
          id: "seg-anomaly-buildup",
          damageType: "anomaly",
          anomalyContribution: { status: "shock", buildup: 100 },
        },
      ],
    })
    if (result.attackSegments[0]?.anomalyBuildup !== 123)
      throw new Error(`G08 anomaly buildup expected 123, got ${result.attackSegments[0]?.anomalyBuildup}`)
    anchors.push(passedAnchor("G08", [sourceRef("代理人属性!A37:AF37")], ["Anomaly Mastery floors before buildup."]))
  }

  {
    const dazeCap = Number(snapshot.enemy.dazeCap)
    const result = calculate({
      ...snapshot,
      attackSegments: [
        {
          ...snapshot.attackSegments[0]!,
          id: "seg-daze-ratio",
          damageType: "daze",
          baseDazeMultiplier: (dazeCap * 0.12345) / Number(snapshot.team[0]!.panel.impact),
        },
      ],
    })
    assertClose(result.attackSegments[0]?.dazeValue, dazeCap * 0.12345, 0.00001, "G09 sourced DA daze value")
    assertClose(result.attackSegments[0]?.dazeRatioRaw, 12.345, 0.00001, "G09 daze ratio raw")
    if (result.attackSegments[0]?.dazeRatioDisplay !== 12)
      throw new Error(`G09 daze ratio display expected 12, got ${result.attackSegments[0]?.dazeRatioDisplay}`)
    if (trace(result, "attackSegments[0].dazeRatioDisplay").rounding?.mode !== "floorForDisplay")
      throw new Error("G09 missing floorForDisplay trace")
    anchors.push(passedAnchor("G09", enemy.sourceRefs, [
      "buhflipexplode DA baseDaze/versionDazeMult feeds enemy.dazeCap; replay asserts daze ratio display floors the percentage value.",
    ]))
  }

  {
    const frost = calculate({
      ...snapshot,
      team: [
        {
          ...snapshot.team[0]!,
          panel: {
            ...snapshot.team[0]!.panel,
            iceDamageBonus: 0.2,
            etherDamageBonus: 0.4,
          },
        },
      ],
      attackSegments: [
        {
          ...snapshot.attackSegments[0]!,
          id: "seg-frost",
          attribute: "frost",
        },
      ],
      enemy: {
        ...snapshot.enemy,
        resistance: { ice: 0.2, ether: 0.4 },
        anomalyBuildupResistance: { ice: 0.15, ether: 0.35 },
      },
    })
    const auric = calculate({
      ...snapshot,
      team: [
        {
          ...snapshot.team[0]!,
          panel: {
            ...snapshot.team[0]!.panel,
            iceDamageBonus: 0.2,
            etherDamageBonus: 0.4,
          },
        },
      ],
      attackSegments: [
        {
          ...snapshot.attackSegments[0]!,
          id: "seg-auric",
          attribute: "auricInk",
        },
      ],
      enemy: {
        ...snapshot.enemy,
        resistance: { ice: 0.2, ether: 0.4 },
        anomalyBuildupResistance: { ice: 0.15, ether: 0.35 },
      },
    })
    const frostBuildup = calculate({
      ...snapshot,
      team: [
        {
          ...snapshot.team[0]!,
          panel: {
            ...snapshot.team[0]!.panel,
            anomalyMastery: 100,
          },
        },
      ],
      attackSegments: [
        {
          ...snapshot.attackSegments[0]!,
          id: "seg-frost-buildup",
          attribute: "frost",
          damageType: "anomaly",
          anomalyContribution: { status: "frozen", buildup: 100 },
        },
      ],
      enemy: {
        ...snapshot.enemy,
        anomalyBuildupResistance: { ice: 0.15, ether: 0.35 },
      },
    })
    const auricBuildup = calculate({
      ...snapshot,
      team: [
        {
          ...snapshot.team[0]!,
          panel: {
            ...snapshot.team[0]!.panel,
            anomalyMastery: 100,
          },
        },
      ],
      attackSegments: [
        {
          ...snapshot.attackSegments[0]!,
          id: "seg-auric-buildup",
          attribute: "auricInk",
          damageType: "anomaly",
          anomalyContribution: { status: "corruption", buildup: 100 },
        },
      ],
      enemy: {
        ...snapshot.enemy,
        anomalyBuildupResistance: { ice: 0.15, ether: 0.35 },
      },
    })
    assertClose(bucket(frost, "resistanceZone").effectiveMultiplier, 0.8, 0.00001, "G10 frost resistance")
    assertClose(bucket(auric, "resistanceZone").effectiveMultiplier, 0.6, 0.00001, "G10 auric resistance")
    assertClose(frostBuildup.attackSegments[0]?.anomalyBuildup, 85, 0.00001, "G10 frost anomaly buildup resistance")
    assertClose(auricBuildup.attackSegments[0]?.anomalyBuildup, 65, 0.00001, "G10 auric anomaly buildup resistance")
    assertClose(bucket(frost, "damageBonusZone").effectiveMultiplier, 1.2, 0.00001, "G11 frost damage bonus")
    assertClose(bucket(auric, "damageBonusZone").effectiveMultiplier, 1.4, 0.00001, "G11 auric damage bonus")
    anchors.push(passedAnchor("G10", [sourceRef("代理人属性!A37:AF37")], [
      "Frost maps to Ice and Auric Ink maps to Ether for both resistanceZone and anomaly-buildup-resistance.",
    ]))
    anchors.push(passedAnchor("G11", [sourceRef("代理人属性!A37:AF37")], ["Frost/Auric use Ice/Ether damage-bonus panel fields."]))
  }

  {
    const result = calculate({
      ...snapshot,
      enemy: {
        ...snapshot.enemy,
        anomalyTriggerCounts: { assault: 2 },
      },
      attackSegments: [
        {
          ...snapshot.attackSegments[0]!,
          id: "seg-physical-anomaly",
          attribute: "physical",
          damageType: "anomaly",
          anomalyContribution: { status: "assault", buildup: 100 },
        },
      ],
    })
    assertClose(trace(result, "attackSegments[0].anomalyContribution.anomalyThreshold").rawValue as number, 3745.2, 0.1, "G12 anomaly threshold")
    anchors.push(passedAnchor("G12", enemy.sourceRefs, ["Boss trigger-count threshold and physical 1.2x multiplier replay from core constants."]))
  }

  {
    const guideRef = guideSourceRef("docs/reference/zzz-data-introduction.txt:247-250")
    const buildSegment = (
      enemyThresholdMultiplier: number,
      attribute: "electric" | "physical",
      id: string,
    ) => ({
      ...snapshot.attackSegments[0]!,
      id,
      attribute,
      damageType: "anomaly" as const,
      anomalyContribution: {
        status: attribute === "physical" ? "assault" as const : "shock" as const,
        buildup: 100,
        triggerCountBefore: 0,
        anomalyThresholdModifiers: [
          {
            id: "enemy-base-anomaly-threshold-up",
            multiplier: enemyThresholdMultiplier,
            source: guideRef,
          },
          {
            id: "deadly-assault-16-anomaly-threshold-up",
            multiplier: 1.1,
            source: guideRef,
          },
        ],
      },
    })
    const priest = calculate({
      ...snapshot,
      enemy: {
        ...snapshot.enemy,
        enemyId: "guide:corruption-priest",
      },
      attackSegments: [buildSegment(1.2, "electric", "seg-g13-priest")],
    })
    const priestPhysical = calculate({
      ...snapshot,
      enemy: {
        ...snapshot.enemy,
        enemyId: "guide:corruption-priest",
      },
      attackSegments: [buildSegment(1.2, "physical", "seg-g13-priest-physical")],
    })
    const pompey = calculate({
      ...snapshot,
      enemy: {
        ...snapshot.enemy,
        enemyId: "guide:notorious-pompey",
      },
      attackSegments: [buildSegment(1.1, "electric", "seg-g13-pompey")],
    })
    const pompeyPhysical = calculate({
      ...snapshot,
      enemy: {
        ...snapshot.enemy,
        enemyId: "guide:notorious-pompey",
      },
      attackSegments: [buildSegment(1.1, "physical", "seg-g13-pompey-physical")],
    })
    const priestTrace = trace(priest, "attackSegments[0].anomalyContribution.anomalyThreshold")
    const pompeyTrace = trace(pompey, "attackSegments[0].anomalyContribution.anomalyThreshold")
    assertClose(priestTrace.rawValue as number, 3960, 0.00001, "G13 priest anomaly threshold")
    assertClose(
      trace(priestPhysical, "attackSegments[0].anomalyContribution.anomalyThreshold").rawValue as number,
      4752,
      0.00001,
      "G13 priest physical anomaly threshold",
    )
    assertClose(pompeyTrace.rawValue as number, 3630, 0.00001, "G13 pompey anomaly threshold")
    assertClose(
      trace(pompeyPhysical, "attackSegments[0].anomalyContribution.anomalyThreshold").rawValue as number,
      4356,
      0.00001,
      "G13 pompey physical anomaly threshold",
    )
    assertClose((priestTrace.inputs?.anomalyThresholdMultiplier as number | undefined), 1.32, 0.00001, "G13 priest modifier product")
    assertClose((pompeyTrace.inputs?.anomalyThresholdMultiplier as number | undefined), 1.21, 0.00001, "G13 pompey modifier product")
    anchors.push(passedAnchor("G13", [guideRef], [
      "Sourced anomalyThresholdModifiers replay the guide's multiplicative composition: 2.0+ special enemies use 1.2x or 1.1x base threshold modifiers, then DA #16 applies another 1.1x.",
      "Replay asserts guide totals: corruption priest/ghost 3960 and 4752 physical; notorious Pompey 3630 and 4356 physical.",
    ]))
  }

  {
    const result = calculate({
      ...snapshot,
      team: [
        snapshot.team[0]!,
        agentSnapshot(candidates, "nicole", {
          attack: 2000,
          maxHp: 10000,
          impact: 80,
          anomalyProficiency: 300,
          anomalyMastery: 100,
        }),
      ],
      attackSegments: [
        {
          ...snapshot.attackSegments[0]!,
          id: "seg-virtual-anomaly",
          damageType: "anomaly",
          anomalyContribution: {
            status: "shock",
            buildup: 120,
            overflowBuildup: 20,
            contributors: [
              { actorId: "yixuan", buildup: 60, included: true },
              { actorId: "nicole", buildup: 60, included: true },
              { actorId: "bangboo-a", buildup: 60, included: false, excludedReason: "bangboo" },
            ],
          },
        },
      ],
    })
    const virtualTrace = trace(result, "attackSegments[0].anomalyContribution.virtualAgent")
    if (virtualTrace.displayValue !== "virtualAgent")
      throw new Error("G14 missing virtual agent trace")
    anchors.push(passedAnchor("G14", [sourceRef("代理人属性!A37:AF37"), sourceRef("代理人属性!A4:AF4")], ["Virtual contribution rows include Bangboo exclusion and overflow handling."]))
  }

  {
    const matrix = [
      ["burn", "fire", 2.5, "disorder-burn", 7],
      ["shock", "electric", 2, "disorder-shock", 7],
      ["corruption", "ether", 2.5, "disorder-corruption", 7.625],
      ["disorder", "auricInk", 2.5, "disorder-corruption", 7.625],
      ["frozen", "frost", 3, "disorder-frost", 8.25],
      ["frozen", "ice", 3, "disorder-physical-or-ice", 4.725],
      ["assault", "physical", 3, "disorder-physical-or-ice", 4.725],
      ["polarityDisorder", "electric", 4, "disorder-polarity", 1.425],
    ] as const
    for (const [status, attribute, remainingDurationSeconds, formulaId, multiplier] of matrix) {
      const result = calculate({
        ...snapshot,
        attackSegments: [
          {
            ...snapshot.attackSegments[0]!,
            id: `seg-${formulaId}`,
            attribute,
            damageType: "disorder",
            multiplier: status === "polarityDisorder" ? undefined : 1,
            anomalyContribution: { status, buildup: 100, remainingDurationSeconds },
          },
        ],
      })
      const disorderTrace = trace(result, "attackSegments[0].disorderFormulaId")
      if (disorderTrace.displayValue !== formulaId)
        throw new Error(`G15 expected ${formulaId}, got ${disorderTrace.displayValue}`)
      assertClose(disorderTrace.rawValue as number, multiplier, 0.00001, `G15 ${formulaId}`)
    }
    anchors.push(passedAnchor("G15", [sourceRef("代理人属性!A37:AF37")], ["All seven disorder formula paths replay, including polarity disorder."]))
  }

  {
    const result = calculate({
      ...snapshot,
      attackSegments: [
        {
          ...snapshot.attackSegments[0]!,
          id: "seg-shock-disorder",
          attribute: "electric",
          damageType: "disorder",
          anomalyContribution: {
            status: "shock",
            buildup: 100,
            remainingDurationSeconds: 5,
          },
        },
      ],
    })
    assertClose(bucket(result, "disorderDazeLevelZone").effectiveMultiplier, 1.45, 0.00001, "G16 disorder daze level")
    anchors.push(passedAnchor("G16", [sourceRef("代理人属性!A37:AF37")], ["Disorder daze-level zone uses formula actor level 60."]))
  }

  {
    const result = calculate({
      ...snapshot,
      manualEvents: [
        {
          id: "cleanse-1",
          kind: "corruptedShieldCleanse",
          basePath: "enemy.maxHp",
          trueDamageRule: "default15Percent",
          source: enemy.sourceRefs[0],
        },
      ],
    })
    assertClose(result.events?.[0]?.rawDamage, Number(snapshot.enemy.maxHp) * 0.15, 0.00001, "G17 cleanse true damage")
    anchors.push(passedAnchor("G17", enemy.sourceRefs, ["Corrupted shield cleanse uses sourced DA boss maxHp as event base."]))
  }

  {
    const greta = loadExcelEnemy("格莱特", 11301)
    const guideRef = guideSourceRef("docs/reference/zzz-data-introduction.txt:62-71")
    const result = calculate({
      ...snapshot,
      enemy: greta.snapshot,
      manualEvents: [
        {
          id: "greta-leg-part-break",
          kind: "partBreak",
          partId: "leg",
          partType: "engineering-machine-leg",
          basePath: "enemy.maxHp",
          multiplier: 0.05,
          trueDamageRule: "engineering-machine-part-break-5-percent-max-hp",
          source: guideRef,
        },
      ],
    })
    const event = result.events?.find(candidate => candidate.id === "greta-leg-part-break")
    assertClose(event?.baseValue, greta.snapshot.maxHp, 0.00001, "G18 part-break base HP")
    assertClose(event?.multiplier, 0.05, 0.00001, "G18 part-break multiplier")
    assertClose(event?.rawDamage, greta.snapshot.maxHp * 0.05, 0.00001, "G18 part-break true damage")
    assertClose(result.summary.trueDamage, greta.snapshot.maxHp * 0.05, 0.00001, "G18 summary true damage")
    anchors.push(passedAnchor("G18", [...greta.sourceRefs, guideRef], [
      "Part-break manual event uses sourced Greta level-70 max HP from Excel and the guide's 5% engineering-machine part-break true-damage multiplier.",
    ]))
  }

  {
    const mad = loadExcelEnemy("匪祸侵蚀体·凶心疯汉", 11521)
    const guideRef = guideSourceRef("docs/reference/zzz-data-introduction.txt:181-202")
    const result = calculate({
      ...snapshot,
      enemy: {
        ...mad.snapshot,
        dazeRecoveryModifiers: [
          {
            id: "hypnotic-watch-before-rework",
            value: 0.6,
            source: guideRef,
          },
          {
            id: "duel-t-cane-pre-catalyst",
            value: -0.09,
            source: guideRef,
          },
        ],
      },
    })
    const recoveryTrace = trace(result, "enemy.dazeRecoveryTime")
    const inputs = recoveryTrace.inputs as Record<string, unknown>
    assertClose(mad.snapshot.dazeRecoveryRate, 0.0769, 0.000001, "G19 base daze recovery rate")
    assertClose(mad.defaultDazeRecoveryTime, 13.0039, 0.0001, "G19 default daze recovery time")
    assertClose(inputs.dazeRecoveryRateMultiplier as number, 1.51, 0.000001, "G19 daze recovery modifier sum")
    assertClose(inputs.effectiveDazeRecoveryRate as number, 0.116119, 0.000001, "G19 effective daze recovery rate")
    assertClose(recoveryTrace.rawValue as number, 8.611857, 0.00001, "G19 daze recovery time")
    anchors.push(passedAnchor("G19", [...mad.sourceRefs, guideRef], [
      "Mad Psycho daze recovery uses Excel base 7.69%/s and guide §2.3.2 modifier composition (+60% -9%) to replay 11.61%/s and 8.61s.",
    ]))
  }

  {
    const hati = loadExcelEnemy("恶名·哈提", 11195)
    const guideRef = guideSourceRef("docs/reference/zzz-data-introduction.txt:181-202")
    const result = calculate({
      ...snapshot,
      enemy: {
        ...hati.snapshot,
        dazeRecoveryModifiers: [
          {
            id: "withered-garden-intensity",
            value: 1,
            source: guideRef,
          },
          {
            id: "duel-t-cane-post-catalyst",
            value: -0.13,
            source: guideRef,
          },
        ],
      },
    })
    const recoveryTrace = trace(result, "enemy.dazeRecoveryTime")
    const inputs = recoveryTrace.inputs as Record<string, unknown>
    assertClose(hati.snapshot.dazeRecoveryRate, 0.0833, 0.000001, "G20 base daze recovery rate")
    assertClose(hati.defaultDazeRecoveryTime, 12.0048, 0.0001, "G20 default daze recovery time")
    assertClose(inputs.dazeRecoveryRateMultiplier as number, 1.87, 0.000001, "G20 daze recovery modifier sum")
    assertClose(inputs.effectiveDazeRecoveryRate as number, 0.155771, 0.000001, "G20 effective daze recovery rate")
    assertClose(recoveryTrace.rawValue as number, 6.419683, 0.00001, "G20 daze recovery time")
    anchors.push(passedAnchor("G20", [...hati.sourceRefs, guideRef], [
      "Armored Hati daze recovery uses Excel base 8.33%/s and guide §2.3.2 modifier composition (+100% -13%) to replay 15.58%/s and 6.42s.",
      "The guide sentence has a denominator typo (`1/11.58%`) but its formula and final 6.42s result match 15.58%/s.",
    ]))
  }

  {
    const result = calculate({
      ...snapshot,
      attackSegments: [
        {
          ...snapshot.attackSegments[0]!,
          id: "seg-yixuan-sheer",
          damageType: "sheer",
        },
      ],
    })
    if (!result.trace.some(event => event.displayValue === "defenseSkipped"))
      throw new Error("G21 expected defenseSkipped trace")
    anchors.push(passedAnchor("G21", [sourceRef("代理人属性!A37:AF37")], ["One-agent Yixuan path has no teammate modifiers and keeps sheer defense skip."]))
  }

  {
    const nicoleRecord = acceptanceRecordFor(acceptanceArtifacts, "nicole", "nicole-defense-reduction")
    const team = [
      snapshot.team[0]!,
      agentSnapshot(candidates, "nicole", {
        attack: 2000,
        maxHp: 10000,
        impact: 80,
        anomalyProficiency: 300,
        anomalyMastery: 100,
      }),
    ]
    const inactive = calculate({
      ...snapshot,
      team,
      modifiers: [nicoleDefenseReductionModifier(acceptanceArtifacts, false)],
    })
    const active = calculate({
      ...snapshot,
      team,
      modifiers: [nicoleDefenseReductionModifier(acceptanceArtifacts, true)],
    })
    const inactiveModifier = inactive.modifiers.find(modifier => modifier.id === "nicole-defense-reduction")
    const activeModifier = active.modifiers.find(modifier => modifier.id === "nicole-defense-reduction")
    if (inactiveModifier?.active !== false || inactiveModifier.inactiveReason !== "inactive-flag")
      throw new Error("G22 inactive snapshot must keep Nicole defense reduction disabled")
    if (activeModifier?.active !== true)
      throw new Error("G22 active snapshot must apply Nicole defense reduction")
    assertClose(
      bucket(inactive, "defenseZone").effectiveMultiplier,
      bucket(calculate(snapshot), "defenseZone").effectiveMultiplier,
      0.00001,
      "G22 inactive defenseZone",
    )
    if (active.summary.rawTotalDamage <= inactive.summary.rawTotalDamage)
      throw new Error("G22 active Nicole defense reduction should increase damage over inactive snapshot")
    anchors.push(passedAnchor("G22", nicoleRecord.sourceRefs, [
      "Nicole defense reduction is manually accepted by lo-user and replayed as explicit inactive/active snapshot states.",
      "Inactive keeps the default defenseZone; active applies the 40% defense reduction from core passive level 7.",
    ]))
  }

  {
    const nicoleRecord = acceptanceRecordFor(acceptanceArtifacts, "nicole", "nicole-defense-reduction")
    const yanagiDisorderRecord = acceptanceRecordFor(acceptanceArtifacts, "yanagi", "yanagi-disorder-boost")
    const yanagiPolarityRecord = acceptanceRecordFor(acceptanceArtifacts, "yanagi", "yanagi-polarity-disorder-ex-special")
    const yanagi = agentSnapshot(candidates, "yanagi", {
      attack: 1600,
      maxHp: 10000,
      impact: 86,
      anomalyProficiency: 300,
      anomalyMastery: 112,
    })
    const team = [
      snapshot.team[0]!,
      agentSnapshot(candidates, "nicole", {
        attack: 2000,
        maxHp: 10000,
        impact: 80,
        anomalyProficiency: 300,
        anomalyMastery: 100,
      }),
      {
        ...yanagi,
        skillLevels: { special: 12 },
      },
    ]
    const polaritySegment = {
      ...snapshot.attackSegments[0]!,
      id: "seg-g23-polarity-disorder",
      attribute: "electric",
      damageType: "disorder",
      multiplier: undefined,
      anomalyContribution: {
        status: "polarityDisorder",
        buildup: 100,
        remainingDurationSeconds: 5,
        polarityDisorder: yanagiPolarityDisorderInput(acceptanceArtifacts),
        contributors: [
          { actorId: "yixuan", buildup: 40, included: true },
          { actorId: "nicole", buildup: 20, included: true },
          { actorId: "yanagi", buildup: 40, included: true },
        ],
      },
    } as const
    const inactive = calculate({
      ...snapshot,
      team,
      attackSegments: [polaritySegment],
      modifiers: [
        nicoleDefenseReductionModifier(acceptanceArtifacts, true),
        yanagiDisorderBoostModifier(acceptanceArtifacts, false),
      ],
    })
    const active = calculate({
      ...snapshot,
      team,
      attackSegments: [polaritySegment],
      modifiers: [
        nicoleDefenseReductionModifier(acceptanceArtifacts, true),
        yanagiDisorderBoostModifier(acceptanceArtifacts, true),
      ],
    })
    const inactiveModifier = inactive.modifiers.find(modifier => modifier.id === "yanagi-disorder-boost")
    const activeModifier = active.modifiers.find(modifier => modifier.id === "yanagi-disorder-boost")
    if (inactiveModifier?.active !== false || inactiveModifier.inactiveReason !== "inactive-flag")
      throw new Error("G23 inactive snapshot must keep Yanagi disorder boost disabled")
    if (activeModifier?.active !== true)
      throw new Error("G23 active snapshot must apply Yanagi disorder boost")
    if (active.summary.rawTotalDamage <= inactive.summary.rawTotalDamage)
      throw new Error("G23 active Yanagi disorder boost should increase damage over inactive snapshot")
    assertClose(
      trace(active, "attackSegments[0].polarityDisorderBaseDamageExtra").rawValue as number,
      96,
      0.00001,
      "G23 skill level 12 polarity extra",
    )

    for (let skillLevel = 1; skillLevel <= 16; skillLevel += 1) {
      const leveled = calculate({
        ...snapshot,
        team: [
          snapshot.team[0]!,
          team[1]!,
          {
            ...yanagi,
            skillLevels: { special: skillLevel },
          },
        ],
        attackSegments: [polaritySegment],
      })
      assertClose(
        trace(leveled, "attackSegments[0].polarityDisorderBaseDamageExtra").rawValue as number,
        300 * ((5 + skillLevel * 2.25) / 100),
        0.00001,
        `G23 polarity extra skill level ${skillLevel}`,
      )
    }

    anchors.push(passedAnchor("G23", [
      ...nicoleRecord.sourceRefs,
      ...yanagiDisorderRecord.sourceRefs,
      ...yanagiPolarityRecord.sourceRefs,
    ], [
      "Yanagi disorder boost is manually accepted by lo-user and replayed as explicit inactive/active snapshot states.",
      "Yanagi polarity-disorder EX Special template supports skill levels 1-16; level 12 yields 96 base-damage extra from 300 anomaly proficiency.",
      "Three-agent virtual contribution trace includes Yixuan, Nicole, and Yanagi.",
    ]))
  }

  {
    const penguinboo = candidates.bangboos.penguinboo as {
      sourceRefs: Array<Record<string, string>>
      baseStatsByLevel: { "60": { attack: number; impact: number; anomalyMastery: number } }
    }
    const activeSkill = candidates.bangbooSkills["penguinboo-active"] as {
      sourceRefs: Array<Record<string, string>>
      segments: Array<{ multiplier: number; dazeMultiplier: number; anomalyBuildup: number }>
    }
    const skillSegment = activeSkill.segments[0]
    if (skillSegment === undefined)
      throw new Error("G24 missing Penguinboo active skill segment")

    const result = calculate({
      ...snapshot,
      bangboo: bangbooSnapshot(candidates, "penguinboo"),
      attackSegments: [
        bangbooSkillSegment(candidates, "penguinboo-active", activeSkill.sourceRefs[0]!),
      ],
      enemy: {
        level: 60,
        rank: "boss",
        resistance: { ice: 0 },
        anomalyBuildupResistance: { ice: 0 },
      },
    })
    const segment = result.attackSegments[0]
    assertClose(segment?.baseDamage, 28634.762772, 0.000001, "G24 Penguinboo active base damage")
    assertClose(segment?.baseDaze, 243, 0.000001, "G24 Penguinboo active base daze")
    assertClose(segment?.dazeValue, 243, 0.000001, "G24 Penguinboo active daze value")
    assertClose(segment?.anomalyBuildup, 415.2, 0.000001, "G24 Penguinboo active anomaly buildup")
    assertClose(segment?.rawDamage, Number(segment?.nonCritDamage) * 1.5, 0.000001, "G24 Penguinboo crit expectation")
    assertClose(penguinboo.baseStatsByLevel["60"].attack * skillSegment.multiplier, 28634.762772, 0.000001, "G24 source attack x multiplier")
    assertClose(penguinboo.baseStatsByLevel["60"].impact * skillSegment.dazeMultiplier, 243, 0.000001, "G24 source impact x daze multiplier")
    assertClose(skillSegment.anomalyBuildup * Math.floor(penguinboo.baseStatsByLevel["60"].anomalyMastery) / 100, 415.2, 0.000001, "G24 source anomaly buildup")
    if (segment?.actorId !== "bangboo:penguinboo")
      throw new Error(`G24 expected Bangboo actor id bangboo:penguinboo, got ${segment?.actorId}`)
    if (!result.trace.some(event => event.displayValue === "bangbooActor"))
      throw new Error("G24 expected Bangboo formula actor trace")

    anchors.push(passedAnchor("G24", penguinboo.sourceRefs, [
      "Penguinboo active skill replays Excel-only numeric contribution: level-60 attack 6198.0006 × 4.62 = 28634.762772 base damage.",
      "Daze uses impact 90 × 2.7 = 243, and anomaly buildup uses 346 × floor(120)/100 = 415.2 before enemy resistance.",
      "Excel Path X has no element field; the fixture supplies an explicit neutral ice segment and zero ice resistance so the anchor asserts sourced panel/skill numerics, not inferred element semantics.",
    ]))
  }

  {
    const sharkboo = candidates.bangboos.sharkboo as {
      sourceRefs: Array<Record<string, string>>
      baseStatsByLevel: { "60": { attack: number; impact: number; anomalyMastery: number } }
    }
    const activeSkill = candidates.bangbooSkills["sharkboo-active"] as {
      sourceRefs: Array<Record<string, string>>
      segments: Array<{ multiplier: number; dazeMultiplier: number; anomalyBuildup: number }>
    }
    const skillSegment = activeSkill.segments[0]
    if (skillSegment === undefined)
      throw new Error("G25 missing Sharkboo active skill segment")

    const result = calculate({
      ...snapshot,
      bangboo: bangbooSnapshot(candidates, "sharkboo"),
      attackSegments: [
        bangbooSkillSegment(candidates, "sharkboo-active", activeSkill.sourceRefs[0]!),
      ],
      enemy: {
        level: 60,
        rank: "boss",
        resistance: { ice: 0 },
        anomalyBuildupResistance: { ice: 0 },
      },
    })
    const segment = result.attackSegments[0]
    assertClose(segment?.baseDamage, 30939.262464, 0.000001, "G25 Sharkboo active base damage")
    assertClose(segment?.baseDaze, 138.6, 0.000001, "G25 Sharkboo active base daze")
    assertClose(segment?.dazeValue, 138.6, 0.000001, "G25 Sharkboo active daze value")
    assertClose(segment?.anomalyBuildup, 237.6, 0.000001, "G25 Sharkboo active anomaly buildup")
    assertClose(segment?.rawDamage, Number(segment?.nonCritDamage) * 1.5, 0.000001, "G25 Sharkboo crit expectation")
    assertClose(sharkboo.baseStatsByLevel["60"].attack * skillSegment.multiplier, 30939.262464, 0.000001, "G25 source attack x multiplier")
    assertClose(sharkboo.baseStatsByLevel["60"].impact * skillSegment.dazeMultiplier, 138.6, 0.000001, "G25 source impact x daze multiplier")
    assertClose(skillSegment.anomalyBuildup * Math.floor(sharkboo.baseStatsByLevel["60"].anomalyMastery) / 100, 237.6, 0.000001, "G25 source anomaly buildup")
    if (segment?.actorId !== "bangboo:sharkboo")
      throw new Error(`G25 expected Bangboo actor id bangboo:sharkboo, got ${segment?.actorId}`)
    if (!result.trace.some(event => event.displayValue === "bangbooActor"))
      throw new Error("G25 expected Bangboo formula actor trace")

    anchors.push(passedAnchor("G25", sharkboo.sourceRefs, [
      "Sharkboo active skill replays Excel-only numeric contribution: level-60 attack 8057.0996 × 3.84 = 30939.262464 base damage.",
      "Daze uses impact 99 × 1.4 = 138.6, and anomaly buildup uses 180 × floor(132)/100 = 237.6 before enemy resistance.",
      "Excel Path X has no element field; the fixture reuses an explicit neutral ice segment and zero ice resistance so the anchor asserts sourced panel/skill numerics, not inferred element semantics.",
    ]))
  }

  {
    const plugboo = candidates.bangboos.plugboo as {
      sourceRefs: Array<Record<string, string>>
      baseStatsByLevel: { "60": { attack: number; impact: number; anomalyMastery: number } }
    }
    const activeSkill = candidates.bangbooSkills["plugboo-active"] as {
      sourceRefs: Array<Record<string, string>>
      segments: Array<{ multiplier: number; dazeMultiplier: number; anomalyBuildup: number }>
    }
    const skillSegment = activeSkill.segments[0]
    if (skillSegment === undefined)
      throw new Error("G26 missing Plugboo active skill segment")

    const result = calculate({
      ...snapshot,
      bangboo: bangbooSnapshot(candidates, "plugboo"),
      attackSegments: [
        bangbooSkillSegment(candidates, "plugboo-active", activeSkill.sourceRefs[0]!),
      ],
      enemy: {
        level: 60,
        rank: "boss",
        resistance: { ice: 0 },
        anomalyBuildupResistance: { ice: 0 },
      },
    })
    const segment = result.attackSegments[0]
    assertClose(segment?.baseDamage, 41252.349952, 0.000001, "G26 Plugboo active base damage")
    assertClose(segment?.baseDaze, 185.13, 0.000001, "G26 Plugboo active base daze")
    assertClose(segment?.dazeValue, 185.13, 0.000001, "G26 Plugboo active daze value")
    assertClose(segment?.anomalyBuildup, 316.8, 0.000001, "G26 Plugboo active anomaly buildup")
    assertClose(segment?.rawDamage, Number(segment?.nonCritDamage) * 1.5, 0.000001, "G26 Plugboo crit expectation")
    assertClose(plugboo.baseStatsByLevel["60"].attack * skillSegment.multiplier, 41252.349952, 0.000001, "G26 source attack x multiplier")
    assertClose(plugboo.baseStatsByLevel["60"].impact * skillSegment.dazeMultiplier, 185.13, 0.000001, "G26 source impact x daze multiplier")
    assertClose(skillSegment.anomalyBuildup * Math.floor(plugboo.baseStatsByLevel["60"].anomalyMastery) / 100, 316.8, 0.000001, "G26 source anomaly buildup")
    if (segment?.actorId !== "bangboo:plugboo")
      throw new Error(`G26 expected Bangboo actor id bangboo:plugboo, got ${segment?.actorId}`)
    if (!result.trace.some(event => event.displayValue === "bangbooActor"))
      throw new Error("G26 expected Bangboo formula actor trace")

    anchors.push(passedAnchor("G26", plugboo.sourceRefs, [
      "Plugboo active skill replays Excel-only numeric contribution: level-60 attack 8057.0996 × 5.12 = 41252.349952 base damage.",
      "Daze uses impact 99 × 1.87 = 185.13, and anomaly buildup uses 240 × floor(132)/100 = 316.8 before enemy resistance.",
      "Excel Path X has no element field; the fixture reuses an explicit neutral ice segment and zero ice resistance so the anchor asserts sourced panel/skill numerics, not inferred element semantics.",
    ]))
  }

  {
    const yixuan = yixuanNanokaProof()
    const result = calculate({
      ...snapshot,
      team: [yixuan.agent],
      activeActor: { agentId: "yixuan" },
      attackSegments: [
        {
          id: "g27-yixuan-basic-1",
          actor: { kind: "agent" as const, agentId: "yixuan" },
          attribute: "auricInk" as const,
          tags: ["basic"],
          damageType: "regular" as const,
          multiplier: yixuan.firstBasic.damageMultiplier,
          baseDazeMultiplier: yixuan.firstBasic.dazeMultiplier,
          source: yixuan.sourceRefs[3],
        },
      ],
      enemy: {
        level: 60,
        rank: "boss",
      },
    })
    const segment = result.attackSegments[0]
    assertClose(segment?.baseDamage, 399.6392584, 0.000001, "G27 Yixuan first basic base damage")
    assertClose(segment?.baseDaze, 26.598, 0.000001, "G27 Yixuan first basic base daze")
    assertClose(yixuan.agent.panel.attack * yixuan.firstBasic.damageMultiplier, 399.6392584, 0.000001, "G27 source attack x multiplier")
    assertClose(yixuan.agent.panel.impact * yixuan.firstBasic.dazeMultiplier, 26.598, 0.000001, "G27 source impact x daze multiplier")
    if (segment?.actorId !== "yixuan")
      throw new Error(`G27 expected agent actor id yixuan, got ${segment?.actorId}`)

    anchors.push(passedAnchor("G27", yixuan.sourceRefs, [
      "Yixuan new-source proof anchor now runs executable replay from approved-live nanoka: level-60 attack 872.5748 × first-basic 0.458 = 399.6392584 base damage.",
      "Daze uses impact 93 × 0.286 = 26.598, while resource proof binds maxAdrenaline 120, automaticAdrenalineAccumulation 2, resonanceRecovery 71.5, and adrenalineRecovery 0.52.",
      `Rupture fields are retained from nanoka raw evidence: level ${yixuan.rupture.ruptureLevel}, correction ${yixuan.rupture.ruptureCorrectionFactor}, probability ${yixuan.rupture.ruptureProbability}.`,
    ]))
  }

  {
    const plugboo = plugbooNanokaProof()
    const result = calculate({
      ...snapshot,
      bangboo: {
        ...plugboo.bangboo,
        fieldProvenance: {
          "panel.maxHp": { provenance: "data" as const, source: plugboo.sourceRefs[1] },
          "panel.attack": { provenance: "data" as const, source: plugboo.sourceRefs[1] },
          "panel.defense": { provenance: "data" as const, source: plugboo.sourceRefs[1] },
          "panel.impact": { provenance: "data" as const, source: plugboo.sourceRefs[1] },
          "panel.critRate": { provenance: "data" as const, source: plugboo.sourceRefs[1] },
          "panel.critDamage": { provenance: "data" as const, source: plugboo.sourceRefs[1] },
          "panel.anomalyMastery": { provenance: "data" as const, source: plugboo.sourceRefs[1] },
        },
      },
      attackSegments: [
        {
          id: "g28-plugboo-active",
          actor: { kind: "bangboo" as const, bangbooId: "plugboo" },
          attribute: plugboo.activeSkill.element,
          tags: ["special"],
          damageType: "regular" as const,
          multiplier: plugboo.activeSkill.damageMultiplier,
          baseDazeMultiplier: plugboo.activeSkill.dazeMultiplier,
          anomalyContribution: {
            status: "shock" as const,
            buildup: plugboo.activeSkill.anomalyBuildup,
          },
          source: plugboo.sourceRefs[4],
        },
      ],
      enemy: {
        level: 60,
        rank: "boss",
        resistance: { electric: 0 },
        anomalyBuildupResistance: { electric: 0 },
      },
    })
    const segment = result.attackSegments[0]
    assertClose(segment?.baseDamage, 41252.349952, 0.000001, "G28 Plugboo active base damage")
    assertClose(segment?.baseDaze, 185.13, 0.000001, "G28 Plugboo active base daze")
    assertClose(segment?.anomalyBuildup, 316.8, 0.000001, "G28 Plugboo active anomaly buildup")
    assertClose(plugboo.bangboo.panel.attack * plugboo.activeSkill.damageMultiplier, 41252.349952, 0.000001, "G28 source attack x multiplier")
    assertClose(plugboo.bangboo.panel.impact * plugboo.activeSkill.dazeMultiplier, 185.13, 0.000001, "G28 source impact x daze multiplier")
    assertClose(plugboo.activeSkill.anomalyBuildup * Math.floor(plugboo.bangboo.panel.anomalyMastery) / 100, 316.8, 0.000001, "G28 source anomaly buildup")
    if (segment?.actorId !== "bangboo:plugboo")
      throw new Error(`G28 expected Bangboo actor id bangboo:plugboo, got ${segment?.actorId}`)
    if (!result.trace.some(event => event.displayValue === "bangbooActor"))
      throw new Error("G28 expected Bangboo formula actor trace")

    anchors.push(passedAnchor("G28", plugboo.sourceRefs, [
      "Plugboo new-source proof anchor now runs executable replay from approved-live nanoka: level-60 attack 8057.0996 × active 5.12 = 41252.349952 base damage.",
      "Daze uses impact 99 × 1.87 = 185.13, anomaly buildup uses 240 × floor(132)/100 = 316.8, and skill text proves electric element.",
      "This duplicates the G26 Excel numeric entity with nanoka raw/source refs so Phase 4 release has both archived parity and runtime-primary proof.",
    ]))
  }

  for (const anchorId of deferredAnchorIds) {
    anchors.push({
      id: anchorId,
      status: "deferred",
      sourceRefs: [],
      notes: [
        "Deferred to V1.x by D-13; requires remaining non-DA enemy daze-recovery data expansion.",
      ],
    })
  }

  const v1Anchors = anchors.filter(anchor => v1AnchorIds.includes(anchor.id as (typeof v1AnchorIds)[number]))
  const blockingDiagnostics = v1Anchors.flatMap(anchor => anchor.diagnostics ?? []).length
  const summary = {
    v1AnchorCount: v1AnchorIds.length,
    passed: v1Anchors.filter(anchor => anchor.status === "passed").length,
    pendingHarness: v1Anchors.filter(anchor => anchor.status === "pendingHarness").length,
    blocked: v1Anchors.filter(anchor => anchor.status === "blocked").length,
    deferred: anchors.filter(anchor => anchor.status === "deferred").length,
    blockingDiagnostics,
    releaseReady: v1Anchors.every(anchor => anchor.status === "passed") && blockingDiagnostics === 0,
  }

  return {
    schemaVersion: "fairy-v1-golden-replay-report-v1",
    parserVersion,
    generatedAt,
    policy: {
      scope:
        "V0.1.0 true-data replay harness after Phase 4 cutover: all 28 anchors pass executable replay, including G27/G28 nanoka runtime-primary proof anchors.",
      releaseGate:
        "releaseReady becomes true only when all executable anchors pass replay and blockingDiagnostics is zero.",
      manualAcceptance:
        "G22/G23 use lo-user manual acceptance records tied to the sourceTextHash values in v1-agent-source-candidates.json; A/B effects are replayed as explicit inactive/active snapshot states, and C is skill-level parameterized.",
    },
    v1AnchorIds,
    deferredAnchorIds,
    summary,
    anchors,
  }
}

function assertArtifactsFresh(generatedAt: string): void {
  const expectedCandidates = buildCandidates(generatedAt)
  const expectedAcceptance = buildAcceptanceArtifacts(generatedAt, expectedCandidates)
  const expectedReport = buildReplayReport(generatedAt, expectedCandidates)
  const actualCandidates = readJson<unknown>(candidatePath)
  const actualNicoleAcceptance = readJson<unknown>(nicoleAcceptancePath)
  const actualYanagiAcceptance = readJson<unknown>(yanagiAcceptancePath)
  const actualReport = readJson<unknown>(replayReportPath)

  if (JSON.stringify(actualCandidates) !== JSON.stringify(expectedCandidates))
    throw new Error("V1 source candidates are stale; rerun pnpm --filter @randomplay/data audit:golden-v1")
  if (JSON.stringify(actualNicoleAcceptance) !== JSON.stringify(expectedAcceptance.nicole))
    throw new Error("Nicole acceptance artifact is stale; rerun pnpm --filter @randomplay/data audit:golden-v1")
  if (JSON.stringify(actualYanagiAcceptance) !== JSON.stringify(expectedAcceptance.yanagi))
    throw new Error("Yanagi acceptance artifact is stale; rerun pnpm --filter @randomplay/data audit:golden-v1")
  if (JSON.stringify(actualReport) !== JSON.stringify(expectedReport))
    throw new Error("V1 replay report is stale; rerun pnpm --filter @randomplay/data audit:golden-v1")
}

function auditCommand(flags: Record<string, string | true>): void {
  const generatedAt = String(flags["generated-at"] ?? new Date().toISOString())
  const candidates = buildCandidates(generatedAt)
  const acceptanceArtifacts = buildAcceptanceArtifacts(generatedAt, candidates)
  const report = buildReplayReport(generatedAt, candidates)
  writeJson(candidatePath, candidates)
  writeJson(nicoleAcceptancePath, acceptanceArtifacts.nicole)
  writeJson(yanagiAcceptancePath, acceptanceArtifacts.yanagi)
  writeJson(replayReportPath, report)
}

function verifyCommand(): void {
  if (!existsSync(candidatePath))
    throw new Error("Missing data/cleaned/audit/v1-agent-source-candidates.json; run audit:golden-v1 first")
  if (!existsSync(nicoleAcceptancePath))
    throw new Error("Missing data/cleaned/audit/nicole.acceptance.json; run audit:golden-v1 first")
  if (!existsSync(yanagiAcceptancePath))
    throw new Error("Missing data/cleaned/audit/yanagi.acceptance.json; run audit:golden-v1 first")
  if (!existsSync(replayReportPath))
    throw new Error("Missing data/cleaned/golden/v1-replay-report.json; run audit:golden-v1 first")

  const report = readJson<{ generatedAt: string; summary: { v1AnchorCount: number; blocked: number; pendingHarness: number; blockingDiagnostics: number; releaseReady: boolean } }>(replayReportPath)
  assertArtifactsFresh(report.generatedAt)
  if (report.summary.v1AnchorCount !== v1AnchorIds.length)
    throw new Error(`Expected ${v1AnchorIds.length} executable anchors, got ${report.summary.v1AnchorCount}`)
  if (report.summary.blocked !== 0)
    throw new Error(`Expected no blocked anchors after G22/G23 manual acceptance, got ${report.summary.blocked}`)
  if (report.summary.pendingHarness !== 0)
    throw new Error(`Expected no pending harness entries after G04/G09/G10 executable assertions, got ${report.summary.pendingHarness}`)
  if (report.summary.blockingDiagnostics !== 0)
    throw new Error(`Expected no blocking diagnostics after G22/G23 manual acceptance, got ${report.summary.blockingDiagnostics}`)
  if (report.summary.releaseReady !== true)
    throw new Error(`Expected golden replay releaseReady=true after all ${v1AnchorIds.length} executable anchors pass`)
}

async function main(): Promise<void> {
  const { command, flags } = parseArgs(process.argv.slice(2))
  if (command === "audit")
    auditCommand(flags)
  else if (command === "verify")
    verifyCommand()
  else
    throw new Error(`Unknown command: ${command}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
