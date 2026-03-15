# V247 build-tool damage attribute contracts

`V246` 收口后，高层 build tool 的通用 lookup helper 里仍通过 `keyof typeof baseDamageAttributeMap` 直接耦合到属性映射值对象。

`V247` 只解决一件事：

1. 为高层 build tool 定义显式的 `NormalizedAttributeKey` / `NormalizedSpecialtyKey` / `BaseDamageAttribute` type，并让属性映射表仅作为满足这些 contract 的值对象存在，不改变任何 tool 的输入输出 shape

## 247.1 分阶段

1. `V247.1` scope freeze
2. `V247.2` damage attribute alignment
3. `V247.3` tests / runtime alignment
4. `V247.4` docs closeout

## 247.2 非目标

1. 不改变 `normalizeSpecialty` / `normalizeAttribute` 的匹配规则
2. 不改变基础伤害属性桶的映射结果
3. 不改变任何高层 build tool 的成功/失败 shape

## 247.3 当前状态

- `V247.1` 已完成：冻结到高层 build tool 属性归一化 contract
- `V247.2` 已完成：显式 `NormalizedAttributeKey` / `NormalizedSpecialtyKey` / `BaseDamageAttribute` type 已固定到共享 helper，并移除了 `keyof typeof baseDamageAttributeMap` 耦合
- `V247.3` 已完成：现有高层回归测试与 runtime 校验已覆盖
- `V247.4` 已完成：roadmap、索引与架构文档已同步
