# Nanoka End Game 领域数据规范

## 状态

- 状态：三份子域规范和 adapter 均已实现并完成各自在线验收；阶段七第 9 项 End Game 综合验收尚未完成
- 领域实体：Shiyu（`shiyu`）、Simul（`simul`）、Boss（`boss`）
- 语言：简体中文（`zh`）和英文（`en`）
- 验证范围：`3.0`、`3.1.5+17516165`、`3.1.12+17625891`
- 共享契约：[Nanoka 共享来源规范](source.md)
- 依赖实体：[Nanoka Monsters 数据规范](monster.md)

本文只定义 End Game 领域共享的资源边界、Monster 外键、Boss/Simul 配置一致性、跨实体 validator 和整体发布要求。Shiyu、Simul、Boss 的专有结构分别由对应子域规范定义。

## 1. 领域边界

End Game 包含三个独立的 Nanoka 顶层实体：

| 子域  | 上游名称 | 子域规范             |
| ----- | -------- | -------------------- |
| Shiyu | `shiyu`  | [shiyu.md](shiyu.md) |
| Simul | `simul`  | [simul.md](simul.md) |
| Boss  | `boss`   | [boss.md](boss.md)   |

三个子域共享同版本 Monster 外键和部分嵌入式配置，但没有证据证明它们共享 season、stage、zone、room、node、battle 或顶层实体 ID。实现不得建立统一的通用“阶段列表”模型。

传输、缓存、快照清单、版本锁、staging、原子发布和通用 validator 状态语义遵循共享来源规范；Monster 实体身份遵循 Monsters 规范；字段结构、内部引用和合法空值遵循对应子域规范。

## 2. 目标

End Game 实现必须：

1. 将 `shiyu`、`simul` 和 `boss` 作为三个独立实体 adapter；
2. 从各自摘要顶层 key 动态发现全部详情 ID；
3. 获取每个顶层 ID 的完整 `zh/en` 详情并保留原始字节；
4. 明确区分顶层实体 ID 与 zone、mode、node、battle、record、room 等内部 ID；
5. 将 encounter 中 `monster_list` 嵌套记录的 `id` 验证为同版本 Monster 实体外键；
6. 验证 Boss 与 Simul 已确认共享的嵌入式配置；
7. 允许单个子域独立进行网络更新，但继续以完整版本目录作为发布边界；
8. 在在线 staging 和离线 verify 中执行相同的实体内部与跨实体关系验证。

## 3. 非目标

当前领域模型不包含：

- 把三个子域合并为一个快照实体或公共运行时对象；
- 将任何内部 zone、mode、node、battle、record、layer 或 room 作为独立远端资产；
- 将 `monster_list` 外层 key 当作 Monster 实体 ID；
- 将 encounter 中的 Monster 数据缩减为纯外键；
- 推导尚未证明的 ID 编码、生命周期或玩法枚举；
- 将 Boss 视为 Boss/Simul 共享配置的权威来源；
- 日文或韩文详情；
- 改变 `@randomplay/data` 的公共 API 或版本级原子发布边界。

## 4. 上游资源与发现

三个子域都使用：

```text
GET https://static.nanoka.cc/zzz/{version}/{entity}.json
GET https://static.nanoka.cc/zzz/{version}/{language}/{entity}/{entityId}.json
```

其中：

```text
entity   = shiyu | simul | boss
language = zh | en
```

每个子域的摘要顶层必须是以规范十进制实体 ID 为 key 的非空普通对象。一次完整子域抓取包括一份摘要，以及摘要中每个 ID 对应的一份中文详情和一份英文详情。

只有摘要顶层 key 是独立详情资产。调研中的代表性内部 ID 请求均返回 HTTP 404：

```text
/zh/shiyu/6205401.json
/zh/simul/10101.json
/zh/boss/690422.json
```

实现不得根据内部 ID 构造额外网络请求。

## 5. ID 命名空间

实现必须分别处理：

- Shiyu 实体 ID 和 Shiyu zone ID；
- Simul 实体、node、story-event group、battle、record 和其他内部 ID；
- Boss 实体、mode 和 zone ID；
- Monster 实体 ID；
- `monster_list` 外层 entry key。

不得通过数字长度、前缀、后缀、拼接、`stage_num` 或数组位置在不同命名空间之间推导身份。

三版本完整样本中：

- 三个子域的顶层实体 ID 集合互不相交；
- 未发现子域之间的顶层实体直接引用；
- 未发现共享的 season、stage、zone、room 或图节点 ID；
- Boss alternate mode ID 不是 Boss 顶层实体 ID，也不是独立详情资源。

## 6. Encounter 与 Monster 外键

三个子域的 encounter room 都可能包含：

```text
monster_list: {
  [monsterListEntryKey]: {
    id: MonsterEntityId
    // 关卡特有名称、图片、数值、弱点及其他未识别字段
  }
}
```

长期契约为：

