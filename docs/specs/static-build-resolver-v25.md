# 静态构筑解析系统 V25

`V24` 已完成第二批公式推导型 source damage view，并把 `薇薇安 [异放]` 接入：

- `resolveStaticBuildSourceDamageViews()`
- `resolveStaticBuildTriggerMatrix()`
- `resolveStaticBuildSourceEntries()`

当前 `source-specific utility / resource view` 在 `V20` 已完成第一批：

1. `「月相」-朔`
2. `「电磁暴」-叁式`
3. `家政员`
4. `灼心摇壶`

这条 contract 目前还有两个明显缺口：

1. 只支持 `energy` / `energy-per-second`，还不能表达 `时光切片` 这类 `喧响值 + 能量` 的资源条目
2. utility-only 查询仍绑定当前 damage-agent catalog，导致 `支援` 特性的 `时光切片` 使用者无法进入正式 utility view 路径

因此，`V25` 的目标是扩第二批 utility / resource view，但仍保持：

- 不并回主伤害公式
- 不做 utility matrix
- 不引入时间轴 / 覆盖率 / 循环模拟

## 1. 目标

新增 / 收口：

1. 为 `source-specific utility view` 增加 `decibel` 资源表达能力
2. 把 utility-only 查询从 damage-agent catalog 解耦
3. 收录 `时光切片` 第二批 utility coverage
4. 让 `resolveStaticBuildSourceEntries()` 在 utility-only 场景下可聚合 `时光切片`

## 2. V25 范围

1. `V25.1` scope freeze
2. `V25.2` decibel utility contract
3. `V25.3` utility-only catalog decoupling
4. `V25.4` time-slice coverage + source-entry integration
5. `V25.5` docs closeout

## 3. 设计边界

本阶段只做：

1. 扩 `source-specific utility view`
2. 新增 `decibel` 相关的 utility type / unit
3. 新增 utility-only agent catalog，用于支援特性音擎的兼容校验
4. 第一批只落 `时光切片`

显式不做：

1. 不把 `喧响值` 条目并回主 damage resolver
2. 不做 utility trigger matrix
3. 不做 `支援` 代理人的主伤害 resolver
4. 不做时间轴累计、覆盖率、循环收益模拟

## 4. contract 方向

`V25` 只对 utility / source-entry contract 做最小扩展：

1. `StaticBuildSourceUtilityViewType`
   - 保留：
     - `energy-refund`
     - `energy-regen-rate`
   - 新增：
     - `decibel-gain`

2. `StaticBuildSourceUtilityViewMeta.unit`
   - 保留：
     - `energy`
     - `energy-per-second`
   - 新增：
     - `decibel`

3. `supportedStaticBuildSourceUtilityViewWEngines`
   - 不再隐式受当前 damage-agent specialty 集合约束
   - 可覆盖 `支援` 特性的 utility-only 音擎

4. `resolve-build-source-utility-views`
   - 可接受 utility-only agent
   - 仍按 `specialty` 做音擎兼容校验

## 5. 第一批范围

`V25.4` 第一批只覆盖：

1. `时光切片`
   - 四类触发：
     - `[闪避反击]`
     - `[强化特殊技]`
     - `[支援攻击]`
     - `[连携技]`
   - 每类触发独立结算：
     - `喧响值`
     - 装备者能量回复
     - 12 秒冷却

这意味着 `V25` 第一批会新增多条 `source utility entry`，而不是把 `时光切片` 压成一条模糊描述。

## 6. 验收标准

1. `resolveStaticBuildSourceUtilityViews()` 可返回 `时光切片` 的结构化 utility entries
2. utility-only 查询不再要求代理人位于当前 damage-agent 支持名单
3. `resolveStaticBuildSourceEntries()` 在 utility-only 场景下可聚合 `时光切片`
4. 不引入任何新的主伤害 resolver bucket
5. 若资源收益依赖时间轴累计，仍保留在 assumptions / source notes，不增加隐式默认值

## 7. 当前状态

- `V25.1` 已完成：冻结到第二批 utility / resource view
- `V25.2` 已完成：utility contract 已新增 `decibel-gain / decibel`
- `V25.3` 已完成：utility-only agent / w-engine catalog 已与 damage-agent catalog 解耦
- `V25.4` 已完成：`时光切片` 已按每种触发拆成 `decibel + energy` utility entries，并接入 source-entry collection
- `V25.5` 已完成：README / 索引 / 架构入口已同步到“`V25` 已收口”，并统一更新 utility / resource 覆盖说明
