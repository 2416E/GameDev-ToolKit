/**
 * BrowserConfigReader
 *
 * 用于在浏览器环境解析 ConfigExport 生成的二进制文件。
 * 输入为 ArrayBuffer，不依赖 Node.js 的 fs/path。
 *
 * 注意：本文件是设计为可复制分发的独立产物，刻意保持零导入、自包含。
 * 因此下方的 TableType / FieldType 枚举与 MAGIC / VERSION 常量在此重复定义，
 * 必须与 @toolkit/shared 的协议定义保持同步：
 *   packages/shared/src/types/protocol.ts
 *   packages/shared/src/binary/constants.ts
 */

export enum TableType {
  Normal = 0,
  Const = 1,
}

export enum FieldType {
  Int = 0,
  Long = 1,
  Float = 2,
  Double = 3,
  String = 4,
  Bool = 5,
  Pair = 6,
}

export interface PairValue {
  key: number;
  value: number;
}

export interface FieldTypeInfo {
  baseType: FieldType;
  dimension: number;
}

export interface FieldInfo {
  name: string;
  typeInfo: FieldTypeInfo;
}

export interface TableInfo {
  name: string;
  tableType: TableType;
  fields: FieldInfo[];
  rows: Record<string, unknown>[];
}

export interface BinaryConfigFile {
  magic: number;
  version: number;
  tables: TableInfo[];
}

const MAGIC = 0x434f4e46;
const VERSION = 1;

export class BrowserConfigReader {
  private readonly view: DataView;
  private readonly bytes: Uint8Array;
  private readonly decoder = new TextDecoder("utf-8");
  private position = 0;

  constructor(private readonly buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
    this.bytes = new Uint8Array(buffer);
  }

  read(): BinaryConfigFile {
    const magic = this.readUInt32();
    const version = this.readUInt32();
    const tableCount = this.readUInt32();

    if (magic !== MAGIC) {
      throw new Error(`Invalid magic number: 0x${magic.toString(16).padStart(8, "0")}`);
    }
    if (version !== VERSION) {
      throw new Error(`Unsupported config version: ${version}`);
    }
    this.ensureCount(tableCount, "table");

    const tables: TableInfo[] = [];
    for (let i = 0; i < tableCount; i++) {
      tables.push(this.readTable());
    }

    return { magic, version, tables };
  }

  getPosition(): number {
    return this.position;
  }

  getSize(): number {
    return this.buffer.byteLength;
  }

  private readTable(): TableInfo {
    const name = this.readString();
    const tableType = this.readByte() as TableType;
    const fieldCount = this.readUInt32();

    const fields: FieldInfo[] = [];
    for (let i = 0; i < fieldCount; i++) {
      fields.push(this.readField());
    }

    const rowCount = this.readUInt32();
    const rows: Record<string, unknown>[] = [];
    for (let i = 0; i < rowCount; i++) {
      rows.push(this.readRow(fields));
    }

    return { name, tableType, fields, rows };
  }

  private readField(): FieldInfo {
    const name = this.readString();
    const typeInfo = this.readTypeInfo();
    return { name, typeInfo };
  }

  private readRow(fields: FieldInfo[]): Record<string, unknown> {
    const row: Record<string, unknown> = {};
    for (const field of fields) {
      row[field.name] = this.readValue(field.typeInfo);
    }
    return row;
  }

  private readTypeInfo(): FieldTypeInfo {
    const baseType = this.readByte() as FieldType;
    const dimension = this.readByte();
    return { baseType, dimension };
  }

  private readValue(typeInfo: FieldTypeInfo): unknown {
    const isNull = !this.readBoolean();
    if (isNull) {
      return null;
    }

    if (typeInfo.dimension === 0) {
      return this.readPrimitiveValue(typeInfo.baseType);
    }

    return this.readArrayValue(typeInfo);
  }

  private readArrayValue(typeInfo: FieldTypeInfo): unknown[] {
    const length = this.readUInt32();
    this.ensureCount(length, "array element");
    const result: unknown[] = [];

    const elementTypeInfo: FieldTypeInfo = {
      baseType: typeInfo.baseType,
      dimension: typeInfo.dimension - 1,
    };

    for (let i = 0; i < length; i++) {
      result.push(this.readValue(elementTypeInfo));
    }

    return result;
  }

  private readPrimitiveValue(type: FieldType): unknown {
    switch (type) {
      case FieldType.Int:
        return this.readInt32();
      case FieldType.Long:
        return Number(this.readInt64());
      case FieldType.Float:
        return this.readFloat();
      case FieldType.Double:
        return this.readDouble();
      case FieldType.String:
        return this.readString();
      case FieldType.Bool:
        return this.readBoolean();
      case FieldType.Pair:
        return this.readPair();
      default:
        throw new Error(`Unknown field type: ${type}`);
    }
  }

  private readPair(): PairValue {
    return {
      key: this.readDouble(),
      value: this.readDouble(),
    };
  }

  private readUInt32(): number {
    this.ensureAvailable(4);
    const value = this.view.getUint32(this.position, true);
    this.position += 4;
    return value;
  }

  private readInt32(): number {
    this.ensureAvailable(4);
    const value = this.view.getInt32(this.position, true);
    this.position += 4;
    return value;
  }

  private readInt64(): bigint {
    this.ensureAvailable(8);
    const value = this.view.getBigInt64(this.position, true);
    this.position += 8;
    return value;
  }

  private readFloat(): number {
    this.ensureAvailable(4);
    const value = this.view.getFloat32(this.position, true);
    this.position += 4;
    return value;
  }

  private readDouble(): number {
    this.ensureAvailable(8);
    const value = this.view.getFloat64(this.position, true);
    this.position += 8;
    return value;
  }

  private readByte(): number {
    this.ensureAvailable(1);
    const value = this.bytes[this.position];
    this.position += 1;
    return value;
  }

  private readBoolean(): boolean {
    return this.readByte() !== 0;
  }

  private readString(): string {
    const length = this.readUInt32();
    if (length === 0) {
      return "";
    }

    this.ensureAvailable(length);

    const value = this.decoder.decode(this.bytes.subarray(this.position, this.position + length));
    this.position += length;
    return value;
  }

  private ensureAvailable(length: number): void {
    if (length < 0 || length > this.buffer.byteLength - this.position) {
      throw new Error(`Unexpected end of config binary at offset ${this.position}`);
    }
  }

  private ensureCount(count: number, label: string): void {
    if (count > this.buffer.byteLength || count > 10_000_000) {
      throw new Error(`Invalid ${label} count: ${count}`);
    }
  }
}

export function parseConfigBinary(buffer: ArrayBuffer): BinaryConfigFile {
  return new BrowserConfigReader(buffer).read();
}
