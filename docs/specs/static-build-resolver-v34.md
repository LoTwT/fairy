# 静态构筑解析系统 V34

`V33` 收口后，`resolve-build-skill-matrix` 的主结果里仍有一处高层临时扁平化：

1. `zzz-data` 底层 row 仍只暴露完整 `build`
2. `zzz-agent` 高层 tool 仍从 `row.build.damage.expected/crit/noCrit.total` 手工拼出 `row.damage`

这会让 skill matrix 的行级简要伤害结果继续停留在高层 tool，而不是底层 public contract。

因此，`V34` 只解决一件事：

- 为 `ResolveStaticBuildSkillMatrixRow` 增加稳定 `damageSummary`

## 1. 目标

新增 / 收口：

1. 在 `zzz-data` skill matrix row 上新增稳定 `damageSummary`
2. 固定 `expected / crit / noCrit` 的行级简要伤害语义
3. 让 `resolve-build-skill-matrix` 直接透传底层 `row.damageSummary`

## 2. V34 范围

1. `V34.1` scope freeze
2. `V34.2` matrix row damage-summary contract
3. `V34.3` high-level tool alignment
4. `V34.4` docs closeout

## 3. 设计边界

本阶段只做：

1. 为 skill matrix row 增加稳定 `damageSummary`
2. 调整高层 tool 直接消费 `row.damageSummary`
3. 更新测试与文档中的 row 简要伤害字段说明

显式不做：

1. 不新增 trigger-entry row damage summary
2. 不新增 source-entry damage summary
3. 不调整 skill matrix row metadata
4. 不新增新的 matrix coverage

## 4. contract 方向

`ResolveStaticBuildSkillMatrixRow`

- 新增：
  - `damageSummary.expected`
  - `damageSummary.crit`
  - `damageSummary.noCrit`

`resolve-build-skill-matrix`

- 改为直接透传底层 `row.damageSummary`
- 不再从 `row.build.damage.*` 手工拼装

## 5. 验收标准

1. `ResolveStaticBuildSkillMatrixRow` 有稳定 `damageSummary`
2. 高层 tool 不再手工拼装 `row.damage`
3. matrix 测试直接断言底层 `damageSummary`
4. README / 总规格 / 索引 / 架构入口同步记录 `V34` 已收口

## 6. 当前状态

- `V34.1` 已完成：冻结到 matrix row damage-summary contract
- `V34.2` 已完成：skill matrix row 已新增 `damageSummary`
- `V34.3` 已完成：高层 tool 已对齐底层 `row.damageSummary`
- `V34.4` 已完成：README / 总规格 / 索引 / 架构入口同步收口
