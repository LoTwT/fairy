export type NanokaBangbooAttribute =
  | "fire"
  | "electric"
  | "ice"
  | "physical"
  | "ether"
  | "frost"
  | "auricInk"

export interface NanokaBangbooSkillLevelRaw {
  name?: unknown
  desc?: unknown
}

export interface NanokaBangbooSkillRaw {
  level?: Record<string, NanokaBangbooSkillLevelRaw>
}

export interface NanokaBangbooElementSource {
  id?: unknown
  skill?: Record<string, NanokaBangbooSkillRaw>
}

export interface NanokaBangbooElementEvidence {
  skillKey: string
  level: number
  sourceName: string
  rawLabel: string
  attribute: NanokaBangbooAttribute
  matchedText: string
  sourcePath: string
}

export interface NanokaBangbooElementArtifact {
  sourceVersion: string
  bangbooId: number
  attribute: NanokaBangbooAttribute
  evidence: NanokaBangbooElementEvidence[]
  runtimeCutoverReady: false
}

const attributeLabelMap: Record<string, NanokaBangbooAttribute> = {
  火: "fire",
  电: "electric",
  冰: "ice",
  物理: "physical",
  以太: "ether",
  烈霜: "frost",
  玄墨: "auricInk",
}

const damageAttributePattern = /造成[^。]*?(<color=[^>]+>(火|电|冰|物理|以太|烈霜|玄墨)属性伤害<\/color>)/g

export function deriveNanokaBangbooElement(
  source: NanokaBangbooElementSource,
  options: {
    sourceVersion: string
    bangbooId: number
  },
): NanokaBangbooElementArtifact {
  const sourceBangbooId = requiredFinite(source.id, "id")
  if (sourceBangbooId !== options.bangbooId)
    throw new Error(`nanoka Bangboo element id mismatch: source id ${sourceBangbooId} does not match requested Bangboo ${options.bangbooId}`)

  const skills = requiredObject(source.skill, "skill") as Record<string, NanokaBangbooSkillRaw>
  const evidence: NanokaBangbooElementEvidence[] = []

  for (const skillKey of Object.keys(skills).sort()) {
    const levels = requiredObject(skills[skillKey]?.level, `skill.${skillKey}.level`)
    for (const levelKey of sortedNumericKeys(levels, `skill.${skillKey}.level`)) {
      const level = levels[levelKey] as NanokaBangbooSkillLevelRaw
      const desc = requiredString(level.desc, `skill.${skillKey}.level.${levelKey}.desc`)
      const sourceName = requiredString(level.name, `skill.${skillKey}.level.${levelKey}.name`)

      for (const match of desc.matchAll(damageAttributePattern)) {
        const matchedText = match[1]
        const rawLabel = match[2]
        if (matchedText === undefined || rawLabel === undefined)
          continue

        evidence.push({
          skillKey,
          level: Number(levelKey),
          sourceName,
          rawLabel,
          attribute: mapAttributeLabel(rawLabel, `skill.${skillKey}.level.${levelKey}.desc`),
          matchedText,
          sourcePath: `/skill/${skillKey}/level/${levelKey}/desc`,
        })
      }
    }
  }

  if (evidence.length === 0)
    throw new Error("Missing nanoka Bangboo element damage text in skill descriptions")

  const attributes = new Set(evidence.map(item => item.attribute))
  if (attributes.size !== 1)
    throw new Error(`Conflicting nanoka Bangboo element evidence: ${[...attributes].join(", ")}`)

  return {
    sourceVersion: options.sourceVersion,
    bangbooId: options.bangbooId,
    attribute: evidence[0]!.attribute,
    evidence,
    runtimeCutoverReady: false,
  }
}

function mapAttributeLabel(value: string, path: string): NanokaBangbooAttribute {
  const attribute = attributeLabelMap[value]
  if (attribute === undefined)
    throw new Error(`Unmapped nanoka Bangboo element label ${value} at ${path}`)
  return attribute
}

function sortedNumericKeys(value: Record<string, unknown>, path: string): string[] {
  const keys = Object.keys(value)
  if (keys.length === 0)
    throw new Error(`Missing nanoka Bangboo level entries ${path}`)
  for (const key of keys) {
    if (!/^\d+$/.test(key))
      throw new Error(`Invalid numeric key ${path}.${key}`)
  }
  return keys.sort((left, right) => Number(left) - Number(right))
}

function requiredObject(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error(`Missing object nanoka Bangboo element field ${path}`)
  return value as Record<string, unknown>
}

function requiredString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0)
    throw new Error(`Missing text nanoka Bangboo element field ${path}`)
  return value
}

function requiredFinite(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error(`Missing numeric nanoka Bangboo element field ${path}`)
  return value
}
