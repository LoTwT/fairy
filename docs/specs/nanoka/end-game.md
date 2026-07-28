# Nanoka End Game 数据说明

## 状态

- 领域范围：Shiyu（`shiyu`）、Simul（`simul`）、Boss（`boss`）
- 状态：三类上游资源及其代表性关系已调研，可分别由共享抓取器缓存
- 当前实现不执行 End Game 内部或跨实体关系验证

## 1. 领域边界

三个子域拥有独立索引和详情端点：

```text
GET /zzz/{version}/{entity}.json
GET /zzz/{version}/{language}/{entity}/{entityId}.json
```

其中 `entity` 分别为 `shiyu`、`simul`、`boss`。相似路径不表示三个子域具有相同详情结构。

## 2. 调研覆盖

调研覆盖：

- `3.0`
- `3.1.5+17516165`
- `3.1.12+17625891`
- 每个版本的 `zh`、`en` 详情

调研时三个版本合计覆盖 312 条索引记录和 624 份详情。该数字是一次性观察证据，不是当前抓取器维护的完整性基线。

## 3. Monster 引用

三个子域都观察到以下嵌套资源：

```text
monster_list.<entryKey>.id
```

规则性观察：

- `entryKey` 不是规范 Monster ID；
- 嵌套 `id` 才能与同版本 `monster.json` 的顶层 ID 对应；
- encounter 内仍包含关卡特定名称、图片、弱点和数值，不能简化成纯外键。

调研样本中共检查过 9,197 个引用并全部闭合。这是历史调研结果；当前轻量抓取器不会重新计算或强制该关系。

## 4. 子域关系

当前样本未证明 Shiyu、Simul、Boss 共享 season、stage、zone、room、node、battle 或顶层实体 ID，也未发现子域间的顶层直接引用。

Boss 与 Simul 中观察到同版本共享配置：

- `boss_adjust`
- 相交的 `layer_buff`
- 相交的 `selectable_buff`

调研样本中的同语言相交记录一致，同时允许一侧存在独有 ID。当前抓取器不比较这些配置。

## 5. 当前实现边界

- 三个子域可以单独通过 `--entity` 抓取。
- 定向抓取不要求同时抓取 Monster 或其他 End Game 子域。
- 本地目录只是缓存，不表示同一批次或完整领域数据。
- 不生成 validator 记录、manifest、摘要或引用报告。
- 不因关系不闭合、跨语言差异或共享配置漂移阻止缓存写入。

各子域的代表性结构分别见：

- [Shiyu](shiyu.md)
- [Simul](simul.md)
- [Boss](boss.md)
- [Monsters](monster.md)

如未来确实出现数据消费者，应由消费者需求决定是否建立字段模型和关系规则，不能将本说明中的观察直接当作稳定运行时契约。
