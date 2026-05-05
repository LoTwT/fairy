import { createHash } from "node:crypto"
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { load } from "cheerio"

const packageDir = fileURLToPath(new URL("..", import.meta.url))
const repoRoot = join(packageDir, "../..")
const sourceRoot = join(repoRoot, "data/source/raw/mihoyo/zzz-da")
const buhflipexplodeSnapshotRoot = join(
  repoRoot,
  "data/source/raw/buhflipexplode/2026-05-05T0445Z",
)
const sourceId = "mihoyo-zzz-critical-assault"
const parserVersion = "mihoyo-da-source-v0.1.0"
const userAgent = "fairy-data-source-audit/0.1 (+https://github.com/LoTwT/fairy)"
const channelApiUrl =
  "https://act-api-takumi-static.mihoyo.com/common/blackboard/zzz_wiki/v1/home/content/list?app_sn=zzz_wiki&channel_id=13"
const pageUrl = "https://baike.mihoyo.com/zzz/wiki/channel/map/13/108"
const entryPageUrl = contentId =>
  `https://act-api-takumi-static.mihoyo.com/hoyowiki/zzz/wapi/entry_page?app_sn=zzz_wiki&entry_page_id=${contentId}&lang=zh-cn`

const apiHeaders = {
  "User-Agent": userAgent,
  "Referer": "https://baike.mihoyo.com/",
  "x-rpc-wiki_app": "zzz",
}

const expectedDetailComponentIds = [
  "multi_table",
  "rich_row_base_info",
  "rich_row_base_info",
  "multi_table",
  "rich_row_base_info",
  "multi_table",
  "multi_table",
  "strategy",
  "multi_table",
]

const bossModulePairs = [
  { infoModuleIndex: 1, detailModuleIndex: 6 },
  { infoModuleIndex: 2, detailModuleIndex: 3 },
  { infoModuleIndex: 4, detailModuleIndex: 5 },
]

const zzzElements = ["物理属性", "火属性", "冰属性", "电属性", "以太属性"]

function parseArgs(argv) {
  const [command, ...rest] = argv
  const flags = {}

  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i]
    if (!token.startsWith("--"))
      throw new Error(`Unexpected positional argument: ${token}`)
    const key = token.slice(2)
    const next = rest[i + 1]
    if (next === undefined || next.startsWith("--")) {
      flags[key] = true
    }
    else {
      flags[key] = next
      i += 1
    }
  }

  return { command: command ?? "verify", flags }
}

function sha256(bufferOrString) {
  return createHash("sha256").update(bufferOrString).digest("hex")
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"))
}

