# 静态构筑解析系统 V318：public helper id input contracts

## 目标

`V318` 只解决一件事：

- 为 build-layer 对外 helper 仍直接暴露的 `agentId / wEngineId / driveDiscId` 输入补显式公开 type

## 范围

1. `StaticBuildAgentId`
2. `StaticBuildWEngineId`
3. `StaticBuildDriveDiscId`
4. `getStaticBuildAgent() / getStaticBuildUtilityAgent()`
5. `getStaticBuildWEngine() / getStaticBuildUtilityWEngine()`
6. `getStaticBuildDriveDisc()`
7. `hasStaticBuildSourceViewCoverage()`
8. `hasStaticBuildSourceUtilityViewCoverage()`
9. `hasStaticBuildTriggerMatrixCoverage()`

## 非目标

1. 不修改任何 lookup 运行时逻辑
2. 不调整 catalog 数据内容
3. 不处理 `sourceViewId / entryId / rowId` 之外的其他 helper 输入

## 结果

- build-layer 对外 helper 的 `agentId / wEngineId / driveDiscId` 输入已统一复用显式公开 catalog-id type
