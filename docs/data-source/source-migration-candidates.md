# Data Source Migration Candidates

Status: Phase 1 initial sample audit draft
Owner: @TechLead
Related task: task #117
Decision context: D-20 data-source migration after `git-history:data/source/excel/data.xlsx`
stopped updating.
Checked: 2026-05-14

This audit compares the three numeric-primary candidates selected by lo-user:
Prydwen, nanoka, and Gachabase. It is discovery-only. It does not change runtime
cleaned data and does not promote any source into `@randomplay/data`.

Scope note: this is an initial sample audit, not a complete deep-dive field
matrix. The machine-readable diff covers the sampled fixtures below. It does
not yet prove full coverage for W-Engine data, Drive Disc data, Mindscape data,
enemy thresholds, or every skill level 1-16 row. Final source selection must wait
for follow-up evidence on those fields, or for an explicit owner decision to
accept sample-based source selection.

Update after review: the first sample only checked nanoka list endpoints such as
`character.json` and `bangboo.json`. Lo-user identified detail endpoints such as
`/zh/character/1371.json`; this audit now includes those detail endpoints.

## Executive Summary

No candidate is clean enough for immediate cutover as a sole source without a
Phase 2 adapter, broader field evidence, and QA drift gates.

| Source | Current verdict | Why |
|---|---|---|
| nanoka detail JSON | Leading numeric-primary candidate | Versioned static JSON, stable/live route, zh/en/ja/ko path support, and sampled detail endpoints expose agent raw stats, skill params, Bangboo panel/skills, and monster stats. Needs adapter normalization for panel formulas and enemy variant mapping, but no beta-route policy change. |
| Gachabase | Best comparable serialized numeric coverage, blocked by live-only gate | Serialized pages expose rich exact numeric skill data, including Bangboo anomaly buildup. However all tested list/detail routes canonicalize to `/beta` and embed `branch: "beta"`, `version: "3.0.2"`. Under lo-user's live-only rule, it cannot be the main source unless a stable/live route or equivalent release-channel proof is found. |
| Prydwen | Conservative fallback / cross-check | Best live-safe human-readable website coverage. Character and Bangboo panels plus visible skill multipliers are present. Weaknesses: HTML/Gatsby scraping, no explicit data redistribution license found, Bangboo anomaly buildup and enemy formula tables are missing in the sampled pages. |

Initial recommendation:

1. Promote nanoka detail JSON to the leading Phase 2 adapter candidate, pending
   normalization formula and enemy variant mapping checks.
2. Keep Gachabase as a numeric cross-check candidate, but mark it non-promotable
   for npm payload until it passes `server=live` / `releaseChannel=stable` or
   lo-user changes the policy.
3. Keep Prydwen as a live-facing fallback and human-readable cross-check.
4. Do not cut over from archived Excel to any source in this PR. The next PR
   should still be raw/normalized snapshot + candidate adapter only.
5. Treat source selection as provisional until a follow-up audit fills the
   unsampled groups listed in the scope note.

## Audit Entities

The audit used the following sample entities because they touch the highest-risk
parts of the current Excel dependency:

| Fixture | Reason |
|---|---|
| Yixuan (`1371`, `仪玄`) | Recent agent and complex skill text; exposes Sheer Force / Auric Ink fields. |
| Plugboo (`54008`, `插头布`) | Bangboo V1.1 anchor G26; needs panel, active/chain multipliers, daze, anomaly buildup. |
| Hati / Dullahan / Greta | Existing golden/source evidence depends on enemy values in G13/G18-G20. |
| Yixuan basic attack and Plugboo active/chain skills | Tests whether numeric multipliers can be extracted deterministically rather than by LLM text inference. |

## Field Coverage Matrix

Legend: `available` = field observed directly; `partial` = useful values exist but
not enough for cleaned contract; `missing` = not observed; `blocked` = field exists
but source fails live-only or redistribution gate; `N/A` = not expected from this
source class.

