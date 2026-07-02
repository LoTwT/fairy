# Terminology Glossary (data)

The canonical ZZZ term data for Fairy: every game concept that shows up in code
identifiers, config keys, data fields, log labels, or docs is named here once.

This file is **data**. The rules around it — source priority, category boundaries,
naming conventions, needs-verify policy, notes/exception handling, deprecated-alias
policy, and verification checks — live in
[`docs/specs/0003-terminology.md`](../specs/0003-terminology.md). When in doubt
about _why_ a term is named or placed a certain way, read the spec.

## How to read this glossary

The normal reading path is:

1. **Category** — the game data entry point: `Common`, `Agents`, `W-Engines`,
   `Drive Discs`, `Bangboo`, or `World & Content`.
2. **Subcategory** — the narrower concept group inside that category.
3. **Canonical term row** — the single source for the term's identifier, official
   names, placement, and machine-checkable boundaries.

Each canonical row has these fields:

- **identifier** — the canonical camelCase code identifier used for keys, variables,
  config keys, enum values, data fields, and log labels.
- **zh / en** — official names. `待核验` (needs-verify) means no stable official Chinese
  text is confirmed yet; it must not be exported as official Chinese display text.
- **category / subcategory** — the reader-facing placement.
- **domain** — the mechanic/content layer.
- **surface** — where the identifier may appear: `formula-key`, `config-key`,
  `enum-value`, `doc-only`, or `reserved`.
- **export** — how public the term is: `exported`, `internal`, `doc-only`, or
  `do-not-use`.
- **source** — `official`, `official-wiki`, or both.

