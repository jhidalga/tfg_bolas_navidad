#!/usr/bin/env python3
"""Cambia el nombre de una figura navidena .3mf (Bambu Studio) sin abrir Bambu Studio.

Uso:
    python gingerbread_name.py GingerbreadMan.3mf "Roberto"
    python gingerbread_name.py GingerbreadMan.3mf "Ana" -o ana.3mf --font C:/Windows/Fonts/Inkfree.ttf

Necesita:  pip install fonttools

Que hace:
  - Crea la malla 3D de las letras con la fuente que le des.
  - Pone el nombre entre el pecho y los brazos (centrado, a la altura de los brazos).
  - Si el nombre es largo, lo encoge para que quepa entre los brazos.
  - Baja los botones por debajo del nombre.
"""
import argparse
import math
import os
import re
import sys
import zipfile
from xml.sax.saxutils import quoteattr

from fontTools.pens.basePen import BasePen
from fontTools.ttLib import TTFont

# ---------------------------------------------------------------- ajustes
OBJ_TEXT = 15            # id del objeto "To Name" dentro de object_1.model
OBJ_BUTTONS = (3, 9, 13)  # ids de los 3 botones (de arriba a abajo)
BODY_X = 0.0             # eje central del muneco
NAME_BAND_CENTER_Y = -1.5   # altura de los brazos (centro de la franja del nombre)
MAX_NAME_WIDTH = 38.0    # ancho libre entre los brazos (mm)
WIDE_NAME_WIDTH = 50.0   # ancho del nombre si se quitan las rayas de los brazos (mm)
ARM_SHIFT = 1.5          # cuanto se separan hacia fuera las rayas de los brazos (mm)
ARM_CENTER_Y = 0.28     # altura del centro de las rayas (centradas en el brazo)
OBJ_ARMS = (2, 7)        # ids de las rayas de los brazos (derecha, izquierda)
TOP_LIMIT = 4.0          # tope de arriba del nombre en varias lineas (bajo la sonrisa)
MULTILINE_SCALE = 0.8    # las letras son un 80% mas pequenas si hay varias lineas
LINE_PITCH = 1.0         # separacion entre lineas (x tamano de letra)
LOWER_LINE_MAX_WIDTH = 32.0  # el torso se estrecha: las lineas de abajo son mas cortas
BUTTON_MIN_Y_MULTI = -25.5
NAME_FONT_SIZE = 13.0    # tamano base (igual que el original de Bambu)
TEXT_Z0, TEXT_Z1 = -0.015, 0.685   # grosor del texto (igual que el original)
TEXT_Z_OFFSET = 0.415    # z del componente texto (igual que el original)
BUTTON_RADIUS = 1.5
BUTTON_GAP_BELOW_TEXT = 3.0   # hueco entre letras y primer boton (borde a borde)
BUTTON_SPACING = 5.7     # distancia entre botones (igual que el original)
BUTTON_MIN_Y = -24.0     # limite de abajo para el ultimo boton (el torso se estrecha)
CURVE_STEPS = 10

FONT_CANDIDATES = [
    "C:/Windows/Fonts/Inkfree.ttf",
    "C:/Windows/Fonts/segoepr.ttf",
    "C:/Windows/Fonts/segoesc.ttf",
    "C:/Windows/Fonts/BRADHITC.TTF",
    "/System/Library/Fonts/Supplemental/Bradley Hand Bold.ttf",
    "/System/Library/Fonts/Supplemental/Chalkboard.ttc",
    "/usr/share/fonts/truetype/google-fonts/Lora-Italic-Variable.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf",
]


# ---------------------------------------------------------------- fuente -> contornos
class FlattenPen(BasePen):
    def __init__(self, glyph_set):
        super().__init__(glyph_set)
        self.contours = []
        self._cur = None

    def _moveTo(self, p):
        self._cur = [p]

    def _lineTo(self, p):
        self._cur.append(p)

    def _curveToOne(self, p1, p2, p3):
        p0 = self._cur[-1]
        for i in range(1, CURVE_STEPS + 1):
            t = i / CURVE_STEPS
            u = 1 - t
            self._cur.append((
                u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
                u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1]))

    def _qCurveToOne(self, p1, p2):
        p0 = self._cur[-1]
        for i in range(1, CURVE_STEPS + 1):
            t = i / CURVE_STEPS
            u = 1 - t
            self._cur.append((
                u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
                u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]))

    def _closePath(self):
        if self._cur and len(self._cur) > 2:
            self.contours.append(self._cur)
        self._cur = None

    _endPath = _closePath


def text_contours(font_path, text, size, xscale=1.0):
    font = TTFont(font_path, fontNumber=0)
    cmap = font.getBestCmap()
    gs = font.getGlyphSet()
    hmtx = font["hmtx"]
    scale = size / font["head"].unitsPerEm
    x = 0.0
    out = []
    missing = []
    for ch in text:
        name = cmap.get(ord(ch))
        if name is None:
            missing.append(ch)
            continue
        pen = FlattenPen(gs)
        gs[name].draw(pen)
        for c in pen.contours:
            out.append([((px + x) * scale * xscale, py * scale) for px, py in c])
        x += hmtx[name][0]
    return out, missing


# ---------------------------------------------------------------- geometria 2D
def clean_ring(ring, eps=1e-6):
    r = []
    for p in ring:
        if not r or math.hypot(p[0] - r[-1][0], p[1] - r[-1][1]) > eps:
            r.append(p)
    while len(r) > 1 and math.hypot(r[0][0] - r[-1][0], r[0][1] - r[-1][1]) <= eps:
        r.pop()
    return r


def area(ring):
    a = 0.0
    for i in range(len(ring)):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % len(ring)]
        a += x1 * y2 - x2 * y1
    return a / 2


def point_in_ring(pt, ring):
    x, y = pt
    inside = False
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % n]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            inside = not inside
    return inside


def group_contours(contours):
    """Devuelve lista de (exterior CCW, [agujeros CW])."""
    rings = [clean_ring(c) for c in contours]
    rings = [r for r in rings if len(r) >= 3 and abs(area(r)) > 1e-9]
    depth = []
    parent = []
    for i, r in enumerate(rings):
        containers = [j for j, o in enumerate(rings)
                      if j != i and abs(area(o)) > abs(area(r)) and point_in_ring(r[0], o)]
        depth.append(len(containers))
        parent.append(min(containers, key=lambda j: abs(area(rings[j]))) if containers else None)
    groups = {}
    for i, r in enumerate(rings):
        if depth[i] % 2 == 0:
            groups[i] = (r if area(r) > 0 else r[::-1], [])
    for i, r in enumerate(rings):
        if depth[i] % 2 == 1 and parent[i] in groups:
            groups[parent[i]][1].append(r if area(r) < 0 else r[::-1])
    return list(groups.values())


def seg_intersect(a, b, c, d):
    def orient(p, q, r):
        return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
    o1, o2, o3, o4 = orient(a, b, c), orient(a, b, d), orient(c, d, a), orient(c, d, b)
    return o1 * o2 < -1e-12 and o3 * o4 < -1e-12


def bridge_holes(outer, holes):
    """Une los agujeros al exterior con puentes -> un solo poligono simple."""
    poly = list(outer)
    holes = sorted(holes, key=lambda h: -max(p[0] for p in h))
    remaining = list(holes)
    for h in holes:
        all_edges = []
        for ring in [poly] + [x for x in remaining]:
            for i in range(len(ring)):
                all_edges.append((ring[i], ring[(i + 1) % len(ring)]))
        best = None
        for hi, hp in enumerate(h):
            cands = sorted(range(len(poly)),
                           key=lambda k: (poly[k][0] - hp[0]) ** 2 + (poly[k][1] - hp[1]) ** 2)
            for k in cands:
                v = poly[k]
                ok = True
                for e0, e1 in all_edges:
                    if e0 in (hp, v) or e1 in (hp, v):
                        continue
                    if seg_intersect(hp, v, e0, e1):
                        ok = False
                        break
                if ok:
                    # el puente no debe pasar por dentro del propio agujero
                    mid = ((hp[0] + v[0]) / 2, (hp[1] + v[1]) / 2)
                    if point_in_ring(mid, h):
                        continue
                    d = (v[0] - hp[0]) ** 2 + (v[1] - hp[1]) ** 2
                    if best is None or d < best[0]:
                        best = (d, hi, k)
                    break
        if best is None:
            raise RuntimeError("no encuentro puente para un agujero de letra")
        _, hi, k = best
        hr = h[hi:] + h[:hi]
        poly = poly[:k + 1] + hr + [hr[0]] + [poly[k]] + poly[k + 1:]
        remaining.remove(h)
    return poly


