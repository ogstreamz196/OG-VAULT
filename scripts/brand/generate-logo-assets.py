# Regenerates every 0G VAULT logo asset (Android icons, splashes, Fire TV banners, favicon,
# web logo, sign-in wallpaper) from one master image. Usage: python3 scripts/brand/generate-logo-assets.py scripts/brand/og-vault-logo-source.png .
import sys, os
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import numpy as np

src, repo = sys.argv[1], sys.argv[2]
RES = os.path.join(repo, "android/app/src/main/res")
TILE = (0x04, 0x07, 0x14)

art = Image.open(src).convert("RGB")
# Square without cropping: extend the short side with the artwork's own edge pixels.
w, h = art.size
side = max(w, h)
a = np.array(art)
px, py = (side - w), (side - h)
a = np.pad(a, ((py // 2, py - py // 2), (px // 2, px - px // 2), (0, 0)), mode="edge")
master = Image.fromarray(a)

def fit(im, size):
    return im.resize((size, size), Image.LANCZOS)

def rounded_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return m

def feather_mask(size, edge):
    """Square alpha that fades to 0 over `edge` px at every border."""
    ramp = np.clip(np.minimum(np.arange(size), np.arange(size)[::-1]) / max(edge, 1), 0, 1)
    m = np.minimum.outer(ramp, ramp)
    m = m * m * (3 - 2 * m)  # smoothstep
    return Image.fromarray((m * 255).astype(np.uint8))

def save(im, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, optimize=True)

# Legacy launcher icons: full-bleed square; round variant is a circle on transparent.
for d, s in {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}.items():
    icon = fit(master, s)
    save(icon, f"{RES}/mipmap-{d}/ic_launcher.png")
    big = fit(master, s * 4)
    circle = Image.new("L", (s * 4, s * 4), 0)
    ImageDraw.Draw(circle).ellipse((0, 0, s * 4 - 1, s * 4 - 1), fill=255)
    round_ = Image.new("RGBA", (s * 4, s * 4), (0, 0, 0, 0))
    round_.paste(big, (0, 0), circle)
    save(round_.resize((s, s), Image.LANCZOS), f"{RES}/mipmap-{d}/ic_launcher_round.png")

# Adaptive foreground: artwork inside the 66/108 safe zone on transparent; tile colour behind it.
for d, s in {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}.items():
    inner = round(s * 66 / 108)
    fg = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    fg.paste(fit(master, inner), ((s - inner) // 2, (s - inner) // 2), rounded_mask(inner, round(inner * 0.12)))
    save(fg, f"{RES}/mipmap-{d}/ic_launcher_foreground.png")

def splash(W, H):
    canvas = Image.new("RGB", (W, H), TILE)
    size = min(round(min(W, H) * 0.62), round(side * 1.5))  # don't blow the art up past 1.5x
    logo = fit(master, size)
    canvas.paste(logo, ((W - size) // 2, (H - size) // 2), feather_mask(size, round(size * 0.07)))
    return canvas

for d, (W, H) in {"mdpi": (480, 320), "hdpi": (800, 480), "xhdpi": (1280, 720), "xxhdpi": (1600, 960), "xxxhdpi": (1920, 1280)}.items():
    save(splash(W, H), f"{RES}/drawable-land-{d}/splash.png")
    save(splash(H, W), f"{RES}/drawable-port-{d}/splash.png")
save(splash(480, 320), f"{RES}/drawable/splash.png")

def banner(W, H):
    # Backdrop: the artwork itself, widened, blurred and dimmed; the full logo sits on top.
    bg = master.resize((W, W), Image.LANCZOS).crop((0, (W - H) // 2, W, (W - H) // 2 + H))
    bg = ImageEnhance.Brightness(bg.filter(ImageFilter.GaussianBlur(W / 40))).enhance(0.45)
    bg = Image.blend(bg, Image.new("RGB", (W, H), TILE), 0.35)
    size = round(H * 0.96)
    logo = fit(master, size)
    bg.paste(logo, ((W - size) // 2, (H - size) // 2), feather_mask(size, round(size * 0.06)))
    return bg

save(banner(320, 180), f"{RES}/drawable/tv_banner.png")
save(banner(640, 360), f"{RES}/drawable-xhdpi/tv_banner.png")

# Web: favicon, home-screen icon and the in-app logo.
fav = fit(master, 256)
fav.save(os.path.join(repo, "public/favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])
save(fit(master, 192), os.path.join(repo, "public/icon-192.png"))
master.save(os.path.join(repo, "public/og-vault-logo.webp"), quality=90, method=6)

def wallpaper(W, H):
    # Sign-in backdrop in the logo's colours: its burning-city background blown up and blurred,
    # deep-navy top, ember glow along the bottom, and a dark vignette so the form stays readable.
    # Mirror the artwork's burning left/right edges across the width (keeps the emblem and its
    # lettering out of the backdrop), then blur hard so only the fire-and-electric colours remain.
    edge = master.width // 4
    left, right = master.crop((0, 0, edge, master.height)), master.crop((master.width - edge, 0, master.width, master.height))
    strip = Image.new("RGB", (edge * 4, master.height))
    for i, part in enumerate([left, right.transpose(Image.FLIP_LEFT_RIGHT), left.transpose(Image.FLIP_LEFT_RIGHT), right]):
        strip.paste(part, (i * edge, 0))
    bg = strip.resize((W, round(W * strip.height / strip.width)), Image.LANCZOS)
    bg = bg.crop((0, bg.height - H, W, bg.height))
    bg = ImageEnhance.Color(bg.filter(ImageFilter.GaussianBlur(W / 45))).enhance(1.35)
    bg = ImageEnhance.Brightness(bg).enhance(0.7)
    a = np.asarray(bg).astype(float) / 255
    y = np.linspace(0, 1, H)[:, None, None]
    x = np.linspace(-1, 1, W)[None, :, None]
    navy = np.array(TILE) / 255
    a = a * (0.35 + 0.65 * y) + navy * (1 - y) * 0.65  # fade the top into the store's navy
    ember = np.array([1.0, 0.42, 0.12])
    a = a + ember * np.clip(y - 0.62, 0, 1) ** 2 * 0.9  # warm fire glow from the bottom edge
    vignette = 1 - 0.55 * np.clip(np.sqrt(x ** 2 * 0.55 + (y - 0.45) ** 2 * 1.2), 0, 1) ** 2
    a = np.clip(a * vignette, 0, 1)
    return Image.fromarray((a * 255).astype(np.uint8))

wallpaper(1600, 900).save(os.path.join(repo, "public/og-vault-wallpaper.webp"), quality=82, method=6)
print("master", master.size)
