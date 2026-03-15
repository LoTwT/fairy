# 静态构筑解析系统 V304

## 目标

`V304` 只解决一件事：

- 为 `skill-matrix row metadata` 公开 contract 中的 `actionName / skillName` 补显式公开 type

## 范围

1. 新增 `actionName` 文本 type
2. 新增 `skillName` 文本 type
3. `StaticBuildSkillMatrixRowMeta.actionName`
4. `StaticBuildSkillMatrixRowMeta.skillName`
5. `build/index.ts` 对外导出

## 非目标

1. 不处理 `sourceStatId / sourceStatName`
2. 不处理 `segmentLabel`
3. 不处理 `skillMultiplier`

## 结果

完成后：

- `actionName / skillName` 不再以匿名 `string` 暴露在 `StaticBuildSkillMatrixRowMeta`
- 对外 `build` 入口能稳定导出对应的文本 contract
