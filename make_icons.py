#!/usr/bin/env python3
"""Generate moodmap PNG icons — no external dependencies."""
import os, struct, zlib, math

def make_png(size):
    # Purple rounded square: #7c6af7
    r0, g0, b0 = 124, 106, 247
    # Lighter center dot: white
    cx = cy = (size - 1) / 2.0
    radius  = size * 0.44   # outer circle radius
    dot_r   = size * 0.14   # inner white dot

    rows = []
    for y in range(size):
        row = bytearray([0])   # PNG filter: None
        for x in range(size):
            dx   = x - cx
            dy   = y - cy
            dist = math.hypot(dx, dy)

            if dist > radius + 0.8:
                row += bytearray([0, 0, 0, 0])   # transparent outside
                continue

            # Anti-alias outer edge
            alpha = min(1.0, (radius + 0.8 - dist) / 1.2)

            # White centre dot
            if dist < dot_r:
                t  = max(0.0, 1.0 - dist / dot_r)
                pr = int(r0 + (255 - r0) * t)
                pg = int(g0 + (255 - g0) * t)
                pb = int(b0 + (255 - b0) * t)
            else:
                pr, pg, pb = r0, g0, b0

            row += bytearray([pr, pg, pb, int(alpha * 255)])
        rows.append(bytes(row))

    raw        = b''.join(rows)
    compressed = zlib.compress(raw, 9)

    def chunk(tag, data):
        body = tag + data
        return struct.pack('>I', len(data)) + body + struct.pack('>I', zlib.crc32(body) & 0xffffffff)

    sig  = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
    idat = chunk(b'IDAT', compressed)
    iend = chunk(b'IEND', b'')
    return sig + ihdr + idat + iend

os.makedirs('icons', exist_ok=True)
for sz in [16, 32, 48, 128]:
    path = f'icons/icon{sz}.png'
    with open(path, 'wb') as f:
        f.write(make_png(sz))
    print(f'  {path}')
print('Done.')