- `monsterListEntryKey` 只作为中性的 entry key；
- 嵌套记录的 `id` 才是 Monster 实体外键；
- 外层 key 与嵌套 `id` 属于不同命名空间；
- encounter 记录必须完整保留，不能缩减为 Monster 外键；
- 同一 Monster 可在多个详情、阶段或房间重复出现；
- 不要求 encounter 记录与 Monster 详情或其他子域 encounter 记录相等。

应按以下稳定顺序登记五个 validator：

```text
shiyu-monster-reference/v1
simul-monster-reference/v1
boss-monster-reference/v1
boss-simul-boss-adjust-consistency/v1
boss-simul-buff-consistency/v1
```

前三个 Monster validator 分别从其来源实体进入当前 epoch 时开始登记；两个 Boss/Simul 共享配置 validator 与 Boss 一同从八实体 epoch 开始登记。第 7 项已发布的合法七实体 epoch 只有前两个 Monster validator，不得用八实体要求追溯拒绝或改写历史 manifest。八实体及后续 epoch 中，每个适用 validator 必须遍历来源实体的全部详情和适用结构分支；Monster validator 提取所有 `monster_list.*.id`，并在同版本 Monster 摘要 ID 集合中闭合。错误至少报告来源实体、顶层详情 ID、完整 JSON 路径、`monsterListEntryKey` 和未解析 Monster ID。

正常新发布中，来源子域与 Monster 都属于当前支持实体集合时，检查必须为 `passed`；不得以 `not-run` 掩盖缺失引用。

## 7. Boss 与 Simul 共享配置

### 7.1 `boss_adjust`

三版本完整样本确认，同版本、同语言内：

- 所有 Boss 详情的完整 `boss_adjust` 相等；
- 所有 Simul 详情的完整 `boss_adjust` 相等；
- Boss 与 Simul 的完整 `boss_adjust` 相等。

应登记：

```text
boss-simul-boss-adjust-consistency/v1
```

该 validator 以 `boss` 为 `fromEntity`、`simul` 为 `toEntity`，在两者都存在时分别验证 Boss 内部、Simul 内部及跨实体的同语言深度相等。比较基于解析后的 JSON 值，不依赖对象 key 的序列化顺序，也不跨语言比较本地化文本。

### 7.2 Buff 交集

三版本样本还确认 Boss 与 Simul 存在相同 ID 且值相等的 `layer_buff` 和 `selectable_buff`，同时 Simul 可以拥有 Boss 中不存在的 buff ID。

应登记：

```text
boss-simul-buff-consistency/v1
```

该 validator 必须：

- 分别收集两实体中出现的 `layer_buff` 和 `selectable_buff`；
- 只比较相同配置类别中的 ID 交集；
- 要求交集内同语言记录深度相等；
- 接受只存在于一侧的配置 ID；
- 不要求两实体的配置 ID 全集相等。

这些规则表示共享嵌入式配置的一致性，不表示 Boss 或 Simul 是另一方的远端资源依赖或权威来源。

## 8. 跨语言一致性

每个子域的同 ID `zh/en` 详情必须满足：

- 递归对象 key 集合、容器类型、数组长度和对应位置的 JSON 类型一致；
- 已证明为非本地化的 ID、引用、类型码、计数和数值相等；
- 可选字段同时存在或同时缺失；
- 子域规范定义的结构分支一致；
- 只有子域规范明确列出的本地化字符串允许不同；资产路径和其他机器字符串必须相等。

实现不得通过比较完整原始对象错误拒绝合法翻译差异。结构错误应报告可定位的 JSON 路径。

## 9. 抓取、快照与发布

三个子域拥有独立摘要和详情资源，可以分别通过以下参数进行网络更新：

```text
--entity shiyu
--entity simul
--entity boss
```

独立更新不等于独立发布。每次定向更新仍必须：

1. 完整重建所选子域的摘要和全部 `zh/en` 详情；
2. 从严格验证通过的旧快照 carried-forward 未选实体；
3. 构建当前完整实体 epoch 的版本级 staging；
4. 重新验证全部实体内部关系；
5. 执行全部适用跨实体 validator；
6. 只有完整 staging 通过后才原子替换版本目录。

当前证据不要求一次网络请求同时重抓三个 End Game 子域。刷新 Boss 或 Simul 时，携带的另一方仍必须参与共享配置检查；不一致时阻止发布。

## 10. Manifest 与 validator 适用性

End Game 实现使用共享 `validation.crossEntityReferences` 结构，不升级 `nanoka-fetch-manifest/v2` schema。

八实体 epoch 中 validator 记录遵循以下适用规则：

- 来源与目标实体都存在：执行检查，成功记录 `passed`；
- 当前正常发布中支持的来源依赖当前支持目标时，缺少任一实体或 `not-run` 都阻止发布；
- `failed` 只作为运行时错误，不得进入成功发布的 manifest；
- 未知、遗漏、重复、顺序错误或实体边界不一致的 validator 记录必须由离线 verify 拒绝。

七实体历史 epoch 冻结为 item 7 实际发布格式，不包含上述五条共享 validator 记录。共享 validator 的引入 epoch 是八实体，不为七实体补写 `not-run` 或 `not-applicable`。

