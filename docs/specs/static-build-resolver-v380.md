# 静态构筑解析系统 V380：drive-disc lookup helper contracts

## 背景

`packages/zzz-agent/src/mastra/tools/zzz/lookup-drive-disc.ts` 里仍保留一组匿名 helper contract：

- query 名称与 locale 文本
- candidate 内联 shape
- set-effect 内联 shape
- trimmed result 内联 shape

这让驱动盘 lookup 层相比 agent / game-mode / w-engine / bangboo 已经收口的 helper contract，仍留有一段局部匿名 result shape。

## 目标

`V380` 只解决一件事：

- 把 `lookup-drive-disc.ts` 的 query、candidate、set-effect 与 trimmed result 统一改成显式 alias / interface。

## 范围

1. `LookupDriveDiscQueryName`
2. `LookupDriveDiscLocale`
3. `LookupDriveDiscTag`
4. `LookupDriveDiscSetEffectPieces`
5. `LookupDriveDiscSetEffectBonus`
6. `LookupDriveDiscSetEffect`
7. `LookupDriveDiscCandidateName`
8. `LookupDriveDiscCandidate`
9. `LookupDriveDiscTrimmedResult`

## 非目标

1. 不改驱动盘查询逻辑
2. 不改 set-effect 文本清洗逻辑
3. 不改返回字段语义

## 完成标准

1. `lookup-drive-disc.ts` 不再暴露匿名 query、candidate、set-effect 或 trimmed-result helper contract
2. 现有 lookup 测试、agent 测试与构建保持通过
3. roadmap、索引与架构文档同步
