# 静态构筑解析系统 V348：text helper output contracts

## 背景

当前根入口导出的 `zzz-data` 模块里，公开 helper contract 只剩一个裸返回值：

- [stripRichText()](/Users/caoyujie/codes/zzz-data/packages/zzz-data/src/text.ts): `RichTextString -> string`

输入已经在 `V344` 统一复用了 `RichTextString`，但输出还没有对应的显式 contract。

## 目标

`V348` 只解决一件事：

- 给 `stripRichText()` 的返回值补显式公开 contract，不改变任何文本清洗逻辑。

## 范围

1. 新增 `PlainTextString`
2. `stripRichText(value: RichTextString): PlainTextString`
3. 文档同步

## 非目标

1. 不新增新的文本 helper
2. 不改变 rich text 清洗规则
3. 不扩展 HTML entity decode 或其他格式化能力

## 完成标准

1. `stripRichText()` 不再以裸 `string` 暴露输出
2. 运行时输出保持不变
3. 全量校验通过
