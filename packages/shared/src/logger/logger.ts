export interface LoggerOptions {
  /**
   * 是否在每条消息前输出 `[模块名]` 前缀，默认开启。
   * 装饰性输出（如启动横幅）可关闭。
   */
  prefix?: boolean;
}

/**
 * 统一日志器。多工具共用同一终端时，通过模块名前缀区分来源。
 */
export class Logger {
  private readonly scope: string;
  private readonly prefixEnabled: boolean;

  constructor(scope: string, options: LoggerOptions = {}) {
    this.scope = scope;
    this.prefixEnabled = options.prefix ?? true;
  }

  info(message: string): void {
    console.log(this.format(message));
  }

  warn(message: string): void {
    console.warn(this.format(message));
  }

  error(message: string): void {
    console.error(this.format(message));
  }

  success(message: string): void {
    console.log(this.format(message));
  }

  private format(message: string): string {
    if (!this.prefixEnabled || this.scope.length === 0) {
      return message;
    }

    return `[${this.scope}] ${message}`;
  }
}
