# Expected explain output · yixuan-basic (zh)

Expected `fairy-explain` skill output when consuming `expected/yixuan-basic.calc.json` with `--lang zh`.

Used by QA G5 as golden assertion for explain skill behavior.

---

你的仪玄普通攻击一段本次显示伤害是 **7,622**（期望值）。

- **非暴击**: 5,954
- **暴击**: 10,718
- **期望原始伤害**: 7,621.12

计算链路来自 `CalcResult.trace`：

1. `baseDamageZone` = **10,076**
   来源: `examples.ai-plugin` / `character.1371.skill.basic`，对应 fixture 中仪玄普通攻击一段的基础伤害。
2. `damageBonusZone` = **1.3**
   来源: `trace-2`，对应面板里的 `etherDamageBonus: 0.3`；仪玄的 `auricInk` 会走 ether damage bonus 映射。
3. `critZone` = **1.28**
   来源: `trace-3`，期望暴击乘区由 `critRate: 0.35` 和 `critDamage: 0.8` 得到。
4. `defenseZone` = **0.4545454545**
   来源: `trace-4`，60 级代理人对 60 级 boss 的默认防御区。
5. `resistanceZone` / `vulnerabilityZone` / `dazeVulnerabilityZone` / `specialZone` 均为 **1.0**。
6. 最终公式：
   `10076 × 1.3 × 1.28 × 0.4545454545 × 1 × 1 × 1 × 1 = 7621.12`
7. 显示值按逐段向上取整：`ceil(7621.12) = 7622`。

本次 CalcResult 没有 warnings 或 errors。

### Disclaimer

数据基于 `nanoka@2.8` cleaned snapshot。如有版本更新请重新 fetch 数据。如有侵权请联系作者删除。

---

## Acceptance assertions (QA G5)

- 每一步 multiplier / 数值必须 reference `CalcResult.trace` 实际字段（不得编造）。
- sourceRef 必须翻译为用户友好的中文名称。
- Warnings 若存在必须保留并 surface 给用户。
- Disclaimer footer 必须出现（first response per session）。
- AI 不调用 fairy CLI（per architecture：explain skill = standalone）。
