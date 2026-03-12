# 静态构筑解析系统 V9 范围

`V8` 收口后，异常 / 紊乱剩余高价值来源已经不再是“应该进哪个 snapshot contract”的问题，而是：

- 有些来源已经能通过现有 contract 显式表达
- 但它们不应该继续硬塞进主 anomaly / disorder 公式
- 同时又确实需要一个稳定、可审计的静态展示结果

典型例子：

- `柏妮思` 的 `[燃点]/[余烬]` 额外结算
- `爱丽丝` 的 `[极性强击]`
- `雅` 的 `[霜灼·破]`
- 其余 source-specific 额外伤害 / 额外结算条目

因此，`V9` 的目标不是继续扩大主 resolver，也不是实现 anomaly / disorder matrix，而是新增一层：

- `source-specific damage view`

用于表达：

- 这类来源的独立静态结算条目
- 它们依赖的现有 snapshot / combatTags / overrides
- 以及为什么它们不进入主 anomaly / disorder 公式

## 当前进度

- `V9.1` scope freeze：已完成
- `V9.2` view contract：已完成
- `V9.3` first-batch source coverage：已完成
- `V9.4` docs / tool integration：未开始

## 1. 为什么需要 V9

当前主 resolver 已经能稳定处理：

- `normal`
- `sheer`
- `anomaly`
- `disorder`

而 `V4` 到 `V8` 也已经把高价值 static context 收口到：

- `finalPanel`
- `dynamicSnapshot`
- `stateSnapshot`
- `resolvedSnapshot`

但仍有一类来源不适合继续走主公式：

1. 它们是独立额外结算条目，不是主伤害 bucket
2. 它们往往只在 source-specific 条件下成立
3. 把它们硬塞进主公式，会让主公式语义变脏

`V9` 用来解决“这些来源应该怎么稳定展示”的问题。

## 2. V9 目标

`V9` 只做三件事：

1. 定义 `source-specific damage view` 的输入输出 contract
2. 为第一批高价值来源提供独立静态 damage view
3. 明确这些 view 与主 resolver / skill matrix 的边界

`V9` 不做：

- anomaly / disorder skill matrix
- 时间轴 / 资源过程模拟
- 把 source-specific view 再反塞回主公式
- 为单一来源发明新的顶层 public contract

## 3. 设计原则

### 3.1 主公式与独立 view 分离

- 主 resolver 继续负责主伤害结果
- 独立 view 负责不应并入主公式的额外结算条目

### 3.2 只复用现有 contract

`V9` 第一阶段只允许复用：

- `finalPanel`
- `dynamicSnapshot`
- `stateSnapshot`
- `resolvedSnapshot`
- `combatTags`
- `effectOverrides`

除非后续明确证明确实缺少共享静态值，否则不新增顶层 key。

### 3.3 单条目静态结算

每个 view 都是：

- 一次静态快照
- 一条或一组 source-specific damage entry

不引入：

- 时间轴
- 自动触发链
- 后台循环
- 随机分支模拟

## 4. 第一批目标来源

优先只做当前 contract 已经能够稳定表达的来源：

1. `爱丽丝` 的 `[极性强击]`
2. `雅` 的 `[霜灼·破]`
3. `柏妮思` 的 `[燃点]/[余烬]` 额外结算

进入第一批的条件：

- 需要的值已经能由现有 snapshot / tags 提供
- 不依赖时间轴模拟
- 可以作为“独立 damage entry”稳定展示

## 5. 输出目标

第一版 `source-specific damage view` 至少要能输出：

- `entryId`
- `label`
- `sourceType`
- `sourceId`
- `damageType`
- `supported`
- `damage`
- `requirements`
- `assumptions`

也就是：

- 算没算
- 为什么能算
- 缺什么不能算

都要明确。

## 6. 与现有系统的边界

### 6.1 与主 resolver 的边界

- 主 resolver 继续输出单个主伤害结果
- `V9` 不修改现有主公式结果

### 6.2 与 skill matrix 的边界

- `normal / sheer` matrix 保持不变
- `V9` 不等于 anomaly / disorder matrix
- `V9` 只输出 source-specific entries，不输出整套技能矩阵

### 6.3 与 assumptions 的边界

- 若某来源已经能通过 view 静态表达，就不应继续只停留在泛化 assumptions
- 若该来源仍依赖真动态过程，则继续保留 assumptions，不强做 view

## 7. 分阶段

### 7.1 `V9.1` scope freeze

冻结：

- source-specific damage view 的定位
- 与主 resolver / matrix 的边界
- 第一批目标来源

### 7.2 `V9.2` view contract

定义：

- 输入 contract
- 输出 entry 结构
- supported / unsupported 语义

### 7.3 `V9.3` first-batch source coverage

第一批只做：

- `爱丽丝` `[极性强击]`
- `雅` `[霜灼·破]`
- `柏妮思` `[燃点]/[余烬]`

### 7.4 `V9.4` docs / tool integration

收口：

- README
- roadmap
- architecture
- 如有必要，再评估是否为 `zzz-agent` 暴露高层 tool

## 8. 验收标准

`V9` 完成后，至少满足：

1. 第一批 source-specific 额外结算不再只能靠 assumptions 口头解释
2. 主 resolver 的 anomaly / disorder 公式不被污染
3. 每个 view 都能明确说明：
   - 依赖哪些现有 snapshot / tags
   - 为什么当前支持或不支持
4. 文档明确区分：
   - 主伤害结果
   - source-specific damage view
   - matrix
