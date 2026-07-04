# Data review workspace（数据 review 工作区）

> Boundary：这个目录只是 Phase 2 的 source review workspace，用来记录候选
> source、minimum evidence reference 和小范围 raw inventory sample。它不是
> canonical glossary、final field map、formula model、fixture set、package API
> 或实现来源。

## 文件

- [source-registry.md](source-registry.md)：draft candidate source registry 和
  acquisition boundary。
- [evidence.md](../../data/raw/phase-2-sample/evidence.md)：Phase 2 sample
  slice 的 minimum evidence note。
- [phase-2-sample.md](../../data/raw-inventory/phase-2-sample.md)：raw
  observed inventory sample rows。

## Storage boundary（存储边界）

这个 sample 默认只使用轻量 evidence note：URL 或 static path、capture time、
version marker、source id、observation summary，以及 live/excluded judgment。
截图、归档页面、附件、raw JSON snapshot 或其他重型 artifact 只在 URL 不稳定、
页面不可复现、version state 有争议、存在唯一附件，或 reviewer 明确要求时例外使用。

如果要扩展到这个 sample 之外，必须先单独 review storage / retention 策略，再开始
收集更大范围的 raw data。
