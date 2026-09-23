import { existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { formatUsage, OptionSpec, OptionValue, parseOptions } from "@toolkit/shared";
import { SubsetFormat } from "../core/subsetter";

export interface CommandOptions {
  /** 待处理的字体文件或目录（已归一化为绝对路径，目录尚未展开） */
  fontPaths: string[];
  /** 字符集文本文件（已归一化为绝对路径） */
  textPaths: string[];
  /** 产物输出目录（已归一化为绝对路径） */
  outputDir: string;
  /** 需要产出的输出格式，已去重并保持参数顺序 */
  formats: SubsetFormat[];
  showHelp: boolean;
}

/** 输出格式白名单，同时也是 `--formats` 的合法取值。 */
const SUPPORTED_FORMATS: readonly SubsetFormat[] = ["ttf", "woff", "woff2"];

/** `--formats` 缺省时只产出核心产物，Web 格式按需显式开启。 */
const DEFAULT_FORMAT: SubsetFormat = "ttf";

/** 默认输出目录名，创建在输入字体所在目录下。 */
const DEFAULT_OUTPUT_DIR_NAME = ".subset";

const OPTION_SPECS: readonly OptionSpec[] = [
  {
    key: "fontPaths",
    flags: ["-f", "--font"],
    hasValue: true,
    valuePlaceholder: "<path>",
    acceptsPositional: true,
    description: "Font file or directory, comma separated",
  },
  {
    key: "textPaths",
    flags: ["-t", "--text"],
    hasValue: true,
    valuePlaceholder: "<files>",
    description: "Charset text file(s), comma separated",
  },
  {
    key: "outputDir",
    flags: ["-o", "--output"],
    hasValue: true,
    valuePlaceholder: "<dir>",
    description: "Output directory (default: <fontDir>/.subset)",
  },
  {
    key: "formats",
    flags: ["--formats"],
    hasValue: true,
    valuePlaceholder: "<list>",
    description: "Output formats, comma separated: ttf, woff, woff2 (default: ttf)",
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
  const { values } = parseOptions(argv, OPTION_SPECS);

  if (values.showHelp === true) {
    return {
      fontPaths: [],
      textPaths: [],
      outputDir: "",
      formats: [...SUPPORTED_FORMATS],
      showHelp: true,
    };
  }

  const fontInputs = splitList(values.fontPaths);
  if (fontInputs.length === 0) {
    throw new Error("Missing font input: pass -f/--font <file|dir> or a positional path");
  }

  const textInputs = splitList(values.textPaths);
  if (textInputs.length === 0) {
    throw new Error("Missing charset input: pass -t/--text <file>[,<file>...]");
  }

  const formatInputs = splitList(values.formats);
  const outputInput = typeof values.outputDir === "string" ? values.outputDir.trim() : "";
  const fontPaths = fontInputs.map((input) => resolve(input));

  return {
    fontPaths,
    textPaths: textInputs.map((input) => resolve(input)),
    outputDir: outputInput ? resolve(outputInput) : resolveDefaultOutputDir(fontPaths[0]),
    formats: formatInputs.length > 0 ? parseFormats(formatInputs) : [DEFAULT_FORMAT],
    showHelp: false,
  };
}

export function printUsage(): void {
  console.log(
    formatUsage("Usage: font-subset [options] [fontFile|fontDir]", OPTION_SPECS),
  );
}

/**
 * 默认输出目录跟随输入字体本身：输入为目录时使用 `<目录>/.subset`，
 * 输入为文件时使用 `<文件所在目录>/.subset`；存在多个输入时以第一个为准。
 */
function resolveDefaultOutputDir(fontInput: string): string {
  if (existsSync(fontInput) && statSync(fontInput).isDirectory()) {
    return join(fontInput, DEFAULT_OUTPUT_DIR_NAME);
  }

  return join(dirname(fontInput), DEFAULT_OUTPUT_DIR_NAME);
}

/**
 * 解析并校验输出格式列表，忽略重复项并保持参数顺序。
 */
function parseFormats(inputs: readonly string[]): SubsetFormat[] {
  const formats: SubsetFormat[] = [];

  for (const input of inputs) {
    const format = input.toLowerCase();

    if (!isSubsetFormat(format)) {
      throw new Error(
        `Unsupported output format: ${input} (supported: ${SUPPORTED_FORMATS.join(", ")})`,
      );
    }

    if (!formats.includes(format)) {
      formats.push(format);
    }
  }

  return formats;
}

function isSubsetFormat(value: string): value is SubsetFormat {
  return (SUPPORTED_FORMATS as readonly string[]).includes(value);
}

/**
 * 将逗号分隔的列表值切分为去空白、去空项的数组（保持原有顺序）。
 *
 * 多个字体/文本文件统一通过逗号分隔的单个取值传入。取值若为数组（即参数声明为
 * `repeatable`）则逐项按同样规则展开，因此切换为可重复参数时本函数无需改动。
 */
function splitList(value: OptionValue | undefined): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => splitList(item));
  }

  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}
