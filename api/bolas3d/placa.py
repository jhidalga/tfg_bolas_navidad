"""Junta varios 3MF de Bambu Studio (una figura cada uno) en un solo 3MF con todas las figuras en la misma cama."""
import io
import json
import re
import uuid
import zipfile

CABECERA = ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" '
            'xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" '
            'xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p">\n'
            ' <metadata name="Application">BambuStudio-02.03.01.51</metadata>\n'
            ' <metadata name="BambuStudio:3mfVersion">1</metadata>\n')

REL_MODELO = "http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"


def _uid():
    return str(uuid.uuid4())


def _leer(datos):
    """Saca de un 3MF la figura principal: su bloque de recursos, ajustes, mallas y posicion en la cama."""
    z = zipfile.ZipFile(io.BytesIO(datos))
    modelo = z.read("3D/3dmodel.model").decode("utf-8")
    item = re.search(r'<build[^>]*>.*?<item\s+([^>]*)/>', modelo, re.S)
    if not item:
        raise ValueError("El 3MF no tiene ninguna figura en la cama")
    objid = re.search(r'objectid="(\d+)"', item.group(1)).group(1)
    tz = re.search(r'transform="([^"]+)"', item.group(1)).group(1).split()
    z_item = tz[11] if len(tz) == 12 else "1.1"
    bloque = re.search(r'<object id="%s"[^>]*>.*?</object>' % objid, modelo, re.S)
    if not bloque:
        raise ValueError("No encuentro la figura dentro del 3MF")
    ajustes = z.read("Metadata/model_settings.config").decode("utf-8")
    obj_aj = re.search(r'<object id="%s">.*?</object>' % objid, ajustes, re.S)
    if not obj_aj:
        raise ValueError("Faltan los ajustes de la figura")
    plate = re.search(r'<plate>.*?</plate>', ajustes, re.S).group(0)
    proj = json.loads(z.read("Metadata/project_settings.config"))
    mallas = {}
    for p in set(re.findall(r'p:path="([^"]+)"', bloque.group(0))):
        mallas[p] = z.read(p.lstrip("/")).decode("utf-8")
    return {"bloque": bloque.group(0), "ajustes": obj_aj.group(0), "plate": plate, "proj": proj,
            "proj_bytes": z.read("Metadata/project_settings.config"), "mallas": mallas, "z": z_item,
            "content_types": z.read("[Content_Types].xml")}


_BASE = None


def _base(figs=None):
    """Ajustes de proyecto: los del reno (6 filamentos) pasados a una sola boquilla y con los datos de la Bambu Lab A1.
    Asi todos los packs salen con la A1 de cama 256x256, vengan las figuras de la plantilla que vengan."""
    global _BASE
    if _BASE is None:
        import os
        carpeta = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
        with zipfile.ZipFile(os.path.join(carpeta, "Reindeer.3mf")) as z:
            ajustes = z.read("Metadata/model_settings.config").decode("utf-8")
            proj = json.loads(z.read("Metadata/project_settings.config"))
            content_types = z.read("[Content_Types].xml")
        with open(os.path.join(carpeta, "A1_maquina.json"), encoding="utf-8") as f:
            a1 = json.load(f)
        # la H2D tiene dos boquillas: nos quedamos con una sola
        for k, v in list(proj.items()):
            if isinstance(v, list) and len(v) == 2 and k in a1 and isinstance(a1[k], list) and len(a1[k]) == 1:
                proj[k] = v[:1]
        for k in ("default_nozzle_volume_type", "extruder_colour", "extruder_offset", "extruder_type", "extruder_variant_list",
                  "flush_multiplier", "grab_length", "machine_min_extruding_rate", "machine_min_travel_rate", "max_layer_height",
                  "min_layer_height", "nozzle_diameter", "nozzle_volume_type", "wipe_tower_x", "wipe_tower_y"):
            if isinstance(proj.get(k), list) and len(proj[k]) > 1:
                proj[k] = proj[k][:1]
        proj.update(a1)
        proj["physical_extruder_map"] = ["0"]
        proj["filament_map"] = ["1"] * len(proj["filament_colour"])
        plate = re.search(r'<plate>.*?</plate>', ajustes, re.S).group(0)
        n_fil = len(proj["filament_colour"])
        plate = re.sub(r'(<metadata key="filament_maps" value=")[^"]*"', lambda m: m.group(1) + " ".join(["1"] * n_fil) + '"', plate)
        _BASE = {"plate": plate, "proj": proj, "content_types": content_types}
        _BASE["proj_bytes"] = json.dumps(proj).encode("utf-8")
    return _BASE


def _cama(proj):
    try:
        pts = [p.split("x") for p in proj["printable_area"]]
        return max(float(a) for a, _ in pts), max(float(b) for _, b in pts)
    except Exception:
        return 256.0, 256.0


