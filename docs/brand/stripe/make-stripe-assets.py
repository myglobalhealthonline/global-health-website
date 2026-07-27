"""Build transparent-background Stripe branding assets from the GH brand logos.

Two traps in this particular logo, both of which a naive "make white
transparent" walks straight into:

1. The ECG trace inside the globe is white, and so are the globe's grid lines.
   Keying every white pixel guts the mark.
2. The grid lines TOUCH the outer white background at the globe's edge, so even
   a flood fill from the border leaks inward along them and hollows the globe
   out. You only see this once the result sits on a non-white background.

So: flood-fill inward from the border (never crossing solid artwork), then
restore any cleared pixel that falls inside the globe -- located as the convex
span of the lime pixels, which excludes the dark ECG tail hanging off to the
left. Edges are feathered by distance-to-key-colour rather than hard-keyed, to
avoid a coloured halo.

Outputs go to docs/brand/stripe/ plus a preview sheet showing each asset on the
brand forest, on white, and at true Checkout size.
"""

from collections import deque
from pathlib import Path

from PIL import Image

REPO = Path(r"C:\Users\nauma\Desktop\Global Website\global-health-website")
SRC = REPO / "docs/design-fetch/global-health-design-system/project/assets"
OUT = REPO / "docs/brand/stripe"
OUT.mkdir(parents=True, exist_ok=True)

FOREST = (29, 75, 54)  # #1D4B36 -- brand primary
LIME = (143, 176, 33)  # #8FB021 -- the globe fill

TOL_CLEAR = 45.0  # at/below this distance from key colour -> fully transparent
TOL_KEEP = 120.0  # at/above -> solid artwork, fill stops here
LIME_TOL = 90.0  # how close a pixel must be to lime to count as "globe"


def dist(a, b):
    return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2) ** 0.5


def strip_background(img):
    """Clear background-connected pixels, feathering the edge. Returns RGBA."""
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()

    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    bg = tuple(sorted(c[i] for c in corners)[1] for i in range(3))

    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))

    cleared = 0
    while q:
        x, y = q.popleft()
        idx = y * w + x
        if seen[idx]:
            continue
        seen[idx] = 1
        r, g, b, _ = px[x, y]
        d = dist((r, g, b), bg)
        if d >= TOL_KEEP:
            continue  # solid artwork -- stop, don't spread through it
        t = (d - TOL_CLEAR) / (TOL_KEEP - TOL_CLEAR)
        px[x, y] = (r, g, b, int(max(0.0, min(1.0, t)) * 255))
        cleared += 1
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx]:
                q.append((nx, ny))

    print(f"    key={bg}  cleared {cleared:,} px ({cleared / (w * h):.0%})")
    return img, bg


def restore_globe_interior(img, key):
    """Undo the fill's leak into the globe.

    The globe is the only large lime region, so its per-row horizontal span is
    a good stand-in for "inside the mark". Anything the fill cleared inside
    that span is a grid line or the ECG trace and must come back, painted the
    key colour it originally was (white grid on the light lockup).
    """
    w, h = img.size
    px = img.load()

    spans = {}
    for y in range(h):
        xs = [x for x in range(w) if dist(px[x, y][:3], LIME) < LIME_TOL]
        if xs:
            spans[y] = (min(xs), max(xs))
    if not spans:
        print("    no lime found -- skipping interior restore")
        return img

    # Column spans too: the intersection of the two keeps us off the flat
    # top/bottom chords a row-only span would wrongly include.
    col_spans = {}
    for x in range(w):
        ys = [y for y in range(h) if dist(px[x, y][:3], LIME) < LIME_TOL]
        if ys:
            col_spans[x] = (min(ys), max(ys))

    restored = 0
    for y, (x0, x1) in spans.items():
        for x in range(x0, x1 + 1):
            cs = col_spans.get(x)
            if not cs or not (cs[0] <= y <= cs[1]):
                continue
            r, g, b, a = px[x, y]
            if a < 255:
                px[x, y] = (*key, 255)
                restored += 1
    print(f"    restored {restored:,} px inside the globe")
    return img


