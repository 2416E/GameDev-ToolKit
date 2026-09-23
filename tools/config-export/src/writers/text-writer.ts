import { writeFileSync } from "node:fs";
import { FieldType, TableInfo } from "@toolkit/shared";

export interface TextWriteResult {
  /** 去重后的字符数（按码点计） */
  characterCount: number;
  /** 去重后的文案条数 */
  textCount: number;
}

/**
 * 收集配置表中的文字，写出两个产物：
 *
 * - 去重字符集：每个字符只出现一次，单行输出，可直接作为 `font-subset -t` 的输入
 * - 去重文案清单：每条文案一行，便于核对哪些文案被纳入、排查漏字
 *
 * 只收集 `string` 基础类型的取值（含 `string[]` 等多维数组的全部元素）。
 * 表名、字段名与描述属于开发期元信息，不会出现在游戏里，因此不参与收集，
 * 否则会把大量永不显示的字符带进字体子集，白白撑大包体。
 * 文案的收集顺序为「表 → 行 → 字段」，去重后保持该顺序。
 */
export class TextWriter {
  constructor(
    private readonly charsetPath: string,
    private readonly textsPath: string,
  ) {}

  /**
   * 写出字符集与文案清单，返回去重后的字符数与文案条数。
   */
  writeTables(tables: TableInfo[]): TextWriteResult {
    const texts = collectTexts(tables);

    // 直接按码点迭代字符串去重（而非 split("")），避免把 emoji 等
    // BMP 外字符拆成两个孤立的代理项码元
    const characters = new Set(texts.join(""));

    writeFileSync(this.charsetPath, [...characters].join(""), "utf8");
    writeFileSync(
      this.textsPath,
      texts.length > 0 ? `${texts.join("\n")}\n` : "",
      "utf8",
    );

    return { characterCount: characters.size, textCount: texts.length };
  }
}

/**
 * 按「表 → 行 → 字段」顺序收集全部非空文案并去重。
 */
function collectTexts(tables: TableInfo[]): string[] {
  const texts = new Set<string>();

  for (const table of tables) {
    const stringFields = table.fields.filter(
      (field) => field.typeInfo.baseType === FieldType.String,
    );

    if (stringFields.length === 0) {
      continue;
    }

    for (const row of table.rows) {
      for (const field of stringFields) {
        collectValue(row[field.name], texts);
      }
    }
  }

  return [...texts];
}

/**
 * 递归收集值中的全部非空字符串，兼容 `string`、`string[]` 与多维数组。
 */
function collectValue(value: unknown, texts: Set<string>): void {
  if (typeof value === "string") {
    if (value.length > 0) {
      texts.add(value);
    }

    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectValue(item, texts);
    }
  }
}
