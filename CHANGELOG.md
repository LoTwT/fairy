# Changelog

All notable changes to Fairy will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) (simplified) and Fairy uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [v0.0.1] — 2026-05-08

First public release of the `@randomplay/data` / `@randomplay/core` / `@randomplay/cli` packages on npm. Functionally equivalent to the dogfooding-passed V1 milestone (see `docs/product/dogfooding-report-v1.md`).

### Added

- **`@randomplay/cli`** — `fairy` binary with five subcommands `calc / compare / scan / explain / migrate` built on [`citty`](https://github.com/unjs/citty); JSON-only output; `--lang en|zh` switch; ERR-CLI catalog (bilingual).
- **`fairy calc` D-19 summary-first output** — `--view brief|verbose` (default `brief`); `summary.lanes.{nonCrit, crit, fixed}` two-lane output; `--result-mode expected` opt-in for expected damage; legacy `--resultMode` alias preserved.
- **`@randomplay/core`** — five damage classes; handler/DSL pipeline; anomaly + disorder calculation including virtual agent / overflow / seven-attribute disorder / `disorderDazeLevelZone`.
- **`@randomplay/data`** — `cleaned/` typed-modifier dataset for the Deadly Assault (DA) domain; four export entries `cleaned/`, `cleaned/<domain>`, `types`, `cleaned/i18n/<domain>`; multi-source provenance (`sources[]` + `sourceRefs`).
- **Mihoyo source pipeline** — list API + `entry_page` detail JSON + cheerio rich-text parsing; CN/EN parity manifest; coverage = 3 buffs + 3 boss attributes + 3 stage buffs per period (35 periods).
- **buhflipexplode source pipeline** — raw snapshot + `algorithm-manifest.json` + parity drift gate; D-12 boundary preserved (Fairy stays MIT, no GPL JS in runtime).
- **V1 golden anchor set (19 anchors)** — G01–G12, G14–G17, G21–G23; full passing in CI (`pnpm verify:golden-v1`).
- **Anby dogfooding fixture** — base attack 583.957 / multiplier 0.747 at lvl 16 / generic Dullahan defense 952.8; `pnpm fairy:s1|s2|s3` aliases for quick smoke.
- **Dogfooding artifacts** — `docs/product/dogfooding-report-v1.md` (4/5 release-gate evidence) + `docs/product/dogfooding-v1.md` (runbook).
- **Release tooling** — `bumpp` thin wrapper (`scripts/release-bump.mjs`) + allowlist publish workflow (`@randomplay/data,core,cli`) + GitHub OIDC + Trusted Publisher path + retry-safe `gitHead` check + rollback runbook (`docs/release/release-workflow.md`).

### Changed

- **npm scope** — packages renamed from `@fairy/*` to `@randomplay/{data,core,cli}` (PR #35 commit `dd78a4b`); root monorepo name = `fairy-monorepo` (private); CLI binary stays `fairy`.
- **米游社 sourceConflict audit (3 records, D-16 + D-17)** — 21 澄意 / 8 灼冽 / 1 破招 resolved as `resolved-prefer-buhflipexplode`; manual three-way verification against `https://zzz.nanoka.cc/boss/` showed nanoka aligned with buhflipexplode (2:1 vs Mihoyo); audit evidence at `data/cleaned/audit/mihoyo-buhflipexplode.source-conflicts.json`.

### Known limitations

- **DD-003 single-person dogfooding (D-18)** — V1 was validated only by `@lo-user` deep dogfood + QA regression; not validated against community usage. Wider validation deferred to V1.x.
- **Day 3 边界探测 skipped** — `--lang en` cross-locale verification and intentional ERR-* triggering not exercised during dogfooding (lo-user decision); gaps may surface post-release.
- **Golden anchor V1.x defer** — G13 (data-driven anomaly threshold rule composition) / G18 部位破坏 / G19 凶心疯汉失衡恢复 / G20 装甲哈提失衡恢复 deferred to V1.x with broader scope.
- **No Web UI / no AI plugin** — V2 (Web UI) and V1.1 (AI plugin / screenshot recognition / Bangboo) remain on the roadmap.

### Decisions referenced

- **D-13** golden anchor scope (19 anchors)
- **D-16** source priority + multi-source metadata + 2026-05-08 audit
- **D-17** Mihoyo V1 抓取范围 + 工具栈
- **D-18** V1 dogfooding gate (DD-003)
- **D-19** V1 CLI 输出改革 (`--view brief|verbose` summary-first)

[Unreleased]: https://github.com/LoTwT/fairy/compare/v0.0.1...HEAD
[v0.0.1]: https://github.com/LoTwT/fairy/releases/tag/v0.0.1
