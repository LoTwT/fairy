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
| Core rules / guide reference | Implemented in `@fairy/core`, reference retained in `docs/reference/`. | Formula-only anchors such as defense, crit, rounding, anomaly/disorder constants. |
| buhflipexplode DA snapshot | PR #19 retained 35 live periods, boss data, buffs, multipliers, and algorithm drift gate. | DA boss base HP/DEF/daze/anomaly data, period multipliers, English buff/boss text. |
| Mihoyo DA snapshot | PR #24 retained 35 details and zh/en alignment. | Chinese buff/boss/room text and source anchors for later typed-modifier review. |
| Excel workbook | Raw workbook retained; `workbook-audit.json` records sheet/column shape. | Minimal agent kit data for Yixuan / Nicole / Yanagi team-modifier anchors, if V1 replay uses formal sourced modifiers. |

## 19-Anchor Matrix

| ID | V1 source dependency | Current source coverage | Remaining work |
|---|---|---|---|
| G01 | Core defense formula + guide reference | Covered by core rules. | Replay fixture only. |
| G02 | Core defense formula + corrupted-shield state | Covered by core rules; DA boss can provide real boss context if needed. | Replay fixture can use DA boss from buhflipexplode. |
| G03 | Core crit expected-value formula | Covered by core rules. | Replay fixture only. |
| G04 | Core bucket scan / marginal breakpoint formula | Formula representation still marked `pending-formula` in QA fixture. | Decide exact executable scan representation before release gate. Not source-blocked. |
| G05 | Core sheer formula + corrupted-shield boss context | DA boss data available from buhflipexplode/Mihoyo. | Replay fixture should pick a DA corrupted-shield-compatible boss and preserve source refs. |
| G06 | Core sheer formula + default 60+ boss context | DA boss data available from buhflipexplode/Mihoyo. | Replay fixture can use same DA boss with shield inactive or another DA boss. |
| G07 | Core per-segment rounding | Covered by core rules. | Replay fixture only. |
| G08 | Core anomaly mastery floor | Covered by core rules. | Replay fixture only. |
| G09 | Base daze value + display-floor behavior | buhflipexplode DA enemies expose `baseDaze[]` and DA periods expose `versionDazeMult[]`. | Cleaned DA boss slot must expose sourced base daze/effective daze. |
| G10 | Attribute alias mapping (frost/auric -> ice/ether) | Covered by glossary/naming policy/core mapping. | Replay fixture only. |
| G11 | Attribute damage-bonus alias mapping | Covered by glossary/naming policy/core mapping. | Replay fixture only. |
| G12 | Core anomaly threshold table | Covered by core rules. | Replay fixture only. |
| G13 | Special enemy + Deadly Assault anomaly-threshold modifiers | Deferred to V1.x by @lo-user on 2026-05-05. Reference guide / Product v2.0 documents the rule; core currently supports only explicit `thresholdOverride`, not data-driven threshold-rule composition. | V1.x should implement sourced threshold-rule support and replay this anchor. |
| G14 | Virtual agent anomaly contribution | Covered by core rules and snapshot input. | Replay fixture only; no formal game row required. |
| G15 | Seven disorder formulas | Covered by core rules. | Replay fixture only. |
| G16 | Disorder daze-level zone | Covered by core rules. | Replay fixture only. |
| G17 | Corrupted-shield cleanse true damage | Core rules covered; DA boss max HP available from buhflipexplode. | Cleaned DA boss slot must expose sourced max HP/effective max HP. |
| G21 | 1-agent Yixuan sheer | Excel has Yixuan agent row; panel values remain user snapshot. | Minimal Excel agent mapping for Yixuan id/attribute/specialty/label/source refs. |
| G22 | Yixuan + Nicole defense reduction | Excel has Nicole rows/descriptions. | Minimal Excel agent mapping plus manually accepted typed modifier for Nicole defense reduction; unresolved if source text cannot be mapped confidently. |
| G23 | Yixuan + Nicole + Yanagi polarity disorder | Excel has Yanagi rows/descriptions; core supports polarity disorder. | Minimal Excel agent mapping plus manually accepted typed modifier/source refs for Yanagi polarity-disorder behavior. |

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
| G22 Nicole defense reduction | `代理人核心技描述!D4:J4` | Target defense reduction by core passive level; level 7 text says target defense is reduced by 40% for 3.5s. Bucket should map to the defense-zone reduction path, not penetration. | Needs deterministic parser/template or manual acceptance before cleaned typed modifier output. |
| G22 Nicole ether damage bonus | `代理人核心技描述!K4:L4` | Additional ability grants team damage against the debuffed target for ether damage. Not required for a pure defense-reduction G22 replay unless the fixture explicitly activates it. | Keep as source-text candidate; do not auto-activate. |
| G23 Yanagi disorder boost | `代理人核心技描述!D23:J23` | Core passive increases disorder damage multiplier after EX Special; level 7 text reaches +250% and also grants electric damage. | Needs manual acceptance because the duration/trigger state is snapshot-active, not timeline-simulated. |
| G23 Yanagi polarity disorder | `代理人技能描述!C298`, `代理人技能描述!C303` | EX Special / Ultimate can trigger Polarity Disorder using a formula based on original Disorder damage plus Yanagi Anomaly Proficiency. | Needs a dedicated handler/template because the text carries a formula placeholder (`{CAL:...}`) and must preserve source refs. |

