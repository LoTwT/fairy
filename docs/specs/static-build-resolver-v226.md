# 静态构筑解析系统 V226

## 背景

`V225` 收口后，`resolve-build-skill-matrix.ts` 仍保留一段本地 execution context 拼装：

1. `loadout` 解析
2. `context.attribute` 的 shared normalization

这条路径虽然已经在早前复用了 context normalization，但仍没有和 `resolve-build-damage.ts`、`resolve-build-trigger-matrix.ts` 一样下沉成完整 execution context helper。

## 目标

`V226` 只解决一件事：

1. 把 `resolve-build-skill-matrix.ts` 的 `loadout + resolved context` 拼装固定成 shared helper，不改变任何 tool 的输入输出 shape

## 分阶段

1. `V226.1` scope freeze
2. `V226.2` shared helper / runtime alignment
3. `V226.3` tests / prompt alignment
4. `V226.4` docs closeout

## 非目标

1. 不改变 `resolve-build-skill-matrix` 的输入 schema
2. 不改变成功返回中的 `matrix` shape
3. 不改变底层 `zzz-data` runtime

## 当前状态

- `V226.1` 已完成：冻结到 skill-matrix execution context helper contracts
- `V226.2` 已完成：`resolve-build-skill-matrix.ts` 的 `loadout + resolved context` 已统一复用 shared helper
- `V226.3` 已完成：现有高层回归测试与 runtime 校验已覆盖
- `V226.4` 已完成：roadmap、索引与架构文档已同步
