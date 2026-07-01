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

- **identifier** — the canonical camelCase code identifier used for keys, variables,
  config keys, enum values, data fields, and log labels. Rendered in `code` font.
- **zh / en** — official names. `待核验` (needs-verify) means no stable official Chinese
  text is confirmed yet; per the spec it must **never** be exported as official Chinese
  display text — internal reference / placeholder only.
- **subject_area / domain / code_surface / export_policy** — reading path and boundary
  controls for reviews and future QA/lint rules.
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

| identifier                        | zh             | en                                | subject_area | domain            | code_surface | export_policy | introduced_in              | source_status            | aliases / deprecated               | notes                                                                                                                                                                              |
| --------------------------------- | -------------- | --------------------------------- | ------------ | ----------------- | ------------ | ------------- | -------------------------- | ------------------------ | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `daze`                            | 失衡           | Daze                              | common       | damage-formula    | formula-key  | exported      | base                       | official-wiki            | `stun` (deprecated for this sense) | Daze is the meter/mechanic; an enemy enters Stunned only at 100% Daze. Official zh has long used 失衡状态/失衡值. `stun` is reserved for the specialty — do not use it for Daze.   |
| `stunnedState`                    | 待核验         | Stunned                           | common       | damage-formula    | enum-value   | exported      | base                       | official-wiki            | `dazed`, `staggered`               | The _state_, not the specialty and not Daze itself. Use `stunnedState` to avoid clashing with specialty `stun`.                                                                    |
| `damageBonus`                     | 待核验         | DMG Bonus                         | common       | damage-formula    | formula-key  | exported      | base                       | official-wiki            | `boost`, `dmgBonus`                | Formula page has a DMG Bonus Multiplier; surface zh text varies (造成的伤害提升 / X属性伤害加成), so zh stays needs-verify. Standardize on `damageBonus`; never `boost`.           |
| `defense`                         | 防御力         | DEF / Defense                     | common       | damage-formula    | formula-key  | exported      | base                       | official                 | `defence`                          | Formula page uses a DEF Multiplier; official zh is 防御力. Use American spelling `defense`.                                                                                        |
| `anomalyProficiency`              | 异常精通       | Anomaly Proficiency               | common       | damage-formula    | formula-key  | exported      | 0.2.0                      | official                 | misused `anomalyMastery`           | Scales attribute-anomaly **damage**. Strictly distinct from Anomaly Mastery. Official zh: 异常精通.                                                                                |
| `anomalyMastery`                  | 异常掌控       | Anomaly Mastery                   | common       | damage-formula    | formula-key  | exported      | 0.2.0                      | official                 | misused for 异常精通               | Scales anomaly **buildup efficiency** — not the same as Anomaly Proficiency. Official zh: 异常掌控.                                                                                |
| `dazeVulnerability`               | 失衡易伤倍率   | Stunned Multiplier                | common       | damage-formula    | formula-key  | exported      | base                       | official-wiki            | `stunVulnerability`                | Formula page lists a Stunned Multiplier. `dazeVulnerability` stresses it comes from the Daze→Stunned mechanic, not the specialty.                                                  |
| `damageTaken`                     | 待核验         | DMG Taken                         | common       | damage-formula    | formula-key  | exported      | base                       | official-wiki            | do not merge into `damageBonus`    | DMG Taken sits on the target; DMG Bonus sits on the attacker — two separate concepts.                                                                                              |
| `impact`                          | 冲击力         | Impact                            | common       | damage-formula    | formula-key  | exported      | base                       | official-wiki            | —                                  | Daze accumulation is tied directly to Impact.                                                                                                                                      |
| `penRatio`                        | 贯穿率         | PEN Ratio                         | common       | damage-formula    | formula-key  | exported      | base                       | official-wiki            | —                                  | The DEF formula depends explicitly on PEN Ratio.                                                                                                                                   |
| `penValue`                        | 贯穿值         | PEN                               | common       | damage-formula    | formula-key  | exported      | base                       | official-wiki            | bare `pen`                         | Use `penValue` to avoid abbreviation ambiguity; `PEN` stays as display text in prose.                                                                                              |
| `decibelRating`                   | 喧响值         | Decibel Rating                    | common       | damage-formula    | reserved     | internal      | base                       | official-wiki            | `decibel`                          | Use `decibelRating` for a UI resource slot; a local `decibel` shorthand is acceptable only in strong combat-resource context. Reserved for now, not a public API.                  |
| `sheerForce`                      | 贯穿力         | Sheer Force                       | common       | damage-formula    | formula-key  | exported      | 2.0                        | official-wiki            | —                                  | Added in 2.0 (Stats change history); official-wiki zh 贯穿力. Core stat of the Rupture/命破 system.                                                                                |
| `sheerDamageBonus`                | 贯穿伤害加成   | Sheer DMG Bonus                   | common       | damage-formula    | formula-key  | exported      | 2.0                        | official-wiki            | `sheerBoost`                       | Added in 2.0; zh 贯穿伤害提升.                                                                                                                                                     |
| `adrenaline`                      | 闪能           | Adrenaline                        | common       | damage-formula    | reserved     | internal      | 2.0                        | official-wiki            | —                                  | Added in 2.0; Reserved until a product surface needs it.                                                                                                                           |
| `automaticAdrenalineAccumulation` | 闪能自动累积   | Automatic Adrenaline Accumulation | common       | damage-formula    | reserved     | internal      | 2.0                        | official-wiki            | no ad-hoc abbreviation             | Added in 2.0; keep the full name, don't fold into an opaque abbreviation. Reserved until a product surface needs it.                                                               |
| `adrenalineGenerationRate`        | 闪能获得效率   | Adrenaline Generation Rate        | common       | damage-formula    | reserved     | internal      | 2.0                        | official-wiki            | —                                  | Mirrors Energy Generation Rate; keep the full name. Reserved until a product surface needs it.                                                                                     |
| `maxAdrenaline`                   | 闪能最大值     | Max Adrenaline                    | common       | damage-formula    | reserved     | internal      | 2.0                        | official-wiki            | —                                  | Resource-cap field; align with `maxEnergy`-style naming. Reserved until a product surface needs it.                                                                                |
| `physical`                        | 物理           | Physical                          | common       | attribute-anomaly | enum-value   | exported      | base                       | official                 | —                                  | Regular attribute.                                                                                                                                                                 |
| `fire`                            | 火             | Fire                              | common       | attribute-anomaly | enum-value   | exported      | base                       | official                 | —                                  | Regular attribute.                                                                                                                                                                 |
| `ice`                             | 冰             | Ice                               | common       | attribute-anomaly | enum-value   | exported      | base                       | official                 | —                                  | Regular attribute.                                                                                                                                                                 |
| `electric`                        | 电             | Electric                          | common       | attribute-anomaly | enum-value   | exported      | base                       | official                 | —                                  | Regular attribute.                                                                                                                                                                 |
| `ether`                           | 以太           | Ether                             | common       | attribute-anomaly | enum-value   | exported      | 0.2.0                      | official                 | —                                  | Ether DMG Bonus added in 0.2.0.                                                                                                                                                    |
| `wind`                            | 风             | Wind                              | common       | attribute-anomaly | enum-value   | exported      | 2.8 readded / 3.0 playable | official                 | —                                  | Re-added in 2.8; first playable Wind agent (Velina) in 3.0.                                                                                                                        |
| `frost`                           | 烈霜           | Frost                             | common       | attribute-anomaly | enum-value   | exported      | 1.4                        | official                 | —                                  | Special attribute; settles on the Ice side for bonus/resistance, but has its own anomaly-buildup gauge.                                                                            |
| `honedEdge`                       | 凛刃           | Honed Edge                        | common       | attribute-anomaly | enum-value   | exported      | 2.5                        | official                 | —                                  | Special attribute; damage/buffs settle on the Physical side, but anomaly buildup is computed separately from Physical.                                                             |
| `auricInk`                        | 玄墨           | Auric Ink                         | common       | attribute-anomaly | enum-value   | exported      | 2.0                        | official                 | —                                  | Special attribute; equivalent to Ether but with its own anomaly-buildup gauge; can trigger Disorder together with Ether.                                                           |
| `attributeAnomaly`                | 属性异常       | Attribute Anomaly                 | common       | attribute-anomaly | enum-value   | exported      | base                       | official-wiki            | bare `anomaly`                     | Spell out `attributeAnomaly` outside the anomaly domain; a local `anomaly` shorthand is fine only in strong context.                                                               |
| `anomalyBuildup`                  | 属性异常积蓄值 | Anomaly Buildup                   | common       | attribute-anomaly | formula-key  | exported      | base                       | official                 | —                                  | The umbrella concept above every anomaly chain.                                                                                                                                    |
| `disorder`                        | 紊乱           | Disorder                          | common       | attribute-anomaly | enum-value   | exported      | base                       | official                 | not the same as `vortex`           | The normal anomaly-replacement settlement. In the Wind chain it is replaced by Vortex (see deprecated table).                                                                      |
| `windswept`                       | 风化           | Windswept                         | common       | attribute-anomaly | enum-value   | exported      | 2.8-3.0                    | official-wiki            | not a generic “wind status”        | The Wind anomaly state.                                                                                                                                                            |
| `windDamage`                      | 风属性伤害     | Wind DMG                          | common       | attribute-anomaly | formula-key  | exported      | 2.8-3.0                    | official                 | —                                  | 3.0 announcement: 风属性伤害加成. A player-facing damage category.                                                                                                                 |
| `windAnomalyBuildup`              | 待核验         | Wind Anomaly Buildup              | common       | attribute-anomaly | formula-key  | exported      | 2.8-3.0                    | official-wiki            | —                                  | Wind DMG produces Wind Anomaly Buildup; stable zh not yet confirmed.                                                                                                               |
| `tempestCoefficient`              | 待核验         | Tempest Coefficient               | common       | attribute-anomaly | formula-key  | exported      | 2.8-3.0                    | official-wiki            | —                                  | The amplification coefficient for Windswept and Contamination; the identifier is an engineering convention.                                                                        |
| `contamination`                   | 浸染           | Contamination                     | common       | attribute-anomaly | enum-value   | exported      | 2.8-3.0                    | official-wiki            | wrong `corruption`                 | Triggers on the first direct Fire/Ice/Electric/Physical/Ether hit while Windswept; do not write it as Corruption (an Ether anomaly).                                               |
| `vortex`                          | 乱流           | Vortex                            | common       | attribute-anomaly | enum-value   | exported      | 2.8-3.0                    | official                 | wrong `disorder`                   | 3.0 zh announcement shows 乱流. When one existing anomaly is Windswept, normal Disorder does not trigger — Vortex does.                                                            |
| `vortexDamage`                    | 乱流伤害       | Vortex DMG                        | common       | attribute-anomaly | formula-key  | exported      | 2.8-3.0                    | official-wiki            | —                                  | Model independently; do not merge into normal Disorder DMG.                                                                                                                        |
| `abloom`                          | 异放           | Abloom                            | common       | attribute-anomaly | formula-key  | exported      | 1.7                        | official + official-wiki | —                                  | A cross-character, reusable extra-anomaly settlement. 3.0 only routes it into the new Wind chain (see Agents); not a first appearance. For a damage-log field, add `abloomDamage`. |

