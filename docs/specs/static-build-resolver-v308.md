# 静态构筑解析系统 V308

## 目标

`V308` 只解决一件事：

- 为 `bucket / formula-multiplier` 相关公开 map/list 中的匿名 key 补显式公开 type

## 范围

1. 新增 `bucket key` type
2. 新增 `formula-multiplier key` type
3. `StaticBuildBucketValueMap`
4. `StaticBuildFormulaMultiplierMap`
5. `StaticBuildVariableBucketList`
6. `StaticBuildVariableFormulaMultiplierList`
7. `build/index.ts` 对外导出

## 非目标

1. 不处理 map/value 的数值含义
2. 不处理 `skillMultiplier`
3. 不处理 `assumption / unsupportedEffect` 文本

## 结果

完成后：

- `bucket / formula-multiplier` 相关公开 map/list 不再直接暴露匿名 `string` key
- 对外 `build` 入口能稳定导出对应的 key contract