function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`)
}

function normalizeText(value) {
  return value
    .replace(/\u00A0/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function loadFragment(html) {
  const $ = load(`<body>${html}</body>`, { decodeEntities: true })
  $("br").replaceWith("\n")
  return $
}

function textFromHtml(html) {
  const $ = loadFragment(html)
  return normalizeText($("body").text())
}

function blockTextsFromHtml(html) {
  const $ = loadFragment(html)
  const liTexts = $("li")
    .toArray()
    .map(element => normalizeText($(element).text()))
    .filter(Boolean)
  if (liTexts.length > 0)
    return liTexts

  const paragraphTexts = $("p")
    .toArray()
    .map(element => normalizeText($(element).text()))
    .filter(Boolean)
  if (paragraphTexts.length > 0)
    return paragraphTexts

  const text = normalizeText($("body").text())
  return text.length > 0 ? [text] : []
}

function firstImageUrl(html, width) {
  const $ = loadFragment(html)
  const image = $(`[data-image-url][data-image-width="${width}"]`).first()
  return image.attr("data-image-url") ?? undefined
}

function extractContentIdFromHref(href) {
  const match = href.match(/\/wiki\/content\/(\d+)\/detail/)
  return match?.[1]
}

function extractElements(line) {
  return zzzElements.filter(element => line.includes(element))
}

function parseBuffTable(component, periodAnchor) {
  const data = JSON.parse(component.data)
  const table = data.tables?.[0]
  if (table === undefined)
    throw new Error(`${periodAnchor}: missing current buff table`)
  if (JSON.stringify(table.header) !== JSON.stringify(["增益名称", "增益效果"]))
    throw new Error(`${periodAnchor}: current buff table header drifted`)

  return table.row.map((row, slotIndex) => {
    const [nameHtml, effectHtml] = row
    const name = textFromHtml(nameHtml)
    const effectTexts = blockTextsFromHtml(effectHtml)

    return {
      slotIndex,
      name,
      iconUrl: firstImageUrl(nameHtml, "100"),
      effectTexts,
      sourceTextHash: sha256(effectHtml),
      sourceAnchor: `${periodAnchor}.modules[0].components[0].data.tables[0].row[${slotIndex}]`,
    }
  })
}

function parseBossInfo(component, periodAnchor, moduleIndex, slotIndex) {
  const data = JSON.parse(component.data)
  const html = data.rich_text
  if (typeof html !== "string")
    throw new Error(`${periodAnchor}: missing boss info rich text at module ${moduleIndex}`)

  const $ = loadFragment(html)
  const lines = blockTextsFromHtml(html)
  const name = lines[0]
  const link = $("a[href*='/wiki/content/']").first()
  const href = link.attr("href") ?? ""
  const weaknessLine = lines.find(line => line.startsWith("敌人弱点：")) ?? ""
  const resistanceLine = lines.find(line => line.startsWith("敌人抗性：")) ?? ""

  return {
    slotIndex,
    name,
    mihoyoEnemyContentId: extractContentIdFromHref(href),
    mihoyoEnemyUrl: href.length > 0 ? href : undefined,
    imageUrl: firstImageUrl(html, "500"),
    weaknesses: extractElements(weaknessLine),
    resistances: extractElements(resistanceLine),
    sourceTextHash: sha256(html),
    sourceAnchor: `${periodAnchor}.modules[${moduleIndex}].components[0].data.rich_text`,
  }
}

function parseBossDetail(component, periodAnchor, moduleIndex, slotIndex) {
  const data = JSON.parse(component.data)
  const table = data.tables?.[0]
  if (table === undefined)
    throw new Error(`${periodAnchor}: missing boss detail table at module ${moduleIndex}`)
  if (table.header !== undefined && JSON.stringify(table.header) !== JSON.stringify(["敌情详解"]))
    throw new Error(`${periodAnchor}: boss detail header drifted at module ${moduleIndex}`)

  const detailHtml = table.row?.[0]?.[0]
  const challengeHtml = table.row?.[1]?.[0]
  if (typeof detailHtml !== "string")
    throw new Error(`${periodAnchor}: missing boss detail row at module ${moduleIndex}`)

  const detailTexts = blockTextsFromHtml(detailHtml)
  const challengeTargetTexts = typeof challengeHtml === "string"
    ? blockTextsFromHtml(challengeHtml)
    : []
  const performanceTexts = detailTexts.filter(text =>
    /操作得分|得分|Performance Points/i.test(text))
  const fieldBuffTexts = detailTexts.filter(text =>
    !/操作得分|得分|Performance Points/i.test(text))

  return {
    slotIndex,
    fieldBuffTexts,
    performanceTexts,
    challengeTargetTexts,
    sourceTextHash: sha256(detailHtml),
    sourceAnchor: `${periodAnchor}.modules[${moduleIndex}].components[0].data.tables[0].row[0]`,
  }
}

function parsePeriodNumber(title) {
  const match = title.match(/第(\d+)期/)
  if (match === null)
    throw new Error(`Unable to parse Deadly Assault period number from title: ${title}`)
  return Number(match[1])
}

function parsePeriodDetail(periodListItem, entryPage) {
  const page = entryPage.data?.page
  if (page === undefined)
    throw new Error(`Missing entry page payload for content_id=${periodListItem.content_id}`)
  if (page.id !== String(periodListItem.content_id))
    throw new Error(`Entry page id mismatch: list=${periodListItem.content_id}, page=${page.id}`)
  if (page.name !== periodListItem.title)
    throw new Error(`Entry page title mismatch: list=${periodListItem.title}, page=${page.name}`)

  const componentIds = page.modules.flatMap(module =>
    module.components.map(component => component.component_id))
  if (JSON.stringify(componentIds) !== JSON.stringify(expectedDetailComponentIds)) {
    throw new Error(
      `${periodListItem.title}: detail component structure drifted: ${componentIds.join("|")}`,
    )
  }

  const periodAnchor = `details/${periodListItem.content_id}.entry_page.json#data.page`
  const selectableBuffs = parseBuffTable(page.modules[0].components[0], periodAnchor)
  const bossSlots = bossModulePairs.map((pair, slotIndex) => ({
    slotIndex,
    ...parseBossInfo(
      page.modules[pair.infoModuleIndex].components[0],
      periodAnchor,
      pair.infoModuleIndex,
      slotIndex,
    ),
    detail: parseBossDetail(
      page.modules[pair.detailModuleIndex].components[0],
      periodAnchor,
      pair.detailModuleIndex,
      slotIndex,
    ),
  }))

  return {
    periodNumber: parsePeriodNumber(periodListItem.title),
    contentId: periodListItem.content_id,
    title: periodListItem.title,
    summary: periodListItem.summary,
    pageUrl: `https://baike.mihoyo.com/zzz/wiki/content/${periodListItem.content_id}/detail`,
    sourceAnchor: periodAnchor,
    selectableBuffs,
    bossSlots,
  }
}

