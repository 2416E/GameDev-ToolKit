import { writeFileSync } from "node:fs";
import { FieldType, FieldTypeInfo, TableInfo, TableType } from "@toolkit/shared";

export class TypeScriptWriter {
  constructor(private readonly outputPath: string) {}

  writeTables(tables: TableInfo[]): void {
    const lines: string[] = [];

    lines.push("// Auto-generated TypeScript declarations");
    lines.push("// Do not edit manually");

    for (const table of tables) {
      lines.push("");
      if (table.tableType === TableType.Normal) {
        this.writeNormalTable(lines, table);
      } else {
        this.writeConstTable(lines, table);
      }
    }

    lines.push("");
    lines.push("declare type Table = {");
    for (const table of tables) {
      const typeName = this.toPascalCase(table.name);
      const keyName = typeName.endsWith("Config")
        ? typeName.slice(0, -"Config".length)
        : typeName;
      lines.push(`  ${keyName}: ${typeName};`);
    }
    lines.push("};");

    lines.push("");
    lines.push("declare function getTable<K extends keyof Table>(tableName: K): Array<Table[K]>;");
    lines.push("declare function getConfig<K extends keyof Table>(tableName: K, id: number | string): Table[K] | undefined;");
    lines.push("declare function getConst<K extends keyof Table, T extends keyof Table[K]>(tableName: K, key: T): Table[K][T];");

    writeFileSync(this.outputPath, lines.join("\n"), "utf8");
  }

  private writeNormalTable(lines: string[], table: TableInfo): void {
    lines.push(`declare interface ${this.toPascalCase(table.name)} {`);
    for (const field of table.fields) {
      const optional = field.typeInfo.dimension > 0 ? "?" : "";
      lines.push(`  ${field.name}${optional}: ${this.getTypeScriptType(field.typeInfo)};`);
    }
    lines.push("}");
  }

  private writeConstTable(lines: string[], table: TableInfo): void {
    if (table.fields.length === 0) {
      return;
    }

    lines.push(`declare interface ${this.toPascalCase(table.name)} {`);
    for (const field of table.fields) {
      lines.push(`  readonly ${field.name}: ${this.getTypeScriptType(field.typeInfo)};`);
    }
    lines.push("}");
  }

  private getTypeScriptType(typeInfo: FieldTypeInfo): string {
    let baseType: string;

    switch (typeInfo.baseType) {
      case FieldType.Int:
      case FieldType.Long:
      case FieldType.Float:
      case FieldType.Double:
        baseType = "number";
        break;
      case FieldType.String:
        baseType = "string";
        break;
      case FieldType.Bool:
        baseType = "boolean";
        break;
      case FieldType.Pair:
        baseType = "Pole.Pair";
        break;
      default:
        baseType = "any";
        break;
    }

    return baseType + "[]".repeat(typeInfo.dimension);
  }

  private toPascalCase(name: string): string {
    if (!name) {
      return name;
    }

    if (!name.includes("_")) {
      return name[0].toUpperCase() + name.slice(1);
    }

    return name
      .split("_")
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join("");
  }
}
