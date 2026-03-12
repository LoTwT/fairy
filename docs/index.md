# 文档索引

- [AI 协作指南](./ai-guide.md) — Codex App 与 Claude Code 共享的项目说明、命令、工作流与文档维护规则
- [架构说明](./architecture.md) — 项目结构、生成脚本设计
- [命名规范](./naming.md) — 游戏术语的英文字段命名约定
- [依赖说明](./dependencies.md) — 各 devDependency 用途
- [数据 Contract Review](./reviews/data-contract-review.md) — `zzz-data` 公开数据 contract 与 cleaned/helper layer 执行基线

## zzz-agent

- [Agent 优化清单](./agent-optimization.md) — lookup 工具返回裁剪、列表/筛选能力、calcDamage 参数改进等

## 规格文档（specs/）

- [伤害计算算法](./specs/damage-calculation.md) — 四种伤害类型（常规/贯穿/异常/紊乱）的完整乘区公式、TypeScript 类型签名与参考数值
- [静态构筑解析系统](./specs/static-build-resolver.md) — 静态效果系统、输入输出 contract、热插拔乘区管线与模块设计
- [静态构筑解析系统路线图](./specs/static-build-resolver-roadmap.md) — 后续执行顺序：V2.1 curated coverage、V2.2 matrix metadata refinement、V3 anomaly/disorder
- [静态构筑解析系统 V1](./specs/static-build-resolver-v1.md) — 第一版冻结范围：支持对象、输入输出 contract、profile 与验收标准
- [静态构筑解析系统 V2](./specs/static-build-resolver-v2.md) — 第二阶段实现：全部强攻 / 命破代理人、动态强攻/命破音擎、curated + 通用技能矩阵约定
- [静态构筑解析系统 V3](./specs/static-build-resolver-v3.md) — 当前实现：已完成 anomaly / disorder 单次 resolver，skill matrix 仍限定在 normal / sheer
