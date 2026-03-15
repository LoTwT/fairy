# V248 build-tool scenario input contracts

`V247` 收口后，高层 build tool 共享 schema 模块里仍通过 `z.infer<typeof resolveBuildScenarioSchema>` 与 `z.infer<typeof resolveBuildSkillMatrixContextSchema>` 直接耦合到 zod schema 值。

`V248` 只解决一件事：

1. 为高层 build tool 定义显式的 `BuildToolScenarioInput` / `BuildToolSkillMatrixContextInput` 及其相关公共输入 type，并让 schema 仅负责校验，不改变任何 tool 的输入输出 shape

## 248.1 分阶段

1. `V248.1` scope freeze
2. `V248.2` scenario input alignment
3. `V248.3` tests / runtime alignment
4. `V248.4` docs closeout

## 248.2 非目标

1. 不改变 scenario / context schema 的字段、默认值或校验规则
2. 不改变高层 build tool 的控制流
3. 不改变任何 tool 的成功/失败 shape

## 248.3 当前状态

- `V248.1` 已完成：冻结到高层 build tool scenario/context 输入 contract
- `V248.2` 已完成：显式 `BuildToolScenarioInput` / `BuildToolSkillMatrixContextInput` 及其公共输入 type 已固定到 schema 模块，并移除了对应 `z.infer` 耦合
- `V248.3` 已完成：现有高层回归测试与 runtime 校验已覆盖
- `V248.4` 已完成：roadmap、索引与架构文档已同步
