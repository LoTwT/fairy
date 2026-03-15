# V251 build-tool catalog specialty contracts

`V250` 收口后，高层 build tool 共享 contract 模块里，`CatalogItem.specialty` 仍是宽泛的 `string`，并且多个 helper 继续通过 `CatalogItem & { specialty: BuildToolSpecialtyKey }` 交叉类型来表达特性兼容关系。

`V251` 只解决一件事：

1. 为高层 build tool 定义可参数化的 `CatalogItem<TSpecialty>` 与共享的 `SpecialtyCatalogItem` alias，并让 loadout / execution / response helper 统一复用它们，不改变任何 tool 的输入输出 shape

## 251.1 分阶段

1. `V251.1` scope freeze
2. `V251.2` catalog specialty alignment
3. `V251.3` tests / runtime alignment
4. `V251.4` docs closeout

## 251.2 非目标

1. 不改变 catalog 数据内容或特性匹配规则
2. 不改变高层 build tool 的控制流
3. 不改变任何 tool 的成功/失败 shape

## 251.3 当前状态

- `V251.1` 已完成：冻结到高层 build tool catalog specialty contract
- `V251.2` 已完成：可参数化的 `CatalogItem<TSpecialty>` 与共享 `SpecialtyCatalogItem` alias 已固定到 contract 模块，loadout / execution / response helper 已统一复用
- `V251.3` 已完成：现有高层回归测试与 runtime 校验已覆盖
- `V251.4` 已完成：roadmap、索引与架构文档已同步
