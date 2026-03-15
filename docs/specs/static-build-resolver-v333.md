# 静态构筑解析系统 V333：skill-matrix helper map contracts

`V333` 只解决一件事：

- 把 `matrix.ts` 中 skill-matrix helper 仍直接使用的 `Map<string, ...>` 统一收成显式公开 contract。

## 范围

1. `StaticBuildSourceStatOccurrenceMap`
2. `StaticBuildSkillMatrixGroupRowMap`
3. `buildGeneratedSkillMatrixTemplates()`
4. `summarizeSkillMatrix()`
5. `build/index.ts` 对应 type export

## 非目标

1. 不修改任何 skill-matrix 行生成逻辑
2. 不处理 `summary` 里 assumptions/unsupported 的 `Set`
3. 不调整 group 排序或矩阵输出字段
