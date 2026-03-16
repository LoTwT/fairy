# 静态构筑解析系统 V357：crawl shared helper contracts

## 背景

在 [crawl/shared.ts](/Users/caoyujie/codes/zzz-data/packages/zzz-data/scripts/crawl/shared.ts) 里，公开导出的 crawl helper 仍直接暴露裸 URL、HTML、delay 与 extractor contract：

1. `CrawlTask.name: string`
2. `CrawlTask.url: string`
3. `CrawlTask.extract(..., html: string): unknown | Promise<unknown>`
4. `fetchStatic(url: string): Promise<string>`
5. `fetchJson(url: string): Promise<T>`
6. `fetchDynamic(url: string): Promise<string>`
7. `decodeSvelteKitData(data: unknown[]): unknown`
8. `delay(ms: number): Promise<void>`
9. `batchProcess(..., batchSize = 5, delayMs = 1000): Promise<R[]>`

## 目标

`V357` 只解决一件事：

- 给 crawl shared helper 的公开输入输出 contract 补显式 alias，不改变任何网络抓取、解码或批处理行为。

## 范围

1. `CrawlTaskName`
2. `CrawlTargetUrl`
3. `CrawlHtmlText`
4. `CrawlDelayMilliseconds`
5. `CrawlBatchSize`
6. `CrawlSvelteKitData`
7. `CrawlExtractedPayload`
8. `CrawlExtractor`
9. `CrawlTask`
10. `fetchStatic()`
11. `fetchJson()`
12. `fetchDynamic()`
13. `decodeSvelteKitData()`
14. `delay()`
15. `batchProcess()`

## 非目标

1. 不改 Playwright 行为
2. 不改 fetch / retry / batch 语义
3. 不新增 crawl 流程测试覆盖之外的运行时逻辑

## 完成标准

1. crawl shared helper 不再暴露裸 URL / HTML / delay / extractor contract
2. 现有 crawl 相关测试和构建保持通过
3. 文档同步完成
