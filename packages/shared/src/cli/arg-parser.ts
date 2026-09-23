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
  /**
   * 是否接收位置参数。最多只能有一个 spec 声明为 true。
   * 位置参数仅在该 key 当时尚未被赋值时接收，否则报 `Unknown option`，
   * 因此在解析过程中与同名选项的先后顺序保持一致（后者覆盖前者）。
   */
  acceptsPositional?: boolean;
  /**
   * 是否允许同名参数重复出现并累积为字符串数组。
   *
   * 声明后该 key 的取值类型为 `string[]`：未出现时为空数组，每次出现按解析顺序追加。
   * 只能用于取值型参数（`hasValue: true`），且不能声明 `defaultValue`（空数组即默认值）。
   * 与 `acceptsPositional` 同时声明时，位置参数同样按顺序追加进数组。
   */
  repeatable?: boolean;
}

/** 解析结果的取值：取值型参数为 `string`，布尔开关为 `boolean`，可重复参数为 `string[]` */
export type OptionValue = string | boolean | string[];

export interface ParsedOptions {
  values: Record<string, OptionValue>;
  /** 未被任何 OptionSpec 接收的位置参数（仅当没有 spec 声明 acceptsPositional 时出现） */
  positionals: string[];
}

/** 帮助信息中描述文本的起始列（含 2 空格缩进） */
const DESCRIPTION_COLUMN = 26;

/**
 * 规格驱动的命令行解析：支持别名、取值参数、布尔开关、可重复参数与位置参数。
 */
export function parseOptions(argv: readonly string[], specs: readonly OptionSpec[]): ParsedOptions {
  const values: Record<string, OptionValue> = {};
  const lookup = new Map<string, OptionSpec>();
  let positionalSpec: OptionSpec | undefined;

  for (const spec of specs) {
    for (const flag of spec.flags) {
      lookup.set(flag.toLowerCase(), spec);
    }

    if (spec.acceptsPositional) {
      positionalSpec = spec;
    }

    if (spec.repeatable) {
      validateRepeatableSpec(spec);
      values[spec.key] = [];
      continue;
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
      if (raw.startsWith("-")) {
        throw new Error(`Unknown option: ${raw}`);
      }

      if (!positionalSpec) {
        positionals.push(raw);
        continue;
      }

      if (positionalSpec.repeatable) {
        appendValue(values, positionalSpec.key, raw);
        continue;
      }

      const current = values[positionalSpec.key];
      if (typeof current === "string" && current.length > 0) {
        throw new Error(`Unknown option: ${raw}`);
      }

      values[positionalSpec.key] = raw;
      continue;
    }

    if (!spec.hasValue) {
      values[spec.key] = spec.flagValue ?? true;
      continue;
    }

    if (i + 1 >= argv.length || argv[i + 1].startsWith("-")) {
      throw new Error(`Missing value for ${raw}`);
    }

    const value = argv[++i];

    if (spec.repeatable) {
      appendValue(values, spec.key, value);
      continue;
    }

    values[spec.key] = value;
  }

  return { values, positionals };
}

/** 追加取值：可重复参数累积为数组，其余情况保持单值覆盖语义。 */
function appendValue(values: Record<string, OptionValue>, key: string, value: string): void {
  const current = values[key];
  values[key] = Array.isArray(current) ? [...current, value] : [value];
}

/**
 * 可重复参数的声明约束在解析期即校验，避免规格书写错误被带到调用方。
 */
function validateRepeatableSpec(spec: OptionSpec): void {
  if (!spec.hasValue) {
    throw new Error(`Repeatable option must take a value: ${spec.flags.join(", ")}`);
  }

  if (spec.defaultValue !== undefined) {
    throw new Error(`Repeatable option cannot declare defaultValue: ${spec.flags.join(", ")}`);
  }
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
