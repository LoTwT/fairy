# 文档索引

- [AI 协作指南](./ai-guide.md) — Codex App 与 Claude Code 共享的项目说明、命令、工作流与文档维护规则
- [架构说明](./architecture.md) — 项目结构、生成脚本设计
- [命名规范](./naming.md) — 游戏术语的英文字段命名约定
- [依赖说明](./dependencies.md) — monorepo 级开发依赖与关键运行时依赖说明
- [数据 Contract Review](./reviews/data-contract-review.md) — `zzz-data` 公开数据 contract 与 cleaned/helper layer 执行基线

## zzz-agent

- [Agent 优化清单](./agent-optimization.md) — lookup 工具返回裁剪、列表/筛选能力、calcDamage 参数改进等

## 规格文档（specs/）

- [伤害计算算法](./specs/damage-calculation.md) — 四种伤害类型（常规/贯穿/异常/紊乱）的完整乘区公式、TypeScript 类型签名与参考数值
- [静态构筑解析系统](./specs/static-build-resolver.md) — 静态效果系统、输入输出 contract、热插拔乘区管线与模块设计
- [静态构筑解析系统路线图](./specs/static-build-resolver-roadmap.md) — 当前执行状态：已推进到 V39；当前 contract 已覆盖 source views、trigger matrix、utility views、unified source-entry collection、main resolver summary、core skill matrix summary、core skill matrix effect summary、matrix row damage summary、matrix row compact fields、matrix row explanation fields，以及 matrix / trigger / source-entry / source-view compact helper exports；`trigger-entry matrix row` 现已具备稳定来源元数据
- [异常 / 紊乱 Skill Matrix 立项评估](./specs/anomaly-disorder-skill-matrix-evaluation.md) — 结论：在更强的 dynamic value context 落地前，不进入 anomaly / disorder matrix 实现
- [静态构筑解析系统 V1](./specs/static-build-resolver-v1.md) — 第一版冻结范围：支持对象、输入输出 contract、profile 与验收标准
- [静态构筑解析系统 V2](./specs/static-build-resolver-v2.md) — 第二阶段实现：全部强攻 / 命破代理人、动态强攻/命破音擎、curated + 通用技能矩阵约定
- [静态构筑解析系统 V3](./specs/static-build-resolver-v3.md) — 当前实现：已完成 anomaly / disorder 单次 resolver、curated effect coverage 与 source-specific assumptions；skill matrix 仍限定在 normal / sheer
- [静态构筑解析系统 V4](./specs/static-build-resolver-v4.md) — 当前阶段：progression-aware resolver 第九批已完成，当前 contract 下已收口；已接入 `agentMindscape` / `energyGenerationRate` 与柏妮思、奥菲丝&「鬼火」、爱丽丝、薇薇安、简、柳、格莉丝、爱芮的高价值 progression-aware 规则
- [静态构筑解析系统 V5](./specs/static-build-resolver-v5.md) — 当前阶段：`V5` 已在当前 contract 下收口；`柏妮思` / `爱芮` 的 `dynamicSnapshot` 已进入 anomaly/disorder resolver，并已细化 source-specific assumptions
- [静态构筑解析系统 V6](./specs/static-build-resolver-v6.md) — 当前阶段：已完成 `V6.3` 首批 `爱丽丝` / `雅` source-state snapshot coverage，并同步细化首批 state-aware assumptions
- [静态构筑解析系统 V7](./specs/static-build-resolver-v7.md) — 当前阶段：`V7.3` 前四批已完成，并在当前 contract 下收口；`柏妮思 M6` 的 `25% 火抗无视` 已接到 `bucketDeltas.ignoreResistance`，`格莉丝 M2`、`简`、`派派`、`时流贤者`、`柳 M2`、`薇薇安 M2` 的异常倍率折算已收口到 `multiplierFactors.skillMultiplierFactor`
- [静态构筑解析系统 V8](./specs/static-build-resolver-v8.md) — 当前阶段：已完成 `V8.2` inventory 与 `V8.4` 前四批 source-note 收口，并在当前 contract 下收口；当前结论是不新增 public key
- [静态构筑解析系统 V9](./specs/static-build-resolver-v9.md) — 当前阶段：`V9.4` docs / tool integration 已完成；`zzz-agent` 已暴露 `resolve-build-source-damage-views`，用于独立额外结算条目
- [静态构筑解析系统 V10](./specs/static-build-resolver-v10.md) — 当前阶段：已收口；`爱芮 [异放]` 已进入 source-specific delta view，`霰落星殿` 与 `混沌重金属 4件` 固定为 research-only
- [静态构筑解析系统 V11](./specs/static-build-resolver-v11.md) — 当前阶段：已收口；主 resolver 与 source view 都已新增结构化 `sourceNotes`
- [静态构筑解析系统 V12](./specs/static-build-resolver-v12.md) — 当前阶段：已收口；主 resolver、source view 条目与 `zzz-agent` 已优先消费结构化 `diagnostics`
- [静态构筑解析系统 V13](./specs/static-build-resolver-v13.md) — 当前阶段：已收口；anomaly / disorder 的高价值 curated coverage 已分 Batch A / Batch B 落地
- [静态构筑解析系统 V14](./specs/static-build-resolver-v14.md) — 当前阶段：已收口；非代理人 source-specific damage view 候选已完成 inventory，并保持当前边界
- [静态构筑解析系统 V15](./specs/static-build-resolver-v15.md) — 当前阶段：已在当前 contract 下收口；`sourceNotes.guidance` 已进入公开 contract
- [静态构筑解析系统 V16](./specs/static-build-resolver-v16.md) — 当前阶段：已收口；通用音擎批次已全部落地
- [静态构筑解析系统 V17](./specs/static-build-resolver-v17.md) — 当前阶段：已收口；通用驱动盘的高价值可静态表达来源已补齐
- [静态构筑解析系统 V18](./specs/static-build-resolver-v18.md) — 当前阶段：已收口；最后一批 legacy 强攻签名已按 partial coverage / source note 分层固定，不新增 public key
- [静态构筑解析系统 V19](./specs/static-build-resolver-v19.md) — 当前阶段：已收口；最后两个 utility-only 旧通用音擎已固定为 process-only source note，不新增 public key
- [静态构筑解析系统 V20](./specs/static-build-resolver-v20.md) — 当前阶段：已完成第一批 source-specific utility / resource view，`zzz-agent` 已暴露独立 utility view tool
- [静态构筑解析系统 V21](./specs/static-build-resolver-v21.md) — 当前实现：已完成 anomaly / disorder trigger-entry matrix；当前覆盖爱丽丝 / 雅 / 柏妮思 / 爱芮 / 薇薇安
- [静态构筑解析系统 V22](./specs/static-build-resolver-v22.md) — 当前实现：已为 source damage view / utility view 增加稳定 metadata
- [静态构筑解析系统 V23](./specs/static-build-resolver-v23.md) — 当前实现：已完成统一 source-entry collection，支持 utility-only 与 anomaly / disorder mixed collection
- [静态构筑解析系统 V24](./specs/static-build-resolver-v24.md) — 当前阶段：已收口；`薇薇安 [异放]` 已进入公式推导型 delta view，并同步接入 trigger matrix 与 source-entry collection
- [静态构筑解析系统 V25](./specs/static-build-resolver-v25.md) — 当前阶段：已收口；`时光切片` 已按触发类型拆成 `喧响值 + 能量` 的结构化 utility entries，并接入 unified source-entry collection
- [静态构筑解析系统 V26](./specs/static-build-resolver-v26.md) — 当前阶段：已收口；unified source-entry collection 已新增稳定 `summary`，并固定 utility-only / mixed collection 的分组与排序语义
- [静态构筑解析系统 V27](./specs/static-build-resolver-v27.md) — 当前阶段：已收口；trigger-entry matrix 已新增稳定 `summary`，并固定 `main-formula / source-view` 的分组与排序语义
- [静态构筑解析系统 V28](./specs/static-build-resolver-v28.md) — 当前阶段：已收口；source damage / utility views 已新增稳定 `summary`，并固定 standalone / delta / trigger / rate 的分组与排序语义
- [静态构筑解析系统 V29](./specs/static-build-resolver-v29.md) — 当前阶段：已收口；`ResolveStaticBuildResult` 已新增稳定 `summary`，收口单场景结果的公式乘区摘要与 diagnostics / sourceNotes / unsupportedEffects 的统计语义
- [静态构筑解析系统 V30](./specs/static-build-resolver-v30.md) — 当前阶段：已收口；`ResolveStaticBuildSkillMatrixResult` 已新增稳定 `summary`，把当前只存在于高层 tool 的矩阵摘要下沉到 `zzz-data`
- [静态构筑解析系统 V31](./specs/static-build-resolver-v31.md) — 当前阶段：已收口；`ResolveStaticBuildSkillMatrixResult` 已新增稳定 `effectSummary`，把当前只存在于高层 tool 的增益清单聚合逻辑下沉到 `zzz-data`
- [静态构筑解析系统 V32](./specs/static-build-resolver-v32.md) — 当前阶段：已收口；`resolve-build-source-entries` 已直接透传底层 `collection.summary`
- [静态构筑解析系统 V33](./specs/static-build-resolver-v33.md) — 当前阶段：已收口；`resolve-build-*` 高层 tool 的 unsupported / support-scope 组装与 catalog helper 已统一到 `resolve-build-shared.ts`
- [静态构筑解析系统 V34](./specs/static-build-resolver-v34.md) — 当前阶段：已收口；`ResolveStaticBuildSkillMatrixRow` 已新增稳定 `damageSummary`
- [静态构筑解析系统 V35](./specs/static-build-resolver-v35.md) — 当前阶段：已收口；`ResolveStaticBuildSkillMatrixRow` 已新增稳定的 row-level compact fields
- [静态构筑解析系统 V36](./specs/static-build-resolver-v36.md) — 当前阶段：已收口；`ResolveStaticBuildSkillMatrixRow` 已新增稳定的 `diagnostics / sourceNotes`
- [静态构筑解析系统 V37](./specs/static-build-resolver-v37.md) — 当前阶段：已把高层 `compact` 逻辑下沉为 `zzz-data` 可复用导出，并由高层 tool 直接复用
- [静态构筑解析系统 V38](./specs/static-build-resolver-v38.md) — 当前阶段：已把 source-damage-view / source-utility-view 收口为与 `V37` 对称的 compact helper exports，并让高层 tool 对齐 `includeDetails` 语义
- [静态构筑解析系统 V39](./specs/static-build-resolver-v39.md) — 当前阶段：已收口；`trigger-entry matrix row` 已新增稳定来源元数据，不再依赖 `label` 或额外反查 `sourceViewId`
