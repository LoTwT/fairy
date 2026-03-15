# 静态构筑解析系统 V347：calculator multiplier scalar contracts

## 背景

`V343` 把 [calculator/factors.ts](/Users/caoyujie/codes/zzz-data/packages/zzz-data/src/calculator/factors.ts) 的一批公开 helper 输入收成了显式 contract，但这一层仍有两类公开 scalar 还未统一：

1. multiplier helper 返回值仍是裸 `number`
2. `calcExpectedAnomalyCritMultiplier()` / `calcDisorderDamageMultiplier()` 仍有裸 scalar 输入

## 目标

`V347` 只解决一件事：

- 把 `calculator/factors.ts` 这一层公开 factor helper 的输入与输出统一收成显式公开 scalar contract，不改变任何公式逻辑。

## 范围

1. 新增公开 multiplier/output alias
2. `DefenseParams.attackerLevelBase`
3. `DamageBreakdown`
4. `calculator/factors.ts` 的全部公开 factor helper
5. `calculator/index.ts` 对应 type export

## 非目标

1. 不改变任何 factor 公式
2. 不调整 `DamageResult` 结构
3. 不修改 `normal / sheer / anomaly / disorder` pipeline

## 完成标准

1. `calculator/factors.ts` 公开 helper 不再以裸 `number` 暴露 multiplier 输出
2. 剩余裸 scalar 输入已复用现有参数 contract
3. 运行时结果不变
4. 全量校验通过
