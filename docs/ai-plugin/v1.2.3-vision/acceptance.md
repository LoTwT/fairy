# AI Plugin V1.2.3 Vision Acceptance Gates

Status: V1.2.3 plan draft
Owner: @QA
Reviewers: @Product, @TechLead, @UX, @lo-user
Related docs: `docs/ai-plugin/v1.2.3-vision/architecture.md`,
`docs/ai-plugin/v1.2.3-vision/user-journeys.md`,
`docs/ai-plugin/v1.2.3-vision/prompt-templates.md`,
`docs/product/decisions/D-22-ai-plugin-v1.2.3-vision.md`

This document extends the V1.2.2 AI plugin acceptance gates for the V1.2.3
vision-recognition plan. It is intentionally implementation-facing: the later
implementation PR is only shippable when these gates are executable, documented,
and passing.

## Scope

V1.2.3 adds `fairy-vision` as an approved fourth skill in the existing AI plugin
workflow. The vision skill reads one supported community-tool screenshot,
extracts a reviewable snapshot draft plus draft metadata, then hands off to
`fairy-snapshot` for review/edit and missing-field policy before the confirmed
strict `BattleSnapshot` goes to `fairy-calc`.

Locked MVP decisions:

- Source scope: community-tool screenshots only.
- Supported sources: `绝区零工坊` and `米游社`.
- Image shape: single aggregate image per build by default.
- PII policy: the model may see UID / user name while reading the image, but
  `BattleSnapshot` and committed expected outputs must not persist PII.
- Schema policy: strict `BattleSnapshot` remains calculation input; screenshot
  evidence such as source, confidence, base/bonus display split, roll-count
  text, and PII detection belongs in draft metadata / extraction evidence.
- Field policy: `team[].panel` receives calculation-ready total panel values,
  not an audit model for base + bonus.
- Skill structure: approved skill list is `fairy-vision`, `fairy-snapshot`,
  `fairy-calc`, and `fairy-explain`.
- Language MVP: current source fixtures are zh; zh user-facing copy is required
  for MVP. en copy remains part of the existing V1.2.2 user-facing contract, but
  image UI language detection beyond zh is forward-spec.
- Fallback: unsupported or unknown sources must fall back to review-heavy
  generic extraction or the existing natural-language `fairy-snapshot` path; they
  must not silently generate a confident snapshot.

Out of scope for V1.2.3 MVP:

- in-game raw screenshots;
- multi-screenshot batch ingestion;
- OCR-only fallback as a shipped requirement;
- storing UID / user name in `BattleSnapshot`;
- unapproved `fairy-ocr` skill enablement;
- AI plugin compare / `fairy-compare` skill enablement;
- any model-side calculation.

## Non-Negotiable QA Principle

Vision is an input structuring path, not a calculation path:

> `fairy-vision` reads screenshots and drafts. `fairy-snapshot` reviews.
> `fairy` CLI validates and calculates.

Any path that lets the model invent damage, fill unsupported schema fields,
persist PII, or proceed to calculation without a reviewable strict snapshot is a
release blocker.

## Fixture Strategy

The implementation PR should keep `examples/ai-plugin/` as the single fixture
source and add a vision sub-tree under it.

Recommended fixture layout:

```text
examples/ai-plugin/vision/
  inputs/
    workshop-anby-build.redacted.jpg
    miyoushe-anby-build.redacted.jpg
  expected/
    workshop-anby-build.extraction.json
    workshop-anby-build.snapshot.json
    workshop-anby-build.draft-metadata.json
    miyoushe-anby-build.extraction.json
    miyoushe-anby-build.snapshot.json
    miyoushe-anby-build.draft-metadata.json
```

Fixture count strategy:

| Phase | Minimum | Purpose |
|---|---:|---|
| Plan PR | 2 sample-source references | Establish `绝区零工坊` and `米游社` source mapping and privacy policy. |
| Implementation PR MVP | 5-10 image fixtures | Cover both supported sources, success path, ambiguity, low-confidence handling, and PII exclusion. |
| Dogfood patch | Add fixtures for each real failure | Prevent regressions from source layout drift, OCR confusion, missing fields, or prompt drift. |

Public repository fixture images must be redacted, synthetic, or explicitly
approved for publication. UID and user name must not appear in committed expected
snapshot JSON. If raw user-provided screenshots are used privately for testing,
they must stay outside the public fixture tree.

## Vision Gate Matrix

| Gate | Name | MVP status | Evidence |
|---|---|---|---|
| V-G1 | Source detection and layout routing | Required | Source classifier fixtures for `绝区零工坊`, `米游社`, and unknown source. |
| V-G2 | Extraction evidence and schema boundary | Required | Extraction JSON + draft metadata + strict `BattleSnapshot` parse. |
| V-G3 | Review/edit and uncertainty handling | Required | Ask-user fixtures for missing critical fields, low confidence, and unsupported source. |
| V-G4 | Privacy and PII exclusion | Required | Static fixture scan + expected JSON assertions that UID/user name do not persist. |
| V-G5 | End-to-end calc validation | Required | Image fixture -> draft -> confirmed snapshot -> `fairy calc --view verbose` baseline. |

