# 静态构筑解析系统 V68

`V67` 收口后，整张 skill matrix 顶层已经有稳定 `caveatSummary`。

但按 `row.group` 拆 section 时，组级仍只有 `assumptions / unsupportedEffects` 裸数组。上层如果想先判断某组是否有 caveat、各有多少条，仍要自己统计数组长度。

`V68` 只解决一件事：

- 为 `StaticBuildSkillMatrixGroupSummary` 增加局部 `caveatSummary`

## 当前状态

- `V68.1` 已完成：冻结到 group-level skill-matrix caveat summary
- `V68.2` 已完成：`StaticBuildSkillMatrixGroupSummary` 已新增局部 `caveatSummary`
- `V68.3` 已完成：高层 tool 断言与 agent prompt 已对齐 `matrix.summary.groups[*].caveatSummary`
- `V68.4` 已完成：相关 specs、roadmap、索引、架构文档与 README 已同步
