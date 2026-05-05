import type { SourceDocument } from "@fairy/core"

export type DataSourceKind = Extract<
  SourceDocument["kind"],
  "excel" | "mihoyoWiki" | "thirdPartySite"
>

export type DataSourceStatus =
  | "awaitingFile"
  | "discoveryOnly"
  | "readyForAdapter"
  | "requiresReview"

export interface FetchPolicy {
  mode: "manualUpload" | "httpGet"
  maxRequestsPerMinute: number
  cacheRequired: boolean
  conditionalRequestsPreferred: boolean
  requiresUserAgent: boolean
}

export interface SourceComplianceNote {
  robotsTxt: "notApplicable" | "notFound" | "found" | "notChecked"
  termsStatus: "notApplicable" | "notFound" | "found" | "requiresHumanReview"
  redistribution: "privateUntilReviewed" | "cleanedDataOnly" | "requiresHumanReview"
  notes: readonly string[]
}

export interface DataSourceDescriptor {
  id: string
  kind: DataSourceKind
  label: string
  url?: string
  fileNameHint?: string
  status: DataSourceStatus
  formalDataReady: boolean
  parserTargets: readonly string[]
  sourceVersionStrategy: string
  discoveredAssets?: readonly string[]
  fetchPolicy: FetchPolicy
  compliance: SourceComplianceNote
}

export const dataSourceDescriptors = [
  {
    id: "lo-user-excel",
    kind: "excel",
    label: "lo-user provided ZZZ data workbook",
    fileNameHint: "pending-lo-user-upload.xlsx",
    status: "awaitingFile",
    formalDataReady: false,
    parserTargets: [
      "agent skill multipliers",
      "daze multipliers",
      "W-Engine passives",
      "Drive Disc set effects",
      "agent enhancement / potential activation fields",
    ],
    sourceVersionStrategy:
      "Use the workbook file hash plus any workbook-provided game version once the file is uploaded.",
    fetchPolicy: {
      mode: "manualUpload",
      maxRequestsPerMinute: 0,
      cacheRequired: true,
      conditionalRequestsPreferred: false,
      requiresUserAgent: false,
    },
    compliance: {
      robotsTxt: "notApplicable",
      termsStatus: "requiresHumanReview",
      redistribution: "privateUntilReviewed",
      notes: [
        "No Excel file is present in this PR.",
        "Formal data rows must not be typed by hand while the source workbook is pending.",
        "Keep the workbook outside public git unless lo-user confirms redistribution is allowed.",
      ],
    },
  },
  {
    id: "mihoyo-zzz-critical-assault",
    kind: "mihoyoWiki",
    label: "Mihoyo ZZZ wiki Critical Assault map",
    url: "https://baike.mihoyo.com/zzz/wiki/channel/map/13/108",
    status: "discoveryOnly",
    formalDataReady: false,
    parserTargets: [
      "critical assault stage list",
      "enemy identifiers",
      "official wiki source anchors",
    ],
    sourceVersionStrategy:
      "Use HTTP ETag/Last-Modified when present, otherwise hash the fetched HTML/API payload.",
    fetchPolicy: {
      mode: "httpGet",
      maxRequestsPerMinute: 12,
      cacheRequired: true,
      conditionalRequestsPreferred: true,
      requiresUserAgent: true,
    },
    compliance: {
      robotsTxt: "notFound",
      termsStatus: "requiresHumanReview",
      redistribution: "cleanedDataOnly",
      notes: [
        "robots.txt returned HTTP 404 on 2026-05-05.",
        "The target page returned HTTP 200 with cache-control max-age=300.",
        "Do not crawl authenticated or private APIs; use public wiki responses only.",
      ],
    },
  },
  {
    id: "buhflipexplode-zzz-da",
    kind: "thirdPartySite",
    label: "buhflipexplode Deadly Assault data",
    url: "https://www.buhflipexplode.org/zzz/da/",
    status: "discoveryOnly",
    formalDataReady: false,
    parserTargets: [
      "deadly assault version entries",
      "enemy HP/daze/anomaly multipliers",
      "boss buff metadata",
    ],
    sourceVersionStrategy:
      "Use the page ETag/Last-Modified plus hashes for da-versions.json, enemies.json, and buffs.json.",
    discoveredAssets: [
      "https://www.buhflipexplode.org/zzz/da/da-versions.json",
      "https://www.buhflipexplode.org/assets/zzz/enemies.json",
      "https://www.buhflipexplode.org/assets/zzz/buffs.json",
    ],
    fetchPolicy: {
      mode: "httpGet",
      maxRequestsPerMinute: 12,
      cacheRequired: true,
      conditionalRequestsPreferred: true,
      requiresUserAgent: true,
    },
    compliance: {
      robotsTxt: "notFound",
      termsStatus: "requiresHumanReview",
      redistribution: "requiresHumanReview",
      notes: [
        "robots.txt returned HTTP 404 on 2026-05-05.",
        "The site describes itself as fan-created and non-commercial.",
        "The about page links source code at https://github.com/spiritfxxxx/buhflipexplode-src.",
        "The source repository has a GPL-3.0 LICENSE for code, but data redistribution still needs review.",
        "The about page says most images/data are officially sourced from in-game and public fandoms.",
      ],
    },
  },
] as const satisfies readonly DataSourceDescriptor[]

export type DataSourceId = (typeof dataSourceDescriptors)[number]["id"]

export function getDataSourceDescriptor(id: string): DataSourceDescriptor {
  const descriptor = dataSourceDescriptors.find(source => source.id === id)
  if (descriptor === undefined)
    throw new Error(`Unknown data source descriptor: ${id}`)

  return descriptor
}
