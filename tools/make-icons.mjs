// Generates the app icons as PNGs with no external dependencies.
// The mark is a forged byte: eight lit cells in a 4x2 grid = 11111111.
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.join(import.meta.dirname, '..', 'icons');

const BG    = [0x0b, 0x0e, 0x14];
const PANEL = [0x12, 0x17, 0x22];
const GOLD  = [0xff, 0xd1, 0x66];
const EDGE  = [0x23, 0x2b, 0x3d];

const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
const crc32 = buf => {
  let c = -1;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
function encodePNG(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Signed distance to a rounded rectangle; negative inside.
const sdRoundRect = (px, py, cx, cy, hw, hh, r) => {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};

/**
 * @param size    output edge length in pixels
 * @param inset   fraction of the canvas kept clear on every side. Maskable icons
 *                need the mark inside the safe zone so platform masks can crop.
 * @param rounded whether the backplate is a rounded square or fills the canvas
 */
function draw(size, { inset = 0, rounded = true } = {}) {
  const SS = 4; // supersample factor for antialiasing
  const N = size * SS;
  const buf = Buffer.alloc(size * size * 4);
  const acc = new Float32Array(size * size * 4);

  const pad = N * inset;
  const plateHalf = (N - pad * 2) / 2;
  const cx = N / 2, cy = N / 2;
  const plateR = rounded ? plateHalf * 0.235 : 0;

  // Eight bit-cells in a 4x2 grid, centered on the plate.
  const cols = 4, rows = 2;
  const gridW = plateHalf * 2 * 0.68;
  const gap = gridW * 0.085;
  const cell = (gridW - gap * (cols - 1)) / cols;
  const gridH = cell * rows + gap * (rows - 1);
  const x0 = cx - gridW / 2, y0 = cy - gridH / 2;
  const cellR = cell * 0.26;

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const px = x + 0.5, py = y + 0.5;
      let col = null, a = 0;

      const dPlate = rounded
        ? sdRoundRect(px, py, cx, cy, plateHalf, plateHalf, plateR)
        : Math.max(Math.abs(px - cx) - N / 2, Math.abs(py - cy) - N / 2);
      if (dPlate < 0.5) {
        // Subtle vertical lift so the plate does not read as flat black.
        const t = Math.min(1, Math.max(0, (py / N) * 0.9));
        col = PANEL.map((c, i) => c + (BG[i] - c) * t);
        a = Math.min(1, 0.5 - dPlate);
        // Hairline border, matching the board's panel edge.
        if (dPlate > -Math.max(1, N * 0.006)) col = EDGE.slice();
      }

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const bx = x0 + c * (cell + gap) + cell / 2;
          const by = y0 + r * (cell + gap) + cell / 2;
          const d = sdRoundRect(px, py, bx, by, cell / 2, cell / 2, cellR);
          if (d < 0.5) {
            const ca = Math.min(1, 0.5 - d);
            if (ca > 0) {
              const base = col || [0, 0, 0];
              col = GOLD.map((g, i) => base[i] + (g - base[i]) * ca);
              a = Math.max(a, ca);
            }
          }
        }
      }

      if (!col) continue;
      const oy = (y / SS) | 0, ox = (x / SS) | 0;
      const o = (oy * size + ox) * 4;
      acc[o] += col[0] * a; acc[o + 1] += col[1] * a; acc[o + 2] += col[2] * a; acc[o + 3] += a;
    }
  }

  const per = SS * SS;
  for (let i = 0; i < size * size; i++) {
    const a = acc[i * 4 + 3] / per;
    buf[i * 4 + 3] = Math.round(Math.min(1, a) * 255);
    for (let k = 0; k < 3; k++) {
      buf[i * 4 + k] = a > 0 ? Math.round(Math.min(255, acc[i * 4 + k] / per / a)) : 0;
    }
  }
  return encodePNG(size, size, buf);
}

const targets = [
  ['icon-192.png',           192, { inset: 0.02 }],
  ['icon-512.png',           512, { inset: 0.02 }],
  ['icon-maskable-512.png',  512, { inset: 0.14, rounded: false }],
  ['apple-touch-icon.png',   180, { inset: 0,    rounded: false }],
];
fs.mkdirSync(OUT, { recursive: true });
for (const [name, size, opts] of targets) {
  const png = draw(size, opts);
  fs.writeFileSync(path.join(OUT, name), png);
  console.log(`${name.padEnd(24)} ${size}x${size}  ${png.length} bytes`);
}
