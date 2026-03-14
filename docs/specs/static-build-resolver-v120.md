# 静态构筑解析系统 V120

## 背景

`V119` 已为 `source-specific damage views` 补齐顶层与 `summary` 级稳定 `effectSummary`。

但调用方如果按 `standalone / delta` 分组输出额外结算条目，仍然只能先过滤 `entries` 再自行聚合组内 effect 变化，无法像 `trigger-matrix groups` 或 `skill-matrix groups` 一样直接读取结构化结果。

## 目标

`V120` 只解决一件事：

1. 为 `source-damage-view summary.groups[*]` 补齐稳定 `effectSummary`

## 范围

### In Scope

1. 为 `StaticBuildSourceDamageViewGroupSummary` 新增稳定 `effectSummary`
2. 让组级 `effectSummary` 复用现有 `source-damage-view` effect 聚合语义
3. 高层 tool、Agent prompt、README 与测试对齐 `views.summary.groups[*].effectSummary`

### Out of Scope

1. 不改变顶层 `views.summary.effectSummary / views.effectSummary`
2. 不提前扩到 `entries[*].effectSummary`
3. 不改变现有 `group` 切分方式，只保持 `standalone / delta`

## 完成状态

- `V120.1` scope freeze：已完成
- `V120.2` runtime contract alignment：已完成
- `V120.3` tool assertion / prompt alignment：已完成
- `V120.4` docs closeout：已完成
