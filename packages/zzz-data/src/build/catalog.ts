import type {
  StaticBuildAgentCatalogEntry,
  StaticBuildCatalogEntry,
  StaticBuildWEngineCatalogEntry,
} from "./types.js"
import agentsZh from "../../data/zh-CN/agents.json"
import wEnginesZh from "../../data/zh-CN/w-engines.json"
import { toAgentAttribute, toAgentSpecialty } from "../terms.js"

interface AgentListSourceItem {
  id: string
  slug: string
  name: string
  specialty: string
  attributes: string[]
}

interface WEngineListSourceItem {
  id: string
  slug: string
  name: string
  specialty: { id: string; name: string }
}

const supportedSpecialties = new Set(["Attack", "Rupture", "Anomaly"])

const agentAliasOverrides: Record<string, string[]> = {
  "1041": ["11号", "soldier11", "soldier 11"],
  "1091": ["hoshimi miyabi", "miyabi"],
  "1191": ["艾莲·乔", "ellen", "ellen joe"],
  "1201": ["浅羽悠真", "浅羽 悠真", "harumasa", "asaba harumasa"],
  "1181": ["grace", "grace howard"],
  "1171": ["burnice", "burnice white"],
  "1261": ["jane", "jane doe"],
  "1331": ["vivian"],
  "1321": ["伊芙琳·舒瓦利耶", "evelyn", "evelyn chevalier"],
  "1371": ["yixuan", "yi-xuan"],
  "1381": ["零号安比", "soldier 0 anby", "soldier0anby"],
}

const wEngineAliasOverrides: Record<string, string[]> = {
  "14119": ["deep sea visitor", "deep-sea visitor"],
  "14118": ["fusion compiler", "fusion-compiler"],
  "14117": ["flamemaker shaker", "flamemaker-shaker"],
  "14120": ["zanshin herb case", "zanshin"],
  "14109": ["weeping gemini", "weeping-gemini"],
  "14150": ["soul shell", "soul-shell"],
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
  .filter((item) =>
    supportedSpecialties.has(toAgentSpecialty(item.specialty) ?? ""),
  )
  .sort((left, right) => Number(left.id) - Number(right.id))

export const supportedStaticBuildAgents = supportedAgentSources.map((item) => {
  const defaultAttribute = toAgentAttribute(item.attributes[0])
  if (!defaultAttribute) {
    throw new RangeError(
      `Unsupported default attribute ${item.attributes[0]} for agentId=${item.id}`,
    )
  }

  const specialty = toAgentSpecialty(item.specialty)
  if (!specialty) {
    throw new RangeError(
      `Unsupported specialty ${item.specialty} for agentId=${item.id}`,
    )
  }

  const isRupture = specialty === "Rupture"
  const isAnomaly = specialty === "Anomaly"
  const profileId =
    item.id === "1371"
      ? "yixuan-sheer"
      : isRupture
        ? "standard-sheer"
        : isAnomaly
          ? "standard-anomaly"
          : "standard-normal"

  return {
    id: item.id,
    name: item.name,
    specialty,
    aliases: unique([
      compactNameAlias(item.name),
      ...slugAliases(item.slug),
      ...(agentAliasOverrides[item.id] ?? []),
    ]),
    defaultAttribute,
    defaultDamageType: isRupture ? "sheer" : isAnomaly ? "anomaly" : "normal",
    profileId,
  }
}) satisfies StaticBuildAgentCatalogEntry[]

export const supportedStaticBuildMatrixAgents =
  supportedStaticBuildAgents.filter(
    (item) =>
      item.defaultDamageType === "normal" || item.defaultDamageType === "sheer",
  )

export const supportedStaticBuildWEngines = (
  wEnginesZh as WEngineListSourceItem[]
)
  .map((item) => {
    const specialty = toAgentSpecialty(item.specialty.name)
    if (!specialty) return undefined
    return {
      ...item,
      specialty,
    }
  })
  .filter(
    (
      item,
    ): item is WEngineListSourceItem & {
      specialty: StaticBuildWEngineCatalogEntry["specialty"]
    } => Boolean(item && supportedSpecialties.has(item.specialty)),
  )
  .sort((left, right) => Number(left.id) - Number(right.id))
  .map((item) => ({
    id: item.id,
    name: item.name,
    specialty: item.specialty,
    aliases: unique([
      compactNameAlias(item.name),
      ...slugAliases(item.slug),
      ...(wEngineAliasOverrides[item.id] ?? []),
    ]),
  })) satisfies StaticBuildWEngineCatalogEntry[]

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
  {
    id: "31300",
    name: "自由蓝调",
    aliases: ["freedom blues", "freedom"],
  },
  {
    id: "32300",
    name: "混沌重金属",
    aliases: ["chaos metal", "chaos"],
  },
  {
    id: "31800",
    name: "混沌爵士",
    aliases: ["chaos jazz", "jazz"],
  },
] satisfies StaticBuildCatalogEntry[]

export function getStaticBuildAgent(
  id: string,
): StaticBuildAgentCatalogEntry | undefined {
  return supportedStaticBuildAgents.find((item) => item.id === id)
}

export function getStaticBuildWEngine(
  id: string | undefined,
): StaticBuildWEngineCatalogEntry | undefined {
  if (!id) return undefined
  return supportedStaticBuildWEngines.find((item) => item.id === id)
}

export function getCompatibleStaticBuildWEngines(
  specialty: StaticBuildAgentCatalogEntry["specialty"],
) {
  return supportedStaticBuildWEngines.filter(
    (item) => item.specialty === specialty,
  )
}

export function getStaticBuildDriveDisc(
  id: string,
): StaticBuildCatalogEntry | undefined {
  return supportedStaticBuildDriveDiscs.find((item) => item.id === id)
}
