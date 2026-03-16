# 静态构筑解析系统 V387：gachabase w-engine raw field contracts

## 背景

`packages/zzz-data/src/gachabase/types.ts` 里，`w-engines.json` 与 `w-engine-details.json` 仍保留一批匿名 raw field：

- `WEngineEffect`
- `WEngineListItem`
- `WEngineLevel`
- `WEngineStar`
- `WEngineDetails`

这些 interface 已经是公开 contract，但字段层还直接暴露：

- `string`
- `number`
- 匿名内联对象

## 目标

`V387` 只解决一件事：

- 把 `gachabase/types.ts` 里 `w-engine` 相关 raw published field 统一改成显式 alias / named interface。

## 范围

1. `GachabaseMinLevel`
2. `GachabaseEffectLevel`
3. `WEngineEffect`
4. `WEngineSpecialtyRef`
5. `WEngineStatValue`
6. `WEngineListItem`
7. `WEngineLevel`
8. `WEngineStar`
9. `WEngineExclusiveAgentRef`
10. `WEngineDetailsAssets`
11. `WEngineDetails`

## 非目标

1. 不改 `agents.json`、`bangboo.json`、`drive-discs.json` 相关 contract
2. 不改公开 JSON shape
3. 不改任何 helper 计算逻辑

## 完成标准

1. `gachabase/types.ts` 里 `w-engine` 相关 raw published interface 不再直接暴露这批匿名 field contract
2. `gachabase`、`cleaned`、agent 测试与构建保持通过
3. roadmap、索引与架构文档同步
