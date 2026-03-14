# 静态构筑解析系统 V121

## 背景

`V120` 已为 `source-specific damage views` 补齐 `summary.groups[*].effectSummary`。

但逐条展示 `entries[*]` 时，调用方仍然只能回退到 `entry.build.trace` 自己聚合当前条目涉及的 effect 变化，和 `trigger-matrix row`、`skill-matrix row` 的 entry-level contract 还不对称。

## 目标

`V121` 只解决一件事：

1. 为 `source-damage-view entries[*]` 补齐稳定 `effectSummary`

## 范围

### In Scope

1. 为 `StaticBuildSourceDamageViewEntry` 新增稳定 `effectSummary`
2. compact source-damage-view entry 同步透传 `effectSummary`
3. 高层 tool、Agent prompt、README 与测试对齐 `entry.effectSummary`

### Out of Scope

1. 不改变顶层 `views.summary.effectSummary / views.effectSummary`
2. 不改变组级 `views.summary.groups[*].effectSummary`
3. 不为没有 `build.trace` 的 delta 条目伪造 effect 明细，保持空数组

## 完成状态

- `V121.1` scope freeze：已完成
- `V121.2` runtime contract alignment：已完成
- `V121.3` tool assertion / prompt alignment：已完成
- `V121.4` docs closeout：已完成