These rows are enough for a minimal #40 agent/source-text reader. They are not
enough to publish trusted typed modifiers until the acceptance gate records which
template/handler was accepted for each effect.

## Manual Acceptance Gate

G22/G23 stay in the V1 replay gate, but calculation-relevant natural-language
effects must not be guessed. Before a typed modifier derived from Nicole/Yanagi
source text can enter replay, it needs an acceptance record.

Suggested storage path:

- `data/cleaned/audit/<agent>.acceptance.json`

Minimum acceptance record fields:

| Field | Requirement |
|---|---|
| `agentId` | Stable cleaned agent id, e.g. `nicole` / `yanagi`. |
| `effectId` | Stable modifier/effect id used by replay. |
| `sourceId` | `lo-user-excel`. |
| `sourceAnchor` | Exact workbook anchor, e.g. `代理人核心技描述!D4:J4`. |
| `sourceTextHash` | SHA-256 of the accepted source text after parser normalization. |
| `effectTemplateId` / `handlerId` | The deterministic template or runtime handler being accepted. |
| `acceptedBy` | For V1 dogfooding, this must be `@lo-user`. |
| `acceptedAt` | ISO timestamp of the manual acceptance. |

Replay rule: if an effect required by G22/G23 has no matching acceptance record,
the replay harness must emit blocking `ERR-DAT-005` and must not silently apply a
modifier inferred from text.

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

`pnpm --filter @fairy/data audit:golden-v1` generates two machine-readable
cleaned artifacts:

- `data/cleaned/audit/v1-agent-source-candidates.json` — minimal #40 reader
  output for Yixuan / Nicole / Yanagi identity rows plus calculation-relevant
  source text candidates and `sourceTextHash` values.
- `data/cleaned/golden/v1-replay-report.json` — #43 replay baseline for the
  DD-002 19-anchor scope.

The current baseline intentionally reports:

| Status | Anchors | Meaning |
|---|---|---|
| `passed` | 17 anchors | Core calculation replay ran with sourced Excel/DA refs. G04/G09/G10 now have executable assertions. |
| `pendingHarness` | none | No V1 anchors are pending harness after the G04/G09/G10 replay patch. |
| `blocked` | G22, G23 | Excel source text is extracted and hashed, but trusted modifier replay needs manual acceptance or deterministic template support. |
| `deferred` | G13, G18-G20 | Explicit V1.x scope. |

`pnpm --filter @fairy/data verify:golden-v1` is an offline freshness and shape
gate. It verifies the artifacts are regenerated from the retained sources and
that the blocking/pending statuses stay explicit. It does not mark V1
`releaseReady` until G22/G23 blocking `ERR-DAT-005` diagnostics are cleared.

## Product / Human Decisions Needed

| Decision | Why |
|---|---|
| Nicole/Yanagi modifier acceptance | Natural-language conversion cannot be fully automatic. Any V1 typed modifier used in G22/G23 needs deterministic parser support or explicit manual acceptance tied to the source anchors above. |

TL recommendation:

- **G13**: deferred by @lo-user on 2026-05-05. Track with G18/G19/G20 as V1.x
  golden expansion work. Do not use `thresholdOverride` to claim the anchor in
  V1, because that would bypass sourced rule composition and source trace.
- **Nicole/Yanagi**: Product accepted the manual gate above. Keep G22/G23 in V1,
  but require acceptance records for the specific source anchors. If no
  acceptance record exists, the replay harness should emit `ERR-DAT-005` instead
  of silently applying a guessed modifier.

#43 can build the replay harness for the 19 V1 anchors. G13 must remain listed
as an explicit V1.x gap rather than disappearing from QA visibility.
