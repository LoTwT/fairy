# 静态构筑解析系统 V355：generate header helper text contracts

## 背景

在 [generate/config.ts](/Users/caoyujie/codes/zzz-data/packages/zzz-data/scripts/generate/config.ts) 里，公开导出的 `normalizeHeader()` 仍直接暴露裸文本 contract：

1. `normalizeHeader(header: string): string`

## 目标

`V355` 只解决一件事：

- 给 `normalizeHeader()` 的输入输出补显式公开文本 contract，不改变任何列头归一化逻辑。

## 范围

1. `GenerateWorksheetHeaderText`
2. `GenerateNormalizedWorksheetHeader`
3. `normalizeHeader()`

## 非目标

1. 不改变换行清洗规则
2. 不改 `worksheetConfigs`
3. 不改 generate 流程

## 完成标准

1. `normalizeHeader()` 不再暴露裸 `string` 输入输出
2. 现有 generate 测试保持通过
3. 文档同步完成
