import type { GameData } from "@randomplay/core"

export type CleanedDataKind = "gameData" | "gameLabelI18n" | "sourceManifest"

export interface CleanedDataArtifact<TData = unknown> {
  kind: CleanedDataKind
  schemaVersion: string
  dataVersion: string
  generatedAt: string
  sourceManifestPath: string
  data: TData
}

export type CleanedGameDataArtifact = CleanedDataArtifact<GameData>
