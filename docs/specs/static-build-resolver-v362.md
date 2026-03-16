# 静态构筑解析系统 V362：generate worksheet config text contracts

## 背景

在 [generate/config.ts](/Users/caoyujie/codes/zzz-data/packages/zzz-data/scripts/generate/config.ts) 里，公开导出的 worksheet config interface 仍直接暴露裸文本 contract：

1. `ColumnDef.field / type`
2. `DerivedField.field / type / sourceJson / matchField / sourceMatchField / sourceValueField`
3. `WorksheetConfig.sheetName / jsonFileName / typeName / typeGroup / columns`

## 目标

`V362` 只解决一件事：

- 给 generate worksheet config 的公开文本字段补显式 contract，不改变任何 worksheet 配置或 generate 行为。

## 范围

1. `GenerateFieldName`
2. `GenerateTypeExpression`
3. `GenerateSourceJsonName`
4. `GenerateWorksheetName`
5. `GenerateJsonFileName`
6. `GenerateInterfaceName`
7. `GenerateTypeGroupName`
8. `GenerateWorksheetColumnHeader`
9. `ColumnDef`
10. `DerivedField`
11. `WorksheetConfig`

## 非目标

1. 不改 `worksheetConfigs`
2. 不改 generate 流程
3. 不改 `extractCellValue()` 与 `normalizeHeader()`

## 完成标准

1. worksheet config 公开文本字段不再直接暴露裸 `string`
2. 现有 generate 测试保持通过
3. 文档同步完成
