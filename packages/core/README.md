# @randomplay/core

Fairy 的确定性计算核心包。

当前包只包含最小初始化结构，公开 API 暂时为空。公式优先的公共设计、当前公式和 Roadmap 记录在
[Core 计算规范](../../docs/specs/core/index.md)，尚未实现。

## 约束

- 本包只负责确定性的计算领域逻辑。
- 本包不依赖 `@randomplay/data`。
- 调用方负责提供符合公式契约的完整计算输入；本包不假设输入来自任何特定数据源或上游处理流程。
