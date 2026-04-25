# Core Domain Model Plan

## Summary

- This document defines the static snapshot combat domain model for `@randomplay/fairy-core`.
- The model targets a single calculation event at one frame in combat: a fixed team of 3 agents against 1 specific enemy.
- `core` owns formulas, multiplier resolution, pure calculation functions, and exported system constants.
- `core` does not own per-agent skill tables, per-enemy bespoke numeric data, or any battle timeline simulation.
- The implementation order derived from this design is tracked separately in [Core Implementation](implementation.md).

## Goal

Define a decision-complete domain model for static combat calculation in `@randomplay/fairy-core`, including:

- calculation inputs for team, enemy, battle context, and action event
- result outputs with numeric breakdowns and source traces
- rule-layer structure for multiplier buckets and stat resolution
- exported constants extracted from stable formulas in the reference material

## Approach

- Use a static snapshot model rather than a timeline or state machine.
- Evaluate one `ActionEvent` at a time, while allowing that event to read the full real-time snapshot of all 3 agents, the enemy, and the battle context.
- Model all formulas as pure functions.
- Model all buff/debuff effects as source-tagged modifier operations that can increase, decrease, or replace a bucket result.
- Keep `core` independent from `@randomplay/fairy-data`; all per-skill base values that require lookup remain input data rather than hardcoded core logic.

## Not Building

- No combat timeline progression, scheduler, or frame-by-frame simulation.
- No implicit duration ticking for statuses, shield decay, anomaly cooldowns, or energy gain over elapsed time.
- No hardcoded per-agent skill multipliers, base daze values, anomaly buildup values, energy gain tables, noise gain tables, or shield-reduction tables.
- No guessed formulas for mechanics that the reference does not define clearly.
- No battle AI, action sequencing, or target-selection logic.

## Public Domain Model

### Core snapshots

- `TeamFrameSnapshot`
  - Fixed-size tuple of exactly 3 agents.
  - Includes team ordering, front-line agent identity, and shared team-wide effects.
- `AgentFrameSnapshot`
  - Includes level, base stats, current resolved state inputs, equipment state, core/passive state, current resources, and active effects.
  - Includes agent-specific special conversions such as pierce-force conversion rules when provided by data.
- `EnemyFrameSnapshot`
  - Includes level, rank, defense data, resistance data, daze data, anomaly state, shield state, body-part state, interruption state, and active effects.
- `BattleContext`
  - Includes distance, current front-line agent, chain/assist context, shield-field context, anomaly context, and any environment modifiers that affect the current frame.
- `ActionEvent`
  - Represents the single event being evaluated.
  - Includes source actor (agent or Bangboo), attack tags, attribute, damage type, segment structure, and explicit flags required by formulas.
  - Segment structure is an ordered list of segments. Each segment carries per-segment base values across all formula axes: `damageMultiplier`, `dazeMultiplier`, `anomalyBuildup`, `energyGain`, `flashGain`, `noiseGain`, `shieldReduction`. Segments that do not participate in a given axis leave that field unset rather than zero.
  - Source-actor identity is required so that formula rules can exclude Bangboo from contexts the reference specifies (e.g. shield reduction, anomaly virtual-agent weighting).

### Core result shape

- `FrameEvaluation`
  - Aggregated output for the current `ActionEvent`.
  - Contains resolved values, rounded display values, bucket breakdowns, and source traces.
- `BucketTrace`
  - Captures the pre-clamp value, post-clamp value, applied operations, replacement source if any, and final result.
- `SegmentEvaluation`
  - One record per damage segment when the event contains multiple hit segments.
  - Stores raw value, rounded display value, and the bucket breakdown used for that segment.

## Modifier Model

- All effects are represented as modifier operations with:
  - `sourceId`
  - `bucket`
  - `mode`
  - `value`
  - optional `tags` drawn from the Tag Vocabulary
  - optional conditions
- `mode` covers at minimum:
  - `add`
  - `subtract`
  - `replace`
