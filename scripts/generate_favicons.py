"""Generate orbital favicon assets with Python's standard library only.

Run from anywhere: python scripts/generate_favicons.py
The SVG is the hand-authored vector counterpart of this raster artwork.
"""

import math
from pathlib import Path
import struct
import zlib


OUTPUT = Path(__file__).resolve().parent.parent / 'public'
BACKGROUND = (11, 16, 32)
BLUE = (58, 98, 152)
WHITE = (229, 231, 235)
CYAN = (99, 245, 255)


def color_at(x, y, angle):
    # A rounded 64px tile, a restrained orbital ring, and a bold lowercase b.
    dx = max(abs(x - 32) - 17, 0)
    dy = max(abs(y - 32) - 17, 0)
    if dx * dx + dy * dy > 15 * 15:
        return None
    color = BACKGROUND
    if abs(math.hypot(x - 32, y - 32) - 25) <= 1:
        color = BLUE
    stem = math.hypot(x - 25, y - min(44, max(17, y))) <= 2.5
    bowl = abs(math.hypot(x - 34, y - 35.5) - 9) <= 2.5
    if stem or bowl:
        color = WHITE
    orb_x = 32 + 25 * math.sin(angle)
    orb_y = 32 - 25 * math.cos(angle)
    if math.hypot(x - orb_x, y - orb_y) <= 4:
        color = CYAN
    return color


def render(size, angle=0):
    pixels = bytearray()
    for y in range(size):
        for x in range(size):
            samples = [color_at((x + (sx + .5) / 4) * 64 / size,
                                (y + (sy + .5) / 4) * 64 / size, angle)
                       for sy in range(4) for sx in range(4)]
            visible = [color for color in samples if color is not None]
            if not visible:
                pixels.extend((0, 0, 0, 0))
            else:
                pixels.extend(round(sum(color[c] for color in visible) / len(visible))
                              for c in range(3))
                pixels.append(round(255 * len(visible) / 16))
    return bytes(pixels)


def png(size, pixels):
    def chunk(kind, data):
        return (struct.pack('>I', len(data)) + kind + data
                + struct.pack('>I', zlib.crc32(kind + data)))
    rows = b''.join(b'\0' + pixels[y * size * 4:(y + 1) * size * 4]
                    for y in range(size))
    return (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(rows, 9)) + chunk(b'IEND', b''))


def animated_gif():
    # Palette includes antialiased blends with the navy background.
    palette = [(0, 0, 0), BACKGROUND]
    for color in (BLUE, WHITE, CYAN):
        palette.extend(tuple(round(BACKGROUND[c] + (color[c] - BACKGROUND[c]) * i / 16)
                             for c in range(3)) for i in range(1, 17))
    palette.extend([BACKGROUND] * (256 - len(palette)))
    data = bytearray(b'GIF89a' + struct.pack('<HHBBB', 32, 32, 0xf7, 0, 0))
    data.extend(bytes(channel for color in palette for channel in color))
    data.extend(b'\x21\xff\x0bNETSCAPE2.0\x03\x01\x00\x00\x00')
    for frame in range(24):
        pixels = render(32, frame * math.tau / 24)
        indices = []
        for offset in range(0, len(pixels), 4):
            r, g, b, a = pixels[offset:offset + 4]
            if a < 128:
                indices.append(0)
            else:
                indices.append(min(range(1, 50), key=lambda i:
                                   sum((palette[i][c] - (r, g, b)[c]) ** 2
                                       for c in range(3))))
        # Literal LZW with frequent clears keeps all codes at nine bits.
        codes = []
        for offset in range(0, len(indices), 200):
            codes.append(256)
            codes.extend(indices[offset:offset + 200])
        codes.append(257)
        packed = bytearray()
        value = bits = 0
        for code in codes:
            value |= code << bits
            bits += 9
            while bits >= 8:
                packed.append(value & 255)
                value >>= 8
                bits -= 8
        if bits:
            packed.append(value & 255)
        # Restore the background between frames; 120ms per frame, infinite loop.
        data.extend(b'\x21\xf9\x04\x09\x0c\x00\x00\x00')
        data.extend(b'\x2c' + struct.pack('<HHHHB', 0, 0, 32, 32, 0) + b'\x08')
        for offset in range(0, len(packed), 255):
            block = packed[offset:offset + 255]
            data.append(len(block))
            data.extend(block)
        data.append(0)
    data.append(0x3b)
    return bytes(data)


def main():
    OUTPUT.mkdir(exist_ok=True)
    icon_images = [(size, png(size, render(size))) for size in (16, 32, 48)]
    offset = 6 + 16 * len(icon_images)
    ico = bytearray(struct.pack('<HHH', 0, 1, len(icon_images)))
    for size, image in icon_images:
        ico.extend(struct.pack('<BBBBHHII', size, size, 0, 0, 1, 32, len(image), offset))
        offset += len(image)
    ico.extend(b''.join(image for _, image in icon_images))
    (OUTPUT / 'favicon.ico').write_bytes(ico)
    (OUTPUT / 'favicon.png').write_bytes(png(32, render(32)))
    (OUTPUT / 'apple-touch-icon.png').write_bytes(png(180, render(180)))
    (OUTPUT / 'favicon-animated.gif').write_bytes(animated_gif())
    print('Generated ICO, PNG, Apple touch icon, and animated GIF in public/.')


if __name__ == '__main__':
    main()
