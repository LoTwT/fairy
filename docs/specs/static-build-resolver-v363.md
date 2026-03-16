# 静态构筑解析系统 V363：resolver progress docs de-hardcoding

## 背景

在 [docs/index.md](/Users/caoyujie/codes/zzz-data/docs/index.md) 和 [docs/architecture.md](/Users/caoyujie/codes/zzz-data/docs/architecture.md) 里，`static-build-resolver` 的状态概述仍硬编码停留在 `V333`。

这类文案每推进一批阶段就会再次过期。

## 目标

`V363` 只解决一件事：

- 把顶层文档里的 resolver 进度说明改成不依赖硬编码阶段号的描述，并明确以 roadmap 为准。

## 范围

1. `docs/index.md`
2. `docs/architecture.md`
3. `docs/specs/static-build-resolver-roadmap.md`
4. `docs/specs/static-build-resolver.md`

## 非目标

1. 不改任何运行时代码
2. 不删现有阶段文档
3. 不改 roadmap 的阶段内容

## 完成标准

1. 顶层概述不再硬编码旧阶段号
2. 文档明确当前状态应以 roadmap 为准
3. 文档校验通过
