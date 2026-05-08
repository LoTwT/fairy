# Fairy v0.0.1 — Release Notes (draft)

> First public release. This document is the source of truth for the GitHub Release page body. Edit here, then paste at release time.

## TL;DR

`@randomplay/cli` (binary: `fairy`) is a TypeScript-first damage calculator for ZZZ Deadly Assault, with deterministic typed-modifier data (`@randomplay/data`) and a pluggable calculation engine (`@randomplay/core`). v0.0.1 ships the dogfooding-passed V1 feature set under a fresh npm scope.

## Highlights

- **CLI** — five subcommands `calc / compare / scan / explain / migrate` on top of `citty`; JSON-only output, `--lang en|zh`, summary-first (`--view brief|verbose`).
- **Core engine** — five damage classes; anomaly / disorder full pipeline (virtual agent / overflow / seven-attribute disorder / `disorderDazeLevelZone`).
- **Cleaned data** — DA-domain typed modifier dataset with multi-source provenance; 19-anchor V1 golden set; bundled Anby dogfooding fixture.
- **Mihoyo + buhflipexplode sources** — Mihoyo `entry_page` detail JSON + cheerio rich-text parsing with CN/EN parity manifest; buhflipexplode raw snapshot + drift gate (no GPL JS in runtime).
- **Audit-resolved data deltas** — 3 米游社 / buhflipexplode source conflicts manually audited and resolved in favor of buhflipexplode (verified against `zzz.nanoka.cc`, 2:1 alignment).
- **Release pipeline** — bumpp + allowlist publish + GitHub OIDC + Trusted Publisher + rollback runbook.

## Install

```bash
# CLI — one-shot via pnpm dlx (no install)
pnpm dlx @randomplay/cli --help
pnpm dlx @randomplay/cli calc <your-snapshot.json> --view brief

# CLI — local install in your project
pnpm add -D @randomplay/cli
pnpm exec fairy --help
pnpm exec fairy calc <your-snapshot.json> --view brief

# Library
pnpm add @randomplay/data @randomplay/core
```

Verified on Node ≥ 22.14. The `pnpm dlx` invocation runs the CLI's `fairy` bin directly — you don't pass `fairy` as a separate argument.

## Verify

After install, run a smoke calc:

```bash
pnpm exec fairy calc <your-snapshot.json> --view brief
# or, without install:
pnpm dlx @randomplay/cli calc <your-snapshot.json> --view brief
```

Or clone the repo and run the bundled smoke chain:

```bash
pnpm install --frozen-lockfile
pnpm --filter @randomplay/data verify:golden-v1
pnpm fairy:s1   # Anby S1 baseline
pnpm fairy:s2
pnpm fairy:s3
```

## Known limitations (please read before reporting issues)

- **Single-person dogfooding** — V1 was validated by one user (`@lo-user`) plus QA regression. Community usage paths are not yet covered.
- **Day 3 edge probing skipped** — cross-locale (`--lang en`) verification and intentional ERR-* triggering were not exercised during dogfooding.
- **V1.x defer** — G13 anomaly threshold rule composition / G18 part destruction / G19 部位 break disorder recovery / G20 armored Hati disorder recovery are deferred.
- **No Web UI, no AI plugin** in v0.0.x. Web UI is the V2 milestone; AI plugin / screenshot OCR / Bangboo are V1.1.

If you hit a blocker, open a GitHub issue with: snapshot JSON (sanitized) + the exact CLI command + expected vs actual output.

## Compatibility

- Public schema: `@randomplay/data/cleaned` and `/types` are stable for v0.0.x. Field renames will follow `D-11` (官方化命名 + sourceAliases + migration notes).
- CLI: `--view brief|verbose` and `--result-mode expected` are stable; legacy `--resultMode` alias is kept transitional.
- Internal effect handlers (`L4 requiresActivation` etc.) may evolve in v0.0.x as new effect templates land.

## Decisions

This release lands under the formal decisions:

- **D-13** V1 黄金集 19 anchors
- **D-16** Source priority + multi-source metadata
- **D-17** 米游社 V1 抓取范围 + 工具栈
- **D-18** V1 dogfooding gate (DD-003)
- **D-19** V1 CLI 输出改革

See `docs/product/decisions/index.md` for the full decisions log and `docs/product/dogfooding-report-v1.md` for dogfooding evidence (4/5).

## Acknowledgements

- buhflipexplode (`buhflipexplode.org/zzz/da/`) for the DA reference dataset
- 米游社 wiki (`baike.mihoyo.com/zzz/`) for CN i18n + 乘区文本
- `zzz.nanoka.cc/boss/` for third-party manual verification

## Rollback

If a critical regression surfaces post-release, follow `docs/release/release-workflow.md` rollback section:

1. Mark the GitHub Release as pre-release.
2. Deprecate each affected package version separately (npm CLI does not accept brace expansion):
   ```bash
   npm deprecate @randomplay/data@0.0.1 "<reason + tracking issue>"
   npm deprecate @randomplay/core@0.0.1 "<reason + tracking issue>"
   npm deprecate @randomplay/cli@0.0.1 "<reason + tracking issue>"
   ```
3. Open a `revert` PR against `main` and cut a `v0.0.2` patch via the standard release pipeline.

## Links

- Repository — https://github.com/LoTwT/fairy
- Dogfooding report — `docs/product/dogfooding-report-v1.md`
- Release workflow — `docs/release/release-workflow.md`
- Decisions log — `docs/product/decisions/index.md`
