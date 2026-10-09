import { test, expect } from '@playwright/test';
import { deflateSync } from 'node:zlib';
import { createGridMapEditor, fitMapBackground, placeMapBackground } from '../src/domain/grid-map';
import { selectMapArea } from '../src/domain/map-region';
import { assembleRegionPng } from '../src/features/grid-map/map-region-png';
import { decode } from '../supabase/functions/map-generation/verifier/png.mjs';

const document = createGridMapEditor({ columns: 24, rows: 18 }).snapshot().document;
const placement = placeMapBackground(document, fitMapBackground(document, 1024, 1024), .5, 2, 3);
test('saved aligned selection maps reverse drags to enclosing immutable pixel bounds', () => {
  const selection = selectMapArea(document, placement, { x: 8.75, y: 9.75 }, { x: 4.25, y: 5.25 });
  expect(selection.pixels).toEqual({ x: 256, y: 256, width: 512, height: 512 });
  expect(selection.logical).toEqual({ x: 4.25, y: 5.25, width: 4.5, height: 4.5 });
  expect(Object.isFrozen(selection.pixels)).toBe(true);
});
test('selection rejects empty, nonfinite and out-of-artwork gestures without clipping', () => {
  for (const end of [{ x: 2, y: 3 }, { x: 1.9, y: 4 }, { x: 12, y: 4 }, { x: 4, y: Infinity }, { x: NaN, y: 4 }]) expect(() => selectMapArea(document, placement, { x: 2, y: 3 }, end)).toThrow();
  expect(selectMapArea(document, placement, { x: 2, y: 3 }, { x: 11, y: 12 }).pixels).toEqual({ x: 0, y: 0, width: 1024, height: 1024 });
});
function crc(bytes: Uint8Array) {
  let value = 0xffffffff;
  for (const byte of bytes) { value ^= byte; for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0); }
  return (value ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Uint8Array) {
  const out = Buffer.alloc(data.length + 12); out.writeUInt32BE(data.length); out.write(type, 4); out.set(data, 8); out.writeUInt32BE(crc(out.subarray(4, -4)), out.length - 4); return out;
}
function fixture(channels: 3 | 4, seed: number, width = 1024) {
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(1024, 4); header[8] = 8; header[9] = channels === 3 ? 2 : 6;
  const raw = Buffer.alloc((width * channels + 1) * 1024);
  for (let y = 0; y < 1024; y++) for (let x = 0; x < width; x++) {
    const i = y * (width * channels + 1) + 1 + x * channels;
    raw[i] = (x + seed) & 255; raw[i + 1] = (y + seed) & 255; raw[i + 2] = (x ^ y ^ seed) & 255;
    if (channels === 4) raw[i + 3] = (x + y) % 3 === 0 ? 0 : (x + y) & 255;
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
for (const channels of [3, 4] as const) test(`lossless browser assembly preserves all outside and candidate inside pixels for ${channels === 3 ? 'RGB' : 'transparent RGBA'}`, async () => {
  const source = fixture(channels, 17), candidate = fixture(4, 199), region = { x: 17, y: 203, width: 200, height: 211 };
  const output = await assembleRegionPng(new Blob([source]), new Blob([candidate]), region);
  const original = await decode(new Uint8Array(source)), replacement = await decode(new Uint8Array(candidate)), accepted = await decode(new Uint8Array(await output.arrayBuffer()));
  let inside = 0, outside = 0, mismatches = 0;
  for (let y = 0; y < 1024; y++) for (let x = 0; x < 1024; x++) {
    const selected = x >= region.x && x < region.x + region.width && y >= region.y && y < region.y + region.height;
    if (selected) inside++; else outside++;
    const expected = selected ? replacement : original, offset = (y * 1024 + x) * 4;
    for (let channel = 0; channel < 4; channel++) if (accepted[offset + channel] !== expected[offset + channel]) mismatches++;
  }
  expect({ inside, outside, mismatches }).toEqual({ inside: 42200, outside: 1006376, mismatches: 0 });
  expect(output.size).toBeLessThan(20 * 1024 * 1024);
});
test('assembly rejects dimension mismatch, CRC damage, oversized files and invalid region', async () => {
  const source = fixture(4, 17), candidate = fixture(4, 22), region = { x: 0, y: 0, width: 100, height: 100 };
  const corrupt = Buffer.from(source); corrupt[50] ^= 1;
  for (const bad of [fixture(4, 22, 512), corrupt, Buffer.alloc(20 * 1024 * 1024 + 1)]) await expect(assembleRegionPng(new Blob([source]), new Blob([bad]), region)).rejects.toThrow();
  for (const bad of [{ ...region, width: 0 }, { ...region, x: -1 }, { ...region, width: 1025 }, { ...region, x: .1 }]) await expect(assembleRegionPng(new Blob([source]), new Blob([candidate]), bad)).rejects.toThrow();
});

test('fractional boundary selection quantizes to one source pixel and rejects lost far-edge precision', () => {
  const pixel=placement.width/1024;
  expect(selectMapArea(document,placement,{x:placement.x+pixel*.1,y:placement.y+pixel*.1},{x:placement.x+pixel*.9,y:placement.y+pixel*.9}).pixels).toEqual({x:0,y:0,width:1,height:1});
  expect(selectMapArea(document,placement,{x:placement.x+placement.width-pixel*.9,y:placement.y+placement.height-pixel*.9},{x:placement.x+placement.width,y:placement.y+placement.height}).pixels).toEqual({x:1023,y:1023,width:1,height:1});
});
