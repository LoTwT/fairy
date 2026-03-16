# 静态构筑解析系统 V400：buhflipexplode version text contracts

## 背景

`packages/zzz-data/src/buhflipexplode/index.ts` 的 `SD/DA/TS` 版本数据仍直接把 `versionName / versionTime / mode.name` 暴露成匿名 `string`。

## 目标

`V400` 只解决一件事：

- 把 `buhflipexplode` 的版本容器文本字段统一复用显式 text alias。

## 范围

1. `BuhflipVersionName`
2. `BuhflipVersionTime`
3. `BuhflipVersionsModeName`
4. `SDVersionData.versionName`
5. `SDVersionData.versionTime`
6. `SDVersionsMode.name`
7. `DAVersionData.versionName`
8. `DAVersionData.versionTime`
9. `TSVersionData.versionName`
10. `TSVersionData.versionTime`
11. `TSVersionsMode.name`

## 非目标

1. 不改任何 raw/published JSON shape
2. 不改敌人文本字段
3. 不改版本 record key / enemy ref / buff text contract

## 完成标准

1. `buhflipexplode/index.ts` 不再直接暴露版本容器文本的匿名 `string`
2. `SD/DA/TS` 版本数据统一复用显式 alias
3. 现有测试与构建保持通过
