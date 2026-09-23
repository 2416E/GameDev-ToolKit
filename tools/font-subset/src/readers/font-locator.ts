import { existsSync, statSync } from "node:fs";
import { extname, resolve } from "node:path";
import { findFilesByExt, Logger } from "@toolkit/shared";

/** 本工具可处理的字体扩展名，同时用于校验显式传入的字体文件。 */
const FONT_EXTENSIONS: readonly string[] = [".ttf", ".otf"];

export class FontLocator {
  private readonly logger = new Logger("FontLocator");

  /**
   * 将传入的字体文件/目录展开为待处理的字体文件列表。
   *
   * 目录会递归查找全部 `.ttf` / `.otf`；结果去重后排序，保证输出稳定可复现。
   */
  public locate(inputs: readonly string[]): string[] {
    const fonts = new Set<string>();

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

      const found = FONT_EXTENSIONS.flatMap((extension) =>
        findFilesByExt(absolute, extension),
      );

      for (const font of found) {
        fonts.add(font);
      }

      this.logger.info(`Scanned ${absolute}: found ${found.length} font file(s)`);
    }

    if (fonts.size === 0) {
      throw new Error(`No font file found in: ${inputs.join(", ")}`);
    }

    return [...fonts].sort();
  }
}
