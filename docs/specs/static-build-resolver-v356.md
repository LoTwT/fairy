# 静态构筑解析系统 V356：merge shared helper contracts

## 背景

在 [merge/shared.ts](/Users/caoyujie/codes/zzz-data/packages/zzz-data/scripts/merge/shared.ts) 里，公开导出的 merge helper 仍直接暴露裸路径、文件名、locale 与 payload contract：

1. `readRaw<T>(relPath: string): T`
2. `readXlsx<T>(name: string): T`
3. `writeOut(locale: string, name: string, data: unknown): void`
4. `writeI18n(name: string, data: unknown): void`

## 目标

`V356` 只解决一件事：

- 给 merge shared helper 的输入 contract 补显式公开 alias，不改变任何读写目录、JSON 序列化或输出路径逻辑。

## 范围

1. `MergeRawRelativePath`
2. `MergeXlsxFileName`
3. `MergeOutputLocale`
4. `MergeOutputJsonName`
5. `MergeI18nFileName`
6. `MergeOutputData`
7. `readRaw()`
8. `readXlsx()`
9. `writeOut()`
10. `writeI18n()`

## 非目标

1. 不改 `RAW_DIR / XLSX_DIR / OUT_DIR / I18N_DIR`
2. 不改任何 merge 流程
3. 不改 JSON 输出路径或格式

## 完成标准

1. merge shared helper 不再暴露裸 `string` / `unknown` 输入 contract
2. 现有 merge 相关测试和构建保持通过
3. 文档同步完成
