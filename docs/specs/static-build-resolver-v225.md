# 静态构筑解析系统 V225

## 背景

`V224` 收口后，`resolve-build-damage.ts` 仍保留一段本地 execution context 拼装：

1. `loadout` 解析
2. disorder-aware `scenario` 归一化

这两步已经在 `trigger-matrix`、`source-entry collection` 等主路径中统一下沉到 shared helper，`resolve-build-damage.ts` 仍是最后一个未对齐的 single-build 主入口。

## 目标

`V225` 只解决一件事：

1. 把 `resolve-build-damage.ts` 的 `loadout + resolved scenario` 拼装固定成 shared helper，不改变任何 tool 的输入输出 shape

## 分阶段

1. `V225.1` scope freeze
2. `V225.2` shared helper / runtime alignment
3. `V225.3` tests / prompt alignment
4. `V225.4` docs closeout

## 非目标

1. 不改变 `resolve-build-damage` 的输入 schema
2. 不改变成功返回中的 `build` shape
3. 不改变底层 `zzz-data` runtime

## 当前状态

- `V225.1` 已完成：冻结到 single-build execution context helper contracts
- `V225.2` 已完成：`resolve-build-damage.ts` 的 `loadout + resolved scenario` 已统一复用 shared helper
- `V225.3` 已完成：现有高层回归测试与 runtime 校验已覆盖
- `V225.4` 已完成：roadmap、索引与架构文档已同步
