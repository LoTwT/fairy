# 静态构筑解析系统 V352：agent scorer helper text contracts

## 背景

`V351` 收口后，`zzz-agent` 侧剩余最明显的裸文本 helper 落在
[zzz-scorer.ts](/Users/caoyujie/codes/zzz-data/packages/zzz-agent/src/mastra/scorers/zzz-scorer.ts)。

这一层仍直接暴露裸文本 contract：

1. `getOutputFormatMatches(response: string)`
2. `scoreOutputFormat(response: string, tools: string[])`
3. 输出格式匹配结果的 `name`

## 目标

`V352` 只解决一件事：

- 给 `zzz-agent` scorer helper 的文本与 tool-name contract 补显式公开 alias，不改变任何评分逻辑。

## 范围

1. `ZzzAgentScorerResponseText`
2. `ZzzAgentScorerToolName`
3. `ZzzAgentScorerToolNameList`
4. `ZzzAgentOutputFormatSectionName`
5. `ZzzAgentOutputFormatMatch`
6. `getOutputFormatMatches()`
7. `scoreOutputFormat()`

## 非目标

1. 不改变 output-format pattern
2. 不调整 scorer 分值逻辑
3. 不改 judge model 或 scorer 注册结构

## 完成标准

1. scorer helper 不再以裸 `string` / `string[]` 暴露文本 contract
2. 现有 scorer 测试保持通过
3. `zzz-agent` 构建通过
