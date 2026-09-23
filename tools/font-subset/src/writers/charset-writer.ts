import { writeFileSync } from "node:fs";
import { join } from "node:path";

/** 字符集清单的文件主名，一次运行只产出一份。 */
const MANIFEST_BASE_NAME = "charset";

export interface CharsetWriteResult {
  /** 字符集清单文本文件路径，内容可直接作为下次运行的输入 */
  textPath: string;
  /** 字符集清单 JSON 文件路径 */
  jsonPath: string;
  /** 字符集包含的字符数量（按码点计） */
  count: number;
}

export class CharsetWriter {
  /**
   * 写出字符集清单：`charset.txt`（去重后的字符单行文本）与
   * `charset.json`（`{ "count": number, "characters": string[] }`）。
   *
   * 输出目录由调用方保证存在。清单记录的是**请求保留的字符集**，
   * 不代表每个字体中确实存在对应的字形。
   */
  public write(outputDir: string, charset: string): CharsetWriteResult {
    const characters = [...charset];
    const textPath = join(outputDir, `${MANIFEST_BASE_NAME}.txt`);
    const jsonPath = join(outputDir, `${MANIFEST_BASE_NAME}.json`);

    writeFileSync(textPath, charset, "utf8");
    writeFileSync(
      jsonPath,
      `${JSON.stringify({ count: characters.length, characters }, null, 2)}\n`,
      "utf8",
    );

    return { textPath, jsonPath, count: characters.length };
  }
}
