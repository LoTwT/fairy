import type {
  StaticBuildAgentCatalogEntry,
  StaticBuildCatalogEntry,
} from "./types.js"

export const supportedStaticBuildAgents = [
  {
    id: "1241",
    name: "朱鸢",
    aliases: ["zhuyuan", "zhu-yuan"],
    defaultAttribute: "Ether",
    defaultDamageType: "normal",
    profileId: "standard-normal",
  },
  {
    id: "1321",
    name: "伊芙琳",
    aliases: ["伊芙琳·舒瓦利耶", "evelyn", "evelyn chevalier"],
    defaultAttribute: "Fire",
    defaultDamageType: "normal",
    profileId: "standard-normal",
  },
  {
    id: "1371",
    name: "仪玄",
    aliases: ["yixuan", "yi-xuan"],
    defaultAttribute: "Auric Ink",
    defaultDamageType: "sheer",
    profileId: "yixuan-sheer",
  },
] as const satisfies StaticBuildAgentCatalogEntry[]

export const supportedStaticBuildWEngines = [
  {
    id: "14124",
    name: "防暴者Ⅵ型",
    aliases: ["riot suppressor mark vi", "riot suppressor", "防暴者6型"],
  },
  {
    id: "14132",
    name: "心弦夜响",
    aliases: ["heartstring nocturne", "heartstring"],
  },
  {
    id: "14137",
    name: "青溟笼舍",
    aliases: ["qingming birdcage", "qingming cage"],
  },
] as const satisfies StaticBuildCatalogEntry[]

export const supportedStaticBuildDriveDiscs = [
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
] as const satisfies StaticBuildCatalogEntry[]

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
