# @randomplay/effects

Fairy 的统一效果规则包：正式效果类型、JSON 运行时校验、配置准备、给定状态求值与事件推进，满足完整 `EffectEngine` 接口。

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

`parseEffectRuleSet` 不代替 `prepareEffects` 对实际绑定、配置与来源归属的检查；`PreparedEffects` 与 `EffectState` 都是不透明结果。

状态与推进围绕五个接口组织：`supplyEffectState` 显式导入会话状态，`synchronizeSuppliedInstances` 原子替换外部实例范围，`advanceEffects` 接受单个战斗事件、更新生命周期并输出一次性请求，`evaluateEffects` 在给定世界与时点求值。同一旧状态重复推进得到相同的新状态与请求 ID；向已接收该事件的新状态重放报 `EVENT_ORDER`。事件前快照、叠层时钟、冷却分组与稳定身份编码均按[执行契约](../../docs/specs/effects/execution.md)实现。
