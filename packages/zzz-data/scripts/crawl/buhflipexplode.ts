import type { CrawlTask } from "./shared.js"

const BASE_URL = "https://www.buhflipexplode.org"

export const tasks: CrawlTask[] = [
  {
    name: "en/buhflipexplode/shiyu-defense",
    url: `${BASE_URL}/zzz/sd/sd-versions.json`,
    extract: (_, html) => JSON.parse(html),
  },
  {
    name: "en/buhflipexplode/deadly-assault",
    url: `${BASE_URL}/zzz/da/da-versions.json`,
    extract: (_, html) => JSON.parse(html),
  },
  {
    name: "en/buhflipexplode/threshold-simulation",
    url: `${BASE_URL}/zzz/ts/ts-versions.json`,
    extract: (_, html) => JSON.parse(html),
  },
  {
    name: "en/buhflipexplode/enemies",
    url: `${BASE_URL}/assets/zzz/enemies.json`,
    extract: (_, html) => JSON.parse(html),
  },
  {
    name: "en/buhflipexplode/buffs",
    url: `${BASE_URL}/assets/zzz/buffs.json`,
    extract: (_, html) => JSON.parse(html),
  },
]
