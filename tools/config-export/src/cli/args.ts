import { dirname, join, resolve } from "node:path";
import { formatUsage, OptionSpec, parseOptions } from "@toolkit/shared";

export interface CommandOptions {
  inputDir: string;
  outputDir: string;
  enableIncremental: boolean;
  enableJson: boolean;
  enableTypeScript: boolean;
  forceFullPack: boolean;
  showHelp: boolean;
}

const OPTION_SPECS: readonly OptionSpec[] = [
  {
    key: "inputDir",
    flags: ["-i", "--input"],
    hasValue: true,
    valuePlaceholder: "<dir>",
    description: "Input directory (default: executable directory)",
  },
  {
    key: "outputDir",
    flags: ["-o", "--output"],
    hasValue: true,
    valuePlaceholder: "<dir>",
    description: "Output directory (default: inputDir/.generated)",
  },
  {
    key: "enableIncremental",
    flags: ["--no-incremental"],
    hasValue: false,
    flagValue: false,
    defaultValue: true,
    description: "Disable incremental mode",
  },
  {
    key: "enableJson",
    flags: ["--json"],
    hasValue: false,
    flagValue: true,
    defaultValue: false,
    description: "Also output JSON",
  },
  {
    key: "enableTypeScript",
    flags: ["--no-ts"],
    hasValue: false,
    flagValue: false,
    defaultValue: true,
    description: "Disable TypeScript declaration output",
  },
  {
    key: "forceFullPack",
    flags: ["-f", "--force"],
    hasValue: false,
    flagValue: true,
    defaultValue: false,
    description: "Force full pack",
  },
  {
    key: "showHelp",
    flags: ["-h", "--help"],
    hasValue: false,
    flagValue: true,
    defaultValue: false,
    description: "Show help",
  },
];

export function parseArgs(argv: string[]): CommandOptions {
  const { values, positionals } = parseOptions(argv, OPTION_SPECS);
  const defaultDir = dirname(process.argv[1] ?? process.cwd());

  let inputDir = typeof values.inputDir === "string" ? values.inputDir : "";

  for (const positional of positionals) {
    if (inputDir.length > 0) {
      throw new Error(`Unknown option: ${positional}`);
    }

    inputDir = positional;
  }

  if (!inputDir) {
    inputDir = defaultDir;
  }
  inputDir = resolve(inputDir);

  let outputDir = typeof values.outputDir === "string" ? values.outputDir : "";
  if (!outputDir) {
    outputDir = join(inputDir, ".generated");
  }
  outputDir = resolve(outputDir);

  return {
    inputDir,
    outputDir,
    enableIncremental: values.enableIncremental === true,
    enableJson: values.enableJson === true,
    enableTypeScript: values.enableTypeScript === true,
    forceFullPack: values.forceFullPack === true,
    showHelp: values.showHelp === true,
  };
}

export function printUsage(): void {
  console.log(formatUsage("Usage: config-export [options] [inputDir]", OPTION_SPECS));
}
