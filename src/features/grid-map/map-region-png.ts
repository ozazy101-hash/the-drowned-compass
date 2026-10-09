import type { MapRegion } from '../../domain/map-region';

// Client-only lossless PNG handling. Canvas decoding would premultiply transparent pixels.
// The server independently decodes and checks the complete assembled image against its proof.
const side = 1024, limit = 20 * 1024 * 1024;
const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  return value >>> 0;
});
function crc(bytes: Uint8Array) {
  let value = 0xffffffff;
  for (const byte of bytes) value = (value >>> 8) ^ crcTable[(value ^ byte) & 255];
  return (value ^ 0xffffffff) >>> 0;
}
function paeth(a: number, b: number, c: number) {
  const p = a + b - c, x = Math.abs(p - a), y = Math.abs(p - b), z = Math.abs(p - c);
  return x <= y && x <= z ? a : y <= z ? b : c;
}
async function decode(blob: Blob) {
  if (blob.size > limit || blob.size < 33) throw new Error('AI revisions require PNG up to 20 MiB.');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (bytes.subarray(0, 8).join(',') !== '137,80,78,71,13,10,26,10') throw new Error('AI revisions require 1024 × 1024 RGB/RGBA8 non-interlaced PNG.');
  const view = new DataView(bytes.buffer);
  let channels = 0, ended = false, hasData = false, dataEnded = false;
  const parts: Uint8Array<ArrayBuffer>[] = [];
  for (let offset = 8; offset < bytes.length;) {
    if (offset + 12 > bytes.length) throw new Error('Truncated PNG.');
    const size = view.getUint32(offset), end = offset + size + 12;
    if (end > bytes.length) throw new Error('Truncated PNG.');
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    const body = bytes.subarray(offset + 8, end - 4);
    if (!/^[A-Za-z]{4}$/.test(type) || type[2] !== type[2].toUpperCase() || crc(bytes.subarray(offset + 4, end - 4)) !== view.getUint32(end - 4)) throw new Error('Invalid PNG chunk.');
    if (!channels && type !== 'IHDR') throw new Error('PNG header missing.');
    if (type === 'IHDR') {
      if (channels || size !== 13 || view.getUint32(offset + 8) !== side || view.getUint32(offset + 12) !== side || body[8] !== 8 || ![2, 6].includes(body[9]) || body[10] || body[11] || body[12]) throw new Error('AI revisions require 1024 × 1024 RGB/RGBA8 non-interlaced PNG.');
      channels = body[9] === 6 ? 4 : 3;
    } else if (type === 'IDAT') {
      if (dataEnded) throw new Error('Invalid PNG data order.');
      hasData = true; parts.push(body);
    } else if (type === 'IEND') {
      if (size || !hasData || end !== bytes.length) throw new Error('Invalid PNG end.');
      ended = true;
    } else {
      if (hasData) dataEnded = true;
      if (['PLTE', 'tRNS', 'acTL', 'fcTL', 'fdAT'].includes(type) || type[0] === type[0].toUpperCase()) throw new Error('Unsupported PNG encoding.');
    }
    offset = end;
  }
  if (!ended) throw new Error('PNG end missing.');
  const stride = side * channels, raw = new Uint8Array((stride + 1) * side);
  const compressed = new Blob(parts).stream().pipeThrough(new DecompressionStream('deflate'));
  const reader = compressed.getReader(); let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      if (value.length > raw.length - length) { await reader.cancel(); throw new Error('PNG decoded size exceeds bound.'); }
      raw.set(value, length); length += value.length;
    }
  } finally { reader.releaseLock(); }
  if (length !== raw.length) throw new Error('Invalid PNG decoded size.');
  const scan = new Uint8Array(stride * side);
  for (let y = 0; y < side; y++) {
    const start = y * (stride + 1), filter = raw[start];
    if (filter > 4) throw new Error('Invalid PNG filter.');
    if (filter === 0) { scan.set(raw.subarray(start + 1, start + 1 + stride), y * stride); continue; }
    for (let x = 0; x < stride; x++) {
      const i = y * stride + x, a = x >= channels ? scan[i - channels] : 0, b = y ? scan[i - stride] : 0, c = y && x >= channels ? scan[i - stride - channels] : 0;
      scan[i] = (raw[start + 1 + x] + (filter === 1 ? a : filter === 2 ? b : filter === 3 ? (a + b) >> 1 : paeth(a, b, c))) & 255;
    }
  }
  if (channels === 4) return scan;
  const rgba = new Uint8Array(side * side * 4);
  for (let i = 0; i < side * side; i++) { rgba.set(scan.subarray(i * 3, i * 3 + 3), i * 4); rgba[i * 4 + 3] = 255; }
  return rgba;
}
function chunk(type: string, body: Uint8Array) {
  const bytes = new Uint8Array(body.length + 12), view = new DataView(bytes.buffer);
  view.setUint32(0, body.length); bytes.set([...type].map(c => c.charCodeAt(0)), 4); bytes.set(body, 8);
  view.setUint32(bytes.length - 4, crc(bytes.subarray(4, bytes.length - 4)));
  return bytes;
}
function encode(rgba: Uint8Array) {
  const stride = side * 4, raw = new Uint8Array((stride + 1) * side);
  for (let y = 0; y < side; y++) raw.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  // Stored deflate blocks bound encoded size and keep all RGBA bytes, including alpha-zero RGB.
  const blocks = Math.ceil(raw.length / 65535), deflate = new Uint8Array(2 + raw.length + blocks * 5 + 4);
  deflate.set([0x78, 0x01]); let output = 2;
  for (let start = 0; start < raw.length; start += 65535) {
    const length = Math.min(65535, raw.length - start), inverse = (~length) & 65535;
    deflate.set([start + length === raw.length ? 1 : 0, length & 255, length >>> 8, inverse & 255, inverse >>> 8], output); output += 5;
    deflate.set(raw.subarray(start, start + length), output); output += length;
  }
  let a = 1, b = 0;
  for (const byte of raw) { a = (a + byte) % 65521; b = (b + a) % 65521; }
  new DataView(deflate.buffer).setUint32(output, ((b << 16) | a) >>> 0);
  const header = new Uint8Array(13), view = new DataView(header.buffer);
  view.setUint32(0, side); view.setUint32(4, side); header[8] = 8; header[9] = 6;
  return new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflate), chunk('IEND', new Uint8Array())], { type: 'image/png' });
}
/** One bounded replacement. No browser digest or assertion can grant registration. */
export async function assembleRegionPng(source: Blob, candidate: Blob, region: MapRegion): Promise<Blob> {
  if (!['x', 'y', 'width', 'height'].every(k => Number.isInteger(region[k as keyof MapRegion])) || region.x < 0 || region.y < 0 || region.width < 1 || region.height < 1 || region.x + region.width > side || region.y + region.height > side) throw new Error('Invalid revision area.');
  const rgba = await decode(source), replacement = await decode(candidate);
  for (let y = region.y; y < region.y + region.height; y++) {
    const offset = (y * side + region.x) * 4;
    rgba.set(replacement.subarray(offset, offset + region.width * 4), offset);
  }
  return encode(rgba);
}
