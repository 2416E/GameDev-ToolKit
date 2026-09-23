import { FieldInfo, SheetData, TableInfo, TableType } from "@toolkit/shared";
import { FieldTypeParser } from "./field-type-parser";

export class TableParser {
  parse(sheet: SheetData): TableInfo {
    if (sheet.rows.length < 1) {
      throw new Error("Sheet is empty");
    }

    const headerRow = sheet.rows[0];
    const tableName = this.getCellValue(headerRow, 1);
    const tableTypeStr = this.getCellValue(headerRow, 3);

    if (!tableName) {
      throw new Error("Table name is empty");
    }

    const tableType = this.parseTableType(tableTypeStr);
    if (tableType === TableType.Normal) {
      return this.parseNormalTable(tableName, sheet.rows);
    }

    return this.parseConstTable(tableName, sheet.rows);
  }

  private parseTableType(typeStr: string): TableType {
    switch (typeStr.trim().toLowerCase()) {
      case "normal":
        return TableType.Normal;
      case "const":
        return TableType.Const;
      default:
        throw new Error(`Unknown table type: ${typeStr}`);
    }
  }

  private parseNormalTable(tableName: string, rows: Array<Record<number, string>>): TableInfo {
    if (rows.length < 5) {
      throw new Error(`Normal table ${tableName} has insufficient rows`);
    }

    const tableInfo: TableInfo = {
      name: tableName,
      tableType: TableType.Normal,
      fields: [],
      rows: [],
    };

    const descRow = rows[1];
    const nameRow = rows[2];
    const typeRow = rows[3];

    let colIndex = 1;
    const fieldNames = new Set<string>();
    while (true) {
      const fieldName = this.getCellValue(nameRow, colIndex);
      if (!fieldName) {
        break;
      }

      if (fieldNames.has(fieldName)) {
        throw new Error(`Duplicate field name in table ${tableName}: ${fieldName}`);
      }
      fieldNames.add(fieldName);

      const fieldDesc = this.getCellValue(descRow, colIndex);
      const typeStr = this.getCellValue(typeRow, colIndex);
      const typeInfo = FieldTypeParser.parse(typeStr);

      const field: FieldInfo = {
        description: fieldDesc,
        name: fieldName,
        type: typeInfo.baseType,
        typeInfo,
      };

      tableInfo.fields.push(field);
      colIndex++;
    }

    if (tableInfo.fields.length === 0) {
      throw new Error(`Normal table ${tableName} has no fields`);
    }

    for (let rowIndex = 4; rowIndex < rows.length; rowIndex++) {
      const dataRow = rows[rowIndex];
      const rowData: Record<string, unknown> = {};

      let isEmptyRow = true;
      for (let i = 0; i < tableInfo.fields.length; i++) {
        if (this.getCellValue(dataRow, i + 1).trim().length > 0) {
          isEmptyRow = false;
          break;
        }
      }

      if (isEmptyRow) {
        continue;
      }

      for (let i = 0; i < tableInfo.fields.length; i++) {
        const field = tableInfo.fields[i];
        const value = this.getCellValue(dataRow, i + 1);
        rowData[field.name] = FieldTypeParser.parseArrayValue(field.typeInfo, value);
      }

      tableInfo.rows.push(rowData);
    }

    return tableInfo;
  }

  private parseConstTable(tableName: string, rows: Array<Record<number, string>>): TableInfo {
    if (rows.length < 2) {
      throw new Error(`Const table ${tableName} has insufficient rows`);
    }

    const tableInfo: TableInfo = {
      name: tableName,
      tableType: TableType.Const,
      fields: [],
      rows: [],
    };

    const rowData: Record<string, unknown> = {};

    const fieldNames = new Set<string>();
    for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
      const dataRow = rows[rowIndex];
      const fieldDesc = this.getCellValue(dataRow, 0);
      const fieldName = this.getCellValue(dataRow, 1);
      const typeStr = this.getCellValue(dataRow, 2);
      const value = this.getCellValue(dataRow, 3);

      if (!fieldName) {
        continue;
      }

      if (fieldNames.has(fieldName)) {
        throw new Error(`Duplicate field name in table ${tableName}: ${fieldName}`);
      }
      fieldNames.add(fieldName);

      const typeInfo = FieldTypeParser.parse(typeStr);
      rowData[fieldName] = FieldTypeParser.parseArrayValue(typeInfo, value);

      tableInfo.fields.push({
        description: fieldDesc,
        name: fieldName,
        type: typeInfo.baseType,
        typeInfo,
      });
    }

    if (Object.keys(rowData).length > 0) {
      tableInfo.rows.push(rowData);
    }

    return tableInfo;
  }

  private getCellValue(row: Record<number, string>, colIndex: number): string {
    return row[colIndex] ?? "";
  }
}
