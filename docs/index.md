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
- [Phase 1 P1-3 生成期与构建期校验边界](plans/phase1-validation-boundary.md)：静态规则/目录与属性/技能 manifest 的结构校验、候选校验与安装顺序，以及消融与验证记录。
- [Phase 1 P1-4 制品依赖图检查](plans/phase1-artifact-dependencies.md)：manifest、integrated 输入、definitions 制品、静态来源与注册表的只读依赖图、违规分类与验证结果。
- [Phase 2 P2-1 作者层试点](plans/phase2-authoring-pilot.md)：12 条代表记录、封闭作者类型、只替换选中条目的三制品编译器、语义等价 harness、负例、消融实验与 P2-2 前置条件。
- [Phase 2 P2-2 小批量 corrected 正式迁移](plans/phase2-corrected-migration.md)：8 条 corrected 记录的正式 authoring 输入、生成链覆盖、语义/字节验收、fallback 与数据管理状态。
- [Phase 2 P2-3 authoring 覆盖扩展](plans/phase2-authoring-coverage.md)：正式记录扩展到 19 条、complete-state/independent-settlement 与新增 corrected、键序对齐、语义/字节验收与剩余未迁移项。
- [Phase 2 P2-4a 补充记录作者层](plans/phase2-supplemental-authoring.md)：`supplementalRecords` 的封闭作者形状、运行时校验、按 `supplementId` 原位替换、针对性等价测试与“能力具备但不迁移数据”的边界。
- [Phase 2 P2-4b-lite 首条真实补充记录迁移](plans/phase2-miyabi-supplement-migration.md)：只迁移 `nanoka:agents:miyabi:frostburn-break-damage` 一条、作者声明位置、逐字段基线对照、字节验收与剩余 67 条 integrated / 33 条 out-of-scope 的限制。
- [Phase 2 P2-4c 已有作者选项的补充记录批量迁移](plans/phase2-supplement-authoring-batch.md)：把 23 条已有作者选项的 integrated 补充记录迁入作者层，累计 24 条作者化、剩余 44 条 integrated / 33 条 out-of-scope，三制品字节不变。
- [Phase 2 P2-4d 音擎补充选项批量作者化](plans/phase2-w-engine-supplement-authoring.md)：把 16 条音擎 integrated 补充记录对应的选项纳入 authoring，累计 40/68 条作者化、剩余 28 条 integrated / 33 条 out-of-scope，三制品字节不变。
- [Phase 2 P2-4e 单变体代理人/驱动盘补充选项](plans/phase2-agent-supplement-authoring.md)：把 10 条单变体代理人/驱动盘 integrated 补充记录对应的选项纳入 authoring，累计 50/68 条作者化、剩余 18 条 integrated / 33 条 out-of-scope，并修复驱动盘 `disc:` effectId 前缀校验。
- [Phase 2 P2-4f 多 variant 补充选项](plans/phase2-multi-variant-supplement-authoring.md)：把 5 个 corrected/converted 双 variant 选项纳入 authoring，新增 `single-rule-per-variant` 分组，累计 55/68 条作者化、剩余 13 条 integrated / 33 条 out-of-scope。
- [Phase 2 P2-4g 洛克茜补充选项](plans/phase2-roxy-supplement-authoring.md)：把 8 条洛克茜单规则选项纳入 authoring，新增 `target-resistance-reduction`、`stun-damage-adjustment` channel，累计 63/68 条作者化、剩余 5 条 integrated / 33 条 out-of-scope。
- [Phase 2 P2-4h 洛克茜初始回能转化](plans/phase2-multi-rule-supplement-authoring.md)：把一个变体下两条规则纳入 authoring，新增 `multi-rule` 分组，累计 64/68 条作者化、剩余 4 条 integrated / 33 条 out-of-scope。
- [Phase 2 P2-4i 最后 4 条专用结算补充选项](plans/phase2-special-operation-supplement-authoring.md)：补齐露西、爱丽丝、叶瞬光专用 operation，integrated 补充记录达到 68/68，剩余 33 条 out-of-scope。
- [Phase 2 authoring 分组不变量与专用 operation 负例](plans/phase2-authoring-group-invariants.md)：为三种多记录分组补齐结构不变量、把补充记录 effectIds 绑定到所属选项，并增加专用 operation 的字段、单位与范围负例。
- [转换器与作者层边界决策](plans/converter-authoring-boundary-decision.md)：保留 converter 为唯一语义事实来源，把 authoring 冻结为独立断言层；记录 99/931 覆盖、33 条 out-of-scope、备选方案与重新评估条件。
- [静态计算端到端对照验收](plans/static-e2e-acceptance.md)：九个完整配装场景、固定上游独立参考、差异说明和追加案例格式。
- [上游测试用例迁移复核](plans/upstream-test-backport.md)：2026-10-20 从 ZZZ-HP 与 ZZZ Calculator 迁移的回归用例、上游可复现性限制及未裁定的跨实现差异。
- [ZZZ Calculator 对照验收](plans/zzz-calculator-comparison.md)：固定双方版本的公式、数据与上游测试对照，包含迁移到 Fairy 的离线样本、已确认差异及后续 PR 拆分。
- [ZZZ-HP 991bb0e 升级审计](plans/zzz-hp-991bb0e-upgrade-audit.md)：`2628b32` → `991bb0e` 的逐条裁定、ID 规范化、预期制品变化、验证与回退边界。
- [技能来源 991bb0e 升级](plans/skill-source-991bb0e-upgrade.md)：技能证据切换、柳/卢西娅三条额外结算来源回填、Burnice 触发段与安比孤立子类的边界。
- [D6 动作来源身份回填](plans/d6-action-provenance-backfill.md)：1631/1641 共 34 条直伤动作的来源 ID、6 条招架仅失衡保留 `null`、菲欧妮分类差异与 `agent-actions/4`。
- [维琳娜异常增伤范围修正](plans/velina-anomaly-scope-correction.md)：修订 54 收窄宽口径 `anomalyDmgBonus`，消除乱流重复计入并保留公开 ID。
- [宽口径异常增伤审计](plans/anomaly-broad-scope-audit.md)：修订 55 收窄格莉丝、薇薇安、爱丽丝、简与琳琅鎏心的命名异常子类，消除剩余乱流重复计入与越界命中。
- [怒目金刚精炼 2 贯穿伤害修正](plans/wrathful-vajra-r2-sheer-correction.md)：修订 56 修正 14147 精炼 2 的上游 `turbulenceDmgBonus` 字段笔误，恢复火属性贯穿伤害并保留公开 ID。
- [revision 53—56 伤害种类范围回归](plans/revision-53-56-scope-regressions.md)：修订 54—56 的公开链路正反例、固定上游投影、已知差异与精度边界。
- [PR A 实施与交接](plans/level-60-panel-attributes-pr-a.md)：属性实现的评审处理、当时的验收记录与后续衔接结果。
- [ZZZ-HP 静态数据来源盘点](plans/zzz-hp-static-inventory.md)：固定来源的身份映射、未匹配项、读取语义及正式覆盖报告入口。
- [ZZZ-HP 静态数据接入记录](plans/zzz-hp-static-data-prompt.md)：已完成接入的 Git 记录与维护入口。
- [首批自动效果规则接入记录](plans/effects-pr6-prompt.md)：已完成接入的 Git 记录与维护入口。
- [v4 数据瘦身范围说明与实施记录](plans/v4-data-slimming-scope.md)：v3 归档与 v4 发布索引的派生边界、实测体积、验证结果及 0.4.0 发布说明草稿。
- [Phase 4 P4-0 机制 schema 盘点与收敛设计](plans/phase4-mechanism-schema-audit.md)：当前规则/激活/目录变体机制字段与制品统计、消费者地图、推荐判别联合、迁移拆分与开放问题。
- [Phase 4 P4-1 authoring 机制覆盖](plans/phase4-authoring-mechanism-coverage.md)：8 个目录机制 arm 的作者层表达、30 个机制变体全量转录、新增 operation/channel/uniqueness 支持、49 条记录与字节等价验证。
- [Phase 4 P4-2 目录变体机制判别联合](plans/phase4-catalog-mechanism-union.md)：公开契约原子迁移、30 个变体的 arm 映射、schemaVersion/revision/contractVersion 版本、authoring 最小支持、验证与回滚边界，以及已合并 #304（`ee85d2e6`）的机制加固（基线 arm 校验、逐制品 schemaVersion、叶子级错误指针）。
- [v5（0.5.0）发布说明草稿](plans/v5-release-notes.md)：待发布版本与契约、破坏性变更与迁移映射、数据事实、验证证据、已知限制和全部未执行的发布检查清单。
