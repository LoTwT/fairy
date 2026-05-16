# Nanoka Drift Report: phase3-sync-002-g27-g28

Status: Phase 3 drift audit second sync with G27/G28 proof anchors
Generated: 2026-05-15T16:20:00+08:00

This report carries forward accepted G01-G26 rulings, adds G27/G28 approved-live proof anchors, and records Phase 3 exit-clean evidence. Full runtime cutover remains disabled.

## Candidate

| Source | Version | Content Hash |
|---|---|---|
| `nanoka-zzz` | `2.8` | `sha256:4374b550b86b4af029e1903b838ce8906d6e389a8a6566eb35f3b7cac97761ba` |

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
| `new` | 2 |
| `semantic-mismatch` | 26 |

Unresolved blocking drift rows: **0**

Runtime cutover ready: **false**

Exit-clean sync eligible: **true**

## Drift Rows

| Entity | Field | Status | Ruling | Ruling ID | Notes |
|---|---|---|---|---|---|
| `G01` | `goldenAnchors.G01.nanokaCandidateCoverage` | `semantic-mismatch` | `accepted` | `phase3-r001` | Accepted DA boss-context source replacement: nanoka approved-live period detail covers boss_adjust and period context used by the archived G01 default-defense replay; Phase 4 still owns runtime cutover. |
| `G02` | `goldenAnchors.G02.nanokaCandidateCoverage` | `semantic-mismatch` | `accepted` | `phase3-r002` | Accepted DA boss-context source replacement for corrupted-shield defense replay; the shield formula remains implementation-owned and nanoka supplies the period/boss evidence only. |
| `G03` | `goldenAnchors.G03.nanokaCandidateCoverage` | `semantic-mismatch` | `accepted` | `phase3-r003` | Accepted agent panel normalization contract: nanoka live character stats/level rows deterministically derive base panel values; G03 crit expected-value behavior is formula-owned. |
| `G04` | `goldenAnchors.G04.nanokaCandidateCoverage` | `semantic-mismatch` | `accepted` | `phase3-r004` | Accepted implementation-owned penetration/damage formula boundary; nanoka has no formula table and the archived guide/golden replay remains the executable proof anchor. |
| `G05` | `goldenAnchors.G05.nanokaCandidateCoverage` | `semantic-mismatch` | `accepted` | `phase3-r005` | Accepted split responsibility: nanoka supplies Yixuan rupture raw fields and DA boss context, while sheer defense-skip semantics remain implementation-owned until the rupture semantic mapper lands. |
| `G06` | `goldenAnchors.G06.nanokaCandidateCoverage` | `semantic-mismatch` | `accepted` | `phase3-r006` | Accepted split responsibility for sheer-vs-default ratio replay: nanoka source coverage is present and the ratio formula remains implementation-owned. |
| `G07` | `goldenAnchors.G07.nanokaCandidateCoverage` | `semantic-mismatch` | `accepted` | `phase3-r007` | Accepted implementation-owned rounding boundary; no nanoka source table is expected for per-segment ceil behavior. |
| `G08` | `goldenAnchors.G08.nanokaCandidateCoverage` | `semantic-mismatch` | `accepted` | `phase3-r008` | Accepted agent combat-panel unit boundary for anomaly mastery flooring; nanoka provides raw panel fields and core owns the floor-before-buildup behavior. |
| `G09` | `goldenAnchors.G09.nanokaCandidateCoverage` | `semantic-mismatch` | `accepted` | `phase3-r009` | Accepted DA daze-context source replacement: nanoka period detail covers boss context and daze-related source evidence while display flooring remains implementation-owned. |
| `G10` | `goldenAnchors.G10.nanokaCandidateCoverage` | `semantic-mismatch` | `accepted` | `phase3-r010` | Accepted attribute-alias boundary: nanoka supplies Yixuan/monster raw coverage, while Frost->Ice and Auric Ink->Ether alias semantics stay implementation-owned. |
| `G11` | `goldenAnchors.G11.nanokaCandidateCoverage` | `semantic-mismatch` | `accepted` | `phase3-r011` | Accepted damage-bonus alias boundary: nanoka supplies combat-panel raw fields and core owns alias routing to Ice/Ether damage-bonus fields. |
| `G12` | `goldenAnchors.G12.nanokaCandidateCoverage` | `semantic-mismatch` | `accepted` | `phase3-r012` | Accepted anomaly-threshold split responsibility: nanoka enemy threshold raw coverage exists, while trigger-count/rank threshold formula constants remain implementation-owned. |
| `G13` | `goldenAnchors.G13.nanokaCandidateCoverage` | `semantic-mismatch` | `accepted` | `phase3-r013` | Accepted variant-mapping source replacement plus implementation-owned threshold modifiers; monster_info identity is source-backed and guide constants remain the formula proof anchor. |
| `G14` | `goldenAnchors.G14.nanokaCandidateCoverage` | `semantic-mismatch` | `accepted` | `phase3-r014` | Accepted SourceRef/virtual-contribution boundary: nanoka sourceRefs contract is promoted, while virtual-agent contribution behavior remains implementation-owned. |
| `G15` | `goldenAnchors.G15.nanokaCandidateCoverage` | `semantic-mismatch` | `accepted` | `phase3-r015` | Accepted failed-evidence ruling: nanoka has no Disorder formula endpoint/table, so the runtime formula remains implementation-owned with golden replay proof. |
| `G16` | `goldenAnchors.G16.nanokaCandidateCoverage` | `semantic-mismatch` | `accepted` | `phase3-r016` | Accepted failed-evidence ruling: nanoka has no Disorder daze-level zone endpoint/table, so the runtime formula remains implementation-owned with golden replay proof. |
| `G17` | `goldenAnchors.G17.nanokaCandidateCoverage` | `semantic-mismatch` | `accepted` | `phase3-r017` | Accepted DA boss max-HP source replacement for corrupted-shield cleanse; nanoka supplies period/boss context and core owns the 15% true-damage rule. |
| `G18` | `goldenAnchors.G18.nanokaCandidateCoverage` | `semantic-mismatch` | `accepted` | `phase3-r018` | Accepted enemy variant source replacement for Greta plus implementation-owned part-break rule; level-stat formula remains blocked from runtime cutover until Phase 4. |
| `G19` | `goldenAnchors.G19.nanokaCandidateCoverage` | `semantic-mismatch` | `accepted` | `phase3-r019` | Accepted Ruthless Fiend variant source replacement with daze-recovery semantic boundary; nanoka supplies raw enemy evidence and guide/core own the recovery formula. |
| `G20` | `goldenAnchors.G20.nanokaCandidateCoverage` | `semantic-mismatch` | `accepted` | `phase3-r020` | Accepted Hati/Armored Hati variant source replacement with daze-recovery semantic boundary; nanoka supplies raw enemy evidence and guide/core own the recovery formula. |
| `G21` | `goldenAnchors.G21.nanokaCandidateCoverage` | `semantic-mismatch` | `accepted` | `phase3-r021` | Accepted Yixuan panel/rupture source coverage with implementation-owned sheer defense-skip semantics; no runtime cutover is implied. |
| `G22` | `goldenAnchors.G22.nanokaCandidateCoverage` | `semantic-mismatch` | `accepted` | `phase3-r022` | Accepted Nicole passive source coverage for the existing lo-user-approved defense-reduction replay; typed modifier template promotion remains a later source-backed transform task. |
| `G23` | `goldenAnchors.G23.nanokaCandidateCoverage` | `semantic-mismatch` | `accepted` | `phase3-r023` | Accepted Yanagi passive/source-text coverage for the existing lo-user-approved disorder boost and polarity-disorder replay; typed modifier template promotion remains later. |
| `G24` | `goldenAnchors.G24.nanokaCandidateCoverage` | `semantic-mismatch` | `accepted` | `phase3-r024` | Accepted Penguinboo numeric parity: nanoka live panel and active skill raw values reproduce the archived Excel Path X attack, daze, and anomaly-buildup values after unit conversion. |
| `G25` | `goldenAnchors.G25.nanokaCandidateCoverage` | `semantic-mismatch` | `accepted` | `phase3-r025` | Accepted Sharkboo numeric parity: nanoka live panel and active skill raw values reproduce the archived Excel Path X attack, daze, and anomaly-buildup values after unit conversion. |
| `G26` | `goldenAnchors.G26.nanokaCandidateCoverage` | `semantic-mismatch` | `accepted` | `phase3-r026` | Accepted Plugboo numeric and element parity: nanoka live panel/skill raw values reproduce the archived Excel Path X values and approved-live skill text proves electric element evidence. |
| `G27` | `goldenAnchors.G27.newSourceProof` | `new` | `accepted` | `phase3-r027` | Accepted new-source proof anchor: lo-user selected Yixuan 1371 for G27; approved-live nanoka evidence proves identity, panel/resource raw values, rupture fields, and promotion-extra source coverage without runtime cutover. |
| `G28` | `goldenAnchors.G28.newSourceProof` | `new` | `accepted` | `phase3-r028` | Accepted new-source proof anchor: lo-user selected Plugboo 54008 for G28; approved-live nanoka evidence proves Bangboo identity, level-60 panel, active-skill numeric values, and electric element text without runtime cutover. |


## Boundary

- This sync does not promote nanoka to runtime cleaned data.
- Retired Excel / D-17 / D-12 source ids remain audit baselines, not runtime
  fallback. Their raw archives are recoverable from git history only.
- Any future `changed`, `missing`, `new`, or `semantic-mismatch` row must
  carry source refs and a ruling before Phase 3 exit.