Long aliases, version notes, boundary explanations, and maintenance background are kept
in [Notes / Exceptions](#notes--exceptions). Terms whose `zh` is still `待核验` are also
listed in [Needs Verification Review Queue](#needs-verification-review-queue).

---

## Common

Common terms are game-wide concepts: attributes, shared stats, combat mechanics, and
attribute anomaly systems. They are not tied to one specific playable agent, W-Engine,
Drive Disc, Bangboo, location, or faction.

### Attributes

Attribute and element types.

| identifier  | zh   | en         | category | subcategory | domain            | surface    | export   | source   |
| ----------- | ---- | ---------- | -------- | ----------- | ----------------- | ---------- | -------- | -------- |
| `physical`  | 物理 | Physical   | Common   | Attributes  | attribute-anomaly | enum-value | exported | official |
| `fire`      | 火   | Fire       | Common   | Attributes  | attribute-anomaly | enum-value | exported | official |
| `ice`       | 冰   | Ice        | Common   | Attributes  | attribute-anomaly | enum-value | exported | official |
| `electric`  | 电   | Electric   | Common   | Attributes  | attribute-anomaly | enum-value | exported | official |
| `ether`     | 以太 | Ether      | Common   | Attributes  | attribute-anomaly | enum-value | exported | official |
| `wind`      | 风   | Wind       | Common   | Attributes  | attribute-anomaly | enum-value | exported | official |
| `frost`     | 烈霜 | Frost      | Common   | Attributes  | attribute-anomaly | enum-value | exported | official |
| `honedEdge` | 凛刃 | Honed Edge | Common   | Attributes  | attribute-anomaly | enum-value | exported | official |
| `auricInk`  | 玄墨 | Auric Ink  | Common   | Attributes  | attribute-anomaly | enum-value | exported | official |

### Agent Stats

Agent panel stats or reusable stat fields. Formula-derived modifiers stay in
**Combat Mechanics**.

| identifier           | zh       | en                  | category | subcategory | domain         | surface     | export   | source        |
| -------------------- | -------- | ------------------- | -------- | ----------- | -------------- | ----------- | -------- | ------------- |
| `defense`            | 防御力   | DEF / Defense       | Common   | Agent Stats | damage-formula | formula-key | exported | official      |
| `impact`             | 冲击力   | Impact              | Common   | Agent Stats | damage-formula | formula-key | exported | official-wiki |
| `anomalyProficiency` | 异常精通 | Anomaly Proficiency | Common   | Agent Stats | damage-formula | formula-key | exported | official      |
| `anomalyMastery`     | 异常掌控 | Anomaly Mastery     | Common   | Agent Stats | damage-formula | formula-key | exported | official      |
| `penRatio`           | 贯穿率   | PEN Ratio           | Common   | Agent Stats | damage-formula | formula-key | exported | official-wiki |
| `penValue`           | 贯穿值   | PEN                 | Common   | Agent Stats | damage-formula | formula-key | exported | official-wiki |
| `sheerForce`         | 贯穿力   | Sheer Force         | Common   | Agent Stats | damage-formula | formula-key | exported | official-wiki |

### Combat Mechanics

Damage formulas, modifiers, resources, gauges, and the Daze/Stunned chain. This is not
a catchall for every combat concept: attribute anomaly chains stay in
**Attribute Anomaly System**, and agent-specific mechanics stay under **Agents**.

| identifier                        | zh           | en                                | category | subcategory      | domain            | surface     | export   | source        |
| --------------------------------- | ------------ | --------------------------------- | -------- | ---------------- | ----------------- | ----------- | -------- | ------------- |
| `damageBonus`                     | 待核验       | DMG Bonus                         | Common   | Combat Mechanics | damage-formula    | formula-key | exported | official-wiki |
| `damageTaken`                     | 待核验       | DMG Taken                         | Common   | Combat Mechanics | damage-formula    | formula-key | exported | official-wiki |
| `dazeVulnerability`               | 失衡易伤倍率 | Stunned Multiplier                | Common   | Combat Mechanics | damage-formula    | formula-key | exported | official-wiki |
| `sheerDamageBonus`                | 贯穿伤害加成 | Sheer DMG Bonus                   | Common   | Combat Mechanics | damage-formula    | formula-key | exported | official-wiki |
| `tempestCoefficient`              | 待核验       | Tempest Coefficient               | Common   | Combat Mechanics | attribute-anomaly | formula-key | exported | official-wiki |
| `windDamage`                      | 风属性伤害   | Wind DMG                          | Common   | Combat Mechanics | attribute-anomaly | formula-key | exported | official      |
| `decibelRating`                   | 喧响值       | Decibel Rating                    | Common   | Combat Mechanics | damage-formula    | reserved    | internal | official-wiki |
| `adrenaline`                      | 闪能         | Adrenaline                        | Common   | Combat Mechanics | damage-formula    | reserved    | internal | official-wiki |
| `automaticAdrenalineAccumulation` | 闪能自动累积 | Automatic Adrenaline Accumulation | Common   | Combat Mechanics | damage-formula    | reserved    | internal | official-wiki |
| `adrenalineGenerationRate`        | 闪能获得效率 | Adrenaline Generation Rate        | Common   | Combat Mechanics | damage-formula    | reserved    | internal | official-wiki |
| `maxAdrenaline`                   | 闪能最大值   | Max Adrenaline                    | Common   | Combat Mechanics | damage-formula    | reserved    | internal | official-wiki |
| `daze`                            | 失衡         | Daze                              | Common   | Combat Mechanics | damage-formula    | formula-key | exported | official-wiki |
| `stunnedState`                    | 待核验       | Stunned                           | Common   | Combat Mechanics | damage-formula    | enum-value  | exported | official-wiki |

### Attribute Anomaly System

Attribute anomaly, buildup, anomaly states, and settlement chains.

| identifier           | zh             | en                   | category | subcategory              | domain            | surface     | export   | source                   |
| -------------------- | -------------- | -------------------- | -------- | ------------------------ | ----------------- | ----------- | -------- | ------------------------ |
| `attributeAnomaly`   | 属性异常       | Attribute Anomaly    | Common   | Attribute Anomaly System | attribute-anomaly | enum-value  | exported | official-wiki            |
| `anomalyBuildup`     | 属性异常积蓄值 | Anomaly Buildup      | Common   | Attribute Anomaly System | attribute-anomaly | formula-key | exported | official                 |
| `disorder`           | 紊乱           | Disorder             | Common   | Attribute Anomaly System | attribute-anomaly | enum-value  | exported | official                 |
| `windswept`          | 风化           | Windswept            | Common   | Attribute Anomaly System | attribute-anomaly | enum-value  | exported | official-wiki            |
| `windAnomalyBuildup` | 待核验         | Wind Anomaly Buildup | Common   | Attribute Anomaly System | attribute-anomaly | formula-key | exported | official-wiki            |
| `contamination`      | 浸染           | Contamination        | Common   | Attribute Anomaly System | attribute-anomaly | enum-value  | exported | official-wiki            |
| `vortex`             | 乱流           | Vortex               | Common   | Attribute Anomaly System | attribute-anomaly | enum-value  | exported | official                 |
| `vortexDamage`       | 乱流伤害       | Vortex DMG           | Common   | Attribute Anomaly System | attribute-anomaly | formula-key | exported | official-wiki            |
| `abloom`             | 异放           | Abloom               | Common   | Attribute Anomaly System | attribute-anomaly | formula-key | exported | official + official-wiki |

---

## Agents

Agent terms are tied to playable agents, agent metadata, or agent-specific mechanics.
Agent-specific mechanics may be referenced by logs and skill parsing, but must not enter
global formula tables or global enums unless a later spec explicitly promotes them.

### Agent Names

| identifier       | zh            | en              | category | subcategory | domain  | surface    | export   | source   |
| ---------------- | ------------- | --------------- | -------- | ----------- | ------- | ---------- | -------- | -------- |
| `velinaAirgid`   | 维琳娜·艾嘉德 | Velina Airgid   | Agents   | Agent Names | content | config-key | exported | official |
| `normaHollowell` | 诺姆·霍洛维尔 | Norma Hollowell | Agents   | Agent Names | content | config-key | exported | official |
| `pyrois`         | 佩洛伊斯      | Pyrois          | Agents   | Agent Names | content | config-key | exported | official |

### Agent Specialties

| identifier | zh   | en   | category | subcategory       | domain          | surface    | export   | source        |
| ---------- | ---- | ---- | -------- | ----------------- | --------------- | ---------- | -------- | ------------- |
| `stun`     | 击破 | Stun | Agents   | Agent Specialties | agent-specialty | enum-value | exported | official-wiki |

### Agent-Specific Mechanics

| identifier         | zh       | en                | category | subcategory              | domain             | surface  | export   | source        |
| ------------------ | -------- | ----------------- | -------- | ------------------------ | ------------------ | -------- | -------- | ------------- |
| `windbloom`        | 风华     | Windbloom         | Agents   | Agent-Specific Mechanics | character-mechanic | doc-only | internal | official-wiki |
| `windbite`         | 风蚀     | Windbite          | Agents   | Agent-Specific Mechanics | character-mechanic | doc-only | internal | official-wiki |
| `condensedCyclone` | 微域气旋 | Condensed Cyclone | Agents   | Agent-Specific Mechanics | character-mechanic | doc-only | internal | official-wiki |
| `sweepingCyclone`  | 广域气旋 | Sweeping Cyclone  | Agents   | Agent-Specific Mechanics | character-mechanic | doc-only | internal | official-wiki |
| `chromaticTint`    | 赋彩     | Chromatic Tint    | Agents   | Agent-Specific Mechanics | character-mechanic | doc-only | internal | official-wiki |

---

## W-Engines

W-Engine terms cover names and future W-Engine effect or requirement vocabulary.

### W-Engine Names

| identifier      | zh       | en             | category  | subcategory    | domain  | surface    | export   | source        |
| --------------- | -------- | -------------- | --------- | -------------- | ------- | ---------- | -------- | ------------- |
| `joyauDore`     | 琳琅鎏心 | Joyau Dore     | W-Engines | W-Engine Names | content | config-key | exported | official      |
| `chiefSidekick` | 待核验   | Chief Sidekick | W-Engines | W-Engine Names | content | config-key | exported | official-wiki |
| `solExuvia`     | 待核验   | Sol Exuvia     | W-Engines | W-Engine Names | content | config-key | exported | official-wiki |

### W-Engine Effects / Requirements

Reserved for W-Engine effect names, specialty requirements, and trigger conditions when
the product needs those fields.

---

## Drive Discs

Drive Disc terms cover set names and future stat or set-effect vocabulary.

### Drive Disc Sets

| identifier       | zh     | en              | category    | subcategory     | domain  | surface    | export   | source        |
| ---------------- | ------ | --------------- | ----------- | --------------- | ------- | ---------- | -------- | ------------- |
| `wutheringSalon` | 待核验 | Wuthering Salon | Drive Discs | Drive Disc Sets | content | config-key | exported | official-wiki |
| `theSkyAblaze`   | 待核验 | The Sky Ablaze  | Drive Discs | Drive Disc Sets | content | config-key | exported | official-wiki |

### Drive Disc Stats / Set Effects

Reserved for Drive Disc slot stats, set effects, or effect names when the product needs
those fields.

---

## Bangboo

Bangboo terms cover names and future Bangboo skill or condition vocabulary.

### Bangboo Names

| identifier  | zh       | en         | category | subcategory   | domain  | surface    | export   | source        |
| ----------- | -------- | ---------- | -------- | ------------- | ------- | ---------- | -------- | ------------- |
| `ultraJake` | 超极杰克 | Ultra Jake | Bangboo  | Bangboo Names | content | config-key | exported | official-wiki |

### Bangboo Skills / Conditions

Reserved for Bangboo skills, faction/team conditions, and triggers when the product needs
those fields.

---

## World & Content

World & Content terms cover locations, factions, organizations, systems, and proper nouns.
They must not leak into formula or global combat fields.

### Locations / Areas

| identifier                   | zh         | en                           | category        | subcategory       | domain  | surface    | export   | source        |
| ---------------------------- | ---------- | ---------------------------- | --------------- | ----------------- | ------- | ---------- | -------- | ------------- |
| `roscaelifer`                | 罗斯凯利法 | Roscaelifer                  | World & Content | Locations / Areas | content | config-key | exported | official      |
| `booastrum`                  | 待核验     | Booastrum                    | World & Content | Locations / Areas | content | config-key | exported | official-wiki |
| `centralComputingDepartment` | 待核验     | Central Computing Department | World & Content | Locations / Areas | content | config-key | exported | official-wiki |
| `sunkenCorridor`             | 待核验     | Sunken Corridor              | World & Content | Locations / Areas | content | config-key | exported | official-wiki |
| `energyHub`                  | 待核验     | Energy Hub                   | World & Content | Locations / Areas | content | config-key | exported | official-wiki |

### Factions / Organizations

| identifier                   | zh         | en                           | category        | subcategory              | domain  | surface    | export   | source   |
| ---------------------------- | ---------- | ---------------------------- | --------------- | ------------------------ | ------- | ---------- | -------- | -------- |
| `externalStrategyDepartment` | 外务筹策局 | External Strategy Department | World & Content | Factions / Organizations | content | config-key | exported | official |

### Systems / Modes

Reserved for game systems, modes, or named content structures when the product needs
those fields.

---

## Needs Verification Review Queue

This is a review/maintenance view, not a second canonical source. Confirmed values must
be written back to the normal category row above.

| category        | subcategory              | identifier                   | en                           | current zh | source        | reason                                                                  | suggested action                  |
| --------------- | ------------------------ | ---------------------------- | ---------------------------- | ---------- | ------------- | ----------------------------------------------------------------------- | --------------------------------- |
| Common          | Combat Mechanics         | `damageBonus`                | DMG Bonus                    | 待核验     | official-wiki | Surface zh text varies; official display label needs confirmation.      | Confirm zh or keep internal-only. |
| Common          | Combat Mechanics         | `damageTaken`                | DMG Taken                    | 待核验     | official-wiki | English/formula meaning is stable; official zh display name is unclear. | Confirm zh or keep internal-only. |
| Common          | Combat Mechanics         | `stunnedState`               | Stunned                      | 待核验     | official-wiki | State name is stable; official zh field label needs confirmation.       | Confirm zh or keep internal-only. |
| Common          | Combat Mechanics         | `tempestCoefficient`         | Tempest Coefficient          | 待核验     | official-wiki | Boundary term; zh and exact product surface need confirmation.          | Confirm zh and placement.         |
| Common          | Attribute Anomaly System | `windAnomalyBuildup`         | Wind Anomaly Buildup         | 待核验     | official-wiki | Mechanic meaning is stable; official zh field label needs confirmation. | Confirm zh or keep internal-only. |
| W-Engines       | W-Engine Names           | `chiefSidekick`              | Chief Sidekick               | 待核验     | official-wiki | English name is stable; Chinese name needs authoritative confirmation.  | Review official/in-game zh.       |
| W-Engines       | W-Engine Names           | `solExuvia`                  | Sol Exuvia                   | 待核验     | official-wiki | English name is stable; Chinese name needs authoritative confirmation.  | Review official/in-game zh.       |
| Drive Discs     | Drive Disc Sets          | `wutheringSalon`             | Wuthering Salon              | 待核验     | official-wiki | Drive Disc zh name needs authoritative confirmation.                    | Review official/in-game zh.       |
| Drive Discs     | Drive Disc Sets          | `theSkyAblaze`               | The Sky Ablaze               | 待核验     | official-wiki | Drive Disc zh name needs authoritative confirmation.                    | Review official/in-game zh.       |
| World & Content | Locations / Areas        | `booastrum`                  | Booastrum                    | 待核验     | official-wiki | Location zh name needs authoritative confirmation.                      | Review official/in-game zh.       |
| World & Content | Locations / Areas        | `centralComputingDepartment` | Central Computing Department | 待核验     | official-wiki | Area zh name needs authoritative confirmation.                          | Review official/in-game zh.       |
| World & Content | Locations / Areas        | `sunkenCorridor`             | Sunken Corridor              | 待核验     | official-wiki | Area zh name needs authoritative confirmation.                          | Review official/in-game zh.       |
| World & Content | Locations / Areas        | `energyHub`                  | Energy Hub                   | 待核验     | official-wiki | Area zh name needs authoritative confirmation.                          | Review official/in-game zh.       |

## Notes / Exceptions

This optional appendix explains aliases, confusing boundaries, owner/context, version or
source background, and maintenance decisions. It is not a second canonical source: every
`identifier` here must link back to a normal category row above.

| identifier                        | category | subcategory              | version                    | aliases                          | notes                                                                                                                           |
| --------------------------------- | -------- | ------------------------ | -------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `defense`                         | Common   | Agent Stats              | base                       | `defence`                        | Use American spelling `defense`.                                                                                                |
| `anomalyProficiency`              | Common   | Agent Stats              | 0.2.0                      | misused `anomalyMastery`         | Scales attribute-anomaly damage, not buildup efficiency.                                                                        |
| `anomalyMastery`                  | Common   | Agent Stats              | 0.2.0                      | misused for 异常精通             | Scales anomaly buildup efficiency, not anomaly damage.                                                                          |
| `penValue`                        | Common   | Agent Stats              | base                       | bare `pen`                       | Use `penValue` to avoid abbreviation ambiguity; `PEN` stays as display text in prose.                                           |
| `damageBonus`                     | Common   | Combat Mechanics         | base                       | `boost`, `dmgBonus`              | Formula page has a DMG Bonus Multiplier; zh display text varies, so zh stays needs-verify.                                      |
| `damageTaken`                     | Common   | Combat Mechanics         | base                       | do not merge into `damageBonus`  | Target-side field; separate from attacker-side damage bonus.                                                                    |
| `dazeVulnerability`               | Common   | Combat Mechanics         | base                       | `stunVulnerability`              | The vulnerability comes from Daze -> Stunned, not the Stun specialty.                                                           |
| `sheerDamageBonus`                | Common   | Combat Mechanics         | 2.0                        | `sheerBoost`                     | Use the explicit Sheer DMG Bonus identifier, not a generic boost.                                                               |
| `tempestCoefficient`              | Common   | Combat Mechanics         | 2.8-3.0                    | -                                | Boundary term: currently placed with formula coefficients; move to Attribute Anomaly System if reviewed as Wind-chain-specific. |
| `windDamage`                      | Common   | Combat Mechanics         | 2.8-3.0                    | -                                | Player-facing Wind damage category; kept with formula/damage mechanics, not the attribute enum row.                             |
| `decibelRating`                   | Common   | Combat Mechanics         | base                       | `decibel`                        | Use `decibelRating` for a UI resource slot; local `decibel` shorthand is acceptable only in strong combat-resource context.     |
| `automaticAdrenalineAccumulation` | Common   | Combat Mechanics         | 2.0                        | no ad-hoc abbreviation           | Keep the full name; do not fold into an opaque abbreviation.                                                                    |
| `daze`                            | Common   | Combat Mechanics         | base                       | `stun` deprecated for this sense | Daze is the meter/mechanic; an enemy enters Stunned only at 100% Daze. `stun` is reserved for the agent specialty.              |
| `stunnedState`                    | Common   | Combat Mechanics         | base                       | `dazed`, `staggered`             | The state after Daze reaches the threshold; not the specialty and not Daze itself.                                              |
| `wind`                            | Common   | Attributes               | 2.8 readded / 3.0 playable | -                                | Re-added in 2.8; first playable Wind agent in 3.0.                                                                              |
| `frost`                           | Common   | Attributes               | 1.4                        | -                                | Special attribute; settles on the Ice side for bonus/resistance, but has its own anomaly-buildup gauge.                         |
| `honedEdge`                       | Common   | Attributes               | 2.5                        | -                                | Special attribute; damage/buffs settle on the Physical side, but anomaly buildup is computed separately from Physical.          |
| `auricInk`                        | Common   | Attributes               | 2.0                        | -                                | Special attribute; equivalent to Ether but with its own anomaly-buildup gauge; can trigger Disorder together with Ether.        |
| `attributeAnomaly`                | Common   | Attribute Anomaly System | base                       | bare `anomaly`                   | Spell out `attributeAnomaly` outside the anomaly domain; local `anomaly` shorthand is fine only in strong context.              |
| `disorder`                        | Common   | Attribute Anomaly System | base                       | not the same as `vortex`         | Normal anomaly-replacement settlement. In the Wind chain it is replaced by Vortex.                                              |
| `windswept`                       | Common   | Attribute Anomaly System | 2.8-3.0                    | not a generic "wind status"      | The Wind anomaly state.                                                                                                         |
| `windAnomalyBuildup`              | Common   | Attribute Anomaly System | 2.8-3.0                    | -                                | Wind DMG produces Wind Anomaly Buildup; stable zh not yet confirmed.                                                            |
| `contamination`                   | Common   | Attribute Anomaly System | 2.8-3.0                    | wrong `corruption`               | Triggers on the first direct Fire/Ice/Electric/Physical/Ether hit while Windswept; do not write it as Corruption.               |
| `vortex`                          | Common   | Attribute Anomaly System | 2.8-3.0                    | wrong `disorder`                 | When one existing anomaly is Windswept, normal Disorder does not trigger; Vortex does.                                          |
| `vortexDamage`                    | Common   | Attribute Anomaly System | 2.8-3.0                    | -                                | Model independently; do not merge into normal Disorder DMG.                                                                     |
| `abloom`                          | Common   | Attribute Anomaly System | 1.7                        | -                                | Cross-character reusable extra-anomaly settlement. 3.0 routes it into the Wind chain but it is not a first appearance.          |
| `stun`                            | Agents   | Agent Specialties        | 0.3.0                      | -                                | Agent-specialty enum only; not the Daze mechanic, not the Stunned state, and not a formula term.                                |
| `windbloom`                       | Agents   | Agent-Specific Mechanics | 3.0                        | -                                | Velina-only resource; not a shared Common mechanic.                                                                             |
| `windbite`                        | Agents   | Agent-Specific Mechanics | 3.0                        | -                                | Gained after Velina triggers Vortex; also the name of a skill-upgrade chip material.                                            |
| `condensedCyclone`                | Agents   | Agent-Specific Mechanics | 3.0                        | -                                | Velina summon; do not place into global formula tables.                                                                         |
| `sweepingCyclone`                 | Agents   | Agent-Specific Mechanics | 3.0                        | -                                | Enhanced Velina cyclone after consuming 2 Windbite; can trigger Chromatic Tint and affect anomaly-buildup resistance.           |
| `chromaticTint`                   | Agents   | Agent-Specific Mechanics | 3.0                        | -                                | Triggers when Sweeping Cyclone first hits an enemy under Contamination, converting the cyclone to the matching attribute.       |

## Deprecated Aliases

These forms must **not** be used as canonical names in the context named by
`forbidden_when`. This table is the future scan source for deprecated aliases; rows
marked `always` are unconditional scan targets, while contextual rows only apply in
their stated scope.

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
