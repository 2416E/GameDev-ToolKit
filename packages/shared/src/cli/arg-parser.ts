export interface OptionSpec {
  /** 解析结果中的键名 */
  key: string;
  /** 可识别的参数形式，例如 ["-i", "--input"]，匹配时大小写不敏感 */
  flags: readonly string[];
  /** true 表示需要取值，false 表示布尔开关 */
  hasValue: boolean;
  /** 帮助信息中的描述 */
  description: string;
  /** 默认值，缺省时不写入结果 */
  defaultValue?: string | boolean;
  /** 布尔开关被命中时写入的值，默认 true（支持 `--no-xxx` 这类反向开关） */
  flagValue?: string | boolean;
  /** 取值型参数的占位符，默认 "<value>" */
  valuePlaceholder?: string;
}

export interface ParsedOptions {
  values: Record<string, string | boolean>;
  positionals: string[];
}

/** 帮助信息中描述文本的起始列（含 2 空格缩进） */
const DESCRIPTION_COLUMN = 26;

/**
 * 规格驱动的命令行解析：支持别名、取值参数、布尔开关与位置参数。
 */
export function parseOptions(argv: readonly string[], specs: readonly OptionSpec[]): ParsedOptions {
  const values: Record<string, string | boolean> = {};
  const lookup = new Map<string, OptionSpec>();

  for (const spec of specs) {
    for (const flag of spec.flags) {
      lookup.set(flag.toLowerCase(), spec);
    }

    if (spec.defaultValue !== undefined) {
      values[spec.key] = spec.defaultValue;
    }
  }

  const positionals: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i];
    const spec = lookup.get(raw.toLowerCase());

    if (!spec) {
      if (!raw.startsWith("-")) {
        positionals.push(raw);
        continue;
      }

      throw new Error(`Unknown option: ${raw}`);
    }

    if (!spec.hasValue) {
      values[spec.key] = spec.flagValue ?? true;
      continue;
    }

    if (i + 1 >= argv.length || argv[i + 1].startsWith("-")) {
      throw new Error(`Missing value for ${raw}`);
    }

    values[spec.key] = argv[++i];
  }

  return { values, positionals };
}

/**
 * 根据参数规格生成帮助文本。
 */
export function formatUsage(usageLine: string, specs: readonly OptionSpec[]): string {
  const lines: string[] = [usageLine, "", "Options:"];

  for (const spec of specs) {
    const placeholder = spec.hasValue ? ` ${spec.valuePlaceholder ?? "<value>"}` : "";
    const label = `${spec.flags.join(", ")}${placeholder}`;
    lines.push(`  ${label.padEnd(DESCRIPTION_COLUMN - 2)}${spec.description}`);
  }

  return lines.join("\n");
}
