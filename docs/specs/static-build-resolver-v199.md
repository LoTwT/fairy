# 静态构筑解析系统 V199

## 1. 背景

`V198` 收口后，compact `skill-matrix row` 中仍直接复用 raw row trait shape 的稳定缺口剩下两处：

1. `StaticBuildCompactSkillMatrixRow.skillTag`
2. `StaticBuildCompactSkillMatrixRow.attribute`

`V199` 只解决这一件事。

## 2. 目标

把 compact `skill-matrix row` 的 `skillTag / attribute` 统一改为显式 compact types。

## 3. 非目标

1. 不改变 row 的运行时值
2. 不改变 `metadata / damageType / summary / damage / build`
3. 不改变 matrix 生成逻辑
4. 不改变 `includeDetails` 语义

## 4. 结果

完成后：

1. compact `skill-matrix row` 的技能标签与属性字段不再通过 indexed access 复用 raw row contract
2. compact `skill-matrix row` 的结构语义字段与 trait 字段都将走 compact 自身类型
3. runtime 输出字段与数值保持不变，只收紧 public contract
