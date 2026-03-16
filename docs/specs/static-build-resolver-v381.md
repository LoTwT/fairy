# 静态构筑解析系统 V381：calc-damage helper contracts

## 背景

`packages/zzz-agent/src/mastra/tools/zzz/calc-damage.ts` 里仍保留一组局部匿名 helper contract：

- `parseMultiplier()` 的输入输出
- `anomalyTypes` 列表的局部只读数组 shape

这让 `calc-damage` 这个底层 tool 相比其余已经收口的 agent helper，仍留有一段局部匿名标量 / list contract。

## 目标

`V381` 只解决一件事：

- 把 `calc-damage.ts` 的 multiplier helper 输入输出与 anomaly type list 统一改成显式 alias。

## 范围

1. `CalcDamageMultiplierInput`
2. `CalcDamageParsedMultiplier`
3. `CalcDamageAnomalyTypeList`
4. `parseMultiplier()`
5. `anomalyTypes`

## 非目标

1. 不改伤害公式
2. 不改 tool schema
3. 不改返回字段语义

## 完成标准

1. `calc-damage.ts` 不再暴露匿名 multiplier helper contract
2. 现有 calculator / agent 测试与构建保持通过
3. roadmap、索引与架构文档同步
