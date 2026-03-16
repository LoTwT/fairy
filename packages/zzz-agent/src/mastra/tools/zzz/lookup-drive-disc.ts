import type { DriveDiscItem } from "zzz-data"
import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import { findBestMatch, findTopMatches, loadJson, stripHtml } from "./utils"

export type LookupDriveDiscQueryName = string

export type LookupDriveDiscLocale = "en" | "zh-CN"

export type LookupDriveDiscId = DriveDiscItem["id"]

export type LookupDriveDiscName = DriveDiscItem["name"]

export type LookupDriveDiscTag = string

export type LookupDriveDiscSetEffectPieces = number

export type LookupDriveDiscSetEffectBonus = string

export interface LookupDriveDiscSetEffect {
  pieces: LookupDriveDiscSetEffectPieces
  bonus: LookupDriveDiscSetEffectBonus
}

export type LookupDriveDiscSetEffectList = LookupDriveDiscSetEffect[]

export type LookupDriveDiscCandidateName = string

export interface LookupDriveDiscCandidate {
  name: LookupDriveDiscCandidateName
  tag: LookupDriveDiscTag
}

export type LookupDriveDiscCandidateList = LookupDriveDiscCandidate[]

export interface LookupDriveDiscListItemSummary {
  id: LookupDriveDiscId
  name: LookupDriveDiscName
  tag: LookupDriveDiscTag
}

export type LookupDriveDiscListItemSummaryList =
  LookupDriveDiscListItemSummary[]

export interface LookupDriveDiscTrimmedResult {
  id: LookupDriveDiscId
  name: LookupDriveDiscName
  tag: LookupDriveDiscTag
  setEffects: LookupDriveDiscSetEffectList
}

export const lookupDriveDisc = createTool({
  id: "lookup-drive-disc",
  description:
    "查询绝区零驱动盘套装效果（2件套和4件套）。不传 name 时返回所有驱动盘列表。",
  inputSchema: z.object({
    name: z
      .string()
      .optional()
      .describe("驱动盘名称（支持模糊匹配，中英文均可）。不传则返回列表"),
    locale: z
      .enum(["en", "zh-CN"])
      .optional()
      .default("zh-CN")
      .describe("数据语言"),
  }),
  execute: async (input) => {
    const {
      name,
      locale,
    }: { name?: LookupDriveDiscQueryName; locale: LookupDriveDiscLocale } =
      input
    const discs = loadJson<DriveDiscItem[]>(`data/${locale}/drive-discs.json`)

    // List mode: no name provided
    if (!name) {
      return {
        found: true,
        total: discs.length,
        driveDiscs: discs.map(
          (d) =>
            ({
              id: d.id,
              name: d.name,
              tag: d.tag,
            }) satisfies LookupDriveDiscListItemSummary,
        ),
      }
    }

    // Lookup mode
    const disc = findBestMatch(discs, name, [
      (d) => d.name,
      (d) => d.slug,
      (d) => d.tag,
    ])
    if (!disc) {
      const candidates = findTopMatches(
        discs,
        name,
        [(d) => d.name, (d) => d.slug, (d) => d.tag],
        3,
      )
      return {
        found: false,
        message: `未找到名称包含「${name}」的驱动盘`,
        candidates: candidates.map(
          (d) =>
            ({
              name: d.name,
              tag: d.tag,
            }) satisfies LookupDriveDiscCandidate,
        ),
      }
    }

    return {
      found: true,
      driveDisc: {
        id: disc.id,
        name: disc.name,
        tag: disc.tag,
        setEffects: disc.setEffects.map(
          (e) =>
            ({
              pieces: e.pieces,
              bonus: stripHtml(e.bonus),
            }) satisfies LookupDriveDiscSetEffect,
        ),
      } satisfies LookupDriveDiscTrimmedResult,
    }
  },
})
