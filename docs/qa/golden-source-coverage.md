# V1 Golden Source Coverage

Status: S5-2e gap audit draft
Owner: @TechLead
Reviewers: @Product, @QA, @lo-user
Related tasks: task #40, task #43

This document narrows the original 23 golden anchors to the V1 19-anchor release
gate locked by D-13 plus DD-002. Anchors G13/G18/G19/G20 are deferred to V1.x:
G13 requires data-driven anomaly-threshold rule composition that is outside the
current #43 true-data replay scope, while G18/G19/G20 require non-DA enemy /
part-break data.

The goal of this audit is to decide the minimum source and cleaned-data work
needed before true-data replay. It does not change QA's fixture assertions.

## Scope

| Set | Anchor IDs | V1 status |
|---|---|---|
| V1 release gate | G01-G12, G14-G17, G21-G23 | Must pass before V1 release. |
| Deferred V1.x | G13, G18-G20 | Not V1 blockers. |

## Source Status Summary

| Source | Current state | V1 replay use |
|---|---|---|
| Core rules / guide reference | Implemented in `@randomplay/core`, reference retained in `docs/reference/`. | Formula-only anchors such as defense, crit, rounding, anomaly/disorder constants. |
| buhflipexplode DA snapshot | PR #19 retained 35 live periods, boss data, buffs, multipliers, and algorithm drift gate. | DA boss base HP/DEF/daze/anomaly data, period multipliers, English buff/boss text. |
| Mihoyo DA snapshot | PR #24 retained 35 details and zh/en alignment. | Chinese buff/boss/room text and source anchors for later typed-modifier review. |
| Excel workbook | Raw workbook retained; `workbook-audit.json` records sheet/column shape. | Minimal agent kit data for Yixuan / Nicole / Yanagi team-modifier anchors, if V1 replay uses formal sourced modifiers. |

## 19-Anchor Matrix

| ID | V1 source dependency | Current source coverage | Remaining work |
|---|---|---|---|
| G01 | Core defense formula + guide reference | Covered by core rules. | Replay fixture only. |
| G02 | Core defense formula + corrupted-shield state | Covered by core rules; DA boss can provide real boss context if needed. | Replay fixture can use DA boss from buhflipexplode. |
| G03 | Core crit expected-value formula | Covered by core rules. | Replay fixture only. |
| G04 | Core bucket scan / marginal breakpoint formula | Covered by executable replay against guide breakpoints. | Passed. |
| G05 | Core sheer formula + corrupted-shield boss context | DA boss data available from buhflipexplode/Mihoyo. | Replay fixture should pick a DA corrupted-shield-compatible boss and preserve source refs. |
| G06 | Core sheer formula + default 60+ boss context | DA boss data available from buhflipexplode/Mihoyo. | Replay fixture can use same DA boss with shield inactive or another DA boss. |
| G07 | Core per-segment rounding | Covered by core rules. | Replay fixture only. |
| G08 | Core anomaly mastery floor | Covered by core rules. | Replay fixture only. |
| G09 | Base daze value + display-floor behavior | buhflipexplode DA enemies expose `baseDaze[]` and DA periods expose `versionDazeMult[]`; replay verifies raw/display floor behavior. | Passed. |
| G10 | Attribute alias mapping (frost/auric -> ice/ether) | Covered by glossary/naming policy/core mapping; replay verifies resistance and anomaly-buildup-resistance lanes. | Passed. |
| G11 | Attribute damage-bonus alias mapping | Covered by glossary/naming policy/core mapping. | Replay fixture only. |
| G12 | Core anomaly threshold table | Covered by core rules. | Replay fixture only. |
| G13 | Special enemy + Deadly Assault anomaly-threshold modifiers | Deferred to V1.x by @lo-user on 2026-05-05. Reference guide / Product v2.0 documents the rule; core currently supports only explicit `thresholdOverride`, not data-driven threshold-rule composition. | V1.x should implement sourced threshold-rule support and replay this anchor. |
| G14 | Virtual agent anomaly contribution | Covered by core rules and snapshot input. | Replay fixture only; no formal game row required. |
| G15 | Seven disorder formulas | Covered by core rules. | Replay fixture only. |
| G16 | Disorder daze-level zone | Covered by core rules. | Replay fixture only. |
| G17 | Corrupted-shield cleanse true damage | Core rules covered; DA boss max HP available from buhflipexplode. | Cleaned DA boss slot must expose sourced max HP/effective max HP. |
| G21 | 1-agent Yixuan sheer | Excel has Yixuan agent row; panel values remain user snapshot. | Minimal Excel agent mapping for Yixuan id/attribute/specialty/label/source refs. |
| G22 | Yixuan + Nicole defense reduction | Excel has Nicole rows/descriptions; lo-user accepted the defense-reduction mapping. | Passed with explicit inactive/active snapshot replay. |
| G23 | Yixuan + Nicole + Yanagi polarity disorder | Excel has Yanagi rows/descriptions; lo-user accepted the disorder boost and EX Special polarity-disorder template. | Passed with explicit inactive/active replay and skill-level parameterized polarity-disorder template. |

