# 静态构筑解析系统 V12

## 1. 背景

`V11` 已经把 anomaly / disorder 的高价值 source-note 提升成了结构化 `sourceNotes`。

但 resolver 里仍有另一类字符串输出尚未结构化：

1. generic assumptions
   - 例如默认 attribute、默认 extraAbility、默认 agentLevel
2. coverage gaps
   - 例如“当前未收录 curated 代理人/音擎/驱动盘效果”
3. unsupportedEffects
   - 例如缺少 `baseAttack` 无法精确展开攻击力% buff

这意味着：

- Agent / UI 仍然需要继续拆部分字符串
- `sourceNotes` 与其余 diagnostics 的表达层级不一致
- 上层很难稳定区分“缺少输入”“默认推断”“coverage gap”“当前不支持”

因此，`V12` 的目标是把剩余 generic diagnostics 也提升成结构化 contract。

## 2. 目标

`V12` 只做 diagnostics，不做新公式。

目标：

1. 保持现有 `assumptions: string[]` 与 `unsupportedEffects: string[]` 向后兼容
2. 为 generic assumptions 增加结构化输出
3. 为 coverage gaps / unsupported effects 增加结构化输出
4. 让 `sourceNotes`、generic assumptions、coverage gaps 最终形成同层级 diagnostics 体系

## 3. 不做什么

`V12` 明确不做：

1. 不新增 damage type
2. 不新增 snapshot key
3. 不改 resolver 公式
4. 不扩异常 / 紊乱 matrix
5. 不重写现有字符串文案

## 4. 范围

`V12` 分四步推进：

1. `V12.1` scope freeze
2. `V12.2` generic assumption diagnostics
3. `V12.3` coverage / unsupported diagnostics
4. `V12.4` consumer adoption

## 5. 第一版拟新增 contract

第一版结构化 diagnostics 至少要能表达：

1. `defaulted-input`
   - 系统使用了默认值
2. `coverage-gap`
   - 当前 source 尚未收录 curated effect definitions
3. `unsupported-effect`
   - 当前已识别 effect，但缺少关键输入或当前 contract 不支持
4. `manual-toggle`
   - 需要 `combatTags` / `effectOverrides` 等显式开关

每条 diagnostics 至少要有：

- kind
- sourceType / sourceId（如适用）
- owner 或归属域
- keys
- message

## 6. 验收标准

`V12` 完成后，至少满足：

1. 上层不再需要从 generic assumptions 里猜“这是默认值还是 coverage gap”
2. `unsupportedEffects` 有结构化镜像，不再只有字符串
3. `sourceNotes` 与 generic diagnostics 能并列消费
4. 旧字符串输出继续保留，调用方可渐进迁移

## 7. 当前状态

- `V12.1` 已完成：scope freeze
- `V12.2` 已完成：defaulted-input diagnostics
- `V12.3` 已完成：coverage-gap / unsupported-effect diagnostics
- `V12.4` 已完成：consumer adoption
