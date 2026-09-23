#!/usr/bin/env node
import { existsSync } from "node:fs";
import { Logger } from "@toolkit/shared";
import { Packer } from "./core/packer";
import { parseArgs, printUsage } from "./cli/args";

const logger = new Logger("ConfigExport");
const banner = new Logger("ConfigExport", { prefix: false });

async function main(): Promise<number> {
  banner.info("===========================================");
  banner.info("       Config Export Tool (Node.js)");
  banner.info("===========================================\n");

  const options = parseArgs(process.argv.slice(2));

  if (options.showHelp) {
    printUsage();
    return 0;
  }

  if (!existsSync(options.inputDir)) {
    logger.error(`Error: input directory not found: ${options.inputDir}`);
    return 1;
  }

  const packer = new Packer({
    inputDir: options.inputDir,
    outputDir: options.outputDir,
    enableIncremental: options.enableIncremental,
    enableJson: options.enableJson,
    enableTypeScript: options.enableTypeScript,
    enableText: options.enableText,
  });

  const result = options.forceFullPack
    ? await packer.forceFullPack()
    : await packer.pack();

  logger.info("Done.");
  return result.success ? 0 : 1;
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
