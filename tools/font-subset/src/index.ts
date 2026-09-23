#!/usr/bin/env node
import { existsSync } from "node:fs";
import { Logger } from "@toolkit/shared";
import { CommandOptions, parseArgs, printUsage } from "./cli/args";
import { Subsetter } from "./core/subsetter";
import { CharsetReader } from "./readers/charset-reader";
import { FontLocator } from "./readers/font-locator";

const logger = new Logger("FontSubset");
const banner = new Logger("FontSubset", { prefix: false });

async function main(): Promise<number> {
  banner.info("===========================================");
  banner.info("        Font Subset Tool (Node.js)");
  banner.info("===========================================\n");

  let options: CommandOptions;

  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    logger.error(describe(error));
    printUsage();
    return 1;
  }

  if (options.showHelp) {
    printUsage();
    return 0;
  }

  const missingPaths = [...options.fontPaths, ...options.textPaths].filter(
    (path) => !existsSync(path),
  );

  if (missingPaths.length > 0) {
    for (const path of missingPaths) {
      logger.error(`Error: path not found: ${path}`);
    }

    return 1;
  }

  const charsetReader = new CharsetReader();
  const fontLocator = new FontLocator();

  try {
    const charset = charsetReader.read(options.textPaths).join("");
    const fontPaths = fontLocator.locate(options.fontPaths);

    logger.info(
      `Fonts: ${fontPaths.length}, formats: ${options.formats.join(", ")}, output: ${options.outputDir}`,
    );

    const subsetter = new Subsetter({
      fontPaths,
      charset,
      outputDir: options.outputDir,
      formats: options.formats,
    });

    const result = await subsetter.pack();

    logger.info(
      `Done. ${result.succeeded}/${result.total} task(s) succeeded, ${result.failed} failed.`,
    );

    return result.failed === 0 ? 0 : 1;
  } catch (error) {
    logger.error(describe(error));
    return 1;
  }
}

/** 用户可修复的错误只输出消息本身，避免堆栈淹没关键信息。 */
function describe(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    logger.error(message);
    process.exitCode = 1;
  });
