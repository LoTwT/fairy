# 静态构筑解析系统 V303

## 目标

为 `source-utility-view entry` 公开 contract 中仍以匿名 `string` 暴露的 `triggerLabel / conditionLabel` 补显式公开 type，不改变任何运行时行为。

## 范围

1. 新增 `triggerLabel` 的显式公开 type
2. 新增 `conditionLabel` 的显式公开 type
3. `StaticBuildSourceUtilityViewEntry.triggerLabel`
4. `StaticBuildSourceUtilityViewEntry.conditionLabel`
5. `build/index.ts` 正式导出这两个新 type

## 非目标

1. 不改变这些标签文本内容或展示逻辑
2. 不处理 `actionName / skillName`
3. 不处理 trace reason

## 结果

- `source-utility-view entry` 中的显示标签不再直接以匿名 `string` 暴露
- 这些字段拥有稳定可复用的公开类型名
