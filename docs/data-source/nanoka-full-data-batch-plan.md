# Nanoka Full-Data Batch Plan

Status: V1.2.x discovery locked for task #179.

This plan extends the V1.2.1 Bangboo batch import into the rest of the nanoka-backed data that fairy can use. It records the implementation boundary before the larger domain PRs land.

## Locked Decisions

| Decision | Value |
|---|---|
| Batch order | Sequential per domain |
| Enemy scope | All current-live monster index records |
| Deadly Assault scope | Current live plus historical periods, with historical data in a dedicated `historicalDAPeriods` bucket |
| Version bump | Do not bump until the full V1.2.x batch work is complete |
| Golden anchors | Do not add new anchors for this batch |
| Source consistency | Nanoka self-consistency is sufficient |

## Current Live Counts

Configured live version remains `manifest.zzz.live = 2.8`.

| Domain | Current live index | Details accessible | Runtime today | Gap |
|---|---:|---:|---:|---:|
| Characters | 53 | 53 | 53 | complete in PR-A |
| W-Engines | 89 | 89 | 89 | complete in PR-B |
| Drive Disc sets | 26 | 26 | 26 | complete in PR-C |
| Enemies | 269 | 269 | 269 | complete in PR-D |
| Deadly Assault current periods | 38 | 38 | 0 | schema/runtime bucket required |
| Bangboos | 39 | 39 | 39 | complete in PR #77 |

Enemy details contain 573 `monster_info` variants. PR-D promotes 269 runtime enemy identity/source/rank rows and retains variant data in audit: 201 rows have a selected `detail.monster_id -> monster_info[monster_id]` variant, 68 rows are marked `missing-selected-monster_info-variant`, and 372 non-selected variants are retained as skipped audit rows.

## Historical DA Boundary

Historical DA periods are intentionally not mixed into configured-live runtime records. Product and lo-user selected a dedicated `historicalDAPeriods` bucket so old DA periods can be queried without weakening the Formal-Live Gate for current cleaned output.

The currently visible nanoka ZZZ snapshots are:

| Snapshot | Boss index count |
|---|---:|
| `2.8` | 38 |
| `2.8.12` | 46 |
| `3.0.1+15348292` | 53 |
| `3.0.1+15370273` | 53 |
| `3.0.1+15377279` | 53 |
| `3.0.1+15390262` | 50 |
| `3.0.2+15596677` | 50 |
| `3.0.2+15597809` | 50 |
| `3.0.2+15599986` | 50 |
| `3.0.2+15602810` | 50 |
| `3.0.2+15625449` | 50 |

The schema addition is release-significant. The version bump is deferred until the full V1.2.x batch is complete.

## Exclusions

| Field | Reason |
|---|---|
| Resonium | Removed from cleaned scope by R4 |
| Drive Disc slot/main/substat tables | Out of scope by prior lo-user decision; user snapshots provide the final Agent panel |
| Formula-owned anomaly/disorder/daze constants | Implementation-owned by Phase 3 rulings, not batch-imported source data |

## PR Sequence

1. Characters: retain and batch-promote all current-live characters. Done in PR-A.
2. W-Engines: retain and batch-promote all current-live W-Engines. Done in PR-B.
3. Drive Disc sets: retain and batch-promote current-live set identity/effect text; keep slot/main/substat excluded. Done in PR-C.
4. Enemies: retain all current-live monster details and batch-promote enemy identity/source/rank with selected/missing/skipped variant audit. Done in PR-D.
5. DA current: add a current DA period bucket if needed and retain/promote all 2.8 periods.
6. DA historical: add `historicalDAPeriods` and retain/promote historical periods across `manifest.available`.

Each implementation PR should keep the existing 28-anchor golden replay passing, avoid version bumps, avoid new golden anchors, and add per-domain fail-loud source/audit checks.
