import * as XLSX from "xlsx";
import { SheetData } from "@toolkit/shared";

export class ExcelReader {
  readAllSheets(filePath: string): SheetData[] {
    const workbook = XLSX.readFile(filePath, {
      cellDates: false,
      raw: false,
      dense: false,
    });

    const sheets: SheetData[] = [];

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(worksheet, {
        header: 1,
        raw: false,
        defval: "",
      });

      const rows: Array<Record<number, string>> = matrix.map((row) => {
        const record: Record<number, string> = {};
        for (let i = 0; i < row.length; i++) {
          const value = row[i];
          record[i] = value == null ? "" : String(value);
        }
        return record;
      });

      sheets.push({
        name: sheetName,
        rows,
      });
    }

    return sheets;
  }
}
