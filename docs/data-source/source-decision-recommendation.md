# Source Decision Recommendation

Status: Phase 1 initial sample recommendation draft
Owner: @TechLead
Related task: task #117

## Recommendation

Do not cut over runtime cleaned data yet.

For Phase 2 planning, the sampled evidence now supports a new leading path after
lo-user identified nanoka detail endpoints:

1. **Path C / nanoka-first path: choose nanoka detail JSON as the Phase 2
   numeric-primary adapter candidate.** It has versioned static JSON, stable
   route metadata, zh/en/ja/ko path support, and sampled detail endpoints with
   agent raw stats, skill params, Bangboo skill props, and monster stats.
2. **Strict live-only fallback: choose Prydwen as provisional numeric-primary
   adapter candidate** only if nanoka normalization/variant mapping fails. It
   requires `missingFields` / `deferredRows` for every field Prydwen does not
   cover. Use nanoka for i18n / identity cross-check.
3. **Coverage-first Gachabase path (requires policy change): choose Gachabase only if
   lo-user explicitly accepts a beta-labeled source filtered to released rows.**
   This is not recommended as a TL default because D-20 currently requires live /
   stable source metadata and forbids beta/pre-release rows.

This is not a final cutover recommendation. The current machine-readable diff is
an initial fixture sample and does not prove full coverage for W-Engine data,
Drive Disc data, Mindscape data, enemy thresholds, or all skill levels 1-16.
Those groups need follow-up evidence or explicit owner acceptance before a main
source is locked.

## Why Nanoka Is Now Leading

The initial audit only sampled list endpoints, which made nanoka look like an
identity/i18n source. Lo-user identified detail endpoints such as
`/zh/character/1371.json`, and those materially change the conclusion.

Nanoka detail JSON has the strongest combination of source properties:

- stable versioned static paths, e.g. `3.0.2+15625449`;
- no beta-route blocker;
- sampled zh/en/ja/ko detail paths for character, Bangboo, and monster records;
- deterministic JSON fields instead of DOM text;
- sampled agent skill params, Bangboo skill props, and monster stats.

It still needs adapter work before cutover:

- normalize raw panel/growth/level fields into fairy's cleaned level-60 panel
  values;
- map monster detail variants (`monster_info.*`) to the correct golden/enemy
  rows;
- verify W-Engine, Drive Disc, Mindscape, and full skill level coverage.

## Why Gachabase Is Conditional

Gachabase has the best sampled numeric coverage. It exposes exact structured
fields for skill multiplier base/step, daze multiplier base/step, and anomaly
buildup. This is much better than scraping visible text.

The blocker is release channel. Every tested route canonicalizes to `/beta`.
Under current D-20 rules, that is enough to fail the source before data quality is
considered.

## Why Prydwen Is Only Fallback

Prydwen appears to be live-facing public content and exposes the most useful
non-beta numeric values among the currently allowed candidates. Its weakness is
that it is a rendered website, not a clean static data API. The adapter must be
heavily snapshot-tested and must fail loud if labels move or fields disappear.

## Next Engineering Steps

Before any source cutover, complete one of these:

1. Expand the audit to the full D-20 field matrix, including W-Engine, Drive
   Disc, Mindscape, enemy thresholds, and skill level 1-16 coverage.
2. Record an explicit Product / lo-user decision that the project is accepting a
   sample-based source selection for Phase 2 adapter work.

If Product chooses the nanoka-first path:

1. Build a nanoka raw snapshot fetcher for `character`, `bangboo`, `monster`,
   `weapon`, and `equipment` detail/list endpoints.
2. Build a normalized candidate adapter that emits source-observed fields plus
   structured `missingFields` for unsampled groups.
3. Add formula normalization fixtures for one agent and one Bangboo, plus enemy
   variant mapping fixtures for G13/G18-G20 risk rows.
4. Keep archived Excel as the runtime source until QA validates candidate shape
   and drift output.

If Product chooses the Prydwen fallback path:

1. Build a Prydwen raw snapshot fetcher for the minimal Phase 2 fixture pages:
   Yixuan, Plugboo/Penguinboo/Sharkboo, and any available enemy/DA-relevant page.
2. Build a normalized candidate adapter that emits only source-observed fields.
3. Emit structured `missingFields` for anomaly buildup, enemy panel fields, and
   any absent exact values.
4. Keep archived Excel as the runtime source until QA validates candidate shape
   and drift output.

If Product wants to keep Gachabase alive:

1. Ask lo-user whether beta-labeled routes are categorically forbidden even when
   rows are already released.
2. If still forbidden, stop Gachabase work except as local audit evidence.
3. If conditionally allowed, add a registry field for row-level release filtering
   and require QA to test that future/unreleased rows are rejected.
