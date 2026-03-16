# 静态构筑解析系统 V361：crawl decode payload contracts

## 背景

在 [crawl/shared.ts](/Users/caoyujie/codes/zzz-data/packages/zzz-data/scripts/crawl/shared.ts) 里，`decodeSvelteKitData()` 的公开返回值仍直接暴露裸 `unknown`：

1. `decodeSvelteKitData(data: CrawlSvelteKitData): unknown`

## 目标

`V361` 只解决一件事：

- 给 `decodeSvelteKitData()` 的返回值补显式公开 contract，不改变任何解码逻辑。

## 范围

1. `CrawlDecodedPayload`
2. `decodeSvelteKitData()`

## 非目标

1. 不改递归解析逻辑
2. 不改循环引用处理逻辑
3. 不改 crawl 任务执行流程

## 完成标准

1. `decodeSvelteKitData()` 不再暴露裸 `unknown` 返回 contract
2. 现有 crawl 相关测试和构建保持通过
3. 文档同步完成