- The model must additionally support a forced-override semantic: a forced modifier preempts all `replace`, `add`, and `subtract` operations on the same bucket until its declared exit condition fires. The implementation may express this as a fourth `mode`, a priority field on `replace`, or a phase flag — the data shape is open, but the semantic is required. Forced modifiers must declare an explicit exit condition; they do not expire on their own.
- Each bucket resolves in a fixed order:
  1. start from bucket base
  2. sum all `add`
  3. sum all `subtract`
  4. apply replacement using the last matching `replace`
  5. apply any active forced override, preempting step 4 if present
  6. clamp to bucket range if defined
  7. emit trace
- Replacement overrides the aggregated bucket value, but the trace must retain the pre-replacement value and the replacing source. Forced overrides must also record the forcing source and the aggregated value at the moment of preemption.

### Tag vocabulary

Modifier conditions share a fixed tag vocabulary so that tag-filtered rules behave consistently across formula families. `core` must define tags for at least:

- attribute channels: `fire`, `electric`, `ice`, `physical`, `ether`, `frost`, `auricInk`
- damage-type channels: `regular`, `pierce`, `true`
- anomaly channels: `burn`, `shock`, `freeze`, `frostbite`, `assault`, `corrupt`, `disorder`
- action channels: `basic`, `dash`, `dodgeCounter`, `special`, `enhancedSpecial`, `chain`, `ultimate`, `quickAssist`, `defensiveAssist`, `evasiveAssist`, `followUp`

A tag-filtered modifier applies when its tag set intersects the target event's tag set. Effects tagged only with a source anomaly (for example `burn`) do not apply to `disorder` damage unless the modifier is also tagged `disorder`.

Attribute aliases participate in modifier tag matching. An event keeps its original attribute tag and also adds its alias channel when the alias differs from the original attribute:

- `frost` events match both `frost` and `ice` modifiers
- `auricInk` events match both `auricInk` and `ether` modifiers

## Rule Layers

### 1. Stat resolution

Pure functions resolve initial and final stats for agents and enemies.

- Support the reference formula pattern:
  - `initial = base * (1 + initialPercentDelta) + initialFlatDelta`
  - `final = initial * (1 + finalPercentDelta) + finalFlatDelta`
- Apply to attributes that follow the documented stat model, including:
  - ATK
  - HP
  - DEF
  - Impact
  - Pierce Force
  - Anomaly Proficiency
  - Anomaly Mastery
  - Energy Regen
  - Flash Regen
- Enemy-only derived stats that do not distinguish base vs. initial remain direct snapshot inputs unless the reference gives a stable formula.

### 2. Damage rule layer

Support the three static damage categories:

- regular damage
- pierce damage
- true damage

Support explicit bucket calculation for:

- base damage area
- damage bonus area
- crit area
- defense area (structured — see below)
- damage resistance area
- vulnerability/reduction area
- dazed-vulnerability area (active — applied while the enemy is in the dazed state)
- pre-daze dazed-vulnerability area (applied while the enemy is not dazed)
- pierce-damage bonus area
- special multiplier area

Active and pre-daze dazed-vulnerability are independent properties with independent modifier lists and independent clamp ranges. They must not share a result slot.

Defense area is not a single aggregated bucket. It composes three distinct modifier groups consumed by a fixed formula:

- `defense.reduction` — additive group covering "ignore defense %" and "defense reduction %" (these add together)
- `defense.penetrationRate` — multiplicative group applied to the reduced-defense subtotal
- `defense.penetrationFlat` — flat subtraction applied after penetration rate

Modifier operations target one of the three groups, not defense area as a whole.

Rules:

- regular damage uses defense area
- pierce damage skips defense area and uses pierce-damage bonus area
- true damage only uses the base damage area unless the specific mechanic explicitly defines otherwise
- multi-hit display damage rounds each segment upward first, then sums the displayed segment values

### 3. Daze rule layer

Support static daze evaluation for:

