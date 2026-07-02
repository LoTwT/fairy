# Spec 0003 — Terminology Glossary

## Scope

This spec governs Fairy's terminology glossary for Zenless Zone Zero (ZZZ)
concepts. Code identifiers, config keys, data fields, log labels, and docs must
use the glossary as the canonical naming source.

The glossary data lives in
[docs/references/glossary.md](../references/glossary.md). This spec defines the
rules around that data: source priority, category boundaries, canonical table
shape, naming conventions, source and needs-verification policy, deprecated
aliases, manual checks, and maintenance.

This spec does **not** add package code, build steps, tests, runtime behavior, or
QA scripts. Automated enforcement is deferred until product code or generated
configuration exists to scan.

## Rationale

Fairy models ZZZ combat and related game data. The same game concept can appear
in multiple places — formula terms, config schemas, agent metadata, equipment
data, logs, and prose — so names need one shared source of truth.

The glossary is organized by game content entry point first because developers
usually look up terms by object type: shared game concepts, agents, W-Engines,
Drive Discs, Bangboo, or world/content proper nouns. Subcategories then explain
the narrower boundary. Machine-facing eligibility stays in columns so a readable
heading does not accidentally decide formula or enum usage.

Chinese and English naming must be conservative. A Simplified-Chinese name is
only written into `zh` when official or visible in-game/official-site text
confirms it. If the English term or mechanic is sourced but the official Chinese
display name is not stable, the glossary uses `待核验` in `zh`; it must not
invent a Chinese name that only looks official.

Supporting sections are intentionally not alternate sources of truth. The main
category tables are canonical; `Needs Verification Review Queue` is a review
view; `Notes / Exceptions` explains confusing boundaries; `Deprecated Aliases`
is the future scan source for names that must not become canonical.

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
4. **Engineering convention** — `identifier` recommendations (canonical
   camelCase code identifiers, etc.). These are maintenance rules for interface
   consistency, not official game text.

### Glossary Organization And Boundaries

The glossary is organized by `category` and `subcategory`.

Top-level `category` values are:

- `Common`
- `Agents`
- `W-Engines`
- `Drive Discs`
- `Bangboo`
- `World & Content`

`Common` is reserved for game-wide concepts that are not tied to one specific
agent, W-Engine, Drive Disc, Bangboo, location, or faction. Its current
subcategories are:

- **Attributes** — attribute and element types.
- **Agent Stats** — agent panel stats or reusable stat fields.
- **Combat Mechanics** — damage formulas, modifiers, resources, gauges, and the
  Daze/Stunned chain. This is not a catchall for every combat concept.
- **Attribute Anomaly System** — anomaly buildup, anomaly states, and anomaly
  settlement chains.

Non-Common categories use narrower subcategories:

- **Agents** — `Agent Names`, `Agent Specialties`, and
  `Agent-Specific Mechanics`.
- **W-Engines** — `W-Engine Names` and future W-Engine effect/requirement
  subcategories.
- **Drive Discs** — `Drive Disc Sets` and future stat/set-effect subcategories.
- **Bangboo** — `Bangboo Names` and future skill/condition subcategories.
- **World & Content** — `Locations / Areas`, `Factions / Organizations`, and
  future system/mode subcategories.

Every canonical row has these columns:

- `identifier`
- `zh`
- `en`
- `category`
- `subcategory`
- `domain`
- `surface`
- `export`
- `source`

The `domain`, `surface`, and `export` columns are the core rule surface. Terms
specific to one character, one equipment object, one agent specialty, or one
version's content must not leak into global combat/formula vocabulary just
because their English text sounds general.

`domain` values:

- **damage-formula** — multipliers, resistances, defense, Daze/Impact, anomaly
  stats, Sheer Force/DMG, and concepts with stable meaning for general damage
  calculation.
- **attribute-anomaly** — attributes and anomaly mechanics themselves.
- **agent-specialty** — playable-agent specialty metadata such as `stun`. These
  terms may be exported as agent metadata enums, but they are not damage-formula
  concepts.
- **character-mechanic** — resources, summons, and derived effects that hold
  only for a specific character. They may be referenced by logs/skill parsing,
  but must not enter global formula tables or global enums without an explicit
  reuse reason.
- **content** — character, faction, map, system, gear, and Bangboo names.
  Recorded, but kept out of the formula layer.
- **engineering-convention** — naming rules that exist purely for code clarity.

`surface` values describe where an identifier may appear:

- `formula-key`
- `config-key`
- `enum-value`
- `doc-only`
- `reserved`

`export` values describe how public the term may be:

- `exported`
- `internal`
- `doc-only`
- `do-not-use`

`source` values describe the source class for the term/mechanic itself:

- `official`
- `official-wiki`
- `official + official-wiki`

Worked example: `vortex` is a shared anomaly mechanic under
`Common / Attribute Anomaly System`; `stun` is only an
`Agents / Agent Specialties` enum; `sweepingCyclone` is a Velina-only
`Agents / Agent-Specific Mechanics` term; `roscaelifer` is
`World & Content / Locations / Areas`. All are kept, but their formula/config
eligibility is controlled by `domain`, `surface`, and `export`, not by the
heading alone.

### Notes / Exceptions

`Notes / Exceptions` is a sparse appendix for aliases, confusing boundaries,
version/source context, and maintenance rationale. It is not a second canonical
source and must not override the main category tables.

The appendix table has these columns:

