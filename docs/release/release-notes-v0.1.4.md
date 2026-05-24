# Fairy v0.1.4 — Release Notes

> Patch release draft/reference. The release workflow generates the final
> GitHub Release body from `git-cliff`; Product/TL may copy this text into the
> release body only as part of the release operation.

## TL;DR

v0.1.4 publishes the V1.2.3 vision stage of the Fairy AI plugin after the
compare formalization in v0.1.3. It scaffolds the `fairy-vision` skill, adds the
V1.2.3 vision examples (P2), introduces a golden vision fixture harness, and
aligns the vision docs with the runtime entities.

Unlike the forward-spec-only status in v0.1.3, the V1.2.3 vision stage in v0.1.4
is **dogfood-backed**: the T4 dogfood (repo-local layer plus a team-side AI-host
layer) passed before release, and the published packages passed an independent
post-publish release-readiness check.

The vision capability is delivered as AI-plugin / skill source plus supporting
fixtures and harness. The three npm packages remain the published surface and
bump to `0.1.4` in sync.

## Compatibility Notes

- `@randomplay/core`, `@randomplay/data`, and `@randomplay/cli` remain
  synchronized at version `0.1.4`.
- Existing `fairy calc`, `scan`, `explain`, `migrate`, and `compare` commands
  remain compatible with v0.1.3 behavior.
- No published CLI/library schema changes in this release; v0.1.4 is additive
  vision-stage work plus the golden vision fixture harness.

## Migration Guide

For CLI users:

```bash
pnpm dlx @randomplay/cli@0.1.4 --help
pnpm dlx @randomplay/cli@0.1.4 calc <your-snapshot.json> --view brief
pnpm dlx @randomplay/cli@0.1.4 compare <left-snapshot.json> <right-snapshot.json> --view brief --pretty
```

For library consumers:

```bash
pnpm add @randomplay/core@0.1.4 @randomplay/data@0.1.4
```

## Highlights

- **fairy-vision skill scaffold (#97)** — scaffolds the V1.2.3 `fairy-vision`
  skill for screenshot-driven snapshot drafting under the AI plugin.
- **V1.2.3 vision examples P2 (#98)** — adds vision example fixtures for the
  supported community-tool sources.
- **Vision fixture harness (#99, golden anchor)** — adds the V1.2.3 vision
  fixture harness as a golden anchor so vision behavior stays regression-gated.
- **Docs–runtime alignment** — aligns the vision plan/docs with the actual
  runtime entities so the skill contract and docs do not drift.

## Dogfood and Verification

v0.1.4 is the first vision-stage release validated end-to-end by the V1.2.3
dogfood:

- **T4 dogfood — repo-local layer**: independently double-confirmed (TL + QA),
  baselines stable — NL `7622 / 5954 / 10718`, compare display delta `2017`,
  test counts core 53 / data 133 / cli 30.
- **T4 dogfood — AI-host layer**: team-side multimodal AI-host dogfood —
  VIS-1~5 (workshop / miyoushe happy paths, unsupported-source fallback,
  low-confidence / missing-critical, PII handling) and NL-3/4 (ambiguity and
  unknown-critical ask-don't-guess) all PASS; vision baseline
  `11303 / 5356 / 16090`.
- **T5 release-readiness preflight**: build / test / data gates / pack and a
  `0.1.4` publish dry-run all green, with no commit / tag / push / publish during
  preflight.
- **Post-publish release-readiness (QA)**: registry shows all three packages at
  `latest=0.1.4`, SLSA provenance v1 attestations present, GitHub Release
  published, and fresh install + import + `fairy` CLI smoke green.

Privacy: the vision dogfood used redacted evidence only. Real screenshots are
not committed to the repository, and reports / transcripts / metadata record PII
as kind / status only (no raw UID or username).

## AI Plugin and Vision Status

The Fairy AI plugin (including the `fairy-vision` skill) remains source-level
Claude-plugin work in the repository; it is not published as a standalone npm
plugin package. v0.1.4 delivers the V1.2.3 vision stage scaffold, examples,
fixture harness, and docs alignment, validated by the dogfood above. Additional
source layouts, field-confidence and evidence refinements, and any later plugin
patch remain forward work.

## Rollback

If a critical regression surfaces after release:

1. Deprecate affected package versions on npm.
2. Open an emergency rollback/removal PR.
3. Publish a replacement patch through the standard release workflow.

See `docs/data-source/takedown-rollback.md` for the detailed package takedown
runbook.

## Links

- Repository — https://github.com/LoTwT/fairy
- Vision plan / docs — `docs/ai-plugin/v1.2.3-vision/`
- Release workflow — `docs/release/README.md`
