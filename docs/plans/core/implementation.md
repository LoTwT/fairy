# Core Implementation Plan

## Summary

- This document defines the implementation order for `@randomplay/fairy-core` after the domain model is approved.
- It translates [Core Domain Model](domain-model.md) into concrete delivery stages, source layout, and validation checkpoints.
- The implementation stays package-local to `packages/core` and does not wait for `@randomplay/fairy-data`; all early tests use hand-authored fixtures.

## Goal

Implement the first non-placeholder version of `@randomplay/fairy-core` in a way that:

- preserves the approved static snapshot model
- exports only pure functions and stable constants
- keeps content data outside `core`
- produces deterministic, traceable formula outputs with test coverage at each layer

## Target Source Layout

The first implementation should split `packages/core/src` into explicit domain slices instead of growing `index.ts`:

- `types.ts`
  - snapshots, events, traces, result types, modifier types, and anomaly buildup contribution-history records required for virtual-agent weighting
- `constants.ts`
  - level table, clamp ranges, status defaults, threshold tables, tag vocabulary, rounding constants
- `math.ts`
  - `clamp`, `ceilDisplay`, `floorInt`, `trunc4`, and other deterministic numeric helpers
- `modifiers.ts`
  - bucket resolution, structured defense-group resolution, forced-override handling, trace generation
- `status.ts`
  - unified `calculateStatusDuration` entry point plus freeze duration and other explicit status-duration helpers
- `stats.ts`
  - initial/final stat resolution and derived-stat helpers
- `damage.ts`
  - direct damage, segment display handling, defense-area composition
- `daze.ts`
  - daze contribution, daze ratio display, canonical recovery speed, duration derivation, fixed delay
- `anomaly.ts`
  - anomaly buildup, threshold lookup, virtual-agent construction, anomaly damage, disorder damage, disorder daze
- `resources.ts`
  - energy, flash, noise, corruption, shield reduction, freeze duration, similar static formulas
- `interrupt.ts`
  - effective interrupt vs. anti-interrupt judgment, forced anti-interrupt overrides
- `evaluate.ts`
  - aggregate `evaluateFrameEvent` entry point
- `index.ts`
  - root barrel exporting only approved public API

No subpath package exports should be introduced in this phase. Internal file structure may grow, but the package manifest continues to export only `"."`.

## Execution Stages

### Stage 1 — Replace the placeholder API with shared primitives

- Remove the current stub-only `calculate(): { damage: 0 }` shape.
- Update `packages/core/src/index.ts` in this same stage. `index.ts` is incrementally maintained throughout the implementation; it is not deferred to the end.
- Update `tests/smoke.test.ts` in this same stage so it no longer asserts the placeholder `calculate()` contract.
- Introduce root domain types, stable constants, rounding constants, tag vocabulary, the generic modifier model, and the anomaly buildup contribution-history schema required by Stage 4 virtual-agent weighting. The contribution-history schema may live on a snapshot field, anomaly-state record, or another evaluation input reachable from the aggregate evaluator, but it must exist before Stage 4 begins.
- Implement the shared bucket resolver first, including:
  - `add`
  - `subtract`
  - `replace`
  - forced-override semantics with explicit exit conditions
- Implement structured defense-group resolution here rather than embedding it in `damage.ts`, because defense groups are a specialized instance of the same bucket semantics and should share trace, replacement, clamp, and forced-override behavior.

Acceptance for Stage 1:

- `packages/core/src/index.ts` exports types and primitives without any placeholder values
- bucket tests cover `add` + `subtract` + `replace` algebra, forced override preempting normal replacement, and clamp behavior
- bucket traces include pre-replacement value, replacing source, forced-override source where present, and final value
- `tests/smoke.test.ts` validates the Stage 1 root export contract rather than the deleted placeholder `calculate()` contract

### Stage 2 — Implement stat resolution and direct damage

- Implement stat-resolution functions for agent stats that follow the approved initial/final formula pattern.
- Implement `resolveEnemyStats` for enemy-side stat access, including pass-through fields that remain direct snapshot inputs and any approved derived helpers (such as base-defense growth capping).
- Implement direct damage formulas for:
  - regular damage
  - pierce damage
  - true damage
- Implement crit area handling, including default agent/enemy crit constants and crit clamp behavior.
- Implement independent damage channels for:
  - damage resistance
  - active dazed-vulnerability
  - pre-daze dazed-vulnerability
- Implement segment-level upward display rounding and total display summation.

Acceptance for Stage 2:

- damage fixtures cover regular vs. pierce vs. true damage
- crit fixtures cover crit area behavior, default agent/enemy crit constants, and crit-rate / crit-damage clamp behavior
- defense-group tests confirm additive reduction + multiplicative penetration rate + flat penetration subtraction
- active vs. pre-daze vulnerability channels do not share state or clamp ranges

### Stage 3 — Implement daze formulas

- Implement base daze, resistance, outgoing/incoming daze modifiers, distance decay area, and daze ratio display.
- Store daze recovery speed as the canonical state.
- Implement the transformer that converts "stun duration ±%" style inputs into speed deltas before bucket resolution.
- Keep fixed daze-recovery delay as a separate field on enemy daze state.

Acceptance for Stage 3:

- tests prove distance decay affects daze contribution through the daze formula path
- tests prove duration modifiers map to speed deltas using the inverse relationship
- tests prove fixed delay composes independently from speed
- daze ratio display rounds down

### Stage 4 — Implement anomaly, virtual-agent, and disorder formulas

