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
        mallas[p] = z.read(p.lstrip("/"))
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
    cw, ch = ancho / 3, alto / 2
    fila1 = min(n, 3)
    fila2 = n - fila1
    res = [(cw * (i + 0.5), ch * 0.5) for i in range(fila1)]
    off = (3 - fila2) * cw / 2
    res += [(off + cw * (i + 0.5), ch * 1.5) for i in range(fila2)]
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
    ficheros = {}   # ruta nueva -> bytes
    rels = []
    for i, f in enumerate(figs):
        nid = 101 + i
        bloque = f["bloque"]
        bloque = re.sub(r'<object id="\d+"', '<object id="%d"' % nid, bloque, count=1)
        for k, (ruta, datos) in enumerate(f["mallas"].items()):
            nueva = "/3D/Objects/fig%d_%d.model" % (i + 1, k + 1)
            bloque = bloque.replace('p:path="%s"' % ruta, 'p:path="%s"' % nueva)
            ficheros[nueva.lstrip("/")] = datos
            rels.append(nueva)
        bloque = re.sub(r'p:UUID="[^"]*"', lambda m: 'p:UUID="%s"' % _uid(), bloque)
        recursos.append(bloque)
        cx, cy = centros[i]
        items.append('  <item objectid="%d" p:UUID="%s" transform="1 0 0 0 1 0 0 0 1 %.4f %.4f %s" printable="1" />'
                     % (nid, _uid(), cx, cy, f["z"]))
        aj = re.sub(r'<object id="\d+">', '<object id="%d">' % nid, f["ajustes"], count=1)
        ajustes_obj.append("  " + aj)
        instancias.append('    <model_instance>\n      <metadata key="object_id" value="%d"/>\n'
                          '      <metadata key="instance_id" value="0"/>\n'
                          '      <metadata key="identify_id" value="%d"/>\n    </model_instance>' % (nid, 500 + i))
        assemble.append('   <assemble_item object_id="%d" instance_id="0" transform="1 0 0 0 1 0 0 0 1 0 0 %s" offset="0 0 0" />' % (nid, f["z"]))
        cortes.append(' <object id="%d">\n  <cut_id id="0" check_sum="1" connectors_cnt="0"/>\n </object>' % nid)

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
        z.writestr("Metadata/project_settings.config", base["proj_bytes"])
        z.writestr("Metadata/model_settings.config", ajustes)
        z.writestr("Metadata/cut_information.xml", '<?xml version="1.0" encoding="utf-8"?>\n<objects>\n' + "\n".join(cortes) + "\n</objects>\n")
        z.writestr("Metadata/slice_info.config", '<?xml version="1.0" encoding="UTF-8"?>\n<config>\n  <header>\n'
                   '    <header_item key="X-BBL-Client-Type" value="slicer"/>\n    <header_item key="X-BBL-Client-Version" value="02.03.01.51"/>\n'
                   '  </header>\n</config>\n')
    return salida.getvalue()