function htmlListText(html) {
  return blockTextsFromHtml(html).join("\n")
}

function numericTokens(text) {
  return [...text.matchAll(/\d+(?:\.\d+)?/g)]
    .map(match => Number(match[0]))
    .sort((left, right) => left - right)
}

function numericSignature(text) {
  return numericTokens(text).join("|")
}

function numericIntersectionSize(left, right) {
  let leftIndex = 0
  let rightIndex = 0
  let count = 0

  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      count += 1
      leftIndex += 1
      rightIndex += 1
    }
    else if (left[leftIndex] < right[rightIndex]) {
      leftIndex += 1
    }
    else {
      rightIndex += 1
    }
  }

  return count
}

function numericMatchScore(left, right) {
  return numericIntersectionSize(left, right) / Math.max(left.length, right.length, 1)
}

function mapBuffIdsByTextSignature(period, version, buffs, unresolved) {
  const candidates = version.versionBuffIDs.map((buffId) => {
    const buff = buffs[buffId]
    const tokens = buff === undefined ? [] : numericTokens(htmlListText(buff[2]))
    return {
      buffId,
      tokens,
      signature: tokens.join("|"),
    }
  })
  const usedBuffIds = new Set()

  return period.selectableBuffs.map((buff) => {
    const tokens = numericTokens(buff.effectTexts.join("\n"))
    const matches = candidates
      .filter(candidate => !usedBuffIds.has(candidate.buffId))
      .map(candidate => ({
        ...candidate,
        score: numericMatchScore(tokens, candidate.tokens),
      }))
      .sort((left, right) => right.score - left.score)

    const best = matches[0]
    const second = matches[1]
    if (
      best === undefined
      || best.score < 0.65
      || (second !== undefined && best.score === second.score)
    ) {
      unresolved.push({
        severity: "blocking",
        reason: "localeMappingUnresolved",
        message:
          `Unable to uniquely align Mihoyo buff "${buff.name}" in ${period.title}; numeric signature=${tokens.join("|")}`,
        sourceRefs: [sourceRef(sourceId, buff.sourceAnchor, `periods.${period.contentId}.buffs.${buff.slotIndex}`)],
      })
      return undefined
    }

    if (best.score < 0.85) {
      unresolved.push({
        severity: "nonBlocking",
        reason: "sourceConflict",
        message:
          `Mihoyo/buhflipexplode buff numeric text differs for "${buff.name}" in ${period.title}; mapped to ${best.buffId} with score ${best.score.toFixed(2)}`,
        sourceRefs: [
          sourceRef(sourceId, buff.sourceAnchor, `periods.${period.contentId}.buffs.${buff.slotIndex}`),
          sourceRef("buhflipexplode-zzz-da", `assets/zzz/buffs.live.json#${best.buffId}`, `periods.${period.contentId}.buffs.${buff.slotIndex}`),
        ],
        details: {
          mihoyoNumericSignature: tokens.join("|"),
          buhflipexplodeNumericSignature: best.signature,
        },
      })
    }

    usedBuffIds.add(best.buffId)
    return best.buffId
  })
}

function sourceRef(sourceId, sourceAnchor, dataPath) {
  return {
    sourceId,
    sourceAnchor,
    sourceVersion: "sha256:see-fetch-manifest",
    dataPath,
  }
}