## Agent Source Evidence For G21-G23

`data.xlsx` already has the three V1 team agents in `代理人属性`:

| Agent | Row | Excel id / EN name | V1 use |
|---|---:|---|---|
| 妮可 | `代理人属性!A4:AF4` | `1031` / `Nicole` | Team member identity, attribute, specialty, source refs for G22. |
| 柳（月城柳） | `代理人属性!A23:AF23` | `1221` / `Yanagi` | Team member identity, attribute, specialty, source refs for G23. |
| 仪玄 | `代理人属性!A37:AF37` | `1371` / `Yixuan` | Active rupture / sheer agent identity and panel provenance for G21-G23. |

Calculation-relevant source text candidates:

| Anchor | Source anchor | Candidate normalized effect | Acceptance status |
|---|---|---|---|
| G22 Nicole defense reduction | `代理人核心技描述!D4:J4` | Target defense reduction by core passive level; level 7 text says target defense is reduced by 40% for 3.5s. Bucket maps to the defense-zone reduction path, not penetration. | Accepted by @lo-user on 2026-05-05 as `requiresActivation`; replay verifies inactive/no-effect and active/effect snapshots. |
| G22 Nicole ether damage bonus | `代理人核心技描述!K4:L4` | Additional ability grants team damage against the debuffed target for ether damage. Not required for a pure defense-reduction G22 replay unless the fixture explicitly activates it. | Keep as source-text candidate; do not auto-activate. |
| G23 Yanagi disorder boost | `代理人核心技描述!D23:J23` | Core passive increases disorder damage multiplier after EX Special; level 7 text reaches +250% and also grants electric damage. | Accepted by @lo-user on 2026-05-05 as `requiresActivation`; replay verifies inactive/no-effect and active/effect snapshots. |
| G23 Yanagi polarity disorder | `代理人技能描述!C298`, `代理人技能描述!C303` | EX Special / Ultimate can trigger Polarity Disorder using a formula based on original Disorder damage plus Yanagi Anomaly Proficiency. | EX Special accepted by @lo-user on 2026-05-05 as a skill-level parameterized template; replay verifies skill levels 1-16. Ultimate remains a non-blocking candidate. |

These rows are enough for a minimal #40 agent/source-text reader. Trusted G22
and G23 replay now uses the acceptance records described below; any future
source-text effect still needs the same deterministic-template or manual
acceptance treatment before it can become a typed modifier.

## Manual Acceptance Gate

G22/G23 stay in the V1 replay gate, but calculation-relevant natural-language
effects must not be guessed. Before a typed modifier derived from Nicole/Yanagi
source text can enter replay, it needs an acceptance record.

Storage path:

- `data/cleaned/audit/nicole.acceptance.json`
- `data/cleaned/audit/yanagi.acceptance.json`

Minimum acceptance record fields:

| Field | Requirement |
|---|---|
| `agentId` | Stable cleaned agent id, e.g. `nicole` / `yanagi`. |
| `effectId` | Stable modifier/effect id used by replay. |
| `sourceId` | `lo-user-excel`. |
| `sourceRefs[]` | Exact workbook anchors, e.g. `代理人核心技描述!D4:J4`. |
| `sourceTextHash` | SHA-256 of the accepted source text after parser normalization. |
| `effectTemplateId` / `handlerId` | The deterministic template or runtime handler being accepted. |
| `acceptedBy` | For V1 dogfooding, this must be `@lo-user`. |
| `acceptedAt` | ISO timestamp of the manual acceptance. |