---

## Agents

Playable agent names, agent metadata, agent specialties, and agent-only mechanics.
Agent-only mechanics may be referenced by logs and skill parsing, but must not enter
global formula tables or global enums unless a later spec explicitly promotes them.

| identifier         | zh            | en                | subject_area | domain             | code_surface | export_policy | introduced_in | source_status | aliases / deprecated | notes                                                                                                                             |
| ------------------ | ------------- | ----------------- | ------------ | ------------------ | ------------ | ------------- | ------------- | ------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `velinaAirgid`     | 维琳娜·艾嘉德 | Velina Airgid     | agents       | content            | config-key   | exported      | 3.0           | official      | —                    | S-rank Wind / Anomaly agent.                                                                                                      |
| `normaHollowell`   | 诺姆·霍洛维尔 | Norma Hollowell   | agents       | content            | config-key   | exported      | 3.0           | official      | —                    | 3.0 version page: S-rank Fire / Stun.                                                                                             |
| `pyrois`           | 佩洛伊斯      | Pyrois            | agents       | content            | config-key   | exported      | 3.0           | official      | —                    | 3.0 version page: A-rank Ether / Attack.                                                                                          |
| `stun`             | 击破          | Stun              | agents       | agent-specialty    | enum-value   | exported      | 0.3.0         | official-wiki | —                    | Agent-specialty enum only (e.g. 击破·电, 物理·击破); not the Daze mechanic, not the Stunned state, and not a damage-formula term. |
| `windbloom`        | 风华          | Windbloom         | agents       | character-mechanic | doc-only     | internal      | 3.0           | official-wiki | —                    | Velina-only resource; gained on entry and from specific EX skills; max 135.                                                       |
| `windbite`         | 风蚀          | Windbite          | agents       | character-mechanic | doc-only     | internal      | 3.0           | official-wiki | —                    | Gained after Velina triggers Vortex; also the name of a skill-upgrade chip material.                                              |
| `condensedCyclone` | 微域气旋      | Condensed Cyclone | agents       | character-mechanic | doc-only     | internal      | 3.0           | official-wiki | —                    | The cyclone Velina summons when triggering Vortex; do not place into the global damage-formula base table.                        |
| `sweepingCyclone`  | 广域气旋      | Sweeping Cyclone  | agents       | character-mechanic | doc-only     | internal      | 3.0           | official-wiki | —                    | The enhanced cyclone after consuming 2 Windbite; can trigger Chromatic Tint and apply extra anomaly-buildup resistance reduction. |
| `chromaticTint`    | 赋彩          | Chromatic Tint    | agents       | character-mechanic | doc-only     | internal      | 3.0           | official-wiki | —                    | Triggers when Sweeping Cyclone first hits an enemy under Contamination, converting the cyclone to the matching attribute.         |

