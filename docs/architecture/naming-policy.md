# Naming Policy

Status: S2 draft  
Owner: @TechLead  
Inputs: glossary v0.3.2, D-11, @lo-user screenshots, Product v2.0

## 1. Principle

Public schema, `@fairy/core` API, `@fairy/data` output, `@fairy/cli` JSON, and trace fields use English semantic identifiers.

D-11 is official-first:

- Prefer ZZZ official English terms when they are stable and semantically clear.
- Convert official terms to readable camelCase for field and enum IDs.
- Preserve old internal, community, or earlier-design names in `sourceAliases` and migration tables.
- Do not localize JSON keys or enum values. Language selection only affects human-facing messages and explanations.

## 2. Identifier Style

| Kind | Style | Example |
|---|---|---|
| Type name | PascalCase | `BattleSnapshot`, `CalcResult` |
| Field ID | camelCase | `critDamage`, `sheerForce` |
| Enum value | camelCase or lower semantic token | `rupture`, `exSpecial` |
| Handler ID | kebab-case | `drive-disc-set-bonus` |
| Source alias | original spelling | `CRIT DMG`, `PEN Ratio`, `breachForce` |

## 3. Official Terms

Use official terms as roots when they are not abbreviations:

| Chinese | Official English | Public ID Direction |
|---|---|---|
| 命破特性 | Rupture | `agentSpecialty: "rupture"` |
| 贯穿力 | Sheer Force | `sheerForce` |
| 贯穿伤害 | Sheer Damage | `sheerDamage` |
| 贯穿伤害加成 | Sheer DMG Bonus | `sheerDamageBonus` |
| 闪能 | Adrenaline | `adrenaline` |
| 闪能自动累积 | Automatic Adrenaline Accumulation | `automaticAdrenalineAccumulation` |
| 闪能获得效率 | Adrenaline Generation Rate | `adrenalineGenerationRate` |
| 闪能上限 | Max Adrenaline | `maxAdrenaline` |
| 能量获得效率 | Energy Generation Rate | `energyGenerationRate` |
| 能量上限 | Energy Limit | `maxEnergy` |
| 鸣徽 | Resonium | `resonium` |
| 异常掌控 | Anomaly Mastery | `anomalyMastery` |
| 异常精通 | Anomaly Proficiency | `anomalyProficiency` |

Earlier `breach*` identifiers are aliases, not new primary names.

## 4. Abbreviations

Do not copy official abbreviations into public field IDs when a readable expanded identifier is clearer.

| Official English | Public ID |
|---|---|
| ATK | `attack` |
| HP / Max HP | `maxHp` |
| DEF | `defense` |
| CRIT Rate | `critRate` |
| CRIT DMG | `critDamage` |
| PEN Ratio | `penetrationRate` |
| PEN | `flatPenetration` |

The official abbreviation must still be recorded in `officialEnglishName` and `sourceAliases`.

Avoid short internal abbreviations even when they look convenient:

- use `damage`, not `dmg`
- use `generationRate`, not `gainEfficiency`, when the official concept is Generation Rate
- use `automaticAdrenalineAccumulation`, not `autoAdrenalineGain`, because accumulation and generation rate are different concepts

## 5. Damage Bonus Fields Vs Formula Buckets

Data fields may be specific:

- `fireDamageBonus`
- `iceDamageBonus`
- `electricDamageBonus`
- `etherDamageBonus`
- `physicalDamageBonus`
- `sheerDamageBonus`

Formula buckets do not have to split identically. If several bonuses aggregate into the same formula zone, `CalcResult.trace` should show both:

- the source field or modifier ID
- the final bucket it contributes to

## 6. Language

Supported locale codes are:

- `zh`
- `en`

V1 bilingual resources cover terms actually used by the damage calculator. Long-tail game terms that are not shown, explained, or used in errors may stay Chinese-only or pending.

@lo-user explicitly upgraded common attack tags and Shiyu Defense-related calculator terms into the required V1 bilingual scope.

## 7. Open Items

Resolve the entries in `pending-term-resolution-table.md` before making executable schema names final.
