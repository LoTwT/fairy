# 怒目金刚精炼 2 贯穿伤害修正

日期：2026-10-26

状态：已随静态 effects revision `56` 实施。

## 结论

怒目金刚（14147）精炼 2 的块 note 与 Nanoka `/talents/2/desc` 中英文同文写的是：

> 装备者发动[强化特殊技]时，装备者造成的火属性贯穿伤害提升 10.35%，最多叠加 2 层，持续 20 秒，每层效果单独结算持续时间。

固定源 `/wengines/42/refinementBuffs/1/effectBlocks/0/effects/1` 却把 `stat` 写成
`turbulenceDmgBonus`；同音擎精炼 1/3/4/5 的同位置都是 `pierceDmgBonus`。转换器
按固定字段把精炼 2 编成乱流异常增伤，导致：

- 火属性贯穿命中拿不到 10.35%；
- 火属性乱流命中错误获得 10.35%。

本修订只修正该完整来源身份的 `stat`，保留数值、层数、火元素筛选、精炼门槛与
公开 `optionId`/`effectId`。历史 `effectId`
`w-engine:14147:zzz-hp:legacy-self-turbulenceDmgBonus:blk-legacy:refinement:2`
中的字段名作为兼容身份保留，不再表示实际落点。

## 证据

- Nanoka `w-engines/14147/details.zh.json` `/talents/2/desc`
- Nanoka `w-engines/14147/details.en.json` `/talents/2/desc`
- 固定源块 note 与 `/wengines/42/refinementBuffs/1/effectBlocks/0/effects/1`
- 同音擎精炼 1/3/4/5 同位置 `pierceDmgBonus` 对照

## 实现

- `source-stat-correction.correctedStat` 增加 `pierceDmgBonus`。
- 新增登记
  `w-engines/Wrathful_Vajra/refinement/2/blk-legacy/legacy-self-turbulenceDmgBonus`。
- 转译后的规则：
  - `hit.damageKind` 只匹配 `sheer`
  - `hit.element` 只匹配 `fire`
  - `operation.channel` 为 `sheer-damage-bonus`
  - 数值仍为 `0.1035`，最多 2 层
- 新增具名差异 `wrathful-vajra-r2-fire-sheer-stat`。
- 核心负例覆盖：
  - 火属性贯穿命中获得 10.35%；
  - 火属性乱流命中不获得该贡献。

## 制品

- coverage：1,149 converted / 134 corrected / 92 unsupported
- catalog 变体：1,217 converted / 140 corrected / 126 unsupported
- 规则 931、选项 1,002、实体 196、pack 1,118 与原始效果 1,375 不变
- 1 个来源位置从 converted 变为 corrected

## 验证

```sh
pnpm --filter @randomplay/data generate:static-effects /path/to/ZZZ-HP-991bb0e /tmp/out
pnpm --filter @randomplay/data authoring:verify
pnpm --filter @randomplay/core exec vitest run test/effects/static-catalog-data.test.ts
pnpm --filter @randomplay/data test
pnpm check
pnpm --filter @randomplay/data verify:artifact-dependencies
pnpm --filter @randomplay/data audit:data-identity
pnpm --filter @randomplay/data verify:nanoka:current integrated
```

## 数据管理

本批只改 Git 跟踪的静态 effects 制品、技能清单摘要、测试与文档，不改 Nanoka
整合规则、来源版本或 `packages/data/integrated`。主工作区仍需执行
`pnpm --filter @randomplay/data verify:nanoka:current integrated` 并按
[来源数据整合规范](../specs/data/integration.md#数据管理状态的同步维护)复核管理状态。

## 回退

- 回退本批即恢复 revision 55 的乱流映射；三制品、技能清单摘要与测试一并回退。
- 若语义守卫拒绝生成，先确认是来源编码、块 note 还是实体职业漂移；
  禁止放宽守卫来跑通。
