# 静态构筑解析系统 V13

## 1. 背景

`V12` 已把 generic assumptions、coverage gaps 与 unsupported effects 提升成结构化 `diagnostics`。

这让当前 resolver 的剩余短板更明确了：

1. `anomaly / disorder` 单次 resolver 已可运行
2. 但一批异常代理人 / 音擎仍会稳定落入 `coverage-gap diagnostics`
3. 这些缺口现在已经能被稳定识别，可以按批次被消减

因此，`V13` 的目标不是新增 contract，而是减少异常 / 紊乱路径中的 `coverage-gap`。

## 2. 目标

`V13` 只做 anomaly / disorder 的 curated coverage 补齐。

目标：

1. 继续减少异常 / 紊乱路径上的 `coverage-gap diagnostics`
2. 优先补已经在测试和真实调用中稳定暴露的高频 source
3. 不改现有 `V12 diagnostics` contract
4. 不扩大 snapshot / source view / matrix 范围

## 3. 不做什么

`V13` 明确不做：

1. 不新增 damage type
2. 不新增 snapshot key
3. 不改现有公式
4. 不实现 anomaly / disorder skill matrix
5. 不把 source-specific view 重新并回主公式

## 4. 范围

`V13` 分五步推进：

1. `V13.1` scope freeze
2. `V13.2` anomaly/disorder coverage inventory
3. `V13.3` batch A coverage
4. `V13.4` batch B coverage
5. `V13.5` closeout

## 5. 当前已知缺口

基于现有测试与 `coverage-gap diagnostics`，当前优先级最高的 anomaly / disorder 缺口包括：

### 5.1 代理人

- `格莉丝`
- `简`
- `柳`
- `派派`
- `柏妮思`
- `爱丽丝`
- `爱芮`

### 5.2 音擎

- `淬锋钳刺`
- `时流贤者`
- `触电唇彩`
- `灼心摇壶`
- `壳中之灵`

### 5.3 暂不纳入 V13 的来源

以下来源继续保持当前边界：

- `雅`
  - 主问题仍偏 `source-specific view / stateSnapshot`
- `霰落星殿`
  - 继续保持 `research-only`
- anomaly / disorder skill matrix
  - 继续保持 out-of-scope

## 6. Inventory

`V13.2` 的 inventory 固定如下：

| Source   | 类型     | 当前暴露位置                               | 批次    | 备注                                                           |
| -------- | -------- | ------------------------------------------ | ------- | -------------------------------------------------------------- |
| 格莉丝   | agent    | `coverage-gap diagnostics` / `assumptions` | Batch A | 优先补稳定可表达的异常增伤、感电相关条件                       |
| 简       | agent    | `coverage-gap diagnostics` / `assumptions` | Batch A | 与 `淬锋钳刺` 一起推进                                         |
| 淬锋钳刺 | w-engine | `coverage-gap diagnostics` / `assumptions` | Batch A | 先补当前 contract 能直接表达的异常 / 紊乱增益                  |
| 柳       | agent    | `coverage-gap diagnostics` / `assumptions` | Batch A | 与 `时流贤者` 一起推进                                         |
| 时流贤者 | w-engine | `coverage-gap diagnostics` / `assumptions` | Batch A | 保持不能静态展开的部分继续走 `sourceNotes`                     |
| 派派     | agent    | `coverage-gap diagnostics` / `assumptions` | Batch A | 与 `触电唇彩` 一起推进                                         |
| 触电唇彩 | w-engine | `coverage-gap diagnostics` / `assumptions` | Batch A | 只补稳定条件，不扩大 contract                                  |
| 柏妮思   | agent    | `coverage-gap diagnostics` / `assumptions` | Batch B | 继续与现有 `dynamicSnapshot` / `resolvedSnapshot` 边界保持一致 |
| 灼心摇壶 | w-engine | `coverage-gap diagnostics` / `assumptions` | Batch B | 与柏妮思一起推进                                               |
| 爱丽丝   | agent    | `coverage-gap diagnostics` / `assumptions` | Batch B | 与现有 `stateSnapshot` / `finalPanel.anomalyMastery` 规则配套  |
| 爱芮     | agent    | `coverage-gap diagnostics` / `assumptions` | Batch B | 与 `壳中之灵` 一起推进                                         |
| 壳中之灵 | w-engine | `coverage-gap diagnostics` / `assumptions` | Batch B | 继续与 `dynamicSnapshot` 规则配套                              |

## 7. 批次策略

### 6.1 Batch A

先补“现有 contract 最容易直接表达”的异常代理人与音擎：

- `格莉丝`
- `简`
- `柳`
- `派派`
- `淬锋钳刺`
- `时流贤者`
- `触电唇彩`

### 6.2 Batch B

再补需要更强 source-aware / snapshot-aware 说明的来源：

- `柏妮思`
- `爱丽丝`
- `爱芮`
- `灼心摇壶`
- `壳中之灵`

## 8. 验收标准

`V13` 完成后，至少满足：

1. 上述优先名单中的高频 source，不再默认落入 `coverage-gap`
2. 对应 effect 已转成可追踪的 curated definitions
3. 仍无法稳定静态表达的部分，继续通过 `sourceNotes / diagnostics` 明确暴露
4. 不为了消灭 `coverage-gap` 而引入新的隐式默认值

## 9. 当前状态

- `V13.1` 已完成：scope freeze
- `V13.2` 已完成：coverage inventory
- `V13.3` 已完成：`格莉丝`、`简`、`柳`、`派派` 与 `淬锋钳刺`、`时流贤者`、`触电唇彩` 已补齐 anomaly / disorder curated coverage
- `V13.4` 已完成：`柏妮思`、`爱丽丝`、`爱芮` 与 `灼心摇壶`、`壳中之灵` 已补齐 anomaly / disorder curated coverage
- `V13.5` 已完成：在当前 contract 下收口，未再为消除 coverage-gap 新增 public key
