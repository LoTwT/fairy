# 静态构筑解析系统 V336：catalog source item contracts

## 1. 目标

`V336` 只解决一件事：

- 把 `catalog.ts` 中读取上游 `agents.json / w-engines.json` 时仍直接使用的本地 source item interface 与裸 `string` 文本字段统一收成显式公开 contract。

## 2. 范围

1. `StaticBuildSourceSlug`
2. `StaticBuildSourceSpecialtyName`
3. `StaticBuildSourceSpecialtyRef`
4. `StaticBuildAgentListSourceItem`
5. `StaticBuildWEngineListSourceItem`
6. `catalog.ts` 对这些 source item 的读取和 helper 参数
7. `build/index.ts` 对应 type export

## 3. 非目标

1. 不改变 catalog 的支持范围
2. 不调整 alias 生成逻辑
3. 不修改 `agents.json / w-engines.json` 的数据 shape

## 4. 完成标准

1. `catalog.ts` 不再声明本地 source item interface
2. `compactNameAlias()` 与 `slugAliases()` 不再使用裸 `string` 参数
3. lint、test、agent build 全部通过
