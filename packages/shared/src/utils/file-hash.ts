import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export function computeMD5(filePath: string): string {
  const data = readFileSync(filePath);
  return createHash("md5").update(data).digest("hex");
}
