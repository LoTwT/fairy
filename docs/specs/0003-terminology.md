# 0003 — Terminology Glossary

Fairy models Zenless Zone Zero (ZZZ) combat. Its public surface — code identifiers,
config keys, data fields, log labels, and docs — must name game concepts the same way
every time. This spec defines the **terminology glossary** as the single source of truth
for that naming, and the rules that keep it consistent. The glossary data lives in
`docs/references/glossary.md`; this spec defines the system around it.

## Status

Current baseline. The glossary and these rules are documentation-level: they govern how
future product code, config, and docs name ZZZ concepts. They add no package code, build,
test, or runtime behavior. Automated enforcement (QA scripts) is intentionally deferred
(see Verification), because there is no product code or generated artifact to scan yet.

## Source priority

Chinese (`zh_cn_official`) and English (`en_official`) names are resolved in this order,
highest first:

1. **HoYo official announcements / visible in-game or official-site text** — authoritative
   for Simplified-Chinese names and version timing.
2. **Zenless Zone Zero Fandom official wiki** — stable English terms, change history,
   version-introduced timing, and mechanic chains.
3. **Prydwen** — cross-check for mechanic semantics, especially stats whose boundaries the
   community confuses (e.g. Anomaly Proficiency vs Anomaly Mastery).
4. **Engineering convention** — `code_identifier` recommendations (camelCase, etc.). These
   are maintenance rules for interface consistency, not official game text.

A name is only written into `zh_cn_official` when an official or visible in-game/official-site
source confirms it. If only English can be confirmed (wiki / Prydwen / English material) with
no stable official Chinese text, `zh_cn_official` is `待核验` (needs-verify); never invent a
Chinese name that merely looks official.

## Glossary organization & boundaries

The glossary is organized first by `subject_area`, then constrained by boundary columns.
`subject_area` is the human reading path: `common`, `agents`, `w-engines`, `drive-discs`,
`bangboo`, and `content`. These sections match the game/config objects developers look up
when naming fields.

Every term also has a `domain`, `code_surface`, and `export_policy`. These columns are the
core rule surface: **terms that are specific to one character, one equipment object, or one
version's content must never leak into the global combat/formula vocabulary.** Do not infer
formula/global-enum eligibility from a subject-area heading alone.

`domain` values:

- **damage-formula** — multipliers, resistances, defense, Daze/Impact, anomaly stats, Sheer
  Force/DMG — concepts with stable meaning for general damage calculation
  (e.g. `daze`, `damageBonus`, `defense`, `anomalyProficiency`, `anomalyMastery`, `impact`,
  `penRatio`, `penValue`, `sheerForce`, `sheerDamageBonus`).
- **attribute-anomaly** — attributes and anomaly mechanics themselves
  (e.g. `wind`, `windDamage`, `windswept`, `tempestCoefficient`, `contamination`, `vortex`,
  `disorder`, `abloom`). Globally referenceable.
- **character-mechanic** — resources, summons, and derived effects that hold only for a
  specific character (e.g. Velina's `windbloom`, `windbite`, `condensedCyclone`,
  `sweepingCyclone`, `chromaticTint`). May be referenced by logs/skill parsing, but must NOT
  enter the global formula table or global enums.
- **content** — character, faction, map, system, gear, and Bangboo names
  (e.g. `velinaAirgid`, `roscaelifer`, `externalStrategyDepartment`, `wutheringSalon`).
  Recorded, but kept out of the formula layer.
- **engineering-convention** — naming rules that exist purely for code clarity (below).

Worked example: `vortex` is a global anomaly mechanic (attribute-anomaly); `sweepingCyclone`
is Velina-only (character-mechanic); `roscaelifer` is a 3.0 city (content). All three are
kept, but their formula/config eligibility is controlled by `domain`, `code_surface`, and
`export_policy`, not by their section heading alone.

`code_surface` values describe where an identifier may appear: `formula-key`, `config-key`,
`enum-value`, `doc-only`, or `reserved`.

`export_policy` values describe how public the term may be: `exported`, `internal`,
`doc-only`, or `do-not-use`.

## Naming conventions (engineering-convention)

- `code_identifier` is **camelCase**.
- `DMG` stays abbreviated in display text, but expands to `damage` in identifiers
  (`damageBonus`, not `dmgBonus`).
