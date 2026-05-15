# Nanoka Drift Report: phase3-sync-000-foundation

Status: Phase 3 drift audit foundation fixture
Generated: 2026-05-15T16:20:00+08:00

This report is a schema/verifier fixture. It intentionally contains no field
comparison rows; full G01-G26 comparison begins in the next Phase 3 slice.

## Candidate

| Source | Version | Content Hash |
|---|---|---|
| `nanoka-zzz` | `2.8` | `sha256:55571ec544ff0bbb994621d08d8b2ebbcea090109708c53b9bbd01202f6a7558` |

## Baselines

| Source | Version | Archived |
|---|---|---|
| `lo-user-excel` | `2.6.0_R14028417` | yes |
| `mihoyo-zzz-critical-assault` | `2026-05-05T0850Z` | yes |
| `buhflipexplode-zzz-da` | `2026-05-05T0445Z` | yes |

## Counts

| Status | Count |
|---|---:|
| `same` | 0 |
| `changed` | 0 |
| `missing` | 0 |
| `new` | 0 |
| `semantic-mismatch` | 0 |

Unresolved blocking drift rows: **0**

Runtime cutover ready: **false**

Exit-clean sync eligible: **false**



## Boundary

- This artifact does not compare production fields yet.
- Archived Excel / D-17 / D-12 sources remain audit baselines, not runtime
  fallback.
- Any future `changed`, `missing`, `new`, or `semantic-mismatch` row must
  carry source refs and a ruling before Phase 3 exit.
