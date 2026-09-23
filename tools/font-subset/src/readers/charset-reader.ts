import { readFileSync } from "node:fs";
import { Logger } from "@toolkit/shared";

/**
 * 需要跳过的字符：C0/C1 控制字符（含 `\r` `\n` `\t`）与 BOM。
 * BOM 不是控制字符，必须显式排除，否则会被当成有效字符写进子集。
 */
const SKIPPED_CHARACTER_PATTERN = /[\u0000-\u001F\u007F-\u009F\uFEFF]/;

export class CharsetReader {
  private readonly logger = new Logger("CharsetReader");

  /**
   * 读取一个或多个文本文件，合并其中全部字符并按码点去重。
   *
   * 以 `for...of` 按码点迭代（而非 `split("")`），避免把 BMP 外字符（emoji 等）
   * 拆成两个孤立的代理项码元。去重结果保持字符首次出现的顺序。
   */
  public read(textPaths: readonly string[]): string[] {
    const characters = new Set<string>();

    for (const textPath of textPaths) {
      const text = readFileSync(textPath, "utf8");
      let added = 0;

      for (const character of text) {
        if (SKIPPED_CHARACTER_PATTERN.test(character) || characters.has(character)) {
          continue;
        }

        characters.add(character);
        added += 1;
      }

      this.logger.info(`Read ${textPath} (+${added} unique character(s))`);
    }

    if (characters.size === 0) {
      throw new Error(
        `Empty charset: no usable character found in ${textPaths.join(", ")}`,
      );
    }

    this.logger.info(`Charset ready: ${characters.size} unique character(s)`);
    return [...characters];
  }
}
