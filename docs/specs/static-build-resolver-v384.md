# 静态构筑解析系统 V384：buhflipexplode raw field contracts

## 背景

`packages/zzz-data/src/buhflipexplode/index.ts` 里的 raw interface 仍保留一段匿名字段 contract：

- `BuhflipEnemy`
- `SDEnemyRef` / `SDSide` / `SDVersionData`
- `DAEnemyRef` / `DAVersionData`
- `TSEnemyRef` / `TSSide` / `TSVersionData`

这些字段对应的语义已经在同文件后半段通过 helper input/output alias 部分表达，但 raw interface 本身还直接暴露：

- `number`
- `[number, number]`
- `string[]`

这让 `buhflipexplode` 在“公开 helper contract 已显式化”的同时，raw field 层仍留下局部匿名 shape。

## 目标

`V384` 只解决一件事：

- 把 `buhflipexplode` raw interface 的公开字段统一改成显式 alias / pair alias / list alias。

## 范围

1. `BuhflipNodeLevel`
2. `BuhflipEnemyBaseDefense`
3. `BuhflipEnemyBaseDaze`
4. `BuhflipEnemyBaseHP`
5. `BuhflipEnemyBaseDazePair`
6. `BuhflipEnemyBaseHPPair`
7. `BuhflipEnemyHPMult`
8. `BuhflipBossHPMult`
9. `BuhflipPP60kTotalHP`
10. `BuhflipEnemyTag`
11. `BuhflipEnemyTagList`
12. `BuhflipEnemyModifier`
13. `BuhflipEnemyModifierList`
14. `BuhflipEnemyId`
15. `BuhflipVersionIndex`
16. `BuhflipEnemyRefType`
17. `BuhflipEnemyCount`
18. `BuhflipEnemyStunMultiplier`
19. `BuhflipEnemyStunTime`
20. `BuhflipEnemyBaseAnomaly`
21. `BuhflipVersionDazeMultiplier`
22. `BuhflipVersionAnomalyMultiplier`
23. `BuhflipMainBuffNum`
24. `BuhflipEnemy`
25. `SDEnemyRef`
26. `SDSide`
27. `SDVersionData`
28. `DAEnemyRef`
29. `DAVersionData`
30. `TSEnemyRef`
31. `TSSide`
32. `TSVersionData`

## 非目标

1. 不改任何 `buhflipexplode` 公式 helper 逻辑
2. 不改爬虫或 merge 输出
3. 不把 `buhflipexplode` 扩大到根包公开导出

## 完成标准

1. `buhflipexplode` raw interface 不再直接暴露这批匿名 field contract
2. `buhflipexplode` 公式 helper、agent 测试与构建保持通过
3. roadmap、索引与架构文档同步
