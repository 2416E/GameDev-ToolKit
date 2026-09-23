import { Buffer } from "node:buffer";

export class BinaryBufferWriter {
  private chunks: Buffer[] = [];

  writeUInt8(value: number): void {
    const buf = Buffer.allocUnsafe(1);
    buf.writeUInt8(value);
    this.chunks.push(buf);
  }

  writeBool(value: boolean): void {
    this.writeUInt8(value ? 1 : 0);
  }

  writeInt32(value: number): void {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(value);
    this.chunks.push(buf);
  }

  writeUInt32(value: number): void {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32LE(value >>> 0);
    this.chunks.push(buf);
  }

  writeInt64(value: number): void {
    const buf = Buffer.allocUnsafe(8);
    buf.writeBigInt64LE(BigInt(Math.trunc(value)));
    this.chunks.push(buf);
  }

  writeFloat32(value: number): void {
    const buf = Buffer.allocUnsafe(4);
    buf.writeFloatLE(value);
    this.chunks.push(buf);
  }

  writeFloat64(value: number): void {
    const buf = Buffer.allocUnsafe(8);
    buf.writeDoubleLE(value);
    this.chunks.push(buf);
  }

  writeString(value: string): void {
    if (!value) {
      this.writeInt32(0);
      return;
    }

    const bytes = Buffer.from(value, "utf8");
    this.writeInt32(bytes.length);
    this.chunks.push(bytes);
  }

  toBuffer(): Buffer {
    return Buffer.concat(this.chunks);
  }
}
