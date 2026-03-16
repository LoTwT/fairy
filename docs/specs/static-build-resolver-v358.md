# 静态构筑解析系统 V358：canonical term helper contracts

## 背景

在 [terms.ts](/Users/caoyujie/codes/zzz-data/packages/zzz-data/src/terms.ts) 里，公开导出的 canonical helper 仍直接暴露裸 lookup 文本和 index contract：

1. `toAgentSpecialty(value: string | undefined)`
2. `toAgentAttribute(value: string | undefined)`
3. `toAttackType(value: string | undefined)`
4. `toBaseResistanceAttribute(value: string | undefined)`
5. `getElementMultIndex(value: string | undefined): number | undefined`

## 目标

`V358` 只解决一件事：

- 给 canonical term helper 的 lookup 文本与 index 输入输出补显式公开 contract，不改变任何术语归一化逻辑。

## 范围

1. `CanonicalTermLookupText`
2. `BaseResistanceIndex`
3. `toAgentSpecialty()`
4. `toAgentAttribute()`
5. `toAttackType()`
6. `toBaseResistanceAttribute()`
7. `getElementMultIndex()`

## 非目标

1. 不改术语映射表
2. 不改 canonicalizer 逻辑
3. 不改属性桶顺序

## 完成标准

1. canonical helper 不再暴露裸 lookup 文本和 index contract
2. 现有术语测试保持通过
3. 文档同步完成
