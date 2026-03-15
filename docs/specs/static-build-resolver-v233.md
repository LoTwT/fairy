# V233 build-tool include-details schemas

`V232` 收口后，`skill-matrix` 之外的高层 build tools 仍在各自文件里内联 `includeDetails` schema。

`V233` 只解决一件事：

1. 把高层 build tools 的 `includeDetails` schema 固定到 shared 模块，不改变任何 tool 的输入输出 shape

## 233.1 分阶段

1. `V233.1` scope freeze
2. `V233.2` shared schema alignment
3. `V233.3` tests / runtime alignment
4. `V233.4` docs closeout

## 233.2 非目标

1. 不改变任何 `includeDetails` 文案内容
2. 不改变任何 tool 的输入 schema 结构
3. 不改变任何 tool 的成功/失败 response shape

## 233.3 当前状态

- `V233.1` 已完成：冻结到高层 build tool `includeDetails` schema 常量
- `V233.2` 已完成：除 skill-matrix 外，其余高层 build tools 的 `includeDetails` schema 已统一复用 shared 模块
- `V233.3` 已完成：现有高层回归测试与 runtime 校验已覆盖
- `V233.4` 已完成：roadmap、索引与架构文档已同步
