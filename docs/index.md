# 文档索引

这是唯一的文档入口与路由来源，只说明内容在哪里，不承载具体内容。

## 当前文档

### 规范

- [Core 计算规范](specs/core/index.md)：`@randomplay/core` 的核心术语、公式与乘区公共契约及具体计算规范。
- [统一效果规则模型](specs/effects/index.md)：统一效果的 TypeScript 类型、条件修改、状态与求值接口、core 适配和验收契约，包含代理人、驱动盘、音擎实例及游戏证据边界。
- [静态快照增益数据与培养配置](specs/effects/static-snapshot.md)：静态引擎的交付范围、ZZZ-HP 来源优先级、核心等级/影画/精炼的记录方式及固定版本对比。
- [ZZZ-HP 静态增益数据接入](specs/data/zzz-hp-static-effects.md)：固定版本的批量转换、选项目录、正式制品、静态消费、实际覆盖和限制。
- [Nanoka 数据源规范](specs/nanoka/index.md)：Nanoka 共享抓取契约、验证边界与各实体规范的统一入口。
- [来源数据整合规范](specs/data/integration.md)：完整代理人资料的字段归属、多语言目录、来源追溯与文件契约，包含单实体实现、多类别离线全量构建、固定当前数据集的多实体 v3 增量更新、按类别的更新差异报告、恢复与显式迁移协议、正式类型和验收入口，以及 v2 外壳的识别与转换边界。
- [数据消费与 npm 导出契约](specs/data/consumption.md)：公开名称类型、v3 索引返回结构、按需读取 API、JSON 子路径、静态发布副本及浏览器消费验收。

### 历史

- [历史记录](HISTORY.md)：冻结的既有发布历史档案，不得用于记录当前或未来工作。

### 当前实施

- [ZZZ-HP 静态数据来源盘点](plans/zzz-hp-static-inventory.md)：固定来源的身份映射、未匹配项、读取语义及正式覆盖报告入口。
- [ZZZ-HP 静态数据接入 prompt](plans/zzz-hp-static-data-prompt.md)：批量转换、消费适配、验收、review 与 PR 交接。
- [PR 6 执行 prompt](plans/effects-pr6-prompt.md)：首批自动效果规则的实施、review 与 PR 提交交接；正式要求见效果规范中的自动规则接入页。
