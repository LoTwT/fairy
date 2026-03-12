# 静态构筑解析系统 V11

## 1. 背景

`V8` 到 `V10` 已经把 anomaly / disorder 的剩余高价值来源逐步收口到：

- `finalPanel`
- `dynamicSnapshot`
- `stateSnapshot`
- `resolvedSnapshot`
- `source-specific damage view`
- 真动态过程 / research-only

当前最大的剩余问题不再是“公式还能不能继续展开”，而是：

1. resolver / source view 的来源说明仍主要以 `assumptions: string[]` 输出
2. Agent / UI 只能继续解析中文字符串，无法稳定判断：
   - 这条说明归属哪个 contract
   - 它是“缺少输入”还是“已展开”
   - 它是否已经被固定为 `research-only`
3. 现有 `StaticBuildSourceNote` 已经在代码里存在，但最终对外仍被压平成字符串

因此，`V11` 的目标不是新增伤害公式，而是把已有来源说明提升成结构化 contract。

## 2. 目标

`V11` 只做一件事：

- 为 anomaly / disorder 的 source-note / assumptions 增加稳定、可程序消费的结构化输出

必须满足：

1. 保持现有 `assumptions: string[]` 不变，避免破坏旧调用方
2. 新增结构化 note contract，优先覆盖当前 anomaly / disorder 的 source-specific 来源
3. Agent / UI 后续应能优先消费结构化 note，而不是继续拆中文句子

## 3. 不做什么

`V11` 明确不做：

1. 不新增 damage type
2. 不改 `resolveStaticBuildSkillMatrix` 的覆盖范围
3. 不新增新的 snapshot key
4. 不把 `research-only` 来源重新拉回实现
5. 不做动态过程模拟
6. 不重写现有 assumptions 文案

## 4. 范围

`V11` 分三步推进：

1. `V11.1` scope freeze
   - 固定结构化 note 的目标与边界
2. `V11.2` resolver note contract
   - 为 `ResolveStaticBuildResult` 新增结构化 notes
   - 先覆盖 anomaly / disorder 的 source notes
3. `V11.3` consumer adoption
   - 让 `zzz-agent` 和 source view 优先消费结构化 notes
   - 保留字符串 assumptions 作为向后兼容层

## 5. 拟新增 contract

第一版结构化 note 至少要表达：

1. 来源属于哪个 source
   - `agent`
   - `w-engine`
   - `drive-disc`
2. 当前 note 归属哪个 contract
   - `finalPanel`
   - `dynamicSnapshot`
   - `stateSnapshot`
   - `resolvedSnapshot`
   - `sourceView`
   - `process`
3. 当前 note 的状态
   - `missing-input`
   - `resolved`
   - `process-only`
   - `research-only`
4. 需要或已使用的 key
5. 面向人的说明文案

## 6. 验收标准

`V11` 完成后，至少满足：

1. anomaly / disorder 的高价值 source-note 不再只能通过字符串理解
2. 相同来源可以稳定区分：
   - 缺少输入
   - 已按快照展开
   - 属于真动态过程
   - 属于 research-only
3. `assumptions: string[]` 继续保留，旧调用方不需要立即迁移
4. `zzz-agent` 后续可以基于结构化 note 输出更稳定的“来源说明 / requirements / research-only”小节

## 7. 当前状态

- `V11.1` 已完成：scope freeze
- `V11.2` 未开始
- `V11.3` 未开始
