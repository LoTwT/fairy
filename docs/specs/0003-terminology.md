# Spec 0003 — Terminology Glossary

## Scope

This spec governs Fairy's terminology glossary for Zenless Zone Zero (ZZZ)
concepts. Code identifiers, config keys, data fields, log labels, and docs must
use the glossary as the canonical naming source.

The glossary data lives in
[docs/references/glossary.md](../references/glossary.md). This spec defines the
rules around that data: source priority, subject areas, boundary columns, naming
conventions, source status, deprecated aliases, verification, and maintenance.

This spec does **not** add package code, build steps, tests, runtime behavior, or
QA scripts. Automated enforcement is deferred until product code or generated
configuration exists to scan.

## Rationale

Fairy models ZZZ combat and related game data. The same game concept can appear
in multiple places — formula terms, config schemas, agent metadata, equipment
data, logs, and prose — so names need one shared source of truth.

The glossary is organized by game/development subject area because developers
usually look up terms by object type: common combat concepts, agents, W-Engines,
Drive Discs, Bangboo, or content/proper nouns. Boundary rules stay in columns
rather than headings so a readable glossary does not accidentally decide formula
or enum eligibility.

Chinese and English naming must be conservative. A Simplified-Chinese name is
only written into `zh` when official or visible in-game/official-site text
confirms it. If the English term or mechanic is sourced but the official Chinese
display name is not stable, the glossary uses `待核验` in `zh`; it must not
invent a Chinese name that only looks official.

Deprecated aliases live in the glossary, not duplicated across specs, so future
scan rules have one data source.

## Contract

### Source Priority

Chinese (`zh`) and English (`en`) names are resolved in this order, highest
first:

1. **HoYo official announcements / visible in-game or official-site text** —
   authoritative for Simplified-Chinese names and version timing.
2. **Zenless Zone Zero Fandom official wiki** — stable English terms, change
   history, version-introduced timing, and mechanic chains.
3. **Prydwen** — cross-check for mechanic semantics, especially stats whose
   boundaries the community confuses (e.g. Anomaly Proficiency vs Anomaly
   Mastery).
4. **Engineering convention** — `code_identifier` recommendations (camelCase,
   etc.). These are maintenance rules for interface consistency, not official
   game text.

### Glossary Organization And Boundaries

The glossary is organized first by `subject_area`, then constrained by boundary
columns. `subject_area` is the human reading path:

- `common`
- `agents`
- `w-engines`
- `drive-discs`
- `bangboo`
- `content`

Every term also has a `domain`, `code_surface`, and `export_policy`. These
columns are the core rule surface: terms that are specific to one character, one
equipment object, one agent specialty, or one version's content must not leak
into the global combat/formula vocabulary.

`domain` values:

- **damage-formula** — multipliers, resistances, defense, Daze/Impact, anomaly
  stats, Sheer Force/DMG, and concepts with stable meaning for general damage
  calculation (e.g. `daze`, `damageBonus`, `defense`,
  `anomalyProficiency`, `anomalyMastery`, `impact`, `penRatio`, `penValue`,
  `sheerForce`, `sheerDamageBonus`).
- **attribute-anomaly** — attributes and anomaly mechanics themselves
  (e.g. `wind`, `windDamage`, `windswept`, `tempestCoefficient`,
  `contamination`, `vortex`, `disorder`, `abloom`). Globally referenceable.
- **agent-specialty** — playable-agent specialty metadata such as `stun`. These
  terms may be exported as agent metadata enums, but they are not damage-formula
  concepts.
- **character-mechanic** — resources, summons, and derived effects that hold
  only for a specific character (e.g. Velina's `windbloom`, `windbite`,
  `condensedCyclone`, `sweepingCyclone`, `chromaticTint`). They may be
  referenced by logs/skill parsing, but must not enter global formula tables or
  global enums without an explicit reuse reason.
- **content** — character, faction, map, system, gear, and Bangboo names
  (e.g. `velinaAirgid`, `roscaelifer`, `externalStrategyDepartment`,
  `wutheringSalon`). Recorded, but kept out of the formula layer.
- **engineering-convention** — naming rules that exist purely for code clarity.

Worked example: `vortex` is a global anomaly mechanic
(`attribute-anomaly`); `stun` is an agent-specialty enum; `sweepingCyclone` is
Velina-only (`character-mechanic`); `roscaelifer` is a 3.0 city (`content`). All
are kept, but their formula/config eligibility is controlled by `domain`,
`code_surface`, and `export_policy`, not by their section heading alone.

`code_surface` values describe where an identifier may appear:

- `formula-key`
- `config-key`
- `enum-value`
- `doc-only`
- `reserved`

`export_policy` values describe how public the term may be:

- `exported`
- `internal`
- `doc-only`
- `do-not-use`

### Naming Conventions

