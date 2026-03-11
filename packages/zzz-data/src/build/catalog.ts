import type {
  StaticBuildAgentCatalogEntry,
  StaticBuildCatalogEntry,
} from "./types.js"
import agentDetailsZh from "../../data/zh-CN/agent-details.json"
import agentsZh from "../../data/zh-CN/agents.json"
import { toAgentAttribute } from "../terms.js"

interface AgentListSourceItem {
  id: string
  slug: string
  name: string
  specialty: string
  attributes: string[]
}

interface AgentDetailSourceItem {
  id: string
  exclusiveWeapon?: {
    id: string
    slug: string
    name: string
  } | null
}

const supportedSpecialties = new Set(["强攻", "命破"])

const agentAliasOverrides: Record<string, string[]> = {
  "1041": ["11号", "soldier11", "soldier 11"],
  "1191": ["艾莲·乔", "ellen", "ellen joe"],
  "1201": ["浅羽悠真", "浅羽 悠真", "harumasa", "asaba harumasa"],
  "1321": ["伊芙琳·舒瓦利耶", "evelyn", "evelyn chevalier"],
  "1371": ["yixuan", "yi-xuan"],
  "1381": ["零号安比", "soldier 0 anby", "soldier0anby"],
}

const wEngineAliasOverrides: Record<string, string[]> = {
  "14119": ["deep sea visitor", "deep-sea visitor"],
  "14120": ["zanshin herb case", "zanshin"],
  "14124": ["riot suppressor mark vi", "riot suppressor", "防暴者6型"],
  "14132": ["heartstring nocturne", "heartstring"],
  "14137": ["qingming birdcage", "qingming cage"],
  "14152": ["serpentine seeker", "serpentine-seeker"],
}

function unique(values: Array<string | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
}

function compactNameAlias(name: string) {
  return name.replace(/[·・「」&\s]/g, "")
}

function slugAliases(slug: string) {
  return [slug, slug.replace(/-/g, " "), slug.replace(/-/g, "")]
}

const supportedAgentSources = (agentsZh as AgentListSourceItem[])
  .filter((item) => supportedSpecialties.has(item.specialty))
  .sort((left, right) => Number(left.id) - Number(right.id))

const detailByAgentId = new Map(
  (agentDetailsZh as AgentDetailSourceItem[]).map((item) => [item.id, item]),
)

export const supportedStaticBuildAgents = supportedAgentSources.map((item) => {
  const defaultAttribute = toAgentAttribute(item.attributes[0])
  if (!defaultAttribute) {
    throw new RangeError(
      `Unsupported default attribute ${item.attributes[0]} for agentId=${item.id}`,
    )
  }

  const isRupture = item.specialty === "命破"
  const profileId =
    item.id === "1371"
      ? "yixuan-sheer"
      : isRupture
        ? "standard-sheer"
        : "standard-normal"

  return {
    id: item.id,
    name: item.name,
    aliases: unique([
      compactNameAlias(item.name),
      ...slugAliases(item.slug),
      ...(agentAliasOverrides[item.id] ?? []),
    ]),
    defaultAttribute,
    defaultDamageType: isRupture ? "sheer" : "normal",
    profileId,
  }
}) satisfies StaticBuildAgentCatalogEntry[]

export const supportedStaticBuildWEngines = supportedAgentSources
  .map((agent) => detailByAgentId.get(agent.id)?.exclusiveWeapon)
  .filter(
    (item): item is NonNullable<AgentDetailSourceItem["exclusiveWeapon"]> =>
      Boolean(item?.id && item.name && item.slug),
  )
  .sort((left, right) => Number(left.id) - Number(right.id))
  .map((item) => ({
    id: item.id,
    name: item.name,
    aliases: unique([
      compactNameAlias(item.name),
      ...slugAliases(item.slug),
      ...(wEngineAliasOverrides[item.id] ?? []),
    ]),
  })) satisfies StaticBuildCatalogEntry[]

export const supportedStaticBuildDriveDiscs = [
  {
    id: "32200",
    name: "炎狱重金属",
    aliases: ["inferno metal", "inferno"],
  },
  {
    id: "32400",
    name: "雷暴重金属",
    aliases: ["thunder metal", "thunder"],
  },
  {
    id: "32500",
    name: "极地重金属",
    aliases: ["polar metal", "polar"],
  },
  {
    id: "31000",
    name: "啄木鸟电音",
    aliases: ["woodpecker electro", "woodpecker"],
  },
  {
    id: "31100",
    name: "河豚电音",
    aliases: ["puffer electro", "puffer"],
  },
  {
    id: "33100",
    name: "云岿如我",
    aliases: ["yunkui tales", "yunkui"],
  },
] satisfies StaticBuildCatalogEntry[]

export function getStaticBuildAgent(
  id: string,
): StaticBuildAgentCatalogEntry | undefined {
  return supportedStaticBuildAgents.find((item) => item.id === id)
}

export function getStaticBuildWEngine(
  id: string | undefined,
): StaticBuildCatalogEntry | undefined {
  if (!id) return undefined
  return supportedStaticBuildWEngines.find((item) => item.id === id)
}

export function getStaticBuildDriveDisc(
  id: string,
): StaticBuildCatalogEntry | undefined {
  return supportedStaticBuildDriveDiscs.find((item) => item.id === id)
}
