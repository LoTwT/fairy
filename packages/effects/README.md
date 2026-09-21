# @randomplay/effects

Fairy 的统一效果规则包：正式效果类型、JSON 运行时校验、配置准备，以及后续阶段的求值与事件推进。

代理人、驱动盘、音擎共用一套规则模型：**满足条件，提供效果，或修改已有的效果**。模型语义、执行契约与验收矩阵由[统一效果规则模型](../../docs/specs/effects/index.md)维护；正式类型以[包内类型](src/types.ts)为唯一权威来源。

## 使用

```ts
import { parseEffectRuleSet, prepareEffects } from "@randomplay/effects"

// 在 JSON 消费边界校验规则集；无效定义即使未被绑定启用也会报告。
const parsed = parseEffectRuleSet(unknownRuleSetJson)
if (!parsed.ok) {
  // parsed.issues 按稳定指针顺序排列
  throw new Error(parsed.issues.map((issue) => issue.message).join("; "))
}

// 绑定来源、选择档位、折叠配置修改，并输出状态参数。
const prepared = prepareEffects(parsed.value, [
  {
    kind: "agent",
    bindingId: "binding:astra",
    holderId: "entity:astra",
    sourceEntityId: "1311",
    eligible: true,
    configuration: { mindscapeRank: 2, coreSkillLevel: 7 },
  },
])
if (prepared.ok) {
  prepared.value.stateParameters
}
```

`parseEffectRuleSet` 不代替 `prepareEffects` 对实际绑定、配置与来源归属的检查；`PreparedEffects` 是不透明结果，状态求值与事件推进接口按规范实施阶段逐步交付。
