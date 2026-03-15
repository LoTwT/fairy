# 静态构筑解析系统 V307

## 目标

`V307` 只解决一件事：

- 为 `skill-matrix row` 公开 contract 中的 `skillMultiplier` 补显式公开 type

## 范围

1. 新增 `skillMultiplier` 文本 type
2. `StaticBuildSkillMatrixRow.skillMultiplier`
3. `build/index.ts` 对外导出

## 非目标

1. 不处理 skill multiplier 的格式或解析逻辑
2. 不处理 `segmentLabel`
3. 不处理 `sourceStatId / sourceStatName`

## 结果

完成后：

- `skillMultiplier` 不再以匿名 `string` 暴露在 `StaticBuildSkillMatrixRow`
- 对外 `build` 入口能稳定导出对应的 skill-multiplier 文本 contract
