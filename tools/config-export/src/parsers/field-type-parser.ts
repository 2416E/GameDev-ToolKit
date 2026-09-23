import { FieldType, FieldTypeInfo, PairValue } from "@toolkit/shared";

export class FieldTypeParser {
  static parse(typeStr: string): FieldTypeInfo {
    const normalized = typeStr.trim();
    const dimension = (normalized.match(/\[\]/g) ?? []).length;
    const baseTypeStr = normalized.replace(/\[\]/g, "").toLowerCase();

    const baseType = (() => {
      switch (baseTypeStr) {
        case "int":
          return FieldType.Int;
        case "long":
          return FieldType.Long;
        case "float":
          return FieldType.Float;
        case "double":
          return FieldType.Double;
        case "string":
          return FieldType.String;
        case "bool":
          return FieldType.Bool;
        case "pair":
          return FieldType.Pair;
        default:
          throw new Error(`Unknown field type: ${typeStr}`);
      }
    })();

    return {
      baseType,
      dimension,
    };
  }

  static getFullType(typeInfo: FieldTypeInfo): string {
    const names: Record<FieldType, string> = {
      [FieldType.Int]: "int",
      [FieldType.Long]: "long",
      [FieldType.Float]: "float",
      [FieldType.Double]: "double",
      [FieldType.String]: "string",
      [FieldType.Bool]: "bool",
      [FieldType.Pair]: "pair",
    };

    return names[typeInfo.baseType] + "[]".repeat(typeInfo.dimension);
  }

  static parseArrayValue(typeInfo: FieldTypeInfo, value: string): unknown {
    if (value.trim().length === 0) {
      return null;
    }

    const sanitized = value.replace(/\r/g, "").replace(/\n/g, "");
    return this.parseRecursive(typeInfo, sanitized);
  }

  private static parseRecursive(typeInfo: FieldTypeInfo, value: string): unknown {
    if (typeInfo.dimension === 0) {
      return this.parseSingleValue(typeInfo.baseType, value);
    }

    const elements = this.splitTopLevel(value);
    const elementType: FieldTypeInfo = {
      baseType: typeInfo.baseType,
      dimension: typeInfo.dimension - 1,
    };

    return elements.map((item) => this.parseRecursive(elementType, item));
  }

  private static splitTopLevel(value: string): string[] {
    const trimmed = value.trim();
    if (trimmed.length < 2 || !trimmed.startsWith("[") || !trimmed.endsWith("]")) {
      throw new Error(`Invalid array value: ${value}`);
    }

    const content = trimmed.slice(1, -1).trim();
    if (content.length === 0) {
      return [];
    }

    const result: string[] = [];
    let depth = 0;
    let angleDepth = 0;
    let current = "";

    for (const ch of content) {
      if (ch === "[") depth++;
      else if (ch === "]") depth--;
      else if (ch === "<") angleDepth++;
      else if (ch === ">") angleDepth--;

      if (ch === "," && depth === 0 && angleDepth === 0) {
        const item = current.trim();
        if (item.length > 0) {
          result.push(item);
        }
        current = "";
      } else {
        current += ch;
      }
    }

    const last = current.trim();
    if (last.length > 0) {
      result.push(last);
    }

    return result;
  }

  private static parseSingleValue(type: FieldType, value: string): unknown {
    const text = value.trim();
    if (text.length === 0) {
      return null;
    }

    switch (type) {
      case FieldType.Int:
        return this.parseInteger(text, value, "int");
      case FieldType.Long:
        return this.parseInteger(text, value, "long");
      case FieldType.Float:
        return this.parseNumber(text, value, "float");
      case FieldType.Double:
        return this.parseNumber(text, value, "double");
      case FieldType.String:
        return text.replace(/^\"|\"$/g, "");
      case FieldType.Bool:
        if (text.toLowerCase() !== "true" && text.toLowerCase() !== "false") {
          throw new Error(`Invalid bool value: ${value}`);
        }
        return text.toLowerCase() === "true";
      case FieldType.Pair:
        return this.parsePair(text);
      default:
        throw new Error(`Unsupported field type: ${type}`);
    }
  }

  private static parsePair(value: string): PairValue {
    const match = value.match(/^<\s*([^,]+)\s*,\s*([^>]+)\s*>$/);
    if (!match) {
      throw new Error(`Invalid pair value: ${value}`);
    }

    const key = this.parseNumber(match[1].trim(), value, "pair key");
    const pairValue = this.parseNumber(match[2].trim(), value, "pair value");
    return { key, value: pairValue };
  }

  private static parseInteger(text: string, original: string, type: string): number {
    if (!/^[+-]?\d+$/.test(text)) {
      throw new Error(`Invalid ${type} value: ${original}`);
    }

    const result = Number(text);
    if (!Number.isSafeInteger(result)) {
      throw new Error(`${type} value is outside the safe integer range: ${original}`);
    }
    return result;
  }

  private static parseNumber(text: string, original: string, type: string): number {
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) {
      throw new Error(`Invalid ${type} value: ${original}`);
    }

    const result = Number(text);
    if (!Number.isFinite(result)) {
      throw new Error(`Invalid ${type} value: ${original}`);
    }
    return result;
  }
}