def ear_clip(poly):
    """Triangula poligono simple CCW (con puentes). Devuelve lista de (p,q,r)."""
    n = len(poly)
    idx = list(range(n))
    tris = []

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    def in_tri(p, a, b, c):
        d1, d2, d3 = cross(a, b, p), cross(b, c, p), cross(c, a, p)
        return d1 >= -1e-12 and d2 >= -1e-12 and d3 >= -1e-12

    guard = 0
    while len(idx) > 3 and guard < 100000:
        guard += 1
        m = len(idx)
        clipped = False
        for k in range(m):
            i0, i1, i2 = idx[k - 1], idx[k], idx[(k + 1) % m]
            a, b, c = poly[i0], poly[i1], poly[i2]
            cr = cross(a, b, c)
            if cr <= 1e-12:
                continue
            bad = False
            for j in idx:
                if j in (i0, i1, i2):
                    continue
                p = poly[j]
                if p == a or p == b or p == c:
                    continue
                if in_tri(p, a, b, c):
                    bad = True
                    break
            if bad:
                continue
            tris.append((i0, i1, i2))
            idx.pop(k)
            clipped = True
            break
        if not clipped:
            # poligono degenerado: quita un vertice casi colineal
            worst = min(range(len(idx)), key=lambda k: abs(cross(
                poly[idx[k - 1]], poly[idx[k]], poly[idx[(k + 1) % len(idx)]])))
            idx.pop(worst)
    if len(idx) == 3:
        tris.append(tuple(idx))
    return tris


# ---------------------------------------------------------------- malla 3D
def extrude(groups, z0, z1, ox=0.0, oy=0.0):
    verts, vmap, tris = [], {}, []

    def vid(x, y, z):
        key = (round(x, 5), round(y, 5), round(z, 5))
        if key not in vmap:
            vmap[key] = len(verts)
            verts.append(key)
        return vmap[key]

    for outer, holes in groups:
        poly = bridge_holes(outer, holes) if holes else list(outer)
        for i0, i1, i2 in ear_clip(poly):
            a, b, c = poly[i0], poly[i1], poly[i2]
            tris.append((vid(a[0] - ox, a[1] - oy, z1), vid(b[0] - ox, b[1] - oy, z1),
                         vid(c[0] - ox, c[1] - oy, z1)))
            tris.append((vid(c[0] - ox, c[1] - oy, z0), vid(b[0] - ox, b[1] - oy, z0),
                         vid(a[0] - ox, a[1] - oy, z0)))
        for ring in [outer] + holes:
            for i in range(len(ring)):
                a, b = ring[i], ring[(i + 1) % len(ring)]
                a0, b0 = vid(a[0] - ox, a[1] - oy, z0), vid(b[0] - ox, b[1] - oy, z0)
                a1, b1 = vid(a[0] - ox, a[1] - oy, z1), vid(b[0] - ox, b[1] - oy, z1)
                tris.append((a0, b0, b1))
                tris.append((a0, b1, a1))
    tris = [t for t in tris if len(set(t)) == 3]
    return verts, tris


def mesh_xml(verts, tris):
    lines = ["<mesh>", "    <vertices>"]
    lines += [f'     <vertex x="{x}" y="{y}" z="{z}"/>' for x, y, z in verts]
    lines += ["    </vertices>", "    <triangles>"]
    lines += [f'     <triangle v1="{a}" v2="{b}" v3="{c}"/>' for a, b, c in tris]
    lines += ["    </triangles>", "   </mesh>"]
    return "\n".join(lines)


def list_system_fonts(extra_dirs=()):
    """Fuentes instaladas (y las de extra_dirs): lista de (nombre para mostrar, ruta, familia Tk)."""
    dirs = list(extra_dirs)
    if os.name == "nt":
        dirs += [os.path.join(os.environ.get("WINDIR", "C:/Windows"), "Fonts"),
                 os.path.join(os.environ.get("LOCALAPPDATA", ""), "Microsoft", "Windows", "Fonts")]
    else:
        home = os.path.expanduser("~")
        dirs += ["/System/Library/Fonts", "/Library/Fonts", os.path.join(home, "Library/Fonts"),
                 "/usr/share/fonts", "/usr/local/share/fonts", os.path.join(home, ".fonts"),
                 os.path.join(home, ".local/share/fonts")]
    found = {}
    for d in dirs:
        for root, _, names in os.walk(d):
            for fn in names:
                if not fn.lower().endswith((".ttf", ".otf", ".ttc")):
                    continue
                path = os.path.join(root, fn)
                try:
                    f = TTFont(path, fontNumber=0, lazy=True)
                    nm = f["name"]
                    fam = (nm.getDebugName(16) or nm.getDebugName(1) or fn).strip()
                    sty = (nm.getDebugName(17) or nm.getDebugName(2) or "").strip()
                    tkfam = (nm.getDebugName(1) or fam).strip()
                    f.close()
                except Exception:
                    continue
                label = fam if sty in ("", "Regular", "Normal") else f"{fam} {sty}"
                if any(os.path.abspath(path).startswith(os.path.abspath(e) + os.sep) for e in extra_dirs):
                    label += "  [incluida]"
                found.setdefault(label, (label, path, tkfam))
    return sorted(found.values(), key=lambda t: t[0].lower())


def find_font(arg):
    if arg:
        if not os.path.exists(arg):
            sys.exit(f"No existe la fuente: {arg}")
        try:
            TTFont(arg, fontNumber=0, lazy=True).close()
        except Exception:
            sys.exit(f"Ese fichero no es una fuente valida (.ttf/.otf): {arg}")
        return arg
    for f in FONT_CANDIDATES:
        if os.path.exists(f):
            return f
    sys.exit("No encuentro fuente. Usa --font ruta/a/fuente.ttf")




