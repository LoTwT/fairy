# 静态构筑解析系统路线图

本文档记录 `Static Build Resolver` 的执行路线，用于约束后续迭代顺序，避免范围继续漂移。

本文件关注：

- 当前状态
- 下一阶段要做什么
- 每阶段明确不做什么
- 进入下一阶段前需要满足什么

本文件不重复定义公式、类型签名或完整 contract；这些内容以：

- [静态构筑解析系统](./static-build-resolver.md)
- [静态构筑解析系统 V1](./static-build-resolver-v1.md)
- [静态构筑解析系统 V2](./static-build-resolver-v2.md)

为准。

## 1. 当前状态

当前工作树对应的 resolver 状态如下：

- 已支持全部强攻 / 命破代理人
- 已支持全部强攻 / 命破音擎，并按 specialty 做兼容校验
- 驱动盘仍限定为当前 `6` 套 curated 列表
- 已支持：
  - 单场景静态构筑解析 `resolveStaticBuildDamage`
  - 全技能 / 全段矩阵 `resolveStaticBuildSkillMatrix`
- 已支持 profile：
  - `standard-normal`
  - `standard-sheer`
  - `yixuan-sheer`
- 技能矩阵当前为双轨：
  - 高频代理人：curated 模板
  - 其余强攻 / 命破代理人：通用矩阵生成

当前最大短板不是“能不能算”，而是“算得是否足够完整”：

- catalog 已经放开
- matrix 已经能生成
- 但很多代理人 / 音擎 / 驱动盘尚未收录 curated effect definitions
- 结果会通过 `assumptions` 明示缺失项

因此下一阶段重点不是继续扩 catalog，而是补齐 curated coverage。

当前进度：

- 已开始 `V2.1`
- 第一批 curated coverage：`猫又 / 钢铁肉垫`、`零号·安比 / 牺牲洁纯`
- support catalog 解耦已完成
- 下一步继续后续 curated coverage 批次

## 2. 阶段划分

后续固定按以下顺序推进：

1. `V2.1 curated coverage`
2. `V2.2 matrix metadata refinement`
3. `V3 anomaly / disorder`

除非用户显式改变优先级，否则不要跳过 `V2.1` 直接做 `V3`。

## 3. V2.1：Curated Coverage

### 3.1 目标

目标是减少当前结果中的这类提示：

- 未收录 curated 代理人效果
- 未收录 curated 音擎效果
- 未收录 curated 驱动盘效果

也就是把“可运行”推进到“可稳定复用”。

### 3.2 范围

这一阶段只做：

- 把音擎支持范围从“专属音擎集合”解耦为“按特性兼容的音擎集合”
- 补 curated `agent effects`
- 补 curated `w-engine effects`
- 视需要补 curated `drive-disc effects`
- 补对应测试与示例

这一阶段不改：

- build 输入输出 contract
- profile 体系
- damage type 范围
- raw / cleaned 数据结构

### 3.3 优先级

优先顺序固定如下：

1. support catalog 解耦（已完成）
2. 再按“已支持但当前 assumptions 价值最高”的代理人推进 curated coverage

#### 3.3.1 support catalog 解耦

本轮已完成以下改造：

1. `supportedStaticBuildWEngines` 不再从代理人 `exclusiveWeapon` 派生
2. 改为从公开 `w-engines.json` 独立构建，并按特性筛选
3. `agent` 与 `w-engine` 的兼容关系改为“specialty 兼容”，而不是“是否为专属音擎”
4. 高层 tool 文案、supported scope 返回值、README 示例同步更新
5. 不在这一轮顺带扩更多 effect definition

后续继续下面的 curated coverage 队列。

#### 3.3.2 curated coverage 队列

优先顺序按“已支持但当前 assumptions 价值最高”的代理人推进：

1. 零号·安比
2. 猫又
3. 雨果
4. 奥菲丝&「鬼火」
5. 般岳
6. 真斗
7. 伊德海莉
8. 叶瞬光
9. 希希芙
10. 「席德」

当前批次完成情况：

- 已完成：`零号·安比`、`猫又`
- 待继续：`雨果`、`奥菲丝&「鬼火」`、`般岳`、`真斗`、`伊德海莉`、`叶瞬光`、`希希芙`、`「席德」`

对应音擎同步补：

- `牺牲洁纯`
- `钢铁肉垫`
- `千面日陨`
- `嚣枪喧焰`
- `怒目金刚`
- `燔火胧夜`
- `海妖摇篮`
- `云霓孤光`
- `鳞齿寻踪`
- `机巧心种`

### 3.4 验收标准

进入下一阶段前，至少满足：

1. 音擎支持范围已完成 specialty 级解耦，不再以“专属音擎集合”为支持边界
2. 上述优先名单中的代理人都有 curated agent effects
3. 对应专属音擎都有 curated effect definitions
4. 高频使用场景下，`assumptions` 不再主要由“缺少 curated effect definitions”占据
5. 新增定义均有测试覆盖

## 4. V2.2：Matrix Metadata Refinement

### 4.1 目标

当前矩阵已经有：

- `actionName`
- `skillName`
- `qualifiers`
- `entryType`
- `segmentLabel`
- `segmentIndex`
- `targetSize`

但对 UI 和自动化分析仍然不够细。

这一阶段的目标是让上层尽量不再依赖 `label` 文本解析。

### 4.2 范围

计划补充：

- 更稳定的技能分类
- 更明确的命中语义
- 是否总伤 / 单段 / 追加段
- 更清晰的属性覆盖标识

### 4.3 验收标准

进入 `V3` 前，至少满足：

1. UI 展示不需要再从 `label` 反向猜技能结构
2. Agent 生成表格时优先消费 metadata，而不是自由解释中文技能名
3. 新元数据不破坏现有 matrix row contract

## 5. V3：Anomaly / Disorder

### 5.1 目标

把 `anomaly / disorder` 接入同一套 static build resolver，而不是长期停留在：

- `normal`
- `sheer`

### 5.2 风险

这是当前真正的“大阶段”，因为它会同时改：

- effect schema
- scenario 输入
- profile / pipeline
- resolved bucket 语义
- trace 输出
- matrix 展示语义

因此它必须晚于 `V2.1` 和 `V2.2`。

### 5.3 进入条件

只有满足以下条件才进入 `V3`：

1. 强攻 / 命破主线已经稳定
2. curated coverage 已达到可用水平
3. matrix metadata 足够稳定
4. 已冻结 anomaly / disorder 的输入输出 contract

## 6. 明确不做

在进入 `V3` 前，不做以下事项：

- 不扩到全部 specialty
- 不改 raw 数据结构
- 不生成第二份 cleaned 发布 JSON
- 不做全量自动文本 effect 抽取
- 不做动态战斗模拟

## 7. 执行约定

后续每轮 resolver 相关改动都要先判断属于哪个阶段：

- `V2.1`
- `V2.2`
- `V3`

并同步更新：

- 本路线图
- 对应规格文档
- `docs/index.md`

如果某轮改动跨了多个阶段，先拆阶段再实现，不要直接混做。