function alignWithBuhflipexplode(parsedPeriods) {
  const versions = readJson(join(buhflipexplodeSnapshotRoot, "da/da-versions.live.json"))
  const buffs = readJson(join(buhflipexplodeSnapshotRoot, "assets/zzz/buffs.live.json"))
  const enemies = readJson(join(buhflipexplodeSnapshotRoot, "assets/zzz/enemies.live.json"))
  const liveVersionKeys = Object.keys(versions)
  const unresolved = []

  const periods = parsedPeriods.map((period) => {
    const versionKey = liveVersionKeys[period.periodNumber - 1]
    const version = versions[versionKey]
    if (version === undefined) {
      unresolved.push({
        severity: "blocking",
        reason: "localeMappingUnresolved",
        message: `No buhflipexplode live version for Mihoyo ${period.title}`,
        sourceRefs: [sourceRef(sourceId, period.sourceAnchor, `periods.${period.contentId}`)],
      })
      return {
        periodNumber: period.periodNumber,
        contentId: period.contentId,
        title: period.title,
        unresolved: true,
      }
    }

    const mappedBuffIds = mapBuffIdsByTextSignature(period, version, buffs, unresolved)

    return {
      periodNumber: period.periodNumber,
      contentId: period.contentId,
      title: period.title,
      mihoyoPageUrl: period.pageUrl,
      buhflipexplodeVersionKey: versionKey,
      buhflipexplodeVersionName: version.versionName,
      buhflipexplodeVersionTime: version.versionTime,
      buffs: period.selectableBuffs.map((buff, slotIndex) => {
        const buffId = mappedBuffIds[slotIndex]
        const buhBuff = buffs[buffId]
        if (buffId !== undefined && buhBuff === undefined) {
          unresolved.push({
            severity: "blocking",
            reason: "localeMappingUnresolved",
            message: `No buhflipexplode buff ${buffId} for ${period.title} slot ${slotIndex}`,
            sourceRefs: [sourceRef(sourceId, buff.sourceAnchor, `periods.${period.contentId}.buffs.${slotIndex}`)],
          })
        }

        return {
          slotIndex,
          mappingMode: "numeric-signature-within-period",
          mihoyo: {
            name: buff.name,
            effectTexts: buff.effectTexts,
            iconUrl: buff.iconUrl,
            sourceAnchor: buff.sourceAnchor,
            sourceTextHash: buff.sourceTextHash,
          },
          buhflipexplode: buhBuff === undefined
            ? undefined
            : {
                buffId,
                name: buhBuff[0],
                iconKey: buhBuff[1],
                effectText: htmlListText(buhBuff[2]),
                sourceAnchor: `assets/zzz/buffs.live.json#${buffId}`,
                sourceTextHash: sha256(buhBuff[2]),
              },
        }
      }),
      bossSlots: period.bossSlots.map((boss, slotIndex) => {
        const enemyRef = version.versionEnemies[slotIndex]
        const buhEnemy = enemyRef === undefined ? undefined : enemies[enemyRef.id]
        const sideType = enemyRef?.type ?? 0
        const buhDescHtml = buhEnemy?.desc?.[sideType] ?? ""
        const buhPerfHtml = buhEnemy?.perf?.[sideType] ?? ""

        if (enemyRef === undefined || buhEnemy === undefined) {
          unresolved.push({
            severity: "blocking",
            reason: "localeMappingUnresolved",
            message: `No buhflipexplode boss slot for ${period.title} slot ${slotIndex}`,
            sourceRefs: [sourceRef(sourceId, boss.sourceAnchor, `periods.${period.contentId}.bossSlots.${slotIndex}`)],
          })
        }

        return {
          slotIndex,
          mappingMode: "period-slot",
          mihoyo: {
            name: boss.name,
            mihoyoEnemyContentId: boss.mihoyoEnemyContentId,
            mihoyoEnemyUrl: boss.mihoyoEnemyUrl,
            imageUrl: boss.imageUrl,
            weaknesses: boss.weaknesses,
            resistances: boss.resistances,
            fieldBuffTexts: boss.detail.fieldBuffTexts,
            performanceTexts: boss.detail.performanceTexts,
            challengeTargetTexts: boss.detail.challengeTargetTexts,
            sourceAnchor: boss.sourceAnchor,
            detailSourceAnchor: boss.detail.sourceAnchor,
            sourceTextHash: boss.sourceTextHash,
            detailSourceTextHash: boss.detail.sourceTextHash,
          },
          buhflipexplode: buhEnemy === undefined
            ? undefined
            : {
                enemyId: enemyRef.id,
                sideType,
                name: buhEnemy.name,
                descText: htmlListText(buhDescHtml),
                perfText: htmlListText(buhPerfHtml),
                hpMultiplier: version.versionHPMult[slotIndex],
                dazeMultiplier: version.versionDazeMult[slotIndex],
                anomalyMultiplier: version.versionAnomMult,
                sourceAnchor: `assets/zzz/enemies.live.json#${enemyRef.id}`,
                descSourceAnchor: `assets/zzz/enemies.live.json#${enemyRef.id}.desc[${sideType}]`,
                perfSourceAnchor: `assets/zzz/enemies.live.json#${enemyRef.id}.perf[${sideType}]`,
                sourceTextHash: sha256(`${buhDescHtml}\n${buhPerfHtml}`),
              },
        }
      }),
    }
  })

  return {
    schemaVersion: "mihoyo-buhflipexplode-da-alignment-v1",
    sourceId,
    parserVersion,
    alignmentPolicy: {
      periodMapping: "Mihoyo period title number maps to buhflipexplode live version order.",
      buffMapping:
        "Buffs are aligned within the same period by deterministic numeric signatures extracted from zh/en effect text; ambiguity fails loud.",
      bossSlotMapping: "Boss rooms are aligned by the 0-based slot order inside the same period.",
      textPolicy:
        "This artifact records zh/en source text anchors for later typed-modifier parsing; it does not infer modifiers.",
    },
    buhflipexplodeSnapshot: {
      snapshotId: "2026-05-05T0445Z",
      root: "data/source/raw/buhflipexplode/2026-05-05T0445Z",
    },
    periods,
    unresolved,
  }
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: apiHeaders })
  if (!response.ok)
    throw new Error(`Fetch failed for ${url}: HTTP ${response.status}`)

  const bytes = Buffer.from(await response.arrayBuffer())
  return {
    bytes,
    json: JSON.parse(bytes.toString("utf8")),
    status: response.status,
    headers: {
      etag: response.headers.get("etag"),
      lastModified: response.headers.get("last-modified"),
      contentType: response.headers.get("content-type"),
      cacheControl: response.headers.get("cache-control"),
    },
  }
}

