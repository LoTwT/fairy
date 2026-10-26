# 维琳娜异常增伤范围修正

日期：2026-10-26

状态：已随静态 effects revision `54` 实施。

## 结论

维琳娜 M0/M2/M6 的块 note 与 Nanoka 同文只把增伤指向[风化]（M0/M2 另含[乱流]），
固定源却把同一句拆成 `anomalyDmgBonus` 与 `turbulenceDmgBonus` 两条。Fairy 的
`anomalyDmgBonus` 宽映射同时命中 `vortex`，会和 `turbulenceDmgBonus` 在同一乱流
命中上重复计入：

- M0：`10% + 10% = 20%`，原文为 10%。
- M2：`15% + 15% = 30%`，原文为 15%。
- M6：`2.5%/层` 的宽口径也错误扩到乱流；原文只提升再次施加[风化]时此次[风化]
  的伤害。

修正保留三条记录、数值、通道与全部公开 `optionId`/`effectId`，只把
`anomalyDmgBonus` 的 `hit.damageKind` 条件收窄为 `anomaly`（风化）。`vortex`
继续由 `turbulenceDmgBonus` 承担，异放与耀变不再被该宽映射扩大。

## 证据

- M0 茶会礼仪：Nanoka `agents/1561/details.zh.json` 与 `details.en.json` 的
  `/passive/level/1561507/desc/1`。
- M2 饱和式计划：同文件 `/talent/2/desc`。
- M6 风蚀与风化：同文件 `/talent/6/desc`。
- 固定源记录：
  - `/agents/45/mindscapeBuffs/0/effectBlocks/1/effects/0`
  - `/agents/45/mindscapeBuffs/0/effectBlocks/1/effects/1`
  - `/agents/45/mindscapeBuffs/2/effectBlocks/0/effects/0`
  - `/agents/45/mindscapeBuffs/2/effectBlocks/0/effects/1`
  - `/agents/45/mindscapeBuffs/6/effectBlocks/0/effects/0`

## 实现

- 新增最小语义类型 `damage-kind-scope-correction`：登记 raw/normalized 编码、
  完整块 note、全局映射生成的伤害种类集合和收窄后的集合。
- 转换器在 `whenFor` 之后只替换对应 `hit.damageKind` 条件；找不到登记集合即
  拒绝生成。
- 三条登记键使用稳定身份：
  - `agents/velina/mindscape/0/blk-ms4tpxkp-f964lw/eff-ms4tpxkp-9jh4ly`
  - `agents/velina/mindscape/2/blk-legacy/legacy-self-anomalyDmgBonus`
  - `agents/velina/mindscape/6/blk-ms4u9q0d-b63z88/eff-ms4u9q0d-6p259j`
- 目录新增具名差异 `velina-anomaly-damage-kind-scope`，引用 Nanoka 中英文证据。

## 制品变化

- 3 条 coverage 记录从 `converted` 变为 `corrected`；规则数、选项数与公开 ID
  均不变。
- 当前计数：196 个实体、1,118 个 pack、1,375 条原始效果、931 条规则、
  1,002 个选项；coverage 为 1,162 converted / 121 corrected / 92 unsupported；
  catalog 变体为 1,230 converted / 127 corrected / 126 unsupported。

## 验证

```sh
pnpm --filter @randomplay/data generate:static-effects /tmp/fairy-zzz/991bb0e /tmp/fairy-velina-out
pnpm --filter @randomplay/data test
pnpm --filter @randomplay/core test
pnpm --filter @randomplay/data authoring:verify
pnpm --filter @randomplay/data verify:artifact-dependencies
pnpm --filter @randomplay/data audit:data-identity
pnpm check
```

负例位于 `packages/core/test/effects/static-catalog-data.test.ts`：

- 宽口径记录单独在乱流命中上不生效。
- 宽口径与乱流记录同时选择时，乱流仍只吃 10%/15%。
- M6 不作用于乱流、异放或紊乱。

## 数据管理

本批只改 Git 跟踪的静态 effects 制品、测试与文档，不改 Nanoka 整合规则、来源版本
或 `packages/data/integrated`。按[来源数据整合规范](../specs/data/integration.md#数据管理状态的同步维护)，
`definitions` 不属于受管理 `integrated` 协议；主工作区仍需执行只读复验
`pnpm --filter @randomplay/data verify:nanoka:current integrated`。

## 回退

- 回退本批即恢复 revision `53` 的宽口径行为；三制品与测试一并回退。
- 若语义守卫拒绝生成，先确认是编码或块 note 漂移，还是全局伤害种类映射变化；
  禁止放宽守卫来跑通。
