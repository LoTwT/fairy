# Data review workspace（数据 review 工作区）

> Boundary：这个目录只是 review workspace routing，用来记录候选 source、
> minimum evidence reference、小范围 raw inventory sample、evidence-traced field map
> sample，以及 Phase 5 fixture expectation seed review artifact。它不是 canonical
> glossary、final field map、runtime fixture database、formula runtime、package API
> 或实现来源。

## 文件

- [source-registry.md](source-registry.md)：draft candidate source registry 和
  acquisition boundary。
- [evidence.md](../../data/raw/phase-2-sample/evidence.md)：Phase 2 sample
  slice 的 minimum evidence note。
- [phase-2-sample.md](../../data/raw-inventory/phase-2-sample.md)：raw
  observed inventory sample rows。
- [phase-3-sample.md](../../data/field-map/phase-3-sample.md)：Phase 3 sample
  field map rows 和 unresolved queue；它只映射 Phase 2 sample，不是 package data
  source。
- [phase-5-seed.md](../../data/calculation-fixtures/phase-5-seed.md)：Phase 5
  fixture expectation seed / review artifact，只验证公式结构、bucket 分离和
  source-backed expectation 边界；不是 package data source 或 runtime fixture database。

## Storage boundary（存储边界）

这个 sample 默认只使用轻量 evidence note：URL 或 static path、capture time、
version marker、source id、observation summary，以及 live/excluded judgment。
截图、归档页面、附件、raw JSON snapshot 或其他重型 artifact 只在 URL 不稳定、
页面不可复现、version state 有争议、存在唯一附件，或 reviewer 明确要求时例外使用。

如果要扩展到这个 sample 之外，必须先单独 review storage / retention 策略，再开始
收集更大范围的 raw data。

Phase 5 fixture expectation seed 只允许在 calculation spec review 中使用。任何 package
runtime fixture database、完整角色 / 装备 / 敌人数据库或 Phase 6 test fixture，都必须另走
implementation / package review gate。
