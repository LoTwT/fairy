# Pending Term Resolution Table

Status: S2 draft
Owner: @TechLead
Purpose: collect terms that affect executable schema, data matching, trace fields, or V1 display.

## Locked By @lo-user Screenshots

| Chinese | Official English | Public ID | Status | Notes |
|---|---|---|---|---|
| 异常掌控 | Anomaly Mastery | `anomalyMastery` | locked | affects buildup |
| 异常精通 | Anomaly Proficiency | `anomalyProficiency` | locked | affects anomaly damage |
| 鸣徽 | Resonium | `resonium` | locked | source mode: Lost Void / 零号空洞 |
| 零号空洞 | Lost Void | `lostVoid` | locked | source of Resonium |
| 畏缩 | Flinch | `flinch` | locked | physical anomaly status |
| 命破特性 | Rupture | `rupture` | locked | `agentSpecialty` enum value |
| 贯穿力 | Sheer Force | `sheerForce` | locked by D-11 | old alias: `breachForce` |
| 贯穿伤害 | Sheer Damage | `sheerDamage` | locked by D-11 | old alias: `breachDamage` |
| 贯穿伤害加成 | Sheer DMG Bonus | `sheerDamageBonus` | locked by D-11 | old alias: `breachDamageBonus` |
| 闪能 | Adrenaline | `adrenaline` | locked by D-11 | old alias: `breachEnergy` |
| 闪能自动累积 | Automatic Adrenaline Accumulation | `automaticAdrenalineAccumulation` | locked by D-11 | old alias: `breachEnergyRegen` |
| 闪能获得效率 | Adrenaline Generation Rate | `adrenalineGenerationRate` | locked by D-11 | old alias: `breachEnergyGainEfficiency` |
| 闪能上限 | Max Adrenaline | `maxAdrenaline` | locked by D-11 | new V1 field |
| 能量获得效率 | Energy Generation Rate | `energyGenerationRate` | locked by D-11 | replaces `energyGainEfficiency` |
| 能量上限 | Energy Limit | `maxEnergy` | locked by D-11 | new V1 field |
| 音擎 | W-Engine | `wEngine` | locked by TL-3 schema | `weaponEngine` is alias only |
| 驱动盘 | Drive Disc | `driveDiscs` | locked by TL-3 schema | array field; `DriveDisc` remains type name |
| 影画 | Mindscape Cinema | `mindscapeCinema` | locked by TL-3 schema | `mindscape` is alias only |

## Required For V1 Display / i18n

| Area | Required Terms |
|---|---|
| Basic stats | attack, maxHp, defense, impact, critRate, critDamage, penetrationRate, flatPenetration, anomalyMastery, anomalyProficiency, sheerForce |
| Attack tags | basic, dash, dodgeCounter, special, exSpecial, ultimate, chain, assistAssault, parrySupportTag, quickAssist, evadeAssist, heavyHit, followUp |
| Game modes | lostVoid, defenseGameMode |
| Equipment and sources | wEngine, driveDiscs, driveDiscSet2, driveDiscSet4, mindscapeCinema, resonium |

## Still Pending

| Chinese | Candidate | Why Pending | Resolution Plan |
|---|---|---|---|
| 式舆防卫战 | `defenseGameMode` | official English not yet verified | S2 data-source discovery or @lo-user screenshot |
| 鸣徽分类 | `critical`, `duel`, etc. | complete zh/en enum list not collected | S2 source crawl or later screenshots |
| 零号空洞子模块 | not in V1 | not needed for damage calculator display | keep out unless data source needs stable enum |
| 支援突击 | `assistAssault` | official English pending | keep ID from glossary v0.3.2 until verified |
| 招架支援（标签） | `parrySupportTag` | official English pending | keep tag/event split |
| 回避支援 | `evadeAssist` | official English pending | keep ID from glossary v0.3.2 until verified |
| 重击 | `heavyHit` | official English pending | keep ID from glossary v0.3.2 until verified |
| 追加攻击 | `followUp` | official English pending | keep ID from glossary v0.3.2 until verified |

## Alias Rules

Aliases are accepted for data ingestion, migration, and prompt matching, but new public schema fields should use the locked public ID.

| Alias | Public ID |
|---|---|
| `breachForce` | `sheerForce` |
| `breachDamage` | `sheerDamage` |
| `breachDamageBonus` | `sheerDamageBonus` |
| `breachEnergy` | `adrenaline` |
| `breachEnergyRegen` | `automaticAdrenalineAccumulation` |
| `breachEnergyGainEfficiency` | `adrenalineGenerationRate` |
| `energyGainEfficiency` | `energyGenerationRate` |
| `combatBuffToken` | `resonium` |
| `chime` | `resonium` |
| `resonia` | `resonium` |
| `mutation` | `disorder` |
| `polarityMutation` | `polarityDisorder` |
| `stagger*` | `daze*` |
| `staggerHit` | `hitstun` |
| `bomb` | `bangboo` |
| `critDmg` | `critDamage` |
| `penRate` | `penetrationRate` |
| `penFlat` | `flatPenetration` |
| `hpMax` | `maxHp` |
| `weaponEngine` | `wEngine` |
| `driveDisc` | `driveDiscs` |
| `drive` | `driveDiscs` |
| `mindscape` | `mindscapeCinema` |
