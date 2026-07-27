# Nanoka 数据源规范索引

Nanoka 数据源规范分为共享来源契约和实体契约。共享机制只在 `source.md` 定义；各实体文件只定义端点、资源发现、最低结构和特有一致性要求。

## 规范

- [共享来源规范](source.md)：版本选择、HTTP、缓存、v1 Agents 兼容、v2 多实体快照契约、原子发布、版本锁、CLI、包边界和合规要求。
- [Agents 数据规范](agents.md)：`character` 摘要与详情、Agent ID 发现、zh/en 覆盖关系、测试和验收标准。
- [Drive Discs 数据规范](equipment.md)：`equipment` 摘要与详情、最低结构、摘要—详情一致性、漂移和验收标准。
- [W-Engines 数据规范](weapon.md)：`weapon` 摘要与详情、成长结构、材料语法、攻击力关系和验收标准。
- [Bangboos 数据规范](bangboo.md)：`bangboo` 摘要与详情、合法空值、技能内部引用、一致性和验收标准。

## 实体范围与状态

| 实体        | 上游名称    | 状态           | 规范                         |
| ----------- | ----------- | -------------- | ---------------------------- |
| Agents      | `character` | 已实现并验证   | [agents.md](agents.md)       |
| W-Engines   | `weapon`    | 已实现并验证   | [weapon.md](weapon.md)       |
| Bangboos    | `bangboo`   | 已实现并验证   | [bangboo.md](bangboo.md)     |
| Drive Discs | `equipment` | 已实现并验证   | [equipment.md](equipment.md) |
| Monsters    | `monster`   | 已完成轻量调研 | 尚未创建                     |
| End Game    | 见下方子域  | 已完成轻量调研 | 尚未创建                     |

End Game 是一个实体域，至少包含以下需要分别调研和建模的子域：

| End Game 子域 | 上游名称 | 状态           | 规范     |
| ------------- | -------- | -------------- | -------- |
| Shiyu         | `shiyu`  | 已完成轻量调研 | 尚未创建 |
| Boss          | `boss`   | 已完成轻量调研 | 尚未创建 |
| Simul         | `simul`  | 已完成轻量调研 | 尚未创建 |

当前已实现 Agents、Drive Discs、W-Engines 与 Bangboos，并已落地 v2 清单、实体注册表、组合 staging、定向重跑、多个历史实体集合 epoch 和分层验证。其余实体和 End Game 子域尚未完成正式设计、实现或全量验证。轻量调研、共享设计决策及当前实施队列见 [Nanoka 后续实体实施计划](../../plans/nanoka-entities.md)。

未来实体开始实施前再创建对应规范，不建立没有经过上游结构验证的空文件。End Game 正式建模采用一份领域规范加 Shiyu、Boss、Simul 三份子域规范；领域规范负责共享 Monster 引用和整体一致性边界。路径模板相似不代表字段结构或实体关系相同。