function fileEntry(snapshotDir, options) {
  const bytes = readFileSync(join(snapshotDir, options.path))
  return {
    id: options.id,
    url: options.url,
    path: options.path,
    retain: options.retain,
    status: options.status,
    contentType: options.headers?.contentType,
    etag: options.headers?.etag,
    lastModified: options.headers?.lastModified,
    cacheControl: options.headers?.cacheControl,
    retained: {
      bytes: bytes.length,
      sha256: sha256(bytes),
    },
    retainedPath: relative(snapshotDir, join(snapshotDir, options.path)),
    manifestPath: "fetch-manifest.json",
  }
}

function extractDaChannel(channelResponse) {
  const root = channelResponse.data?.list?.[0]
  const daChannel = root?.children?.find(channel => channel.id === 108)
  if (daChannel === undefined)
    throw new Error("Unable to locate Mihoyo channel 108 under channel 13")
  if (!Array.isArray(daChannel.list) || daChannel.list.length === 0)
    throw new Error("Mihoyo channel 108 returned no period entries")
  return {
    id: daChannel.id,
    name: daChannel.name,
    parent_id: daChannel.parent_id,
    depth: daChannel.depth,
    list: daChannel.list,
  }
}

async function fetchCommand(flags) {
  const snapshotId = String(flags["snapshot-id"] ?? new Date().toISOString().replace(/[:.]/g, "-"))
  const fetchedAt = String(flags["fetched-at"] ?? new Date().toISOString())
  const snapshotDir = join(sourceRoot, snapshotId)
  const files = []

  rmSync(snapshotDir, { recursive: true, force: true })
  mkdirSync(snapshotDir, { recursive: true })

  const channelResponse = await fetchJson(channelApiUrl)
  const daChannel = extractDaChannel(channelResponse.json)
  writeJson(join(snapshotDir, "channel-108/periods.json"), daChannel)
  files.push(fileEntry(snapshotDir, {
    id: "channel-108-periods",
    url: channelApiUrl,
    path: "channel-108/periods.json",
    retain: "filtered-channel-108",
    status: channelResponse.status,
    headers: channelResponse.headers,
  }))

  const parsedPeriods = []
  for (const period of daChannel.list) {
    const detail = await fetchJson(entryPageUrl(period.content_id))
    const detailPath = `details/${period.content_id}.entry_page.json`
    writeJson(join(snapshotDir, detailPath), detail.json)
    files.push(fileEntry(snapshotDir, {
      id: `entry-page-${period.content_id}`,
      url: entryPageUrl(period.content_id),
      path: detailPath,
      retain: "raw-entry-page-json",
      status: detail.status,
      headers: detail.headers,
    }))
    parsedPeriods.push(parsePeriodDetail(period, detail.json))
  }

  const parsedSummary = {
    schemaVersion: "mihoyo-da-period-details-v1",
    sourceId,
    parserVersion,
    snapshotId,
    generatedAt: fetchedAt,
    pageUrl,
    endpointPolicy: {
      listEndpoint: channelApiUrl,
      entryEndpointTemplate:
        "https://act-api-takumi-static.mihoyo.com/hoyowiki/zzz/wapi/entry_page?app_sn=zzz_wiki&entry_page_id={content_id}&lang=zh-cn",
      requiredHeaders: {
        "x-rpc-wiki_app": "zzz",
      },
      directHtmlPolicy:
        "The public Nuxt page shell does not contain the DA detail content. Parse the public JSON endpoint and use Cheerio only for rich HTML fragments embedded in component data.",
    },
    periods: parsedPeriods,
  }
  writeJson(join(snapshotDir, "parsed/period-details.json"), parsedSummary)
  files.push(fileEntry(snapshotDir, {
    id: "parsed-period-details",
    path: "parsed/period-details.json",
    retain: "parsed-source-summary",
  }))

  const alignment = alignWithBuhflipexplode(parsedPeriods)
  writeJson(join(snapshotDir, "alignment/mihoyo-buhflipexplode.json"), alignment)
  files.push(fileEntry(snapshotDir, {
    id: "mihoyo-buhflipexplode-alignment",
    path: "alignment/mihoyo-buhflipexplode.json",
    retain: "parsed-source-alignment",
  }))

  const fetchManifest = {
    schemaVersion: "mihoyo-da-fetch-manifest-v1",
    sourceId,
    snapshotId,
    fetchedAt,
    generatedAt: fetchedAt,
    parserVersion,
    userAgent,
    pageUrl,
    endpointPolicy: parsedSummary.endpointPolicy,
    summary: {
      periodCount: parsedPeriods.length,
      firstPeriod: {
        contentId: parsedPeriods[0]?.contentId,
        title: parsedPeriods[0]?.title,
      },
      lastPeriod: {
        contentId: parsedPeriods.at(-1)?.contentId,
        title: parsedPeriods.at(-1)?.title,
      },
      selectableBuffCount: parsedPeriods.reduce(
        (count, period) => count + period.selectableBuffs.length,
        0,
      ),
      bossSlotCount: parsedPeriods.reduce(
        (count, period) => count + period.bossSlots.length,
        0,
      ),
      blockingUnresolvedCount: alignment.unresolved.filter(issue =>
        issue.severity === "blocking").length,
    },
    files,
  }
  writeJson(join(snapshotDir, "fetch-manifest.json"), fetchManifest)
}

