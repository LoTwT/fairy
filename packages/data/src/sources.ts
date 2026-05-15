import type { SourceDocument } from "@randomplay/core"

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
    id: "nanoka-zzz",
    kind: "thirdPartySite",
    label: "nanoka ZZZ static JSON",
    url: "https://static.nanoka.cc/manifest.json",
    status: "readyForAdapter",
    formalDataReady: false,
    parserTargets: [
      "agent and Bangboo base panel raw fields",
      "skill parameter tables",
      "Deadly Assault period / zone / buff / boss detail raw fields",
      "Adrenaline and Resonance recovery raw fields",
      "enemy monster_info variant mapping raw fields",
      "Phase 3 Nicole/Yanagi/Penguinboo/Sharkboo candidate coverage",
      "V1.2.x approved-live character batch index and details",
      "V1.2.x approved-live W-Engine batch index and details",
      "V1.2.x approved-live Drive Disc set index and details",
      "V1.2.x approved-live enemy index and details",
      "V1.2.x approved-live current Deadly Assault period index and details",
      "approved-live snapshot diff inputs",
    ],
    sourceVersionStrategy:
      "Resolve manifest.zzz.live, retain the configured live snapshot, and treat manifest.zzz.latest as research/drift only unless lo-user approves a version upgrade.",
    discoveredAssets: [
      "data/source/raw/nanoka/zzz/2.8/fetch-manifest.json",
      "data/source/raw/nanoka/zzz/2.8/manifest.json",
      "data/source/raw/nanoka/zzz/2.8/boss.json",
      "data/source/raw/nanoka/zzz/2.8/character.json",
      "data/source/raw/nanoka/zzz/2.8/weapon.json",
      "data/source/raw/nanoka/zzz/2.8/equipment.json",
      "data/source/raw/nanoka/zzz/2.8/monster.json",
      "data/source/raw/nanoka/zzz/2.8/zh/character/1021.json",
      "data/source/raw/nanoka/zzz/2.8/zh/character/1371.json",
      "data/source/raw/nanoka/zzz/2.8/zh/character/1031.json",
      "data/source/raw/nanoka/zzz/2.8/zh/character/1221.json",
      "data/source/raw/nanoka/zzz/2.8/zh/boss/69001.json",
      "data/source/raw/nanoka/zzz/2.8/zh/boss/69036.json",
      "data/source/raw/nanoka/zzz/2.8/zh/boss/69038.json",
      "data/source/raw/nanoka/zzz/2.8/zh/monster/30000.json",
      "data/source/raw/nanoka/zzz/2.8/zh/monster/30004.json",
      "data/source/raw/nanoka/zzz/2.8/zh/monster/200141.json",
      "data/source/raw/nanoka/zzz/2.8/zh/monster/200014.json",
      "data/source/raw/nanoka/zzz/2.8/zh/monster/200034.json",
      "data/source/raw/nanoka/zzz/2.8/zh/monster/30033.json",
      "data/source/raw/nanoka/zzz/2.8/zh/monster/300211.json",
      "data/source/raw/nanoka/zzz/2.8/zh/bangboo/53001.json",
      "data/source/raw/nanoka/zzz/2.8/zh/bangboo/54001.json",
      "data/source/raw/nanoka/zzz/2.8/zh/weapon/14137.json",
      "data/source/raw/nanoka/zzz/2.8/zh/equipment/31000.json",
      "data/source/raw/nanoka/zzz/historical-da-fetch-manifest.json",
    ],
    fetchPolicy: {
      mode: "httpGet",
      maxRequestsPerMinute: 30,
      cacheRequired: true,
      conditionalRequestsPreferred: true,
      requiresUserAgent: true,
    },
    compliance: {
      robotsTxt: "notChecked",
      termsStatus: "requiresHumanReview",
      redistribution: "cleanedDataOnly",
      notes: [
        "D-20 R1/R6 locks nanoka as the exclusive source for source-backed cleaned data.",
        "Release artifacts default to manifest.zzz.live; latest/pre-release snapshots are research-only unless lo-user approves a version upgrade.",
        "Phase 2 raw snapshot retention is for source-gate and adapter-skeleton verification only; runtime cutover waits for normalization, semantic mapping, and QA drift audit.",
        "V1.2.x PR-B promotes W-Engine identity and numeric level-60 attack/substat values; W-Engine passive talents remain typed-template pending.",
        "V1.2.x PR-C promotes Drive Disc set identity while retaining desc2/desc4 text in audit; typed set-effect modifiers remain template pending.",
        "V1.2.x PR-D promotes enemy identity/rank for all current-live monster index records while retaining selected/skipped monster_info variants and combat semantics in audit.",
        "V1.2.x PR-E promotes all 38 configured-live DA period details into GameData.deadlyAssaultPeriods.",
        "V1.2.x PR-F promotes manifest-available historical DA periods into GameData.historicalDAPeriods without making them current-runtime fallbacks.",
      ],
    },
  },
  {
    id: "lo-user-excel",
    kind: "excel",
    label: "lo-user provided ZZZ data workbook",
    fileNameHint: "data/source/excel/data.xlsx",
    status: "readyForAdapter",
    formalDataReady: false,
    parserTargets: [
      "agent skill multipliers",
      "daze multipliers",
      "W-Engine passives",
      "Drive Disc set effects",
      "agent enhancement / potential activation fields",
    ],
    sourceVersionStrategy:
      "Use the retained workbook hash plus the workbook-provided version marker from 首页!A1.",
    discoveredAssets: [
      "data/source/excel/data.xlsx",
      "data/source/excel/META.md",
      "data/source/excel/workbook-audit.json",
    ],
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
      redistribution: "cleanedDataOnly",
      notes: [
        "The workbook is retained in git under data/source/excel/ as a raw/source archive.",
        "The workbook and derived audit artifacts must not be published in the @randomplay/data package.",
        "Use workbook-audit.json for sheet/column discovery; do not infer typed modifiers from text without deterministic parser support or manual acceptance.",
      ],
    },
  },
  {
    id: "mihoyo-zzz-critical-assault",
    kind: "mihoyoWiki",
    label: "Mihoyo ZZZ wiki Critical Assault map",
    url: "https://baike.mihoyo.com/zzz/wiki/channel/map/13/108",
    status: "readyForAdapter",
    formalDataReady: false,
    parserTargets: [
      "Deadly Assault period list",
      "three selectable period buffs",
      "three boss room detail texts and challenge targets",
      "official Chinese labels and descriptions",
      "Mihoyo/buhflipexplode zh/en source-text anchors",
    ],
    sourceVersionStrategy:
      "Use the retained snapshot id plus fetch-manifest hashes for the channel and entry_page API payloads.",
    discoveredAssets: [
      "data/source/raw/mihoyo/zzz-da/2026-05-05T0850Z/channel-108/periods.json",
      "data/source/raw/mihoyo/zzz-da/2026-05-05T0850Z/parsed/period-details.json",
      "data/source/raw/mihoyo/zzz-da/2026-05-05T0850Z/alignment/mihoyo-buhflipexplode.json",
      "data/source/raw/mihoyo/zzz-da/2026-05-05T0850Z/fetch-manifest.json",
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
      redistribution: "cleanedDataOnly",
      notes: [
        "robots.txt returned HTTP 404 on 2026-05-05.",
        "The target page returned HTTP 200 with cache-control max-age=300.",
        "The rendered Nuxt page shell does not contain detail content; use public JSON API payloads and parse embedded rich-text HTML fragments.",
        "entry_page requests must include x-rpc-wiki_app: zzz to avoid cross-namespace content_id collisions.",
        "Do not crawl authenticated or private APIs; use public wiki responses only.",
      ],
    },
  },
  {
    id: "buhflipexplode-zzz-da",
    kind: "thirdPartySite",
    label: "buhflipexplode Deadly Assault data",
    url: "https://www.buhflipexplode.org/zzz/da/",
    status: "readyForAdapter",
    formalDataReady: false,
    parserTargets: [
      "deadly assault version entries",
      "enemy HP/daze/anomaly multipliers",
      "boss buff metadata",
      "Deadly Assault score / HP display algorithm evidence",
      "algorithm drift manifest",
    ],
    sourceVersionStrategy:
      "Use the accepted raw snapshot id plus fetch-manifest and algorithm-manifest hashes.",
    discoveredAssets: [
      "data/source/raw/buhflipexplode/2026-05-05T0445Z/da/da-versions.live.json",
      "data/source/raw/buhflipexplode/2026-05-05T0445Z/assets/zzz/enemies.live.json",
      "data/source/raw/buhflipexplode/2026-05-05T0445Z/assets/zzz/buffs.live.json",
      "data/source/raw/buhflipexplode/2026-05-05T0445Z/da/da.js",
      "data/source/raw/buhflipexplode/2026-05-05T0445Z/algorithm-manifest.json",
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
      redistribution: "cleanedDataOnly",
      notes: [
        "robots.txt returned HTTP 404 on 2026-05-05.",
        "The site describes itself as fan-created and non-commercial.",
        "The about page links source code at https://github.com/spiritfxxxx/buhflipexplode-src.",
        "The source repository has a GPL-3.0 LICENSE for code; do not copy GPL JS into Fairy runtime packages.",
        "The about page says most images/data are officially sourced from in-game and public fandoms.",
        "D-12 locks option B: retain GPL JS for audit only; runtime implementation must remain independent MIT code.",
        "Retained JSON payloads are filtered to live versions only; non-live / beta / leaks config is excluded.",
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
