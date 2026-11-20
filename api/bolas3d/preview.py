"""Vista previa PNG de una bola con el nombre puesto (la misma colocacion que el 3MF final)."""
import colorsys
import io
import json
import os
from functools import lru_cache

import numpy as np
from PIL import Image, ImageDraw

from . import gingerbread_name as _g
from . import figura_para, limpiar_nombre

AQUI = os.path.dirname(os.path.abspath(__file__))
PV = os.path.join(AQUI, "previews")
FUENTE = os.path.join(AQUI, "fonts", "SantaNorthPole.otf")
# (tono 0-1, saturacion x, brillo x) sobre el marron original. None = marron
COLORES = {
    "ChristmasTree.3mf": (0.36, 0.9, 0.85),
    "Star.3mf": (0.115, 1.35, 1.2),
    "Stocking.3mf": (0.0, 1.3, 1.1),
}
LADO = 900
PAD = 10


def _recolor(im, hue, sat, val):
    a = np.asarray(im.convert("RGBA")).astype(np.float32) / 255.0
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    mx = a[..., :3].max(-1); mn = a[..., :3].min(-1); d = mx - mn
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    h = np.zeros_like(mx)
    m = d > 1e-6
    rc = (r == mx) & m; gc = (g == mx) & m & ~rc; bc = m & ~rc & ~gc
    h[rc] = ((g - b)[rc] / d[rc]) % 6
    h[gc] = ((b - r)[gc] / d[gc]) + 2
    h[bc] = ((r - g)[bc] / d[bc]) + 4
    h = h / 6.0
    sel = (h > 0.04) & (h < 0.12) & (s > 0.35) & (al > 0)
    out = a.copy()
    s2 = np.minimum(1.0, s * sat); v2 = np.minimum(1.0, mx * val)
    hh = hue * 6.0; i = int(hh) % 6; f = hh - int(hh)
    p = v2 * (1 - s2); q = v2 * (1 - s2 * f); t = v2 * (1 - s2 * (1 - f))
    rgb = [(v2, t, p), (q, v2, p), (p, v2, t), (p, q, v2), (t, p, v2), (v2, p, q)][i]
    for c in range(3):
        out[..., c] = np.where(sel, rgb[c], a[..., c])
    return Image.fromarray((out * 255).astype(np.uint8), "RGBA")


@lru_cache(maxsize=None)
def _capa(fichero_png, fichero_fig):
    im = Image.open(os.path.join(PV, fichero_png)).convert("RGBA")
    col = COLORES.get(fichero_fig)
    return _recolor(im, *col) if col else im


@lru_cache(maxsize=None)
def _meta(stem):
    with open(os.path.join(PV, stem + ".json")) as f:
        return json.load(f)


def _componer(fichero, nombre):
    r = _g.preview_plan([os.path.join(AQUI, "models", fichero), nombre, "--font", FUENTE])
    meta = _meta(r["figure"]); sc = meta["scale"]
    bx0, by0, bx1, by1 = meta["bounds"]
    W = int((bx1 - bx0) * sc) + 2 * PAD; H = int((by1 - by0) * sc) + 2 * PAD
    im = Image.new("RGBA", (W, H), (255, 255, 255, 255))
    for p in meta["parts"]:
        if p["i"] in r["removed"]:
            continue
        dx, dy = r["moves"].get(p["i"], (0, 0))
        im.alpha_composite(_capa(p["file"], fichero), (int((p["x0"] + dx - bx0) * sc) + PAD, int((by1 - (p["y1"] + dy)) * sc) + PAD))
    byi = {q["i"]: q for q in meta["parts"]}
    for src, dx, dy in r.get("adds", []):
        q = byi[src]
        im.alpha_composite(_capa(q["file"], fichero), (int((q["x0"] + dx - bx0) * sc) + PAD, int((by1 - (q["y1"] + dy)) * sc) + PAD))
    K = 3
    ov = Image.new("RGBA", (W * K, H * K), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    P = lambda pt: (((pt[0] - bx0) * sc + PAD) * K, ((by1 - pt[1]) * sc + PAD) * K)
    marron = COLORES.get(fichero)
    for outer, holes in r["groups"]:
        d.polygon([P(q) for q in outer], fill=(242, 237, 228, 255))
        for h in holes:
            d.polygon([P(q) for q in h], fill=(176, 122, 69, 255))
    ov = ov.resize((W, H), Image.LANCZOS)
    if marron:  # los huecos de las letras tambien toman el color de la figura
        ov = _recolor(ov, *marron)
    im.alpha_composite(ov)
    k = min((LADO - 80) / im.width, (LADO - 80) / im.height)
    im = im.convert("RGB").resize((int(im.width * k), int(im.height * k)), Image.LANCZOS)
    lienzo = Image.new("RGB", (LADO, LADO), (255, 255, 255))
    lienzo.paste(im, ((LADO - im.width) // 2, (LADO - im.height) // 2))
    buf = io.BytesIO(); lienzo.save(buf, "PNG", optimize=False)
    return buf.getvalue()


@lru_cache(maxsize=300)
def _cache(fichero, nombre):
    return _componer(fichero, nombre)


def preview_png(modelo, nombre):
    """-> bytes PNG. ValueError si no se puede."""
    fichero = figura_para(modelo)
    if not fichero:
        raise ValueError(f"No reconozco la figura '{modelo}'")
    nombre = limpiar_nombre(nombre)
    if not nombre:
        raise ValueError("Nombre vacio")
    try:
        return _cache(fichero, nombre)
    except SystemExit as e:
        raise ValueError(str(e.code) if e.code else "No se pudo generar la vista previa")