| Field group | Prydwen | nanoka | Gachabase |
|---|---|---|---|
| Agent identity | available (en) | available (zh/en/ja/ko) | available (en + ids) |
| Agent base HP / ATK / DEF | available, displayed rounded | available in detail JSON as raw base/growth/level fields; needs normalization | blocked: available but beta branch |
| Agent impact / crit / crit damage / PEN | available, displayed rounded | available in detail `stats`; needs prop mapping | blocked: available but beta branch |
| Agent anomaly mastery / proficiency | partial; table has "Atr. Mastery" but naming needs mapping | available as `element_abnormal_power` / `element_mystery`; needs prop mapping | blocked: available in stat dictionary if route is accepted |
| Sheer Force / Sheer DMG special stats | partial; visible in guide text/stats, requires deterministic mapping | available for sampled agent via special fields/tags; needs mapping | blocked: explicit stat dictionary contains `SkipDefAtk` / Sheer Force |
| Agent skill multipliers lvl 1-16 | partial; visible HTML multipliers but extraction is DOM-based | available in detail `skill.*.description[].param` with raw `damage_percentage` / `stun_ratio` growth fields | blocked: serialized `skill_data` has base/step numeric fields |
| Agent daze / anomaly / energy skill data | partial; visible for some skill rows, not all sampled values normalized | available in detail skill params (`stun_ratio`, `attribute_infliction`, recovery/consume fields) | blocked: serialized `skill_data` exposes daze, buildup, energy-like fields |
| Bangboo identity | available (en) | available (zh/en/ja/ko) | blocked: available but beta branch |
| Bangboo base panel | partial; HP/ATK/DEF/crit/impact visible; anomaly mastery not observed | available in detail JSON as raw base/growth/level fields; needs normalization | blocked: visible panel plus stat dictionary |
| Bangboo skill multipliers | available; active/chain DMG and daze visible | available in detail `skill_prop` | blocked: serialized exact base/step numeric fields |
| Bangboo anomaly buildup | missing in sampled HTML | available in detail `skill_prop.*.element_accumulation_value` | blocked: serialized `anomaly_buildup` present |
| Enemy identity | not found in sampled ZZZ pages | available in `monster.json` and detail JSON | not audited beyond route shell |
| Enemy calculation panel | missing | available in detail `monster_info.*.stats` and `element_abnormal`; needs variant/level mapping | unknown / needs dedicated enemy detail probe |
| W-Engine panel / skill | available pages exist but not sampled deeply | partial identity/basic fields in `weapon.json` | likely available but not sampled deeply |
| Drive Disc data | available pages exist but not sampled deeply | partial identity/basic fields in `equipment.json` | likely available but not sampled deeply |
| i18n parity | en only in sampled pages | strong zh/en/ja/ko detail path coverage | en sampled; other languages likely via `lang`, not verified |
| Source version metadata | weak; no game-version marker found in sampled pages | strong static path `3.0.2+15625449` | strong version marker, but branch is beta |
| Offline snapshotability | medium; snapshot full HTML/chunks | strong; static JSON snapshots | medium; snapshot HTML with serialized payload |

## Source Detail: Prydwen

Sample URLs:

- <https://www.prydwen.gg/zenless/characters-stats/>
- <https://www.prydwen.gg/zenless/characters/yixuan/>
- <https://www.prydwen.gg/zenless/bangboo/>
- <https://www.prydwen.gg/privacy-policy/>
- <https://www.prydwen.gg/robots.txt>

Observed evidence:

- `robots.txt` returned HTTP 200 and allows `User-agent: *`.
- Character stats page directly renders Yixuan row values such as HP `8373`,
  DEF `441`, ATK `872`, crit rate `19.40%`, crit damage `50.00%`, impact `93`,
  attribute mastery `92`, and energy `1.2`.
- Yixuan detail page renders skill text and multiplier rows. Example sampled
  entries include `1st-Hit DMG Multiplier 45.80%`, `1st-Hit Daze Multiplier
  28.60%`, and subsequent hit rows.
- Bangboo list page renders Bangboo panel and skill multiplier blocks. For
  Plugboo it renders HP `4210`, ATK `8057`, DEF `724`, impact `99`, active skill
  DMG `512.0%`, active daze `187.0%`, chain DMG `688.0%`, and chain daze
  `98.0%`.
- Prydwen pages did not expose sampled Bangboo anomaly buildup numbers or
  anomaly mastery panel values in the rendered blocks.
