import type {
  StaticBuildAgentCatalogEntry,
  StaticBuildCatalogEntry,
} from "./types.js"

export const supportedStaticBuildAgents = [
  {
    id: "1041",
    name: "「11号」",
    aliases: ["11号", "soldier 11", "soldier-11", "soldier11"],
    defaultAttribute: "Fire",
    defaultDamageType: "normal",
    profileId: "standard-normal",
  },
  {
    id: "1191",
    name: "艾莲",
    aliases: ["艾莲·乔", "ellen", "ellen joe"],
    defaultAttribute: "Ice",
    defaultDamageType: "normal",
    profileId: "standard-normal",
  },
  {
    id: "1201",
    name: "悠真",
    aliases: ["浅羽悠真", "浅羽 悠真", "harumasa", "asaba harumasa"],
    defaultAttribute: "Electric",
    defaultDamageType: "normal",
    profileId: "standard-normal",
  },
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
    id: "14104",
    name: "硫磺石",
    aliases: ["the brimstone", "brimstone"],
  },
  {
    id: "14119",
    name: "深海访客",
    aliases: ["deep sea visitor", "deep-sea visitor"],
  },
  {
    id: "14120",
    name: "残心青囊",
    aliases: ["zanshin herb case", "zanshin"],
  },
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
