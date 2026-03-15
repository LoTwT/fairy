# V232 build-tool descriptions

`V231` 收口后，6 个高层 build tools 的 `description` 文案仍散落在各自文件中。

`V232` 只解决一件事：

1. 把高层 build tools 的 `description` 固定到共享模块，不改变任何 tool 的输入输出 shape

## 232.1 分阶段

1. `V232.1` scope freeze
2. `V232.2` shared description alignment
3. `V232.3` tests / runtime alignment
4. `V232.4` docs closeout

## 232.2 非目标

1. 不改变 tool description 文案内容
2. 不改变任何 tool 的输入 schema
3. 不改变任何 tool 的成功/失败 response shape

## 232.3 当前状态

- `V232.1` 已完成：冻结到高层 build tool description 常量
- `V232.2` 已完成：6 个高层 build tool 的 `description` 已统一复用 shared 模块
- `V232.3` 已完成：现有高层回归测试与 runtime 校验已覆盖
- `V232.4` 已完成：roadmap、索引与架构文档已同步
