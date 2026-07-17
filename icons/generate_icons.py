"""
Regenerates icon16/32/48/128.png for Slate Focus.

Concept: a single rounded "slate tile" (charcoal) with one bright band
across it -- a literal picture of what the extension does (dims everything
except a spotlight band). Run with: python3 generate_icons.py
Requires Pillow (pip install pillow).
"""

from PIL import Image, ImageDraw

CHARCOAL = (92, 96, 103, 255)  # lightened from (58,61,66) -- the darker tone read as almost the same gray as Chrome's own toolbar chrome, so the tile lost its edges against the browser UI
AMBER = (224, 169, 74, 255)
SS = 8  # supersample factor, then downsize with LANCZOS for smooth edges


def make_focus_icon(size):
    S = size * SS
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    radius = round(0.203 * S)
    d.rounded_rectangle([0, 0, S - 1, S - 1], radius=radius, fill=CHARCOAL)

    band_y = round(0.391 * S)
    band_h = round(0.219 * S)

    # Mask the band to the tile's rounded shape so it doesn't spill past
    # the rounded corners.
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=radius, fill=255)

    band_layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(band_layer).rectangle([0, band_y, S, band_y + band_h], fill=AMBER)

    band_masked = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    band_masked.paste(band_layer, (0, 0), mask)
    img.alpha_composite(band_masked)

    return img.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    for size in [16, 32, 48, 128]:
        make_focus_icon(size).save(f"icon{size}.png")
        print(f"icon{size}.png regenerated")
