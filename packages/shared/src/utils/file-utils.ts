import { readdirSync } from "node:fs";
import { join } from "node:path";

export interface FindFilesOptions {
  /** 忽略以这些前缀开头的文件，例如 Excel 临时文件 "~$" */
  ignorePrefixes?: readonly string[];
}

/**
 * 递归查找目录下所有具有指定扩展名的文件（扩展名大小写不敏感）。
 */
export function findFilesByExt(
  directory: string,
  extension: string,
  options: FindFilesOptions = {},
): string[] {
  const suffix = extension.toLowerCase();
  const ignorePrefixes = options.ignorePrefixes ?? [];
  const files: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...findFilesByExt(fullPath, extension, options));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (!entry.name.toLowerCase().endsWith(suffix)) {
      continue;
    }

    if (ignorePrefixes.some((prefix) => entry.name.startsWith(prefix))) {
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

/**
 * 递归查找目录下所有 `.xlsx` 文件，自动忽略 Excel 临时文件。
 */
export function findXlsxFiles(directory: string): string[] {
  return findFilesByExt(directory, ".xlsx", { ignorePrefixes: ["~$"] });
}
