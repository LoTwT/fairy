# 静态构筑解析系统 V20

`V19` 已把最后两个 utility-only 旧通用音擎从 generic coverage-gap 收口成 process-only source note。

这一步解决了“缺口是否被看见”，但没有解决“utility / energy 来源如何被结构化消费”。

当前仍缺一条和主伤害公式并行、但不污染主 resolver 的能力：

- 不并回主 damage bucket
- 不伪装成 source-specific damage view
- 只输出 utility / energy 语义本身

因此，`V20` 的目标是新增 `source-specific utility / energy view`。

## 1. 目标

建立与 `source-specific damage view` 平行的独立 contract，用于表达：

- 能量回复
- 能量自动回复速率
- 其他不直接进入当前 static damage 主公式、但可稳定静态描述的 utility 条目

第一阶段只处理当前最稳定的一类：

- `w-engine` 提供的 energy / utility 条目

## 2. 为什么不继续放在 source note 里

仅用 `sourceNotes` 暴露这些来源有两个问题：

1. 调用方只能知道“这里有过程问题”，拿不到结构化条目
2. Agent / UI 无法稳定输出：
   - 每次触发回复多少能量
   - 后台每秒回复多少能量
   - 是否有冷却
   - 是否只对装备者生效

这些信息本身是稳定的，不应继续只保留为自然语言提示。

## 3. 为什么不并回主 resolver

utility / energy 条目和当前主伤害公式不是同一层语义。

把它们并回主 resolver 会产生两个坏结果：

1. 主 resolver 被迫承担“能量 / 过程解释器”职责
2. 用户会误以为这些值已经自动进入当前静态伤害计算

因此 `V20` 保持三条路径分离：

- 主伤害 resolver
- source-specific damage view
- source-specific utility / energy view

## 4. V20 contract

### 4.1 新增结果类型

新增：

- `ResolveStaticBuildSourceUtilityViewsInput`
- `ResolveStaticBuildSourceUtilityViewsResult`
- `StaticBuildSourceUtilityViewEntry`

### 4.2 entry 最小字段

每个 utility view entry 至少包含：

- `id`
- `label`
- `sourceType`
- `sourceId`
- `supported`
- `utilityType`
- `resolutionMode`
- `targetScope`
- `value`
- `unit`
- `triggerLabel`
- `conditionLabel`
- `cooldownSeconds`
- `diagnostics`
- `sourceNotes`
- `assumptions`

### 4.3 第一版 utility type

`V20` 第一版只开放：

- `energy-refund`
- `energy-regen-rate`

### 4.4 第一版 resolution mode

`V20` 第一版只开放：

- `trigger`
- `rate`

解释：

- `trigger`：每次满足条件时触发一次
- `rate`：满足条件时按固定速率生效

### 4.5 第一版 target scope

`V20` 第一版只开放：

- `self`
- `ally`
- `team`

## 5. 输入边界

`V20` 不复用完整伤害场景输入。

第一版只需要：

- `loadout`
- 可选 `panel`

第一版不需要：

- `enemy`
- `damageType`
- `skillMultiplier`
- `resolvedSnapshot`

## 6. 第一批范围

`V20.2` 只做稳定可表达、且不依赖时间轴累计的 `w-engine` utility 条目：

1. `「月相」-朔`
   - 触发 `[强化特殊技]` 后的能量回复
2. `「电磁暴」-叁式`
   - 队友施加属性异常后的能量回复
3. `家政员`
   - 后场能量自动回复速率
4. `燃狱齿轮`
   - 后场能量自动回复速率

## 7. 显式不做

`V20` 第一批不做：

1. 不把 utility 条目并回主 damage resolver
2. 不做 utility matrix
3. 不做时间轴 / 覆盖率 / 循环模拟
4. 不在第一批纳入需要复杂层数或后台过程的 anomaly utility 来源

## 8. 验收标准

`V20` 第一批完成后，至少满足：

1. utility / energy 来源不再只能通过 source note 口头解释
2. 调用方可以结构化拿到：
   - 值
   - 单位
   - 触发方式
   - 条件
   - 冷却
3. 主 resolver 与 source damage view contract 不受影响
4. `zzz-agent` 有独立高层 tool 可消费这些条目