- State names are decoupled from specialties: use `stunnedState`, not `stun`, for the
  Stunned state. `stun` is reserved for the agent-specialty only.
- Resource fields follow consistent shapes: `maxXxx`, `xxxGenerationRate`, `xxxBuildup`.
- Spelling is American English: `defense`, not `defence`.
- Three hard distinctions that recur across formula, config, and character text:
  - **Daze** (mechanic / meter, `daze`) → **Stunned** (state, `stunnedState`) → **Stun**
    (agent-specialty, `stun`). Three different things.
  - **Anomaly Proficiency** (`anomalyProficiency`, scales anomaly damage) ≠ **Anomaly Mastery**
    (`anomalyMastery`, scales buildup efficiency).
  - `damageBonus` (on the attacker) ≠ `damageTaken` (on the target).

## Source status & needs-verify

- `source_status` is `official`, `official-wiki`, or both — the term/mechanic itself always
  has a source.
- `待核验` (needs-verify) is a value of the `zh_cn_official` column, **not** of `source_status`:
  it means no stable official Chinese name is confirmed yet (the mechanic still has an English
  source). Such an entry must **never** be exported as official Chinese display text — internal
  reference / placeholder only.
- When official Chinese text is later confirmed, the entry's `zh_cn_official` is updated (and
  `source_status` only if its source actually changed).

## Deprecated aliases (do-not-use)

Deprecated aliases must not be used as canonical names anywhere — code, config, exported
fields, tests, or docs. The **canonical list lives in `docs/references/glossary.md`**
(§Deprecated aliases), kept there as data so it grows with the terms; this spec defines only
the policy. For orientation, the current set replaces: `boost` → `damageBonus`,
`defence` → `defense`, `stun`-for-Daze → `daze`, `staggered` → `stunnedState`,
`anomalyMastery`-for-异常精通 → `anomalyProficiency`, `disorder`-for-Wind → `vortex`,
`corruption`-for-Wind → `contamination`.

## Verification

These five checks define how the glossary stays correct. This round documents them as
enforcement rules; scripting is deferred until a consumer (product code / generated config)
exists to scan. Until then they are applied by manual review at the change gate.

- **Identifier uniqueness** — each public `code_identifier` appears once; one English canonical
  yields one public identifier.
- **Deprecated-alias scan** — no deprecated alias used as canonical in docs/config/fields/tests,
  excluding the deprecated-aliases table and explanatory examples; flag canonical/exported use only.
- **Boundary check** — `content` terms never use formula-key/global-enum surfaces;
  `character-mechanic` terms never appear in global enums without an explicit reuse reason;
  subject-area headings never override `domain`, `code_surface`, or `export_policy`.
- **needs-verify check** — no `zh_cn_official = 待核验` entry is exported as official Chinese text.
- **Wind-chain consistency** — if `windswept` triggers `vortex` somewhere, that settlement is
  not also written as `disorder`; a `contamination` reference is stated as the Windswept link.

## Maintenance & versioning

- `introduced_in` records the game version a term entered (e.g. `base`, `0.2.0`, `2.0`,
  `2.8`/`3.0`). New game versions add terms; entries are not removed when a version ages.
- Term additions/renames follow the normal docs flow (a spec/docs PR under the GitHub
  contribution policy). Renames update the glossary plus the deprecated-aliases section.
- `AGENTS.md` carries a one-line pointer naming this glossary as the canonical source for
  ZZZ terminology.

## Acceptance (this round)

- `docs/references/glossary.md` exists: all researched terms, cleaned of research-citation
  artifacts, organized by subject area (`common`, `agents`, `w-engines`, `drive-discs`,
  `bangboo`, `content`) with boundary columns (`domain`, `code_surface`, `export_policy`) and
  a deprecated-aliases section.
- This spec (`docs/specs/0003-terminology.md`) defines subject areas, boundary columns, naming
  conventions, source status / needs-verify, deprecated-alias policy, the five verification
  rules, and maintenance.
- `AGENTS.md` points to the glossary as the canonical terminology source.
- No package code, build, test, runtime behavior, or QA scripts are added.
- `git diff --check` succeeds; tracked Markdown links resolve.
