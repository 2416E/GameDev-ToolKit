import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { computeMD5 } from "../utils/file-hash";

export interface CacheRecord<T> {
  hash: string;
  data: T;
}

type CacheData<T> = Record<string, CacheRecord<T>>;

/**
 * 基于文件 MD5 的通用增量缓存。
 *
 * 缓存的键为文件绝对路径，值为 `{ hash, data }`。
 * 文件内容未变化时可直接复用缓存的解析结果，跳过昂贵的解析步骤。
 */
export class FileCacheStore<T> {
  private readonly cachePath: string;
  private data: CacheData<T> = {};

  constructor(cachePath: string) {
    this.cachePath = cachePath;
    this.load();
  }

  /** 文件内容是否发生变化（无记录或记录结构非法视为已变化） */
  hasChanged(filePath: string): boolean {
    const hash = computeMD5(filePath);
    const record = this.data[filePath];
    return record?.hash !== hash || record.data === undefined;
  }

  /** 读取缓存数据，不存在时返回 null */
  get(filePath: string): T | null {
    return this.data[filePath]?.data ?? null;
  }

  /** 记录当前文件哈希并写入数据 */
  set(filePath: string, data: T): void {
    this.data[filePath] = {
      hash: computeMD5(filePath),
      data,
    };
  }

  /** 移除已不存在的文件对应的缓存记录 */
  prune(existingFilePaths: readonly string[]): void {
    const existing = new Set(existingFilePaths);

    for (const filePath of Object.keys(this.data)) {
      if (!existing.has(filePath)) {
        delete this.data[filePath];
      }
    }
  }

  clear(): void {
    this.data = {};
  }

  save(): void {
    writeFileSync(this.cachePath, JSON.stringify(this.data, null, 2), "utf8");
  }

  private load(): void {
    if (!existsSync(this.cachePath)) {
      this.data = {};
      return;
    }

    try {
      const parsed: unknown = JSON.parse(readFileSync(this.cachePath, "utf8"));
      this.data = parsed !== null && typeof parsed === "object"
        ? parsed as CacheData<T>
        : {};
    } catch {
      this.data = {};
    }
  }
}
