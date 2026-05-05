import type { DataSourceDescriptor } from "./sources"

export interface SourceFetchContext {
  now: string
  cacheDir?: string
  userAgent?: string
}

export interface RawSourceFetchResult<TPayload = unknown> {
  sourceId: string
  sourceVersion: string
  fetchedAt: string
  payload: TPayload
  url?: string
  fileName?: string
  contentType?: string
}

export interface ParsedSourceRecord {
  id: string
  sourceAnchor?: string
  dataPath?: string
  raw: unknown
}

export interface ParsedSourceBatch {
  sourceId: string
  sourceVersion: string
  formalDataReady: boolean
  records: readonly ParsedSourceRecord[]
  notes: readonly string[]
}

export interface SourceAdapter<TPayload = unknown> {
  sourceId: string
  fetch(context: SourceFetchContext): Promise<RawSourceFetchResult<TPayload>>
  parse(
    raw: RawSourceFetchResult<TPayload>,
    context: SourceFetchContext,
  ): Promise<ParsedSourceBatch>
}

export function createDiscoveryOnlyAdapter(
  descriptor: DataSourceDescriptor,
): SourceAdapter<never> {
  return {
    sourceId: descriptor.id,
    async fetch() {
      throw new Error(
        `Data source ${descriptor.id} is discovery-only; implement a real fetcher after source review.`,
      )
    },
    async parse() {
      return {
        sourceId: descriptor.id,
        sourceVersion: "discovery-only",
        formalDataReady: false,
        records: [],
        notes: [
          "No formal data was parsed because this adapter is a skeleton.",
        ],
      }
    },
  }
}
