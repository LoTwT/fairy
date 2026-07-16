# Fairy Agent 工作规则

## 渐进式披露

- 本文件只保存全仓通用且长期有效的工作规则，不维护文档目录。
- [docs/index.md](docs/index.md) 是唯一的文档入口与路由来源；从索引按需读取与当前任务有关的文档。
- 每个 concern 只保留一个 canonical source。入口只链接，不复制正文；细节进入独立文档。
- 只有出现真实内容时才新增文档或目录，不预建空结构，也不把 task、owner 或临时状态写进文档。

## 变更与评审

- 每个 PR 只处理一个 concern，并保持 diff 可审查。
- 合并前需要 human 明确评审与批准；PR 描述必须说明精确 scope、验证结果和未改范围。
- 已发布的 `@randomplay/core`、`@randomplay/data`、`@randomplay/cli` 版本不可删除、覆盖或重新发布。

## 验证

提交评审前至少运行：

- `pnpm check`
- `git diff --check`
- surviving Markdown relative-link check

dependency 或 package-manager 变更还必须运行 `pnpm install --frozen-lockfile`，并在 lockfile 更新后重新运行上述 gates。