- Implement anomaly buildup with its own resistance channel.
- Implement threshold lookup from exported tables.
- Implement anomaly duration helpers and the anomaly branch of the unified `calculateStatusDuration` entry point.
- Implement the virtual-agent builder exactly as specified in [Core Domain Model](domain-model.md):
  - fixed captured-field list
  - weighted by applied buildup share
  - overflow excluded
  - Bangboo excluded
  - virtual-agent level floored
- Implement anomaly damage, anomaly crit, and disorder damage/daze formulas.
- Apply tag-filter rules so source-anomaly-only modifiers do not leak onto disorder without the `disorder` tag.

Acceptance for Stage 4:

- tests validate every captured virtual-agent field
- tests validate overflow buildup is excluded from both numerator and denominator
- tests validate Bangboo-sourced contributions are excluded from both numerator and denominator
- tests validate anomaly mastery is floored before entering the accumulation formula
- tests validate damage-level region applies `trunc(x, 4)`
- tests validate anomaly buildup resistance does not cross-contaminate with damage resistance or daze resistance
- tests validate virtual-agent level is floored after weighted averaging
- tests validate live enemy-side multiplier resolution at anomaly-damage time
- tests validate disorder tag isolation

### Stage 5 — Implement resources, shield, and interruption

- Implement:
  - energy gain
  - flash gain
  - noise gain
  - corruption gain and burst damage
  - shield reduction and purge damage
  - freeze duration
  - static interruption outcome
- Complete and export the unified `calculateStatusDuration` public entry point so it covers both anomaly/status-duration helpers from Stage 4 and freeze duration from this stage.
- Treat anti-interrupt forced states as the same forced-override semantic already introduced in Stage 1.
- Keep part-break and similar triggered follow-up effects traceable as explicit triggered outputs; the representation may be a derived `ActionEvent`, a triggered-effect record, or an internal event emission, but the source must remain inspectable.

Acceptance for Stage 5:

- tests prove Bangboo exclusions still hold where the reference requires them
- tests prove `calculateStatusDuration` dispatches correctly across the explicit supported duration formulas
- tests prove interrupt judgment respects forced anti-interrupt states
- tests prove triggered follow-up outputs remain attributable to their source

### Stage 6 — Compose the aggregate evaluator

- Implement `evaluateFrameEvent` as the package-level composition point.
- Keep sub-calculators independently testable; `evaluateFrameEvent` must orchestrate, not absorb, all lower-level logic.
- Return a single deterministic `FrameEvaluation` that includes:
  - resolved numeric outputs
  - per-segment outputs
  - bucket traces
  - triggered follow-up outputs when present

Acceptance for Stage 6:

- one end-to-end fixture exercises damage, daze, anomaly, and triggered outputs through the aggregate evaluator
- root exports remain pure and deterministic

## Test Layout

Add dedicated tests under `tests/core` rather than overloading the scaffold smoke test:

- `tests/core/modifiers.test.ts`
- `tests/core/stats.test.ts`
- `tests/core/damage.test.ts`
- `tests/core/daze.test.ts`
- `tests/core/anomaly.test.ts`
- `tests/core/resources.test.ts`
- `tests/core/interrupt.test.ts`
- `tests/core/evaluate.test.ts`
- `tests/core/fixtures.ts`

These test files are created incrementally with their owning stage. Do not defer all of `tests/core/*` until the end of the implementation.

Update `tests/smoke.test.ts` so it no longer asserts the old placeholder `calculate()` contract. It should instead verify that:

- `@randomplay/fairy-core` exports the expected public entry points
- one minimal deterministic fixture can be evaluated without runtime side effects

## Stage-Local Delivery Rule

Each stage is delivered as a vertical slice rather than as a repo-wide "all source first, all tests last" sequence.

- Within a stage, use this local order:
  1. `types.ts`, `constants.ts`, `math.ts` updates required by that stage
  2. owning source files for that stage
  3. `tests/core/*` files owned by that stage
  4. `packages/core/src/index.ts` updates for any public-surface changes in that stage
  5. `tests/smoke.test.ts` updates if the stage changes the root export contract
- `index.ts` is updated incrementally in every stage that adds, removes, or reshapes public exports.
- The anomaly stage should start only after modifier, damage, and daze helpers are stable. It has the highest type and fixture complexity and should not be used to discover base infrastructure decisions late.

## Validation Checkpoints

Run these at the end of each completed stage:

- `pnpm typecheck`
- `pnpm test`

Stop after Stage 1 for explicit review before entering Stage 2. The modifier and bucket abstractions are a gate; later formula stages should not proceed until that layer is reviewed in isolation.

Run these before considering the package implementation slice complete:

- `pnpm lint`
- `pnpm build`
- `pnpm verify:artifacts`
- `pnpm test`

Run `pnpm check` once the placeholder smoke contract has been removed and the new root export contract is stable.

## Assumptions

- The first implementation uses hand-authored fixtures and does not depend on normalized game data yet.
- `@randomplay/fairy-core` keeps a root-only export surface in this phase.
- Tests remain under the repository root `tests/` directory in this phase; they are not moved into `packages/core/tests/`.
- Stage 1 is a breaking replacement of the scaffold placeholder contract, so `tests/smoke.test.ts` must be updated in the same change.
- No CLI integration changes are required here; CLI updates remain owned by the CLI contract and later implementation work.
- If a formula requires data not yet normalized, tests provide explicit fixture inputs rather than adding temporary hardcoded content tables to `core`.

## Open Considerations Before Stage 6

- Trace volume may grow quickly for long multi-segment events. Before Stage 6 is finalized, choose whether the aggregate evaluator always returns full traces or exposes a public trace-detail control such as `full`, `compact`, or `off`.
- Any trace-detail strategy chosen before Stage 6 must preserve the existing formula-function purity and avoid forcing a later breaking change to the aggregate evaluator signature.
