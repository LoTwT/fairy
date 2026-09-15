# Fairy

## 生成 integrated 数据

在仓库根目录显式指定 raw 根目录、来源版本和目标目录：

```bash
pnpm --filter @randomplay/data generate:integrated raw/nanoka 3.1 integrated
```

首次生成、新克隆合法数据的本机初始化和后续增量更新共用此入口，目前只处理代理人。
参数、验证与恢复用法见 [data README](packages/data/README.md#生成-integrated)；项目文档从 [docs/index.md](docs/index.md) 进入。
