import { parseGameData, type GameData, type SourceDocument } from "@randomplay/core"

export interface CreateEmptyGameDataOptions {
  gameVersion: string
  dataVersion: string
  sourceVersion: string
  generatedAt: string
  sources: readonly SourceDocument[]
  schemaVersion?: string
}

export function createEmptyGameData(
  options: CreateEmptyGameDataOptions,
): GameData {
  return parseGameData({
    schemaVersion: options.schemaVersion ?? "game-data-v1",
    gameVersion: options.gameVersion,
    dataVersion: options.dataVersion,
    sourceVersion: options.sourceVersion,
    generatedAt: options.generatedAt,
    sources: [...options.sources],
    agents: {},
    skills: {},
    bangboos: {},
    bangbooSkills: {},
    wEngines: {},
    driveDiscs: {},
    enemies: {},
    resonium: {},
    modifiers: {},
    rules: {},
    aliases: {
      fields: {},
      enumValues: {},
      sourceTerms: {},
    },
  })
}

export function assertDiscoveryOnlyGameData(gameData: GameData): void {
  const formalRecordCounts = {
    agents: Object.keys(gameData.agents).length,
    skills: Object.keys(gameData.skills).length,
    bangboos: Object.keys(gameData.bangboos).length,
    bangbooSkills: Object.keys(gameData.bangbooSkills).length,
    wEngines: Object.keys(gameData.wEngines).length,
    driveDiscs: Object.keys(gameData.driveDiscs).length,
    enemies: Object.keys(gameData.enemies).length,
    resonium: Object.keys(gameData.resonium).length,
    modifiers: Object.keys(gameData.modifiers).length,
    rules: Object.keys(gameData.rules).length,
    "aliases.fields": Object.keys(gameData.aliases.fields).length,
    "aliases.enumValues": Object.keys(gameData.aliases.enumValues).length,
    "aliases.sourceTerms": Object.keys(gameData.aliases.sourceTerms).length,
  }

  const populated = Object.entries(formalRecordCounts).filter(
    ([, count]) => count > 0,
  )

  if (populated.length > 0) {
    const details = populated
      .map(([name, count]) => `${name}=${count}`)
      .join(", ")
    throw new Error(`Discovery-only GameData must not contain formal data: ${details}`)
  }
}
