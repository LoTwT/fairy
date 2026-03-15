# 静态构筑解析系统 V326：catalog source list contracts

`V326` 只解决一件事：

- 把 `catalog.ts` 中上游 source item 的 `attributes` 列表和 alias override map 统一收成显式公开 contract。

## 范围

1. `StaticBuildSourceAttributeText`
2. `StaticBuildSourceAttributeList`
3. `StaticBuildCatalogAliasOverrideMap`
4. `AgentListSourceItem.attributes`
5. `agentAliasOverrides`
6. `wEngineAliasOverrides`
7. `build/index.ts` 对应 type export

## 非目标

1. 不修改任何 catalog 运行时筛选逻辑
2. 不处理 `Set<string>` 形式的内部索引结构
3. 不调整 alias 内容