def _caja(f):
    """Caja (xmin, xmax, ymin, ymax) que ocupa la figura en la cama, sin contar donde la pongamos."""
    bloques = {}
    for ruta, txt in f["mallas"].items():
        for m in re.finditer(r'<object id="(\d+)"[^>]*>(.*?)</object>', txt, re.S):
            bloques[(ruta, m.group(1))] = m.group(2)
    xs, ys = [], []
    for m in re.finditer(r'<component p:path="([^"]+)" objectid="(\d+)"[^>]*?transform="([^"]+)"', f["bloque"]):
        t = [float(v) for v in m.group(3).split()]
        cuerpo = bloques.get((m.group(1), m.group(2)))
        if cuerpo is None or len(t) != 12:
            continue
        for v in re.finditer(r'<vertex x="([^"]+)" y="([^"]+)"', cuerpo):
            x, y = float(v.group(1)), float(v.group(2))
            xs.append(t[0] * x + t[3] * y + t[9])
            ys.append(t[1] * x + t[4] * y + t[10])
    if not xs:
        return -40.0, 40.0, -45.0, 45.0
    return min(xs), max(xs), min(ys), max(ys)


TORRE = (40.0, 40.0)   # ancho y fondo que dejamos libres para la torre de purga


def _centros(cajas, ancho, alto):
    """Hasta 6 figuras: 3 columnas y 2 filas. Cada columna es igual de ancha y cada fila tan alta como su figura mas alta.
    La torre de purga va al fondo, en el hueco que queda detras de las dos filas. La fila de delante deja libre el borde de la A1."""
    margen_x, margen_frente, hueco = 6.0, 14.0, 5.0
    n = len(cajas)
    fila1 = min(n, 3)
    filas = [list(range(0, fila1)), list(range(fila1, n))]
    anchos = [c[1] - c[0] for c in cajas]
    altos = [c[3] - c[2] for c in cajas]
    cw = (ancho - 2 * margen_x) / 3
    y = margen_frente
    res = [None] * n
    for fila in filas:
        if not fila:
            continue
        alto_fila = max(altos[i] for i in fila)
        off = (3 - len(fila)) * cw / 2
        for k, i in enumerate(fila):
            cx = margen_x + off + cw * (k + 0.5)
            cy = y + alto_fila / 2
            # el origen de la figura no esta en el centro de su caja: lo corregimos
            res[i] = (cx - (cajas[i][0] + cajas[i][1]) / 2, cy - (cajas[i][2] + cajas[i][3]) / 2)
        y += alto_fila + hueco
    return res, y