- base daze area
- daze resistance area
- outgoing daze bonus area
- incoming daze bonus area
- distance decay area
- direct daze gain or recovery
- daze ratio display
- daze recovery speed (canonical) and daze recovery duration (derived)
- daze recovery fixed delay (independent of speed)

Rules:

- enemy daze limit and current daze state are explicit snapshot inputs
- lock states such as capped daze ratio or immunity remain explicit enemy-state inputs
- daze recovery speed is the canonical state; daze recovery duration is derived as `1 / speed`. Any modifier that targets "stun duration" in percent must be converted to a speed delta via a core-owned transformer before entering the speed bucket. The transformer uses the inverse relationship `speed_new = speed_base / (1 + durationPercent)`, which is non-linear in `durationPercent`.
- fixed extra delay before daze recovery starts is a separate snapshot field on the enemy daze state, not a speed modifier. It composes additively from declared data sources (e.g. Lighter core passive, Yixuan mindscape 2).

### 4. Anomaly rule layer

Support static anomaly evaluation for:

- anomaly buildup
- anomaly buildup resistance area (independent property; distinct from damage resistance and daze resistance, even though the formula shape is shared)
- anomaly trigger threshold
- anomaly mastery area (异常掌控区)
- anomaly proficiency area (异常精通区)
- anomaly damage bonus area
- anomaly crit area
- damage level region (伤害等级区)
- virtual-agent weighted averaging
- disorder damage
- disorder daze contribution (with daze level region)
- anomaly duration formulas that are explicitly defined in the reference

Virtual agent composition:

- The virtual agent is a weighted average of agent-side fields across every buildup contribution to the triggered anomaly state.
- Captured fields, each weight-averaged by the contribution's applied buildup share:
  - level (floored to integer after averaging)
  - anomaly mastery
  - anomaly proficiency
  - ATK (default; any formula-specific override must be declared explicitly by the owning anomaly rule)
  - impact
  - penetration rate
  - penetration flat
  - damage-bonus area value resolved at the contributing hit
  - outgoing daze-bonus area value resolved at the contributing hit
- Weights are each contribution's applied buildup share (post-resistance, post-efficiency, post-distance-decay). Overflow buildup beyond the trigger threshold is excluded from both numerator and denominator. Bangboo-sourced contributions are excluded from both numerator and denominator.
- Anomaly damage bonus area and anomaly crit area resolve live at damage-time against the current snapshot; they are not frozen into the virtual agent.
- Enemy-side buckets (defense, resistance, reduction/vulnerability, dazed-vulnerability) resolve live at damage-time against the current enemy snapshot.

Rules:

- anomaly buildup uses base buildup input from data, not inferred from damage multiplier
- anomaly mastery is floored before entering the anomaly accumulation formula
- anomaly trigger thresholds use exported threshold tables
- disorder damage uses the virtual agent of the original (overwritten) anomaly state, with a disorder-specific base-multiplier formula and the disorder daze level region
- modifier operations targeting a specific source anomaly (e.g. `burn`) do not apply to disorder damage unless also tagged `disorder` (see Tag vocabulary)

### 5. Resource and special-mechanic rule layer

Support static formulas for:

- energy gain
- flash gain
- noise gain
- corruption gain
- corruption burst damage
- shield reduction
- shield purge damage
- freeze duration
- static interruption outcome

Rules:

- only formulas with stable documented structure belong in `core`
- values that are per-skill lookup data remain explicit inputs on `ActionEvent`
- interruption outputs only cover static judgment results such as whether interruption occurs and what effective level comparison was used
- hard-stun animation details remain out of scope

## Rounding Policy

The core must apply exactly these rounding rules, exported as named constants so tests can assert them directly. No implementation may substitute its own.

