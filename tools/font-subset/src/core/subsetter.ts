import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { Logger } from "@toolkit/shared";
import subsetFont from "subset-font";
import { CharsetWriter } from "../writers/charset-writer";

/** 本工具支持的输出格式（对外 CLI 取值）。 */
export type SubsetFormat = "ttf" | "woff" | "woff2";

/** 输出格式到 `subset-font` 目标格式的映射。 */
const TARGET_FORMATS: Readonly<Record<SubsetFormat, "sfnt" | "woff" | "woff2">> = {
  ttf: "sfnt",
  woff: "woff",
  woff2: "woff2",
};

export interface SubsetterOptions {
  /** 待处理的字体文件绝对路径列表（已由 FontLocator 展开目录） */
  fontPaths: readonly string[];
  /** 已合并去重的字符集，非空且按码点组织 */
  charset: string;
  /** 输出目录绝对路径 */
  outputDir: string;
  /** 需要产出的目标格式，按数组顺序串行处理 */
  formats: readonly SubsetFormat[];
}

export interface SubsetResult {
  /** 计划任务总数 = 字体数 × 格式数 */
  total: number;
  succeeded: number;
  failed: number;
}

export class Subsetter {
  private readonly logger = new Logger("Subsetter");
  private readonly fontPaths: readonly string[];
  private readonly charset: string;
  private readonly outputDir: string;
  private readonly formats: readonly SubsetFormat[];
  private readonly charsetWriter = new CharsetWriter();

  constructor(options: SubsetterOptions) {
    this.fontPaths = options.fontPaths;
    this.charset = options.charset;
    this.outputDir = options.outputDir;
    this.formats = options.formats;
  }

  /**
   * 串行执行全部子集化任务并写出字符集清单。
   *
   * 单个字体/格式失败只记录日志并计入失败数，不会中断其余任务；
   * 并发交由 `subset-font` 内部的 WASM 实例池控制，此处不叠加并发。
   */
  public async pack(): Promise<SubsetResult> {
    mkdirSync(this.outputDir, { recursive: true });

    const result: SubsetResult = { total: 0, succeeded: 0, failed: 0 };

    for (const fontPath of this.fontPaths) {
      for (const format of this.formats) {
        result.total += 1;

        if (await this.subsetOne(fontPath, format)) {
          result.succeeded += 1;
        } else {
          result.failed += 1;
        }
      }
    }

    const manifest = this.charsetWriter.write(this.outputDir, this.charset);
    this.logger.info(
      `Charset manifest: ${manifest.count} character(s) -> ${manifest.textPath}, ${manifest.jsonPath}`,
    );

    return result;
  }

  private async subsetOne(fontPath: string, format: SubsetFormat): Promise<boolean> {
    const outputPath = this.resolveOutputPath(fontPath, format);

    try {
      const source = readFileSync(fontPath);
      const subset = await subsetFont(source, this.charset, {
        targetFormat: TARGET_FORMATS[format],
      });

      writeFileSync(outputPath, subset);
      this.logger.success(
        `${fontPath} -> ${outputPath} (${formatSize(source.length)} -> ${formatSize(subset.length)})`,
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to subset ${fontPath} to ${format}: ${message}`);
      return false;
    }
  }

  /**
   * 输出文件名与输入同名，仅替换扩展名：CFF 轮廓的 `.otf` 子集化后仍是
   * OpenType/CFF，保持 `.otf` 扩展名以免下游工具误判。
   */
  private resolveOutputPath(fontPath: string, format: SubsetFormat): string {
    if (format !== "ttf") {
      return join(this.outputDir, `${basename(fontPath, extname(fontPath))}.${format}`);
    }

    const extension = extname(fontPath).toLowerCase() === ".otf" ? ".otf" : ".ttf";
    return join(this.outputDir, `${basename(fontPath, extname(fontPath))}${extension}`);
  }
}

/** 将字节数格式化为便于阅读的字符串。 */
function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
