# Nanoka 数据源规范索引

Nanoka 数据源规范分为共享来源契约和实体契约。共享机制只在 `source.md` 定义；各实体文件只定义端点、资源发现、最低结构和特有一致性要求。

## 规范

- [共享来源规范](source.md)：版本选择、HTTP、缓存、v1 Agents 兼容、v2 多实体快照契约、原子发布、版本锁、CLI、包边界和合规要求。
- [Agents 数据规范](agents.md)：`character` 摘要与详情、Agent ID 发现、zh/en 覆盖关系、测试和验收标准。
- [Drive Discs 数据规范](equipment.md)：`equipment` 摘要与详情、最低结构、摘要与详情一致性、漂移和验收标准。
- [W-Engines 数据规范](weapon.md)：`weapon` 摘要与详情、成长结构、材料语法、攻击力关系和验收标准。
- [Bangboos 数据规范](bangboo.md)：`bangboo` 摘要与详情、合法空值、技能内部引用、一致性和验收标准。
- [Monsters 数据规范](monster.md)：`monster` 摘要与详情、多层 ID、内部战斗单位、合法空值、一致性和验收标准。
- [End Game 领域数据规范](end-game.md)：三个子域的公共资源边界、Monster 外键、Boss/Simul 共享配置、跨实体 validator 和整体发布要求。
- [Shiyu 数据规范](shiyu.md)：`shiyu` 时间变体、zone 发现、parent/child 闭合、room 和验收标准。
- [Simul 数据规范](simul.md)：`simul` 图结构、合法空值、内部引用、共享配置和验收标准。
- [Boss 数据规范](boss.md)：`boss` 的 legacy `zone`、current `modes`、mode ID、`zone_type` 和验收标准。

## 实体范围与状态

| 实体        | 上游名称    | 状态         | 规范                         |
| ----------- | ----------- | ------------ | ---------------------------- |
| Agents      | `character` | 已实现并验证 | [agents.md](agents.md)       |
| W-Engines   | `weapon`    | 已实现并验证 | [weapon.md](weapon.md)       |
| Bangboos    | `bangboo`   | 已实现并验证 | [bangboo.md](bangboo.md)     |
| Drive Discs | `equipment` | 已实现并验证 | [equipment.md](equipment.md) |
| Monsters    | `monster`   | 已实现并验证 | [monster.md](monster.md)     |
| End Game    | 见下方子域  | 已实现并验证 | [end-game.md](end-game.md)   |

End Game 是一个实体域，至少包含以下需要分别调研和建模的子域：

| End Game 子域 | 上游名称 | 状态         | 规范                 |
| ------------- | -------- | ------------ | -------------------- |
| Shiyu         | `shiyu`  | 已实现并验证 | [shiyu.md](shiyu.md) |
| Simul         | `simul`  | 已实现并验证 | [simul.md](simul.md) |
| Boss          | `boss`   | 已实现并验证 | [boss.md](boss.md)   |

当前八个实体及 End Game 领域整体均已实现并验证。七实体 epoch 已冻结；当前正常发布使用加入 Boss 的八实体 epoch，五个共享 validator 也从该 epoch 开始进入 manifest，不追溯要求已合法发布的七实体历史记录。阶段七第 9 项已完成三版本八实体完整在线抓取、离线重算和语义篡改验收；下一步是第 10 项长期契约收尾与临时计划清理，当前实施队列见 [Nanoka 后续实体实施计划](../../plans/nanoka-entities.md)。

End Game 正式建模采用一份领域规范加 Shiyu、Simul、Boss 三份子域规范；领域规范负责共享 Monster 引用、Boss/Simul 配置一致性和整体发布边界，子域规范负责各自结构。路径模板相似不代表字段结构或实体关系相同。后续未调研实体仍应在开始实施前再创建对应规范，不建立没有经过上游结构验证的空文件。
