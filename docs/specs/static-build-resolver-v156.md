# 静态构筑解析系统 V156

## 目标

把 trigger/source/source-entry 相关 compact result 的 `summary` 从“直接复用 raw summary type”改成显式 compact type。

这样可以固定 compact contract，避免后续 raw summary 新增字段时被自动透传到 compact 输出。

## 范围

- `compact trigger-matrix summary`
- `compact source-damage-view summary`
- `compact source-utility-view summary`
- `compact source-entry collection summary`

## 非目标

1. 不改变任何 runtime 字段值
2. 不新增或删除 summary 中现有公开字段
3. 不改变 `includeDetails` 行为

## 完成状态

- 已完成：compact summary 类型已从 raw summary type 解耦
- 已完成：compact helper 现改为显式构造 summary / groups
- 已完成：测试、roadmap、索引与架构文档已同步