- `damageSegmentDisplay`: **ceil** — each damage segment's display value is rounded up before summing for multi-hit total display
- `anomalyMasteryForUse`: **floor** — anomaly mastery is floored before entering the anomaly accumulation formula
- `damageLevelRegion`: **trunc to 4 decimals** — damage-level region value uses `trunc(x, 4)`
- `virtualAgentLevel`: **floor** — virtual agent level is floored to integer after weighted averaging
- `dazeRatioDisplay`: **floor** — displayed daze ratio (%) rounds down

Any additional rounding rule introduced during implementation must be added to this list and exported as a named constant before being used.

## Required Pure Functions

The implementation phase should expose pure functions in roughly these groups:

- stat resolution
  - `resolveAgentStats`
  - `resolveEnemyStats`
  - `resolveBucket`
- damage
  - `calculateDirectDamage`
  - `calculateDamageSegments`
- daze
  - `calculateDazeContribution`
  - `calculateDazeRecovery`
- anomaly
  - `calculateAnomalyBuildup`
  - `calculateAnomalyTriggerThreshold`
  - `calculateAnomalyDamage`
  - `calculateDisorderDamage`
  - `calculateDisorderDaze`
- resources and special mechanics
  - `calculateEnergyGain`
  - `calculateFlashGain`
  - `calculateNoiseGain`
  - `calculateCorruptionGain`
  - `calculateCorruptionBurst`
  - `calculateShieldReduction`
  - `calculateStatusDuration`
  - `calculateInterruptOutcome`
- aggregate entry
  - `evaluateFrameEvent`
- tag helpers
  - `getAttributeModifierTags`

Function names may be refined during implementation, but the exported surface must preserve:

- pure-function semantics
- separated formula families
- one aggregate evaluator that composes the lower-level functions

## Exported Constants

`core` must export stable constants and lookup tables that can be derived directly from the reference and do not belong to per-agent or per-enemy content data.

### Export as constants or tables

- level coefficient table for levels 1 to 60+, including the capped value at 60+
- enemy base defense growth cap — base defense growth stops at level 60 (60+ reuses the level-60 base defense value)
- default crit constants
  - agent base crit rate
  - agent base crit damage
  - enemy base crit rate
  - enemy base crit damage
- bucket clamp ranges where the reference gives stable effective ranges
  - damage bonus area
  - crit rate
  - crit damage
  - damage resistance area
  - daze resistance area
  - anomaly buildup resistance area
  - vulnerability/reduction area
  - dazed-vulnerability area (active)
  - pre-daze dazed-vulnerability area
  - pierce-damage bonus area
  - anomaly mastery area
  - anomaly proficiency area
  - anomaly damage bonus area
  - anomaly crit area
  - energy gain efficiency
  - flash gain efficiency
  - noise gain efficiency
  - shield reduction efficiency
  - shield-being-reduced efficiency
- anomaly trigger threshold tables
- default status durations and default cooldown constants where explicitly defined
- disorder multiplier formulas and related stable constants (including daze level region coefficient)
- default shield constants, corruption constants, and support-parry interruption constants where explicitly defined
- attribute enumeration: `fire`, `electric`, `ice`, `physical`, `ether`, `frost`, `auricInk`
- attribute alias mappings
  - Frost uses Ice resistance/damage bonus channels
  - Auric Ink uses Ether resistance/damage bonus channels
- rounding rule constants (see Rounding Policy)
- tag vocabulary (see Modifier Model — Tag vocabulary)

### Do not export as core constants

- agent skill multipliers
- agent skill base daze values
- agent skill base anomaly buildup values
- agent skill base energy values
- agent skill base noise values
- agent skill base shield-reduction values
- enemy-specific body-part HP values
- enemy-specific anomaly threshold overrides unless they are normalized data records

## Data Boundary

The following remain data inputs owned by future `fairy-data` normalized records:

- per-agent skill definitions
- per-agent passive and equipment source metadata
- per-event base multiplier records
- enemy catalog records
- enemy-specific override tables
- any lookup value that must be maintained per content version

`core` only defines how these values are consumed once provided.

## Calculation Flow

