# 静态构筑解析系统 V203

## 1. 背景

`V202` 收口后，`build` 层公开 catalog contract 中仍通过字段来源间接表达 `specialty` 语义：

1. `StaticBuildBaseAgentCatalogEntry.specialty`
2. `StaticBuildWEngineCatalogEntry.specialty`
3. `getCompatibleStaticBuildWEngines(specialty)`
4. `getCompatibleStaticBuildUtilityWEngines(specialty)`

`V203` 只解决这一件事。

## 2. 目标

为 `build` 层补显式 `StaticBuildSpecialty`，并让 catalog 公开 helper 统一使用这个类型。

## 3. 非目标

1. 不改变 `specialty` 的值域
2. 不改变 catalog 构建逻辑
3. 不改变兼容校验行为
4. 不改变 compact contract

## 4. 结果

完成后：

1. `build` 层对 `specialty` 的公开表达不再依赖其他字段来源或 indexed access
2. catalog entry 与兼容 helper 的 `specialty` 都统一为显式 `StaticBuildSpecialty`
3. runtime 输出字段与数值保持不变，只收紧 public contract
