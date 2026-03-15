# 静态构筑解析系统 V345：version period text contracts

## 背景

当前 cleaned 层公开导出的 [analyzeVersionPeriod()](/Users/caoyujie/codes/zzz-data/packages/zzz-data/src/cleaned/versions.ts) 仍直接暴露裸 `string` 输入：

- `analyzeVersionPeriod(versionTime: string)`

同时 [VersionPeriodInfo](/Users/caoyujie/codes/zzz-data/packages/zzz-data/src/cleaned/types.ts) 的：

1. `raw`
2. `startLabel`
3. `endLabel`

也还没有对应的显式文本 contract。

## 目标

`V345` 只解决一件事：

- 把 cleaned 版本周期文本输入与输出统一收成显式公开 contract，不改变任何版本周期解析逻辑。

## 范围

1. 新增 `VersionPeriodText`
2. 新增 `VersionPeriodLabel`
3. `VersionPeriodInfo` 复用这两个 alias
4. `analyzeVersionPeriod(versionTime: VersionPeriodText)`
5. `cleaned/index.ts` 继续通过 `types.ts` 暴露这些 type

## 非目标

1. 不改变 `versionTime` 的 display-only 语义
2. 不新增日期对象或更复杂的时间解析
3. 不调整 SD/TS/DA version selection 逻辑

## 完成标准

1. `analyzeVersionPeriod()` 不再以裸 `string` 暴露输入
2. `VersionPeriodInfo` 的文本字段已复用显式 alias
3. 运行时解析结果不变
4. 全量校验通过