1. Build the current `TeamFrameSnapshot`, `EnemyFrameSnapshot`, `BattleContext`, and `ActionEvent`.
2. Resolve agent and enemy stats from snapshot inputs and active modifier operations.
3. Resolve all required buckets for the event.
4. Evaluate the relevant formula family:
   - direct damage
   - daze
   - anomaly
   - resources
   - shield
   - interruption
5. Apply documented rounding or truncation rules.
6. Return the final numeric result plus bucket traces and per-source contributions.

## Example of Scope Interpretation

- A core passive that increases Ether damage for the front-line agent is a modifier source.
- A drive disc effect that replaces or overrides one bucket result is modeled with `replace`.
- An enemy shield state that adds defense and incoming damage reduction is modeled in the enemy snapshot plus modifier operations.
- A disorder calculation uses the original anomaly state's virtual-agent record plus the current enemy-side real-time multipliers.
- A part-break trigger's secondary effects (e.g. direct daze accumulation, percentage-HP damage) are emitted as declared triggered outputs with explicit source tracking. The data shape is an implementation choice (derived `ActionEvent`, triggered-effect record, or event emission are all acceptable) as long as the trace remains inspectable and every output is attributable to its part-break source.
- A phase-transition anti-interrupt level lock (e.g. Dead End Butcher, Bringer, Pompey, Ninave in 刀耕火焚, Unknown Compound Corrupted Body) is modeled as a forced-override modifier on the enemy's anti-interrupt bucket with an explicit exit condition tied to the phase state.

## Tests and Acceptance Criteria

Implementation must cover at least these scenarios:

- baseline direct-damage calculation against a high-level boss with no extra effects
- multi-agent contribution to one event through team buffs and enemy debuffs
- add/subtract/replace interaction inside the same bucket
- forced-override preempting a `replace` on the same bucket, with trace capturing both values
- regular vs. pierce vs. true damage comparison
- defense area composition: additive reduction group + multiplicative penetration rate + flat penetration subtraction
- active vs. pre-daze dazed-vulnerability independence (different modifier lists, different clamps)
- separate resistance channels: damage resistance, daze resistance, anomaly-buildup resistance do not cross-contaminate
- anomaly buildup, trigger threshold, anomaly damage, and disorder damage
- virtual-agent weighted averaging: every listed field is averaged by applied buildup share; overflow buildup and Bangboo contributions are excluded
- disorder tag isolation: a modifier tagged only `burn` does not apply to disorder damage; a modifier tagged `disorder` does
- disorder daze calculation
- freeze duration and daze recovery duration formulas
- stun duration percent → speed delta transformer: a `-40%` duration input becomes about a `+66.67%` speed adjustment (non-linear)
- fixed daze recovery delay composes additively and is independent of recovery speed
- energy, flash, noise, shield reduction, and corruption calculations
- bucket clamp behavior
- anomaly mastery flooring and anomaly-damage-level truncation
- per-segment upward rounding for multi-hit damage
- static interruption judgment from effective interruption level vs. anti-interruption level

Acceptance criteria:

- all exported functions are pure
- all exported constants are stable, deterministic, and versionable
- all bucket calculations are traceable to sources
- no formula depends on hidden mutable state
- no per-content lookup table is hardcoded in the rule layer unless it is a stable system constant

## Risks and Guardrails

- The biggest modeling risk is mixing stable formulas with content data. This document avoids that by keeping per-skill values out of `core`.
- The second risk is overfitting to full battle simulation. This document avoids that by making all ongoing durations and counters explicit inputs.
- The third risk is letting each formula family invent its own modifier semantics. This document avoids that by forcing all multiplier buckets through one operation model.

## Assumptions

- The first implementation version targets static snapshot evaluation only.
- Mechanics without a reliable closed-form rule in the reference are represented as explicit inputs or strategy enums, not inferred formulas.
- `core/domain-model` is the source of truth for `fairy-core` public interfaces; later `data/contract` and `data/core-mapping` plans should adapt to it rather than redefine it.
