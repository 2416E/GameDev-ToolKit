/**
 * 协议与数据模型的唯一事实来源。
 *
 * 本文件为纯类型/枚举定义，不得引入任何 Node 或第三方依赖，
 * 以便被浏览器侧代码安全引用。
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
  description: string;
  name: string;
  type: FieldType;
  typeInfo: FieldTypeInfo;
}

export interface TableInfo {
  name: string;
  tableType: TableType;
  fields: FieldInfo[];
  rows: Array<Record<string, unknown>>;
}

export interface SheetData {
  name: string;
  rows: Array<Record<number, string>>;
}
