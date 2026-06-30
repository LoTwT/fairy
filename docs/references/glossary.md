# Terminology Glossary (data)

The canonical ZZZ term data for Fairy: every game concept that shows up in code
identifiers, config keys, data fields, log labels, or docs is named here once, with its
official Chinese/English names, the subject area it belongs to, the mechanic boundary it
must respect, and the non-canonical forms it must _not_ be confused with.

This file is **data**. The rules around it — source priority, layer definitions, naming
conventions, needs-verify policy, deprecated-alias policy, and the verification checks —
live in [`docs/specs/0003-terminology.md`](../specs/0003-terminology.md). When in doubt
about _why_ a term is named or placed a certain way, read the spec.

## How to read this glossary

The primary reading path is by **game/config subject area**:

| subject_area  | what it holds                                                               |
| ------------- | --------------------------------------------------------------------------- |
| `common`      | core combat, formulas, stats, attributes, anomalies, global enums           |
| `agents`      | playable agents, agent metadata, agent-only resources, summons, and effects |
| `w-engines`   | W-Engine names, requirements, effects, and equipment metadata               |
| `drive-discs` | Drive Disc names, stat slots, set names, and set effects                    |
| `bangboo`     | Bangboo names, skills, attributes, factions, and trigger conditions         |
| `content`     | locations, factions, systems, and proper nouns that are not combat fields   |

Each row also carries machine-checkable boundary columns:

- **domain** — the mechanic layer: `damage-formula`, `attribute-anomaly`,
  `agent-specialty`, `character-mechanic`, `content`, or `engineering-convention`.
- **code_surface** — where the identifier may appear: `formula-key`, `config-key`,
  `enum-value`, `doc-only`, or `reserved`.
- **export_policy** — how public the term is: `exported`, `internal`, `doc-only`, or
  `do-not-use`.

`subject_area` is for humans finding the right concept. `domain`, `code_surface`, and
`export_policy` are for reviews and future QA/lint rules. Do not infer formula/global-enum
eligibility from the section heading alone.

**Columns**

- **zh_cn_official / en_official** — official names. `待核验` (needs-verify) means no stable
  official Chinese text is confirmed yet; per the spec it must **never** be exported as
  official Chinese display text — internal reference / placeholder only.
- **code_identifier** — the one canonical name to use in code (camelCase). This is the
  column that becomes variable/field/key names. Rendered in `code` font.
- **introduced_in** — game version the term entered (`base`, `0.2.0`, `2.0`, `2.8`/`3.0`…).
- **source_status** — `official` (HoYo announcement / in-game / official site),
  `official-wiki` (Fandom official wiki), or both.
