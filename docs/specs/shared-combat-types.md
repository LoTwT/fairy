# 共享战斗类型规格（V1）

## 范围

本规格定义多个战斗相关 spec 共享的基础类型与数值语义。

当前覆盖：

- `AttributeKey`
- 统一数值单位语义

当前不覆盖：

- `PanelStatKey`
- `ExtraModifierKey`
- `OverrideKey`
- 更高层的实体结构

## `ATTRIBUTE_KEYS`

```ts
export const ATTRIBUTE_KEYS = [
  "physical",
  "fire",
  "ice",
  "electric",
  "ether",
] as const

export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number]
```

约定：

- 仓库内部统一使用小写英文属性键
- 当前 `烈霜`、`凛刃`、`玄墨` 等特殊属性暂不单独建模
- 如需参与当前静态伤害计算，仍按其原始属性归类到上述键中

## 统一数值语义

- `ratio`
  - `0.15` 表示 `15%`
- `flat`
  - `200` 表示固定增加 `200`
- `multiplier`
  - `1.5` 表示 `1.5x`

约定：

- 不接受带 `%` 的字符串数值
- 同一字段不得同时混用加成语义和倍率语义
- 如果某字段使用 `ratio` 或 `multiplier`，应在注释或字段名中明确写出
