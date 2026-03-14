# 静态构筑解析系统 V78

## 目标

为 standalone `source-damage-view` 的 `summary.groups[*]` 增加局部 `assumptionSummary`。

`V72`、`V73` 已解决顶层与 entry 级 assumptions 摘要，但按“独立结算 / 主结算差值”拆 section 时，组内 assumptions 仍需要上层自行遍历 entries 统计。`V78` 只补这一处组级对称缺口。

## 本阶段完成

1. `StaticBuildSourceDamageViewGroupSummary` 新增 `assumptionSummary`
2. standalone / delta 分组聚合时直接派生组级 assumptions 摘要
3. 高层 `resolve-build-source-damage-views` 断言与 Agent prompt 已对齐 `views.summary.groups[*].assumptionSummary`
4. README、总规格、roadmap、索引、架构文档已同步

## 设计边界

1. 不改变 entry 级 `assumptions` 的原始数组语义
2. 不改变顶层 `views.assumptionSummary`
3. 不提前引入 source-utility-view groups 的同名字段

## 验收标准

1. 上层可以直接通过 `views.summary.groups[*].assumptionSummary` 判断某一组是否带 assumptions
2. standalone / delta 组级 assumptions 不再依赖手工遍历组内 entries
3. 不影响顶层 `summary`、顶层 `assumptionSummary` 与 `entries[*]` contract
