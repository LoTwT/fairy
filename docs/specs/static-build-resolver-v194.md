# 静态构筑解析系统 V194

## 1. 背景

`V193` 收口后，compact `skill-matrix row` 中仍直接复用 raw row / metadata enum shape 的稳定缺口集中在：

1. `StaticBuildCompactSkillMatrixRow.damageType`
2. `CompactStaticBuildSkillMatrixRowMeta.templateSource`
3. `CompactStaticBuildSkillMatrixRowMeta.attributeSource`
4. `CompactStaticBuildSkillMatrixRowMeta.entryType`
5. `CompactStaticBuildSkillMatrixRowMeta.aggregationType`
6. `CompactStaticBuildSkillMatrixRowMeta.variantAxis`
7. `CompactStaticBuildSkillMatrixRowMeta.targetSize`

`V194` 只解决这一件事。

## 2. 目标

把 compact `skill-matrix row` 的结构语义字段改为显式 compact types，不再通过 indexed access 复用 raw skill-matrix row contract。

## 3. 非目标

1. 不改变 row 值
2. 不改变 `attribute / skillTag / skillMultiplier`
3. 不改变 `summary / damage / build`
4. 不改变 `includeDetails` 语义

## 4. 结果

完成后：

1. `skill-matrix row` 的结构语义字段只暴露 compact 自身类型
2. compact `skill-matrix row.metadata` 与 `trigger-matrix row.metadata` 的公开 contract 更一致
3. runtime 输出字段与数值保持不变，只收紧 public contract
