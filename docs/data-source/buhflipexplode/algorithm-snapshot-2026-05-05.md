# buhflipexplode Algorithm Snapshot 2026-05-05

Status: accepted baseline
Source snapshot: `data/source/raw/buhflipexplode/2026-05-05T0445Z/`
Manifest: `data/source/raw/buhflipexplode/2026-05-05T0445Z/algorithm-manifest.json`

This document summarizes observed behavior for Fairy's independent
implementation. It intentionally does not copy GPL JavaScript source into Fairy
runtime code.

## Runtime Config

- `vLive = 35`
- `vBeta = 36`
- `v22 = 19`
- `v28 = 36`
- The page hides versions above `vLive` unless the leaks toggle is enabled.
- The page labels versions with index `>= vBeta` as beta.

Fairy treats versions above `vLive` as non-live and excludes them from retained
source subsets and cleaned data.

## Data Assets

The Deadly Assault page fetches three data assets:

- `da-versions.json`
- `../../assets/zzz/enemies.json`
- `../../assets/zzz/buffs.json`

Fairy stores live-filtered source-format subsets because the upstream payloads
also contain non-live configuration.

## Observed Calculations

Deadly Assault page values are display/support calculations for source data
cleaning. They are not copied into Fairy runtime code.

### Boss HP

For each side, displayed boss HP is derived from:

- enemy base HP for the selected enemy `type`;
- the side's version HP multiplier, unless the enemy entry overrides it with
  `hpMult`;
- the page constants `24795`, `8.74`, and `/10000`.

The page floors per-side displayed HP. Raw 60k boss HP is the sum of the three
per-side values before final rounding. Raw 20k boss HP uses a fixed score ratio
`0.281083138`.

### Alt HP

Alt HP starts from raw boss HP, then applies page-specific adjustments:

- DEF normalization for newer boss IDs with displayed DEF below 60;
- mechanic adjustments keyed by enemy tags such as `ucc`, `hunter`, `miasma`,
  `shutdown`, and `convert`;
- version-dependent adjustments for some tag paths.

Fairy should treat this as source-derived Deadly Assault effective HP metadata,
not as a general combat formula.

### Enemy Stat Display

The page derives displayed DEF, max daze, stun multiplier/time, anomaly buildup
threshold hints, and resistance/weakness icons from the enemy payload plus the
version daze/anomaly multipliers.

Observed formulas include:

- displayed DEF from enemy base DEF and constant `1588`;
- max daze from version daze multiplier, constant `2.35`, and enemy base daze;
- min anomaly buildup from version anomaly multiplier, enemy base anomaly,
  attribute-specific constants, and element multiplier / resistance data.

### Score Calculator

The page's boss score calculator uses a fixed threshold table of score chunks
and HP chunks. HP chunks scale with the selected source version's HP multiplier.

This supports Deadly Assault display parity only; it is not a replacement for
Fairy's `@randomplay/core` damage formula engine.

## Drift Rules

If any selected algorithm section hash changes in a future snapshot:

1. Do not publish cleaned data.
2. Mark the release as `algorithmChanged=true`.
3. Update this document or add a new dated snapshot document.
4. Decide whether Fairy's independent implementation must change.
5. Re-run parity fixtures before promoting the source snapshot to accepted.
