import {
  sourceDocumentSchema,
  sourceRefSchema,
  type SourceDocument,
  type SourceRef,
} from "@fairy/core"
import type { DataSourceDescriptor } from "./sources"

export const DATA_SOURCE_SKELETON_PARSER_VERSION =
  "@fairy/data-source-skeleton-v0.1.0"

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
