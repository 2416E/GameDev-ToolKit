import { readdirSync } from "node:fs";
import { join } from "node:path";

export interface FindFilesOptions {
  /** 忽略以这些前缀开头的文件，例如 Excel 临时文件 "~$" */
  ignorePrefixes?: readonly string[];
}

/**
 * 递归查找目录下所有具有指定扩展名之一的文件（扩展名大小写不敏感）。
 *
 * 无论传入多少个扩展名，目录树只遍历一次，不会因扩展名数量而重复扫描。
 * 返回顺序为目录遍历顺序，不保证跨平台一致；需要稳定顺序时请调用方自行排序。
 */
export function findFilesByExtensions(
  directory: string,
  extensions: readonly string[],
  options: FindFilesOptions = {},
): string[] {
  const suffixes = extensions.map((extension) => extension.toLowerCase());
  return collectFiles(directory, suffixes, options.ignorePrefixes ?? []);
}

/**
 * 递归查找目录下所有具有指定扩展名的文件（扩展名大小写不敏感）。
 */
export function findFilesByExt(
  directory: string,
  extension: string,
  options: FindFilesOptions = {},
): string[] {
  return findFilesByExtensions(directory, [extension], options);
}

/**
 * 递归查找目录下所有 `.xlsx` 文件，自动忽略 Excel 临时文件。
 */
export function findXlsxFiles(directory: string): string[] {
  return findFilesByExtensions(directory, [".xlsx"], { ignorePrefixes: ["~$"] });
}

function collectFiles(
  directory: string,
  suffixes: readonly string[],
  ignorePrefixes: readonly string[],
): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, suffixes, ignorePrefixes));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (ignorePrefixes.some((prefix) => entry.name.startsWith(prefix))) {
      continue;
    }

    const lowerName = entry.name.toLowerCase();

    // 后缀列表为空时不让任何文件命中，避免"未指定扩展名"被误解为"全部文件"
    if (!suffixes.some((suffix) => lowerName.endsWith(suffix))) {
      continue;
    }

    files.push(fullPath);
  }

  return files;
}
