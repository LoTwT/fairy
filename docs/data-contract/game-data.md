# GameData

Status: S2 draft
Owner: @TechLead
Reviewers: @Product, @QA
Inputs: Product v2.0, D-11 naming policy, data-source decisions

`GameData` is the cleaned, generated data shape that `@fairy/data` publishes and
`@fairy/core` consumes through a resolver. It is not raw Excel, raw HTML, or
user-authored calculation input.

## 1. Data Pipeline Boundary

```text
raw source (Excel / crawler)
  -> parser-specific raw records
  -> cleaned GameData
  -> resolver(GameData, BattleSnapshot)
  -> resolved calculation input
  -> @fairy/core
```

Core must not depend on raw source field names. `sourceAliases` are accepted only
at ingestion/migration boundaries.

## 2. Shape

```ts
interface GameData {
  schemaVersion: string
  gameVersion: string
  dataVersion: string
  sourceVersion: string
  generatedAt: string
  sources: SourceDocument[]

  agents: Record<string, AgentData>
  skills: Record<string, SkillData>
  wEngines: Record<string, WEngineData>
  driveDiscs: Record<string, DriveDiscData>
  enemies: Record<string, EnemyData>
  resonium: Record<string, ResoniumData>
  modifiers: Record<string, ModifierTemplate>
  rules: RuleTables
  aliases: SourceAliasTable
}
```

Formal `GameData` values must be derived from source documents. Manually written
golden fixtures are allowed under `fixtures/golden/`, but they are not formal
published data.

## 3. Source Metadata

```ts
interface SourceDocument {
  id: string
  kind: "excel" | "mihoyoWiki" | "thirdPartySite" | "manualReview"
  url?: string
  fileName?: string
  gameVersion?: string
  sourceVersion: string
  fetchedAt?: string
  parsedAt: string
  parserVersion: string
  licenseNote?: string
}

interface SourceRef {
  sourceId: string
  sourceAnchor?: string
  sourceVersion?: string
  dataPath?: string
}
```

`manualReview` means a human reviewed source-derived data or a fixture. It must
not become a source for invented formal data.

## 4. Agents

```ts
interface AgentData {
  id: string
  label: LocalizedLabel
  source: SourceRef
  attribute: Attribute
  agentSpecialty: AgentSpecialty
  baseStatsByLevel?: LevelTable<AgentBaseStats>
  skillIds: string[]
  mindscapeCinema?: MindscapeCinemaData
  potentialActivation?: PotentialActivationData
  corePassiveModifiers?: ModifierTemplate[]
  sourceAliases?: string[]
}
```

Rupture agents expose `agentSpecialty: "rupture"`. Agent-specific `sheerForce`
coefficients are data-driven and must fail loudly when a rupture calculation
requires them but the data row is missing.

## 5. Skills And Attack Segments

```ts
interface SkillData {
  id: string
  agentId: string
  label: LocalizedLabel
  source: SourceRef
  tags: AttackTag[]
  attribute?: Attribute
  segments: SkillSegmentData[]
}

interface SkillSegmentData {
  id: string
  levelKey: string
  multiplierByLevel?: LevelTable<number>
  dazeMultiplierByLevel?: LevelTable<number>
  damageType?: DamageType
  hitCount?: number
  defaultTags?: AttackTag[]
  source: SourceRef
}
```

Skill data can provide default segments. `BattleSnapshot.attackSegments[]` still
remains the executable calculation input because the user may override segment
state, target, tags, distance decay, or manual scenario fields.

## 6. Equipment And Sources

```ts
interface WEngineData {
  id: string
  label: LocalizedLabel
  source: SourceRef
  baseStatsByLevel?: LevelTable<Record<string, number>>
  passiveModifiers?: ModifierTemplate[]
  sourceAliases?: string[]
}

interface DriveDiscData {
  id: string
  label: LocalizedLabel
  source: SourceRef
  twoPieceModifiers?: ModifierTemplate[]
  fourPieceModifiers?: ModifierTemplate[]
  sourceAliases?: string[]
}

interface ResoniumData {
  id: string
  label: LocalizedLabel
  sourceMode: "lostVoid"
  category?: string
  source: SourceRef
  modifiers?: ModifierTemplate[]
  sourceAliases?: string[]
}
```

V1 needs Resonium only when it affects damage, daze, anomaly, or recovery
calculations. Lost Void submodules are out of bilingual scope unless a data
source requires a stable internal key.

## 7. Enemies

```ts
interface EnemyData {
  id: string
  label: LocalizedLabel
  source: SourceRef
  rank: EnemyRank
  levelDefaults?: LevelTable<EnemyLevelStats>
  resistance?: Partial<Record<ResistanceAttribute, number>>
  anomalyBuildupResistance?: Partial<Record<ResistanceAttribute, number>>
  dazeRecovery?: DazeRecoveryData
  specialRules?: ModifierTemplate[]
  sourceAliases?: string[]
}
```

Enemy presets may be incomplete outside golden-anchor coverage. Missing required
fields must be a data validation error or calculation error, not a silent
fallback.

## 8. Rule Tables

```ts
interface RuleTables {
  defense?: DefenseRuleTable
  anomalyThreshold?: AnomalyThresholdTable
  disorder?: DisorderRuleTable
  dazeLevelZone?: DazeLevelZoneRule
  trueDamage?: TrueDamageRuleTable
  rounding?: RoundingRuleTable
  attributeMapping?: AttributeMappingTable
}
```

Rule tables carry `source` and `ruleSetVersion`. Numeric game data can have its
own `dataVersion`; formula behavior is controlled by `ruleSetVersion`.

## 9. Aliases And Migration

```ts
interface SourceAliasTable {
  fields: Record<string, string>
  enumValues: Record<string, string>
  sourceTerms: Record<string, string>
}
```

At minimum, S2 migration tests should cover:

- one old `breach*` field mapping to a D-11 `sheer*` or `adrenaline*` field
- one old anomaly field mapping after the candidate-Y swap
- one community/source alias such as `resonia` -> `resonium`

Aliases should be preserved in trace when an imported snapshot or source row is
migrated.