- No explicit data redistribution license was found in the sampled privacy/about
  pages. Footer shows Prydwen copyright. Treat as `accepted-by-owner` only under
  D-20, not `permitted`.

Technical assessment:

- Coverage is useful but not complete. It can probably support a short-term
  adapter for panels and visible skill multipliers, while producing
  `missingFields` for anomaly buildup and any absent enemy fields.
- Parser risk is moderate/high because the source is Gatsby-rendered HTML with
  large inline payloads and page component chunks. A Cheerio parser is feasible,
  but selectors must be tested against archived HTML snapshots and fail loud when
  labels shift.
- Version/freshness metadata is weak. The adapter must record fetch time,
  content hash, URL, and source anchor. It should not pretend to know a precise
  game data version unless a page-local marker is found.

## Source Detail: nanoka

Sample URLs:

- <https://zzz.nanoka.cc/>
- <https://static.nanoka.cc/zzz/3.0.2+15625449/character.json>
- <https://static.nanoka.cc/zzz/3.0.2+15625449/zh/character/1371.json>
- <https://static.nanoka.cc/zzz/3.0.2+15625449/bangboo.json>
- <https://static.nanoka.cc/zzz/3.0.2+15625449/zh/bangboo/54008.json>
- <https://static.nanoka.cc/zzz/3.0.2+15625449/monster.json>
- <https://static.nanoka.cc/zzz/3.0.2+15625449/zh/monster/30000.json>
- <https://zzz.nanoka.cc/robots.txt>

Observed evidence:

- Root HTML embeds SvelteKit fetched static JSON URLs with versioned path
  `3.0.2+15625449`.
- List endpoints such as `character.json`, `bangboo.json`, and `monster.json`
  are identity summaries.
- Detail endpoint `zh/character/1371.json` has Yixuan raw panel fields
  (`stats.attack`, `hp_max`, `defence`, growth fields, `break_stun`, crit,
  anomaly fields, PEN fields), level tables, extra-level fields, full skill
  descriptions, and deterministic skill params. Sampled basic attack hit 1 has
  `damage_percentage=4580`, `stun_ratio=2860`, and
  `attribute_infliction=2596`.
- Detail endpoint `zh/bangboo/54008.json` has Plugboo raw panel fields, level
  tables, skills, and `skill_prop`. Sampled active skill values match V1.1 Excel
  and Gachabase after divisor normalization:
  `1001.main=51200`, `1002.main=18700`, and
  `element_accumulation_value=24000`.
- Detail endpoint `zh/monster/30000.json` has Dullahan `monster_info.*.stats`,
  curves, resistances, and `element_abnormal` maps. It still needs a
  deterministic variant/level mapping before replacing Excel enemy rows.
- The same detail route pattern returned HTTP 200 for sampled `zh`, `en`, `ja`,
  and `ko` paths across `character/1371`, `bangboo/54008`, and `monster/30000`.
- `weapon.json` and `equipment.json` expose useful W-Engine / Drive Disc
  identity/basic fields, but not enough sampled formula data for V1 cutover.
- `robots.txt` includes Cloudflare content signals with `search=yes` and
  `ai-train=no`, plus disallows for several AI crawlers. This is not a data
  redistribution license.

Technical assessment:

- Snapshotability is the best of the three candidates. Static versioned JSON
  paths are easy to archive and test offline.
- Numeric coverage is materially stronger than the list-endpoint sample implied.
  Detail endpoints make nanoka the leading numeric-primary candidate for Phase 2,
  subject to formula normalization and enemy variant mapping.
- i18n coverage is strong because the same detail path pattern works for sampled
  `zh`/`en`/`ja`/`ko` character, Bangboo, and monster endpoints.

## Source Detail: Gachabase

Sample URLs:

- <https://zzz.gachabase.net/agents?lang=en>
- <https://zzz.gachabase.net/agents/1371/yixuan?lang=en>
- <https://zzz.gachabase.net/bangboo?lang=en>
- <https://zzz.gachabase.net/bangboo/54008/plugboo?lang=en>
- <https://zzz.gachabase.net/privacy-policy>
- <https://zzz.gachabase.net/about-us>
- <https://zzz.gachabase.net/robots.txt>

