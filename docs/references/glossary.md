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
3. **One consistent form per concept; expand ambiguous abbreviations.** Where
   official mixes a short form and the full word (DMG / Damage), code uses the
   full word `damage` (e.g. `damageBonus`) — never mix `dmg` and `damage`.
   Established, unambiguous short forms may stay canonical (`atk`, `hp`, `crit`,
   `pen`).
4. **One Chinese term → one canonical code identifier.** No coexisting synonyms
   (`boost`/`damageBonus`, `stun`/`daze`, `defence`/`defense`). Aliases live only
   in Notes, never as a public API name.
5. **Every row cites a Source**: `official` (in-game EN/CN), `数据导论` (the data
   introduction reference / formula), `needs-verify` (official EN not yet
   confirmed), or `convention` (ours — never disguised as official). 米游社 /
   community usage goes in Notes as an alias and never overrides the official
   canonical. The 官方中文 and 官方 English columns are both canonical sources.

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
  the same PR. Renaming an **already-published** API is a breaking change — mark
  it breaking and add a migration note.
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

## Attributes / elements (属性)

| 官方中文 | 官方 English | code identifier | Source   | Notes                             |
| -------- | ------------ | --------------- | -------- | --------------------------------- |
| 物理     | Physical     | `physical`      | official |                                   |
| 火       | Fire         | `fire`          | official |                                   |
| 冰       | Ice          | `ice`           | official |                                   |
| 电       | Electric     | `electric`      | official |                                   |
| 以太     | Ether        | `ether`         | official |                                   |
| 烈霜     | Frost        | `frost`         | official | sub-attribute; resolves via Ice   |
| 玄墨     | Auric Ink    | `auricInk`      | official | sub-attribute; resolves via Ether |

## Skill types (技能类型) — for `skillMultiplier` context

| 官方中文   | 官方 English      | code identifier | Source   | Notes             |
| ---------- | ----------------- | --------------- | -------- | ----------------- |
| 普通攻击   | Basic Attack      | `basicAttack`   | official |                   |
| 闪避       | Dodge             | `dodge`         | official |                   |
| 闪避反击   | Dodge Counter     | `dodgeCounter`  | official |                   |
| 特殊技     | Special Attack    | `special`       | official |                   |
| 强化特殊技 | EX Special Attack | `exSpecial`     | official | consumes Energy   |
| 连携技     | Chain Attack      | `chain`         | official |                   |
| 终结技     | Ultimate          | `ultimate`      | official | needs max Decibel |
| 快速支援   | Quick Assist      | `quickAssist`   | official |                   |

## Other ZZZ mechanics (reference; mostly out-of-v1)

These appear in the data introduction's later PARTs (失衡 / 能量 / 秽息 /
部位破坏 / 打断) and are not implemented in v1; listed for naming consistency.

| 官方中文 | 官方 English   | code identifier | Source       | Notes                                          |
| -------- | -------------- | --------------- | ------------ | ---------------------------------------------- |
| 失衡     | Daze           | `daze`          | official     | the Daze meter (PART02)                        |
| 眩晕     | Stun (stunned) | `stunned`       | official     | state when Daze fills; distinct from 失衡      |
| 能量     | Energy         | `energy`        | official     | PART04                                         |
| 喧响     | Decibel(s)     | `decibel`       | official     | Decibel Rating → Ultimate                      |
| 弱点     | Weakness       | `weakness`      | official     | element the enemy is weak to                   |
| 打断     | Interrupt      | `interrupt`     | official     | PART07; 打断等级 = Interrupt Level             |
| 部位破坏 | Part Break     | `partBreak`     | needs-verify | PART06; confirm official EN before code use    |
| 秽息     | (秽息)         | —               | needs-verify | PART05 (2.0 mechanic); official EN unconfirmed |

## High-risk near-synonyms (disambiguate)

These pairs are easy to confuse — keep them distinct in code and review:

- **damage / DMG** → code always `damage` (DMG is display only).
- **daze / stun** → `daze` = 失衡 (meter); `stunned` = 眩晕 (state).
- **Anomaly Proficiency / Anomaly Mastery** → `anomalyProficiency` = 异常精通 (DMG,
  v1); `anomalyMastery` = 异常掌控 (buildup, reserved).
- **defense / DEF** → spelled `defense`; DEF is the official short form.
- **damageBonus / bonus** → `damageBonus` = 增伤; never bare `bonus`.

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
