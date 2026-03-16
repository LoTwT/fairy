# 静态构筑解析系统 V379：bangboo lookup helper contracts

## 背景

`packages/zzz-agent/src/mastra/tools/zzz/lookup-bangboo.ts` 里仍保留一组匿名 helper contract：

- query 名称与 locale 文本
- `calculatedStats: Record<string, number> | undefined`
- `result: Record<string, unknown>`

这让邦布 lookup 层相比 agent / game-mode / w-engine 已经收口的 helper contract，仍留有一段局部匿名 map shape。

## 目标

`V379` 只解决一件事：

- 把 `lookup-bangboo.ts` 的 calculated stat 与 trimmed result 统一改成显式 alias。

## 范围

1. `LookupBangbooQueryName`
2. `LookupBangbooLocale`
3. `LookupBangbooCalculatedStatName`
4. `LookupBangbooCalculatedStatValue`
5. `LookupBangbooCalculatedStatMap`
6. `LookupBangbooTrimmedValue`
7. `LookupBangbooTrimmedResult`

## 非目标

1. 不改邦布查询逻辑
2. 不改属性计算逻辑
3. 不改返回字段语义

## 完成标准

1. `lookup-bangboo.ts` 不再暴露匿名 calculated-stat 或 trimmed-result helper contract
2. 现有 lookup 测试、agent 测试与构建保持通过
3. roadmap、索引与架构文档同步