## V-G1: Source Detection and Layout Routing

`fairy-vision` must detect the source before extracting fields.

Required behavior:

- detect `绝区零工坊` screenshots;
- detect `米游社` screenshots;
- mark any other screenshot as `unknown` unless a future Product-approved source
  has a layout map;
- route extraction through a source-specific layout map after detection;
- avoid treating unknown-source extraction as high confidence.

Acceptance checks:

- one `绝区零工坊` fixture routes to the workshop layout;
- one `米游社` fixture routes to the miyoushe layout;
- one negative/unknown fixture routes to generic fallback or asks the user;
- source detection output is recorded in draft metadata, not `BattleSnapshot`;
- source-specific prompt examples do not claim support for in-game raw
  screenshots.

## V-G2: Extraction Evidence and Schema Boundary

The extraction layer must preserve useful screenshot evidence without changing
the strict calculation schema.

Required behavior:

- `BattleSnapshot` contains only schema-supported fields;
- `team[].panel` uses calculation-ready total panel values from the screenshot;
- base + bonus display splits are kept in draft metadata / extraction evidence;
- substat values and visible roll counts are captured as evidence;
- confidence values are attached to extracted fields;
- unsupported fields are not written into the snapshot as ad hoc keys.

Acceptance checks:

- every generated `*.snapshot.json` parses through `parseBattleSnapshot`;
- draft metadata is stored separately from snapshot JSON;
- no `uid`, `username`, `sourceImage`, `baseAttack`, `bonusAttack`, or other
  evidence-only fields appear inside strict `BattleSnapshot`;
- base + bonus evidence is present in draft metadata for at least one fixture;
- visible substat roll-count evidence is present in draft metadata for at least
  one fixture;
- extraction JSON and draft metadata use canonical English keys.

## V-G3: Review/Edit and Uncertainty Handling

Vision extraction must produce a reviewable draft, not an irreversible snapshot.

Required behavior:

- high-confidence supported-source fields may be prefilled in the draft;
- low-confidence critical fields block calculation until the user confirms or
  edits them;
- missing critical fields block calculation;
- optional unknowns may remain omitted only when the existing CLI validation path
  can handle the omission;
- "5-star midpoint default" behavior from text/NL flows must not be applied to
  clearly visible source-tool screenshots;
- unknown source must force review-heavy fallback or NL fallback.

Acceptance checks:

- at least one fixture reaches a confirmable draft without extra user input;
- at least one fixture or synthetic case asks the user because source or critical
  field confidence is low;
- at least one fixture demonstrates missing/unsupported field handling;
- no calc command is issued before review/confirm in any fixture path;
- user-facing ask/edit copy is available in zh for MVP and keeps the same
  field-tier semantics as V1.2.2.

## V-G4: Privacy and PII Exclusion

V1.2.3 must not make UID or user name part of the calculation artifact.

Required behavior:

- UID / user name may be detected only as extraction evidence needed to identify
  and ignore PII regions;
- `BattleSnapshot` must not include UID, user name, or other account identifiers;
- public fixtures must be redacted/synthetic or explicitly approved;
- logs and verifier output must not print raw PII values by default.

Acceptance checks:

- static scan of `examples/ai-plugin/vision/expected/**/*.json` rejects PII keys
  such as `uid`, `userId`, `username`, `nickname`, `accountId`;
- static scan rejects known sample UID strings in committed public fixture
  outputs;
- expected snapshots contain agent/build composition data only;
- docs state that host AI tools may send image prompts to their provider, but
  Fairy does not persist PII into snapshot or calc outputs;
- if private raw screenshots are used for dogfood, their storage location is
  outside public repo fixtures.

## V-G5: End-to-End Calc Validation

Vision output is accepted only when it can feed the trusted CLI calculation path.

Required behavior:

- confirmed vision snapshot runs through `fairy calc <snapshot> --view verbose
  --lang <zh|en>`;
- CLI warnings and errors are preserved;
- the model does not summarize numeric output until CLI JSON exists;
- compare remains out of scope for the AI plugin.

Acceptance checks:

- each golden vision fixture includes the exact CLI command;
- fixture baseline `CalcResult` JSON is generated by the current CLI;
- fixture summary assertions are derived from CLI JSON, not prose;
- changing user-facing language does not change numeric JSON;
- no `fairy compare` command or `fairy-compare` skill appears in the V1.2.3
  vision workflow.

## Extensions to V1.2.2 G1-G10

### G1: Skill Discovery and Metadata

V1.2.3 intentionally adds `fairy-vision` as the Product-approved screenshot
skill. The metadata verifier must require the four approved skills and fail if an
unapproved `fairy-ocr` / `fairy-compare` skill appears.

Acceptance additions:

- `fairy-vision` is present and documents screenshot input as the supported entry;
- `fairy-snapshot` remains the review/edit and missing-field handoff skill;
- trigger examples include zh screenshot phrases, for example `帮我从这张图生成快照`;
- supported source names are documented in user-facing copy;
- `fairy-vision` metadata states that a multimodal-capable host is required;
- docs do not imply official HoYoverse support.