- `code_identifier` is **camelCase**.
- `DMG` stays abbreviated in display text, but expands to `damage` in
  identifiers (`damageBonus`, not `dmgBonus`).
- State names are decoupled from specialties: use `stunnedState`, not `stun`,
  for the Stunned state. `stun` is reserved for the agent-specialty only.
- Resource fields follow consistent shapes: `maxXxx`, `xxxGenerationRate`,
  `xxxBuildup`.
- Spelling is American English: `defense`, not `defence`.
- Three hard distinctions recur across formula, config, and character text:
  - **Daze** (mechanic / meter, `daze`) -> **Stunned** (state,
    `stunnedState`) -> **Stun** (agent-specialty, `stun`). Three different
    things.
  - **Anomaly Proficiency** (`anomalyProficiency`, scales anomaly damage) is not
    **Anomaly Mastery** (`anomalyMastery`, scales buildup efficiency).
  - `damageBonus` (on the attacker) is not `damageTaken` (on the target).

### Source Status And Needs-Verify

- `source_status` is `official`, `official-wiki`, or both. It describes the
  source class for the term/mechanic itself.
- `待核验` (needs-verify) is a value of the `zh` column, **not** of
  `source_status`. It means no stable official Chinese name is confirmed yet
  even though the term/mechanic has an English or mechanic source.
- A `zh = 待核验` entry must never be exported as official Chinese display text.
  Treat it as internal reference / placeholder only.
- When official Chinese text is later confirmed, update `zh` and update
  `source_status` only if the source class actually changed.

### Deprecated Aliases

Deprecated aliases must not be used as canonical names in the context named by
the glossary table's `forbidden_when` field. Rows marked `always` are
unconditional do-not-use aliases across code, config, exported fields, tests,
and docs. Contextual rows are forbidden only in their stated scope, so they can
coexist with a valid canonical term elsewhere.

The canonical deprecated-alias table lives in
[docs/references/glossary.md](../references/glossary.md#deprecated-aliases-do-not-use)
so it grows with the term data. That table is the future context-aware scan
source. Row-level `aliases / deprecated` cells may also describe weak aliases,
source wording, or contextual shorthands, but only the deprecated-alias table
defines scan targets and scopes.

The current deprecated scan set includes unconditional aliases such as `boost`
and `dmgBonus` for `damageBonus`, `defence` for `defense`, `stunVulnerability`
for `dazeVulnerability`, and `sheerBoost` for `sheerDamageBonus`. It also
includes contextual aliases such as `stun` when used for the Daze mechanic,
`dazed` and `staggered` when used as canonical Stunned-state identifiers,
`anomalyMastery` when used for Anomaly Proficiency / 异常精通, `disorder` when
used for the Windswept settlement, and `corruption` when used for the Windswept
cross-attribute link.

## Implementation Notes

The glossary is documentation data for now. Manual review applies the
terminology checks until a consumer exists for automated QA. A consumer can be
product code, generated config, exported schema data, or log/test fixtures.

The manual terminology checks are:

- **Identifier uniqueness** — each public `code_identifier` appears once; one
  English canonical yields one public identifier.
- **Deprecated-alias scan** — no deprecated alias from the canonical deprecated
  table is used as canonical in docs/config/fields/tests within its
  `forbidden_when` context; rows marked `always` are global. Exclude the
  deprecated-aliases table and explanatory examples; flag canonical/exported use
  only.
- **Boundary check** — `content` terms never use formula-key/global-enum
  surfaces; `agent-specialty` terms never appear as formula keys;
  `character-mechanic` terms never appear in global enums without an explicit
  reuse reason; subject-area headings never override `domain`, `code_surface`,
  or `export_policy`.
- **needs-verify check** — no `zh = 待核验` entry is exported as official Chinese
  text.
- **Wind-chain consistency** — if `windswept` triggers `vortex` somewhere, that
  settlement is not also written as `disorder`; a `contamination` reference is
  stated as the Windswept link.

`introduced_in` records the game version a term entered (e.g. `base`, `0.2.0`,
`2.0`, `2.8`/`3.0`). New game versions add terms; entries are not removed when a
version ages.

Term additions and renames follow the normal docs flow under the GitHub
contribution policy. Renames update the glossary plus the deprecated-alias table.
`AGENTS.md` carries a one-line pointer naming this glossary as the canonical
source for ZZZ terminology.

## Acceptance

- [docs/references/glossary.md](../references/glossary.md) contains the canonical
  term data, organized by subject area with boundary columns (`domain`,
  `code_surface`, `export_policy`) and a canonical deprecated-aliases section.
- This spec defines source priority, subject areas, boundary columns, naming
  conventions, source status / needs-verify, deprecated-alias policy, manual
  verification rules, and maintenance.
- `AGENTS.md` points to the glossary as the canonical terminology source.
- No package code, build, test, runtime behavior, or QA script is required by
  this spec.
- `git diff --check` succeeds and tracked Markdown links resolve.
