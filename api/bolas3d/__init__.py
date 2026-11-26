"""Genera el 3MF personalizado de una bola con el nombre del cliente."""
import io
import os
import re
import tempfile
import unicodedata
import zipfile

from . import gingerbread_name as _g

MAX_NOMBRE = 40

# palabras del nombre del modelo en la tienda -> fichero de la figura
FIGURAS = [
    (("gingerbread", "galleta", "jengibre", "muneco", "muñeco"), "Gingerbread.3mf"),
    (("arbol", "árbol", "tree"), "ChristmasTree.3mf"),
    (("saco", "sack"), "SantaSack.3mf"),
    (("pudin", "pudín", "pudding", "pud"), "XmasPud.3mf"),
    (("calcetin", "calcetín", "stocking", "media"), "Stocking.3mf"),
    (("oso", "bear"), "Bear.3mf"),
    (("estrella", "star"), "Star.3mf"),
    (("reno", "reindeer"), "Reindeer.3mf"),
]


def _norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    return s


def figura_para(modelo):
    """Nombre del modelo de la tienda -> fichero .3mf, o None si no se reconoce."""
    m = _norm(modelo)
    for palabras, fichero in FIGURAS:
        for p in palabras:
            if re.search(r"\b" + re.escape(_norm(p)), m):
                return fichero
    return None


def limpiar_nombre(texto):
    t = re.sub(r"\s+", " ", (texto or "")).strip()
    t = "".join(c for c in t if c.isalpha() or c in " -'.")
    return t[:MAX_NOMBRE].strip()


def generar_3mf(modelo, nombre):
    """-> bytes del .3mf. Lanza ValueError con un mensaje claro si no se puede."""
    fichero = figura_para(modelo)
    if not fichero:
        raise ValueError(f"No reconozco la figura '{modelo}'")
    nombre = limpiar_nombre(nombre)
    if not nombre:
        raise ValueError("El nombre esta vacio")
    aqui = os.path.dirname(os.path.abspath(__file__))
    entrada = os.path.join(aqui, "models", fichero)
    fuente = os.path.join(aqui, "fonts", "SantaNorthPole.otf")
    with tempfile.TemporaryDirectory() as tmp:
        salida = os.path.join(tmp, "salida.3mf")
        try:
            _g.main([entrada, nombre, "-o", salida, "--font", fuente])
        except SystemExit as e:
            raise ValueError(str(e.code) if e.code else "No se pudo generar el 3MF")
        with open(salida, "rb") as f:
            datos = f.read()
    if fichero == "Stocking.3mf":
        datos = _calcetin_rojo(datos)
    return datos


def _calcetin_rojo(datos):
    """El calcetin va siempre en rojo: el filamento 4 (el del cuerpo) pasa de marron a rojo."""
    import io, json, zipfile
    ent = zipfile.ZipFile(io.BytesIO(datos))
    sal = io.BytesIO()
    with zipfile.ZipFile(sal, "w", zipfile.ZIP_DEFLATED) as z:
        for info in ent.infolist():
            b = ent.read(info.filename)
            if info.filename == "Metadata/project_settings.config":
                proj = json.loads(b)
                col = proj.get("filament_colour")
                if isinstance(col, list) and len(col) >= 4:
                    col[3] = "#C12E1F"
                b = json.dumps(proj).encode("utf-8")
            z.writestr(info, b)
    return sal.getvalue()


def nombre_fichero(modelo, nombre, cantidad=1):
    base = re.sub(r"[^A-Za-z0-9]+", "_", _norm(f"{modelo}_{nombre}")).strip("_")
    return f"{base}_x{cantidad}.3mf" if cantidad and cantidad > 1 else f"{base}.3mf"


def zip_pedido(items):
    """items: lista de (modelo, nombre, cantidad) -> bytes de un zip con un 3mf por bola."""
    buf = io.BytesIO()
    usados = set()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_STORED) as z:
        for modelo, nombre, cantidad in items:
            fn = nombre_fichero(modelo, nombre, cantidad)
            k = 2
            while fn in usados:
                fn = fn.replace(".3mf", f"_{k}.3mf"); k += 1
            usados.add(fn)
            z.writestr(fn, generar_3mf(modelo, nombre))
    return buf.getvalue()


def zip_lineas(items):
    """items: lista de (nombre_de_archivo, modelo, nombre) -> bytes de un zip con un 3mf por elemento."""
    buf = io.BytesIO()
    usados = set()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_STORED) as z:
        for fn, modelo, nombre in items:
            base, k = fn, 2
            while fn in usados:
                fn = base.replace(".3mf", f"_{k}.3mf"); k += 1
            usados.add(fn)
            z.writestr(fn, generar_3mf(modelo, nombre))
    return buf.getvalue()
