# 静态构筑解析系统 V359：generate cell helper contracts

## 背景

在 [generate/config.ts](/Users/caoyujie/codes/zzz-data/packages/zzz-data/scripts/generate/config.ts) 里，公开导出的 `extractCellValue()` 仍直接暴露裸 cell-value contract：

1. `extractCellValue(cell: CellValue): string | number | boolean | null`

## 目标

`V359` 只解决一件事：

- 给 `extractCellValue()` 的输入输出补显式公开 contract，不改变任何公式单元格、富文本、超链接和日期处理逻辑。

## 范围

1. `GenerateCellValue`
2. `GenerateExtractedCellValue`
3. `extractCellValue()`

## 非目标

1. 不改单元格解析逻辑
2. 不改 `normalizeHeader()`
3. 不改 generate 流程

## 完成标准

1. `extractCellValue()` 不再暴露裸 `CellValue` / 原始 union 输出 contract
2. 现有 generate 测试保持通过
3. 文档同步完成
