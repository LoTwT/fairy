import {
  sourceDocumentSchema,
  sourceRefSchema,
  type SourceDocument,
  type SourceRef,
} from "@randomplay/core"
import type { ParsedSourceBatch, ParsedSourceRecord } from "./adapters"
import type { DataSourceDescriptor } from "./sources"

export const DATA_SOURCE_SKELETON_PARSER_VERSION =
  "@randomplay/data-source-skeleton-v0.1.0"

export interface BuildSourceDocumentOptions {
  sourceVersion: string
  parsedAt: string
  fetchedAt?: string
  parserVersion?: string
  gameVersion?: string
  fileName?: string
  licenseNote?: string
}

export interface BuildSourceRefOptions {
  sourceVersion?: string
  sourceAnchor?: string
  dataPath?: string
}

export interface SourceRegistryEntryForDocument {
  sourceId: string
  configuredLiveVersion: string
  fetchedAt?: string
  contentHash: string
  liveVersionRef?: string
  approvedLiveVersions?: readonly string[]
}

export function buildSourceDocument(
  descriptor: DataSourceDescriptor,
  options: BuildSourceDocumentOptions,
): SourceDocument {
  const candidate: Record<string, unknown> = {
    id: descriptor.id,
    kind: descriptor.kind,
    sourceVersion: options.sourceVersion,
    parsedAt: options.parsedAt,
    parserVersion:
      options.parserVersion ?? DATA_SOURCE_SKELETON_PARSER_VERSION,
  }

  if (descriptor.url !== undefined)
    candidate.url = descriptor.url
  if (options.fileName !== undefined)
    candidate.fileName = options.fileName
  if (options.gameVersion !== undefined)
    candidate.gameVersion = options.gameVersion
  if (options.fetchedAt !== undefined)
    candidate.fetchedAt = options.fetchedAt
  if (options.licenseNote !== undefined)
    candidate.licenseNote = options.licenseNote

  return sourceDocumentSchema.parse(candidate)
}

export function buildSourceDocumentFromRegistryEntry(
  descriptor: DataSourceDescriptor,
  registryEntry: SourceRegistryEntryForDocument,
  options: Omit<BuildSourceDocumentOptions, "fetchedAt" | "sourceVersion">,
): SourceDocument {
  if (registryEntry.sourceId !== descriptor.id)
    throw new Error(`source registry entry ${registryEntry.sourceId} does not match descriptor ${descriptor.id}`)
  if (!registryEntry.contentHash.startsWith("sha256:"))
    throw new Error(`${registryEntry.sourceId}: source registry contentHash must be sha256-prefixed`)
  if (
    registryEntry.liveVersionRef === "manifest.zzz.live"
    && !registryEntry.approvedLiveVersions?.includes(registryEntry.configuredLiveVersion)
  ) {
    throw new Error(`${registryEntry.sourceId}: approvedLiveVersions must include configuredLiveVersion`)
  }

  const sourceDocumentOptions: BuildSourceDocumentOptions = {
    ...options,
    sourceVersion: registryEntry.configuredLiveVersion,
  }

  if (registryEntry.fetchedAt !== undefined)
    sourceDocumentOptions.fetchedAt = registryEntry.fetchedAt
  if (descriptor.fileNameHint !== undefined)
    sourceDocumentOptions.fileName = descriptor.fileNameHint

  return buildSourceDocument(descriptor, sourceDocumentOptions)
}

export function buildSourceRef(
  descriptor: Pick<DataSourceDescriptor, "id">,
  options: BuildSourceRefOptions = {},
): SourceRef {
  const candidate: Record<string, unknown> = {
    sourceId: descriptor.id,
  }

  if (options.sourceVersion !== undefined)
    candidate.sourceVersion = options.sourceVersion
  if (options.sourceAnchor !== undefined)
    candidate.sourceAnchor = options.sourceAnchor
  if (options.dataPath !== undefined)
    candidate.dataPath = options.dataPath

  return sourceRefSchema.parse(candidate)
}

export function buildSourceRefForParsedRecord(
  batch: Pick<ParsedSourceBatch, "sourceId" | "sourceVersion">,
  record: Pick<ParsedSourceRecord, "id" | "sourceAnchor" | "dataPath">,
): SourceRef {
  if (record.sourceAnchor === undefined || record.sourceAnchor.length === 0)
    throw new Error(`${record.id}: sourceAnchor is required for SourceRef emission`)
  if (record.dataPath === undefined || record.dataPath.length === 0)
    throw new Error(`${record.id}: dataPath is required for SourceRef emission`)

  return sourceRefSchema.parse({
    sourceId: batch.sourceId,
    sourceVersion: batch.sourceVersion,
    sourceAnchor: record.sourceAnchor,
    dataPath: record.dataPath,
  })
}

export function buildSourceRefsForParsedBatch(
  batch: Pick<ParsedSourceBatch, "sourceId" | "sourceVersion" | "records">,
): SourceRef[] {
  return batch.records.map(record => buildSourceRefForParsedRecord(batch, record))
}
