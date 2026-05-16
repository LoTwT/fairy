# Mihoyo Deadly Assault Source

Status: S5-2d source snapshot baseline
Owner: @TechLead
Related task: task #42

This directory documents how Fairy uses Mihoyo ZZZ wiki Deadly Assault pages as
the Chinese source-text and zh/en alignment source for V1 Deadly Assault data.

## Source Role

Mihoyo is the V1 source for:

- Deadly Assault period Chinese titles and detail-page anchors;
- three selectable period buff names and Chinese descriptions;
- three boss-room names, weaknesses, resistances, descriptions, challenge
  targets, and room/field mechanism text;
- zh/en text alignment against the retained buhflipexplode live snapshot.

Mihoyo is not the primary source for Deadly Assault numeric multipliers in V1.
After the V0.1.0 nanoka runtime cutover, Mihoyo D-17, buhflipexplode D-12, and
Excel became archived audit references only. In V0.1.2 their raw archives were
removed from the current tree and kept as git-history recovery pointers;
runtime source-backed data remains nanoka-exclusive.

## Endpoint Policy

The public page URL is:

`https://baike.mihoyo.com/zzz/wiki/channel/map/13/108`

Direct HTML fetch returns a Nuxt shell and does not contain the DA detail text.
The source fetcher therefore uses public JSON API responses:

- channel list:
  `https://act-api-takumi-static.mihoyo.com/common/blackboard/zzz_wiki/v1/home/content/list?app_sn=zzz_wiki&channel_id=13`
- entry details:
  `https://act-api-takumi-static.mihoyo.com/hoyowiki/zzz/wapi/entry_page?app_sn=zzz_wiki&entry_page_id={content_id}&lang=zh-cn`

`entry_page` requests must include header `x-rpc-wiki_app: zzz`. Without this
header, `entry_page_id` can resolve into a different wiki namespace and return
unrelated content for the same numeric id.

The entry JSON stores rich HTML fragments in component data. The retired D-17
parser used an HTML-fragment parser for those source snippets; Playwright was
used for discovery and is not a production crawler dependency.

## Current Snapshot

- Snapshot: `git-history:data/source/raw/mihoyo/zzz-da/2026-05-05T0850Z/`
- Fetched at: `2026-05-05T16:50:00+08:00`
- Periods retained: 35 (`危局强袭战（第1期）` through `危局强袭战（第35期）`)
- Selectable buff anchors: 105
- Boss-room anchors: 105

Retained source artifacts:

- `channel-108/periods.json`
- `details/*.entry_page.json`
- `parsed/period-details.json`
- `alignment/mihoyo-buhflipexplode.json`
- `fetch-manifest.json`

`parsed/period-details.json` is a source-summary artifact, not cleaned data.
`alignment/mihoyo-buhflipexplode.json` maps Mihoyo zh text to buhflipexplode EN
text by period and deterministic slot/signature rules for later typed-modifier
parsing.

## Alignment Rules

- Mihoyo period number maps to buhflipexplode live version order.
- Boss rooms map by slot order within the same period.
- Buffs map within the same period by deterministic numeric signatures extracted
  from zh/en effect text. Ambiguous matches fail loud.
- Text mismatches are retained as machine-readable unresolved issues. Blocking
  unresolved issues fail verification. Non-blocking source conflicts can remain
  in the source snapshot for later human audit before cleaned modifier release.

Current non-blocking source conflicts are recorded in
`alignment/mihoyo-buhflipexplode.json`. They are source-text differences, not
published cleaned modifiers.

The three release-relevant buff conflicts from this snapshot were manually
audited after lo-user provided nanoka (`https://zzz.nanoka.cc/boss/`) as a
lookup-only third source. Nanoka matched buhflipexplode for all three records,
so the cleaned release evidence resolves them as
`resolved-prefer-buhflipexplode` in
`packages/data/cleaned/audit/mihoyo-buhflipexplode.source-conflicts.json`. The raw
Mihoyo alignment artifact remains unchanged and continues to retain the original
Mihoyo values, buhflipexplode values, hashes, and source anchors for audit
trace. Nanoka is not part of the crawler or cleaned-data pipeline.

UX impact was checked with:

```bash
rg -n "澄意|灼冽|破招|Clarity|Blazing Chill|Interrupt" docs/ux/starter-scenarios.md
```

The command had no matches, so no starter-scenario update is required for this
audit resolution.

## Verification

The D-17 fetch/verify script and raw snapshot were retired in V0.1.2 after the
nanoka cutover. Current release gates verify the retained audit evidence through
`packages/data/cleaned/audit/mihoyo-buhflipexplode.source-conflicts.json`,
`packages/data/source-registry.json`, and the nanoka runtime/source gates.

The retired source id remains fail-loud: it is kept as a git-history audit
baseline and must not re-enter current runtime source references.
