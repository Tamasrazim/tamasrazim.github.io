#!/usr/bin/env python3
"""Generate TRILYVA's monochrome PNG and ICO using only Python standard library."""
import math
import os
import struct
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
os.makedirs(ASSETS, exist_ok=True)
SIZE = 256
pixels = bytearray()
for y in range(SIZE):
    for x in range(SIZE):
        dx = min(x, SIZE - 1 - x)
        dy = min(y, SIZE - 1 - y)
        radius = 48
        corner_distance = math.hypot(max(0, radius - dx), max(0, radius - dy))
        inside = dx >= radius or dy >= radius or corner_distance <= radius
        shade = int(15 + 12 * (1 - y / (SIZE - 1)) + 3 * (1 - x / (SIZE - 1)))
        r = g = b = shade if inside else 0
        in_bar = 111 <= x <= 144 and 60 <= y <= 202
        in_cap = 55 <= x <= 200 and 60 <= y <= 91
        if in_bar or in_cap:
            r = g = b = 248
        radius_from_center = math.hypot(x - 128, y - 128)
        if abs(radius_from_center - 106) <= 1 and not (in_bar or in_cap):
            r = g = b = max(r, 70)
        pixels.extend((r, g, b, 255))

def png_chunk(kind, data):
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xffffffff)

raw = bytearray()
for y in range(SIZE):
    raw.append(0)
    raw.extend(pixels[y * SIZE * 4:(y + 1) * SIZE * 4])
png = (
    b"\x89PNG\r\n\x1a\n"
    + png_chunk(b"IHDR", struct.pack(">IIBBBBB", SIZE, SIZE, 8, 6, 0, 0, 0))
    + png_chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    + png_chunk(b"IEND", b"")
)
png_path = os.path.join(ASSETS, "trilyva.png")
ico_path = os.path.join(ASSETS, "trilyva.ico")
with open(png_path, "wb") as stream:
    stream.write(png)
header = struct.pack("<HHH", 0, 1, 1)
entry = struct.pack("<BBBBHHII", 0, 0, 0, 0, 1, 32, len(png), 22)
with open(ico_path, "wb") as stream:
    stream.write(header + entry + png)
print("Generated", png_path, "and", ico_path)