Replay rule: if an effect required by G22/G23 has no matching acceptance record,
the replay harness must emit blocking `ERR-DAT-005` and must not silently apply a
modifier inferred from text.

Current accepted records:

| Effect | Acceptance semantics |
|---|---|
| `nicole-defense-reduction` | `requiresActivation=true`; inactive snapshot must have no defense-reduction effect, active snapshot applies 40% defense reduction from core passive level 7. |
| `yanagi-disorder-boost` | `requiresActivation=true`; inactive snapshot must have no disorder-damage boost, active snapshot applies +250% anomaly/disorder damage bonus from core passive level 7. |
| `yanagi-polarity-disorder-ex-special` | EX Special polarity disorder template; supports skill levels 1-16 using `(5 + specialLevel * 2.25) / 100` times Yanagi anomaly proficiency, plus 15% of original disorder damage. Snapshot validation fails loud if the Yanagi provider is missing, `skillLevels.special` is missing, the skill level is outside 1-16, or provider `panel.anomalyProficiency` is missing. |

## Immediate #40 Minimum Range

The V1 19-anchor release gate does not require full W-Engine, Drive Disc,
Mindscape Cinema, Resonium, Bangboo, or global enemy cleaning.

Minimum Excel reader work for #43:

1. Parse and source-track agent rows from `代理人属性` for at least Yixuan,
   Nicole, and Yanagi. If exact names/IDs are ambiguous, stop and ask lo-user.
2. Parse source text rows from `代理人核心技描述`, `代理人技能描述`, `代理人强化`,
   `代理人觉醒`, and `代理人影画描述` only as source-text candidates. Do not infer
   typed modifiers without deterministic template support or manual acceptance.
3. Emit machine-readable `unparsedEffects[]` / unresolved records for any
   calculation-relevant text that cannot be converted into a trusted typed
   modifier.
4. Keep `cleaned/enemies` deferred. DA boss fields required by G09/G17 should
   come from buhflipexplode/Mihoyo DA sources, not the Excel enemy table.

## Replay Harness Baseline

`pnpm --filter @randomplay/data audit:golden-v1` generates two machine-readable
cleaned artifacts:

- `data/cleaned/audit/v1-agent-source-candidates.json` — minimal #40 reader
  output for Yixuan / Nicole / Yanagi identity rows plus calculation-relevant
  source text candidates and `sourceTextHash` values.
- `data/cleaned/audit/nicole.acceptance.json` and
  `data/cleaned/audit/yanagi.acceptance.json` — lo-user manual acceptance
  records for G22/G23 source-text mappings.
- `data/cleaned/golden/v1-replay-report.json` — #43 replay baseline for the
  DD-002 19-anchor scope.

The current replay report intentionally reports:

| Status | Anchors | Meaning |
|---|---|---|
| `passed` | 19 anchors | All V1 anchors pass executable replay with sourced Excel/DA refs and lo-user accepted G22/G23 mappings. |
| `pendingHarness` | none | No V1 anchors are pending harness. |
| `blocked` | none | G22/G23 `ERR-DAT-005` diagnostics are cleared by acceptance records. |
| `deferred` | G13, G18-G20 | Explicit V1.x scope. |

`pnpm --filter @randomplay/data verify:golden-v1` is an offline freshness and shape
gate. It verifies the artifacts are regenerated from the retained sources and
that V1 replay has `passed=19`, `pendingHarness=0`, `blocked=0`,
`blockingDiagnostics=0`, and `releaseReady=true`.

## Product / Human Decisions

TL recommendation:

- **G13**: deferred by @lo-user on 2026-05-05. Track with G18/G19/G20 as V1.x
  golden expansion work. Do not use `thresholdOverride` to claim the anchor in
  V1, because that would bypass sourced rule composition and source trace.
- **Nicole/Yanagi**: @lo-user accepted the G22/G23 mapping semantics on
  2026-05-05. A/B effects are explicit inactive/active snapshot states; C is a
  skill-level-parameterized EX Special polarity-disorder template. C must fail
  loud when provider, explicit skill level, or provider anomaly proficiency input
  is missing. If a required acceptance record is removed or its source hash
  changes, the replay harness must fail instead of silently applying a guessed
  modifier.

#43 now has a release-ready replay baseline for the 19 V1 anchors. G13 remains
listed as an explicit V1.x gap rather than disappearing from QA visibility.
