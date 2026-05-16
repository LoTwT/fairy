# Expected explain output · yixuan-basic (en)

Expected `fairy-explain` skill output when consuming `expected/yixuan-basic.calc.json` with `--lang en`.

Used by QA G5 as golden assertion for explain skill behavior, English variant.

---

Yixuan basic attack hit 1 has **7,622 displayed expected damage** in this CalcResult.

- **Non-crit**: 5,954
- **Crit**: 10,718
- **Raw expected damage**: 7,621.12

The chain comes from `CalcResult.trace`:

1. `baseDamageZone` = **10,076**
   Source: `examples.ai-plugin` / `character.1371.skill.basic`, the fixture source for Yixuan basic attack hit 1.
2. `damageBonusZone` = **1.3**
   Source: `trace-2`, from the snapshot panel's `etherDamageBonus: 0.3`; Yixuan's `auricInk` maps to the ether damage bonus field.
3. `critZone` = **1.28**
   Source: `trace-3`, the expected crit multiplier from `critRate: 0.35` and `critDamage: 0.8`.
4. `defenseZone` = **0.4545454545**
   Source: `trace-4`, the default level 60 agent vs. level 60 boss defense zone.
5. `resistanceZone` / `vulnerabilityZone` / `dazeVulnerabilityZone` / `specialZone` are all **1.0**.
6. Final formula:
   `10076 × 1.3 × 1.28 × 0.4545454545 × 1 × 1 × 1 × 1 = 7621.12`
7. Display damage rounds each segment up: `ceil(7621.12) = 7622`.

This CalcResult has no warnings or errors.

### Disclaimer

Data is based on `nanoka@2.8` cleaned snapshot. Re-fetch the data after game patches. For takedown requests please contact the maintainer.

---

## Acceptance assertions (QA G5)

- Every multiplier / value step must reference an actual field in `CalcResult.trace` (no fabrication).
- sourceRef paths must resolve to user-friendly English names.
- Warnings must be retained and surfaced when present.
- Disclaimer footer must appear (first response per session).
- AI does not invoke fairy CLI in explain skill (per architecture: standalone).
