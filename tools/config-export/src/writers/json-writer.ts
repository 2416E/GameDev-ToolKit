import { writeFileSync } from "node:fs";
import { TableInfo } from "@toolkit/shared";
import { FieldTypeParser } from "../parsers/field-type-parser";

export class JsonWriter {
  constructor(private readonly outputPath: string) {}

  writeTables(tables: TableInfo[]): void {
    const output = tables.map((table) => ({
      name: table.name,
      type: table.tableType === 0 ? "Normal" : "Const",
      fields: table.fields.map((f) => ({
        name: f.name,
        description: f.description,
        type: FieldTypeParser.getFullType(f.typeInfo),
      })),
      rows: table.rows,
    }));

    writeFileSync(this.outputPath, JSON.stringify(output, null, 2), "utf8");
  }
}
