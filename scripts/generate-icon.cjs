const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Generate a 256x256 RGBA PNG buffer and wrap it into a valid Windows .ico file
const width = 256;
const height = 256;

// Create raw image scanlines (each line starts with filter byte 0)
const rawData = Buffer.alloc(height * (1 + width * 4));

for (let y = 0; y < height; y++) {
  const rowOffset = y * (1 + width * 4);
  rawData[rowOffset] = 0; // Filter type 0 (None)

  for (let x = 0; x < width; x++) {
    const pxOffset = rowOffset + 1 + x * 4;

    // Rounded square mask (radius 48)
    const cx = Math.max(48, Math.min(width - 49, x));
    const cy = Math.max(48, Math.min(height - 49, y));
    const distCorner = Math.hypot(x - cx, y - cy);

    if (distCorner > 48) {
      // Transparent outside rounded rect
      rawData[pxOffset] = 0;
      rawData[pxOffset + 1] = 0;
      rawData[pxOffset + 2] = 0;
      rawData[pxOffset + 3] = 0;
      continue;
    }

    // Dark neon background (#0a0614) with gradient border & glowing "N"
    const isBorder = distCorner > 40 || x < 10 || x > width - 11 || y < 10 || y > height - 11;
    const t = (x + y) / (width + height); // 0..1 diagonal gradient from purple (#c026d3) to cyan (#06b6d4)

    const gradR = Math.round(192 * (1 - t) + 6 * t);
    const gradG = Math.round(38 * (1 - t) + 182 * t);
    const gradB = Math.round(211 * (1 - t) + 212 * t);

    // Draw a stylized glowing "N" in the center
    const inLeftBar = x >= 64 && x <= 92 && y >= 60 && y <= 196;
    const inRightBar = x >= 164 && x <= 192 && y >= 60 && y <= 196;
    const diagExpectedX = 64 + ((y - 60) / (196 - 60)) * (164 - 64);
    const inDiag = y >= 60 && y <= 196 && Math.abs(x - diagExpectedX) <= 15;

    if (inLeftBar || inRightBar || inDiag || isBorder) {
      rawData[pxOffset] = gradR;
      rawData[pxOffset + 1] = gradG;
      rawData[pxOffset + 2] = gradB;
      rawData[pxOffset + 3] = 255;
    } else {
      // Ambient inner glow
      rawData[pxOffset] = Math.round(12 + gradR * 0.12);
      rawData[pxOffset + 1] = Math.round(8 + gradG * 0.12);
      rawData[pxOffset + 2] = Math.round(24 + gradB * 0.16);
      rawData[pxOffset + 3] = 255;
    }
  }
}

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ crcTable[(c ^ buf[i]) & 0xff];
  }
  return (c ^ -1) >>> 0;
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

const pngSig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0);
ihdr.writeUInt32BE(height, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const compressed = zlib.deflateSync(rawData);
const pngBuf = Buffer.concat([
  pngSig,
  makeChunk('IHDR', ihdr),
  makeChunk('IDAT', compressed),
  makeChunk('IEND', Buffer.alloc(0)),
]);

// Wrap PNG inside ICO header
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0); // Reserved
icoHeader.writeUInt16LE(1, 2); // Type 1 = ICO
icoHeader.writeUInt16LE(1, 4); // 1 image

const icoDir = Buffer.alloc(16);
icoDir[0] = 0; // 0 means 256 width
icoDir[1] = 0; // 0 means 256 height
icoDir[2] = 0; // Palette
icoDir[3] = 0; // Reserved
icoDir.writeUInt16LE(1, 4); // Color planes
icoDir.writeUInt16LE(32, 6); // Bits per pixel
icoDir.writeUInt32LE(pngBuf.length, 8); // Size of PNG data
icoDir.writeUInt32LE(22, 12); // Offset (6 + 16)

const icoBuf = Buffer.concat([icoHeader, icoDir, pngBuf]);

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(path.join(publicDir, 'neon-icon.ico'), icoBuf);
fs.writeFileSync(path.join(publicDir, 'neon-icon.png'), pngBuf);
console.log('Generated neon-icon.ico and neon-icon.png successfully!');
