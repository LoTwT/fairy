# 静态构筑解析系统 V15

## 1. 背景

`V11` 已把来源说明提升成结构化 `sourceNotes`，`V12` 已把 generic assumptions / coverage gaps / unsupported effects 提升成结构化 `diagnostics`。

但当前仍有一个明显缺口：

1. `sourceNotes` 已有 `owner` / `status` / `keys`
2. 但“下一步应该怎么做”仍主要落在 `message` 文案里
3. 上层和 Agent 仍需要解析中文句子，才能判断：
   - 应补 `finalPanel`
   - 应补 `dynamicSnapshot`
   - 应补 `stateSnapshot`
   - 应补 `resolvedSnapshot`
   - 还是应继续保持 `research-only / process-only`

因此，`V15` 的目标不是再扩公式，而是把 `sourceNotes` 的解决路径提升成机器可消费的结构化 guidance。

## 2. 目标

`V15` 只做一件事：

1. 为 `sourceNotes` 增加结构化 resolution guidance

目标：

1. 让 Agent / UI 不再依赖 note 文案猜“下一步该补什么”
2. 保持现有 `message`、`owner`、`status`、`keys` 全部向后兼容
3. 不新增新的主计算 contract

## 3. 不做什么

`V15` 明确不做：

1. 不改 `resolveStaticBuildDamage` 主公式
2. 不改 anomaly / disorder matrix 范围
3. 不删除现有 `message`
4. 不为少量个例新增一堆特例 enum

## 4. 范围

`V15` 分四步推进：

1. `V15.1` scope freeze
2. `V15.2` guidance taxonomy
3. `V15.3` source note adoption
4. `V15.4` closeout

## 5. 设计方向

`sourceNotes` 后续需要显式表达：

1. 这条 note 当前的解决路径是什么
2. 它建议调用方补哪一类输入
3. 它是否仍应停留在 `research-only / process-only`

第一版只考虑稳定、通用的 guidance，不引入过细的来源私有枚举。

## 6. 验收标准

`V15` 完成后，至少满足：

1. `sourceNotes` 可直接告诉上层“下一步该补什么”
2. Agent prompt 可优先消费结构化 guidance，而不是继续拆 `message`
3. 现有调用方仍可继续只读 `message`
4. 不新增新的计算输入 key

## 7. 当前状态

- `V15.1` 已完成：scope freeze
- `V15.2` 已完成：guidance taxonomy 已冻结
- `V15.3` 已完成：Agent / README 已优先消费 `sourceNotes.guidance`
- `V15.4` 已完成：当前 contract 下已收口，无需新增计算输入 key
