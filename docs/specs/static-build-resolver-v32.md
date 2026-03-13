# 静态构筑解析系统 V32

`V26` 已经把 `ResolveStaticBuildSourceEntriesResult.summary` 固定为稳定 public contract。

当前高层 tool 里还保留着最后一处 summary aliasing：

1. `zzz-data` 底层返回：
   - `sourceDamageViewCount`
   - `sourceUtilityViewCount`
2. `zzz-agent` 的 `resolve-build-source-entries` 仍会改写成：
   - `sourceDamageCount`
   - `sourceUtilityCount`

这会让高层消费结果与底层 contract 再次分叉。

因此，`V32` 只解决一件事：

- 让 `resolve-build-source-entries` 直接透传底层 `collection.summary`

## 1. 目标

新增 / 收口：

1. 去掉 `resolve-build-source-entries` 对 `collection.summary` 的高层别名改写
2. 固定高层 tool 与底层 `ResolveStaticBuildSourceEntriesResult.summary` 使用同一组 key
3. 让 Agent / 测试 / 文档都直接消费底层 summary key

## 2. V32 范围

1. `V32.1` scope freeze
2. `V32.2` source-entry summary alignment
3. `V32.3` docs closeout

## 3. 设计边界

本阶段只做：

1. 调整高层 tool summary 透传方式
2. 更新测试与文档中的 summary key

显式不做：

1. 不新增新的 summary key
2. 不调整 `zzz-data` source-entry collection contract
3. 不调整 source-entry row / metadata contract
4. 不新增新的 source-entry coverage

## 4. contract 方向

`ResolveStaticBuildSourceEntriesResult.summary`

- 继续保持：
  - `entryCount`
  - `sourceDamageViewCount`
  - `sourceUtilityViewCount`
  - `supportedCount`
  - `unsupportedCount`
  - `isUtilityOnly`
  - `groups`

`resolve-build-source-entries`

- 改为直接透传底层 `collection.summary`
- 不再改写：
  - `sourceDamageCount`
  - `sourceUtilityCount`

## 5. 验收标准

1. 高层 tool 不再改写 `collection.summary`
2. `zzz-agent` 测试直接断言底层 summary key
3. README / specs / 架构文档统一以 `sourceDamageViewCount / sourceUtilityViewCount` 为准

## 6. 当前状态

- `V32.1` 已完成：冻结到 source-entry summary alignment
- `V32.2` 已完成：高层 tool 已直接透传 `collection.summary`
- `V32.3` 已完成：README / 总规格 / 索引 / 架构入口已同步收口
