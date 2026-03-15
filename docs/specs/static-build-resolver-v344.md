# 静态构筑解析系统 V344：text helper input contracts

## 背景

`V343` 收口后，公开 helper 中仍直接暴露裸 `string` 输入的最小缺口落在 [text.ts](/Users/caoyujie/codes/zzz-data/packages/zzz-data/src/text.ts)：

- `stripRichText(value: string)`

这里已经有 [RichTextString](/Users/caoyujie/codes/zzz-data/packages/zzz-data/src/text.ts) 这个公开 alias，但 helper 还没有直接复用它。

## 目标

`V344` 只解决一件事：

- 让 `stripRichText()` 的输入直接复用既有 `RichTextString` contract，不改变任何文本清洗逻辑。

## 范围

1. `stripRichText(value: RichTextString): string`
2. roadmap、索引与架构文档同步

## 非目标

1. 不新增新的文本 helper
2. 不改变 rich text 清洗规则
3. 不扩展 HTML entity decode 或其他格式化能力

## 完成标准

1. `stripRichText()` 不再以裸 `string` 暴露输入
2. 运行时输出保持不变
3. 全量校验通过
