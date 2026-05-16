# Fairy v0.1.3 — Release Notes

> Patch release draft/reference. The release workflow generates the final
> GitHub Release body from `git-cliff`; Product/TL may copy this text into the
> release body only as part of the release operation.

## TL;DR

v0.1.3 publishes the compare CLI formalization after v0.1.2. It adds a stable
`fairy compare` JSON contract for deterministic binary A/B snapshot comparison,
including brief and verbose views, structured diffs, and warnings when the two
inputs are not comparable.

This release is intentionally compare-only. The repository also contains
source-level AI plugin work, but the plugin remains held for later dogfooding and
is not shipped as a published npm plugin capability in v0.1.3. V1.2.3 screenshot
recognition remains forward-spec only and will be planned separately.

## Compatibility Notes

- `@randomplay/core`, `@randomplay/data`, and `@randomplay/cli` remain
  synchronized at version `0.1.3`.
- Existing `fairy calc`, `scan`, `explain`, and `migrate` commands remain
  compatible with v0.1.2 behavior.
- `fairy compare` now returns `schemaVersion: "fairy-cli-compare-v1"`.
- `compare --view brief` returns side summaries plus structured deltas instead
  of embedding full `CalcResult` objects.
- `compare --view verbose` includes full left/right `CalcResult` objects and
  unchanged bucket/modifier rows for audit workflows.
- AI plugin compare (`fairy-compare`) remains out of scope. The AI plugin G6
  compare gate stays deferred until a later Product-approved plugin patch.

## Migration Guide

For CLI users:

```bash
pnpm dlx @randomplay/cli@0.1.3 --help
pnpm dlx @randomplay/cli@0.1.3 calc <your-snapshot.json> --view brief
pnpm dlx @randomplay/cli@0.1.3 compare <left-snapshot.json> <right-snapshot.json> --view brief --pretty
pnpm dlx @randomplay/cli@0.1.3 compare <left-snapshot.json> <right-snapshot.json> --view verbose --pretty
```

For library consumers:

```bash
pnpm add @randomplay/core@0.1.3 @randomplay/data@0.1.3
```

## Highlights

- **Stable compare schema** — `fairy compare` now emits
  `fairy-cli-compare-v1` with a declared `view`, `resultMode`, left/right
  result summaries, `delta`, `diff`, diagnostics, warnings, and errors.
- **Brief and verbose views** — brief output is compact for AI/CLI consumers;
  verbose output keeps full `CalcResult` payloads and unchanged rows for audit.
- **Structured diff details** — compare output includes summary, lane, bucket,
  modifier, and contributor deltas with `added`, `removed`, `changed`, and
  `unchanged` statuses where applicable.
- **Apples-to-oranges warnings** — compare still computes numeric deltas when
  active actor, enemy, damage type, W-Engine, or Drive Disc signatures differ,
  but emits localized `ERR-CMP-001` warnings so callers can flag non-like-for-like
  comparisons.
- **Compare fixtures** — `examples/compare/` includes a Yixuan source snapshot
  and locked brief output fixture, covered by CLI tests.

## AI Plugin and Vision Status

The V1.2.2 AI plugin remains source-level work in the repository and is held for
later dogfooding. It is not published as a standalone npm plugin package in
v0.1.3.

V1.2.3 screenshot recognition remains forward-spec only in v0.1.3. The planned
sequence is to release compare first, then draft and review the vision plan
before implementation, then dogfood the full AI-plugin stage.

## Verification

PR #95 passed Product/TL implementation review and independent QA review with:

- `git diff --check`
- `pnpm verify:ai-plugin`
- `pnpm --filter @randomplay/cli check`
- `pnpm --filter @randomplay/cli test`
- `pnpm --filter @randomplay/cli build`
- `pnpm check`
- `pnpm build`
- `pnpm test`
- built CLI compare fixture diff against
  `examples/compare/yixuan-sheer-stronger.brief.json`
- apples-to-oranges warning smoke
- verbose compare schema smoke
- zh/en i18n key and placeholder parity checks
- `pnpm fairy:s1`
- `pnpm fairy:s2`
- `pnpm fairy:s3`

Release-readiness still needs to validate the published npm packages, matching
`@randomplay/core`, `@randomplay/data`, and `@randomplay/cli` versions, SLSA
provenance, GitHub Release, fresh install/import smoke, direct JSON import
smoke, CLI calc and compare smoke, and the `verify:package-size` evidence from
release CI.

## Rollback

If a critical regression surfaces after release:

1. Deprecate affected package versions on npm.
2. Open an emergency rollback/removal PR.
3. Publish a replacement patch through the standard release workflow.

See `docs/data-source/takedown-rollback.md` for the detailed package takedown
runbook.

## Links

- Repository — https://github.com/LoTwT/fairy
- Compare examples — `examples/compare/`
- CLI README — `packages/cli/README.md`
- Release workflow — `docs/release/README.md`