def split_mark(img):
    """Return just the globe -- the artwork above the mark/wordmark gap.

    Takes the WIDEST band of blank rows, not the first one. The first blank row
    lands inside the globe (thin gaps sit between the grid lines near the poles)
    and lops the bottom off the mark.
    """
    w, h = img.size
    px = img.load()
    rows = [any(px[x, y][3] > 8 for x in range(w)) for y in range(h)]

    bands, start = [], None
    for y in range(h):
        if not rows[y] and start is None:
            start = y
        elif rows[y] and start is not None:
            bands.append((start, y))
            start = None
    # Drop the leading/trailing margins -- only interior gaps are candidates.
    bands = [b for b in bands if b[0] > 0]
    if not bands:
        print("    no mark/wordmark gap -- using full artwork")
        return img

    gap, resume = max(bands, key=lambda b: b[1] - b[0])
    print(f"    widest gap y={gap}..{resume} ({resume - gap}px) of {len(bands)} candidates")
    mark = img.crop((0, 0, w, gap))
    return mark.crop(mark.getbbox())


def fit_square(img, size, pad=0.10):
    inner = int(size * (1 - 2 * pad))
    art = img.copy()
    art.thumbnail((inner, inner), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(art, ((size - art.width) // 2, (size - art.height) // 2), art)
    return canvas


def fit_wide(img, width, pad=0.04):
    inner = int(width * (1 - 2 * pad))
    art = img.copy()
    art = art.resize((inner, max(1, round(art.height * inner / art.width))), Image.LANCZOS)
    margin = (width - inner) // 2
    canvas = Image.new("RGBA", (width, art.height + 2 * margin), (0, 0, 0, 0))
    canvas.paste(art, (margin, margin), art)
    return canvas


print("logo-full-color.png")
src = Image.open(SRC / "brand" / "logo-full-color.png")
print(f"    source {src.size[0]}x{src.size[1]}")
keyed, key = strip_background(src)
keyed = restore_globe_interior(keyed, key)
art = keyed.crop(keyed.getbbox())
print(f"    cropped to {art.size[0]}x{art.size[1]}")

# The wordmark and the globe's grid are forest green, so both vanish on the
# forest Checkout panel. Knock them out to white for dark surfaces: recolour
# every non-lime opaque pixel, leaving the lime globe fill alone.
dark = art.copy()
dpx = dark.load()
for y in range(dark.height):
    for x in range(dark.width):
        r, g, b, a = dpx[x, y]
        if a > 0 and dist((r, g, b), LIME) >= LIME_TOL:
            dpx[x, y] = (255, 255, 255, a)

logo = fit_wide(art, 1024)
logo.save(OUT / "gh-stripe-logo-1024.png")
print(f"    -> gh-stripe-logo-1024.png {logo.size[0]}x{logo.size[1]} (lockup, dark wordmark)")

dark_logo = fit_wide(dark, 1024)
dark_logo.save(OUT / "gh-stripe-logo-1024-on-dark.png")
print("    -> gh-stripe-logo-1024-on-dark.png (lockup, white wordmark)")

# Icon slot sits on the brand-colour panel, so the default icon is the
# white-grid globe. The forest-grid one is there for white surfaces.
icon = fit_square(split_mark(dark), 512)
icon.save(OUT / "gh-stripe-icon-512.png")
print("    -> gh-stripe-icon-512.png (globe, white grid -- for dark surfaces)")

icon_light = fit_square(split_mark(art), 512)
icon_light.save(OUT / "gh-stripe-icon-512-on-light.png")
print("    -> gh-stripe-icon-512-on-light.png (globe, forest grid -- for white surfaces)")


def split_wordmark(img):
    """The artwork BELOW the mark/wordmark gap -- mirror of split_mark."""
    w, h = img.size
    px = img.load()
    rows = [any(px[x, y][3] > 8 for x in range(w)) for y in range(h)]
    bands, start = [], None
    for y in range(h):
        if not rows[y] and start is None:
            start = y
        elif rows[y] and start is not None:
            bands.append((start, y))
            start = None
    bands = [b for b in bands if b[0] > 0]
    _, resume = max(bands, key=lambda b: b[1] - b[0])
    word = img.crop((0, resume, w, h))
    return word.crop(word.getbbox())


def horizontal_lockup(source, height=256, gap_ratio=0.10):
    """Globe left, wordmark right, vertically centred.

    Stripe renders the Checkout header logo around 44px tall. The stacked
    lockup puts the wordmark at roughly a fifth of that and it turns to mush,
    so lay the two elements side by side instead -- the wordmark then gets
    most of the available height.
    """
    mark = split_mark(source)
    word = split_wordmark(source)

    m = mark.copy()
    m.thumbnail((10_000, height), Image.LANCZOS)
    # Wordmark set to ~62% of the mark's height reads as optically equal.
    w_target = int(height * 0.62)
    scale = w_target / word.height
    wm = word.resize((round(word.width * scale), w_target), Image.LANCZOS)

    gap = int(height * gap_ratio)
    total_w = m.width + gap + wm.width
    canvas = Image.new("RGBA", (total_w, height), (0, 0, 0, 0))
    canvas.paste(m, (0, (height - m.height) // 2), m)
    canvas.paste(wm, (m.width + gap, (height - wm.height) // 2), wm)
    return canvas


h_dark = horizontal_lockup(dark)
h_dark.save(OUT / "gh-stripe-logo-horizontal-on-dark.png")
print(f"    -> gh-stripe-logo-horizontal-on-dark.png {h_dark.size[0]}x{h_dark.size[1]}")

h_light = horizontal_lockup(art)
h_light.save(OUT / "gh-stripe-logo-horizontal.png")
print(f"    -> gh-stripe-logo-horizontal.png {h_light.size[0]}x{h_light.size[1]}")

# --- preview sheet -----------------------------------------------------------
from PIL import ImageDraw, ImageFont


def font(size):
    for name in ("segoeui.ttf", "arial.ttf", "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


tiles, pad = [], 40
for label, im, bgname, bg in (
    ("icon-512 (white grid)", icon, "forest", FOREST),
    ("icon-512-on-light", icon_light, "white", (255, 255, 255)),
    ("logo-horizontal-on-dark", h_dark, "forest", FOREST),
    ("logo-horizontal", h_light, "white", (255, 255, 255)),
    ("logo-1024-on-dark", dark_logo, "forest", FOREST),
    ("logo-1024", logo, "white", (255, 255, 255)),
):
    cell = Image.new("RGBA", (440, 300), (*bg, 255))
    a = im.copy()
    a.thumbnail((360, 230), Image.LANCZOS)
    cell.paste(a, ((440 - a.width) // 2, (300 - a.height) // 2), a)
    tiles.append((f"{label} on {bgname}", cell))

# Mock of the actual Checkout summary panel, brand colour + logo at real size.
for label, im in (
    ("CHECKOUT: horizontal lockup", h_dark),
    ("CHECKOUT: stacked lockup", dark_logo),
):
    cell = Image.new("RGBA", (440, 300), (*FOREST, 255))
    d = ImageDraw.Draw(cell)
    a = im.copy()
    a.thumbnail((150, 44), Image.LANCZOS)
    cell.paste(a, (40, 34), a)
    d.text((40, 100), "Pay Global Health", fill=(255, 255, 255, 235), font=font(19))
    d.text((40, 138), "€45.00", fill=(255, 255, 255, 255), font=font(34))
    d.text((40, 200), "Sick Cert Online", fill=(255, 255, 255, 200), font=font(15))
    d.text((330, 200), "€45.00", fill=(255, 255, 255, 200), font=font(15))
    d.line((40, 188, 400, 188), fill=(176, 241, 34, 90), width=1)
    tiles.append((label, cell))

cols = 2
rows = (len(tiles) + cols - 1) // cols
sheet = Image.new(
    "RGBA",
    (cols * 440 + pad * (cols + 1), rows * 340 + pad),
    (245, 245, 245, 255),
)
d = ImageDraw.Draw(sheet)
for i, (label, cell) in enumerate(tiles):
    cx, cy = i % cols, i // cols
    x, y = pad + cx * (440 + pad), pad + cy * 340
    sheet.paste(cell, (x, y))
    d.text((x, y + 306), label, fill=(60, 60, 60, 255), font=font(16))
sheet.save(OUT / "_preview.png")
print(f"\nPreview: {OUT / '_preview.png'}")
