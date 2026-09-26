# 包边界与联动发布

| 包                   | 发布                | 职责                                                   |
| -------------------- | ------------------- | ------------------------------------------------------ |
| `@randomplay/core`   | 是                  | 数值公式、效果校验与求值、静态面板组装和动作伤害计算   |
| `@randomplay/data`   | 是                  | 来源资料、标准化计算数据、动作解析、效果定义与按需读取 |
| `@randomplay/shared` | 否，`private: true` | 两个公开包共同使用的数据结构、单位、分类和版本契约     |

调用方使用 data 获取并解析数据，再将结果交给 core。两个公开包之间没有运行时依赖或互相调用。
effects 是 core 内部模块，原有算法、状态和静态目录入口从 core 导出；不再单独发布 effects，也不新增 calculator。
数据生成脚本可以调用 core 校验器，联合消费测试可以使用两个包，这不进入 data 的运行时代码。

共同契约由 [shared 源码](../../packages/shared/src/index.ts)维护；来源原始结构、清单和来源版本留在 data，
带身份品牌的准备结果、引擎状态、执行算法留在 core。百分比计算使用比例，例如 18% 为 `0.18`。
属性分类的子集仍保留业务含义，培养类别与伤害增益类别不合并。

shared 只作为开发依赖，构建时把用到的声明和常量内联进公开包；不允许产生对私有包的生产或 peer 依赖。
两个公开包须分别验证离线安装，并验证同版联合使用、严格 TypeScript 消费和浏览器消费。

## 版本与发布

core 和 data 的 npm 版本号始终一致。任一包需要发布时，两个包共同更新版本并同批发布，包括没有代码改动的包。
shared 的变更若影响公开制品，也通过这两个包的同批发布交付。

通常考虑 patch；较大的功能或不兼容更新再评估 minor 或 major。**每次发版前必须向用户询问并确认具体目标版本号，
再修改版本并执行获授权的发布。** 设计确认、代码修改或检查通过均不代表已经确定本次版本号。

发版前运行 `pnpm check` 和真实浏览器验收，检查两个 tarball 的版本与公共契约，并明确列出两个待发制品。
发布不是跨 npm 包的原子事务；仅一个包发布成功时必须报告未完成，补齐同版本的另一个包后才能报告整批成功。
不得按 Git 变更范围过滤掉本批未修改的包。

| 字段                             | 含义与校验                                                  |
| -------------------------------- | ----------------------------------------------------------- |
| npm `packageVersion`             | 代码与数据制品的联合发布号；静态组装要求与 core 一致        |
| `contractVersion`                | 共享结构、单位和输入语义；core 拒绝不支持的契约             |
| `gameVersion`                    | 目标游戏数据/规则版本；与来源仓库提交分别记录               |
| `snapshotId`                     | 已验证 integrated、属性、动作、效果和面板适配规则的内容摘要 |
| `schemaVersion`、`rulesVersion`  | 各资料格式和转换规则的既有版本，仍在原有生成/解析边界校验   |
| 来源提交、`ruleSetId`/`revision` | 来源证据、规则集身份与内容修订，不能用 npm 版本替代         |

`loadStaticCalculationData` 从同次冻结发布副本读取指定实体并附带版本信息。调用方整体传递和缓存返回值，
不要自行把不同副本的内部字段拼接起来；摘要用于来源识别，并非对调用方修改过的对象进行运行时内容认证。
底层数值公式仍接受显式数值，不强制依赖资料版本元数据。

## 安装与运行环境

