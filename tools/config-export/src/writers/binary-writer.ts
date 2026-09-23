import { writeFileSync } from "node:fs";
import {
  BinaryBufferWriter,
  FieldType,
  FieldTypeInfo,
  MAGIC,
  PairValue,
  TableInfo,
  VERSION,
} from "@toolkit/shared";

export class BinaryWriter {
  constructor(private readonly outputPath: string) {}

  writeTables(tables: TableInfo[]): void {
    const writer = new BinaryBufferWriter();

    writer.writeUInt32(MAGIC);
    writer.writeUInt32(VERSION);
    writer.writeInt32(tables.length);

    for (const table of tables) {
      this.writeTable(writer, table);
    }

    writeFileSync(this.outputPath, writer.toBuffer());
  }

  private writeTable(writer: BinaryBufferWriter, table: TableInfo): void {
    writer.writeString(table.name);
    writer.writeUInt8(table.tableType);
    writer.writeInt32(table.fields.length);

    for (const field of table.fields) {
      writer.writeString(field.name);
      writer.writeUInt8(field.typeInfo.baseType);
      writer.writeUInt8(field.typeInfo.dimension);
    }

    writer.writeInt32(table.rows.length);

    for (const row of table.rows) {
      for (const field of table.fields) {
        const value = row[field.name] ?? null;
        this.writeValue(writer, field.typeInfo, value);
      }
    }
  }

  private writeValue(writer: BinaryBufferWriter, typeInfo: FieldTypeInfo, value: unknown): void {
    if (value == null) {
      writer.writeBool(false);
      return;
    }

    writer.writeBool(true);

    if (typeInfo.dimension === 0) {
      this.writePrimitiveValue(writer, typeInfo.baseType, value);
      return;
    }

    this.writeArrayValue(writer, typeInfo, value);
  }

  private writePrimitiveValue(writer: BinaryBufferWriter, type: FieldType, value: unknown): void {
    switch (type) {
      case FieldType.Int:
        writer.writeInt32(Number(value));
        break;
      case FieldType.Long:
        writer.writeInt64(Number(value));
        break;
      case FieldType.Float:
        writer.writeFloat32(Number(value));
        break;
      case FieldType.Double:
        writer.writeFloat64(Number(value));
        break;
      case FieldType.String:
        writer.writeString(String(value));
        break;
      case FieldType.Bool:
        writer.writeBool(Boolean(value));
        break;
      case FieldType.Pair:
        this.writePairValue(writer, value);
        break;
      default:
        throw new Error(`Unknown field type: ${type}`);
    }
  }

  private writePairValue(writer: BinaryBufferWriter, value: unknown): void {
    const pair = value as PairValue;
    writer.writeFloat64(Number(pair.key));
    writer.writeFloat64(Number(pair.value));
  }

  private writeArrayValue(writer: BinaryBufferWriter, typeInfo: FieldTypeInfo, value: unknown): void {
    if (!Array.isArray(value)) {
      throw new Error("Array value expected");
    }

    writer.writeInt32(value.length);

    const elementTypeInfo: FieldTypeInfo = {
      baseType: typeInfo.baseType,
      dimension: typeInfo.dimension - 1,
    };

    for (const item of value) {
      this.writeValue(writer, elementTypeInfo, item);
    }
  }
}
