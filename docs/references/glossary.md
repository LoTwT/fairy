# Glossary — ZZZ terms ↔ English ↔ code identifiers

This is the single naming contract for Fairy's domain (Zenless Zone Zero damage).
Every public type / function / parameter / zone / enum name traces to a row here.
If a public name has no row, the name is undefined — do not publish it.

## Naming convention

1. **Official ZZZ English is canonical for word choice.** The English term follows
   official in-game usage (e.g. "DMG Bonus", "Daze"); code identifiers are the
   camelCase form. Terms that are our own (architecture, not a game concept) are
   marked **convention** in Source.
2. **American spelling** for any British/American difference (HoYo localization),
   e.g. `defense` not `defence`.
3. **`DMG` in official names → `damage` in code.** Official UI abbreviates to
   "DMG" (DMG Bonus, CRIT DMG, Sheer DMG); code identifiers spell the full word
   `damage` so there is one consistent form — never mix `dmg` and `damage`.
4. **One Chinese term → one canonical code identifier.** No coexisting synonyms
   (`boost`/`damageBonus`, `stun`/`daze`, `defence`/`defense`).
5. **Every row cites a Source**: `official` (in-game EN), `数据导论` (the data
   introduction reference / formula), or `convention` (ours — never disguised as
   official).

Sources for the official English: ZZZ Fandom Wiki, Prydwen, Game8, ScreenRant
(see PR description for links).

## Maintenance

This glossary is a living contract and must be kept in sync with the code:

- **Add the term here first.** Before a new public type / function / parameter /
  zone / `mode` / enum value ships, add its row (中文 / official English / code
  identifier / Source). A public name with no glossary row must not be published.
- **One concept, one identifier.** If you need a new word for an existing concept,
  reuse its row; do not introduce a synonym.
- **Renames are glossary-first.** Change the row, then rename in code + tests in
  the same PR.
- The working rule that enforces this lives in
  [../../AGENTS.md](../../AGENTS.md).

## Decided conventions (per maintainer: official usage + American spelling)

| 中文 | English (official) | code identifier | was (#105 draft) |
| ---- | ------------------ | --------------- | ---------------- |
| 失衡 | Daze               | `daze`          | `stun`           |
| 增伤 | DMG Bonus          | `damageBonus`   | `boost`          |
| 防御 | DEF / Defense      | `defense`       | `defence`        |

## ⚠️ Correctness fix this glossary locks in (vs the current #105 draft)

- **异常精通 = Anomaly Proficiency** (boosts anomaly **damage**) — the #105 engine
  currently calls this `anomalyMastery`, which is **wrong**. Official **Anomaly
  Mastery = 异常掌控** (boosts **buildup** speed), a _different_ stat that is
  out-of-scope for v1. This is a correctness fix, not a style choice.

## Core stats (角色属性)

| 中文     | English (official)      | code identifier      | Source   | Notes                                                            |
| -------- | ----------------------- | -------------------- | -------- | ---------------------------------------------------------------- |
| 攻击力   | ATK                     | `atk`                | official |                                                                  |
| 生命值   | HP                      | `hp`                 | official |                                                                  |
| 防御力   | DEF / Defense           | `defense`            | official | American spelling; #105 was `defence`                            |
| 冲击力   | Impact                  | `impact`             | official | Daze-buildup stat                                                |
| 贯穿力   | Sheer Force             | `sheerForce`         | official | break agents                                                     |
| 异常精通 | **Anomaly Proficiency** | `anomalyProficiency` | official | boosts anomaly DMG; **#105 mislabels as `anomalyMastery` → fix** |
| 异常掌控 | **Anomaly Mastery**     | `anomalyMastery`     | official | boosts buildup; **v1 out-of-scope / reserved**                   |
| 暴击率   | CRIT Rate               | `critRate`           | official |                                                                  |
| 暴击伤害 | CRIT DMG                | `critDamage`         | official |                                                                  |
| 穿透率   | PEN Ratio               | `penRatio`           | official |                                                                  |
| 穿透值   | PEN (flat)              | `penValue`           | official |                                                                  |
| 等级     | Level                   | `level`              | official |                                                                  |

## Damage & combat mechanics

| 中文     | English (official)        | code identifier     | Source        | Notes                        |
| -------- | ------------------------- | ------------------- | ------------- | ---------------------------- |
| 伤害     | DMG                       | `damage`            | official      |                              |
| 常规伤害 | regular DMG               | `regular`           | convention    | non-sheer path               |
| 贯穿伤害 | Sheer DMG                 | `sheer`             | official      | 贯穿 = Sheer                 |
| 增伤     | DMG Bonus                 | `damageBonus`       | official      | #105 was `boost`             |
| 抗性     | RES                       | `resist`            | official      |                              |
| 易伤     | Vulnerability (DMG taken) | `vulnerability`     | 数据导论      | no single official stat word |
| 减伤     | DMG Reduction             | `damageReduction`   | official      |                              |
| 失衡     | **Daze**                  | `daze`              | official      | mechanic; #105 was `stun`    |
| 失衡易伤 | Daze Vulnerability        | `dazeVulnerability` | official+conv | the Daze-vuln zone           |
| 暴击     | CRIT                      | `crit`              | official      |                              |
| 有效防御 | effective defense         | `effectiveDefense`  | convention    | derived                      |
| 等级基数 | level base                | `levelBase`         | 数据导论      | per-level table              |

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
| 增伤区     | DMG Bonus Zone           | `damageBonus`        | official | #105 `boost` → rename                         |
| 暴击区     | CRIT Zone                | `crit`               | official |                                               |
| 防御区     | DEF Zone                 | `defense`            | official | #105 `defence` → rename                       |
| 抗性区     | RES Zone                 | `resist`             | official |                                               |
| 减易伤区   | Vulnerability Zone       | `vulnerability`      | 数据导论 |                                               |
| 失衡易伤区 | Daze Vulnerability Zone  | `dazeVulnerability`  | official | #105 `stunVulnerability` → rename             |
| 贯穿增伤区 | Sheer DMG Bonus Zone     | `sheerDamageBonus`   | official | #105 `sheerBoost` → rename                    |
| 特殊乘区   | Special Zone             | `special`            | 数据导论 | distance decay                                |
| 异常精通区 | Anomaly Proficiency Zone | `anomalyProficiency` | official | **#105 `anomalyMastery` → fix (correctness)** |
| 伤害等级区 | DMG Level Zone           | `damageLevel`        | 数据导论 | trunc(1+(lvl-1)/59,4)                         |
| 异常增伤区 | Anomaly DMG Bonus Zone   | `anomalyDamageBonus` | official | #105 `anomalyBoost` → rename                  |
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