function listFiles(dir) {
  if (!existsSync(dir))
    return []

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory())
      return listFiles(path)
    return [path]
  })
}

function assertPeriodSummary(period) {
  if (period.selectableBuffs.length !== 3)
    throw new Error(`${period.title}: expected 3 selectable buffs`)
  if (period.bossSlots.length !== 3)
    throw new Error(`${period.title}: expected 3 boss slots`)

  for (const buff of period.selectableBuffs) {
    if (buff.name.length === 0 || buff.effectTexts.length === 0)
      throw new Error(`${period.title}: incomplete selectable buff slot ${buff.slotIndex}`)
  }

  for (const boss of period.bossSlots) {
    if (boss.name.length === 0)
      throw new Error(`${period.title}: missing boss name at slot ${boss.slotIndex}`)
    if (boss.weaknesses.length === 0)
      throw new Error(`${period.title}: missing boss weaknesses at slot ${boss.slotIndex}`)
    if (boss.detail.fieldBuffTexts.length + boss.detail.performanceTexts.length === 0)
      throw new Error(`${period.title}: missing boss detail text at slot ${boss.slotIndex}`)
  }
}

function verifyCommand(flags) {
  const snapshot = String(flags.snapshot ?? "")
  if (snapshot.length === 0)
    throw new Error("verify requires --snapshot <snapshot-id>")

  const snapshotDir = join(sourceRoot, snapshot)
  const fetchManifest = readJson(join(snapshotDir, "fetch-manifest.json"))
  const parsedSummary = readJson(join(snapshotDir, "parsed/period-details.json"))
  const alignment = readJson(join(snapshotDir, "alignment/mihoyo-buhflipexplode.json"))

  for (const file of fetchManifest.files) {
    const path = join(snapshotDir, file.path)
    if (!existsSync(path))
      throw new Error(`Manifest file missing: ${file.path}`)
    const bytes = readFileSync(path)
    if (sha256(bytes) !== file.retained.sha256)
      throw new Error(`SHA-256 mismatch for ${file.path}`)
  }

  if (fetchManifest.endpointPolicy?.requiredHeaders?.["x-rpc-wiki_app"] !== "zzz")
    throw new Error("Mihoyo entry_page endpoint header policy is missing x-rpc-wiki_app=zzz")
  if (parsedSummary.periods.length !== 35)
    throw new Error(`Expected 35 Mihoyo DA periods, got ${parsedSummary.periods.length}`)
  if (alignment.periods.length !== 35)
    throw new Error(`Expected 35 Mihoyo/buhflipexplode aligned periods, got ${alignment.periods.length}`)
  if (alignment.unresolved.some(issue => issue.severity === "blocking"))
    throw new Error("Mihoyo/buhflipexplode alignment has blocking unresolved issues")

  for (const period of parsedSummary.periods)
    assertPeriodSummary(period)

  const latestPeriod = parsedSummary.periods[0]
  if (latestPeriod.bossSlots.some(boss => boss.detail.fieldBuffTexts.length === 0)) {
    throw new Error(
      `${latestPeriod.title}: latest period must expose 3 boss-room field buff text blocks`,
    )
  }

  for (const period of alignment.periods) {
    if (period.buffs.length !== 3)
      throw new Error(`${period.title}: expected 3 aligned buff slots`)
    if (period.bossSlots.length !== 3)
      throw new Error(`${period.title}: expected 3 aligned boss slots`)

    for (const buff of period.buffs) {
      if (buff.buhflipexplode === undefined)
        throw new Error(`${period.title}: missing EN buff alignment at slot ${buff.slotIndex}`)
      if (buff.mihoyo.effectTexts.length === 0 || buff.buhflipexplode.effectText.length === 0)
        throw new Error(`${period.title}: incomplete zh/en buff text at slot ${buff.slotIndex}`)
    }

    for (const boss of period.bossSlots) {
      if (boss.buhflipexplode === undefined)
        throw new Error(`${period.title}: missing EN boss alignment at slot ${boss.slotIndex}`)
      if (boss.mihoyo.fieldBuffTexts.length + boss.mihoyo.performanceTexts.length === 0)
        throw new Error(`${period.title}: incomplete zh boss text at slot ${boss.slotIndex}`)
    }
  }

  const latestAlignment = alignment.periods[0]
  if (latestAlignment.bossSlots.some(boss =>
    boss.mihoyo.fieldBuffTexts.length === 0
    || boss.buhflipexplode?.descText.length === 0)) {
    throw new Error(`${latestAlignment.title}: latest period must expose 3 zh/en boss-room text mappings`)
  }

  const retainedFiles = listFiles(snapshotDir).map(path => relative(snapshotDir, path))
  if (retainedFiles.some(file => file.endsWith(".html")))
    throw new Error("Mihoyo source snapshot should retain JSON/API payloads, not rendered HTML")
}

async function main() {
  const { command, flags } = parseArgs(process.argv.slice(2))

  if (command === "fetch")
    await fetchCommand(flags)
  else if (command === "verify")
    verifyCommand(flags)
  else
    throw new Error(`Unknown command: ${command}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
