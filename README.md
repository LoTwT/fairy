# Fairy

《绝区零》的确定性计算与版本化数据包。`@randomplay/data` 提供资料和动作解析，
`@randomplay/core` 负责公式、效果求值和静态动作伤害计算。

## 开始使用

两个包使用同一版本。Node 要求 `>=24.11.0`，使用 ESM；浏览器已验收 Vite 开发与生产构建。
安装方式、旧版升级和发布流程见[包边界与联动发布](docs/specs/packages.md)。
使用已发布且支持当前 API 的同版 core/data；需要验证尚未发布的源码改动时，按发布规范安装本地打包的两个 tarball。

从[完整静态计算示例](docs/specs/core/static-calculation.md#完整计算示例)开始，依次加载资料、解析动作、
提供配装或局外面板、选择有效 buff，再计算伤害。支持范围和结果限制在同页说明。
底层公式见 [core README](packages/core/README.md)，资料读取见 [data README](packages/data/README.md)，
全部文档以 [docs/index.md](docs/index.md) 为入口。

## 生成 integrated 数据

维护来源数据时，在仓库根目录显式指定 raw 根目录、来源版本和目标目录；npm 消费者无需执行生成：

```bash
pnpm --filter @randomplay/data generate:integrated raw/nanoka 3.1 integrated
```

首次生成、新克隆合法数据的本机初始化和后续增量更新共用此入口，覆盖已登记的八类资料。
参数、类别、验证与恢复用法见 [data README](packages/data/README.md#生成-integrated)。
