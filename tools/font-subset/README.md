# FontSubset（`@toolkit/font-subset`）

ToolKit 工作区中的字体精简（子集化）工具，Node.js + TypeScript 实现。读取指定的文字集，从输入字体中只保留文字集所需的字形，输出体积大幅缩减的字体文件，适用于游戏包体瘦身、Web 字体按需裁剪等场景。

本工具依赖工作区共享包 `@toolkit/shared`（日志、参数解析、文件扫描）与第三方子集化库 `subset-font`。初次使用请先阅读工作区根目录的 [README](../../README.md)。

## 一、核心能力

- 输入字体：支持 `TTF` / `OTF`；可指定单个字体文件，也可指定目录（递归收集目录下所有 `.ttf` / `.otf`）
- 文字集来源：读取一个或多个 `txt` 文本文件中的全部字符，多个文件内容合并后按码点去重
- 子集化输出：输出格式可选 `ttf`、`woff`、`woff2`，可一次产出多种格式
- 字符集清单：随产物输出 `charset.txt` 与 `charset.json`，便于核对与版本管理
- 批量处理：单个字体/格式失败只记录日志并计入失败数，不中断其余任务，最终以退出码反映整体结果

子集化由 `subset-font`（HarfBuzz `hb-subset` 的 WebAssembly 构建，与 `pyftsubset` 同源）完成，字形闭包（GSUB）、`name` 表裁剪与 WOFF/WOFF2 封装均由该库处理。

## 二、项目结构

```text
tools/font-subset/
├── src/
│   ├── cli/                 # 本工具的命令行参数声明（解析器来自共享包）
│   ├── core/                # 子集化主流程
│   ├── readers/             # 字符集读取、字体文件定位
│   ├── writers/             # 字符集清单输出
│   ├── types/               # subset-font 的环境类型声明（该库未发布类型）
│   └── index.ts             # 程序入口
├── package.json
├── tsconfig.json
└── README.md
```

公共能力全部来自 `@toolkit/shared`：

| 能力 | 共享包位置 |
|---|---|
| 带模块前缀的日志器 | `packages/shared/src/logger/` |
| 命令行解析与帮助文本 | `packages/shared/src/cli/` |
| 递归文件扫描 | `packages/shared/src/utils/` |

本工具的第三方依赖 `subset-font` 声明在工具自己的 `dependencies` 中（工作区不做幽灵依赖提升）。

## 三、环境与安装

建议环境：

- Node.js 18+
- pnpm 10+

本工具是 pnpm 工作区成员，请**在工作区根目录**安装依赖：

```bash
pnpm install
```

## 四、构建与运行

```bash
# 方式一：在根目录构建全部工具
pnpm build

# 方式二：只构建本工具
pnpm --filter @toolkit/font-subset build
```

运行（开发/本地验证）：

```bash
# 在根目录
pnpm font-subset [options] [fontFile|fontDir]

# 或进入 tools/font-subset 目录
pnpm start -- [options] [fontFile|fontDir]
```

## 五、命令行参数

- `-f, --font <path>` 字体文件或目录，可逗号分隔多个；也可直接作为位置参数传入（如 `pnpm font-subset ./Fonts`）
- `-t, --text <files>` 字符集文本文件，可逗号分隔多个
- `-o, --output <dir>` 输出目录（默认：`<字体所在目录>/.subset`）
- `--formats <list>` 输出格式，逗号分隔，可选 `ttf`、`woff`、`woff2`（默认：`ttf`）
- `-h, --help` 显示帮助

示例：

```bash
# 精简单个字体，只产出 TTF（默认输出到 ./Fonts/.subset）
pnpm font-subset ./Fonts/MainFont.ttf -t ./Charset.txt

# 同时产出 TTF 与 WOFF2，并指定输出目录
pnpm font-subset ./Fonts -t ./Charset.txt --formats ttf,woff2 -o ./Output

# 合并多个文字集文件
pnpm font-subset ./Fonts -t ./Charset/UI.txt,./Charset/Story.txt --formats ttf,woff,woff2
```

## 六、产物说明

对每个输入字体，按 `--formats` 逐一产出同名文件（仅替换扩展名）：

| 格式 | `subset-font` 目标格式 | 输出扩展名 |
|---|---|---|
| `ttf` | `sfnt` | 源为 `.ttf` 输出 `.ttf`；源为 `.otf` 输出 `.otf`（CFF 轮廓子集化后仍是 OpenType/CFF） |
| `woff` | `woff` | `.woff` |
| `woff2` | `woff2` | `.woff2` |

字符集清单一轮运行只产出一份：

- `charset.txt`：去重后的字符单行文本，可直接作为下次运行的 `-t` 输入
- `charset.json`：`{ "count": number, "characters": string[] }`

字符集的处理规则：

- 按**码点**收集（`for...of` 迭代），BMP 外字符（emoji 等）不会被拆成孤立的代理项码元
- 多个文本文件的内容合并后去重，保持字符首次出现的顺序
- 剔除 C0/C1 控制字符（`U+0000–U+001F`、`U+007F–U+009F`，含换行与制表符）与 BOM
- 保留普通空格等可见字符

运行输出示例：

```text
[CharsetReader] Charset ready: 24 unique character(s)
[FontLocator] Scanned ./Fonts: found 2 font file(s)
[FontSubset] Fonts: 2, formats: ttf, woff2, output: ./Fonts/.subset
[Subsetter] ./Fonts/MainFont.ttf -> ./Fonts/.subset/MainFont.ttf (1012.3 KB -> 24.8 KB)
[Subsetter] ./Fonts/MainFont.ttf -> ./Fonts/.subset/MainFont.woff2 (1012.3 KB -> 13.1 KB)
[Subsetter] Charset manifest: 24 character(s) -> .../charset.txt, .../charset.json
[FontSubset] Done. 2/2 task(s) succeeded, 0 failed.
```

退出码：全部任务成功为 `0`；存在失败任务或输入参数有误为 `1`。

## 七、限制与注意事项

- **字符集清单记录的是「请求保留的字符集」**，不代表每个字体中确实存在对应字形。若文字集包含字体未覆盖的字符（例如给纯拉丁字体传入中文），该字符会被静默忽略，清单中依然会出现。需要精确核对时，请比对输出字体的实际显示效果。
- **OTF/CFF 支持以实测为准**：`subset-font` 官方文档只承诺「SFNT（TrueType/OpenType）」容器，未显式保证 CFF 轮廓。HarfBuzz 子集器本身支持 CFF，但本工具未对 `.otf` 做特殊分支，若失败会输出包含文件路径与库原始报错的可诊断信息。
- **默认输出目录跟随输入字体**：输入为字体文件时默认输出到 `<文件所在目录>/.subset`；若该目录不可写（如系统字体目录），请显式指定 `-o`。
- **输出目录内的字体会被自动跳过**：把输出目录建在字体目录之下（例如 `<字体目录>/.generated`）是安全的，重复运行不会把上次的裁剪产物再当成输入。但输出目录不能与输入目录本身相同——那会让所有字体都被跳过并报错（这也是刻意为之：原地覆盖会毁掉源字体）。
- **不做增量缓存**：每次运行都会重新处理全部字体并覆盖输出目录中的同名产物。
- **字符集清单会覆盖**：`charset.txt` / `charset.json` 按输出目录固定命名，向同一输出目录重复运行会覆盖上一轮的清单。
- **`-f` / `-t` 的多值写法**：共享包的参数解析器对同名参数只保留最后一次取值，因此多个字体或多个文本文件必须用**逗号分隔**在同一个参数值中传入，不能通过重复书写 `-t` 累积。
