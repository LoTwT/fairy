# 静态构筑解析系统 V306

## 目标

`V306` 只解决一件事：

- 为 `skill-matrix row metadata` 公开 contract 中的 `segmentLabel` 补显式公开 type

## 范围

1. 新增 `segmentLabel` 文本 type
2. `StaticBuildSkillMatrixRowMeta.segmentLabel`
3. `build/index.ts` 对外导出

## 非目标

1. 不处理 `skillMultiplier`
2. 不处理 `sourceStatId / sourceStatName`
3. 不处理 `actionName / skillName`

## 结果

完成后：

- `segmentLabel` 不再以匿名 `string` 暴露在 `StaticBuildSkillMatrixRowMeta`
- 对外 `build` 入口能稳定导出对应的 segment-label 文本 contract
