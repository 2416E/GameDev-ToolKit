import { writeFileSync } from "node:fs";
import { FieldType, TableInfo } from "@toolkit/shared";

/**
 * 收集配置表中的文字集并写出（`Config.txt`）。
 *
 * 只收集 `string` 基础类型的取值（含 `string[]` 等多维数组的全部元素）。
 * 表名、字段名与描述属于开发期元信息，不会出现在游戏里，因此不参与收集，
 * 否则会把大量永不显示的字符带进字体子集，白白撑大包体。
 * 相同文案跨表去重，并保持「表 → 行 → 字段」的原始顺序，便于人工核对。
 */
export class TextWriter {
  constructor(private readonly outputPath: string) {}

  /**
   * 写出文字集，返回去重后的文案条数。
   */
  writeTables(tables: TableInfo[]): number {
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
          collectTexts(row[field.name], texts);
        }
      }
    }

    // 末尾保留换行，符合行式文本文件的惯例，便于直接用其他工具按行读取
    const lines = [...texts];
    writeFileSync(this.outputPath, lines.length > 0 ? `${lines.join("\n")}\n` : "", "utf8");

    return lines.length;
  }
}

/**
 * 递归收集值中的全部非空字符串，兼容 `string`、`string[]` 与多维数组。
 */
function collectTexts(value: unknown, texts: Set<string>): void {
  if (typeof value === "string") {
    if (value.length > 0) {
      texts.add(value);
    }

    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectTexts(item, texts);
    }
  }
}
