# 静态构筑解析系统 V69

`V68` 收口后，整张 skill matrix 顶层和按 `row.group` 聚合后的 section 都已经有稳定 `caveatSummary`。

但单行 `row` 仍只有 `assumptions / unsupportedEffects` 裸数组。上层如果只想判断某一行是否带 caveat、各有多少条，仍要自己统计数组长度。

`V69` 只解决一件事：

- 为 `StaticBuildSkillMatrixRow` 增加局部 `caveatSummary`

## 当前状态

- `V69.1` 已完成：冻结到 row-level skill-matrix caveat summary
- `V69.2` 已完成：`StaticBuildSkillMatrixRow` 与 compact row 已新增局部 `caveatSummary`
- `V69.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `row.caveatSummary`
- `V69.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步
