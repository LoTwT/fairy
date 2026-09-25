# @randomplay/shared

Fairy 的私有 workspace 包，不发布到 npm。维护 core 与 data 共用的规则定义、属性/动作结构、单位和版本契约。

内部 `0.0.0` 仅供 pnpm 解析 workspace 开发依赖，不是公开发布版本。

公开包将需要的常量与声明内联到各自制品。shared 不依赖 core 或 data，不存放引擎状态、来源资料或数据集清单。
边界与发布要求见 [包规范](../../docs/specs/packages.md)。
