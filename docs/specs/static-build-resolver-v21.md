# 静态构筑解析系统 V21

`anomaly / disorder skill matrix` 之前一直显式搁置，原因很明确：

- 现有 `normal / sheer` 矩阵行语义是“技能段 / 体型分支”
- `anomaly / disorder` 更接近“触发快照 / 额外结算条目”

因此，`V21` 不继续做“技能矩阵”，而是改做：

- `anomaly / disorder trigger-entry matrix`

## 1. 目标

为 `anomaly / disorder` 提供一份可结构化消费的“触发条目矩阵”，把：

- 主 anomaly / disorder 结算
- source-specific 独立额外结算

放到同一份结果里，但保持它们的条目语义清晰分层。

## 2. 为什么不复用现有 skill matrix

现有 skill matrix 的核心假设是：

- 每行都有明确技能归属
- 行之间主要按技能段 / 体型分支展开

而 `anomaly / disorder` 不满足这个假设：

- 主结算和额外结算不一定对应独立技能段
- 一些条目来自 source-specific 状态，而不是普通技能段
- 同一个技能只负责“触发”，不等于“伤害行”

所以 `V21` 明确不复用 `skill matrix` 的行语义。

## 3. V21 contract

### 3.1 新增结果类型

新增：

- `ResolveStaticBuildTriggerMatrixInput`
- `ResolveStaticBuildTriggerMatrixResult`
- `StaticBuildTriggerMatrixRow`
- `StaticBuildTriggerMatrixRowMeta`

### 3.2 输入边界

`V21` 第一版直接复用单次 resolver 的输入 contract：

- `loadout`
- `panel`
- `scenario`
- `effectOverrides`

不新增新的 skill-level matrix context。

### 3.3 行语义

第一版只开放两类条目：

- `main-formula`
- `source-view`

解释：

- `main-formula`：当前 anomaly / disorder 主公式结算
- `source-view`：当前 snapshot 下的 source-specific 独立额外结算条目

### 3.4 row metadata 最小字段

每行至少包含：

- `canonicalLabel`
- `stableKey`
- `entryKind`
- `damageType`
- `sourceViewId?`

## 4. 第一批范围

`V21.2` 第一批只做当前已存在 anomaly / disorder source view 的代理人：

1. `爱丽丝`
2. `雅`
3. `柏妮思`
4. `爱芮`

实现方式：

1. 主行来自 `resolveStaticBuildDamage`
2. 附加行来自 `resolveStaticBuildSourceDamageViews`
3. 不把 source view 重新并回主公式

## 5. 显式不做

`V21` 第一版不做：

1. 不把 trigger-entry matrix 伪装成技能矩阵
2. 不为 anomaly / disorder 补“所有技能 / 所有段数”矩阵
3. 不新增时间轴、覆盖率、积蓄过程模拟
4. 不把 utility / energy 条目混进 trigger-entry matrix

## 6. 验收标准

`V21` 第一批完成后，至少满足：

1. anomaly / disorder 有独立 matrix 结果，但行语义明确是触发条目
2. 主公式结算与 source-specific 额外结算在同一份结果中并列展示
3. 现有 `resolveStaticBuildDamage` 和 `resolveStaticBuildSourceDamageViews` contract 不受破坏
4. `zzz-agent` 有独立高层 tool 可消费 trigger-entry matrix
