# 静态构筑解析系统 V369：agent schema text and list contracts

## 背景

`packages/zzz-agent/src/mastra/tools/zzz/resolve-build-schemas.ts` 仍直接暴露 `name: string`、`attribute?: string`、`combatTags?: string[]`、`anomalyType: string` 这类 tool 输入字段。

这些字段已经属于高层 resolver tool 的公开 schema contract，应当和前面已经显式化的 catalog / scenario alias 保持一致。

## 目标

`V369` 只解决一件事：

- 把 `resolve-build-schemas.ts` 里公开的名称、attribute、combat-tag、anomaly-type 文本字段改为复用显式 alias。

## 范围

1. `BuildToolDriveDiscSetName`
2. `BuildToolScenarioAttributeValue`
3. `BuildToolScenarioCombatTagList`
4. `BuildToolDriveDiscSetInput`
5. `BuildToolBaseScenarioInput`
6. `BuildToolDisorderScenarioInput`
7. `BuildToolSkillMatrixContextInput`

## 非目标

1. 不改 zod schema 逻辑
2. 不改 scenario 解析逻辑
3. 不改任何 resolver 行为

## 完成标准

1. `resolve-build-schemas.ts` 的公开名称、attribute、combat-tag、anomaly-type 字段不再直接暴露匿名 `string` / `string[]`
2. 与 agent 公共 contract 和 `zzz-data` combat-tag contract 对齐
3. 全量校验通过
