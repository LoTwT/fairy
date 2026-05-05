export interface DistributionPolicy {
  rawSourceArchive: "versioned-in-git-not-packaged"
  publishedArtifacts: "cleaned-json-and-types-only"
}

export interface SourceManifestEntry {
  id: string
  kind: "excel" | "referenceGuide" | "rawHttpSnapshot"
  path: string
  sha256: string
  bytes: number
  receivedAt?: string
  fetchedAt?: string
  providedBy?: string
  attachmentId?: string
  metadataPath?: string
  distribution:
    | "raw-retained-not-packaged"
    | "reference-retained-not-packaged"
    | "cleaned-publishable"
  usage: string
}

export interface SourceManifest {
  schemaVersion: "source-manifest-v1"
  generatedAt: string
  distributionPolicy: DistributionPolicy
  sources: SourceManifestEntry[]
}