> Velina's Condensed/Sweeping Cyclone dissipation explosions can trigger `abloom` — but
> `abloom` is a cross-character reusable term and lives in **Common / Core Combat**, not
> here, so it is not duplicated as an agent-mechanic row.

---

## W-Engines

W-Engine names, specialty requirements, effects, and equipment metadata. These are content
or config terms; they are not formula vocabulary unless a future equipment schema gives
their effects dedicated fields.

| identifier      | zh       | en             | subject_area | domain  | code_surface | export_policy | introduced_in | source_status | aliases / deprecated | notes                                                              |
| --------------- | -------- | -------------- | ------------ | ------- | ------------ | ------------- | ------------- | ------------- | -------------------- | ------------------------------------------------------------------ |
| `joyauDore`     | 琳琅鎏心 | Joyau Dore     | w-engines    | content | config-key   | exported      | 3.0           | official      | —                    | 3.0 content lineup: 琳琅鎏心(异常).                                |
| `chiefSidekick` | 待核验   | Chief Sidekick | w-engines    | content | config-key   | exported      | 3.0           | official-wiki | —                    | Version page confirms English name and specialty; zh needs-verify. |
| `solExuvia`     | 待核验   | Sol Exuvia     | w-engines    | content | config-key   | exported      | 3.0           | official-wiki | —                    | Version page confirms English name; zh needs-verify.               |

