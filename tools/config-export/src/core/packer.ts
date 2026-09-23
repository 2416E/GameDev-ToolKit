import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  FileCacheStore,
  findXlsxFiles,
  Logger,
  TableInfo,
} from "@toolkit/shared";
import { TableParser } from "../parsers/table-parser";
import { ExcelReader } from "../readers/excel-reader";
import { BinaryWriter } from "../writers/binary-writer";
import { JsonWriter } from "../writers/json-writer";
import { TypeScriptWriter } from "../writers/typescript-writer";

export interface PackerOptions {
  inputDir: string;
  outputDir: string;
  enableIncremental: boolean;
  enableJson: boolean;
  enableTypeScript: boolean;
}

export interface PackResult {
  success: boolean;
  errorMessage: string;
  fileCount: number;
  tableCount: number;
  incrementalCount: number;
}

export class Packer {
  private readonly inputDir: string;
  private readonly outputDir: string;
  private readonly binaryPath: string;
  private readonly jsonPath: string;
  private readonly tsPath: string;
  private readonly cachePath: string;

  private readonly logger = new Logger("Packer");
  private readonly excelReader = new ExcelReader();
  private readonly tableParser = new TableParser();

  private cacheStore: FileCacheStore<TableInfo[]> | null = null;
  private enableIncremental: boolean;
  private readonly enableJson: boolean;
  private readonly enableTypeScript: boolean;

  constructor(options: PackerOptions) {
    this.inputDir = options.inputDir;
    this.outputDir = options.outputDir;
    this.binaryPath = join(options.outputDir, "Config.bin");
    this.jsonPath = join(options.outputDir, "Config.json");
    this.tsPath = join(options.outputDir, "Config.d.ts");
    this.cachePath = join(options.outputDir, "Config.cache");
    this.enableIncremental = options.enableIncremental;
    this.enableJson = options.enableJson;
    this.enableTypeScript = options.enableTypeScript;
  }

  async pack(): Promise<PackResult> {
    const result: PackResult = {
      success: false,
      errorMessage: "",
      fileCount: 0,
      tableCount: 0,
      incrementalCount: 0,
    };

    try {
      mkdirSync(this.outputDir, { recursive: true });

      // 缓存已由 forceFullPack() 预先创建并清空时不能再从磁盘加载，
      // 否则被清掉的缓存会被读回，--force 将退化为普通增量导出
      if (this.enableIncremental && this.cacheStore === null) {
        this.cacheStore = new FileCacheStore<TableInfo[]>(this.cachePath);
      }

      const xlsxFiles = findXlsxFiles(this.inputDir);
      result.fileCount = xlsxFiles.length;

      xlsxFiles.sort((left, right) => left.localeCompare(right));
      this.cacheStore?.prune(xlsxFiles);

      if (xlsxFiles.length === 0) {
        result.success = true;
        result.errorMessage = "No xlsx files found";
        return result;
      }

      const allTables: TableInfo[] = [];

      for (const file of xlsxFiles) {
        const cachedTables = this.enableIncremental && this.cacheStore && !this.cacheStore.hasChanged(file)
          ? this.cacheStore.get(file)
          : null;

        if (cachedTables) {
          allTables.push(...cachedTables);
          continue;
        }

        this.logger.info(`Process: ${file}`);
        try {
          const tables = this.parseFile(file);
          allTables.push(...tables);
          this.cacheStore?.set(file, tables);
          result.incrementalCount++;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.error(`Error: ${file}: ${message}`);
          result.errorMessage += `${file}: ${message}\n`;
        }
      }

      result.tableCount = allTables.length;

      const tableNames = new Set<string>();
      for (const table of allTables) {
        if (tableNames.has(table.name)) {
          throw new Error(`Duplicate table name: ${table.name}`);
        }
        tableNames.add(table.name);
      }

      mkdirSync(dirname(this.binaryPath), { recursive: true });
      new BinaryWriter(this.binaryPath).writeTables(allTables);
      this.logger.info(`Binary: ${this.binaryPath}`);

      if (this.enableJson) {
        new JsonWriter(this.jsonPath).writeTables(allTables);
        this.logger.info(`JSON: ${this.jsonPath}`);
      }

      if (this.enableTypeScript) {
        new TypeScriptWriter(this.tsPath).writeTables(allTables);
        this.logger.info(`TypeScript: ${this.tsPath}`);
      }

      this.cacheStore?.save();

      result.success = result.errorMessage.length === 0;
      this.logger.success("Pack completed");
      this.logger.info(`Files: ${result.fileCount}`);
      this.logger.info(`Tables: ${result.tableCount}`);
      this.logger.info(`Incremental updates: ${result.incrementalCount}`);

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.success = false;
      result.errorMessage = message;
      this.logger.error(`Fatal: ${message}`);
      return result;
    }
  }

  /**
   * 强制全量导出：丢弃已有缓存并重新解析所有输入文件。
   * 必须在此处先建立并清空缓存，pack() 才会跳过磁盘加载。
   */
  async forceFullPack(): Promise<PackResult> {
    this.enableIncremental = true;
    this.cacheStore = new FileCacheStore<TableInfo[]>(this.cachePath);
    this.cacheStore.clear();
    return this.pack();
  }

  private parseFile(filePath: string): TableInfo[] {
    const sheets = this.excelReader.readAllSheets(filePath);
    return sheets.map((sheet) => this.tableParser.parse(sheet));
  }
}
