# 静态构筑解析系统 V30

`V29` 已经把单次 `resolveStaticBuildDamage()` 收口成稳定 `summary` contract。

当前还留在高层 tool 临时 summary 逻辑里的主结果只剩：

- `resolveStaticBuildSkillMatrix()`

也就是：

1. `zzz-data` 底层仍只返回 `rows[]`
2. `zzz-agent` 的 `resolve-build-skill-matrix` 需要自行计算：
   - `baseDamageStat`
   - `baseDamageValue`
   - `commonBuckets`
   - `variableBuckets`
   - `commonFormulaMultipliers`
   - `variableFormulaMultipliers`
3. 这套 summary 逻辑当前不在 `zzz-data` public contract 内

因此，`V30` 只解决一件事：

- 为 `ResolveStaticBuildSkillMatrixResult` 增加稳定 `summary`

## 1. 目标

新增 / 收口：

1. 为 `resolveStaticBuildSkillMatrix()` 增加稳定 `summary`
2. 把当前高层 tool 的矩阵摘要逻辑下沉到 `zzz-data`
3. 让高层 tool / Agent 直接消费 `matrix.summary`

## 2. V30 范围

1. `V30.1` scope freeze
2. `V30.2` matrix summary contract
3. `V30.3` high-level tool alignment
4. `V30.4` docs closeout

## 3. 设计边界

本阶段只做：

1. 扩 `ResolveStaticBuildSkillMatrixResult`
2. 固定矩阵 summary 中的共通 bucket / 可变 bucket 语义
3. 固定矩阵 summary 中的共通公式乘区 / 可变公式乘区语义
4. 让高层 tool 直接透传底层 `matrix.summary`

显式不做：

1. 不新增 skill matrix coverage
2. 不新增 effect summary contract
3. 不调整 row metadata
4. 不新增新的 snapshot key

## 4. contract 方向

`ResolveStaticBuildSkillMatrixResult`

- 保留：
  - `profile`
  - `mode`
  - `manualBaseMode`
  - `loadout`
  - `rows`
  - `assumptions`
- 新增：
  - `summary`

`summary` 第一批至少包含：

1. 基础主属性摘要
   - `rowCount`
   - `baseDamageStat`
   - `baseDamageValue`
2. 面板摘要
   - `attack`
   - `hp`
   - `sheerForce`
   - `critRate`
   - `critDamage`
   - `penetrationRate`
   - `penetrationValue`
3. bucket 摘要
   - `commonBuckets`
   - `variableBuckets`
4. 公式乘区摘要
   - `commonFormulaMultipliers`
   - `variableFormulaMultipliers`

## 5. 验收标准

1. `resolveStaticBuildSkillMatrix()` 返回稳定 `summary`
2. 高层 tool 不再自己计算 `commonBuckets / commonFormulaMultipliers`
3. Agent 继续使用 `matrix.summary`，但不再依赖高层临时摘要逻辑
4. 不破坏现有 `rows[]` payload

## 6. 当前状态

- `V30.1` 已完成：冻结到 core skill matrix summary contract
- `V30.2` 已完成：`ResolveStaticBuildSkillMatrixResult` 已返回稳定 `summary`
- `V30.3` 已完成：高层 tool 已对齐底层 `matrix.summary`
- `V30.4` 已完成：README / 总规格 / 索引 / 架构入口已同步收口