# ---------------------------------------------------------------- fuente por defecto incluida
_AQUI = getattr(sys, "_MEIPASS", None) or os.path.dirname(os.path.abspath(__file__))
FONT_CANDIDATES.insert(0, os.path.join(_AQUI, "fonts", "SantaNorthPole.otf"))
FONT_CANDIDATES.insert(1, os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts", "SantaNorthPole.otf"))

# ---------------------------------------------------------------- ajustes del buscador de hueco (figuras genericas)
GRID_RES = 0.25          # mm por pixel de la rejilla de hueco libre
GRID_EXT = 50.0          # la rejilla cubre de -50 a +50 mm
WALL_MARGIN = 1.3        # distancia minima entre letras y bordes de glaseado (mm)
DECOR_MARGIN = 0.8       # distancia minima entre letras y adornos (mm)
EDGE_MARGIN = 2.5        # distancia minima entre letras y el borde de la galleta (mm)
WALL_MIN_AREA = 400.0    # piezas con caja mayor que esto (mm2) = bordes/estructura, no se quitan
MIN_TEXT_SIZE = 3.0
REF_SIZE = 20.0


# ---------------------------------------------------------------- lectura / escritura del 3mf
def fmt(v):
    return ("%.9f" % v).rstrip("0").rstrip(".") if v else "0"


class Figure:
    """Un .3mf de Bambu Studio con una figura y su pieza de texto ("To Name")."""

    def __init__(self, path):
        z = zipfile.ZipFile(path)
        self.path = path
        self.order = [i.filename for i in z.infolist()]
        self.files = {n: z.read(n) for n in self.order}
        z.close()
        self.main = self.files["3D/3dmodel.model"].decode("utf-8")
        self.cfg = self.files["Metadata/model_settings.config"].decode("utf-8")
        tops = re.findall(r'<object id="(\d+)"[^>]*type="model">\s*<components>', self.main)
        for extra in tops[1:]:
            # varias versiones de la misma figura (p. ej. el reno con y sin AMS): nos quedamos con la primera
            self._drop_variant(extra)
        tops = tops[:1]
        if len(tops) != 1:
            raise ValueError("Este 3mf tiene varias figuras/versiones; no esta soportado.")
        self.oid = int(tops[0])
        m = re.search(r'<object id="%d"[^>]*type="model">\s*<components>(.*?)</components>' % self.oid,
                      self.main, re.S)
        self.comps = []
        for c in re.finditer(r"<component [^>]*/>", m.group(1)):
            s = c.group(0)
            tf = [float(x) for x in re.search(r'transform="([^"]*)"', s).group(1).split()]
            self.comps.append({"path": re.search(r'p:path="/?([^"]*)"', s).group(1),
                               "mesh": int(re.search(r'objectid="(\d+)"', s).group(1)),
                               "t": tf[9:12], "rot": tf[0:9]})
        cm = re.search(r'<object id="%d">(.*?)</object>' % self.oid, self.cfg, re.S)
        if not cm:
            raise ValueError("Configuracion del 3mf no reconocida.")
        block = cm.group(1)
        self.name = re.search(r'key="name" value="([^"]*)"', block).group(1)
        self.parts = []
        for pb in re.findall(r"<part id=.*?</part>", block, re.S):
            ex = re.search(r'key="extruder" value="(\d+)"', pb)
            self.parts.append({"name": re.search(r'key="name" value="([^"]*)"', pb).group(1),
                               "extruder": int(ex.group(1)) if ex else 4,
                               "text": "<text_info" in pb})
        if len(self.parts) != len(self.comps):
            raise ValueError("Piezas y mallas no coinciden en el 3mf.")
        texts = [i for i, p in enumerate(self.parts) if p["text"]]
        if len(texts) != 1:
            raise ValueError("No encuentro la pieza de texto en este 3mf.")
        self.text_idx = texts[0]
        self.models = {}
        self._mesh_cache = {}

    # --- mallas
    def _model_text(self, path):
        if path not in self.models:
            self.models[path] = self.files[path].decode("utf-8")
        return self.models[path]

    def _drop_variant(self, oid):
        self.main = re.sub(r'[ \t]*<object id="%s"[^>]*type="model">\s*<components>.*?</object>\n?' % oid, "",
                           self.main, count=1, flags=re.S)
        self.main = re.sub(r'[ \t]*<item objectid="%s"[^>]*/>\n?' % oid, "", self.main)
        self.cfg = re.sub(r'[ \t]*<object id="%s">.*?</object>\n?' % oid, "", self.cfg, count=1, flags=re.S)
        self.cfg = re.sub(r'[ \t]*<assemble_item object_id="%s"[^>]*/>\n?' % oid, "", self.cfg)
        plates = list(re.finditer(r'[ \t]*<plate>.*?</plate>\n?', self.cfg, re.S))
        for pl in reversed(plates):
            if re.search(r'key="object_id" value="%s"' % oid, pl.group(0)):
                self.cfg = self.cfg[:pl.start()] + self.cfg[pl.end():]

    def mesh(self, i):
        """(vertices, triangulos) de la pieza i (coordenadas locales)."""
        if i not in self._mesh_cache:
            c = self.comps[i]
            t = self._model_text(c["path"])
            m = re.search(r'<object id="%d"[^>]*>(.*?)</object>' % c["mesh"], t, re.S)
            if not m:
                raise ValueError(f"Falta la malla de la pieza {i + 1}")
            v = [(float(a), float(b), float(c_)) for a, b, c_ in
                 re.findall(r'<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"', m.group(1))]
            tr = [(int(a), int(b), int(c_)) for a, b, c_ in
                  re.findall(r'<triangle v1="(\d+)" v2="(\d+)" v3="(\d+)"', m.group(1))]
            self._mesh_cache[i] = (v, tr)
        return self._mesh_cache[i]

    def world_xy(self, i):
        tx, ty = self.comps[i]["t"][0], self.comps[i]["t"][1]
        return [(x + tx, y + ty) for x, y, _ in self.mesh(i)[0]]

    def bbox(self, i):
        pts = self.world_xy(i)
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        return min(xs), min(ys), max(xs), max(ys)

    # --- ediciones
    def set_text_mesh(self, verts, tris):
        i = self.text_idx
        c = self.comps[i]
        t = self._model_text(c["path"])
        m = re.search(r'(<object id="%d"[^>]*>\s*)<mesh>.*?</mesh>' % c["mesh"], t, re.S)
        self.models[c["path"]] = t[:m.start()] + m.group(1) + mesh_xml(verts, tris) + t[m.end():]
        self._mesh_cache.pop(i, None)

    def set_mesh(self, i, verts, tris):
        c = self.comps[i]
        t = self._model_text(c["path"])
        m = re.search(r'(<object id="%d"[^>]*>\s*)<mesh>.*?</mesh>' % c["mesh"], t, re.S)
        self.models[c["path"]] = t[:m.start()] + m.group(1) + mesh_xml(verts, tris) + t[m.end():]
        self._mesh_cache.pop(i, None)
        self.cfg = re.sub(r'(<part id="%d"[^>]*>(?:(?!</part>).)*?<mesh_stat face_count=")\d+(")' % (i + 1),
                          lambda k: k.group(1) + str(len(tris)) + k.group(2), self.cfg, count=1, flags=re.S)
        total = sum(int(v) for v in re.findall(r'<mesh_stat face_count="(\d+)"', self.cfg))
        self.cfg = re.sub(r'(<object id="%d">(?:(?!<part).)*?<metadata face_count=")\d+(")' % self.oid,
                          lambda k: k.group(1) + str(total) + k.group(2), self.cfg, count=1, flags=re.S)

    def set_translation(self, i, x, y, z=None):
        old = list(self.comps[i]["t"])
        nz = old[2] if z is None else z
        k = [0]

        def sub(mt):
            n = k[0]
            k[0] += 1
            if n != i:
                return mt.group(0)
            s = mt.group(0)
            tm = re.search(r'transform="([^"]*)"', s)
            p = tm.group(1).split()
            p[9], p[10], p[11] = fmt(x), fmt(y), fmt(nz)
            return s[:tm.start(1)] + " ".join(p) + s[tm.end(1):]
        self.main = re.sub(r"<component [^>]*/>", sub, self.main)
        self.comps[i]["t"] = [x, y, nz]
        # pivote del volumen (solo afecta al editor de Bambu Studio)
        m = re.search(r'<part id="%d".*?</part>' % (i + 1), self.cfg, re.S)
        block = m.group(0)
        mm = re.search(r'(key="matrix" value=")([^"]*)(")', block)
        if mm:
            p = mm.group(2).split()
            p[3], p[7] = fmt(float(p[3]) + 2 * (x - old[0])), fmt(float(p[7]) + 2 * (y - old[1]))
            block = block[:mm.start(2)] + " ".join(p) + block[mm.end(2):]
            self.cfg = self.cfg[:m.start()] + block + self.cfg[m.end():]
        # vista de ensamblaje (si existe)
        am = re.search(r'(<assemble_item object_id="%d" volume_id="%d" transform=")([^"]*)(")'
                       % (self.oid, i), self.cfg)
        if am:
            p = am.group(2).split()
            p[9], p[10], p[11] = fmt(x), fmt(y), fmt(nz)
            self.cfg = self.cfg[:am.start(2)] + " ".join(p) + self.cfg[am.end(2):]

    def clone(self, src, x, y, name=None):
        """Copia la pieza src (0-based) como pieza nueva al final, en (x, y)."""
        n = len(self.comps) + 1
        c = self.comps[src]
        path = c["path"]
        t = self._model_text(path)
        m = re.search(r'[ \t]*<object id="%d" .*?</object>\n?' % c["mesh"], t, re.S)
        blk = m.group(0)
        blk = re.sub(r'(<object id=")\d+(")', lambda k: k.group(1) + str(n) + k.group(2), blk, count=1)
        blk = re.sub(r'p:UUID="[^"]*"', 'p:UUID="%08x-81cb-4c03-9d28-80fed5dfa1dc"' % (0x00020000 + n), blk, count=1)
        i = t.rindex("</resources>")
        self.models[path] = t[:i] + blk + t[i:]
        cm = list(re.finditer(r"[ \t]*<component [^>]*/>\n?", self.main))[src]
        comp = cm.group(0)
        comp = re.sub(r'objectid="\d+"', 'objectid="%d"' % n, comp)
        comp = re.sub(r'(<component [^>]*p:UUID=")[^"]*(")',
                      lambda k: k.group(1) + "%08x-b206-40ff-9872-83e8017abed1" % (0x00020000 + n) + k.group(2), comp)
        tm = re.search(r'transform="([^"]*)"', comp)
        pp = tm.group(1).split()
        pp[9], pp[10], pp[11] = fmt(x), fmt(y), fmt(c["t"][2])
        comp = comp[:tm.start(1)] + " ".join(pp) + comp[tm.end(1):]
        j = self.main.index("</components>")
        k = self.main.rfind("\n", 0, j) + 1
        self.main = self.main[:k] + comp.rstrip("\n") + "\n" + self.main[k:]
        pm = re.search(r'[ \t]*<part id="%d".*?</part>\n?' % (src + 1), self.cfg, re.S)
        pb = pm.group(0)
        pb = re.sub(r'(<part id=")\d+(")', lambda k2: k2.group(1) + str(n) + k2.group(2), pb, count=1)
        pb = re.sub(r'(key="name" value=")([^"]*)(")', lambda k2: k2.group(1) + (name or k2.group(2) + "_extra") + k2.group(3), pb, count=1)
        mm = re.search(r'(key="matrix" value=")([^"]*)(")', pb)
        if mm:
            q = mm.group(2).split()
            q[3], q[7] = fmt(float(q[3]) + 2 * (x - c["t"][0])), fmt(float(q[7]) + 2 * (y - c["t"][1]))
            pb = pb[:mm.start(2)] + " ".join(q) + pb[mm.end(2):]
        last = [mm_ for mm_ in re.finditer(r"</part>\n?", self.cfg)][-1]
        self.cfg = self.cfg[:last.end()] + pb + self.cfg[last.end():]
        self.comps.append({"path": path, "mesh": n, "t": [x, y, c["t"][2]]})
        self.parts.append(dict(self.parts[src], name=name or self.parts[src]["name"] + "_extra"))
        self._mesh_cache.pop(len(self.comps) - 1, None)
        tot = sum(int(v) for v in re.findall(r'<mesh_stat face_count="(\d+)"', self.cfg))
        self.cfg = re.sub(r'(<object id="%d">(?:(?!<part).)*?<metadata face_count=")\d+(")' % self.oid,
                          lambda k2: k2.group(1) + str(tot) + k2.group(2), self.cfg, count=1, flags=re.S)

    def delete(self, idxs):
        """Quita piezas (0-based) y renumera todo lo que depende del orden."""
        idxs = sorted(set(idxs))
        if not idxs:
            return
        for i in idxs:
            if self.comps[i]["mesh"] != i + 1:
                raise ValueError("Numeracion de mallas inesperada: no puedo quitar piezas.")
        path = self.comps[0]["path"]
        # componentes
        spans = [m.span() for m in re.finditer(r"[ \t]*<component [^>]*/>\n?", self.main)]
        for i in reversed(idxs):
            a, b = spans[i]
            self.main = self.main[:a] + self.main[b:]
        # mallas
        t = self._model_text(path)
        for i in idxs:
            t, n = re.subn(r'[ \t]*<object id="%d" .*?</object>\n?' % (i + 1), "", t, flags=re.S)
            if n != 1:
                raise ValueError(f"No pude quitar la malla {i + 1}")
        # config: piezas
        for i in idxs:
            self.cfg, n = re.subn(r'[ \t]*<part id="%d".*?</part>\n?' % (i + 1), "", self.cfg, flags=re.S)
            if n != 1:
                raise ValueError(f"No pude quitar la pieza {i + 1}")
        # config: ensamblaje
        for i in idxs:
            self.cfg = re.sub(r'[ \t]*<assemble_item object_id="%d" volume_id="%d"[^>]*/>\n?' % (self.oid, i),
                              "", self.cfg)
        removed_vols = list(idxs)
        self.cfg = re.sub(r'(<assemble_item object_id="%d" volume_id=")(\d+)(")' % self.oid,
                          lambda m: m.group(1) + str(int(m.group(2)) - sum(1 for r in removed_vols
                                                                          if r < int(m.group(2)))) + m.group(3),
                          self.cfg)
        # renumerar
        old_ids = sorted(int(x) for x in re.findall(r'<object id="(\d+)"', t))
        idmap = {old: new for new, old in enumerate(old_ids, 1)}
        t = re.sub(r'(<object id=")(\d+)(")', lambda m: m.group(1) + str(idmap[int(m.group(2))]) + m.group(3), t)
        self.models[path] = t
        self.main = re.sub(r'(<component [^>]*objectid=")(\d+)(")',
                           lambda m: m.group(1) + str(idmap[int(m.group(2))]) + m.group(3), self.main)
        cnt = [0]

        def renum(m):
            cnt[0] += 1
            return m.group(1) + str(cnt[0]) + m.group(2)
        self.cfg = re.sub(r'(<part id=")\d+(")', renum, self.cfg)
        # estado interno
        keep = [i for i in range(len(self.comps)) if i not in idxs]
        self.comps = [self.comps[i] for i in keep]
        self.parts = [self.parts[i] for i in keep]
        for n, c in enumerate(self.comps, 1):
            c["mesh"] = n
        self.text_idx = [i for i, p in enumerate(self.parts) if p["text"]][0]
        self._mesh_cache = {}

    def set_text_info(self, text, size, faces):
        self.cfg = re.sub(r"(<text_info text=)\"[^\"]*\"", lambda m: m.group(1) + quoteattr(text), self.cfg, count=1)
        self.cfg = re.sub(r'(<text_info [^>]*font_size=)"[^"]*"', r'\g<1>"%s"' % fmt(size), self.cfg, count=1)
        self.cfg = re.sub(r'(<part [^>]*>(?:(?!</part>).)*?key="name" value="[^"]*"(?:(?!</part>).)*?<text_info'
                          r'(?:(?!</part>).)*?<mesh_stat face_count=")\d+(")',
                          lambda m: m.group(1) + str(faces) + m.group(2), self.cfg, count=1, flags=re.S)
        total = sum(int(x) for x in re.findall(r'<mesh_stat face_count="(\d+)"', self.cfg))
        self.cfg = re.sub(r'(<object id="%d">(?:(?!<part).)*?<metadata face_count=")\d+(")' % self.oid,
                          lambda m: m.group(1) + str(total) + m.group(2), self.cfg, count=1, flags=re.S)

    def save(self, out_path):
        self.files["3D/3dmodel.model"] = self.main.encode("utf-8")
        self.files["Metadata/model_settings.config"] = self.cfg.encode("utf-8")
        for p, t in self.models.items():
            self.files[p] = t.encode("utf-8")
        with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as zout:
            for fn in self.order:
                zout.writestr(fn, self.files[fn])


# ---------------------------------------------------------------- plan (lo que se va a hacer, sin escribir nada)
class Plan:
    def __init__(self):
        self.groups = []        # letras en mm sobre la figura: [(exterior, [agujeros])]
        self.mesh = None        # (vertices, triangulos) locales del texto
        self.center = (0.0, 0.0)
        self.tz = TEXT_Z_OFFSET
        self.moves = {}         # pieza (0-based) -> (x, y) nuevo
        self.adds = []          # copias nuevas: (pieza origen, x, y)
        self.hooves = []        # pezunas nuevas: lista de contornos [(x, y), ...] en mm
        self.removed = []       # piezas (0-based) que se quitan
        self.messages = []
        self.text = ""
        self.font_size = NAME_FONT_SIZE
        self.summary = ""
        self.legacy = False     # True: figura Gingerbread (botones y rayas de brazos)


def build_lines(font_path, lines, size, xscale=1.0):
    """Contornos de cada linea (centrada en x=0, linea base en y=-k*paso). -> (contornos, anchos, faltan)"""
    allc, widths, miss = [], [], []
    for k, line in enumerate(lines):
        cs, mi = text_contours(font_path, line, size, xscale)
        miss += mi
        if not cs:
            sys.exit(f"La fuente no dio ningun contorno para '{line}'")
        lx = [p[0] for c in cs for p in c]
        mid = (min(lx) + max(lx)) / 2
        widths.append(max(lx) - min(lx))
        allc += [[(px - mid, py - k * size * LINE_PITCH) for px, py in c] for c in cs]
    return allc, widths, miss


def finish_text(plan, contours, tx, ty):
    """Rellena malla y letras (para vista previa) de un plan con el texto centrado en (tx, ty)."""
    xs = [p[0] for c in contours for p in c]
    ys = [p[1] for c in contours for p in c]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    groups = group_contours(contours)
    plan.mesh = extrude(groups, TEXT_Z0, TEXT_Z1, cx, cy)
    plan.center = (tx, ty)
    dx, dy = tx - cx, ty - cy
    plan.groups = [([(x + dx, y + dy) for x, y in outer], [[(x + dx, y + dy) for x, y in h] for h in holes])
                   for outer, holes in groups]
    plan.bbox = (min(xs) + dx, min(ys) + dy, max(xs) + dx, max(ys) + dy)


# ---------------------------------------------------------------- figura Gingerbread (ajuste a medida)
def _area(b):
    return (b[2] - b[0]) * (b[3] - b[1])


def _min_dist(pa, pb):
    """distancia minima entre dos nubes de puntos (mm), por rejilla para no hacer N*M"""
    cell = 2.0
    grid = {}
    for x, y in pb:
        grid.setdefault((int(x // cell), int(y // cell)), []).append((x, y))
    best = 1e9
    for x, y in pa:
        cx, cy = int(x // cell), int(y // cell)
        for r in (1, 2, 3):
            found = False
            for gx in range(cx - r, cx + r + 1):
                for gy in range(cy - r, cy + r + 1):
                    for u, v in grid.get((gx, gy), ()):
                        d = math.hypot(x - u, y - v)
                        if d < best:
                            best = d
                        found = True
            if found:
                break
    return best


def plan_gingerbread(fig, args, font_path, lines, multi):
    plan = Plan()
    plan.legacy = True
    t_idx = fig.text_idx
    buttons = [i - 1 for i in OBJ_BUTTONS]
    arms = [i - 1 for i in OBJ_ARMS]
    limits = [args.max_width] + [min(args.max_width, LOWER_LINE_MAX_WIDTH)] * (len(lines) - 1)
    base = args.size * (MULTILINE_SCALE if multi else 1.0)

    contours, widths, missing = build_lines(font_path, lines, base)
    if missing:
        plan.messages.append("Aviso: la fuente no tiene estas letras: " + "".join(sorted(set(missing))))
    remove_arms = args.arms == "remove" or (
        args.arms == "auto" and widths[0] * min(1.0, args.condense) > args.max_width)
    if remove_arms:
        limits[0] = max(args.wide_width, args.max_width)
        plan.messages.append("Nombre largo: quito las rayas de los brazos para dar mas ancho "
                             f"({limits[0]:.0f} mm).")
    walls = [i for i in range(len(fig.comps)) if i not in (0, t_idx) and _area(fig.bbox(i)) >= WALL_MIN_AREA]
    wall_pts = [p for i in walls for p in fig.world_xy(i)]
    widths0 = widths
    top_limit = TOP_LIMIT
    for _try in range(60):
        shrink = min(1.0, *(lim / w for lim, w in zip(limits, widths0)))
        size = base
        squeeze = 1.0
        contours, widths, _m = build_lines(font_path, lines, base)
        if shrink < 1.0:
            squeeze = max(shrink, args.condense)
            size = base * shrink / squeeze
            contours, widths, _m = build_lines(font_path, lines, size, squeeze)
        ys = [p[1] for c in contours for p in c]
        cy = (min(ys) + max(ys)) / 2
        ymin_g, ymax_g = min(ys), max(ys)
        top1 = max(p[1] for c in contours for p in c if p[1] > -size * LINE_PITCH / 2)
        top1 = max(top1, 0.0)
        base1 = (top_limit - top1) if multi else (NAME_BAND_CENTER_Y - top1 / 2)
        ty = base1 + cy
        xs_ = [p[0] for c in contours for p in c]
        cxx = (min(xs_) + max(xs_)) / 2
        world = [(x - cxx + BODY_X, y - cy + ty) for c in contours for x, y in c]
        if not wall_pts or _min_dist(world, wall_pts) >= 0.8 or size < 3:
            break
        if multi and top_limit > TOP_LIMIT - 1.0:
            top_limit -= 0.2          # primero bajar un poco el texto
        else:
            limits = [max(8.0, lim - 0.5) for lim in limits]
    if shrink < 1.0:
        plan.messages.append(f"Nombre largo: letras estrechadas al {squeeze * 100:.0f}% y tamano {size:.1f} "
                             "para que quepa.")
        if size < 6.5:
            plan.messages.append("Aviso: nombre muy largo, las letras quedan muy pequenas (poco imprimible).")
    text_bottom = ty + (ymin_g - cy)
    text_top = ty + (ymax_g - cy)
    finish_text(plan, contours, BODY_X, ty)

    min_y = BUTTON_MIN_Y_MULTI if multi else BUTTON_MIN_Y
    first = text_bottom - BUTTON_GAP_BELOW_TEXT - BUTTON_RADIUS
    spacing = BUTTON_SPACING
    n_btn = (2 if multi else 3) if args.buttons == "auto" else int(args.buttons)
    last = first - (n_btn - 1) * spacing
    if n_btn > 1 and last < min_y:
        spacing = max(3.6, (first - min_y) / (n_btn - 1))
        plan.messages.append(f"Aviso: botones apretados (separacion {spacing:.1f} mm).")
    button_y = [first - k * spacing for k in range(n_btn)]
    fit = [y for y in button_y if y >= min_y - 1e-6]
    if len(fit) < n_btn:
        plan.messages.append(f"Aviso: no hay sitio para todos los botones: quito {n_btn - len(fit)} mas.")
        button_y, n_btn = fit, len(fit)
    for idx, y in zip(buttons, button_y):
        plan.moves[idx] = (fig.comps[idx][ "t"][0], y)
    plan.removed += buttons[n_btn:]
    if remove_arms:
        plan.removed += arms
    else:
        for idx, sign in zip(arms, (1, -1)):
            plan.moves[idx] = (fig.comps[idx]["t"][0] + sign * ARM_SHIFT, ARM_CENTER_Y)
    plan.font_size = size
    plan.summary = (f"ancho {max(widths):.1f} mm, texto y {text_bottom:.1f}..{text_top:.1f}, "
                    f"botones ({n_btn}) y: " + ", ".join(f"{y:.1f}" for y in button_y))
    return plan


# ---------------------------------------------------------------- resto de figuras (buscador de hueco libre)
def _grid_n():
    return int(round(2 * GRID_EXT / GRID_RES))


def _to_px(x, y):
    return int((x + GRID_EXT) / GRID_RES), int((y + GRID_EXT) / GRID_RES)


def _disk(radius_px):
    r = int(math.ceil(radius_px))
    return [(dx, dy) for dx in range(-r, r + 1) for dy in range(-r, r + 1) if dx * dx + dy * dy <= radius_px ** 2]


def _dilate(pixels, radius_px):
    disk = _disk(radius_px)
    out = set()
    for (x, y) in pixels:
        for dx, dy in disk:
            out.add((x + dx, y + dy))
    return out


def _flood(blocked, seed, n):
    """Pixeles alcanzables desde seed sin cruzar 'blocked' (bytearray). -> bytearray (1 = alcanzable)"""
    from collections import deque
    region = bytearray(n * n)
    sx, sy = seed
    if not (0 <= sx < n and 0 <= sy < n) or blocked[sy * n + sx]:
        best = None
        for r in range(1, 60):
            for dx in range(-r, r + 1):
                for dy in (-r, r):
                    for px, py in ((sx + dx, sy + dy), (sx + dy, sy + dx)):
                        if 0 <= px < n and 0 <= py < n and not blocked[py * n + px]:
                            best = (px, py)
                            break
                    if best:
                        break
                if best:
                    break
            if best:
                break
        if not best:
            return region
        sx, sy = best
    q = deque([(sx, sy)])
    region[sy * n + sx] = 1
    while q:
        x, y = q.popleft()
        if x + 1 < n and not region[y * n + x + 1] and not blocked[y * n + x + 1]:
            region[y * n + x + 1] = 1
            q.append((x + 1, y))
        if x > 0 and not region[y * n + x - 1] and not blocked[y * n + x - 1]:
            region[y * n + x - 1] = 1
            q.append((x - 1, y))
        if y + 1 < n and not region[(y + 1) * n + x] and not blocked[(y + 1) * n + x]:
            region[(y + 1) * n + x] = 1
            q.append((x, y + 1))
        if y > 0 and not region[(y - 1) * n + x] and not blocked[(y - 1) * n + x]:
            region[(y - 1) * n + x] = 1
            q.append((x, y - 1))
    return region


def _silhouette(fig, idx, n):
    """Mascara (bytearray) de la silueta de la pieza idx: relleno par-impar de su contorno superior."""
    from collections import Counter
    verts, tris = fig.mesh(idx)
    tx, ty = fig.comps[idx]["t"][0], fig.comps[idx]["t"][1]
    zmax = max(v[2] for v in verts)
    cnt = Counter()
    for a, b, c in tris:
        if verts[a][2] >= zmax - 0.01 and verts[b][2] >= zmax - 0.01 and verts[c][2] >= zmax - 0.01:
            for p, q in ((a, b), (b, c), (c, a)):
                cnt[(p, q) if p < q else (q, p)] += 1
    rows = {}
    for (p, q), k in cnt.items():
        if k != 1:
            continue
        x1, y1 = verts[p][0] + tx, verts[p][1] + ty
        x2, y2 = verts[q][0] + tx, verts[q][1] + ty
        if y1 == y2:
            continue
        lo, hi = (y1, y2) if y1 < y2 else (y2, y1)
        r0 = int(math.ceil((lo + GRID_EXT) / GRID_RES - 0.5))
        r1 = int(math.floor((hi + GRID_EXT) / GRID_RES - 0.5))
        for r in range(max(r0, 0), min(r1, n - 1) + 1):
            y = (r + 0.5) * GRID_RES - GRID_EXT
            if lo <= y < hi:
                rows.setdefault(r, []).append(x1 + (y - y1) * (x2 - x1) / (y2 - y1))
    mask = bytearray(n * n)
    for r, xs in rows.items():
        xs.sort()
        for k in range(0, len(xs) - 1, 2):
            i0 = max(int(math.ceil((xs[k] + GRID_EXT) / GRID_RES - 0.5)), 0)
            i1 = min(int(math.floor((xs[k + 1] + GRID_EXT) / GRID_RES - 0.5)), n - 1)
            for x in range(i0, i1 + 1):
                mask[r * n + x] = 1
    return mask


def _erode(mask, n, steps):
    """Erosion (cruz de 4 vecinos) 'steps' veces."""
    cur = mask
    for _ in range(steps):
        new = bytearray(n * n)
        for y in range(1, n - 1):
            row = y * n
            for x in range(1, n - 1):
                i = row + x
                if cur[i] and cur[i - 1] and cur[i + 1] and cur[i - n] and cur[i + n]:
                    new[i] = 1
        cur = new
    return cur


def _integral(mask, n):
    P = [0] * ((n + 1) * (n + 1))
    w = n + 1
    for y in range(n):
        run = 0
        row = y * n
        for x in range(n):
            run += mask[row + x]
            P[(y + 1) * w + x + 1] = P[y * w + x + 1] + run
    return P


def _rect_free(P, n, x0, y0, x1, y1):
    """True si todo el rectangulo (mm) esta libre en la mascara con imagen integral P."""
    ix0 = int(math.floor((x0 + GRID_EXT) / GRID_RES))
    iy0 = int(math.floor((y0 + GRID_EXT) / GRID_RES))
    ix1 = int(math.ceil((x1 + GRID_EXT) / GRID_RES))
    iy1 = int(math.ceil((y1 + GRID_EXT) / GRID_RES))
    if ix0 < 0 or iy0 < 0 or ix1 > n or iy1 > n or ix1 <= ix0 or iy1 <= iy0:
        return False
    w = n + 1
    s = P[iy1 * w + ix1] - P[iy0 * w + ix1] - P[iy1 * w + ix0] + P[iy0 * w + ix0]
    return s == (ix1 - ix0) * (iy1 - iy0)


def analyze_free_space(fig):
    """Hueco libre dentro de la figura. -> dict con 'free' (bytearray), 'decor' (lista de (idx, caja)), 'anchor'."""
    n = _grid_n()
    t_idx = fig.text_idx
    walls, decor = [], []
    base_idx = 0
    for i in range(len(fig.parts)):
        if i == t_idx or i == base_idx:
            continue
        x0, y0, x1, y1 = fig.bbox(i)
        if (x1 - x0) * (y1 - y0) >= WALL_MIN_AREA:
            walls.append(i)
        else:
            decor.append((i, (x0, y0, x1, y1)))
    wall_px = set()
    for i in walls:
        for x, y in fig.world_xy(i):
            wall_px.add(_to_px(x, y))
    blocked = bytearray(n * n)
    for (x, y) in _dilate(wall_px, WALL_MARGIN / GRID_RES):
        if 0 <= x < n and 0 <= y < n:
            blocked[y * n + x] = 1
    # fuera de la galleta (con margen) tampoco se puede escribir
    inside = _erode(_silhouette(fig, base_idx, n), n, int(round(EDGE_MARGIN / GRID_RES)))
    for i in range(n * n):
        if not inside[i]:
            blocked[i] = 1
    bx0, by0, bx1, by1 = fig.bbox(t_idx)
    anchor = ((bx0 + bx1) / 2, (by0 + by1) / 2)
    free = _flood(blocked, _to_px(*anchor), n)
    return {"free": free, "decor": decor, "anchor": anchor, "n": n}


def _line_metrics(font_path, lines):
    """Ancho y alto de tinta de cada linea a tamano de referencia (x=1)."""
    out = []
    for line in lines:
        cs, _ = text_contours(font_path, line, REF_SIZE, 1.0)
        if not cs:
            sys.exit(f"La fuente no dio ningun contorno para '{line}'")
        xs = [p[0] for c in cs for p in c]
        ys = [p[1] for c in cs for p in c]
        out.append((max(xs) - min(xs), max(ys), min(ys)))
    return out


def _block_rects(metrics, size, xscale):
    """Rectangulos de cada linea relativos al centro del bloque (en mm)."""
    f = size / REF_SIZE
    n = len(metrics)
    tops, bots = [], []
    for k, (w, top, bot) in enumerate(metrics):
        base = -k * size * LINE_PITCH
        tops.append(base + top * f)
        bots.append(base + bot * f)
    mid = (max(tops) + min(bots)) / 2
    return [(-(w * f * xscale) / 2, bots[k] - mid, (w * f * xscale) / 2, tops[k] - mid)
            for k, (w, top, bot) in enumerate(metrics)]


def _relocate_decor(fig, free, n, decor, removed, rects, cx, cy, zones=()):
    """Intenta colocar los adornos que estorban en huecos libres, mejor debajo del nombre.
    -> ({pieza: (nuevo_x, nuevo_y)}, [piezas que no caben y se quitan])"""
    occ = bytearray(free)

    def block(x0, y0, x1, y1, m):
        ix0, iy0 = _to_px(x0 - m, y0 - m)
        ix1, iy1 = _to_px(x1 + m, y1 + m)
        for yy in range(max(iy0, 0), min(iy1 + 1, n)):
            row = yy * n
            for xx in range(max(ix0, 0), min(ix1 + 1, n)):
                occ[row + xx] = 0

    for r in rects:
        block(cx + r[0], cy + r[1], cx + r[2], cy + r[3], DECOR_MARGIN + 0.4)
    for z in zones:
        block(z[0], z[1], z[2], z[3], 0)
    boxes = dict(decor)
    keep = [i for i in boxes if i not in removed]
    for i in keep:
        block(*boxes[i], DECOR_MARGIN)
    text_bottom = cy + min(r[1] for r in rects)
    moved, failed = {}, []
    order = sorted(removed, key=lambda i: -((boxes[i][2] - boxes[i][0]) * (boxes[i][3] - boxes[i][1])))
    for i in order:
        x0, y0, x1, y1 = boxes[i]
        w, h = x1 - x0, y1 - y0
        ox, oy = (x0 + x1) / 2, (y0 + y1) / 2
        P = _integral(occ, n)
        m = DECOR_MARGIN
        best = None
        for gy in range(-46, 47):
            for gx in range(-46, 47):
                px, py = gx + 0.0, gy + 0.0
                if not _rect_free(P, n, px - w / 2 - m, py - h / 2 - m, px + w / 2 + m, py + h / 2 + m):
                    continue
                below = (py + h / 2) < text_bottom - 1.0
                cost = abs(px - ox) + 0.6 * (text_bottom - py) if below else 1000 + abs(px - ox) + abs(py - oy)
                if best is None or cost < best[0]:
                    best = (cost, px, py)
        if best is None:
            failed.append(i)
            continue
        _, px, py = best
        tx, ty = fig.comps[i]["t"][0], fig.comps[i]["t"][1]
        moved[i] = (tx + (px - ox), ty + (py - oy))
        block(px - w / 2, py - h / 2, px + w / 2, py + h / 2, m)
    return moved, failed


# figuras que se rellenan con adornos extra: (cuantos como maximo, tamano de las copias)
EXTRA_DECOR = {"stocking": (4, "small"), "reindeer": (2, "big")}
# zonas donde NO se colocan adornos movidos ni extras (cara y cuernos del reno): (x0, y0, x1, y1)
NO_PLACE_ZONES = {"reindeer": [(-34.0, 9.0, 8.0, 46.0)]}
TINY_DECOR_AREA = 13.5      # los puntitos de esta figura no se recolocan, solo se quitan (confunden la cara)
NO_RELOCATE_TINY = ("reindeer",)


def _zones(fig):
    for key, z in NO_PLACE_ZONES.items():
        if fig.name.lower().startswith(key):
            return z
    return []


def _add_extras(fig, free, n, decor, removed, moved, rects, cx, cy, count, kind="small", zones=()):
    """Copias de adornos existentes en huecos libres. -> [(pieza_origen, nuevo_x, nuevo_y)]"""
    occ = bytearray(free)

    def block(x0, y0, x1, y1, m):
        ix0, iy0 = _to_px(x0 - m, y0 - m)
        ix1, iy1 = _to_px(x1 + m, y1 + m)
        for yy in range(max(iy0, 0), min(iy1 + 1, n)):
            row = yy * n
            for xx in range(max(ix0, 0), min(ix1 + 1, n)):
                occ[row + xx] = 0

    for r in rects:
        block(cx + r[0], cy + r[1], cx + r[2], cy + r[3], 4.0)
    for z in zones:
        block(z[0], z[1], z[2], z[3], 0)
    cents = [(cx, cy)]
    srcs = []
    for i, b in decor:
        if i in removed:
            continue
        dx, dy = (moved[i][0] - fig.comps[i]["t"][0], moved[i][1] - fig.comps[i]["t"][1]) if i in moved else (0, 0)
        bx = (b[0] + dx, b[1] + dy, b[2] + dx, b[3] + dy)
        block(*bx, 1.8)
        cents.append(((bx[0] + bx[2]) / 2, (bx[1] + bx[3]) / 2))
        srcs.append((i, b))
    if not srcs:
        return []
    if kind == "big":      # copos y estrellas, no puntitos
        srcs = [a for a in srcs if 30 <= _area(a[1]) <= 120 and a[1][2] - a[1][0] <= 12]
        srcs.sort(key=lambda a: -_area(a[1]))
    else:
        srcs = [a for a in srcs if max(a[1][2] - a[1][0], a[1][3] - a[1][1]) <= 9] or srcs
        srcs.sort(key=lambda a: _area(a[1]))
    if not srcs:
        return []
    adds = []
    for k in range(count):
        best = None
        P = _integral(occ, n)
        for j in range(len(srcs)):
            i, b = srcs[(k + j) % len(srcs)]
            w, h = b[2] - b[0], b[3] - b[1]
            for gy in range(-46, 47):
                for gx in range(-46, 47):
                    if not _rect_free(P, n, gx - w / 2 - 1.0, gy - h / 2 - 1.0, gx + w / 2 + 1.0, gy + h / 2 + 1.0):
                        continue
                    d = min((gx - a) ** 2 + (gy - c) ** 2 for a, c in cents) ** 0.5
                    if best is None or d > best[0]:
                        best = (d, gx, gy, i, b)
            if best is not None and best[0] >= 4.5:
                break
        if best is None or best[0] < 4.5:
            break
        _, px, py, i, b = best
        w, h = b[2] - b[0], b[3] - b[1]
        ox, oy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
        t = fig.comps[i]["t"]
        adds.append((i, t[0] + (px - ox), t[1] + (py - oy)))
        block(px - w / 2, py - h / 2, px + w / 2, py + h / 2, 1.8)
        cents.append((px, py))
    return adds


HOOVES = {"reindeer": -22.0}     # figuras con pezunas: altura (y) por debajo de la cual estan las patas


def _stroke(pts, w):
    """polilinea -> contorno cerrado de grosor w con puntas redondas"""
    h = w / 2
    left, right = [], []
    for i, p in enumerate(pts):
        a, b = pts[max(i - 1, 0)], pts[min(i + 1, len(pts) - 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy) or 1e-9
        nx, ny = -dy / L * h, dx / L * h
        left.append((p[0] + nx, p[1] + ny))
        right.append((p[0] - nx, p[1] - ny))

    def cap(p, q):
        # media vuelta alrededor de p, de izquierda a derecha, por fuera (direccion p - q)
        a0 = math.atan2(p[1] - q[1], p[0] - q[0])
        return [(p[0] + h * math.cos(a0 + math.pi / 2 - k * math.pi / 8),
                 p[1] + h * math.sin(a0 + math.pi / 2 - k * math.pi / 8)) for k in range(1, 8)]
    ring = left + cap(pts[-1], pts[-2]) + right[::-1] + cap(pts[0], pts[1])
    return ring if area(ring) > 0 else ring[::-1]


HOOF_LINE_D = 3.2       # altura de la raya desde el final de la zona libre de la pata (mm)
HOOF_EXT = 1.5          # cuanto se alarga la raya hasta tocar el glaseado del borde (mm)
HOOF_W = 1.0            # grosor de las rayas (mm)


def _hooves(fig, free, n, y_top):
    """Pezunas como en el glaseado: una raya de borde a borde en cada pata."""
    iy_top = _to_px(0, y_top)[1]
    seen, comps = set(), []
    for iy in range(iy_top):
        row = iy * n
        for ix in range(n):
            if free[row + ix] and (ix, iy) not in seen:
                comp, stack = [], [(ix, iy)]
                seen.add((ix, iy))
                while stack:
                    a, b = stack.pop()
                    comp.append((a, b))
                    for c, d in ((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)):
                        if 0 <= c < n and 0 <= d < iy_top and (c, d) not in seen and free[d * n + c]:
                            seen.add((c, d))
                            stack.append((c, d))
                if len(comp) > 100:
                    comps.append(comp)
    polys = []
    for comp in comps:
        P = [(a * GRID_RES - GRID_EXT + GRID_RES / 2, b * GRID_RES - GRID_EXT + GRID_RES / 2) for a, b in comp]
        low = min(p[1] for p in P)
        tip = [p for p in P if p[1] <= low + 0.3]
        tx = sum(p[0] for p in tip) / len(tip)
        near = [p for p in P if math.hypot(p[0] - tx, p[1] - low) < 8]
        mx = sum(p[0] for p in near) / len(near)
        my = sum(p[1] for p in near) / len(near)
        if low < y_top - 14:
            u = (0.0, -1.0)                     # pata apoyada: pezuna horizontal
        else:                                   # pata levantada: segun la direccion de la pata
            sxx = sum((p[0] - mx) ** 2 for p in near)
            syy = sum((p[1] - my) ** 2 for p in near)
            sxy = sum((p[0] - mx) * (p[1] - my) for p in near)
            ang = 0.5 * math.atan2(2 * sxy, sxx - syy)
            u = (math.cos(ang), math.sin(ang))
            if (tx - mx) * u[0] + (low - my) * u[1] < 0:
                u = (-u[0], -u[1])
        v = (-u[1], u[0])
        tp = max(p[0] * u[0] + p[1] * u[1] for p in P)

        def width(d):
            band = [p[0] * v[0] + p[1] * v[1] for p in P if abs(p[0] * u[0] + p[1] * u[1] - (tp - d)) < 0.3]
            return (min(band), max(band)) if band else None

        def W(sd, t):
            base = tp - sd
            return (u[0] * base + v[0] * t, u[1] * base + v[1] * t)
        top, bot = width(HOOF_LINE_D), width(0.5)
        if not top or not bot:
            continue
        lo, hi = top[0] - HOOF_EXT, top[1] + HOOF_EXT
        sag = 0.45
        line = []
        for k in range(17):
            t = lo + (hi - lo) * k / 16
            m = (t - (lo + hi) / 2) / ((hi - lo) / 2)
            line.append(W(HOOF_LINE_D - sag * (1 - m * m), t))
        polys.append(_stroke(line, HOOF_W))
    return polys


def plan_generic(fig, args, font_path, lines, multi):
    plan = Plan()
    n = _grid_n()
    sp = analyze_free_space(fig)
    free, decor, (ax, ay) = sp["free"], sp["decor"], sp["anchor"]
    P_all = _integral(free, n)
    obst = bytearray(free)
    for _, (x0, y0, x1, y1) in decor:
        ix0, iy0 = _to_px(x0 - DECOR_MARGIN, y0 - DECOR_MARGIN)
        ix1, iy1 = _to_px(x1 + DECOR_MARGIN, y1 + DECOR_MARGIN)
        for yy in range(max(iy0, 0), min(iy1 + 1, n)):
            row = yy * n
            for xx in range(max(ix0, 0), min(ix1 + 1, n)):
                obst[row + xx] = 0
    P_clean = _integral(obst, n)

    metrics = _line_metrics(font_path, lines)
    cap = args.size * (MULTILINE_SCALE if multi else 1.0)
    xscales = sorted({1.0, round((1.0 + args.condense) / 2, 3), min(1.0, args.condense)}, reverse=True)
    cands = []
    for dy in [i * 0.5 for i in range(-90, 91)]:
        for dx in [i * 1.0 for i in range(-22, 23)]:
            cands.append((abs(dy) + 0.7 * abs(dx), dx, dy))
    cands.sort()

    def fit(P, c, s):
        rects = _block_rects(metrics, s, c)
        for _, dx, dy in cands:
            cx, cy = ax + dx, ay + dy
            if all(_rect_free(P, n, cx + r[0], cy + r[1], cx + r[2], cy + r[3]) for r in rects):
                return (s, c, cx, cy, rects)
        return None

    def search(P):
        best = None
        kmax = int((cap - MIN_TEXT_SIZE) / 0.25)
        for c in xscales:
            hit = fit(P, c, cap)
            if hit is None:
                if fit(P, c, cap - kmax * 0.25) is None:
                    continue
                lo, hi = 0, kmax            # lo: no cabe, hi: cabe
                while hi - lo > 1:
                    mid = (lo + hi) // 2
                    if fit(P, c, cap - mid * 0.25):
                        hi = mid
                    else:
                        lo = mid
                hit = fit(P, c, cap - hi * 0.25)
            if best is None or hit[0] > best[0] + 0.3 or (abs(hit[0] - best[0]) <= 0.3 and hit[1] > best[1]):
                best = hit
        return best

    bestA = search(P_clean)
    bestB = search(P_all)
    if bestB is None:
        raise ValueError("No cabe el nombre en esta figura (ni con letras pequenas).")
    use = bestA if (bestA is not None and bestA[0] >= 0.85 * bestB[0]) else bestB
    s, c, cx, cy, rects = use
    removed = []
    if use is bestB and not (bestA is not None and bestA[0] >= 0.85 * bestB[0]):
        for idx, (x0, y0, x1, y1) in decor:
            for r in rects:
                if not (x1 + DECOR_MARGIN < cx + r[0] or x0 - DECOR_MARGIN > cx + r[2]
                        or y1 + DECOR_MARGIN < cy + r[1] or y0 - DECOR_MARGIN > cy + r[3]):
                    removed.append(idx)
                    break
    moved = {}
    zones = _zones(fig)
    if removed:
        tiny = [i for i in removed if _area(dict(decor)[i]) <= TINY_DECOR_AREA] \
            if fig.name.lower().startswith(NO_RELOCATE_TINY) else []
        keep_rm = [i for i in removed if i not in tiny]
        moved, failed = _relocate_decor(fig, free, n, decor, keep_rm, rects, cx, cy, zones)
        removed = sorted(set(failed) | set(tiny))
    plan.adds = []
    for key, (cnt, kind) in EXTRA_DECOR.items():
        if fig.name.lower().startswith(key):
            plan.adds = _add_extras(fig, free, n, decor, removed, moved, rects, cx, cy, cnt, kind, zones)
    plan.hooves = []
    for key, rad in HOOVES.items():
        if fig.name.lower().startswith(key):
            plan.hooves = _hooves(fig, free, n, rad)
    contours, widths, missing = build_lines(font_path, lines, s, c)
    if missing:
        plan.messages.append("Aviso: la fuente no tiene estas letras: " + "".join(sorted(set(missing))))
    if s < cap - 0.01:
        plan.messages.append(f"Nombre largo: letras al tamano {s:.1f}" +
                             (f" y estrechadas al {c * 100:.0f}%" if c < 0.999 else "") + " para que quepa.")
    if moved:
        plan.messages.append(f"Muevo {len(moved)} adorno(s) que estorbaban a otro sitio libre" +
                             (f" y quito {len(removed)} (no cabian)." if removed else "."))
    elif removed:
        plan.messages.append(f"Quito {len(removed)} adorno(s) que estorbaban al nombre.")
    if s < 6.5 and not multi or s < 5.5:
        plan.messages.append("Aviso: nombre muy largo, las letras quedan muy pequenas (poco imprimible).")
    finish_text(plan, contours, cx, cy)
    plan.removed = sorted(removed)
    plan.moves.update(moved)
    plan.font_size = s
    plan.summary = (f"ancho {max(widths):.1f} mm, tamano {s:.1f}, centro ({cx:.1f}, {cy:.1f}), "
                    f"adornos movidos {len(moved)}, quitados {len(removed)}")
    return plan


# ---------------------------------------------------------------- aplicar el plan y programa principal
def _smallest_white(fig):
    """una pieza decorativa blanca pequena, para clonarla como base de una pieza nueva"""
    cands = [i for i in range(len(fig.comps)) if i != fig.text_idx and fig.parts[i]["extruder"] == 5
             and _area(fig.bbox(i)) < WALL_MIN_AREA]
    return min(cands, key=lambda i: _area(fig.bbox(i)))


def _sin_giro(mesh, rot):
    """Algunos modelos (el calcetin) traen el objeto del nombre girado. El plan se calcula con el texto
    horizontal, asi que se compensa el giro en la malla local para que el nombre salga horizontal."""
    if all(abs(a - b) < 1e-6 for a, b in zip(rot, (1, 0, 0, 0, 1, 0, 0, 0, 1))):
        return mesh
    verts, tris = mesh
    M = [rot[0:3], rot[3:6], rot[6:9]]       # mundo = local * M  ->  local = mundo * M^T
    nuevo = [tuple(sum(v[c] * M[r][c] for c in range(3)) for r in range(3)) for v in verts]
    return nuevo, tris


def apply_plan(fig, plan, text, args_name_font_size=None):
    fig.set_text_mesh(*_sin_giro(plan.mesh, fig.comps[fig.text_idx]["rot"]))
    fig.set_translation(fig.text_idx, plan.center[0], plan.center[1], plan.tz)
    for idx, (x, y) in plan.moves.items():
        fig.set_translation(idx, x, y)
    for src, x, y in plan.adds:
        fig.clone(src, x, y)
    for poly in plan.hooves:
        src = _smallest_white(fig)
        xs, ys = [p[0] for p in poly], [p[1] for p in poly]
        cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
        fig.clone(src, cx, cy, "Pezuna")
        fig.set_mesh(len(fig.comps) - 1, *extrude(group_contours([poly]), -0.35, 0.35, cx, cy))
    fig.delete(plan.removed)
    fig.set_text_info(text, plan.font_size, len(plan.mesh[1]))


def parse_args(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input", help="fichero .3mf de la figura")
    ap.add_argument("name", help="nombre a poner")
    ap.add_argument("-o", "--output", help="fichero de salida (por defecto: <input>_<nombre>.3mf)")
    ap.add_argument("--font", help="fuente .ttf/.otf (por defecto una fuente incluida)")
    ap.add_argument("--size", type=float, default=NAME_FONT_SIZE, help="tamano de letra maximo (def. 13)")
    ap.add_argument("--max-width", type=float, default=MAX_NAME_WIDTH,
                    help="[solo Gingerbread] ancho maximo del nombre en mm (def. 38)")
    ap.add_argument("--condense", type=float, default=0.8,
                    help="en nombres largos, cuanto se pueden estrechar las letras (def. 0.8; 1 = no estrechar)")
    ap.add_argument("--arms", choices=["auto", "keep", "remove"], default="auto",
                    help="[solo Gingerbread] rayas de los brazos: auto = se quitan solo si el nombre no cabe "
                         "(def.), keep = dejarlas siempre, remove = quitarlas siempre")
    ap.add_argument("--wide-width", type=float, default=WIDE_NAME_WIDTH,
                    help="[solo Gingerbread] ancho maximo del nombre cuando se quitan las rayas (def. 50)")
    ap.add_argument("--buttons", choices=["auto", "0", "1", "2", "3"], default="auto",
                    help="[solo Gingerbread] numero de botones: auto = 3 (o 2 si el nombre esta apilado)")
    ap.add_argument("--single-line", action="store_true",
                    help="no apilar nombres compuestos (todo en una linea)")
    args = ap.parse_args(argv)
    ap.error = lambda m: sys.exit("Error: " + m)
    for opt, val, lo, hi in (("--size", args.size, 0, None), ("--max-width", args.max_width, 0, None),
                             ("--wide-width", getattr(args, "wide_width", 1), 0, None),
                             ("--condense", args.condense, 0, 1)):
        if not val > lo or (hi is not None and val > hi):
            ap.error(f"{opt} debe ser mayor que 0" + (f" y como mucho {hi}" if hi else ""))
    return args


def build_plan(args):
    """Calcula que hay que hacer. -> (figura, plan, texto). No escribe nada."""
    name = args.name.strip()
    if not name:
        sys.exit("Nombre vacio")
    font_path = find_font(args.font)
    try:
        fig = Figure(args.input)
    except (ValueError, OSError, zipfile.BadZipFile, KeyError) as e:
        sys.exit(f"No puedo leer el 3mf: {e}")
    words = name.split()
    multi = len(words) > 1 and not args.single_line
    if multi and len(words) > 3:
        sys.exit("Maximo 3 palabras apiladas. Usa --single-line o un nombre mas corto.")
    lines = words if multi else [name]
    try:
        if fig.name.lower().startswith("gingerbread"):
            plan = plan_gingerbread(fig, args, font_path, lines, multi)
        else:
            plan = plan_generic(fig, args, font_path, lines, multi)
    except ValueError as e:
        sys.exit(str(e))
    plan.text = name
    plan.font_path = font_path
    return fig, plan, name


# ---------------------------------------------------------------- figuras incluidas y vista previa
FIGURES = [  # (nombre para mostrar, fichero dentro de models/, solo_gingerbread)
    ("Galleta Gingerbread", "Gingerbread.3mf"),
    ("Árbol de Navidad", "ChristmasTree.3mf"),
    ("Saco de Papá Noel", "SantaSack.3mf"),
    ("Pudin de Navidad", "XmasPud.3mf"),
    ("Calcetín", "Stocking.3mf"),
    ("Oso", "Bear.3mf"),
    ("Estrella", "Star.3mf"),
    ("Reno", "Reindeer.3mf"),
]


def models_dir():
    for base in (_AQUI, os.path.dirname(os.path.abspath(__file__))):
        d = os.path.join(base, "models")
        if os.path.isdir(d):
            return d
    return os.path.join(_AQUI, "models")


def previews_dir():
    for base in (_AQUI, os.path.dirname(os.path.abspath(__file__))):
        d = os.path.join(base, "previews")
        if os.path.isdir(d):
            return d
    return os.path.join(_AQUI, "previews")


def preview_plan(argv):
    """Calcula el resultado sin escribir ningun fichero (para la vista previa de la interfaz).
    -> dict: groups (letras en mm: [(exterior, [agujeros])]), removed (piezas 0-based que se quitan),
             moves ({pieza: (dx, dy)} desplazamiento en mm), messages, summary, figure (stem del 3mf)."""
    args = parse_args(argv)
    fig, plan, name = build_plan(args)
    moves = {i: (x - fig.comps[i]["t"][0], y - fig.comps[i]["t"][1]) for i, (x, y) in plan.moves.items()}
    return {"groups": plan.groups + [(h, []) for h in plan.hooves], "removed": list(plan.removed), "moves": moves,
            "adds": [(s_, x - fig.comps[s_]["t"][0], y - fig.comps[s_]["t"][1]) for s_, x, y in plan.adds],
            "messages": list(plan.messages), "summary": plan.summary,
            "figure": os.path.splitext(os.path.basename(args.input))[0],
            "bbox": plan.bbox}


def main(argv=None):
    args = parse_args(argv)
    out_path = args.output or re.sub(r"\.3mf$", "", args.input, flags=re.I) + "_" + \
        re.sub(r"[^\w\-]+", "_", args.name.strip()) + ".3mf"
    fig, plan, name = build_plan(args)
    for m in plan.messages:
        print(m)
    apply_plan(fig, plan, name)
    try:
        carpeta = os.path.dirname(os.path.abspath(out_path))
        os.makedirs(carpeta, exist_ok=True)
        fig.save(out_path)
    except OSError as e:
        sys.exit(f"No puedo guardar en {out_path}: {e.strerror or e}. Prueba otra carpeta.")
    print(f"OK -> {out_path}")
    print(f"  figura: {fig.name}  nombre: '{name}'  fuente: {os.path.basename(plan.font_path)}")
    print("  " + plan.summary)


if __name__ == "__main__":
    main()
