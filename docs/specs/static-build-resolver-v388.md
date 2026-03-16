# 静态构筑解析系统 V388：gachabase bangboo and drive-disc raw field contracts

## 背景

`packages/zzz-data/src/gachabase/types.ts` 里，`bangboo.json` 与 `drive-discs.json` 相关 interface 仍保留一批匿名 raw field：

- `BangbooStat`
- `BangbooOptimization`
- `BangbooSkillStat`
- `BangbooSkill`
- `BangbooItem`
- `DriveDiscSetEffect`
- `DriveDiscItem`

这些 interface 已经是公开 contract，但字段层还直接暴露：

- `string`
- `number`
- `string[]`
- 匿名内联对象

## 目标

`V388` 只解决一件事：

- 把 `gachabase/types.ts` 里 `bangboo` 与 `drive-disc` 相关 raw published field 统一改成显式 alias / named interface。

## 范围

1. `GachabaseDescriptionText`
2. `BangbooStat`
3. `BangbooOptimization`
4. `BangbooSkillStat`
5. `BangbooSkill`
6. `BangbooAssets`
7. `BangbooItem`
8. `DriveDiscSetEffect`
9. `DriveDiscItem`

## 非目标

1. 不改 `agents.json`、`agent-details.json`、`w-engine*.json` 相关 contract
2. 不改公开 JSON shape
3. 不改任何 helper 计算逻辑

## 完成标准

1. `gachabase/types.ts` 里 `bangboo` 与 `drive-disc` 相关 raw published interface 不再直接暴露这批匿名 field contract
2. `gachabase`、`cleaned`、agent 测试与构建保持通过
3. roadmap、索引与架构文档同步
