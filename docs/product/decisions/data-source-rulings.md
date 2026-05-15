# Phase 3 Data Source Rulings

This log records Product + TL rulings for Phase 3 drift rows. These rulings resolve the G01-G26 first-sync queue for `phase3-sync-001-g01-g26`, but they do not make that sync exit-clean: G27/G28 and two consecutive clean syncs are still required before Phase 4 runtime cutover.

Runtime cutover remains disabled. Archived Excel, D-17 Mihoyo, and D-12 buhflipexplode data remain audit baselines only.

## Summary

| Ruling | Anchor | Status | Decision |
|---|---|---|---|
| `phase3-r001` | G01 | accepted | Accept nanoka DA boss context as the source replacement for the archived default-defense replay baseline. |
| `phase3-r002` | G02 | accepted | Accept nanoka DA boss context for corrupted-shield defense replay; shield formula remains implementation-owned. |
| `phase3-r003` | G03 | accepted | Accept deterministic nanoka character panel normalization; crit expected-value behavior remains formula-owned. |
| `phase3-r004` | G04 | accepted | Accept implementation-owned penetration/damage formula boundary; nanoka is not expected to provide this formula table. |
| `phase3-r005` | G05 | accepted | Accept nanoka Yixuan rupture raw fields and DA boss context; sheer semantics remain implementation-owned. |
| `phase3-r006` | G06 | accepted | Accept nanoka source coverage for sheer-vs-default ratio replay with implementation-owned ratio semantics. |
| `phase3-r007` | G07 | accepted | Accept implementation-owned rounding boundary. |
| `phase3-r008` | G08 | accepted | Accept nanoka combat-panel raw fields plus implementation-owned anomaly mastery flooring behavior. |
| `phase3-r009` | G09 | accepted | Accept nanoka DA daze-context evidence; display flooring remains implementation-owned. |
| `phase3-r010` | G10 | accepted | Accept nanoka raw coverage plus implementation-owned Frost/Auric alias semantics. |
| `phase3-r011` | G11 | accepted | Accept nanoka combat-panel raw coverage plus implementation-owned damage-bonus alias routing. |
| `phase3-r012` | G12 | accepted | Accept nanoka enemy threshold raw coverage plus implementation-owned threshold formula constants. |
| `phase3-r013` | G13 | accepted | Accept nanoka monster_info variant mapping plus implementation-owned threshold modifier constants. |
| `phase3-r014` | G14 | accepted | Accept sourceRefs contract coverage plus implementation-owned virtual contribution behavior. |
| `phase3-r015` | G15 | accepted | Accept failed-evidence ruling: Disorder formula remains implementation-owned. |
| `phase3-r016` | G16 | accepted | Accept failed-evidence ruling: Disorder daze-level zone remains implementation-owned. |
| `phase3-r017` | G17 | accepted | Accept nanoka DA boss max-HP context plus implementation-owned corrupted-shield cleanse true-damage rule. |
| `phase3-r018` | G18 | accepted | Accept Greta monster_info variant source coverage plus implementation-owned part-break rule. |
| `phase3-r019` | G19 | accepted | Accept Ruthless Fiend variant source coverage plus implementation-owned daze-recovery semantics. |
| `phase3-r020` | G20 | accepted | Accept Hati/Armored Hati variant source coverage plus implementation-owned daze-recovery semantics. |
| `phase3-r021` | G21 | accepted | Accept Yixuan panel/rupture source coverage with implementation-owned sheer defense-skip semantics. |
| `phase3-r022` | G22 | accepted | Accept Nicole passive source coverage for the existing lo-user-approved defense-reduction replay. |
| `phase3-r023` | G23 | accepted | Accept Yanagi passive source coverage for the existing lo-user-approved disorder boost and polarity-disorder replay. |
| `phase3-r024` | G24 | accepted | Accept Penguinboo numeric parity from nanoka live panel and active skill raw values. |
| `phase3-r025` | G25 | accepted | Accept Sharkboo numeric parity from nanoka live panel and active skill raw values. |
| `phase3-r026` | G26 | accepted | Accept Plugboo numeric parity and electric element evidence from nanoka live panel, skill raw values, and skill text. |

## Rulings

### phase3-r001-g01

Decision: accepted. Nanoka approved-live `2.8` DA period detail provides the boss context and `boss_adjust` evidence required to replace the archived buhflipexplode DA source for G01. The default-defense formula is owned by core and remains protected by golden replay; this ruling only accepts the source replacement boundary.

### phase3-r002-g02

Decision: accepted. G02 uses the same nanoka DA period/boss context as G01. The corrupted-shield multiplier is not a nanoka data field; it remains implementation-owned and golden-replay checked.

### phase3-r003-g03

Decision: accepted. Nanoka live character `stats` + `level` rows use the deterministic panel transform `stats[key] + level[promotionPhase][key] + stats[key_growth] * (level - 1) / 10000`. G03's crit expected-value calculation is formula-owned and is not sourced from nanoka.

