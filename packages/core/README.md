# @randomplay/core

Fairy 的确定性计算核心包。

当前包提供乘区定义基建；公式组合能力尚未实现。公共契约记录在
[Core 计算规范](../../docs/specs/core/index.md)。

## 使用

```ts
import { defineFactor } from "@randomplay/core"

const bonusFactor = defineFactor<{ readonly multiplier: number }>({
  factorId: "bonus",
  calculate: (inputs) =>
    1 + inputs.reduce((sum, input) => sum + input.multiplier, 0),
})

bonusFactor.calculate([{ multiplier: 0.2 }, { multiplier: 0.3 }])
// 1.5
```

## 约束

- 本包只负责确定性的计算领域逻辑。
- 本包不依赖 `@randomplay/data`。
- 调用方负责提供符合公式契约的完整计算输入；本包不假设输入来自任何特定数据源或上游处理流程。
