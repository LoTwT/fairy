# Glossary — ZZZ terms ↔ English ↔ code identifiers

This is the single naming contract for Fairy's domain (Zenless Zone Zero damage).
Every public type / function / parameter / zone / enum name traces to a row here.
If a public name has no row, the name is undefined — do not publish it.

## Naming convention

1. **Official ZZZ English is canonical.** Code identifiers follow the official
   in-game English term (camelCase). Where a term is our own (architecture, not a
   game concept), it is marked **convention** in Source.
2. **One Chinese term → one canonical code identifier.** No coexisting synonyms
   (`boost`/`dmgBonus`, `stun`/`daze`, `defence`/`defense`).
3. **Every row cites a Source**: `official` (in-game EN), `数据导论` (the data
   introduction reference / formula), or `convention` (ours — never disguised as
   official).
4. **Spelling**: American English (HoYo localization), e.g. `defense`.

Sources for the official English: ZZZ Fandom Wiki, Prydwen, Game8, ScreenRant
(see PR description for links).

## ⚠️ Corrections this glossary locks in (vs the current #105 draft)

- **异常精通 = Anomaly Proficiency** (boosts anomaly **damage**) — the #105 engine
  currently calls this `anomalyMastery`, which is **wrong**. Official **Anomaly
  Mastery = 异常掌控** (boosts **buildup** speed), a _different_ stat that is
  out-of-scope for v1. This is a correctness fix, not a style choice.
- **失衡 = Daze** (not "Stun"). Recommend renaming `stun*`/`staggered` →
  `daze*`/`dazed` while it is still pre-publish.

## Open style picks for review (lo-user decides on this table)

| 中文 | option A (recommended)            | option B (current code) | note                |
| ---- | --------------------------------- | ----------------------- | ------------------- |
| 失衡 | `daze` (official)                 | `stun`                  | official EN is Daze |
| 增伤 | `dmgBonus` (official "DMG Bonus") | `boost`                 |                     |
| 防御 | `defense` (American)              | `defence` (British)     | HoYo uses American  |

## Core stats (角色属性)

| 中文     | English (official)      | code identifier      | Source   | Notes                                                            |
| -------- | ----------------------- | -------------------- | -------- | ---------------------------------------------------------------- |
| 攻击力   | ATK / Attack            | `atk`                | official |                                                                  |
| 生命值   | HP                      | `hp`                 | official |                                                                  |
| 防御力   | DEF / Defense           | `defense`            | official | spelling: American; #105 currently `defence`                     |
| 冲击力   | Impact                  | `impact`             | official | Daze-buildup stat                                                |
| 贯穿力   | Sheer Force             | `sheerForce`         | official | break agents                                                     |
| 异常精通 | **Anomaly Proficiency** | `anomalyProficiency` | official | boosts anomaly DMG; **#105 mislabels as `anomalyMastery` → fix** |
| 异常掌控 | **Anomaly Mastery**     | `anomalyMastery`     | official | boosts buildup; **v1 out-of-scope / reserved**                   |
| 暴击率   | CRIT Rate               | `critRate`           | official |                                                                  |
| 暴击伤害 | CRIT DMG                | `critDmg`            | official |                                                                  |
| 穿透率   | PEN Ratio               | `penRatio`           | official |                                                                  |
| 穿透值   | PEN (flat)              | `penValue`           | official |                                                                  |
| 等级     | Level                   | `level`              | official |                                                                  |

## Damage & combat mechanics

| 中文     | English (official)        | code identifier     | Source        | Notes                                        |
| -------- | ------------------------- | ------------------- | ------------- | -------------------------------------------- |
| 伤害     | DMG / Damage              | `damage`            | official      |                                              |
| 常规伤害 | regular damage            | `regular`           | convention    | non-sheer path                               |
| 贯穿伤害 | Sheer DMG                 | `sheer`             | official      | 贯穿 = Sheer                                 |
| 增伤     | DMG Bonus                 | `dmgBonus`          | official      | #105 currently `boost` (style pick)          |
| 抗性     | RES / Resistance          | `resist`            | official      |                                              |
| 易伤     | Vulnerability (DMG taken) | `vulnerability`     | 数据导论      | no single official stat word                 |
| 减伤     | DMG Reduction             | `damageReduction`   | official      |                                              |
| 失衡     | **Daze**                  | `daze`              | official      | mechanic; #105 currently `stun` (style pick) |
| 失衡易伤 | Daze Vulnerability        | `dazeVulnerability` | official+conv | the StunVuln zone                            |
| 暴击     | CRIT                      | `crit`              | official      |                                              |
| 有效防御 | effective defense         | `effectiveDefense`  | convention    | derived                                      |
| 等级基数 | level base                | `levelBase`         | 数据导论      | per-level table                              |

