# Spec 0002 — Project initialization

## Scope

这份 spec 定义 Fairy 项目根目录初始化：Node version baseline、pnpm workspace root，以及任何 package code 出现前所需的最小 repository-quality tooling。

它记录 package code 落地前已经存在的 root configuration。后续 package 或 product PR 通过各自的 spec 扩展这个 baseline。

它也**不**定义 packages、damage formula、项目 `tsconfig` setup、data ingestion、CLI behavior、runtime schemas、tests、bundling、release workflow 或 deploy surface。这些内容会在真正有代码需要它们时，通过后续 specs 和 PR 进入。

## Rationale

Project initialization 只包含干净开局所需的 root tooling。把它写进文档能让 setup 可 review，并避免 tooling defaults 变成隐藏决策。

把 initialization 与 packages、damage model 分开，可以让 reviewable concerns 保持小而清晰：root package-manager setup 是一个 concern，package boundaries 是另一个 concern，formula correctness 则是之后的 product/model concern。

Package implementation 不进入这份 spec。需要某个 package 时，在需要它的 PR 中创建，使用 `@randomplay` scope，并遵守
[0001-clean-slate.md](0001-clean-slate.md) 的 monotonic version rule：未来 publish 的版本必须严格大于 `0.1.4`。

## Contract

初始化后的 repository root 只包含 root-level configuration。

- repository root package 是 private。
- repository root package 使用 ESM（`type: "module"`）。
- repository root package 记录当前 reset 前的 package version（`0.1.4`），直到未来 release spec 提升它。
- repository 是 pnpm workspace，使用 `packages/*`。
- Node baseline 是 Node 24。本地 version file 将 major line 固定为 `24`。
- root package 声明 `engines.node` 为 `>=24`。
- root package 声明 `packageManager` 为当前 baseline 选定的裸 Corepack pnpm version：更新 pnpm 时运行 `corepack use pnpm@latest`，记录解析出的 `pnpm@<version>`，并省略 Corepack 的 integrity suffix。
- root quality-tooling surface 基于 OXC：
  - `oxlint` 用于 linting。
  - `oxfmt` 用于 formatting。
  - `lint-staged` 加 `simple-git-hooks` 用于 pre-commit staged-file lint 和 format checks。
- root package 暂不定义 build/test scripts；目前没有可 build 或 test 的 package code。
- initialization PR 不创建 package directories。
- 未来 package PR 使用 `@randomplay` scope。
- 未来 package PR 保持这些 dependency directions：
  - `@randomplay/core` 是 pure calculation code，不依赖 data 或 CLI packages。
  - `@randomplay/data` 独立拥有 data，不依赖 core 或 CLI packages。
  - `@randomplay/cli` 可以依赖 core 和 data packages。
- publish、release workflow、npm token 或 registry action 都不属于 initialization。

## Implementation Notes

当前 root file shape：

```text
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
.node-version
oxlint.config.ts
oxfmt.config.ts
.gitignore
```

`pnpm-workspace.yaml` 在 folder 存在前就声明 `packages/*`，因此下一个 package PR 可以直接新增 `packages/<name>`，不需要重塑 workspace config。

它也记录了 pnpm 对 `simple-git-hooks` 的 build-script approval，因此 frozen installs 在安装 pre-commit hook package 前不需要交互式 approval step。

项目为 OXC tools 使用 TypeScript config files（`oxlint.config.ts` 和 `oxfmt.config.ts`），因为 Node-based `oxlint` 与 `oxfmt` packages 支持它们，且 Node 24 可以执行它们。root setup 不能为了读取这些 tool configs 而新增单独的 TS loader、build step 或项目 `tsconfig`。

formatter config 在 Oxfmt 支持等价选项的地方镜像 `@lotwt/prettier-config` 的核心 formatting policy：two-space indentation、no tabs、print width 80、double quotes、trailing commas、no semicolons、LF line endings、preserved prose wrapping、bracket spacing，以及 consistent quoted object properties。Prettier plugins 和 Prettier-specific overrides 不属于本次 initialization。

`.gitignore` 至少覆盖 `node_modules/`、`dist/`、`coverage/`、`.DS_Store` 和 `*.log`。

Root scripts：

- `lint` — 运行 `oxlint`。
- `lint:fix` — 运行 `oxlint --fix`。
- `format` — 运行 `oxfmt`。
- `format:check` — 运行 `oxfmt --check`。
- `check` — 运行 lint 和 format-check。
- `prepare` — 安装 `simple-git-hooks`。

除非单独 review，否则不计划加入：

- `commitlint` 或 commit-message hook。
- `.editorconfig`.
- 带 `engine-strict` 的 `.npmrc`。

## Acceptance

当前 root setup：

- 已为当前 baseline 运行 `corepack use pnpm@latest`，因此 `packageManager` 将所选 pnpm release 记录为裸 `pnpm@<version>` 值。
- 在 Node 24 下，从 clean checkout 运行 `pnpm install --frozen-lockfile` 成功。
- `pnpm lint` 成功。
- `pnpm format:check` 成功。
- `pnpm check` 成功。
- `oxlint.config.ts` 和 `oxfmt.config.ts` 可被 Node 24 下的实际命令读取，不需要额外 TS loader、build step 或项目 `tsconfig`。
- `simple-git-hooks` 和 `lint-staged` 已配置为 pre-commit staged-file lint 和 format checks。
- `git diff --check origin/main...HEAD` 成功。
- Markdown links 可解析。
- root package 是 `private: true`。
- root setup 只包含 AGENTS coordination rules、root workspace initialization，以及本 spec/docs；它不新增 packages、damage-formula implementation、项目 `tsconfig`、data ingestion、runtime schemas、tests、bundling、release workflows 或 deploy config。
