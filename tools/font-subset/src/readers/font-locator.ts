import { existsSync, statSync } from "node:fs";
import { extname, isAbsolute, relative, resolve } from "node:path";
import { findFilesByExtensions, Logger } from "@toolkit/shared";

/** 本工具可处理的字体扩展名，同时用于校验显式传入的字体文件。 */
const FONT_EXTENSIONS: readonly string[] = [".ttf", ".otf"];

export interface FontLocatorOptions {
  /** 产物输出目录。位于该目录内的字体会被跳过 */
  outputDir: string;
}

export class FontLocator {
  private readonly logger = new Logger("FontLocator");
  private readonly outputDir: string;

  constructor(options: FontLocatorOptions) {
    this.outputDir = options.outputDir;
  }

  /**
   * 将传入的字体文件/目录展开为待处理的字体文件列表。
   *
   * 目录会递归查找全部 `.ttf` / `.otf`。位于产物输出目录内的字体会被跳过，
   * 否则重复运行会把上次的裁剪产物也当成输入（输出目录通常就建在字体目录下）。
   * 结果去重后排序，保证输出稳定可复现。
   */
  public locate(inputs: readonly string[]): string[] {
    const fonts = new Set<string>();
    let skipped = 0;

    for (const input of inputs) {
      const absolute = resolve(input);

      if (!existsSync(absolute)) {
        throw new Error(`Font path not found: ${absolute}`);
      }

      if (!statSync(absolute).isDirectory()) {
        const extension = extname(absolute).toLowerCase();

        if (!FONT_EXTENSIONS.includes(extension)) {
          throw new Error(
            `Unsupported font format: ${absolute} (expected: ${FONT_EXTENSIONS.join(", ")})`,
          );
        }

        fonts.add(absolute);
        continue;
      }

      const found = findFilesByExtensions(absolute, FONT_EXTENSIONS);
      let accepted = 0;

      for (const font of found) {
        if (isInside(font, this.outputDir)) {
          skipped += 1;
          continue;
        }

        fonts.add(font);
        accepted += 1;
      }

      this.logger.info(`Scanned ${absolute}: found ${accepted} font file(s)`);
    }

    if (fonts.size === 0) {
      throw new Error(
        skipped > 0
          ? `No font file found in: ${inputs.join(", ")}. `
            + `${skipped} file(s) were skipped because they are inside the output directory: `
            + `${this.outputDir}. The output directory must not be the input directory itself.`
          : `No font file found in: ${inputs.join(", ")}`,
      );
    }

    return [...fonts].sort();
  }
}

/**
 * 判断目标路径是否位于指定目录内（不含目录自身）。
 * `relative` 在 Windows 上按不区分大小写的规则比较，无需额外归一化。
 */
function isInside(target: string, directory: string): boolean {
  const relativePath = relative(directory, target);
  return relativePath.length > 0 && !relativePath.startsWith("..") && !isAbsolute(relativePath);
}