### phase3-r004-g04

Decision: accepted. Nanoka does not expose a penetration/damage formula table. G04 remains implementation-owned with the retained guide anchor and executable golden replay as proof.

### phase3-r005-g05

Decision: accepted. Nanoka supplies Yixuan rupture raw fields and DA boss context, but the sheer defense-skip semantic mapping remains implementation-owned until the runtime mapper is promoted.

### phase3-r006-g06

Decision: accepted. Nanoka supplies the same Yixuan + DA source coverage as G05. The sheer-vs-default ratio remains a core formula/golden-replay proof, not a nanoka table.

### phase3-r007-g07

Decision: accepted. Per-segment rounding is an implementation-owned display/aggregation rule; no nanoka source table is expected.

### phase3-r008-g08

Decision: accepted. Nanoka supplies combat-panel raw fields such as anomaly mastery. The floor-before-buildup rule remains implementation-owned and golden-replay checked.

### phase3-r009-g09

Decision: accepted. Nanoka DA period detail supplies the boss/daze source context. Daze ratio display flooring remains implementation-owned.

### phase3-r010-g10

Decision: accepted. Nanoka supplies Yixuan and monster raw coverage. Frost-to-Ice and Auric-Ink-to-Ether alias semantics are implementation-owned mapping rules.

### phase3-r011-g11

Decision: accepted. Nanoka supplies combat-panel raw fields. Damage-bonus routing for Frost/Auric aliases remains implementation-owned.

### phase3-r012-g12

Decision: accepted. Nanoka monster details expose enemy anomaly-related raw coverage. Trigger-count and rank threshold constants remain implementation-owned.

### phase3-r013-g13

Decision: accepted. Nanoka `monster_info.*` variant mapping covers the relevant enemy identity boundary. The guide-sourced anomaly threshold modifiers remain implementation-owned golden replay evidence.

### phase3-r014-g14

Decision: accepted. Phase 2 promoted sourceRefs metadata emission. Virtual contribution inclusion/exclusion remains implementation-owned core behavior.

### phase3-r015-g15

Decision: accepted. Failed-evidence audit confirms nanoka has no Disorder formula endpoint/table. The Disorder formula remains implementation-owned with golden replay proof.

### phase3-r016-g16

Decision: accepted. Failed-evidence audit confirms nanoka has no Disorder daze-level zone endpoint/table. The daze-level zone formula remains implementation-owned with golden replay proof.

### phase3-r017-g17

Decision: accepted. Nanoka DA period detail supplies boss context and max-HP source evidence. The corrupted-shield cleanse true-damage rule remains implementation-owned.

### phase3-r018-g18

Decision: accepted. Nanoka `monster_info.*` covers Greta identity/variant mapping. The engineering-machine part-break rule remains guide/core-owned.

### phase3-r019-g19

Decision: accepted. Nanoka `monster_info.*` covers Ruthless Fiend identity/variant mapping. Daze-recovery composition remains guide/core-owned until a formal nanoka runtime mapper exists.

### phase3-r020-g20

Decision: accepted. Nanoka `monster_info.*` covers Hati and Armored Hati identity/variant mapping. Daze-recovery composition remains guide/core-owned until a formal nanoka runtime mapper exists.

### phase3-r021-g21

Decision: accepted. Nanoka supplies Yixuan panel and rupture raw coverage. Sheer defense-skip semantics remain implementation-owned and golden-replay checked.

### phase3-r022-g22

Decision: accepted. Nanoka approved-live Nicole detail supplies passive/source-text coverage for the existing lo-user-approved defense-reduction replay. Formal typed modifier template promotion remains a later transform task.

### phase3-r023-g23

Decision: accepted. Nanoka approved-live Yanagi detail supplies passive/source-text coverage for the existing lo-user-approved disorder boost and polarity-disorder replay. Formal typed modifier template promotion remains a later transform task.

### phase3-r024-g24

Decision: accepted. Nanoka approved-live Penguinboo panel and active skill raw values reproduce the archived Excel Path X numbers after unit conversion: attack `6198.0006`, active multiplier `4.62`, daze multiplier `2.7`, and anomaly buildup `346`.

### phase3-r025-g25

Decision: accepted. Nanoka approved-live Sharkboo panel and active skill raw values reproduce the archived Excel Path X numbers after unit conversion: attack `8057.0996`, active multiplier `3.84`, daze multiplier `1.4`, and anomaly buildup `180`.

### phase3-r026-g26

Decision: accepted. Nanoka approved-live Plugboo panel and active skill raw values reproduce the archived Excel Path X numbers after unit conversion: attack `8057.0996`, active multiplier `5.12`, daze multiplier `1.87`, and anomaly buildup `240`. Plugboo skill text also proves electric element evidence.