## Attribute anomalies & disorder (属性异常 / 紊乱)

| 中文        | English (official) | code identifier      | Source   | Notes                                          |
| ----------- | ------------------ | -------------------- | -------- | ---------------------------------------------- |
| 属性异常    | Attribute Anomaly  | `anomaly`            | official |                                                |
| 紊乱        | Disorder           | `disorder`           | official | ✓ already correct                              |
| 灼烧 (火)   | Burn (Fire)        | `burn`               | official |                                                |
| 感电 (电)   | Shock (Electric)   | `shock`              | official |                                                |
| 强击 (物理) | Assault (Physical) | `assault`            | official | the anomaly itself                             |
| 畏缩        | Flinch             | `physicalFlinch`     | official | lingering debuff; disorder source for physical |
| 冻结 (冰)   | Freeze (Ice)       | `freeze`             | official |                                                |
| 碎冰        | Shatter            | `shatter`            | official | freeze-end burst                               |
| 霜寒 (冰)   | Frostbite (Ice)    | `iceFrostbite`       | official | raises CRIT DMG taken                          |
| 侵蚀 (以太) | Corruption (Ether) | `etherCorruption`    | official |                                                |
| 玄墨        | Auric Ink          | `auricInkCorruption` | official | resolves via Ether                             |
| 烈霜        | Frost              | `frostFrostbite`     | official | resolves via Ice                               |

Note: the v1 `DisorderAnomalyType` enum (`burn` / `shock` / `etherCorruption` /
`iceFrostbite` / `physicalFlinch` / `auricInkCorruption` / `frostFrostbite`) keys
on the lingering disorder-source state and is already aligned with the official
element/anomaly names above.

## Damage zones (乘区) — #105 public surface

`code identifier` is the target zone key / `mode` after this glossary lands.

| 中文       | English                  | code identifier      | Source   | Notes                                         |
| ---------- | ------------------------ | -------------------- | -------- | --------------------------------------------- |
| 基础伤害区 | Basic Zone               | `basic`              | 数据导论 |                                               |
| 增伤区     | DMG Bonus Zone           | `dmgBonus`           | official | #105 `boost` → rename (style pick)            |
| 暴击区     | CRIT Zone                | `crit`               | official |                                               |
| 防御区     | DEF Zone                 | `defense`            | official | spelling pick                                 |
| 抗性区     | RES Zone                 | `resist`             | official |                                               |
| 减易伤区   | Vulnerability Zone       | `vulnerability`      | 数据导论 |                                               |
| 失衡易伤区 | Daze Vulnerability Zone  | `dazeVulnerability`  | official | #105 `stunVulnerability` → rename             |
| 贯穿增伤区 | Sheer DMG Bonus Zone     | `sheerBoost`         | official | (or `sheerDmgBonus` if 增伤=dmgBonus)         |
| 特殊乘区   | Special Zone             | `special`            | 数据导论 | distance decay                                |
| 异常精通区 | Anomaly Proficiency Zone | `anomalyProficiency` | official | **#105 `anomalyMastery` → fix (correctness)** |
| 伤害等级区 | DMG Level Zone           | `damageLevel`        | 数据导论 | trunc(1+(lvl-1)/59,4)                         |
| 异常增伤区 | Anomaly DMG Bonus Zone   | `anomalyDmgBonus`    | official | #105 `anomalyBoost` → rename (style pick)     |
| 异常暴击区 | Anomaly CRIT Zone        | `anomalyCrit`        | official |                                               |

## Pipeline & engine API (our convention)

These are Fairy architecture terms, not game concepts — Source = convention.

| 中文     | English       | code identifier | Notes                                     |
| -------- | ------------- | --------------- | ----------------------------------------- |
| 乘区     | zone          | `zone`          | a multiplier term                         |
| 乘区规格 | zone spec     | `ZoneSpec`      | serializable, public                      |
| 编译乘区 | compiled zone | `CompiledZone`  | internal, has `evaluate`                  |
| 乘区管线 | pipeline      | `pipeline`      | ordered `ZoneSpec[]`                      |
| 原始合计 | raw total     | `rawTotal`      | pre-ceil product                          |
| 合计     | total         | `total`         | per-hit ceil                              |
| 拆解     | breakdown     | `breakdown`     | per-zone `{ raw, clamped, clampApplied }` |
| 钳制     | clamp         | `clamp`         | range `[min, max]`                        |