- **aliases / deprecated** — non-canonical forms; if it says “deprecated”, see the
  [Deprecated aliases](#deprecated-aliases-do-not-use) table — do not use it as canonical.
- **notes** — the boundary or convention that keeps the term from being misused.

---

## Common / Core Combat

Core combat, formula, stat, attribute, anomaly, and global enum vocabulary. This section is
safe to reference from shared formula/config/data panels only when `code_surface` and
`export_policy` allow it.

| subject_area | domain            | code_surface | export_policy | zh_cn_official | en_official                       | code_identifier                   | introduced_in              | source_status            | aliases / deprecated               | notes                                                                                                                                                                              |
| ------------ | ----------------- | ------------ | ------------- | -------------- | --------------------------------- | --------------------------------- | -------------------------- | ------------------------ | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| common       | damage-formula    | formula-key  | exported      | 失衡           | Daze                              | `daze`                            | base                       | official-wiki            | `stun` (deprecated for this sense) | Daze is the meter/mechanic; an enemy enters Stunned only at 100% Daze. Official zh has long used 失衡状态/失衡值. `stun` is reserved for the specialty — do not use it for Daze.   |
| common       | damage-formula    | enum-value   | exported      | 待核验         | Stunned                           | `stunnedState`                    | base                       | official-wiki            | `dazed`, `staggered`               | The _state_, not the specialty and not Daze itself. Use `stunnedState` to avoid clashing with specialty `stun`.                                                                    |
| common       | damage-formula    | formula-key  | exported      | 待核验         | DMG Bonus                         | `damageBonus`                     | base                       | official-wiki            | `boost`, `dmgBonus`                | Formula page has a DMG Bonus Multiplier; surface zh text varies (造成的伤害提升 / X属性伤害加成), so zh stays needs-verify. Standardize on `damageBonus`; never `boost`.           |
| common       | damage-formula    | formula-key  | exported      | 防御力         | DEF / Defense                     | `defense`                         | base                       | official                 | `defence`                          | Formula page uses a DEF Multiplier; official zh is 防御力. Use American spelling `defense`.                                                                                        |
| common       | damage-formula    | formula-key  | exported      | 异常精通       | Anomaly Proficiency               | `anomalyProficiency`              | 0.2.0                      | official                 | misused `anomalyMastery`           | Scales attribute-anomaly **damage**. Strictly distinct from Anomaly Mastery. Official zh: 异常精通.                                                                                |
| common       | damage-formula    | formula-key  | exported      | 异常掌控       | Anomaly Mastery                   | `anomalyMastery`                  | 0.2.0                      | official                 | misused for 异常精通               | Scales anomaly **buildup efficiency** — not the same as Anomaly Proficiency. Official zh: 异常掌控.                                                                                |
| common       | damage-formula    | formula-key  | exported      | 失衡易伤倍率   | Stunned Multiplier                | `dazeVulnerability`               | base                       | official-wiki            | `stunVulnerability`                | Formula page lists a Stunned Multiplier. `dazeVulnerability` stresses it comes from the Daze→Stunned mechanic, not the specialty.                                                  |
| common       | damage-formula    | formula-key  | exported      | 待核验         | DMG Taken                         | `damageTaken`                     | base                       | official-wiki            | do not merge into `damageBonus`    | DMG Taken sits on the target; DMG Bonus sits on the attacker — two separate concepts.                                                                                              |
| common       | damage-formula    | formula-key  | exported      | 冲击力         | Impact                            | `impact`                          | base                       | official-wiki            | —                                  | Daze accumulation is tied directly to Impact.                                                                                                                                      |
| common       | damage-formula    | formula-key  | exported      | 贯穿率         | PEN Ratio                         | `penRatio`                        | base                       | official-wiki            | —                                  | The DEF formula depends explicitly on PEN Ratio.                                                                                                                                   |
| common       | damage-formula    | formula-key  | exported      | 贯穿值         | PEN                               | `penValue`                        | base                       | official-wiki            | bare `pen`                         | Use `penValue` to avoid abbreviation ambiguity; `PEN` stays as display text in prose.                                                                                              |
| common       | damage-formula    | reserved     | internal      | 喧响值         | Decibel Rating                    | `decibelRating`                   | base                       | official-wiki            | `decibel`                          | Use `decibelRating` for a UI resource slot; a local `decibel` shorthand is acceptable only in strong combat-resource context. Reserved for now, not a public API.                  |
| common       | damage-formula    | formula-key  | exported      | 贯穿力         | Sheer Force                       | `sheerForce`                      | 2.0                        | official-wiki            | —                                  | Added in 2.0 (Stats change history); official-wiki zh 贯穿力. Core stat of the Rupture/命破 system.                                                                                |
| common       | damage-formula    | formula-key  | exported      | 贯穿伤害加成   | Sheer DMG Bonus                   | `sheerDamageBonus`                | 2.0                        | official-wiki            | `sheerBoost`                       | Added in 2.0; zh 贯穿伤害提升.                                                                                                                                                     |
| common       | damage-formula    | reserved     | internal      | 待核验         | Adrenaline                        | `adrenaline`                      | 2.0                        | official-wiki            | —                                  | Added in 2.0; stable zh name not sufficiently confirmed. Reserved until a product surface needs it.                                                                                |
| common       | damage-formula    | reserved     | internal      | 待核验         | Automatic Adrenaline Accumulation | `automaticAdrenalineAccumulation` | 2.0                        | official-wiki            | no ad-hoc abbreviation             | Added in 2.0; keep the full name, don't fold into an opaque abbreviation. Reserved until a product surface needs it.                                                               |
| common       | damage-formula    | reserved     | internal      | 待核验         | Adrenaline Generation Rate        | `adrenalineGenerationRate`        | 2.0                        | official-wiki            | —                                  | Mirrors Energy Generation Rate; keep the full name. Reserved until a product surface needs it.                                                                                     |
| common       | damage-formula    | reserved     | internal      | 待核验         | Max Adrenaline                    | `maxAdrenaline`                   | 2.0                        | official-wiki            | —                                  | Resource-cap field; align with `maxEnergy`-style naming. Reserved until a product surface needs it.                                                                                |
| common       | attribute-anomaly | enum-value   | exported      | 物理           | Physical                          | `physical`                        | base                       | official                 | —                                  | Regular attribute.                                                                                                                                                                 |
| common       | attribute-anomaly | enum-value   | exported      | 火             | Fire                              | `fire`                            | base                       | official                 | —                                  | Regular attribute.                                                                                                                                                                 |
| common       | attribute-anomaly | enum-value   | exported      | 冰             | Ice                               | `ice`                             | base                       | official                 | —                                  | Regular attribute.                                                                                                                                                                 |
| common       | attribute-anomaly | enum-value   | exported      | 电             | Electric                          | `electric`                        | base                       | official                 | —                                  | Regular attribute.                                                                                                                                                                 |
| common       | attribute-anomaly | enum-value   | exported      | 以太           | Ether                             | `ether`                           | 0.2.0                      | official                 | —                                  | Ether DMG Bonus added in 0.2.0.                                                                                                                                                    |
| common       | attribute-anomaly | enum-value   | exported      | 风             | Wind                              | `wind`                            | 2.8 readded / 3.0 playable | official                 | —                                  | Re-added in 2.8; first playable Wind agent (Velina) in 3.0.                                                                                                                        |
| common       | attribute-anomaly | enum-value   | exported      | 烈霜           | Frost                             | `frost`                           | 1.4                        | official                 | —                                  | Special attribute; settles on the Ice side for bonus/resistance, but has its own anomaly-buildup gauge.                                                                            |
| common       | attribute-anomaly | enum-value   | exported      | 凛刃           | Honed Edge                        | `honedEdge`                       | 2.5                        | official                 | —                                  | Special attribute; damage/buffs settle on the Physical side, but anomaly buildup is computed separately from Physical.                                                             |
| common       | attribute-anomaly | enum-value   | exported      | 玄墨           | Auric Ink                         | `auricInk`                        | 2.0                        | official                 | —                                  | Special attribute; equivalent to Ether but with its own anomaly-buildup gauge; can trigger Disorder together with Ether.                                                           |
| common       | attribute-anomaly | enum-value   | exported      | 属性异常       | Attribute Anomaly                 | `attributeAnomaly`                | base                       | official-wiki            | bare `anomaly`                     | Spell out `attributeAnomaly` outside the anomaly domain; a local `anomaly` shorthand is fine only in strong context.                                                               |
| common       | attribute-anomaly | formula-key  | exported      | 属性异常积蓄值 | Anomaly Buildup                   | `anomalyBuildup`                  | base                       | official                 | —                                  | The umbrella concept above every anomaly chain.                                                                                                                                    |
| common       | attribute-anomaly | enum-value   | exported      | 紊乱           | Disorder                          | `disorder`                        | base                       | official                 | not the same as `vortex`           | The normal anomaly-replacement settlement. In the Wind chain it is replaced by Vortex (see deprecated table).                                                                      |
| common       | attribute-anomaly | enum-value   | exported      | 待核验         | Windswept                         | `windswept`                       | 2.8-3.0                    | official-wiki            | not a generic “wind status”        | The Wind anomaly state; stable official zh not yet confirmed.                                                                                                                      |
| common       | attribute-anomaly | formula-key  | exported      | 风属性伤害     | Wind DMG                          | `windDamage`                      | 2.8-3.0                    | official                 | —                                  | 3.0 announcement: 风属性伤害加成. A player-facing damage category.                                                                                                                 |
| common       | attribute-anomaly | formula-key  | exported      | 待核验         | Wind Anomaly Buildup              | `windAnomalyBuildup`              | 2.8-3.0                    | official-wiki            | —                                  | Wind DMG produces Wind Anomaly Buildup; stable zh not yet confirmed.                                                                                                               |
| common       | attribute-anomaly | formula-key  | exported      | 待核验         | Tempest Coefficient               | `tempestCoefficient`              | 2.8-3.0                    | official-wiki            | —                                  | The amplification coefficient for Windswept and Contamination; the identifier is an engineering convention.                                                                        |
| common       | attribute-anomaly | enum-value   | exported      | 待核验         | Contamination                     | `contamination`                   | 2.8-3.0                    | official-wiki            | wrong `corruption`                 | Triggers on the first direct Fire/Ice/Electric/Physical/Ether hit while Windswept; do not write it as Corruption (an Ether anomaly).                                               |
| common       | attribute-anomaly | enum-value   | exported      | 乱流           | Vortex                            | `vortex`                          | 2.8-3.0                    | official                 | wrong `disorder`                   | 3.0 zh announcement shows 乱流. When one existing anomaly is Windswept, normal Disorder does not trigger — Vortex does.                                                            |
| common       | attribute-anomaly | formula-key  | exported      | 待核验         | Vortex DMG                        | `vortexDamage`                    | 2.8-3.0                    | official-wiki            | —                                  | Model independently; do not merge into normal Disorder DMG.                                                                                                                        |
| common       | attribute-anomaly | formula-key  | exported      | 异放           | Abloom                            | `abloom`                          | 1.7                        | official + official-wiki | —                                  | A cross-character, reusable extra-anomaly settlement. 3.0 only routes it into the new Wind chain (see Agents); not a first appearance. For a damage-log field, add `abloomDamage`. |

---

## Agents

Playable agent names, agent metadata, agent specialties, and agent-only mechanics.
Agent-only mechanics may be referenced by logs and skill parsing, but must not enter
global formula tables or global enums unless a later spec explicitly promotes them.

| subject_area | domain             | code_surface | export_policy | zh_cn_official | en_official       | code_identifier    | introduced_in | source_status | aliases / deprecated | notes                                                                                                                             |
| ------------ | ------------------ | ------------ | ------------- | -------------- | ----------------- | ------------------ | ------------- | ------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| agents       | content            | config-key   | exported      | 维琳娜·艾嘉德  | Velina Airgid     | `velinaAirgid`     | 3.0           | official      | —                    | S-rank Wind / Anomaly agent.                                                                                                      |
| agents       | content            | config-key   | exported      | 诺姆·霍洛维尔  | Norma Hollowell   | `normaHollowell`   | 3.0           | official      | —                    | 3.0 version page: S-rank Fire / Stun.                                                                                             |
| agents       | content            | config-key   | exported      | 佩洛伊斯       | Pyrois            | `pyrois`           | 3.0           | official      | —                    | 3.0 version page: A-rank Ether / Attack.                                                                                          |
| agents       | agent-specialty    | enum-value   | exported      | 击破           | Stun              | `stun`             | 0.3.0         | official-wiki | —                    | Agent-specialty enum only (e.g. 击破·电, 物理·击破); not the Daze mechanic, not the Stunned state, and not a damage-formula term. |
| agents       | character-mechanic | doc-only     | internal      | 待核验         | Windbloom         | `windbloom`        | 3.0           | official-wiki | —                    | Velina-only resource; gained on entry and from specific EX skills; max 135.                                                       |
| agents       | character-mechanic | doc-only     | internal      | 待核验         | Windbite          | `windbite`         | 3.0           | official-wiki | —                    | Gained after Velina triggers Vortex; also the name of a skill-upgrade chip material.                                              |
| agents       | character-mechanic | doc-only     | internal      | 待核验         | Condensed Cyclone | `condensedCyclone` | 3.0           | official-wiki | —                    | The cyclone Velina summons when triggering Vortex; do not place into the global damage-formula base table.                        |
| agents       | character-mechanic | doc-only     | internal      | 待核验         | Sweeping Cyclone  | `sweepingCyclone`  | 3.0           | official-wiki | —                    | The enhanced cyclone after consuming 2 Windbite; can trigger Chromatic Tint and apply extra anomaly-buildup resistance reduction. |
| agents       | character-mechanic | doc-only     | internal      | 待核验         | Chromatic Tint    | `chromaticTint`    | 3.0           | official-wiki | —                    | Triggers when Sweeping Cyclone first hits an enemy under Contamination, converting the cyclone to the matching attribute.         |

> Velina's Condensed/Sweeping Cyclone dissipation explosions can trigger `abloom` — but
> `abloom` is a cross-character reusable term and lives in **Common / Core Combat**, not
> here, so it is not duplicated as an agent-mechanic row.

---

## W-Engines

W-Engine names, specialty requirements, effects, and equipment metadata. These are content
or config terms; they are not formula vocabulary unless a future equipment schema gives
their effects dedicated fields.

| subject_area | domain  | code_surface | export_policy | zh_cn_official | en_official    | code_identifier | introduced_in | source_status | aliases / deprecated | notes                                                              |
| ------------ | ------- | ------------ | ------------- | -------------- | -------------- | --------------- | ------------- | ------------- | -------------------- | ------------------------------------------------------------------ |
| w-engines    | content | config-key   | exported      | 琳琅鎏心       | Joyau Dore     | `joyauDore`     | 3.0           | official      | —                    | 3.0 content lineup: 琳琅鎏心(异常).                                |
| w-engines    | content | config-key   | exported      | 待核验         | Chief Sidekick | `chiefSidekick` | 3.0           | official-wiki | —                    | Version page confirms English name and specialty; zh needs-verify. |
| w-engines    | content | config-key   | exported      | 待核验         | Sol Exuvia     | `solExuvia`     | 3.0           | official-wiki | —                    | Version page confirms English name; zh needs-verify.               |

---

## Drive Discs

Drive Disc set names, stat slots, set effects, and equipment metadata.

| subject_area | domain  | code_surface | export_policy | zh_cn_official | en_official     | code_identifier  | introduced_in | source_status | aliases / deprecated | notes                               |
| ------------ | ------- | ------------ | ------------- | -------------- | --------------- | ---------------- | ------------- | ------------- | -------------------- | ----------------------------------- |
| drive-discs  | content | config-key   | exported      | 待核验         | Wuthering Salon | `wutheringSalon` | 3.0           | official-wiki | —                    | One of the Wind-system drive disks. |
| drive-discs  | content | config-key   | exported      | 待核验         | The Sky Ablaze  | `theSkyAblaze`   | 3.0           | official-wiki | —                    | A new 3.0 drive disk.               |

---

## Bangboo

Bangboo names, skills, attributes, faction/team conditions, and Bangboo-only effects.

| subject_area | domain  | code_surface | export_policy | zh_cn_official | en_official | code_identifier | introduced_in | source_status | aliases / deprecated | notes              |
| ------------ | ------- | ------------ | ------------- | -------------- | ----------- | --------------- | ------------- | ------------- | -------------------- | ------------------ |
| bangboo      | content | config-key   | exported      | 待核验         | Ultra Jake  | `ultraJake`     | 3.0           | official-wiki | —                    | A new 3.0 Bangboo. |

---

## Content

Locations, factions, systems, and proper nouns that need stable metadata names but must not
leak into formula fields.

| subject_area | domain  | code_surface | export_policy | zh_cn_official | en_official                  | code_identifier              | introduced_in | source_status | aliases / deprecated | notes                                                              |
| ------------ | ------- | ------------ | ------------- | -------------- | ---------------------------- | ---------------------------- | ------------- | ------------- | -------------------- | ------------------------------------------------------------------ |
| content      | content | config-key   | exported      | 外务筹策局     | External Strategy Department | `externalStrategyDepartment` | 3.0           | official      | —                    | Velina and Norma belong to this faction; agent-metadata / content. |
| content      | content | config-key   | exported      | 罗斯凯利法     | Roscaelifer                  | `roscaelifer`                | 3.0           | official      | —                    | The new Season-3 hub city; scene/content layer.                    |
| content      | content | config-key   | exported      | 待核验         | Booastrum                    | `booastrum`                  | 3.0           | official-wiki | —                    | A new city within Roscaelifer; stable zh not yet confirmed.        |
| content      | content | config-key   | exported      | 待核验         | Central Computing Department | `centralComputingDepartment` | 3.0           | official-wiki | —                    | New area name.                                                     |
| content      | content | config-key   | exported      | 待核验         | Sunken Corridor              | `sunkenCorridor`             | 3.0           | official-wiki | —                    | New area name.                                                     |
| content      | content | config-key   | exported      | 待核验         | Energy Hub                   | `energyHub`                  | 3.0           | official-wiki | —                    | New area name.                                                     |

---

## Deprecated aliases (do-not-use)

These forms must **not** be used as canonical names anywhere — code, config, exported
fields, tests, or docs. This table is the future scan source for globally banned aliases.
The `aliases / deprecated` cells above may also record weak aliases, source wording, or
contextual shorthands; only table entries are global scan targets.

| deprecated                       | replace_with         | reason                                                                                |
| -------------------------------- | -------------------- | ------------------------------------------------------------------------------------- |
| `boost`                          | `damageBonus`        | DMG Bonus is the canonical that matches the formula/data pages; `boost` is too vague. |
| `dmgBonus`                       | `damageBonus`        | Display text may keep DMG; identifiers spell out `damage`.                            |
| `defence`                        | `defense`            | One American spelling, no synonyms.                                                   |
| `stun` (for the Daze mechanic)   | `daze`               | `stun` is reserved for the specialty; the mechanic itself is `daze`.                  |
| `dazed`                          | `stunnedState`       | Avoid extra state synonyms; the state identifier is `stunnedState`.                   |
| `staggered`                      | `stunnedState`       | Avoid extra community synonyms; the official context is Daze → Stunned.               |
| `stunVulnerability`              | `dazeVulnerability`  | The vulnerability comes from the Daze → Stunned mechanic, not the Stun specialty.     |
| `anomalyMastery` (for 异常精通)  | `anomalyProficiency` | Different stats — Mastery scales buildup, Proficiency scales anomaly damage.          |
| `sheerBoost`                     | `sheerDamageBonus`   | Use the explicit Sheer DMG Bonus identifier, not a generic boost.                     |
| `disorder` (for the Wind chain)  | `vortex`             | With Windswept active, normal Disorder does not trigger; Vortex does.                 |
| `corruption` (for the Wind link) | `contamination`      | Corruption is an Ether anomaly; Contamination is the Windswept cross-attribute link.  |
