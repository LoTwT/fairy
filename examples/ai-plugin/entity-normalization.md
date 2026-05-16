# Entity normalization fixtures (zh ↔ en ↔ canonical id)

Per `docs/ai-plugin/prompt-templates.md` §8, the AI plugin's entity normalization layer maps user-provided natural-language entity names (in zh or en) to canonical fairy GameData ids. This file is the **fixture source** that QA G3 acceptance harness uses to validate the routing behavior.

## Format

```
| User input variants            | Canonical id              | GameData type     |
|--------------------------------|---------------------------|-------------------|
| <zh name> / <en name> / alias  | <id>                      | character / weapon / equipment / bangboo / monster |
```

The "user input variants" column lists all the natural-language strings (zh, en, aliases) that should normalize to the same canonical id.

---

## Agents (characters)

| User input variants | Canonical id | GameData type |
|---|---|---|
| 仪玄 / Yixuan / yixuan | `1371` | character |
| 妮可 / 妮可·德玛拉 / Nicole / Nicole Demara / nicole | `1031` | character |
| 安比 / 安比·德玛拉 / Anby / Anby Demara | `1011` | character |
| 11号 / Soldier 11 / S11 / soldier11 | `1041` | character |
| 柳 / Yanagi | `1221` | character |
| 苍角 / Soukaku | `1131` | character |
| 凯撒 / Caesar | `1071` | character |
| 艾莲 / Ellen | `1191` | character |
| 朱鸢 / Zhu Yuan / zhuyuan | `1241` | character |
| 柏妮思 / Burnice | `1171` | character |

**Notes**:
- "安比" alone is ambiguous in casual usage (might be referring to Anby Demara across multiple versions); per `prompt-templates.md` §8.3 ambiguity policy, AI surfaces disambiguation candidates with id + version.
- English aliases include lowercase variants AI must recognize.
- New agents added to nanoka 2.8+ should append to this table.

## W-Engines (weapons)

| User input variants | Canonical id | GameData type |
|---|---|---|
| 青溟笼舍 / Qingming Birdcage / qingming birdcage | `14137` | weapon |
| 啄木鸟电音 (as weapon, not Drive Disc) — N/A | — | (Woodpecker is a Drive Disc set, see below) |
| 钢铁肉垫 / Steel Cushion | `14102` | weapon |
| 街头巨星 / Street Superstar | `13001` | weapon |

**Notes**:
- W-Engine names often share Chinese theme keywords with Drive Disc sets ("啄木鸟", "钢铁"); AI must disambiguate by GameData type (Weapon vs Equipment).
- Refinement level is a **critical field** orthogonal to weapon id; both must be resolved.

## Drive Disc sets (equipment)

| User input variants | Canonical id | GameData type |
|---|---|---|
| 啄木鸟电音 / Woodpecker Electro / woodpecker | `31000` | equipment (set) |
| 激素朋克 / Hormone Punk | `31400` | equipment (set) |
| 摇摆爵士 / Swing Jazz | `31600` | equipment (set) |
| 极地重金属 / Polar Metal | `32500` | equipment (set) |

**Notes**:
- Drive Disc set has 2pc + 4pc effect; AI must clarify which combination ("4套" vs "2 套 + 2 套" mix).
- Panel values inferred from Drive Disc main stats and substats are Tier 2 optional fields (per 3-tier policy), with documented 5★ midpoint-derived panel defaults.

## Bangboos

| User input variants | Canonical id | GameData type |
|---|---|---|
| 企鹅布 / Penguinboo / penguinboo | `53001` | bangboo |
| 鲨牙布 / Sharkboo / sharkboo | `54001` | bangboo |
| 插头布 / Plugboo / plugboo | `54008` | bangboo |

**Notes**:
- Bangboo "skill_prop" data covers active and chain damage multipliers + daze + anomaly buildup per V1.1.

## Enemies (monsters)

| User input variants | Canonical id | GameData type |
|---|---|---|
| 格莱特 / Greta | `30004` | monster |
| 凶心疯汉 / Ruthless Fiend | `200141` | monster |
| 装甲哈提 / Armored Hati | `20003` | monster |

**Notes**:
- Enemy id resolution may require variant mapping in future V1.2.x patches.
- V1.2.2 examples use explicit runtime ids from `packages/data/cleaned/runtime/game-data.json`.

## DA scope markers

| User input | Resolved scope |
|---|---|
| 危局强袭战 / Deadly Assault / DA | DA scope marker; this fixture uses Greta `enemy.id=30004` |
| "本期 DA" / "current DA" | Same; this fixture resolves to Greta `enemy.id=30004` |
| "上期 DA" / "previous DA" | Historical DA scope; resolves to `historicalDAPeriods` bucket |

---

## Disambiguation flow examples

When AI cannot determine a unique canonical id from user input, surface candidates per `prompt-templates.md` §4.4. Examples:

```
User: "我想算 Anby..."
AI candidates surface:
  1. Anby Demara (id 1011, S 级, V1 onward) — 默认匹配

Single candidate → AI proceeds with id=1011 + records "anby" → 1011 in fixture.
```

```
User: "把 S11 算一下"
AI candidates surface:
  1. Soldier 11 (id 1041) — only candidate

Single candidate → AI proceeds.
```

```
User: "啄木鸟"  (no context: weapon vs Drive Disc?)
AI:
  "你说的 '啄木鸟' 是 W-Engine 还是 Drive Disc?
   - W-Engine: (无对应 — nanoka 数据里 '啄木鸟' 仅 Drive Disc set)
   - Drive Disc 套装: 啄木鸟电音 (id 31000)"

User confirms Drive Disc → AI proceeds with 31000.
```

## Cross-lang routing

Per `user-journeys.md` §5 lang detection, entity normalization is independent of dialog lang:

```
zh dialog + en entity: "算 Yixuan 60 级"
  → Yixuan → 1371
  → session lang stays zh
  → AI response in zh

en dialog + zh entity: "calc 仪玄 level 60"
  → 仪玄 → 1371
  → session lang stays en
  → AI response in en
```

Both cases must produce identical canonical id; only the AI response lang differs.

---

## Coverage status (V1.2.2 MVP)

This fixture covers the entities used in V1.2.2 MVP prompts:
- ✅ Agents: 仪玄 / 安比 / 妮可 / S11 / 柳 (used in build-* prompts)
- ✅ W-Engines: 青溟笼舍 (yixuan basic build)
- ✅ Drive Disc sets: 啄木鸟电音 / 激素朋克 (yixuan build)
- ✅ Bangboos: 企鹅布 / 鲨牙布 / 插头布 (3 anchor coverage)
- ✅ Enemies: G18-G20 anchors (basic only; V1.2.2 doesn't expand enemy scenarios)
- ✅ DA scope marker (resolved to live sample fixture)

**Out of MVP scope** (per D-21):
- Full character / W-Engine / Drive Disc / enemy variant coverage — supported in fixture data via nanoka, not enumerated here.
- Resonium / Sentinel mapping — removed per R4 / V1.2.3.

If new entities are introduced in V1.2.x patches, append rows to this table and ensure both zh and en variants are listed.