当前公开包使用 ESM，Node 要求 `>=24.11.0`。浏览器支持已验收的 Vite 开发与生产消费，
data 自动选择 browser 条件入口；按需读取行为与 JSON 导入方式见[消费契约](data/consumption.md#分发与按需加载)。
应用无需抓取 raw、生成资料、配置 Node 内置模块 polyfill 或安装 shared。

选择已发布且支持当前 API 的同一版本，替换下面的版本占位值：

```sh
FAIRY_VERSION='<同一已发布版本>'
npm install --save-exact "@randomplay/core@$FAIRY_VERSION" "@randomplay/data@$FAIRY_VERSION"
```

保存精确版本并一起升级，可避免两个包独立更新后静态计算被版本校验拒绝。只使用 core 的底层公式、
效果引擎或 data 的资料读取时，可以单独安装对应包。完整计算见[运行示例](core/static-calculation.md#完整计算示例)。

仓库 manifest 的版本不代表 npm 已发布。`0.1.4` 属于重建前接口，不能用于本页的新静态计算示例。
在当前源码尚未发布时，按[发布操作](#发布操作)的打包步骤生成两个 tarball，在应用目录安装：

```sh
npm install --save-exact /absolute/path/randomplay-core-VERSION.tgz /absolute/path/randomplay-data-VERSION.tgz
```

替换为同次打包的实际绝对路径。这一步不发布 npm；运行时无需链接 Fairy 工作区。

## 从旧入口升级

当前接口重建了数据与计算边界。升级 `0.1.4` 的应用需按当前输入契约重新组装请求，
不保证旧快照、旧 cleaned 数据或旧结果对象直接兼容。

| 原消费方式                                                     | 当前接入方式                                                                                                                                                      |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| core 的 `calculate`、`parseBattleSnapshot` 及旧快照/结果模型   | 静态配装计算使用 `loadStaticCalculationData → resolveAgentAction → calculateStaticActionDamage`；显式数值计算使用对应公式。按新公开类型组装输入与读取结果         |
| data 的 `@randomplay/data/types`、`@randomplay/data/cleaned/*` | 类型从 data 根入口导入；资料使用按需读取 API，原样 JSON 使用显式 `integrated`/`definitions` 子路径。字段与身份按[消费契约](data/consumption.md)核对，不只替换路径 |
| 依赖 data 间接安装 core                                        | 联合计算时显式安装同版 core/data；data 不再有 core 运行时依赖                                                                                                     |
| 源码阶段的 `@randomplay/effects` 导入                          | 将函数和类型导入改为 `@randomplay/core`，例如 `parseEffectRuleSet`、`prepareEffects`、`calculateStaticDamageFromCatalog`；effects 已作为内部模块合入 core         |

应用从 core 或 data 的公开导出引用所需类型，不导入私有 shared，也不复制类型定义。
单位按各入口契约提供：标准化比例中 `18%` 写作 `0.18`，带单位的属性值使用对应 `Quantity`；
来源原始数字须先明确语义，不能直接当作计算输入。数据和动作的版本身份、角色身份、影画上下文一起保留。

## 发布操作

[发布工作流](../../.github/workflows/release.yml)在推送 `vX.Y.Z` 标签后，通过 GitHub Actions OIDC 发布两个包。
标签必须指向已进入 `main` 的提交，当前流程只处理稳定版本并使用 `latest`。
已有 tarball、检查通过或版本号相同均不代表获得发布授权。

1. 按前述规则确认具体目标版本和发布授权，再同步 core/data manifest；若调整仓库根版本或版本相关测试，保持其语义一致。
   `static-e2e.test.ts` 当前固定验收 `packageVersion`，改版时应同步检查；历史验收报告中的版本仍保留当时事实。
   用 `npm view @randomplay/core versions --json`、`npm view @randomplay/data versions --json` 核对目标版本是否已有制品。
2. 常规发版以两个包已有的成功 OIDC 发布记录、仓库内相关配置差异和已知的管理变更为依据，
   无需每次打开 npm 设置页或要求用户完成二次验证。首次接入、新增包、发布身份或权限变化，
   或发布出现认证、授权错误时，再核对受影响包的 Trusted Publisher：仓库为 `LoTwT/fairy`，
   工作流文件名为 `release.yml`，环境为 `npm-publish`，并允许直接 `npm publish`。
   工作流的 GitHub environment 须与 npm 配置一致，并遵守该环境的保护规则。工作流通过 `id-token: write` 获取 OIDC 身份，
   npm CLI 自动完成发布认证，无需本机 npm 登录或长期 npm token；`npm whoami` 不能判断 OIDC 是否可用。
   仅在确实需要访问或修改受保护的 npm 设置时，按页面要求完成二次验证。
   配置与认证机制见 [npm Trusted Publishing 文档](https://docs.npmjs.com/trusted-publishers/)。
3. 在仓库根目录对最终候选执行检查并串行打包，避免多个构建争用受管理数据锁：

   ```sh
   pnpm check
   pnpm --filter @randomplay/data verify:browser
   FAIRY_RELEASE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/fairy-release.XXXXXX")"
   pnpm --filter @randomplay/core pack --pack-destination "$FAIRY_RELEASE_DIR"
   pnpm --filter @randomplay/data pack --pack-destination "$FAIRY_RELEASE_DIR"
   ```

   首次浏览器验收的 Chromium 安装命令见[消费验收入口](data/consumption.md#验收入口)。受管理源的完整性、
   持锁读取和同步维护沿用[静态发布边界](data/consumption.md#静态发布与受管理目录边界)；失败时保留现场。
   普通打包不生成或改写 integrated，也不自动修复管理状态。

4. 明确列出 `randomplay-core-<版本>.tgz` 与 `randomplay-data-<版本>.tgz` 两个待发文件。
   用 `tar -tzf <文件>` 查看清单、`tar -xOf <文件> package/package.json` 核对名称与目标版本。
   公开运行时代码和声明不得引用私有 shared，不能携带 raw、控制目录或临时发布目录。
   既有打包验收覆盖独立安装、联合类型消费与文件边界；另在工作区外只安装这两个 tarball，
   运行[完整示例](core/static-calculation.md#完整计算示例)，核对参考值和两种面板输入的结果。
   发布前不再改动候选内容，改动后须重建并验证受影响制品。
5. 取得发布授权并将候选合入 `main` 后，为已验收的提交创建版本标签并推送到已核实的目标仓库。
   以下占位值必须替换为已确认版本及其提交；已有标签不得覆盖。

   ```sh
   FAIRY_VERSION='<已确认目标版本>'
   FAIRY_RELEASE_COMMIT='<已验收的 main 提交 SHA>'
   git tag "v$FAIRY_VERSION" "$FAIRY_RELEASE_COMMIT"
   git push origin "refs/tags/v$FAIRY_VERSION"
   ```

   工作流执行完整检查和浏览器验收，串行打包，在工作区外安装最终 tarball 并运行完整示例，再逐包发布。
   两个确切文件名及 SHA-512 摘要记录在该次运行的日志和摘要中，不按变更文件筛选包。
   已存在的同版制品只有摘要一致时才跳过；摘要冲突或 `latest` 比候选更新时停止，避免覆盖或回退。
   仅一个包成功时，先回查 registry 确认实际状态，再处理缺失制品；网络超时不等于发布失败，
   不能盲目重试、单独升版或将半批结果报告为完成。

6. 回查两个包的具体版本、dist-tag 和制品摘要，并与发布工作流记录的候选摘要核对：

   ```sh
   npm view "@randomplay/core@$FAIRY_VERSION" version dist-tags dist.integrity --json --registry=https://registry.npmjs.org
   npm view "@randomplay/data@$FAIRY_VERSION" version dist-tags dist.integrity --json --registry=https://registry.npmjs.org
   ```

   工作流还会在新的工作区外目录使用独立空缓存，从 registry 安装两个精确版本并运行完整示例，
   避免复用候选 tarball 缓存掩盖下载问题；发布者应回查该步骤的实际结果。
   两包都已可见、通道正确且实际安装消费通过后，才报告整批发布完成。