---

## Drive Discs

Drive Disc set names, stat slots, set effects, and equipment metadata.

| identifier       | zh     | en              | subject_area | domain  | code_surface | export_policy | introduced_in | source_status | aliases / deprecated | notes                               |
| ---------------- | ------ | --------------- | ------------ | ------- | ------------ | ------------- | ------------- | ------------- | -------------------- | ----------------------------------- |
| `wutheringSalon` | 待核验 | Wuthering Salon | drive-discs  | content | config-key   | exported      | 3.0           | official-wiki | —                    | One of the Wind-system drive disks. |
| `theSkyAblaze`   | 待核验 | The Sky Ablaze  | drive-discs  | content | config-key   | exported      | 3.0           | official-wiki | —                    | A new 3.0 drive disk.               |

---

## Bangboo

Bangboo names, skills, attributes, faction/team conditions, and Bangboo-only effects.

| identifier  | zh       | en         | subject_area | domain  | code_surface | export_policy | introduced_in | source_status | aliases / deprecated | notes              |
| ----------- | -------- | ---------- | ------------ | ------- | ------------ | ------------- | ------------- | ------------- | -------------------- | ------------------ |
| `ultraJake` | 超极杰克 | Ultra Jake | bangboo      | content | config-key   | exported      | 3.0           | official-wiki | —                    | A new 3.0 Bangboo. |

