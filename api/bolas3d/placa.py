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


def _base(figs):
    """Ajustes de proyecto: la impresora H2D con mas filamentos (los demas modelos caben en ella)."""
    def punt(f):
        return ("H2D" in str(f["proj"].get("printer_model", "")), len(f["proj"].get("filament_colour", [])))
    return max(figs, key=punt)


def _cama(proj):
    try:
        pts = [p.split("x") for p in proj["printable_area"]]
        return max(float(a) for a, _ in pts), max(float(b) for _, b in pts)
    except Exception:
        return 350.0, 320.0


def _centros(n, ancho, alto):
    """3 columnas y 2 filas. La segunda fila (si hay menos de 3) va centrada."""
    cw = ancho / 3
    y1, y2 = alto * 0.17, alto * 0.55   # arriba queda libre el hueco de la torre de purga
    fila1 = min(n, 3)
    fila2 = n - fila1
    res = [(cw * (i + 0.5), y1) for i in range(fila1)]
    off = (3 - fila2) * cw / 2
    res += [(off + cw * (i + 0.5), y2) for i in range(fila2)]
    return res


def unir_3mf(lista):
    """lista: bytes de 3MF (1 a 5) -> bytes de un 3MF con todas las figuras en una cama."""
    if not lista:
        raise ValueError("No hay figuras que juntar")
    figs = [_leer(d) for d in lista]
    base = _base(figs)
    ancho, alto = _cama(base["proj"])
    centros = _centros(len(figs), ancho, alto)

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
        proj["wipe_tower_x"] = [str(round(ancho / 2 - 30))] * len(proj.get("wipe_tower_x", ["0", "0"]))
        proj["wipe_tower_y"] = [str(round(alto * 0.75))] * len(proj.get("wipe_tower_y", ["0", "0"]))
        z.writestr("Metadata/project_settings.config", json.dumps(proj, indent=4, ensure_ascii=False))
        z.writestr("Metadata/model_settings.config", ajustes)
        z.writestr("Metadata/cut_information.xml", '<?xml version="1.0" encoding="utf-8"?>\n<objects>\n' + "\n".join(cortes) + "\n</objects>\n")
        z.writestr("Metadata/slice_info.config", '<?xml version="1.0" encoding="UTF-8"?>\n<config>\n  <header>\n'
                   '    <header_item key="X-BBL-Client-Type" value="slicer"/>\n    <header_item key="X-BBL-Client-Version" value="02.03.01.51"/>\n'
                   '  </header>\n</config>\n')
    return salida.getvalue()