def unir_3mf(lista):
    """lista: bytes de 3MF (1 a 6) -> bytes de un 3MF con todas las figuras en una cama."""
    if not lista:
        raise ValueError("No hay figuras que juntar")
    figs = [_leer(d) for d in lista]
    base = _base(figs)
    ancho, alto = _cama(base["proj"])
    centros, y_torre = _centros([_caja(f) for f in figs], ancho, alto)

    recursos, items, ajustes_obj, instancias, assemble, cortes = [], [], [], [], [], []
    mallas_nuevas = []   # bloques <object> de todas las figuras con ids unicos
    sig = [1]            # siguiente id de malla libre
    bloque_malla = re.compile(r'<object id="(\d+)"([^>]*)>(.*?)</object>', re.S)
    for i, f in enumerate(figs):
        nid = 101 + i
        # bloques de malla de esta figura por (ruta, id)
        por_ruta = {ruta: {m.group(1): m for m in bloque_malla.finditer(txt)} for ruta, txt in f["mallas"].items()}
        nuevo_id = {}   # id viejo -> id nuevo (para los <part id> de los ajustes)
        n_comp = [0]

        def cambia(m):
            ruta, oid = m.group(1), m.group(2)
            bm = por_ruta[ruta][oid]
            n = sig[0]; sig[0] += 1
            nuevo_id[oid] = n
            attrs = re.sub(r'p:UUID="[^"]*"', 'p:UUID="%08x-81cb-4c03-9d28-80fed5dfa1dc"' % (0x00010000 + n - 1), bm.group(2))
            mallas_nuevas.append(' <object id="%d"%s>%s</object>' % (n, attrs, bm.group(3)))
            k = n_comp[0]; n_comp[0] += 1
            resto = re.sub(r'p:UUID="[^"]*"', 'p:UUID="%04x%04x-b206-40ff-9872-83e8017abed1"' % (i + 1, k), m.group(3))
            return '<component p:path="/3D/Objects/object_1.model" objectid="%d"%s' % (n, resto)

        bloque = re.sub(r'<component p:path="([^"]+)" objectid="(\d+)"([^>]*)', cambia, f["bloque"])
        bloque = re.sub(r'<object id="\d+"', '<object id="%d"' % nid, bloque, count=1)
        bloque = re.sub(r'(<object id="%d"[^>]*?)p:UUID="[^"]*"' % nid, lambda m: '%sp:UUID="%08x-61cb-4c03-9d28-80fed5dfa1dc"' % (m.group(1), i + 1), bloque, count=1)
        recursos.append(bloque)
        cx, cy = centros[i]
        items.append('  <item objectid="%d" p:UUID="%08x-b1ec-4553-aec9-835e5b724bb4" transform="1 0 0 0 1 0 0 0 1 %.4f %.4f %s" printable="1" />'
                     % (nid, i + 1, cx, cy, f["z"]))
        aj = re.sub(r'<object id="\d+">', '<object id="%d">' % nid, f["ajustes"], count=1)
        aj = re.sub(r'<part id="(\d+)"', lambda m: '<part id="%d"' % nuevo_id.get(m.group(1), int(m.group(1))), aj)
        aj = re.sub(r' uuid="[^"]*"', lambda m: ' uuid="%s"' % _uid(), aj)
        ajustes_obj.append("  " + aj)
        instancias.append('    <model_instance>\n      <metadata key="object_id" value="%d"/>\n'
                          '      <metadata key="instance_id" value="0"/>\n'
                          '      <metadata key="identify_id" value="%d"/>\n    </model_instance>' % (nid, 500 + i))
        assemble.append('   <assemble_item object_id="%d" instance_id="0" transform="1 0 0 0 1 0 0 0 1 0 0 %s" offset="0 0 0" />' % (nid, f["z"]))
        cortes.append(' <object id="%d">\n  <cut_id id="0" check_sum="1" connectors_cnt="0"/>\n </object>' % nid)

    malla_xml = (CABECERA + " <resources>\n" + "\n".join(mallas_nuevas) + "\n </resources>\n <build/>\n</model>\n")
    ficheros = {"3D/Objects/object_1.model": malla_xml.encode("utf-8")}
    rels = ["/3D/Objects/object_1.model"]

    modelo = (CABECERA + " <resources>\n" + "\n".join(recursos) + "\n </resources>\n"
              + ' <build p:UUID="%s">\n' % _uid() + "\n".join(items) + "\n </build>\n</model>\n")

    # cama: copiamos los avisos de filamentos de la placa de la figura base, sin las miniaturas
    cab_plate = re.findall(r'<metadata key="(filament_map_mode|filament_maps)" value="[^"]*"/>', base["plate"])
    meta = "".join('    <metadata key="%s" value="%s"/>\n' % (k, v) for k, v in
                   re.findall(r'<metadata key="(filament_map_mode|filament_maps)" value="([^"]*)"/>', base["plate"]))
    placa = ('  <plate>\n    <metadata key="plater_id" value="1"/>\n    <metadata key="plater_name" value=""/>\n'
             '    <metadata key="locked" value="false"/>\n' + meta + "\n".join(instancias) + "\n  </plate>")
    ajustes = ('<?xml version="1.0" encoding="UTF-8"?>\n<config>\n' + "\n".join(ajustes_obj) + "\n" + placa
               + "\n  <assemble>\n" + "\n".join(assemble) + "\n  </assemble>\n</config>\n")

    rels_xml = ('<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n'
                + "".join(' <Relationship Target="%s" Id="rel-%d" Type="%s"/>\n' % (r, n + 1, REL_MODELO) for n, r in enumerate(rels))
                + "</Relationships>\n")
    raiz = ('<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n'
            ' <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="%s"/>\n</Relationships>\n' % REL_MODELO)

    salida = io.BytesIO()
    with zipfile.ZipFile(salida, "w", zipfile.ZIP_DEFLATED, compresslevel=1) as z:
        z.writestr("[Content_Types].xml", base["content_types"])
        z.writestr("_rels/.rels", raiz)
        z.writestr("3D/3dmodel.model", modelo)
        z.writestr("3D/_rels/3dmodel.model.rels", rels_xml)
        for ruta, datos in ficheros.items():
            z.writestr(ruta, datos)
        proj = dict(base["proj"])
        proj["wipe_tower_x"] = [str(round(ancho / 2 - TORRE[0] / 2))]
        proj["wipe_tower_y"] = [str(round(min(y_torre + 2, alto - TORRE[1] - 4)))]
        z.writestr("Metadata/project_settings.config", json.dumps(proj, indent=4, ensure_ascii=False))
        z.writestr("Metadata/model_settings.config", ajustes)
        z.writestr("Metadata/cut_information.xml", '<?xml version="1.0" encoding="utf-8"?>\n<objects>\n' + "\n".join(cortes) + "\n</objects>\n")
        z.writestr("Metadata/slice_info.config", '<?xml version="1.0" encoding="UTF-8"?>\n<config>\n  <header>\n'
                   '    <header_item key="X-BBL-Client-Type" value="slicer"/>\n    <header_item key="X-BBL-Client-Version" value="02.03.01.51"/>\n'
                   '  </header>\n</config>\n')
    return salida.getvalue()