- `identifier`
- `category`
- `subcategory`
- `version`
- `aliases`
- `notes`

Every `identifier` in `Notes / Exceptions` must link back to exactly one
canonical main-table row, and its `category` / `subcategory` values must match
that row. Notes rows are optional: obvious terms do not need notes just to repeat
their name.

Boundary examples:

- `stun` belongs only to `Agents / Agent Specialties`. It is not the Daze
  mechanic, not the Stunned state, and not a formula term.
- `tempestCoefficient` is currently placed in
  `Common / Combat Mechanics` because it behaves like a formula coefficient.
  Move it only if later review confirms it should be modeled as a
  Wind-chain-specific anomaly term.

### Needs Verification Review Queue

`Needs Verification Review Queue` is a review/maintenance view, not a second
canonical source. It centralizes terms whose canonical main-table `zh` value is
still `待核验`.

Confirmed Chinese values must be written back to the normal category row above.
The queue can then be removed or updated. A queue row must always link back to a
canonical main-table `identifier`; it must not introduce a note-only or
queue-only canonical term.

### Naming Conventions

- `identifier` is the canonical camelCase code identifier used for keys,
  variables, config keys, enum values, data fields, and log labels.
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

### Needs-Verify Source Semantics

- `source` describes the source class for the term/mechanic itself.
- `待核验` (needs-verify) is a value of the `zh` column, **not** of `source`. It
  means no stable official Chinese name is confirmed yet even though the
  term/mechanic has an English or mechanic source.
- A `zh = 待核验` entry must never be exported as official Chinese display text.
  Treat it as internal reference / placeholder only.
- When official Chinese text is later confirmed, update `zh` and update `source`
  only if the source class actually changed.

### Deprecated Aliases

Deprecated aliases must not be used as canonical names in the context named by
the glossary table's `forbidden_when` field. Rows marked `always` are
unconditional do-not-use aliases across code, config, exported fields, tests,
and docs. Contextual rows are forbidden only in their stated scope, so they can
coexist with a valid canonical term elsewhere.

The canonical deprecated-alias table lives in
[docs/references/glossary.md](../references/glossary.md#deprecated-aliases)
so it grows with the term data. That table is the future context-aware scan
source. `Notes / Exceptions` cells may describe weak aliases, source wording, or
contextual shorthands, but only the deprecated-alias table defines scan targets
and scopes.

The current deprecated scan set includes unconditional aliases such as `boost`
and `dmgBonus` for `damageBonus`, `defence` for `defense`,
`stunVulnerability` for `dazeVulnerability`, and `sheerBoost` for
`sheerDamageBonus`. It also includes contextual aliases such as `stun` when used
for the Daze mechanic, `dazed` and `staggered` when used as canonical
Stunned-state identifiers, `anomalyMastery` when used for Anomaly Proficiency /
异常精通, `disorder` when used for the Windswept settlement, and `corruption`
when used for the Windswept cross-attribute link.

## Implementation Notes

The glossary is documentation data for now. Manual review applies the
terminology checks until a consumer exists for automated QA. A consumer can be
product code, generated config, exported schema data, or log/test fixtures.

The manual terminology checks are:

- **Identifier uniqueness** — each public `identifier` appears once in the main
  category tables; one English canonical yields one public identifier.
- **Category/subcategory validity** — every row uses an approved category and
  subcategory. `stun` must remain `Agents / Agent Specialties`, never `Common`.
  Agent-specific mechanics must not become global rows without an explicit
  promotion decision.
- **Boundary check** — `content` terms never use formula-key/global-enum
  surfaces; `agent-specialty` terms never appear as formula keys;
  `character-mechanic` terms never appear in global enums without an explicit
  reuse reason; category headings never override `domain`, `surface`, or
  `export`.
- **Notes appendix check** — every `Notes / Exceptions` row has a matching
  canonical main-table row, matching `category` and `subcategory`, and no
  duplicate note-only canonical definition.
- **Needs-verify check** — no `zh = 待核验` entry is exported as official Chinese
  text; queue rows link back to main-table rows and are updated/removed after
  confirmation.
- **Deprecated-alias scan** — no deprecated alias from the canonical deprecated
  table is used as canonical in docs/config/fields/tests within its
  `forbidden_when` context; rows marked `always` are global. Exclude the
  deprecated-aliases table and explanatory examples; flag canonical/exported use
  only.
- **Wind-chain consistency** — if `windswept` triggers `vortex` somewhere, that
  settlement is not also written as `disorder`; a `contamination` reference is
  stated as the Windswept link.

Term additions and renames follow the normal docs flow under the GitHub
contribution policy. Renames update the glossary plus the deprecated-alias
table. `AGENTS.md` carries a one-line pointer naming this glossary as the
canonical source for ZZZ terminology.

## Acceptance

- [docs/references/glossary.md](../references/glossary.md) contains the
  canonical term data, organized by `category` / `subcategory` with boundary
  columns (`domain`, `surface`, `export`, `source`).
- This spec defines source priority, category boundaries, canonical table shape,
  `Notes / Exceptions`, `Needs Verification Review Queue`, naming conventions,
  needs-verify/source semantics, deprecated-alias policy, manual verification
  rules, and maintenance.
- `AGENTS.md` points to the glossary as the canonical terminology source.
- No package code, build, test, runtime behavior, or QA script is required by
  this spec.
- `git diff --check` succeeds and tracked Markdown links resolve.
