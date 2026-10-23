# 文档索引

这是唯一的文档入口与路由来源，只说明内容在哪里，不承载具体内容。

## 当前文档

### 规范

- [包边界与联动发布](specs/packages.md)：core/data/shared 职责、安装与旧版升级、共享契约、同版发布、GitHub Release 与版本号确认。
- [静态计算输入组装](specs/core/static-calculation.md)：完整运行示例、配装与局外面板、显式增益、结果与错误处理，以及输入和支持范围。

- [Core 计算规范](specs/core/index.md)：`@randomplay/core` 的核心术语、公式与乘区公共契约及具体计算规范。
- [统一效果规则模型](specs/effects/index.md)：统一效果的 TypeScript 类型、条件修改、状态与求值接口、core 适配和验收契约，包含代理人、驱动盘、音擎实例及游戏证据边界。
- [静态快照增益数据与培养配置](specs/effects/static-snapshot.md)：静态引擎的交付范围、ZZZ-HP 来源优先级、核心等级/影画/精炼的记录方式及固定版本对比。
- [ZZZ-HP 静态增益数据接入](specs/data/zzz-hp-static-effects.md)：固定版本的批量转换、选项目录、正式制品、静态消费、实际覆盖和限制。
- [Nanoka 数据源规范](specs/nanoka/index.md)：Nanoka 共享抓取契约、验证边界与各实体规范的统一入口。
- [来源数据整合规范](specs/data/integration.md)：完整代理人资料的字段归属、多语言目录、来源追溯与文件契约，包含单实体实现、多类别离线全量构建、固定当前数据集的多实体 v3 归档增量更新、v3 → v4 发布索引派生、按类别的更新差异报告、恢复与显式迁移协议、正式类型和验收入口，以及 v2 外壳的识别与转换边界。
- [数据消费与 npm 导出契约](specs/data/consumption.md)：公开名称类型、v4 发布索引返回结构、Published 类型、按需读取 API、JSON 子路径、publication v2 发布副本及浏览器消费验收。
- [60 级基础属性与 S 级驱动盘词条](specs/data/panel-attributes.md)：标准化属性、独立核心累计表、音擎高级属性、驱动盘词条、来源证据与生成发布边界。
- [技能倍率、动作目录与等级选择](specs/data/skill-actions.md)：动作身份、完整表达式、伤害与失衡、影画等级输入、覆盖限制、静态效果衔接及发布校验。

### 历史

- [历史记录](HISTORY.md)：冻结的既有发布历史档案，不得用于记录当前或未来工作。

### 实施与验收记录

- [D6 缺口审计与收尾决定](plans/d6-gap-audit.md)：oracle 补齐后的 unsupported/corrected/out-of-scope 分类、D4 skip 决定与后续触发条件。
- [Phase 1 P1-1 内部 manifest 读取器](plans/phase1-manifest-reader.md)：属性/技能/静态效果统一视图、显式覆盖计数单位、catalog/coverage source 一致性校验、结构化 coverage 查询、限制与消融实验记录。
- [Phase 1 P1-2 `data explain` 只读 CLI](plans/phase1-explain-cli.md)：effectId/optionId/actionId/pointer 四类输入追溯、稳定 JSON、未知输入退出码、复用 P1-1 的最小扩展与消融实验记录。
- [静态计算端到端对照验收](plans/static-e2e-acceptance.md)：九个完整配装场景、固定上游独立参考、差异说明和追加案例格式。
- [上游测试用例迁移复核](plans/upstream-test-backport.md)：2026-10-20 从 ZZZ-HP 与 ZZZ Calculator 迁移的回归用例、上游可复现性限制及未裁定的跨实现差异。
- [ZZZ Calculator 对照验收](plans/zzz-calculator-comparison.md)：固定双方版本的公式、数据与上游测试对照，包含迁移到 Fairy 的离线样本、已确认差异及后续 PR 拆分。
- [PR A 实施与交接](plans/level-60-panel-attributes-pr-a.md)：属性实现的评审处理、当时的验收记录与后续衔接结果。
- [ZZZ-HP 静态数据来源盘点](plans/zzz-hp-static-inventory.md)：固定来源的身份映射、未匹配项、读取语义及正式覆盖报告入口。
- [ZZZ-HP 静态数据接入记录](plans/zzz-hp-static-data-prompt.md)：已完成接入的 Git 记录与维护入口。
- [首批自动效果规则接入记录](plans/effects-pr6-prompt.md)：已完成接入的 Git 记录与维护入口。
- [v4 数据瘦身范围说明与实施记录](plans/v4-data-slimming-scope.md)：v3 归档与 v4 发布索引的派生边界、实测体积、验证结果及 0.4.0 发布说明草稿。
