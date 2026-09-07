#!/usr/bin/env python3
"""Generate the PWA icon set for Dopa News.

Run with `python3 scripts/generate-icons.py` after changing the brand colours.
Requires Pillow (`pip install pillow`).
"""

from __future__ import annotations

import os

from PIL import Image, ImageDraw, ImageFilter

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "icons")

BG_TOP = (12, 18, 30)
BG_BOTTOM = (5, 8, 14)
NEON = (78, 245, 163)
CYAN = (53, 220, 255)
PURPLE = (169, 139, 255)

# Lightning bolt in a 0..1 coordinate space; the "intellectual dopamine" mark.
BOLT = [
    (0.575, 0.10),
    (0.275, 0.545),
    (0.455, 0.545),
    (0.395, 0.90),
    (0.725, 0.435),
    (0.535, 0.435),
]


def lerp(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))  # type: ignore[return-value]


def draw_icon(size: int, padding: float, rounded: bool) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Vertical background gradient.
    plate = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    plate_draw = ImageDraw.Draw(plate)
    for y in range(size):
        plate_draw.line([(0, y), (size, y)], fill=(*lerp(BG_TOP, BG_BOTTOM, y / size), 255))

    if rounded:
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            [0, 0, size - 1, size - 1], radius=round(size * 0.235), fill=255
        )
        plate.putalpha(mask)

    img.alpha_composite(plate)

    # Soft neon halo behind the bolt.
    halo = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(halo).ellipse(
        [size * 0.18, size * 0.16, size * 0.82, size * 0.84], fill=(*CYAN, 70)
    )
    img.alpha_composite(halo.filter(ImageFilter.GaussianBlur(size * 0.09)))

    inset = size * padding
    span = size - inset * 2
    points = [(inset + x * span, inset + y * span) for x, y in BOLT]

    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(glow).polygon(points, fill=(*NEON, 190))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(size * 0.035)))

    # Gradient-filled bolt: neon at the top fading to purple at the bottom.
    bolt = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bolt_mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(bolt_mask).polygon(points, fill=255)
    gradient = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gradient_draw = ImageDraw.Draw(gradient)
    # The ramp spans the bolt itself, not the canvas, so every icon size shows
    # the full neon → cyan → purple sweep.
    top = min(p[1] for p in points)
    bottom = max(p[1] for p in points)
    for y in range(size):
        t = min(1.0, max(0.0, (y - top) / (bottom - top)))
        color = lerp(NEON, CYAN, t / 0.55) if t < 0.55 else lerp(CYAN, PURPLE, (t - 0.55) / 0.45)
        gradient_draw.line([(0, y), (size, y)], fill=(*color, 255))
    bolt.paste(gradient, (0, 0), bolt_mask)
    img.alpha_composite(bolt)

    del draw
    return img


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    targets = [
        ("icon-192.png", 192, 0.14, True),
        ("icon-512.png", 512, 0.14, True),
        # Maskable icons need extra padding so the safe zone survives cropping.
        ("maskable-512.png", 512, 0.26, False),
        ("apple-touch-icon.png", 180, 0.14, False),
    ]
    for name, size, padding, rounded in targets:
        icon = draw_icon(size, padding, rounded)
        icon.save(os.path.join(OUT_DIR, name), "PNG")
        print("wrote", name)


if __name__ == "__main__":
    main()