Observed evidence:

- All tested list/detail routes canonicalize to `/beta` and embed
  `branch: "beta"`, `suffix: "/beta"`, and `version: "3.0.2"`.
- Query attempts such as `?branch=live`, `?branch=stable`, and `?version=2.8.X`
  still canonicalized to `/beta` in sampled pages.
- Detail pages without explicit `/beta` also canonicalize to `/beta`; for
  example `/agents/1371/yixuan?lang=en` resolves to canonical
  `/agents/1371/yixuan/beta`.
- Gachabase has the richest sampled numeric structure. Yixuan detail includes
  exact serialized skill rows such as `damage_multiplier_base`,
  `damage_multiplier_step`, `daze_multiplier_base`, `daze_multiplier_step`,
  `anomaly_buildup`, and related fields. Plugboo detail includes active and
  chain exact `skill_data`, including `anomaly_buildup`.
- Plugboo sampled exact values match the V1.1 Excel semantics after divisor
  normalization: active `damage_multiplier_base: 51200`, active
  `daze_multiplier_base: 18700`, active `anomaly_buildup: 24000`, chain
  `damage_multiplier_base: 68800`, chain `daze_multiplier_base: 9800`, chain
  `anomaly_buildup: 29500`.
- `robots.txt` returned `User-agent: * Disallow:`. About/privacy pages state the
  site is fan-made/not affiliated and that game assets, names, logos, and
  content remain the property of HoYoverse. No explicit data redistribution
  license was found.

Technical assessment:

- Field coverage is the strongest, and the serialized payload is less ambiguous
  than parsing visible text.
- It fails the D-20 live-only gate today. Under the current rule, a beta-labeled
  route cannot be promoted into npm payload even if individual rows have public
  release dates.
- A possible future exception would be a new owner ruling that allows a
  beta-labeled source when every row is additionally filtered by `release_date <=
  current date` and `release_version <= current live version`. That is a Product
  / lo-user policy change, not a TL default.

## License / Redistribution Classification

This section is engineering evidence, not legal advice.

| Source | Observed legal signal | Recommended registry value |
|---|---|---|
| Prydwen | Robots allow; privacy policy exists; no sampled explicit data license; footer copyright. | `redistributionRisk: "accepted-by-owner"` if used in npm payload under D-20. |
| nanoka | Robots allow general search but explicitly disallow AI training; no sampled explicit redistribution license. | `redistributionRisk: "accepted-by-owner"` under D-20 owner-accepted redistribution risk. |
| Gachabase | Robots allow; about page says fan-made/not affiliated and game content belongs to owners; no sampled explicit data license. | `redistributionRisk: "forbidden"` while branch is beta; otherwise `accepted-by-owner` only after live/stable proof. |

## Implementation Cost

| Source | Parser path | Estimated adapter cost | Maintenance risk |
|---|---|---|---|
| Prydwen | HTML/Gatsby Cheerio parser over archived pages. | Medium: 3-5 days for first useful adapter plus fixtures. | Medium/high: label and DOM shifts can silently corrupt data unless selectors are label-anchored and snapshot-tested. |
| nanoka | Static JSON fetch + schema decode. | Low/medium: 2-4 days for first useful adapter plus normalization/variant mapping checks. | Low: versioned URLs and JSON contracts are stable. |
| Gachabase | SvelteKit HTML serialized payload parser; possible extraction from embedded data object. | Medium: 3-5 days after live gate. | Medium: serialized app shape can change, but exact numeric fields are better than visible DOM text. |

## Open Technical Questions

1. Can Gachabase provide a stable/live branch URL or API endpoint that does not
   canonicalize to `/beta`?
2. What exact normalization formulas convert nanoka raw panel/growth/level
   fields into fairy's cleaned level-60 panel values?
3. What deterministic mapping should select the correct `monster_info` variant
   for enemy rows and DA/golden fixtures?
4. Can Prydwen cover enemy calculation fields elsewhere, or must enemy numeric
   data remain DA-only / deferred?
5. What minimum field coverage threshold does Product want for Phase 2 if no
   candidate covers every Excel field?
