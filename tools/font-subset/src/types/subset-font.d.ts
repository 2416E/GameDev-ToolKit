/**
 * `subset-font` 未随包发布类型声明（package.json 中无 `types` / `typings` 字段，
 * `files` 白名单也只包含 `index.js` 与 `*.md`），此处按其公开 API 手工声明。
 */
declare module "subset-font" {
  /** 输出容器格式。`"truetype"` 是 `"sfnt"` 的向后兼容别名。 */
  export type TargetFormat = "sfnt" | "truetype" | "woff" | "woff2";

  /** 可变字体轴的裁剪区间。 */
  export interface VariationAxisRange {
    min?: number;
    max?: number;
    default?: number;
  }

  export interface SubsetFontOptions {
    /** 输出格式，默认保持输入字体的容器格式（`"sfnt"`）。 */
    targetFormat?: TargetFormat;
    /** 需要额外保留的 name 表 id。 */
    preserveNameIds?: readonly number[];
    /** 需要保留的 OpenType layout feature tag，传空数组表示全部移除。 */
    keepFeatures?: readonly string[];
    /** 可变字体的轴实例化与裁剪，值为数字表示固定该轴。 */
    variationAxes?: Readonly<Record<string, number | VariationAxisRange>>;
    /** 保留全部字形而不做子集化，此时 `text` 必须为空。 */
    keepAllGlyphs?: boolean;
    /** 不执行 GSUB 的字形闭包。 */
    noLayoutClosure?: boolean;
    /** 在子集中保留 PostScript 字形名。 */
    glyphNames?: boolean;
    /** 丢弃子集中的 hinting 指令。 */
    noHinting?: boolean;
    /** 需要删除的 SFNT 表 tag。 */
    dropTables?: readonly string[];
  }

  /**
   * 生成只保留 `text` 中出现字符的字体子集。
   */
  function subsetFont(
    buffer: Buffer,
    text: string,
    options?: SubsetFontOptions,
  ): Promise<Buffer>;

  export default subsetFont;
}
