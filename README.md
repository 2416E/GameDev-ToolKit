# ToolKit

游戏开发工具集（pnpm workspaces 多工具工作区）。所有工具共享同一套依赖与公共能力，按需独立构建、独立运行。

## 一、目录结构

```text
ToolKit/
├── pnpm-workspace.yaml        # 工作区声明（packages/* 与 tools/*）
├── package.json               # 根包：共享工具链依赖（typescript、@types/node）与统一脚本
├── tsconfig.base.json         # 公共 TypeScript 编译配置，各子包 extends 它
├── .gitignore
├── packages/                  # 公共层：与具体工具无关的可复用能力
│   └── shared/                # @toolkit/shared
│       └── src/
│           ├── types/         # 表/字段类型与协议数据模型（唯一事实来源）
│           ├── binary/        # MAGIC / VERSION 常量与二进制缓冲写入器
│           ├── utils/         # MD5 哈希、递归文件扫描（支持一次扫描匹配多个扩展名）
│           ├── logger/        # 带 [模块名] 前缀的统一日志器
│           ├── cli/           # 规格驱动的命令行解析（支持可重复参数）与帮助文本生成
│           └── cache/         # 基于文件哈希的通用增量缓存 FileCacheStore<T>
└── tools/                     # 工具层：各工具的业务实现
    ├── config-export/         # @toolkit/config-export：Excel 配置导出工具
    └── font-subset/           # @toolkit/font-subset：字体精简（子集化）工具
```

依赖方向是单向的：`tools/* → packages/shared`，共享包不感知任何工具。

## 二、环境要求

- Node.js 18+
- pnpm 10+

## 三、安装

首次使用先克隆仓库（需已配置 GitHub SSH 密钥；也可改用网页上的 HTTPS 地址）：

```bash
git clone git@github.com:2416E/GameDev-ToolKit.git
cd GameDev-ToolKit
```

随后在**工作区根目录**安装依赖：

```bash
pnpm install
```

一次安装即可覆盖全部包：公共工具链（`typescript`、`@types/node`）装在根目录并被各子包复用，工具专属依赖（如 `xlsx`）只装在对应工具内。

## 四、常用命令

在根目录执行：

```bash
# 按依赖拓扑构建全部包（先 shared，再各工具）
pnpm build

# 监听模式并行编译
pnpm dev

# 类型检查（不产出文件）
pnpm typecheck

# 运行 config-export 工具（参数直接跟在脚本名之后）
pnpm config-export -i ./ConfigTables -o ./Output --json

# 运行 font-subset 工具：按字符集精简字体文件或字体目录
pnpm font-subset ./Fonts -t ./Charset.txt --formats ttf,woff2
```

只操作某个包：

```bash
pnpm --filter @toolkit/shared build
pnpm --filter @toolkit/config-export start -- ./ConfigTables
```

## 五、工具清单

| 工具 | 包名 | 说明 |
|---|---|---|
| [config-export](tools/config-export/README.md) | `@toolkit/config-export` | 将 Excel 配置表导出为 `Config.bin`，可选导出 `Config.json` 与 `Config.d.ts` |
| [font-subset](tools/font-subset/README.md) | `@toolkit/font-subset` | 按文本字符集对 `TTF`/`OTF` 字体做子集化精简，输出 `ttf`/`woff`/`woff2` 并附带字符集清单 |

## 六、如何新增一个工具

1. 新建目录 `tools/<tool-name>/`，其中放置 `package.json`、`tsconfig.json` 与 `src/`。
2. `package.json` 至少声明：

   ```json
   {
     "name": "@toolkit/<tool-name>",
     "private": true,
     "main": "dist/index.js",
     "scripts": {
       "build": "tsc -p tsconfig.json",
       "dev": "tsc -w -p tsconfig.json",
       "typecheck": "tsc -p tsconfig.json --noEmit"
     },
     "dependencies": {
       "@toolkit/shared": "workspace:*"
     }
   }
   ```

   工具专属的第三方依赖声明在工具自己的 `dependencies` 中，**不要**依赖根目录的传递解析（pnpm 不做幽灵依赖提升）。

3. `tsconfig.json` 继承根配置：

   ```json
   {
     "extends": "../../tsconfig.base.json",
     "compilerOptions": {
       "rootDir": "src",
       "outDir": "dist",
       "types": ["node"]
     },
     "include": ["src/**/*.ts"],
     "exclude": ["node_modules", "dist"]
   }
   ```

4. 在业务代码中直接使用共享能力：

   ```ts
   import { Logger, parseOptions, formatUsage, FileCacheStore } from "@toolkit/shared";
   ```

5. 在根目录重新执行 `pnpm install`（让 pnpm 建立工作区链接），随后 `pnpm build` 即可。

## 七、共享协议与浏览器产物

`packages/shared/src/types/protocol.ts` 是表结构与字段类型的唯一事实来源，`packages/shared/src/binary/constants.ts` 是二进制魔数与版本号的唯一事实来源。

需要复制到游戏客户端独立使用的浏览器端解析产物（如 `tools/config-export/src/browser/config-reader-web.ts`）刻意保持**零导入、自包含**，因此会重复定义枚举与常量。修改协议时两处必须同步，详见对应工具文档。
