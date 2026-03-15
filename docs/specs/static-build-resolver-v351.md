# 静态构筑解析系统 V351：agent utility helper text contracts

## 背景

`V350` 收口后，`zzz-agent` 剩余最明显的公开文本 helper 落在
[utils.ts](/Users/caoyujie/codes/zzz-data/packages/zzz-agent/src/mastra/tools/zzz/utils.ts)。

这一层仍直接暴露裸文本 contract：

1. `loadJson<T>(relativePath: string)`
2. `stripHtml(html: string): string`
3. `normalizeSpecialty(value: string | undefined)`
4. `normalizeAttribute(value: string | undefined)`
5. `normalizeDamageAttribute(value: string | undefined)`
6. `findBestMatch(..., query: string, matchFields: ((item) => string | undefined)[])`
7. `findTopMatches(..., query: string, matchFields: ((item) => string | undefined)[])`

## 目标

`V351` 只解决一件事：

- 给 `zzz-agent` 的通用 utility helper 文本 contract 补显式公开 alias，不改变任何匹配、归一化或文本清洗逻辑。

## 范围

1. `ZzzAgentJsonRelativePath`
2. `ZzzAgentHtmlText`
3. `ZzzAgentPlainText`
4. `ZzzAgentLookupText`
5. `ZzzAgentOptionalLookupText`
6. `ZzzAgentMatchFieldValue`
7. `ZzzAgentMatchField<T>`
8. `loadJson()`
9. `stripHtml()`
10. `normalizeSpecialty()`
11. `normalizeAttribute()`
12. `normalizeDamageAttribute()`
13. `findBestMatch()`
14. `findTopMatches()`

## 非目标

1. 不调整 fuzzy match 规则
2. 不改变 HTML 清洗和 entity decode 规则
3. 不改 lookup tool 的 schema 或响应结构

## 完成标准

1. 上述 helper 不再以裸 `string` / `string[]` 暴露公开文本 contract
2. 匹配与清洗行为保持不变
3. `zzz-agent` 相关测试和构建通过
