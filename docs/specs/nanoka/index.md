# Nanoka 数据源规范索引

Nanoka 文档记录上游端点和已经观察到的资源结构。共享抓取行为只由 [共享来源规范](source.md) 定义。

## 共享规范

- [共享来源规范](source.md)：版本选择、安全 HTTP、实体发现、轻量输入检查和本地缓存边界。

## 实体调研

| 实体        | 上游名称    | 当前状态       | 文档                         |
| ----------- | ----------- | -------------- | ---------------------------- |
| Agents      | `character` | 已调研，可抓取 | [agents.md](agents.md)       |
| Drive Discs | `equipment` | 已调研，可抓取 | [equipment.md](equipment.md) |
| W-Engines   | `weapon`    | 已调研，可抓取 | [weapon.md](weapon.md)       |
| Bangboos    | `bangboo`   | 已调研，可抓取 | [bangboo.md](bangboo.md)     |
| Monsters    | `monster`   | 已调研，可抓取 | [monster.md](monster.md)     |
| Shiyu       | `shiyu`     | 已调研，可抓取 | [shiyu.md](shiyu.md)         |
| Simul       | `simul`     | 已调研，可抓取 | [simul.md](simul.md)         |
| Boss        | `boss`      | 已调研，可抓取 | [boss.md](boss.md)           |

End Game 的共享观察见 [End Game 领域数据说明](end-game.md)。

“已调研，可抓取”表示端点、ID 发现方式及代表性结构已经由真实上游数据确认，并已登记到通用抓取器；不表示存在运行时 schema、字段级验证、跨实体验证或可复现快照。