### G2: CLI Binding and No-Model-Calculation

Vision does not change the CLI-only calculation contract.

Acceptance additions:

- `fairy-vision` emits a snapshot draft and draft metadata only;
- `fairy-vision` does not call the CLI, calculate damage, explain results, or
  emit a confirmed snapshot;
- `fairy-snapshot` owns the review/edit handoff before `fairy-calc`;
- `fairy-calc` remains the only calculation step;
- static scan catches model-side damage/math instructions and fake preflight
  commands;
- failed image extraction does not produce damage output.

### G3: Snapshot Generation and Validation

Vision fixtures join the existing NL-to-`BattleSnapshot` fixtures.

Acceptance additions:

- at least two source-specific vision fixtures;
- at least one unsupported-source fallback fixture;
- strict parse for all generated snapshots;
- draft metadata carries source, confidence, evidence, omitted fields, and PII
  exclusion status.

### G4: Calc Correctness

Acceptance additions:

- at least 3 implementation fixtures include CLI verbose baselines;
- final implementation target is 5-10 vision fixtures before dogfood release
  readiness;
- baseline generation is reproducible with repository commands;
- CLI diagnostics are surfaced in the user-facing summary.

### G5: Explain Correctness

Vision-specific explain claims must remain grounded in `CalcResult` and
extraction metadata.

Acceptance additions:

- explanation may mention screenshot extraction confidence only if that
  confidence exists in metadata;
- explanation must not infer hidden stats from image appearance;
- if extraction metadata is absent, explain behaves exactly like V1.2.2.

### G6: Compare Workflow

Still deferred for the AI plugin.

Acceptance additions:

- the existence of CLI `fairy compare` in v0.1.3 does not enable AI plugin G6;
- vision dogfood may manually compare two CLI outputs, but no plugin compare
  workflow is advertised or tested as shipped.

### G7: Version Sync

The plugin's `minFairyCliVersion` must be reviewed before V1.2.3 implementation
ships. If V1.2.3 requires compare or release-specific CLI behavior, the minimum
must be bumped accordingly; if it only emits snapshots for `fairy calc`, the
existing minimum may remain valid with documented rationale.

Acceptance additions:

- docs state the CLI version used for vision fixture baselines;
- missing/too-old CLI fail-loud copy still works after adding vision flow.

### G8: Privacy and Local-Data Boundary

V1.2.3 changes V1.2.2 from text-only to image-aware, so privacy acceptance must
be explicit.

Acceptance additions:

- docs explain host AI image handling boundary;
- public fixtures are redacted/synthetic/approved;
- expected JSON does not persist PII;
- no raw source archives or account-private sources are read as a shortcut.

### G9: Distribution Smoke

The implementation PR must include deterministic local verification even if
host-tool image handling cannot be fully automated.

Required smoke:

- verifier checks expected vision fixture file set;
- verifier validates strict snapshot parse;
- verifier validates draft metadata/extraction schema;
- verifier validates PII exclusion;
- verifier regenerates or deep-matches CLI baselines for confirmed snapshots;
- manual host-tool smoke checklist covers attaching one workshop image and one
  miyoushe image.

### G10: Docs and Onboarding

Acceptance additions:

- supported sources are clearly listed;
- unsupported sources and in-game screenshots are clearly marked deferred;
- user-facing examples show single-image input and review/edit handoff;
- docs explain that total panel values feed `BattleSnapshot`, while base/bonus
  is retained as evidence only;
- docs include privacy/PII behavior;
- docs include a fallback example for unknown source or low-confidence fields.

## Implementation PR QA Checklist

The implementation PR is not QA-passable until the following evidence is present:

1. `git diff --check`
2. `pnpm verify:ai-plugin`
3. `pnpm check`
4. `pnpm build`
5. `pnpm test`
6. Vision fixture file-set verifier
7. Source-detection fixture verifier
8. Strict `BattleSnapshot` parse for generated vision snapshots
9. Draft metadata / extraction evidence schema check
10. PII exclusion scan for public expected outputs
11. CLI verbose baseline regeneration/deep-match for confirmed vision snapshots
12. Unsupported-source or low-confidence fallback smoke
13. zh user-facing review/edit copy smoke
14. AI plugin deferred-scope scan: no `fairy-compare`, no in-game screenshot
    support claim, no `fairy-ocr`, no OCR-only shipped claim unless separately
    scoped
15. Manual host-tool smoke checklist for one `绝区零工坊` image and one `米游社`
    image, if runtime automation cannot attach images deterministically

## Release-Readiness Addendum

When V1.2.3 later ships, release-readiness must verify:

- published package versions remain synchronized;
- CLI version satisfies plugin `minFairyCliVersion`;
- release docs match the actual supported screenshot sources;
- metadata and vision fixture verifiers pass on the release tag;
- fresh install of `@randomplay/cli` can run the calc baselines generated from
  vision snapshots;
- no PII is present in public fixture outputs or release notes;
- AI plugin compare remains deferred unless a later Product-approved compare
  patch is included;
- V1.2.3 dogfood feedback is either incorporated or explicitly triaged before
  V0.1.4 release.