---

## Content

Locations, factions, systems, and proper nouns that need stable metadata names but must not
leak into formula fields.

| identifier                   | zh         | en                           | subject_area | domain  | code_surface | export_policy | introduced_in | source_status | aliases / deprecated | notes                                                              |
| ---------------------------- | ---------- | ---------------------------- | ------------ | ------- | ------------ | ------------- | ------------- | ------------- | -------------------- | ------------------------------------------------------------------ |
| `externalStrategyDepartment` | 外务筹策局 | External Strategy Department | content      | content | config-key   | exported      | 3.0           | official      | —                    | Velina and Norma belong to this faction; agent-metadata / content. |
| `roscaelifer`                | 罗斯凯利法 | Roscaelifer                  | content      | content | config-key   | exported      | 3.0           | official      | —                    | The new Season-3 hub city; scene/content layer.                    |
| `booastrum`                  | 待核验     | Booastrum                    | content      | content | config-key   | exported      | 3.0           | official-wiki | —                    | A new city within Roscaelifer; stable zh not yet confirmed.        |
| `centralComputingDepartment` | 待核验     | Central Computing Department | content      | content | config-key   | exported      | 3.0           | official-wiki | —                    | New area name.                                                     |
| `sunkenCorridor`             | 待核验     | Sunken Corridor              | content      | content | config-key   | exported      | 3.0           | official-wiki | —                    | New area name.                                                     |
| `energyHub`                  | 待核验     | Energy Hub                   | content      | content | config-key   | exported      | 3.0           | official-wiki | —                    | New area name.                                                     |

---

## Deprecated aliases (do-not-use)

These forms must **not** be used as canonical names in the context named by
`forbidden_when`. This table is the future scan source for deprecated aliases; rows
marked `always` are unconditional scan targets, while contextual rows only apply in
their stated scope. The `aliases / deprecated` cells above may also record weak aliases,
source wording, or contextual shorthands; only this table defines scan targets.

| deprecated          | forbidden_when                                 | replace_with         | reason                                                                                |
| ------------------- | ---------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------- |
| `boost`             | always                                         | `damageBonus`        | DMG Bonus is the canonical that matches the formula/data pages; `boost` is too vague. |
| `dmgBonus`          | always                                         | `damageBonus`        | Display text may keep DMG; identifiers spell out `damage`.                            |
| `defence`           | always                                         | `defense`            | One American spelling, no synonyms.                                                   |
| `stun`              | used for the Daze mechanic                     | `daze`               | `stun` is reserved for the specialty; the mechanic itself is `daze`.                  |
| `dazed`             | used as the canonical Stunned state identifier | `stunnedState`       | Avoid extra state synonyms; the state identifier is `stunnedState`.                   |
| `staggered`         | used as the canonical Stunned state identifier | `stunnedState`       | Avoid extra community synonyms; the official context is Daze -> Stunned.              |
| `stunVulnerability` | always                                         | `dazeVulnerability`  | The vulnerability comes from the Daze -> Stunned mechanic, not the Stun specialty.    |
| `anomalyMastery`    | used for Anomaly Proficiency / 异常精通        | `anomalyProficiency` | Different stats — Mastery scales buildup, Proficiency scales anomaly damage.          |
| `sheerBoost`        | always                                         | `sheerDamageBonus`   | Use the explicit Sheer DMG Bonus identifier, not a generic boost.                     |
| `disorder`          | used for the Windswept settlement              | `vortex`             | With Windswept active, normal Disorder does not trigger; Vortex does.                 |
| `corruption`        | used for the Windswept cross-attribute link    | `contamination`      | Corruption is an Ether anomaly; Contamination is the Windswept cross-attribute link.  |