## 11. 领域测试矩阵

自动化测试至少覆盖：

- 三个摘要分别发现顶层 ID，内部 ID 不产生详情请求；
- 每个顶层 ID 的 `zh/en` 详情严格闭合；
- 三个 Monster validator 的成功、缺失引用、错误外层 key 使用和错误路径报告；
- encounter 特有数据完整保留；
- Boss/Simul `boss_adjust` 内部及跨实体一致性；
- Boss/Simul buff ID 交集一致而全集可不同；
- validator 稳定顺序、manifest 解析、未知检查拒绝和状态语义；
- 当前发布中 applicable validator 不得为 `not-run`；
- 七实体历史 epoch 不含共享 validator 记录，八实体及后续 epoch 严格要求五条记录；
- 定向重跑只访问所选实体，最终仍验证并发布完整快照；
- carried-forward 目标参与关系验证；
- 任一关系错误阻止原子发布并保留旧快照；
- 离线篡改 Monster ID 或共享配置能够被检测。

## 12. 上游验证证据

2026-07-27 对以下版本执行了低频、只读的完整摘要及 `zh/en` 详情结构普查：

| 版本              | Shiyu | Boss | Simul | 详情总数（zh/en） |
| ----------------- | ----: | ---: | ----: | ----------------: |
| `3.0`             |    56 |   41 |     3 |               200 |
| `3.1.5+17516165`  |    59 |   44 |     3 |               212 |
| `3.1.12+17625891` |    59 |   44 |     3 |               212 |

共检查 312 条摘要记录和 624 份详情：

- 每个摘要 ID 都具有完整 `zh/en` 详情；
- 全部详情顶层 ID 与摘要和路径一致；
- 所有同 ID 中英文详情的递归 JSON 结构一致；
- 未发现三个子域之间的顶层实体直接引用；
- Shiyu、Boss、Simul 分别包含 8,441、393、363 个 Monster 引用；
- 全部 9,197 个嵌套 Monster `id` 都解析到同版本 Monster 摘要；
- 所有 `monsterListEntryKey` 都不等于对应嵌套 Monster `id`；
- Boss 与 Simul 的 `boss_adjust` 在 `3.0` 各有 134 项，在两个 `3.1` 版本各有 188 项，并在同版本同语言内相等；
- 观察到 32 个相同 `layer_buff` ID 和 24 个相同 `selectable_buff` ID，其交集记录相等；
- Simul 还存在 Boss 中没有的真实 buff ID，证明不能要求配置全集相等。

上述计数用于说明契约依据，不是实现中的固定阈值。

2026-07-28 完成 Boss 作为第八实体的定向升级验收。三版本最终 manifest 中，五个 validator 均按第 6 节顺序记录为 `passed`，`unresolvedReferenceCount` 均为 0：

| validator                               | `3.0` | `3.1.5+17516165` | `3.1.12+17625891` |
| --------------------------------------- | ----: | ---------------: | ----------------: |
| `shiyu-monster-reference/v1`            |  5462 |             5710 |              5710 |
| `simul-monster-reference/v1`            |   242 |              242 |               242 |
| `boss-monster-reference/v1`             |   246 |              270 |               270 |
| `boss-simul-boss-adjust-consistency/v1` |    86 |               92 |                92 |
| `boss-simul-buff-consistency/v1`        |   112 |              112 |               112 |

三版本离线 verify 通过。自动化测试覆盖关系失败阻止原子发布和 validator 严格重算；完整 End Game 综合验收仍留给阶段七第 9 项。

## 13. 已知不确定性

尚未证明：

- `monsterListEntryKey` 的业务语义；
- Boss/Simul 共享配置的上游权威来源；
- 共享配置关系是否是上游保证的永久 schema；
- 数字 ID 前后缀的业务编码；
- `ja/ko` 的全量结构覆盖；
- 是否存在本次已知资源模式之外的可选独立端点。

实现应将上述关系作为经过三版本验证的漂移检测契约，不应生成未经证明的业务字段或公开枚举。

## 14. 实现顺序与验收

实施顺序固定为：

```text
1. 实现跨实体 validator 注册、执行和 manifest 严格验证
2. Shiyu
3. Simul
4. Boss
5. End Game 整体一致性与完整版本快照验收
```

该顺序已完成前四步。Boss 在第八实体 epoch 启用全部五个共享 validator；下一步是第 5 步 End Game 整体一致性与完整版本快照验收。

本领域完成状态将在阶段七第 9 项同时满足以下条件后更新为“已实现并验证”：

1. 三个子域 adapter 和规范均完成各自验收；
2. 五个跨实体 validator 已登记、执行并可离线重算；
3. 历史 v2 epoch 与新增逐步 epoch 严格可读；
4. 定向重跑、carried-forward、关系失败保护和原子发布测试通过；
5. 完整版本在线抓取及离线 verify 通过；
6. 在测试副本中确认 Monster 引用和共享配置篡改能够被发现；
7. `@randomplay/data` 的 raw cache、包边界和空公共 API 保持不变。
