# 静态构筑解析系统 V305

## 目标

`V305` 只解决一件事：

- 为 `skill-matrix row metadata` 公开 contract 中的 `sourceStatId / sourceStatName` 补显式公开 type

## 范围

1. 新增 `sourceStatId` 文本 type
2. 新增 `sourceStatName` 文本 type
3. `StaticBuildSkillMatrixRowMeta.sourceStatId`
4. `StaticBuildSkillMatrixRowMeta.sourceStatName`
5. `build/index.ts` 对外导出

## 非目标

1. 不处理 `segmentLabel`
2. 不处理 `skillMultiplier`
3. 不处理 `actionName / skillName`

## 结果

完成后：

- `sourceStatId / sourceStatName` 不再以匿名 `string` 暴露在 `StaticBuildSkillMatrixRowMeta`
- 对外 `build` 入口能稳定导出对应的 source-stat 文本 contract
