# V239 build-tool schema module

`V238` 收口后，`resolve-build-shared.ts` 里仍混合了 execution-context helper 与高层 build tool 的 zod schema / input contract 定义。

`V239` 只解决一件事：

1. 把高层 build tool 的 zod schema 与相关输入 contract type 移到单独共享模块，不改变任何 tool 的输入输出 shape

## 239.1 分阶段

1. `V239.1` scope freeze
2. `V239.2` schema module alignment
3. `V239.3` tests / runtime alignment
4. `V239.4` docs closeout

## 239.2 非目标

1. 不改变任何 schema 字段、默认值或描述文案
2. 不改变 execution-context helper 的控制流
3. 不改变任何 tool 的成功/失败 shape

## 239.3 当前状态

- `V239.1` 已完成：冻结到高层 build tool schema / input contract
- `V239.2` 已完成：相关 schema 与输入 contract type 已从 `resolve-build-shared.ts` 移到单独共享模块
- `V239.3` 已完成：现有高层回归测试与 runtime 校验已覆盖
- `V239.4` 已完成：roadmap、索引与架构文档已同步
