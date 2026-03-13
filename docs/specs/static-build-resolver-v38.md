# 静态构筑解析系统 V38

`V37` 收口后，`source-damage-view` / `source-utility-view` 仍与 matrix / trigger / source-entry 存在一处不一致：

1. `zzz-data` 还没有可复用的 source-view compact helper exports
2. `resolve-build-source-damage-views` 仍默认返回完整 `build`
3. `resolve-build-source-utility-views` 虽然 payload 较小，但仍缺少与其他高层 tool 对齐的 compact 入口

因此，`V38` 只解决一件事：

- 把 source-damage-view / source-utility-view 收口为与 `V37` 对称的 compact helper exports，并让高层 tool 对齐这套 compact 输出

## 1. 目标

新增 / 收口：

1. 为 source-damage-view 提供 compact helper
2. 为 source-utility-view 提供 compact helper
3. 让 `resolve-build-source-damage-views` 支持 `includeDetails`
4. 让两个高层 source-view tool 直接消费底层 compact helper

## 2. V38 范围

1. `V38.1` scope freeze
2. `V38.2` source-view compact helper exports
3. `V38.3` high-level source-view tool alignment
4. `V38.4` docs closeout

## 3. 设计边界

本阶段只做：

1. 新增可复用 source-view compact helper
2. 为高层 source-damage-view tool 增加 `includeDetails`
3. 让两个高层 source-view tool 直接复用底层 helper
4. 更新测试与文档中的 compact export 说明

显式不做：

1. 不新增 source-view summary key
2. 不新增新的 source-view coverage
3. 不改变 source-view 的排序 / 分组 contract
4. 不把 source-view compact helper 做成 Agent 私有实现

## 4. contract 方向

`zzz-data`

- 新增：
  - `compactStaticBuildSourceDamageViewsResult()`
  - `compactStaticBuildSourceUtilityViewsResult()`

`zzz-agent`

- `resolve-build-source-damage-views`
  - 新增 `includeDetails`
  - 默认返回 compact entries，不再默认携带完整 `build`
- `resolve-build-source-utility-views`
  - 直接使用底层 compact helper

## 5. 验收标准

1. `zzz-data` 提供 source-view compact helper exports
2. `resolve-build-source-damage-views` 默认不再返回完整 `build`
3. `includeDetails = true` 时仍可返回 source-damage-view 的完整 `build`
4. `resolve-build-source-utility-views` 与 `V37` 后的高层 compact 约定一致
5. README / 总规格 / 索引 / 架构入口同步记录 `V38` 已收口

## 6. 当前状态

- `V38.1` 已完成：冻结到 source-view compact helper exports
- `V38.2` 已完成：`zzz-data` 已新增 source-view compact helper exports
- `V38.3` 已完成：高层 source-view tool 已对齐 compact helper
- `V38.4` 已完成：README / 总规格 / 索引 / 架构入口同步收口
