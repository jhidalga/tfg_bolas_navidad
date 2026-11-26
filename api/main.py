def _comprobar_editable(cliente, pedido_id: str):
    """El admin puede cambiar bolas de cualquier pedido, pagado o no, salvo si esta anulado."""
    r = cliente.table("pedidos").select("estado, pagado").eq("id", pedido_id).execute().data
    if not r:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    if r[0].get("estado") == "Cancelado":
        raise HTTPException(status_code=409, detail="Este pedido está anulado, no se puede cambiar.")


def _comprobar_anulable(cliente, pedido_id: str):
    """Anular entero sigue pidiendo pedido Pendiente y sin pagar."""
    r = cliente.table("pedidos").select("estado, pagado").eq("id", pedido_id).execute().data
    if not r:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    if r[0].get("pagado") and r[0].get("estado") != "Cancelado":
        raise HTTPException(status_code=409, detail="Este pedido ya está pagado y no se puede anular.")
    if r[0].get("estado") != "Pendiente":
        raise HTTPException(status_code=409, detail="Solo se pueden anular pedidos Pendientes.")


def _tras_cambiar_bolas(escritor, pedido_id: str, hay_bola_nueva: bool = False) -> str:
    """Despues de editar, añadir o quitar bolas: si hay una bola por imprimir en un pedido Completado, vuelve a Pendiente.
    Si ya estan hechas todas las de un Pendiente, pasa a Completado. Devuelve el estado final."""
    ped = escritor.table("pedidos").select("estado").eq("id", pedido_id).execute().data
    estado = ped[0].get("estado") if ped else "Pendiente"
    if hay_bola_nueva and estado == "Completado":
        _escribir(escritor.table("pedidos").update({"estado": "Pendiente"}).eq("id", pedido_id), "No se pudo reabrir el pedido")
        estado = "Pendiente"
    if estado == "Pendiente":
        estado = _revisar_completado(escritor, pedido_id) or estado
    return estado


import os
import html as _html
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr, formatdate, make_msgid
import logging
import re
import time
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Header, Response, Request
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from starlette.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from supabase import ClientOptions, create_client, Client
from dotenv import load_dotenv
from pydantic import BaseModel, Field
import jwt
try:
    from .bolas3d import zip_pedido, zip_lineas, generar_3mf, nombre_fichero, figura_para
    from .bolas3d.placa import unir_3mf
    from .bolas3d.preview import preview_png
except ImportError:
    from bolas3d import zip_pedido, zip_lineas, generar_3mf, nombre_fichero, figura_para
    from bolas3d.placa import unir_3mf
    from bolas3d.preview import preview_png

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
app = FastAPI()
# Nunca se activa en Railway aunque la variable estuviera puesta
MODO_PRUEBA = os.getenv("MODO_PRUEBA") == "1" and not os.getenv("RAILWAY_ENVIRONMENT") and not os.getenv("RAILWAY_PROJECT_ID")

_MENSAJE_NO_ANULAR = {
    "Completado": "Este pedido ya está completado e impreso, no se puede anular.",
    "Entregado": "Este pedido ya está entregado, no se puede anular.",
    "Cancelado": "Este pedido ya está anulado.",
}

MAX_ESPACIOS_NOMBRE = 2  # 3 palabras

def _error_nombre_bola(nombre: str, personalizable: bool):
    """Texto del error si el nombre de la bola no vale, o None. Como maximo 3 palabras y no puede ir vacio."""
    n = re.sub(r"\s+", " ", (nombre or "").strip())
    if personalizable and (not n or n == "Sin texto"):
        return "Escribe el nombre de la bola"
    if n.count(" ") > MAX_ESPACIOS_NOMBRE:
        return f"El nombre puede tener como maximo 3 palabras"
    return None


class ItemCarrito(BaseModel):
    producto_id: str
    modelo_id: str
    modelo: str
    color: str
    personalizacion: str = Field(max_length=60)
    cantidad: int = Field(1, ge=1, le=50)

class EdicionBola(BaseModel):
    producto_id: Optional[str] = None
    modelo: Optional[str] = Field(None, max_length=80)
    color: Optional[str] = Field(None, max_length=40)
    personalizacion: Optional[str] = Field(None, max_length=60)
    cantidad: Optional[int] = Field(None, ge=1, le=50)

class NuevaBola(BaseModel):
    producto_id: str
    modelo: str = Field(..., max_length=80)
    color: str = Field(..., max_length=40)
    personalizacion: str = Field("", max_length=60)
    cantidad: int = Field(1, ge=1, le=50)

class CorreoUsuario(BaseModel):
    asunto: str = Field(..., min_length=3, max_length=120)
    mensaje: str = Field(..., min_length=3, max_length=3000)
    responde_a: Optional[str] = Field(None, max_length=300)

class CheckoutPedido(BaseModel):
    total: float
    nota: str = Field("", max_length=200)

TEMAS_WEB = ("normal", "navidad", "sanvalentin")
CAMPOS_OFERTA = ("en_oferta", "precio_anterior")

class AvisoNuevo(BaseModel):
    titulo: str = Field(..., min_length=1, max_length=80)
    texto: str = Field(..., min_length=1, max_length=600)


class AvisoActivo(BaseModel):
    activo: bool


class TemaWeb(BaseModel):
    tema: str

class OfertasWeb(BaseModel):
    activas: bool

class EstadoPedido(BaseModel):
    estado: str

ESTADOS_PEDIDO = ("Pendiente", "Completado", "Entregado", "Cancelado")

class HechasLinea(BaseModel):
    hechas: int


class HechasPack(BaseModel):
    detalles: list[str]   # id de la linea, repetido una vez por cada bola hecha


class PagadoUsuario(BaseModel):
    pagado: bool

class ProductoAdminCrear(BaseModel):
    nombre: str
    descripcion: Optional[str] = ""
    precio: float
    precio_personalizacion: float = 0.0
    deshabilitado: bool = False
    oculto: bool = False
    personalizable: bool = False
    colores: List[str] = []
    en_oferta: bool = True
    precio_anterior: float = 0.0

class ProductoAdminUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    precio: Optional[float] = None
    precio_personalizacion: Optional[float] = None
    deshabilitado: Optional[bool] = None
    oculto: Optional[bool] = None
    personalizable: Optional[bool] = None
    colores: Optional[List[str]] = None
    en_oferta: Optional[bool] = None
    precio_anterior: Optional[float] = None

class ModeloAdminData(BaseModel):
    nombre: str
    imagen: Optional[str] = ""

class IncidenciaRegistro(BaseModel):
    nombre: str
    apellido1: str
    apellido2: str
    curso: str
    correo: str
    motivo: str

class EstadoIncidencia(BaseModel):
    estado: str

class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=120)
    curso: Optional[str] = Field(None, max_length=60)


_PARTICULAS = ("de", "del", "la", "las", "los", "y")


def _normalizar_nombre(texto: str) -> str:
    """Primera letra de cada palabra en mayúscula y el resto en minúscula. Las partículas como "de" quedan en minúscula."""
    palabras = texto.strip().lower().split()
    salida = []
    for i, p in enumerate(palabras):
        if i > 0 and p in _PARTICULAS:
            salida.append(p)
        else:
            salida.append(re.sub(r"(^|[-'])(\w)", lambda m: m.group(1) + m.group(2).upper(), p))
    return " ".join(salida)


_CACHE_ROL = {}

def _identificar(authorization: Optional[str]):
    """Devuelve (user_id, es_admin) validando el token con Supabase, o None si no vale."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization[7:].strip()
    if not token:
        return None
    ahora = time.time()
    hit = _CACHE_ROL.get(token)
    if hit and hit[0] > ahora:
        return hit[1], hit[2]
    cliente = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(headers={"Authorization": f"Bearer {token}"}))
    user_id = cliente.auth.get_user(token).user.id
    perfil = cliente.table("usuarios").select("administrador").eq("id", user_id).single().execute()
    es_admin = bool(perfil.data and perfil.data.get("administrador") is True)
    if len(_CACHE_ROL) > 500:
        _CACHE_ROL.clear()
    _CACHE_ROL[token] = (ahora + 30, user_id, es_admin)
    return user_id, es_admin

@app.middleware("http")
async def proteger_admin(request: Request, call_next):
    """Todo /api/admin exige sesion valida y rol de administrador.
    Excepcion: el detalle de un pedido tambien lo ve su dueno (se comprueba en el endpoint)."""
    ruta = request.url.path
    if MODO_PRUEBA or request.method == "OPTIONS" or not ruta.startswith("/api/admin"):
        return await call_next(request)
    try:
        ident = await run_in_threadpool(_identificar, request.headers.get("authorization"))
    except Exception:
        ident = None
    if not ident:
        return JSONResponse({"detail": "No autorizado"}, status_code=401)
    es_detalle = request.method == "GET" and re.fullmatch(r"/api/admin/pedidos/[^/]+", ruta) is not None
    if not ident[1] and not es_detalle:
        return JSONResponse({"detail": "Solo administradores"}, status_code=403)
    request.state.user_id, request.state.es_admin = ident
    return await call_next(request)

# La web se sirve desde este mismo servidor, asi que solo hace falta abrirla a estos origenes
_ORIGENES = [o.strip() for o in os.getenv("CORS_ORIGINS", "https://laguna-tollon-pedidos-navidad.up.railway.app,http://localhost:8081,http://localhost:19006,http://localhost:3000").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_ORIGENES,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def cabeceras_seguras(request: Request, call_next):
    respuesta = await call_next(request)
    respuesta.headers.setdefault("X-Content-Type-Options", "nosniff")
    respuesta.headers.setdefault("X-Frame-Options", "DENY")
    respuesta.headers.setdefault("Referrer-Policy", "same-origin")
    return respuesta


_USOS = {}

def _limitar(request: Request, nombre: str, maximo: int, segundos: int):
    """Limite sencillo por IP para los endpoints publicos. Detras de Railway la IP real viene en X-Forwarded-For."""
    ip = (request.headers.get("x-forwarded-for") or (request.client.host if request.client else "?")).split(",")[0].strip()
    ahora = time.time()
    clave = (nombre, ip)
    usos = [t for t in _USOS.get(clave, []) if t > ahora - segundos]
    if len(usos) >= maximo:
        raise HTTPException(status_code=429, detail="Demasiados intentos. Espera un poco y vuelve a probar.")
    usos.append(ahora)
    _USOS[clave] = usos
    if len(_USOS) > 5000:
        _USOS.clear()

def _respuesta_3mf_pedido(pedido_id: str, detalles: list, detalle: Optional[str] = None):
    """Un 3MF suelto (si se da el id de la linea) o un zip con todas las bolas con nombre del pedido."""
    lineas = [d for d in detalles if d.get("personalizacion") and d["personalizacion"] != "Sin texto"]
    try:
        if detalle:
            fila = next((d for d in lineas if str(d.get("id")) == str(detalle)), None)
            if not fila:
                raise HTTPException(status_code=404, detail="Esa linea no tiene nombre o no existe")
            datos = generar_3mf(fila["modelo"], fila["personalizacion"])
            return Response(content=datos, media_type="model/3mf",
                            headers={"Content-Disposition": f'attachment; filename="{nombre_fichero(fila["modelo"], fila["personalizacion"])}"'})
        if not lineas:
            raise HTTPException(status_code=404, detail="El pedido no tiene bolas con nombre")
        datos = zip_pedido([(d["modelo"], d["personalizacion"], d.get("cantidad") or 1) for d in lineas])
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return Response(content=datos, media_type="application/zip",
                    headers={"Content-Disposition": f'attachment; filename="pedido_{pedido_id}_3mf.zip"'})


def _filtrar_pago(pedidos: list, pago: str):
    """pago: todos, pagados o sin_pagar."""
    if pago == "pagados":
        return [p for p in pedidos if p.get("pagado")]
    if pago == "sin_pagar":
        return [p for p in pedidos if not p.get("pagado")]
    return pedidos


def _faltan(d: dict, solo_faltan: bool) -> int:
    """Bolas de una linea que faltan por imprimir (si solo_faltan) o todas."""
    cant = d.get("cantidad") or 1
    return max(0, cant - min(d.get("hechas") or 0, cant)) if solo_faltan else cant


_ETIQUETA_COLA = {"Gingerbread.3mf": "Galleta de jengibre", "Reindeer.3mf": "Reno", "Bear.3mf": "Oso", "ChristmasTree.3mf": "Árbol de Navidad",
                  "Star.3mf": "Estrella", "SantaSack.3mf": "Saco de Papa Noel", "Stocking.3mf": "Calcetín", "XmasPud.3mf": "Pudin de Navidad"}


def _cola_impresion(pedidos: list, solo_faltan: bool = True):
    """Agrupa por figura las bolas con nombre de los pedidos dados (renos con renos, galletas con galletas). Sirve para imprimir varias a la vez.
    Las bolas ya hechas no salen (solo_faltan) para que los packs cuenten solo lo pendiente."""
    import re as _re
    import unicodedata as _ud
    def clave(c):
        return _re.sub(r"\s+", " ", _ud.normalize("NFKD", c or "").encode("ascii", "ignore").decode().lower()).strip() or "sin color"
    grupos = {}
    for p in pedidos:
        for d in p.get("detalles_pedido") or []:
            nombre = d.get("personalizacion")
            if not nombre or nombre == "Sin texto":
                continue
            cant = _faltan(d, solo_faltan)
            if cant <= 0:
                continue
            fichero = figura_para(d.get("modelo") or "")
            k = fichero or clave(d.get("modelo"))
            g = grupos.setdefault(k, {"color": _ETIQUETA_COLA.get(fichero) or (d.get("modelo") or "Sin figura"), "bolas": 0, "lineas": []})
            g["bolas"] += cant
            u = p.get("usuarios") or {}
            g["lineas"].append({"id": d.get("id"), "color": d.get("color") or "Sin color", "pedido_id": p["id"], "pedido": str(p["id"])[:8].upper(),
                                "modelo": d.get("modelo"), "personalizacion": nombre, "cantidad": cant,
                                "estado": p.get("estado"), "cliente": u.get("nombre"), "curso": u.get("curso"),
                                "creado": p.get("created_at") or "", "hechas": min(d.get("hechas") or 0, d.get("cantidad") or 1)})
    for g in grupos.values():
        g["packs"] = _packs_de_grupo(g["lineas"])
    return sorted(grupos.values(), key=lambda g: g["color"].lower())


TAM_PACK = 6


def _packs_de_grupo(lineas: list):
    """Reparte las bolas de un color en packs de 6 (la ultima lleva las que sobran). Dos ordenes: antiguos y persona."""
    unidades = []
    for l in lineas:
        for _ in range(l.get("cantidad") or 1):
            unidades.append({"detalle_id": l.get("id"), "cliente": l.get("cliente"), "curso": l.get("curso"), "pedido": l["pedido"], "pedido_id": l["pedido_id"],
                             "modelo": l["modelo"], "color": l.get("color"), "personalizacion": l["personalizacion"], "creado": l.get("creado") or ""})
    orden = {
        "antiguos": sorted(unidades, key=lambda u: (u["creado"], (u["cliente"] or "").lower())),
        "persona": sorted(unidades, key=lambda u: ((u["cliente"] or "").lower(), u["creado"])),
    }
    return {k: [v[i:i + TAM_PACK] for i in range(0, len(v), TAM_PACK)] for k, v in orden.items()}


def _3mf_pack(unidades: list):
    """Un solo 3MF con todas las figuras del pack colocadas en la cama."""
    return unir_3mf([generar_3mf(u["modelo"], u["personalizacion"]) for u in unidades])


def _zip_pack(unidades: list):
    items = []
    for u in unidades:
        quien = "".join(ch if ch.isalnum() else "_" for ch in (u.get("cliente") or "sin_cliente")).strip("_") or "sin_cliente"
        items.append((f'{quien}_{u["pedido"]}_{nombre_fichero(u["modelo"], u["personalizacion"], 1)}', u["modelo"], u["personalizacion"]))
    return zip_lineas(items)


def _zip_cola(grupo: dict):
    items = []
    for l in grupo["lineas"]:
        quien = "".join(ch if ch.isalnum() else "_" for ch in (l.get("cliente") or "sin_cliente")).strip("_") or "sin_cliente"
        fn = f'{quien}_{l["pedido"]}_{nombre_fichero(l["modelo"], l["personalizacion"], l["cantidad"])}'
        items.append((fn, l["modelo"], l["personalizacion"]))
    return zip_lineas(items)


def _respuesta_cola(grupos: list, color: Optional[str], cliente: Optional[str] = None, pack: Optional[int] = None, orden: str = "antiguos", formato: str = "3mf"):
    """Sin color ni cliente devuelve los grupos. Con color o con cliente devuelve el zip de esas bolas.
    Con color y pack devuelve el zip de ese pack de 6."""
    if color is None and cliente is None:
        return grupos
    import unicodedata as _ud
    norm = lambda c: _ud.normalize("NFKD", c or "").encode("ascii", "ignore").decode().lower().strip()
    if pack is not None and color is not None:
        g = next((g for g in grupos if norm(g["color"]) == norm(color)), None)
        packs = (g or {}).get("packs", {}).get(orden if orden in ("antiguos", "persona") else "antiguos", [])
        if not g or pack < 1 or pack > len(packs):
            raise HTTPException(status_code=404, detail="Ese pack no existe en la cola")
        fichero = "".join(ch if ch.isalnum() else "_" for ch in norm(color)) or "cola"
        try:
            if formato == "zip":
                return Response(content=_zip_pack(packs[pack - 1]), media_type="application/zip",
                                headers={"Content-Disposition": f'attachment; filename="pack{pack}_{fichero}_3mf.zip"'})
            return Response(content=_3mf_pack(packs[pack - 1]), media_type="application/octet-stream",
                            headers={"Content-Disposition": f'attachment; filename="pack{pack}_{fichero}.3mf"'})
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
    lineas = [l for g in grupos for l in g["lineas"]
              if (color is None or norm(l["color"]) == norm(color)) and (cliente is None or norm(l["cliente"]) == norm(cliente))]
    if not lineas:
        raise HTTPException(status_code=404, detail="No hay bolas para eso en la cola")
    try:
        datos = _zip_cola({"lineas": lineas})
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    etiqueta = norm(color if color is not None else cliente)
    fichero = "".join(ch if ch.isalnum() else "_" for ch in etiqueta) or "cola"
    return Response(content=datos, media_type="application/zip",
                    headers={"Content-Disposition": f'attachment; filename="cola_{fichero}_3mf.zip"'})


# ---------------------------------------------------------------- MODO PRUEBA (sin base de datos)
# Con MODO_PRUEBA=1 la API devuelve productos de ejemplo con sus imagenes, para ver la web sin Supabase.
# Estas rutas van antes que las reales para que ganen. Nunca activar en produccion.
if MODO_PRUEBA:
    from fastapi import Request
    from fastapi.responses import FileResponse

    _MUESTRAS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bolas3d", "muestras")
    _MODELOS = {  # nombre en la tienda -> imagen
        "Galleta de Jengibre": "Gingerbread", "Oso de navidad": "Bear", "Reno de Navidad": "Reindeer",
        "Estrella": "Star", "Arbol de Navidad": "ChristmasTree", "Calcetín": "Stocking",
    }

    def _productos_prueba(base: str):
        def mod(i, nombre):
            img = _MODELOS.get(nombre, "Gingerbread")
            return {"id": f"m{i}-{img}", "nombre": nombre, "imagen": f"{base}api/prueba/img/{img}.png"}
        def prod(pid, nombre, desc, modelos, colores):
            return {"id": pid, "nombre": nombre, "descripcion": desc, "precio": 1.0, "precio_personalizacion": 0.0,
                    "deshabilitado": False, "oculto": False, "personalizable": True, "colores": colores,
                    "modelos": [mod(i, n) for i, n in enumerate(modelos)]}
        return [
            prod("p1", "Bolas de Navidad (Color marr\u00f3n)", "Bola de navidad con distintos modelos y nombre personalizado",
                 ["Galleta de Jengibre", "Oso de navidad", "Reno de Navidad"], ["Marr\u00f3n"]),
            prod("p2", "Bola de Navidad Estrella", "Bola de navidad con forma de estrella y nombre personalizado", ["Estrella"], ["Dorado"]),
            prod("p3", "Bola de Navidad \u00c1rbol", "Bola de navidad con forma de \u00e1rbol y nombre personalizado", ["Arbol de Navidad"], ["Verde"]),
            prod("p6", "Bola de Navidad Calcet\u00edn", "Bola de navidad con forma de calcet\u00edn y nombre personalizado", ["Calcet\u00edn"], ["Rojo"]),
            prod("p4", "Galleta de jengibre", "Como en producci\u00f3n: el modelo se llama Base", ["Base"], ["Marr\u00f3n"]),
            prod("p5", "Reno", "Como en producci\u00f3n: el modelo se llama Base", ["Base"], ["Marr\u00f3n"]),
        ]

    @app.get("/api/prueba/img/{figura}.png")
    def imagen_prueba(figura: str):
        ruta = os.path.join(_MUESTRAS, os.path.basename(figura) + ".png")
        if not os.path.exists(ruta):
            raise HTTPException(status_code=404, detail="No existe")
        return FileResponse(ruta, media_type="image/png")

    _ESTADO = {"productos": None, "estados": {}, "n": 0}

    def _lista(base: str):
        if _ESTADO["productos"] is None:
            _ESTADO["productos"] = _productos_prueba(base)
        return _ESTADO["productos"]

    def _buscar(base: str, pid: str):
        for p in _lista(base):
            if p["id"] == pid:
                return p
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    @app.get("/api/productos")
    def productos_prueba(request: Request, incluir_ocultos: Optional[bool] = False):
        lista = _lista(str(request.base_url))
        return lista if incluir_ocultos else [p for p in lista if not p.get("oculto")]

    @app.get("/api/productos/{producto_id}")
    def producto_prueba(producto_id: str, request: Request, incluir_ocultos: Optional[bool] = False):
        return _buscar(str(request.base_url), producto_id)

    @app.post("/api/admin/productos")
    def crear_producto_prueba(datos: ProductoAdminCrear, request: Request):
        _ESTADO["n"] += 1
        nuevo = datos.dict(); nuevo["id"] = f"n{_ESTADO['n']}"; nuevo["modelos"] = []
        _lista(str(request.base_url)).append(nuevo)
        return nuevo

    @app.patch("/api/admin/productos/{producto_id}")
    def actualizar_producto_prueba(producto_id: str, datos: ProductoAdminUpdate, request: Request):
        p = _buscar(str(request.base_url), producto_id)
        p.update({k: v for k, v in datos.dict().items() if v is not None})
        return [p]

    @app.delete("/api/admin/productos/{producto_id}")
    def eliminar_producto_prueba(producto_id: str, request: Request):
        lista = _lista(str(request.base_url)); p = _buscar(str(request.base_url), producto_id)
        lista.remove(p)
        return {"mensaje": "Producto eliminado", "ocultado": False}

    @app.post("/api/admin/productos/{producto_id}/modelos")
    def crear_modelo_prueba(producto_id: str, datos: ModeloAdminData, request: Request):
        p = _buscar(str(request.base_url), producto_id)
        _ESTADO["n"] += 1
        m = {"id": f"mn{_ESTADO['n']}", "nombre": datos.nombre, "imagen": datos.imagen, "producto_id": producto_id}
        p["modelos"].append(m)
        return [m]

    @app.patch("/api/admin/modelos/{modelo_id}")
    def actualizar_modelo_prueba(modelo_id: str, datos: ModeloAdminData, request: Request):
        for p in _lista(str(request.base_url)):
            for m in p["modelos"]:
                if m["id"] == modelo_id:
                    m.update(datos.dict()); return [m]
        raise HTTPException(status_code=404, detail="Modelo no encontrado")

    @app.delete("/api/admin/modelos/{modelo_id}")
    def eliminar_modelo_prueba(modelo_id: str, request: Request):
        for p in _lista(str(request.base_url)):
            for m in p["modelos"]:
                if m["id"] == modelo_id:
                    p["modelos"].remove(m); return {"mensaje": "Modelo eliminado con exito"}
        raise HTTPException(status_code=404, detail="Modelo no encontrado")

    @app.get("/api/mensajes")
    def mensaje_prueba():
        return {"id": 1, "mensaje": ""}

    @app.get("/api/avisos/activo")
    def aviso_activo_prueba():
        return {"aviso": next((a for a in _ESTADO.setdefault("avisos", []) if a["activo"]), None)}

    @app.get("/api/admin/avisos")
    def listar_avisos_prueba():
        return list(reversed(_ESTADO.setdefault("avisos", [])))

    @app.post("/api/admin/avisos")
    def crear_aviso_prueba(datos: AvisoNuevo):
        lista = _ESTADO.setdefault("avisos", [])
        for a in lista:
            a["activo"] = False
        a = {"id": f"av{len(lista) + 1}", "titulo": datos.titulo.strip(), "texto": datos.texto.strip(), "activo": True, "creado": "2026-11-26T20:40:00+00:00"}
        lista.append(a)
        return a

    @app.patch("/api/admin/avisos/{aviso_id}")
    def activar_aviso_prueba(aviso_id: str, datos: AvisoActivo):
        lista = _ESTADO.setdefault("avisos", [])
        if datos.activo:
            for a in lista:
                a["activo"] = False
        for a in lista:
            if a["id"] == aviso_id:
                a["activo"] = datos.activo
                return a
        raise HTTPException(status_code=404, detail="Aviso no encontrado")

    @app.delete("/api/admin/avisos/{aviso_id}")
    def borrar_aviso_prueba(aviso_id: str):
        _ESTADO["avisos"] = [a for a in _ESTADO.setdefault("avisos", []) if a["id"] != aviso_id]
        return {"mensaje": "Aviso borrado"}

    @app.get("/api/tema")
    def tema_prueba():
        return {"tema": _ESTADO.get("tema", "navidad"), "ofertas": _ESTADO.get("ofertas", True)}

    @app.patch("/api/admin/ofertas")
    def cambiar_ofertas_prueba(datos: OfertasWeb):
        _ESTADO["ofertas"] = datos.activas
        return {"ofertas": datos.activas}

    @app.patch("/api/admin/tema")
    def cambiar_tema_prueba(datos: TemaWeb):
        if datos.tema not in TEMAS_WEB:
            raise HTTPException(status_code=400, detail="Tema no valido")
        _ESTADO["tema"] = datos.tema
        return {"tema": datos.tema}

    @app.get("/api/usuarios/perfil")
    def perfil_prueba():
        return {"id": "demo", "nombre": "Admin de prueba", "curso": "2DAM", "administrador": True, "profesor": True}

    def _detalle_prueba(modelo, nombre, color="Marr\u00f3n", cantidad=1, producto=None):
        return {"id": f"d{abs(hash((modelo, nombre, color, cantidad))) % 10**8}", "modelo": modelo, "color": color, "personalizacion": nombre,
                "precio_unitario": 1.0, "cantidad": cantidad,
                "productos": producto or {"nombre": "Bolas de Navidad", "modelos": []}}

    def _pedidos(base: str):
        if "pedidos" not in _ESTADO:
            prods = {p["id"]: p for p in _lista(base)}
            def prod(pid):
                p = prods[pid]; return {"nombre": p["nombre"], "modelos": p["modelos"]}
            _ESTADO["pedidos"] = [
                {"id": "11111111-aaaa", "user_id": "u2", "total": 3.0, "estado": "Pendiente", "created_at": "2026-11-17T09:30:00",
                 "usuarios": {"nombre": "Ana Lopez", "curso": "1DAM", "email": "alopmar@g.educaand.es"},
                 "detalles_pedido": [_detalle_prueba("Galleta de Jengibre", "Ana", producto=prod("p1")),
                                     _detalle_prueba("Oso de navidad", "Luis", producto=prod("p1")),
                                     _detalle_prueba("Reno de Navidad", "María José", producto=prod("p1"))]},
                {"id": "22222222-bbbb", "total": 1.0, "estado": "Pendiente", "created_at": "2026-11-16T12:10:00",
                 "usuarios": {"nombre": "Pedro Gil", "curso": "Informática", "email": "pedro.gil@edu.juntadeandalucia.es"},
                 "detalles_pedido": [_detalle_prueba("Estrella", "Pedro", "Dorado", producto=prod("p2")),
                                     _detalle_prueba("Estrella", "Sara", "Dorado", producto=prod("p2"))]},
                {"id": "33333333-cccc", "total": 2.0, "estado": "Pendiente", "created_at": "2026-11-15T10:00:00",
                 "usuarios": {"nombre": "Marta Ruiz", "curso": "2DAM", "email": "mruiz07@g.educaand.es"},
                 "detalles_pedido": [_detalle_prueba("Arbol de Navidad", "Marta", "Verde", producto=prod("p3")),
                                     _detalle_prueba("Arbol de Navidad", "Jos\u00e9 Luis", "Verde", producto=prod("p3")),
                                     _detalle_prueba("Galleta de Jengibre", "Marta", producto=prod("p1"))]},
            ]
            _ESTADO["carrito"] = []
        return _ESTADO["pedidos"]

    @app.get("/api/admin/pedidos")
    def pedidos_prueba(request: Request):
        return _pedidos(str(request.base_url))

    @app.get("/api/admin/pedidos/{pedido_id}")
    def pedido_prueba(pedido_id: str, request: Request):
        for p in _pedidos(str(request.base_url)):
            if p["id"] == pedido_id:
                return {"pedido": {k: v for k, v in p.items() if k != "detalles_pedido"}, "productos": p["detalles_pedido"]}
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    @app.get("/api/admin/pedidos/{pedido_id}/3mf")
    def pedido_3mf_prueba(pedido_id: str, request: Request, detalle: Optional[str] = None):
        for p in _pedidos(str(request.base_url)):
            if p["id"] == pedido_id:
                return _respuesta_3mf_pedido(pedido_id, p["detalles_pedido"], detalle)
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    @app.patch("/api/admin/pedidos/{pedido_id}/estado")
    def estado_prueba(pedido_id: str, nuevo_estado: EstadoPedido, request: Request):
        for p in _pedidos(str(request.base_url)):
            if p["id"] == pedido_id:
                p["estado"] = nuevo_estado.estado
        return {"mensaje": "Estado actualizado", "data": [{"id": pedido_id, "estado": nuevo_estado.estado}]}

    @app.delete("/api/admin/pedidos/{pedido_id}")
    def borrar_pedido_prueba(pedido_id: str, request: Request):
        lista = _pedidos(str(request.base_url))
        lista[:] = [p for p in lista if p["id"] != pedido_id]
        return {"mensaje": "Pedido eliminado correctamente", "data": []}

    @app.patch("/api/pedidos/{pedido_id}/anular")
    def anular_prueba(pedido_id: str, request: Request):
        for p in _pedidos(str(request.base_url)):
            if p["id"] == pedido_id:
                if p["estado"] != "Pendiente":
                    raise HTTPException(status_code=409, detail=_MENSAJE_NO_ANULAR.get(p["estado"], "Este pedido ya no se puede anular."))
                p["estado"] = "Cancelado"
                return {"mensaje": "Pedido anulado", "estado": "Cancelado"}
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    @app.patch("/api/pedidos/{pedido_id}/detalles/{detalle_id}/quitar")
    def quitar_prueba(pedido_id: str, detalle_id: str, request: Request):
        for p in _pedidos(str(request.base_url)):
            if p["id"] == pedido_id:
                if p["estado"] != "Pendiente":
                    raise HTTPException(status_code=409, detail="Este pedido ya no se puede cambiar.")
                for d in p["detalles_pedido"]:
                    if d["id"] == detalle_id and d["cantidad"] > 1:
                        d["cantidad"] -= 1
                        break
                else:
                    p["detalles_pedido"] = [d for d in p["detalles_pedido"] if d["id"] != detalle_id]
                p["total"] = float(sum(d["precio_unitario"] * d["cantidad"] for d in p["detalles_pedido"]))
                if not p["detalles_pedido"]:
                    p["estado"] = "Cancelado"
                return {"mensaje": "Bola quitada", "estado": p["estado"], "total": p["total"]}
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    @app.get("/api/pedidos/usuario")
    def mis_pedidos_prueba(request: Request):
        return [dict(p, detalles_pedido=[{"id": d["id"]} for d in p["detalles_pedido"]]) for p in _pedidos(str(request.base_url))]

    # ---- carrito y checkout de prueba: lo que compras aparece luego en el admin
    @app.get("/api/carrito")
    def carrito_prueba(request: Request):
        _pedidos(str(request.base_url))
        return _ESTADO["carrito"]

    @app.post("/api/carrito")
    def anadir_carrito_prueba(item: ItemCarrito, request: Request):
        base = str(request.base_url); _pedidos(base)
        p = _buscar(base, item.producto_id)
        modelo = next((m for m in p["modelos"] if m["id"] == item.modelo_id), None) or {"nombre": item.modelo, "imagen": None}
        error_nombre = _error_nombre_bola(item.personalizacion, bool(p.get("personalizable")))
        if error_nombre:
            raise HTTPException(status_code=400, detail=error_nombre)
        _ESTADO["n"] += 1
        fila = item.dict()
        fila.update({"id": f"c{_ESTADO['n']}", "user_id": "demo",
                     "productos": {"nombre": p["nombre"], "precio": p["precio"], "precio_personalizacion": 0.0},
                     "modelos": {"nombre": modelo["nombre"], "imagen": modelo["imagen"]}})
        _ESTADO["carrito"].append(fila)
        return {"mensaje": "Añadido al carrito", "data": [fila]}

    @app.delete("/api/carrito/{item_id}")
    def quitar_carrito_prueba(item_id: str, request: Request):
        _pedidos(str(request.base_url))
        _ESTADO["carrito"][:] = [c for c in _ESTADO["carrito"] if c["id"] != item_id]
        return {"mensaje": "Producto eliminado del carrito"}

    @app.post("/api/pedidos/checkout")
    def checkout_prueba(checkout: CheckoutPedido, request: Request):
        base = str(request.base_url); lista = _pedidos(base)
        if not _ESTADO["carrito"]:
            raise HTTPException(status_code=400, detail="El carrito está vacío")
        _ESTADO["n"] += 1
        detalles = []
        for c in _ESTADO["carrito"]:
            p = _buscar(base, c["producto_id"])
            d = _detalle_prueba(c["modelo"], c["personalizacion"], c["color"], c.get("cantidad", 1),
                                {"nombre": p["nombre"], "modelos": p["modelos"]})
            d["id"] = f"d{_ESTADO['n']}-{len(detalles) + 1}"
            detalles.append(d)
        pedido = {"id": f"{_ESTADO['n']:08d}-nuevo", "total": checkout.total, "estado": "Pendiente",
                  "nota": checkout.nota.strip() or None,
                  "created_at": "2026-11-17T14:30:00", "usuarios": {"nombre": "Admin de prueba", "curso": "2DAM"},
                  "detalles_pedido": detalles}
        lista.insert(0, pedido)
        _ESTADO["carrito"].clear()
        try:
            html, texto = _factura("navidad", f"admin-2dam-{_ESTADO['n']:02d}", datetime.now(timezone.utc), detalles, float(checkout.total), checkout.nota.strip())
            asunto = f"Hemos recibido tu pedido admin-2dam-{_ESTADO['n']:02d}"
            texto_msg = "Hola Admin:\n\nHemos recibido tu pedido. Aquí tienes el resumen.\n\nSi hay algún error en alguna bola, respóndenos a este correo y lo arreglamos."
            if _config_correo():
                _enviar_correo("admin@g.educaand.es", asunto, texto_msg, "navidad", None, html, texto)
            else:
                _ESTADO.setdefault("correos", []).append({"para": "admin@g.educaand.es", "asunto": asunto, "mensaje": texto_msg + "\n\n" + texto, "html": _correo_html("navidad", asunto, texto_msg, "pedidosldt@gmail.com", html)})
        except Exception:
            logging.exception("No se pudo preparar el resumen del pedido")
        return {"mensaje": "Pedido procesado correctamente", "pedido_id": pedido["id"]}

    def _revisar_prueba(ped):
        nombradas = [d for d in ped["detalles_pedido"] if d.get("personalizacion") and d["personalizacion"] != "Sin texto"]
        if ped["estado"] == "Pendiente" and nombradas and all((d.get("hechas") or 0) >= (d.get("cantidad") or 1) for d in nombradas):
            ped["estado"] = "Completado"
        return ped["estado"]

    @app.patch("/api/admin/lineas/{detalle_id}/hechas")
    def hechas_prueba(detalle_id: str, datos: HechasLinea, request: Request):
        for ped in _pedidos(str(request.base_url)):
            for d in ped["detalles_pedido"]:
                if d["id"] == detalle_id:
                    d["hechas"] = max(0, min(datos.hechas, d.get("cantidad") or 1))
                    return {"hechas": d["hechas"], "estado_pedido": _revisar_prueba(ped)}
        raise HTTPException(status_code=404, detail="Esa bola no existe")

    @app.patch("/api/admin/impresion/hechas")
    def pack_hecho_prueba(datos: HechasPack, request: Request):
        hechos = 0
        for ped in _pedidos(str(request.base_url)):
            for d in ped["detalles_pedido"]:
                n = datos.detalles.count(d["id"])
                if n:
                    d["hechas"] = min((d.get("hechas") or 0) + n, d.get("cantidad") or 1)
            if _revisar_prueba(ped) == "Completado":
                hechos += 1
        return {"mensaje": "Bolas marcadas como hechas", "pedidos_completados": hechos}

    @app.get("/api/admin/impresion")
    def cola_prueba(request: Request, estado: str = "Pendiente", pago: str = "todos"):
        return _cola_impresion(_filtrar_pago([p for p in _pedidos(str(request.base_url)) if p["estado"] == estado], pago), estado == "Pendiente")

    @app.get("/api/admin/impresion/3mf")
    def cola_3mf_prueba(request: Request, color: Optional[str] = None, cliente: Optional[str] = None, pack: Optional[int] = None, orden: str = "antiguos", formato: str = "3mf", estado: str = "Pendiente", pago: str = "todos"):
        if color is None and cliente is None:
            raise HTTPException(status_code=400, detail="Indica color o cliente")
        return _respuesta_cola(_cola_impresion(_filtrar_pago([p for p in _pedidos(str(request.base_url)) if p["estado"] == estado], pago), estado == "Pendiente"), color, cliente, pack, orden, formato)

    @app.get("/api/admin/resumen")
    def resumen_prueba(request: Request):
        por_persona = {}
        for p in _pedidos(str(request.base_url)):
            u = p["usuarios"]
            por_persona.setdefault(u["nombre"], {"id": u["nombre"], "nombre": u["nombre"], "curso": u["curso"], "profesor": not any(ch.isdigit() for ch in u["curso"]),
                "email": u["nombre"].lower().replace(" ", ".") + "@g.educaand.es", "pedidos": []})["pedidos"].append(p)
        return _agregar_resumen(list(por_persona.values()), _ESTADO.setdefault("pagados", set()))

    @app.patch("/api/admin/pedidos/{pedido_id}/pagado")
    def pedido_pagado_prueba(pedido_id: str, datos: PagadoUsuario):
        pagados = _ESTADO.setdefault("pagados", set())
        (pagados.add if datos.pagado else pagados.discard)(pedido_id)
        for p in _ESTADO.get("pedidos", []):
            if p["id"] == pedido_id:
                p["pagado"] = datos.pagado
        return {"mensaje": "Pago actualizado", "pagado": datos.pagado}

    @app.patch("/api/admin/resumen/{usuario_id}/pagado")
    def pagado_prueba(usuario_id: str, datos: PagadoUsuario):
        pagados = _ESTADO.setdefault("pagados", set())
        (pagados.add if datos.pagado else pagados.discard)(usuario_id)
        return {"mensaje": "Pago actualizado", "pagado": datos.pagado}

    @app.get("/api/admin/usuarios")
    def usuarios_prueba():
        return [
            {"id": "u1", "nombre": "Admin de prueba", "email": "admin@g.educaand.es", "curso": "2DAM", "profesor": True, "administrador": True, "num_pedidos": 0},
            {"id": "u2", "nombre": "Ana Lopez", "email": "ana@g.educaand.es", "curso": "1DAM", "profesor": False, "administrador": False, "num_pedidos": 1},
        ]

    @app.get("/api/admin/usuarios/{usuario_id}/perfil")
    def perfil_usuario_prueba(usuario_id: str, request: Request):
        lista = [u for u in usuarios_prueba() if u["id"] == usuario_id]
        if not lista:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        u = lista[0]
        mios = [p for p in _pedidos(str(request.base_url)) if (p.get("usuarios") or {}).get("email", "").split("@")[0] == u["email"].split("@")[0] or (u["id"] == "u2" and p["id"] == "11111111-aaaa")]
        salida = []
        for n, p in enumerate(sorted(mios, key=lambda x: x["created_at"]), start=1):
            salida.append({"id": p["id"], "codigo": _codigo_pedido(u, n), "estado": p["estado"], "pagado": bool(p.get("pagado")), "total": p["total"],
                           "nota": p.get("nota"), "creado": p["created_at"], "lineas": p["detalles_pedido"]})
        return {"usuario": u, "pedidos": salida}

    @app.get("/api/admin/correo/estado")
    def estado_correo_prueba():
        cfg = _config_correo()
        return {"configurado": True, "remitente": cfg["remitente"] if cfg else "pedidosldt@gmail.com (prueba)"}

    @app.get("/api/admin/usuarios/{usuario_id}/correos")
    def correos_usuario_prueba(usuario_id: str):
        lista = [u for u in usuarios_prueba() if u["id"] == usuario_id]
        if not lista:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        enviados = [c for c in _ESTADO.get("correos", []) if c["para"] == lista[0]["email"]]
        base = []
        if lista[0]["id"] == "u2":
            base = [{"id": "<a1@x>", "fecha": "2026-11-24T10:00:00+01:00", "mio": True, "asunto": "Tu pedido ana-1dam-01 de adornos navideños",
                     "texto": "Hola Ana:\n\nHemos visto que has hecho el pedido con estos adornos:\n- Galleta de jengibre con el nombre \"Ana\"\n\n¿Es correcto o te has equivocado?"},
                    {"id": "<a2@x>", "fecha": "2026-11-24T17:42:00+01:00", "mio": False, "asunto": "Re: Tu pedido ana-1dam-01 de adornos navideños",
                     "texto": "Hola, me he equivocado. Quería el reno y no la galleta. ¿Lo podéis cambiar?\n\nGracias"}]
        extra = [{"id": f"<m{n}@x>", "fecha": f"2026-11-25T09:{n:02d}:00+01:00", "mio": True, "asunto": c["asunto"], "texto": c["mensaje"]} for n, c in enumerate(enviados)]
        return {"configurado": True, "correos": base + extra}

    @app.post("/api/admin/usuarios/{usuario_id}/correo")
    def enviar_correo_prueba(usuario_id: str, datos: CorreoUsuario):
        lista = [u for u in usuarios_prueba() if u["id"] == usuario_id]
        if not lista:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        if _config_correo():
            try:
                _enviar_correo(lista[0]["email"], datos.asunto.strip(), datos.mensaje, "navidad")
            except RuntimeError as e:
                raise HTTPException(status_code=502, detail=str(e))
        else:
            _ESTADO.setdefault("correos", []).append({"para": lista[0]["email"], "asunto": datos.asunto, "mensaje": datos.mensaje})
        return {"mensaje": "Correo enviado", "para": lista[0]["email"]}

    def _editable_prueba(request: Request, pedido_id: str, anular: bool = False):
        for p in _pedidos(str(request.base_url)):
            if p["id"] == pedido_id:
                if anular:
                    if p.get("pagado") and p["estado"] != "Cancelado":
                        raise HTTPException(status_code=409, detail="Este pedido ya está pagado y no se puede anular.")
                    if p["estado"] != "Pendiente":
                        raise HTTPException(status_code=409, detail="Solo se pueden anular pedidos Pendientes.")
                elif p["estado"] == "Cancelado":
                    raise HTTPException(status_code=409, detail="Este pedido está anulado, no se puede cambiar.")
                return p
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    def _tras_cambiar_prueba(p, hay_bola_nueva: bool = False):
        if hay_bola_nueva and p["estado"] == "Completado":
            p["estado"] = "Pendiente"
        _revisar_prueba(p)
        return p["estado"]

    @app.post("/api/admin/pedidos/{pedido_id}/bolas")
    def anadir_admin_prueba(pedido_id: str, datos: NuevaBola, request: Request):
        p = _editable_prueba(request, pedido_id)
        prod = next((x for x in _productos_prueba(str(request.base_url)) if x["id"] == datos.producto_id), None)
        if not prod:
            raise HTTPException(status_code=400, detail="Ese producto no existe.")
        if datos.modelo not in [_figura_modelo(prod["nombre"], m["nombre"]) for m in prod["modelos"]]:
            raise HTTPException(status_code=400, detail="Ese modelo no es de ese producto.")
        if prod.get("colores") and datos.color not in prod["colores"]:
            raise HTTPException(status_code=400, detail="Ese color no es de ese producto.")
        nombre = re.sub(r"\s+", " ", datos.personalizacion.strip())
        error = _error_nombre_bola(nombre, True)
        if error:
            raise HTTPException(status_code=400, detail=error)
        p["detalles_pedido"].append({"id": f"n{len(p['detalles_pedido'])}{abs(hash(nombre)) % 10**5}", "producto_id": datos.producto_id, "modelo": datos.modelo, "color": datos.color,
                                     "personalizacion": nombre, "precio_unitario": prod["precio"], "cantidad": datos.cantidad, "hechas": 0,
                                     "productos": {"nombre": prod["nombre"], "modelos": prod["modelos"]}})
        p["total"] = sum(x["precio_unitario"] * (x.get("cantidad") or 1) for x in p["detalles_pedido"])
        return {"mensaje": "Bola añadida", "total": p["total"], "estado": _tras_cambiar_prueba(p, True)}

    @app.patch("/api/admin/pedidos/{pedido_id}/anular")
    def anular_admin_prueba(pedido_id: str, request: Request):
        _editable_prueba(request, pedido_id, True)["estado"] = "Cancelado"
        return {"mensaje": "Pedido anulado", "estado": "Cancelado"}

    @app.patch("/api/admin/pedidos/{pedido_id}/detalles/{detalle_id}")
    def editar_admin_prueba(pedido_id: str, detalle_id: str, datos: EdicionBola, request: Request):
        p = _editable_prueba(request, pedido_id)
        d = next((x for x in p["detalles_pedido"] if x["id"] == detalle_id), None)
        if not d:
            raise HTTPException(status_code=404, detail="Esa bola no está en el pedido.")
        cambios = {}
        if datos.producto_id or datos.modelo or datos.color:
            prod = next((x for x in _productos_prueba(str(request.base_url)) if x["id"] == (datos.producto_id or d.get("producto_id") or "p1")), None)
            if not prod:
                raise HTTPException(status_code=400, detail="Ese producto no existe.")
            modelo = datos.modelo or d["modelo"]; color = datos.color or d["color"]
            if modelo not in [_figura_modelo(prod["nombre"], m["nombre"]) for m in prod["modelos"]]:
                raise HTTPException(status_code=400, detail="Ese modelo no es de ese producto.")
            if prod.get("colores") and color not in prod["colores"]:
                raise HTTPException(status_code=400, detail="Ese color no es de ese producto.")
            cambios.update({"modelo": modelo, "color": color, "precio_unitario": prod["precio"]})
        if datos.personalizacion is not None:
            nombre = re.sub(r"\s+", " ", datos.personalizacion.strip())
            error = _error_nombre_bola(nombre, True)
            if error:
                raise HTTPException(status_code=400, detail=error)
            cambios["personalizacion"] = nombre
        if datos.cantidad is not None:
            cambios["cantidad"] = datos.cantidad
        if not cambios:
            raise HTTPException(status_code=400, detail="No hay nada que cambiar.")
        if any(k in cambios for k in ("modelo", "personalizacion")):
            cambios["hechas"] = 0
        d.update(cambios)
        p["total"] = sum(x["precio_unitario"] * (x.get("cantidad") or 1) for x in p["detalles_pedido"])
        return {"mensaje": "Bola cambiada", "total": p["total"], "estado": _tras_cambiar_prueba(p, "hechas" in cambios)}

    @app.patch("/api/admin/pedidos/{pedido_id}/detalles/{detalle_id}/quitar")
    def quitar_admin_prueba(pedido_id: str, detalle_id: str, request: Request):
        p = _editable_prueba(request, pedido_id)
        d = next((x for x in p["detalles_pedido"] if x["id"] == detalle_id), None)
        if not d:
            raise HTTPException(status_code=404, detail="Esa bola no está en el pedido.")
        if (d.get("cantidad") or 1) > 1:
            d["cantidad"] -= 1
        else:
            p["detalles_pedido"].remove(d)
        if not p["detalles_pedido"]:
            p["estado"] = "Cancelado"; p["total"] = 0
            return {"mensaje": "Pedido anulado", "estado": "Cancelado", "total": 0}
        p["total"] = sum(x["precio_unitario"] * (x.get("cantidad") or 1) for x in p["detalles_pedido"])
        return {"mensaje": "Bola quitada", "estado": _tras_cambiar_prueba(p), "total": p["total"]}

    # --- Incidencias de registro (prueba, en memoria) ---
    _INCIDENCIAS = []

    @app.post("/api/registro/incidencia")
    def crear_incidencia_prueba(datos: IncidenciaRegistro):
        _INCIDENCIAS.append({"id": f"i{len(_INCIDENCIAS)+1}", "created_at": "2026-11-20T20:00:00", "estado": "Pendiente", **datos.dict()})
        return {"mensaje": "Incidencia enviada"}

    @app.get("/api/registro/permitido")
    def correo_permitido_prueba(correo: str):
        return {"permitido": any(i["correo"].lower() == correo.lower() and i["estado"] == "Aprobada" for i in _INCIDENCIAS)}

    @app.get("/api/admin/incidencias")
    def incidencias_prueba(request: Request):
        return list(reversed(_INCIDENCIAS))

    @app.patch("/api/admin/incidencias/{incidencia_id}")
    def estado_incidencia_prueba(incidencia_id: str, datos: EstadoIncidencia, request: Request):
        for i in _INCIDENCIAS:
            if i["id"] == incidencia_id:
                i["estado"] = datos.estado
                return i
        raise HTTPException(status_code=404, detail="No existe")

@app.get("/api")
def read_root():
    return {"message": "¡Bienvenido a la API de Custom Layers!"}

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/productos")
def obtener_productos(incluir_ocultos: Optional[bool] = False):
    try:
        query = supabase.table("productos").select("*, modelos(*)")
        if not incluir_ocultos:
            query = query.neq("oculto", True)
            
        respuesta = query.execute()
        return respuesta.data
    except Exception as e:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Error al obtener productos")
    
@app.get("/api/productos/{producto_id}")
def obtener_producto(producto_id: str):
    cliente = create_client(SUPABASE_URL, SUPABASE_KEY)
    res = cliente.table("productos").select("*, modelos(*)").eq("id", producto_id).single().execute()
    return res.data

@app.get("/api/usuarios/perfil")
def obtener_perfil(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Falta el token de sesión")
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        cliente_seguro = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(headers={"Authorization": f"Bearer {token}"}))
        respuesta = cliente_seguro.table("usuarios").select("*").eq("id", user_id).single().execute()
        return respuesta.data
    except Exception as e:
        raise HTTPException(status_code=401, detail="Sesión no válida o expirada")

@app.patch("/api/usuarios/perfil")
def actualizar_perfil(datos: UsuarioUpdate, authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Falta el token de sesión")
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        cliente_seguro = create_client(
            SUPABASE_URL, 
            SUPABASE_KEY, 
            options=ClientOptions(headers={"Authorization": f"Bearer {token}"})
        )
        
        update_data = {k: v for k, v in datos.dict().items() if v is not None}
        if "nombre" in update_data:
            update_data["nombre"] = _normalizar_nombre(update_data["nombre"])
        
        if update_data:
            respuesta = cliente_seguro.table("usuarios").update(update_data).eq("id", user_id).execute()
            return {"mensaje": "Perfil actualizado correctamente", "data": respuesta.data[0]}
        return {"mensaje": "No se enviaron datos para actualizar"}
    except Exception as e:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Error al actualizar el perfil")

@app.get("/api/carrito")
def obtener_carrito(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Falta el token de sesión")
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        cliente_seguro = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(headers={"Authorization": f"Bearer {token}"}))
        try:
            res = cliente_seguro.table("carrito")\
                .select("*, productos(nombre, precio, precio_personalizacion, en_oferta, precio_anterior), modelos(nombre, imagen)")\
                .eq("user_id", user_id)\
                .execute()
        except Exception:
            # Aun no existen las columnas de oferta (falta ofertas.sql)
            res = cliente_seguro.table("carrito")\
                .select("*, productos(nombre, precio, precio_personalizacion), modelos(nombre, imagen)")\
                .eq("user_id", user_id)\
                .execute()
        return res.data
    except Exception as e:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Ha ocurrido un error en el servidor. Inténtalo de nuevo.")

@app.post("/api/carrito")
def agregar_al_carrito(item: ItemCarrito, authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Falta el token de sesión")
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        cliente_seguro = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(headers={"Authorization": f"Bearer {token}"}))
        prod = cliente_seguro.table("productos").select("personalizable, oculto, deshabilitado").eq("id", item.producto_id).execute().data
        if not prod or prod[0].get("oculto") or prod[0].get("deshabilitado"):
            raise HTTPException(status_code=400, detail="Este producto no está disponible ahora mismo")
        error_nombre = _error_nombre_bola(item.personalizacion, bool(prod and prod[0].get("personalizable")))
        if error_nombre:
            raise HTTPException(status_code=400, detail=error_nombre)
        datos_insertar = item.dict()
        datos_insertar["user_id"] = user_id
        respuesta = cliente_seguro.table("carrito").insert(datos_insertar).execute()
        return {"mensaje": "Añadido al carrito", "data": respuesta.data}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Error al añadir al carrito")

@app.delete("/api/carrito/{item_id}")
def eliminar_del_carrito(item_id: str, authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Falta el token de sesión")
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        cliente_seguro = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(headers={"Authorization": f"Bearer {token}"}))
        cliente_seguro.table("carrito").delete().eq("id", item_id).eq("user_id", user_id).execute()
        return {"mensaje": "Producto eliminado del carrito"}
    except Exception as e:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Ha ocurrido un error en el servidor. Inténtalo de nuevo.")

@app.post("/api/pedidos/checkout")
def realizar_pedido(checkout: CheckoutPedido, authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Falta el token de sesión")
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        cliente_seguro = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(headers={"Authorization": f"Bearer {token}"}))
        
        carrito_res = cliente_seguro.table("carrito").select("*, productos(precio, precio_personalizacion, oculto, deshabilitado)").eq("user_id", user_id).execute()
        items_carrito = carrito_res.data
        if not items_carrito:
            raise HTTPException(status_code=400, detail="El carrito está vacío")
        for i in items_carrito:
            cant = i.get("cantidad", 1)
            if not isinstance(cant, int) or cant < 1 or cant > 50:
                raise HTTPException(status_code=400, detail="La cantidad de una bola no es válida. Quítala del carrito y vuelve a añadirla.")
            if (i.get("productos") or {}).get("oculto") or (i.get("productos") or {}).get("deshabilitado"):
                raise HTTPException(status_code=400, detail="Un producto del carrito ya no está disponible. Quítalo para poder pedir.")
            
        # El total lo calcula el servidor con los precios de la base de datos, no el que manda la web
        total_servidor = round(sum(float(i["productos"]["precio"]) * int(i.get("cantidad", 1) or 1) for i in items_carrito), 2)
        nuevo_pedido = {"user_id": user_id, "total": total_servidor, "estado": "Pendiente"}
        if checkout.nota.strip():
            nuevo_pedido["nota"] = checkout.nota.strip()
        pedido_res = cliente_seguro.table("pedidos").insert(nuevo_pedido).execute()
        pedido_id = pedido_res.data[0]["id"]
        
        detalles = []
        for item in items_carrito:
            extra = 0.0  # la personalizacion no se cobra aparte
            detalles.append({
                "pedido_id": pedido_id,
                "producto_id": item["producto_id"],
                "modelo": item["modelo"],
                "color": item["color"],
                "personalizacion": item.get("personalizacion", "Sin texto"),
                "precio_unitario": float(item["productos"]["precio"]) + extra,
                "cantidad": item.get("cantidad", 1)
            })
            
        cliente_seguro.table("detalles_pedido").insert(detalles).execute()
        cliente_seguro.table("carrito").delete().eq("user_id", user_id).execute()
        try:
            ped = pedido_res.data[0]
            u = cliente_seguro.table("usuarios").select("nombre").eq("id", user_id).execute().data
            fecha = datetime.fromisoformat(str(ped.get("created_at")).replace("Z", "+00:00")) if ped.get("created_at") else datetime.now(timezone.utc)
            _enviar_a_hoja((u[0]["nombre"] if u else ""), fecha, detalles, str(pedido_id), _etiqueta_pedido(cliente_seguro, ped), "Pendiente")
        except Exception:
            logging.exception("No se pudo avisar a la hoja")
        try:
            import threading
            ped_completo = dict(pedido_res.data[0]); ped_completo.setdefault("total", total_servidor)
            threading.Thread(target=_correo_pedido_recibido, args=(cliente_seguro, ped_completo, detalles, user_id), daemon=True).start()
        except Exception:
            logging.exception("No se pudo preparar el resumen del pedido")
        return {"mensaje": "Pedido procesado correctamente", "pedido_id": pedido_id}
    except Exception as e:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Error al procesar el pedido")


# ---------- Aviso a la hoja de calculo de pedidos ----------
# Cada pedido nuevo manda sus figuras a un Google Apps Script que las anade a la hoja.
# Si no estan puestas las variables SHEET_WEBHOOK_URL y SHEET_SECRET no hace nada.
# Todos los pedidos estan en la hoja. El coste solo cuenta si estan Completado o Entregado (lo decide el script).
_ESTADOS_PARA_HOJA = ("Completado", "Entregado")
_FIGURAS_CORTAS = [("galleta", "Galleta"), ("oso", "Oso"), ("reno", "Reno"), ("estrella", "Estrella"),
                   ("arbol", "Árbol"), ("árbol", "Árbol"), ("saco", "Saco"), ("pudin", "Pudin"), ("calcet", "Calcetín")]


def _figura_modelo(producto: Optional[str], modelo: Optional[str]) -> str:
    """Nombre de figura que guarda el pedido: si el modelo se llama Base o Unico, es el nombre del producto (igual que en la tienda)."""
    m = (modelo or "").strip()
    return (producto or m) if not m or re.fullmatch(r"(?i)base|unico|único", m) else m


def _figura_corta(modelo: str) -> str:
    bajo = (modelo or "").lower()
    for clave, corto in _FIGURAS_CORTAS:
        if clave in bajo:
            return corto
    return (modelo or "Figura").strip() or "Figura"


def _filas_para_hoja(cliente: str, fecha, detalles: list, pedido_ref: str = "", etiqueta: str = "", estado: str = "") -> dict:
    from zoneinfo import ZoneInfo
    f = fecha.astimezone(ZoneInfo("Europe/Madrid")) if getattr(fecha, "tzinfo", None) else fecha
    figuras = []
    for d in detalles:
        for _ in range(int(d.get("cantidad") or 1)):
            figuras.append({"figura": _figura_corta(d.get("modelo")), "precio": float(d.get("precio_unitario") or 0)})
    return {"cliente": cliente, "fecha": f.strftime("%d/%m/%Y %H:%M"), "figuras": figuras, "pedido_ref": pedido_ref, "etiqueta": etiqueta, "estado": estado}


def _llamar_hoja(cuerpo: dict, en_orden: Optional[list] = None) -> None:
    url = os.getenv("SHEET_WEBHOOK_URL")
    secreto = os.getenv("SHEET_SECRET")
    if not url or not secreto:
        return
    import json as _json
    import urllib.request
    cuerpo["secret"] = secreto

    def _tarea():
        try:
            req = urllib.request.Request(url, data=_json.dumps(cuerpo).encode("utf-8"),
                                         headers={"Content-Type": "text/plain;charset=utf-8",
                                                  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
                                                  "Accept": "*/*"}, method="POST")
            urllib.request.urlopen(req, timeout=20).read()
        except Exception:
            logging.exception("No se pudo avisar a la hoja")

    if en_orden is not None:
        en_orden.append(_tarea)
        return
    import threading
    threading.Thread(target=_tarea, daemon=True).start()


def _enviar_a_hoja(cliente: str, fecha, detalles: list, pedido_ref: str = "", etiqueta: str = "", estado: str = "") -> None:
    _llamar_hoja(_filas_para_hoja(cliente, fecha, detalles, pedido_ref, etiqueta, estado))


def _estado_en_hoja(pedido_ref: str, estado: str) -> None:
    _llamar_hoja({"accion": "estado", "pedido_ref": str(pedido_ref), "estado": estado})


def _refrescar_hoja(cliente, pedido_id: str, estado: Optional[str] = None) -> None:
    """Deja la hoja al dia despues de modificar un pedido: borra sus filas y las vuelve a escribir, en ese orden."""
    try:
        ped = cliente.table("pedidos").select("id, user_id, estado, created_at, pagado").eq("id", pedido_id).execute().data
        if not ped:
            return
        ped = ped[0]
        estado = estado or ped.get("estado") or "Pendiente"
        if estado == "Cancelado":
            _estado_en_hoja(str(pedido_id), "Cancelado")
            return
        u = cliente.table("usuarios").select("nombre").eq("id", ped.get("user_id")).execute().data
        dets = cliente.table("detalles_pedido").select("modelo, precio_unitario, cantidad").eq("pedido_id", pedido_id).execute().data or []
        fecha = datetime.fromisoformat(str(ped.get("created_at")).replace("Z", "+00:00")) if ped.get("created_at") else datetime.now(timezone.utc)
        tareas: list = []
        _llamar_hoja({"accion": "borrar", "pedido_ref": str(pedido_id)}, tareas)
        _llamar_hoja(_filas_para_hoja((u[0]["nombre"] if u else ""), fecha, dets, str(pedido_id), _etiqueta_pedido(cliente, ped), estado), tareas)
        if ped.get("pagado"):
            _llamar_hoja({"accion": "pagado", "pedido_refs": [str(pedido_id)], "pagado": True}, tareas)
        if tareas:
            import threading
            threading.Thread(target=lambda: [t() for t in tareas], daemon=True).start()
    except Exception:
        logging.exception("No se pudo actualizar la hoja")


def _etiqueta_pedido(cliente_seguro, ped: dict) -> str:
    """Mismo codigo que se ve en el panel: correo-curso-NN, donde NN es el numero de pedido de esa persona."""
    import re
    import unicodedata
    try:
        u = cliente_seguro.table("usuarios").select("email, curso").eq("id", ped.get("user_id")).execute().data
        correo = str((u[0].get("email") if u else "") or "").split("@")[0].strip().lower()
        curso = unicodedata.normalize("NFD", str((u[0].get("curso") if u else "") or "")).encode("ascii", "ignore").decode().lower()
        curso = re.sub(r"[^a-z0-9]", "", curso)
        if not correo:
            return "#" + str(ped.get("id"))[:8].upper()
        todos = cliente_seguro.table("pedidos").select("id, created_at").eq("user_id", ped.get("user_id")).order("created_at").execute().data
        numero = next((i + 1 for i, x in enumerate(todos) if x["id"] == ped.get("id")), None)
        return "-".join([x for x in [correo, curso, str(numero).zfill(2) if numero else ""] if x])
    except Exception:
        logging.exception("No se pudo calcular el codigo del pedido")
        return ""


def _quitar_de_hoja(pedido_ref: str) -> None:
    _llamar_hoja({"accion": "borrar", "pedido_ref": str(pedido_ref)})


@app.post("/api/admin/hoja/sincronizar")
def sincronizar_hoja(authorization: Optional[str] = Header(None)):
    """Manda a la hoja los pedidos que ya existian (los mas antiguos primero). Los que ya estan solo se actualizan."""
    token = authorization.replace("Bearer ", "") if authorization else ""
    try:
        cliente_seguro = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(headers={"Authorization": f"Bearer {token}"}))
        pedidos = cliente_seguro.table("pedidos")\
            .select("id, user_id, estado, pagado, created_at, usuarios!user_id(nombre, curso, email), detalles_pedido(modelo, precio_unitario, cantidad)")\
            .order("created_at").execute().data or []
        from datetime import datetime as _dt
        contador: dict = {}
        tareas: list = []
        for ped in pedidos:
            clave = ped.get("user_id") or ped.get("id")
            contador[clave] = contador.get(clave, 0) + 1
            u = ped.get("usuarios") or {}
            correo = str(u.get("email") or "").split("@")[0].strip().lower()
            import re as _re, unicodedata as _ud
            curso = _re.sub(r"[^a-z0-9]", "", _ud.normalize("NFD", str(u.get("curso") or "")).encode("ascii", "ignore").decode().lower())
            etiqueta = "-".join([x for x in [correo, curso, str(contador[clave]).zfill(2)] if x]) if correo else "#" + str(ped["id"])[:8].upper()
            fecha = _dt.fromisoformat(str(ped.get("created_at")).replace("Z", "+00:00")) if ped.get("created_at") else datetime.now(timezone.utc)
            _llamar_hoja(_filas_para_hoja(u.get("nombre") or "", fecha, ped.get("detalles_pedido") or [], str(ped["id"]), etiqueta, ped.get("estado") or ""), tareas)

        # Despues de mandar los pedidos se copia tambien el Pagado de cada persona
        refs_pagados = [str(p["id"]) for p in pedidos if p.get("pagado")]
        if refs_pagados:
            _llamar_hoja({"accion": "pagado", "pedido_refs": refs_pagados, "pagado": True}, tareas)

        def _todas():
            for t in tareas:
                t()

        import threading
        threading.Thread(target=_todas, daemon=True).start()
        return {"mensaje": "Enviando a la hoja", "pedidos": len(pedidos)}
    except Exception:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Ha ocurrido un error en el servidor. Inténtalo de nuevo.")


def _pagado_en_hoja(cliente, usuario_id: str, pagado: bool) -> None:
    """Marca o desmarca la casilla Pagado de todos los pedidos de esa persona en la hoja."""
    try:
        ids = [str(x["id"]) for x in (cliente.table("pedidos").select("id").eq("user_id", usuario_id).neq("estado", "Cancelado").execute().data or [])]
        if ids:
            _llamar_hoja({"accion": "pagado", "pedido_refs": ids, "pagado": bool(pagado)})
    except Exception:
        logging.exception("No se pudo avisar a la hoja del pago")


class PagadoDesdeHoja(BaseModel):
    secret: str
    pedido_ref: str
    pagado: bool


@app.post("/api/hoja/pagado")
def pagado_desde_hoja(datos: PagadoDesdeHoja):
    """La hoja avisa de que se ha marcado o desmarcado Pagado. Se guarda en la web y se copia a los demas pedidos de esa persona."""
    import hmac
    secreto = os.getenv("SHEET_SECRET")
    if not secreto or not hmac.compare_digest(datos.secret, secreto):
        raise HTTPException(status_code=401, detail="No autorizado")
    clave = os.getenv("SUPABASE_SERVICE_KEY")
    if not clave:
        raise HTTPException(status_code=503, detail="Falta SUPABASE_SERVICE_KEY")
    try:
        admin = create_client(SUPABASE_URL, clave)
        hecho = admin.table("pedidos").update({"pagado": datos.pagado}).eq("id", datos.pedido_ref).execute().data
        if not hecho:
            raise HTTPException(status_code=404, detail="Pedido no encontrado")
        return {"mensaje": "Pago actualizado"}
    except HTTPException:
        raise
    except Exception:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Error interno")


@app.get("/api/admin/pedidos")
def obtener_todos_los_pedidos(authorization: Optional[str] = Header(None)):
    token = authorization.replace("Bearer ", "") if authorization else ""
    try:
        cliente_seguro = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(headers={"Authorization": f"Bearer {token}"}))
        respuesta = cliente_seguro.table("pedidos")\
            .select("*, usuarios!user_id(nombre, curso, email), detalles_pedido(*, productos(nombre))")\
            .order('created_at', desc=True)\
            .execute()
        return respuesta.data
    except Exception as e:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Ha ocurrido un error en el servidor. Inténtalo de nuevo.")

@app.get("/api/admin/pedidos/{pedido_id}")
def obtener_detalle_pedido_admin(pedido_id: str, request: Request, authorization: Optional[str] = Header(None)):
    token = authorization.replace("Bearer ", "") if authorization else ""
    try:
        cliente_seguro = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(headers={"Authorization": f"Bearer {token}"}))
        
        pedido_res = cliente_seguro.table("pedidos").select("*").eq("id", pedido_id).execute()
        if not pedido_res.data:
            raise HTTPException(status_code=404, detail="Pedido no encontrado")
        if not getattr(request.state, "es_admin", False) and pedido_res.data[0].get("user_id") != getattr(request.state, "user_id", None):
            raise HTTPException(status_code=404, detail="Pedido no encontrado")
        
        detalles_res = cliente_seguro.table("detalles_pedido")\
            .select("*, productos(nombre, modelos(nombre, imagen))")\
            .eq("pedido_id", pedido_id)\
            .execute()
            
        usuario = None
        numero = total_usuario = None
        try:
            dueno = pedido_res.data[0].get("user_id")
            u = cliente_seguro.table("usuarios").select("nombre, curso, email").eq("id", dueno).execute()
            usuario = u.data[0] if u.data else None
            todos = cliente_seguro.table("pedidos").select("id").eq("user_id", dueno).order("created_at").execute().data or []
            ids = [x["id"] for x in todos]
            total_usuario = len(ids)
            numero = ids.index(pedido_id) + 1 if pedido_id in ids else None
        except Exception:
            pass
        return {"pedido": pedido_res.data[0], "productos": detalles_res.data, "usuario": usuario, "numero": numero, "total_usuario": total_usuario}
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Ha ocurrido un error en el servidor. Inténtalo de nuevo.")

@app.patch("/api/admin/pedidos/{pedido_id}/estado")
def cambiar_estado_pedido(pedido_id: str, nuevo_estado: EstadoPedido, authorization: Optional[str] = Header(None)):
    if nuevo_estado.estado not in ESTADOS_PEDIDO:
        raise HTTPException(status_code=400, detail="Estado no valido")
    token = authorization.replace("Bearer ", "") if authorization else ""
    try:
        cliente_seguro = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(headers={"Authorization": f"Bearer {token}"}))
        antes = cliente_seguro.table("pedidos").select("estado").eq("id", pedido_id).execute().data
        estado_antes = antes[0]["estado"] if antes else None
        respuesta = cliente_seguro.table("pedidos").update({"estado": nuevo_estado.estado}).eq("id", pedido_id).execute()
        try:
            if respuesta.data and nuevo_estado.estado in ("Completado", "Entregado"):
                cs = _cliente_servicio(cliente_seguro)
                for d in cs.table("detalles_pedido").select("id, cantidad").eq("pedido_id", pedido_id).execute().data or []:
                    cs.table("detalles_pedido").update({"hechas": d.get("cantidad") or 1}).eq("id", d["id"]).execute()
        except Exception:
            logging.exception("No se pudieron marcar las bolas como hechas")
        try:
            if respuesta.data and estado_antes != nuevo_estado.estado:
                ped = respuesta.data[0]
                u = cliente_seguro.table("usuarios").select("nombre").eq("id", ped.get("user_id")).execute().data
                dets = cliente_seguro.table("detalles_pedido").select("modelo, precio_unitario, cantidad").eq("pedido_id", pedido_id).execute().data
                fecha = datetime.fromisoformat(str(ped.get("created_at")).replace("Z", "+00:00")) if ped.get("created_at") else datetime.now(timezone.utc)
                _enviar_a_hoja((u[0]["nombre"] if u else ""), fecha, dets, str(pedido_id), _etiqueta_pedido(cliente_seguro, ped), nuevo_estado.estado)
        except Exception:
            logging.exception("No se pudo actualizar la hoja")
        return {"mensaje": "Estado actualizado", "data": respuesta.data}
    except Exception as e:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Ha ocurrido un error en el servidor. Inténtalo de nuevo.")

_HTML_PRUEBA = r"""<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Prueba de bolas</title>
<style>
body{font-family:Arial,sans-serif;margin:0;background:#f8f9fa;color:#111}
main{max-width:1000px;margin:0 auto;padding:24px}
h1{font-size:22px} .fila{display:flex;gap:16px;flex-wrap:wrap;align-items:end;margin-bottom:20px}
label{font-size:12px;color:#6b7280;display:block;margin-bottom:4px;text-transform:uppercase}
select,input{padding:10px;border:1px solid #d1d5db;border-radius:8px;font-size:15px}
#bolas{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
.bola{background:#fff;border-radius:12px;padding:12px;box-shadow:0 1px 4px #0001}
.bola img{width:100%;aspect-ratio:1;object-fit:contain;background:#fff;border-radius:8px}
.bola input{width:100%;box-sizing:border-box;margin:8px 0}
.bola a{display:block;text-align:center;background:#111827;color:#fff;padding:10px;border-radius:8px;text-decoration:none;font-weight:bold}
.aviso{font-size:13px;color:#6b7280}
</style></head><body><main>
<h1>Prueba de bolas con nombre</h1>
<p class="aviso">Pagina de prueba sin base de datos. Solo existe con MODO_PRUEBA=1.</p>
<div class="fila">
 <div><label>Modelo</label><select id="modelo">
  <option>Galleta de Jengibre</option><option>Arbol de Navidad</option><option>Saco de Papa Noel</option>
  <option>Pudin de Navidad</option><option>Calcetin</option><option>Oso de navidad</option>
  <option>Estrella</option><option>Reno de Navidad</option></select></div>
 <div><label>Cantidad</label><input id="cantidad" type="number" min="1" max="12" value="1" style="width:80px"></div>
</div>
<div id="bolas"></div>
<script>
const $=id=>document.getElementById(id);
const temporizadores={};
function pinta(){
  const n=Math.max(1,Math.min(12,parseInt($('cantidad').value)||1));
  const cont=$('bolas'); const previos=[...cont.querySelectorAll('input')].map(i=>i.value);
  cont.innerHTML='';
  for(let i=0;i<n;i++){
    const d=document.createElement('div'); d.className='bola';
    d.innerHTML='<img alt="vista previa"><input placeholder="'+(n>1?'Nombre de la bola '+(i+1):'Escribe un nombre')+'"><a href="#" target="_blank">Descargar 3MF</a>';
    const inp=d.querySelector('input'); inp.value=previos[i]||'';
    inp.addEventListener('input',()=>{clearTimeout(temporizadores[i]);temporizadores[i]=setTimeout(()=>actualiza(d),500)});
    cont.appendChild(d); actualiza(d);
  }
}
function actualiza(d){
  const nombre=d.querySelector('input').value.trim(), modelo=$('modelo').value;
  const img=d.querySelector('img'), a=d.querySelector('a');
  if(!nombre){img.removeAttribute('src');a.style.opacity=.4;a.removeAttribute('href');return}
  const q='modelo='+encodeURIComponent(modelo)+'&nombre='+encodeURIComponent(nombre);
  img.src='/api/preview?'+q; a.href='/api/prueba/3mf?'+q; a.style.opacity=1;
}
$('modelo').addEventListener('change',pinta); $('cantidad').addEventListener('input',pinta); pinta();
</script></main></body></html>"""

if MODO_PRUEBA:
    @app.get("/prueba", response_class=HTMLResponse)
    def pagina_prueba():
        """Pagina de prueba sin base de datos. Solo con MODO_PRUEBA=1."""
        return _HTML_PRUEBA

    @app.get("/api/prueba/3mf")
    def descargar_3mf_prueba(modelo: str, nombre: str):
        """Descarga un 3MF suelto. Solo con MODO_PRUEBA=1, nunca en produccion."""
        try:
            datos = generar_3mf(modelo, nombre)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
        return Response(content=datos, media_type="model/3mf",
                        headers={"Content-Disposition": f'attachment; filename="{nombre_fichero(modelo, nombre)}"'})

@app.get("/api/preview")
def vista_previa_bola(modelo: str, nombre: str, request: Request):
    """Imagen PNG de la bola con el nombre puesto. Es publica porque la usa el cliente antes de comprar."""
    _limitar(request, "preview", 120, 60)
    if len(modelo) > 80 or len(nombre) > 60:
        raise HTTPException(status_code=400, detail="Texto demasiado largo")
    try:
        datos = preview_png(modelo, nombre)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Ha ocurrido un error en el servidor. Inténtalo de nuevo.")
    return Response(content=datos, media_type="image/png", headers={"Cache-Control": "public, max-age=86400"})

@app.get("/api/admin/pedidos/{pedido_id}/3mf")
def descargar_3mf_pedido(pedido_id: str, detalle: Optional[str] = None, authorization: Optional[str] = Header(None)):
    """Genera al vuelo el 3MF de una bola (?detalle=ID) o un zip con todas las del pedido."""
    if not authorization:
        raise HTTPException(status_code=401, detail="No autorizado")
    token = authorization.replace("Bearer ", "")
    try:
        cliente = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(headers={"Authorization": f"Bearer {token}"}))
        user_id = cliente.auth.get_user(token).user.id
        perfil = cliente.table("usuarios").select("administrador").eq("id", user_id).single().execute()
        if not perfil.data or not perfil.data.get("administrador"):
            raise HTTPException(status_code=403, detail="Solo administradores")
        detalles = cliente.table("detalles_pedido").select("id, modelo, personalizacion, cantidad").eq("pedido_id", pedido_id).execute().data
        return _respuesta_3mf_pedido(pedido_id, detalles, detalle)
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Ha ocurrido un error en el servidor. Inténtalo de nuevo.")

def _pedidos_para_cola(authorization: Optional[str], estado: str, pago: str = "todos"):
    if not authorization:
        raise HTTPException(status_code=401, detail="No autorizado")
    token = authorization.replace("Bearer ", "")
    cliente = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(headers={"Authorization": f"Bearer {token}"}))
    user_id = cliente.auth.get_user(token).user.id
    perfil = cliente.table("usuarios").select("administrador").eq("id", user_id).single().execute()
    if not perfil.data or not perfil.data.get("administrador"):
        raise HTTPException(status_code=403, detail="Solo administradores")
    datos = cliente.table("pedidos").select("id, estado, pagado, created_at, usuarios!user_id(nombre, curso), detalles_pedido(id, modelo, color, personalizacion, cantidad, hechas)") \
        .eq("estado", estado).execute().data
    return _filtrar_pago(datos, pago)


def _nombrada(d: dict) -> bool:
    return bool(d.get("personalizacion")) and d["personalizacion"] != "Sin texto"


def _revisar_completado(cs, pedido_id: str):
    """Si ya estan hechas todas las bolas con nombre de un pedido Pendiente, lo pasa a Completado. Nunca lo vuelve a Pendiente."""
    ped = cs.table("pedidos").select("*").eq("id", pedido_id).execute().data
    if not ped or ped[0].get("estado") != "Pendiente":
        return ped[0].get("estado") if ped else None
    dets = cs.table("detalles_pedido").select("id, personalizacion, cantidad, hechas, modelo, precio_unitario").eq("pedido_id", pedido_id).execute().data or []
    nombradas = [d for d in dets if _nombrada(d)]
    if not nombradas or any((d.get("hechas") or 0) < (d.get("cantidad") or 1) for d in nombradas):
        return "Pendiente"
    _escribir(cs.table("pedidos").update({"estado": "Completado"}).eq("id", pedido_id), "No se pudo completar el pedido")
    try:
        u = cs.table("usuarios").select("nombre").eq("id", ped[0].get("user_id")).execute().data
        fecha = datetime.fromisoformat(str(ped[0].get("created_at")).replace("Z", "+00:00")) if ped[0].get("created_at") else datetime.now(timezone.utc)
        _enviar_a_hoja((u[0]["nombre"] if u else ""), fecha, dets, str(pedido_id), _etiqueta_pedido(cs, ped[0]), "Completado")
    except Exception:
        logging.exception("No se pudo actualizar la hoja")
    return "Completado"


def _guardar_hechas(cs, detalle_id: str, hechas: int):
    det = cs.table("detalles_pedido").select("id, pedido_id, cantidad").eq("id", detalle_id).execute().data
    if not det:
        raise HTTPException(status_code=404, detail="Esa bola no existe")
    n = max(0, min(int(hechas), det[0].get("cantidad") or 1))
    _escribir(cs.table("detalles_pedido").update({"hechas": n}).eq("id", detalle_id), "No se pudo guardar")
    return det[0]["pedido_id"], n


@app.patch("/api/admin/lineas/{detalle_id}/hechas")
def marcar_linea_hecha(detalle_id: str, datos: HechasLinea, authorization: Optional[str] = Header(None)):
    """Cuantas bolas de una linea ya estan impresas. Con la ultima del pedido, el pedido pasa a Completado."""
    try:
        cs = _cliente_servicio(_exigir_admin(authorization))
        pedido_id, n = _guardar_hechas(cs, detalle_id, datos.hechas)
        return {"hechas": n, "estado_pedido": _revisar_completado(cs, pedido_id)}
    except HTTPException:
        raise
    except Exception:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Ha ocurrido un error en el servidor. Inténtalo de nuevo.")


@app.patch("/api/admin/impresion/hechas")
def marcar_pack_hecho(datos: HechasPack, authorization: Optional[str] = Header(None)):
    """Marca como hechas las bolas de un pack: se repite el id de la linea una vez por bola."""
    try:
        cs = _cliente_servicio(_exigir_admin(authorization))
        cuenta = {}
        for d in datos.detalles:
            cuenta[d] = cuenta.get(d, 0) + 1
        pedidos = set()
        for detalle_id, n in cuenta.items():
            fila = cs.table("detalles_pedido").select("hechas").eq("id", detalle_id).execute().data
            if not fila:
                continue
            pedido_id, _ = _guardar_hechas(cs, detalle_id, (fila[0].get("hechas") or 0) + n)
            pedidos.add(pedido_id)
        completados = [pid for pid in pedidos if _revisar_completado(cs, pid) == "Completado"]
        return {"mensaje": "Bolas marcadas como hechas", "pedidos_completados": len(completados)}
    except HTTPException:
        raise
    except Exception:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Ha ocurrido un error en el servidor. Inténtalo de nuevo.")


@app.get("/api/admin/impresion")
def cola_impresion(estado: str = "Pendiente", pago: str = "todos", authorization: Optional[str] = Header(None)):
    """Bolas con nombre de los pedidos en ese estado, agrupadas por color."""
    try:
        return _cola_impresion(_pedidos_para_cola(authorization, estado, pago), estado == "Pendiente")
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Ha ocurrido un error en el servidor. Inténtalo de nuevo.")


@app.get("/api/admin/impresion/3mf")
def cola_impresion_3mf(color: Optional[str] = None, cliente: Optional[str] = None, pack: Optional[int] = None, orden: str = "antiguos", formato: str = "3mf", estado: str = "Pendiente", pago: str = "todos", authorization: Optional[str] = Header(None)):
    """Zip con los 3MF de las bolas de un color (para imprimirlas juntas) o de una persona."""
    if color is None and cliente is None:
        raise HTTPException(status_code=400, detail="Indica color o cliente")
    try:
        return _respuesta_cola(_cola_impresion(_pedidos_para_cola(authorization, estado, pago), estado == "Pendiente"), color, cliente, pack, orden, formato)
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Ha ocurrido un error en el servidor. Inténtalo de nuevo.")


@app.delete("/api/admin/pedidos/{pedido_id}")
def eliminar_pedido_admin(pedido_id: str, authorization: Optional[str] = Header(None)):
    token = authorization.replace("Bearer ", "") if authorization else ""
    try:
        cliente_seguro = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(headers={"Authorization": f"Bearer {token}"}))
        cliente_seguro.table("detalles_pedido").delete().eq("pedido_id", pedido_id).execute()
        respuesta = cliente_seguro.table("pedidos").delete().eq("id", pedido_id).execute()
        try:
            _quitar_de_hoja(pedido_id)
        except Exception:
            logging.exception("No se pudo actualizar la hoja")
        return {"mensaje": "Pedido eliminado correctamente", "data": respuesta.data}
    except Exception as e:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Ha ocurrido un error en el servidor. Inténtalo de nuevo.")

@app.post("/api/admin/productos")
def crear_producto_admin(datos: ProductoAdminCrear, authorization: Optional[str] = Header(None)):
    token = authorization.replace("Bearer ", "") if authorization else ""
    try:
        cliente_seguro = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(headers={"Authorization": f"Bearer {token}"}))
        try:
            res = cliente_seguro.table("productos").insert(datos.dict()).execute()
        except Exception:
            # Aun no existen las columnas de oferta (falta ofertas.sql): se crea sin ellas
            res = cliente_seguro.table("productos").insert({k: v for k, v in datos.dict().items() if k not in CAMPOS_OFERTA}).execute()
        return res.data[0]
    except Exception as e:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Ha ocurrido un error en el servidor. Inténtalo de nuevo.")

@app.patch("/api/admin/productos/{producto_id}")
def actualizar_producto_admin(producto_id: str, datos: ProductoAdminUpdate, authorization: Optional[str] = Header(None)):
    token = authorization.replace("Bearer ", "") if authorization else ""
    try:
        cliente_seguro = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(headers={"Authorization": f"Bearer {token}"}))
        update_data = {k: v for k, v in datos.dict().items() if v is not None}
        try:
            res = cliente_seguro.table("productos").update(update_data).eq("id", producto_id).execute()
        except Exception:
            # Aun no existen las columnas de oferta (falta ofertas.sql): se guarda el resto
            resto = {k: v for k, v in update_data.items() if k not in CAMPOS_OFERTA}
            if len(resto) == len(update_data):
                raise
            res = cliente_seguro.table("productos").update(resto).eq("id", producto_id).execute()
        return res.data
    except Exception as e:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Ha ocurrido un error en el servidor. Inténtalo de nuevo.")

@app.delete("/api/admin/productos/{producto_id}")
def eliminar_producto_admin(producto_id: str, authorization: Optional[str] = Header(None)):
    """Borra un producto con sus modelos. Si ya esta en pedidos o carritos no se puede borrar:
    en ese caso se oculta y se deshabilita para que no se vea en la tienda."""
    if not authorization:
        raise HTTPException(status_code=401, detail="No autorizado")
    token = authorization.replace("Bearer ", "")
    try:
        cliente = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(headers={"Authorization": f"Bearer {token}"}))
        en_pedidos = cliente.table("detalles_pedido").select("id").eq("producto_id", producto_id).limit(1).execute().data
        en_carritos = cliente.table("carrito").select("id").eq("producto_id", producto_id).limit(1).execute().data
        if en_pedidos or en_carritos:
            res = cliente.table("productos").update({"oculto": True, "deshabilitado": True}).eq("id", producto_id).execute()
            if not res.data:
                raise HTTPException(status_code=403, detail="No tienes permisos")
            return {"mensaje": "El producto tiene pedidos o carritos y no se puede borrar. Se ha ocultado y deshabilitado.", "ocultado": True}
        cliente.table("modelos").delete().eq("producto_id", producto_id).execute()
        res = cliente.table("productos").delete().eq("id", producto_id).execute()
        if not res.data:
            raise HTTPException(status_code=403, detail="No tienes permisos o el producto no existe")
        return {"mensaje": "Producto eliminado", "ocultado": False}
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Ha ocurrido un error en el servidor. Inténtalo de nuevo.")

@app.post("/api/admin/productos/{producto_id}/modelos")
def crear_modelo(producto_id: str, datos: ModeloAdminData, authorization: Optional[str] = Header(None)):
    token = authorization.replace("Bearer ", "") if authorization else ""
    try:
        cliente_seguro = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(headers={"Authorization": f"Bearer {token}"}))
        nuevo_modelo = datos.dict()
        nuevo_modelo["producto_id"] = producto_id
        res = cliente_seguro.table("modelos").insert(nuevo_modelo).execute()
        return res.data
    except Exception as e:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Ha ocurrido un error en el servidor. Inténtalo de nuevo.")

@app.patch("/api/admin/modelos/{modelo_id}")
def actualizar_modelo(modelo_id: str, datos: ModeloAdminData, authorization: Optional[str] = Header(None)):
    token = authorization.replace("Bearer ", "") if authorization else ""
    try:
        cliente_seguro = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(headers={"Authorization": f"Bearer {token}"}))
        res = cliente_seguro.table("modelos").update(datos.dict()).eq("id", modelo_id).execute()
        return res.data
    except Exception as e:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Ha ocurrido un error en el servidor. Inténtalo de nuevo.")

@app.delete("/api/admin/modelos/{modelo_id}")
def eliminar_modelo(modelo_id: str, authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="No autorizado")
    token = authorization.replace("Bearer ", "")
    try:
        cliente = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(headers={"Authorization": f"Bearer {token}"}))
        res = cliente.table("modelos").delete().eq("id", modelo_id).execute()
        return {"mensaje": "Modelo eliminado con éxito"}
    except Exception as e:
        if "foreign key constraint" in str(e).lower():
            raise HTTPException(
                status_code=400, 
                detail="No se puede borrar: Este modelo está en el carrito o pedido de algún cliente."
            )
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Ha ocurrido un error en el servidor. Inténtalo de nuevo.")

@app.get("/api/admin/usuarios")
def obtener_usuarios_admin(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="No autorizado")
    
    token = authorization.replace("Bearer ", "")
    
    try:
        cliente_admin = create_client(
            SUPABASE_URL, 
            SUPABASE_KEY, 
            options=ClientOptions(headers={"Authorization": f"Bearer {token}"})
        )
        
        res = cliente_admin.table("usuarios").select("*, pedidos(id)").execute()
        
        usuarios_procesados = []
        for u in res.data:
            lista_pedidos = u.get("pedidos") or []
            u["num_pedidos"] = len(lista_pedidos)
            u.pop("pedidos", None) 
            usuarios_procesados.append(u)
            
        return usuarios_procesados

    except Exception as e:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Ha ocurrido un error en el servidor. Inténtalo de nuevo.")


# ---------- Correos a los usuarios desde la web ----------
# Se envian con la cuenta de correo de las variables de Railway: SMTP_USER y SMTP_PASSWORD
# (contrasena de aplicacion de Gmail). Opcionales: SMTP_HOST (smtp.gmail.com), SMTP_PORT (587), SMTP_FROM.
_FIRMAS_CORREO = {
    "navidad": {"fondo": "#f3ece4", "cabecera": "#701a1e", "rotulo": "#f5d98b", "barra": "#c8963e", "enlace": "#701a1e",
                "sello": "IES LAGUNA DE TOLLÓN · 2º DAM", "firma": "Departamento logístico navideño del IES Laguna de Tollón", "adornos": "adornos navideños"},
    "sanvalentin": {"fondo": "#fde4ec", "cabecera": "#7a1840", "rotulo": "#ffc2d4", "barra": "#e0568a", "enlace": "#7a1840",
                    "sello": "IES LAGUNA DE TOLLÓN · ADORNOS DE SAN VALENTÍN", "firma": "Departamento logístico de San Valentín del IES Laguna de Tollón", "adornos": "adornos de San Valentín"},
    "normal": {"fondo": "#f1f5f9", "cabecera": "#1e293b", "rotulo": "#bfdbfe", "barra": "#2563eb", "enlace": "#1e3a8a",
               "sello": "IES LAGUNA DE TOLLÓN · 2º DAM", "firma": "Departamento logístico del IES Laguna de Tollón", "adornos": "adornos personalizados"},
}
_LOGO_CORREO = "cid:logo_ies"
_RUTA_LOGO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "logo_ies.png")


def _config_correo():
    usuario = os.getenv("SMTP_USER", "").strip()
    clave = os.getenv("SMTP_PASSWORD", "").strip()
    if not usuario or not clave:
        return None
    return {"host": os.getenv("SMTP_HOST", "smtp.gmail.com"), "port": int(os.getenv("SMTP_PORT", "587") or 587),
            "usuario": usuario, "clave": clave, "remitente": os.getenv("SMTP_FROM", usuario).strip() or usuario}


def _correo_html(tema: str, titulo: str, mensaje: str, contacto: str, extra: str = "") -> str:
    """Correo con el estilo del tema activo y la firma del departamento. El texto va escapado."""
    c = _FIRMAS_CORREO.get(tema) or _FIRMAS_CORREO["navidad"]
    parrafos = "".join(f'<p style="margin:0 0 14px">{_html.escape(x).replace(chr(10), "<br>")}</p>' for x in re.split(r"\n\s*\n", mensaje.strip()) if x.strip())
    return (f'<div style="background:{c["fondo"]};padding:24px 12px;font-family:Arial,Helvetica,sans-serif">'
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden">'
            f'<tr><td style="background:{c["cabecera"]};padding:30px 24px;text-align:center"><div style="color:{c["rotulo"]};font-size:12px;letter-spacing:3px">{_html.escape(c["sello"])}</div>'
            f'<div style="color:#ffffff;font-size:24px;font-weight:bold;margin-top:10px">{_html.escape(titulo)}</div></td></tr>'
            f'<tr><td style="height:5px;background:{c["barra"]};font-size:0;line-height:0">&nbsp;</td></tr>'
            f'<tr><td style="padding:30px 30px 16px;color:#1f2937;font-size:16px;line-height:1.6">{parrafos}{extra}</td></tr>'
            f'<tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 30px;text-align:center">'
            f'<img src="{_LOGO_CORREO}" alt="IES Laguna de Tollón" width="170" style="display:block;margin:0 auto 10px">'
            f'<p style="margin:0;color:#6b7280;font-size:13px;line-height:1.5">Atentamente,<br>{_html.escape(c["firma"])}<br>'
            f'<a href="mailto:{_html.escape(contacto)}" style="color:{c["enlace"]}">{_html.escape(contacto)}</a></p></td></tr></table></div>')


def _enviar_correo(para: str, asunto: str, mensaje: str, tema: str = "navidad", responde_a: Optional[str] = None, extra_html: str = "", extra_texto: str = ""):
    """Manda un correo con firma. Lanza ValueError si faltan las variables y RuntimeError si el servidor de correo falla."""
    cfg = _config_correo()
    if not cfg:
        raise ValueError("Falta configurar el correo en Railway (SMTP_USER y SMTP_PASSWORD).")
    asunto = re.sub(r"\s+", " ", asunto).strip()
    firma = (_FIRMAS_CORREO.get(tema) or _FIRMAS_CORREO["navidad"])["firma"]
    msg = EmailMessage()
    msg["Subject"] = asunto
    msg["From"] = formataddr((firma, cfg["remitente"]))
    msg["To"] = para
    msg["Reply-To"] = cfg["remitente"]
    msg.set_content(f"{mensaje.strip()}\n\n" + (f"{extra_texto.strip()}\n\n" if extra_texto else "") + f"Atentamente,\n{firma}\n{cfg['remitente']}")
    if responde_a and re.fullmatch(r"<[^<>\s]{3,280}>", responde_a):
        msg["In-Reply-To"] = responde_a
        msg["References"] = responde_a
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain=cfg["remitente"].split("@")[-1])
    msg.add_alternative(_correo_html(tema, asunto, mensaje, cfg["remitente"], extra_html), subtype="html")
    try:
        with open(_RUTA_LOGO, "rb") as f:
            msg.get_payload()[1].add_related(f.read(), "image", "png", cid="<logo_ies>", disposition="inline", filename="logo_ies.png")
    except OSError:
        logging.warning("No se encontró el logo para el correo")
    try:
        if cfg["port"] == 465:
            with smtplib.SMTP_SSL(cfg["host"], cfg["port"], timeout=20, context=ssl.create_default_context()) as srv:
                srv.login(cfg["usuario"], cfg["clave"]); srv.send_message(msg)
        else:
            with smtplib.SMTP(cfg["host"], cfg["port"], timeout=20) as srv:
                srv.ehlo()
                if srv.has_extn("starttls"):
                    srv.starttls(context=ssl.create_default_context()); srv.ehlo()
                if srv.has_extn("auth"):
                    srv.login(cfg["usuario"], cfg["clave"])
                srv.send_message(msg)
    except Exception as e:
        logging.exception("No se pudo enviar el correo")
        raise RuntimeError("No se pudo enviar el correo. Revisa la cuenta de correo en Railway.") from e


_CITA = re.compile(r"^(>|El .{5,120}(escribi[oó]|ha escrito):?\s*$|On .{5,120}wrote:?\s*$|-{2,}\s*(Mensaje original|Original Message)|De:\s.+|From:\s.+)", re.I)


def _sin_citas(texto: str) -> str:
    """Se queda con lo que escribio la persona y corta el correo citado de abajo."""
    lineas = texto.replace("\r", "").split("\n")
    salida = []
    for i, linea in enumerate(lineas):
        # Gmail parte "El ... escribio:" en dos lineas: se prueba tambien la linea unida con la siguiente
        unida = (linea.strip() + " " + (lineas[i + 1].strip() if i + 1 < len(lineas) else "")).strip()
        if _CITA.match(linea.strip()) or _CITA.match(unida):
            break
        salida.append(linea)
    return "\n".join(salida).strip()


def _texto_correo(m) -> str:
    cuerpo = m.get_body(preferencelist=("plain", "html"))
    if cuerpo is None:
        return ""
    t = cuerpo.get_content()
    if cuerpo.get_content_type() == "text/html":
        t = re.sub(r"(?is)<(script|style).*?</\1>", "", t)
        t = re.sub(r"(?i)<br\s*/?>|</p>|</div>", "\n", t)
        t = _html.unescape(re.sub(r"<[^>]+>", "", t))
    return _sin_citas(re.sub(r"\n{3,}", "\n\n", t))[:2500]


def _carpeta_todos(im) -> str:
    """Gmail llama distinto a la carpeta Todos segun el idioma: se busca por su marca \\All."""
    tipo, filas = im.list()
    for f in filas or []:
        txt = f.decode("utf-8", "ignore") if isinstance(f, bytes) else str(f)
        m = re.match(r'\((.*?)\)\s+"(.*?)"\s+(.*)$', txt)
        if m and "\\All" in m.group(1):
            return m.group(3)
    return '"[Gmail]/All Mail"'


def _leer_correos(con_quien: str, limite: int = 30) -> list:
    """Correos que hay entre la cuenta de la web y una persona, del mas viejo al mas nuevo."""
    import imaplib
    from email import message_from_bytes, policy
    from email.utils import parseaddr, parsedate_to_datetime
    cfg = _config_correo()
    if not cfg:
        raise ValueError("Falta configurar el correo en Railway (SMTP_USER y SMTP_PASSWORD).")
    if not re.fullmatch(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+", con_quien):
        raise ValueError("Dirección no válida")
    salida = []
    try:
        with imaplib.IMAP4_SSL(os.getenv("IMAP_HOST", "imap.gmail.com"), 993, timeout=25) as im:
            im.login(cfg["usuario"], cfg["clave"])
            im.select(_carpeta_todos(im), readonly=True)
            tipo, datos = im.search(None, "OR", "FROM", f'"{con_quien}"', "TO", f'"{con_quien}"')
            ids = (datos[0] or b"").split()[-limite:]
            for i in ids:
                tipo, partes = im.fetch(i, "(BODY.PEEK[])")
                crudo = next((p[1] for p in partes if isinstance(p, tuple)), None)
                if not crudo:
                    continue
                m = message_from_bytes(crudo, policy=policy.default)
                de = parseaddr(str(m.get("From", "")))[1].lower()
                try:
                    fecha = parsedate_to_datetime(str(m.get("Date"))).astimezone(timezone.utc).isoformat()
                except Exception:
                    fecha = ""
                salida.append({"id": str(m.get("Message-ID", "")).strip(), "fecha": fecha, "mio": de == cfg["remitente"].lower(),
                               "asunto": str(m.get("Subject", ""))[:200], "texto": _texto_correo(m)})
    except (OSError, imaplib.IMAP4.error) as e:
        logging.exception("No se pudo leer el correo")
        raise RuntimeError("No se pudo leer el correo. Mira que IMAP esté activo en Gmail y la clave en Railway.") from e
    salida.sort(key=lambda x: x["fecha"])
    return salida


@app.get("/api/admin/usuarios/{usuario_id}/correos")
def correos_usuario(usuario_id: str, authorization: Optional[str] = Header(None)):
    """Conversacion por correo con una persona: lo que le mandamos y lo que ha contestado."""
    try:
        cliente = _exigir_admin(authorization)
        u = cliente.table("usuarios").select("email").eq("id", usuario_id).execute().data
        if not u or not u[0].get("email"):
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        if not _config_correo():
            return {"configurado": False, "correos": []}
        return {"configurado": True, "correos": _leer_correos(u[0]["email"].strip().lower())}
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Ha ocurrido un error en el servidor. Inténtalo de nuevo.")


def _factura(tema: str, codigo: str, fecha, lineas: list, total: float, nota: str = ""):
    """Resumen del pedido para el correo: devuelve (html, texto). Todo el texto del cliente va escapado."""
    c = _FIRMAS_CORREO.get(tema) or _FIRMAS_CORREO["navidad"]
    from zoneinfo import ZoneInfo
    f = fecha.astimezone(ZoneInfo("Europe/Madrid")) if getattr(fecha, "tzinfo", None) else fecha
    dia = f.strftime("%d/%m/%Y %H:%M")
    def euro(x): return f"{float(x):.2f}".replace(".", ",") + " €"
    filas_h, filas_t = [], []
    for d in lineas:
        cant = int(d.get("cantidad") or 1)
        pu = float(d.get("precio_unitario") or 0)
        nombre = d.get("personalizacion")
        nombre = "" if not nombre or nombre == "Sin texto" else str(nombre)
        figura = str(d.get("modelo") or "Figura")
        color = str(d.get("color") or "")
        detalle_h = _html.escape(figura) + (f'<br><span style="color:#6b7280;font-size:13px">{_html.escape(color)}</span>' if color else "")
        filas_h.append(f'<tr><td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:14px">{detalle_h}</td>'
                       f'<td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:14px;font-weight:bold">{_html.escape(nombre) or "—"}</td>'
                       f'<td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:14px;text-align:center">{cant}</td>'
                       f'<td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:14px;text-align:right;white-space:nowrap">{euro(pu * cant)}</td></tr>')
        filas_t.append(f"- {figura}{' ' + color if color else ''}" + (f' "{nombre}"' if nombre else "") + f" x{cant}: {euro(pu * cant)}")
    nota_h = (f'<p style="margin:14px 0 0;color:#4b5563;font-size:14px"><b>Tu nota:</b> {_html.escape(nota)}</p>' if nota else "")
    html = (f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 4px;border:1px solid #e5e7eb;border-radius:10px;border-collapse:separate;overflow:hidden">'
            f'<tr><td colspan="4" style="background:{c["cabecera"]};color:{c["rotulo"]};padding:10px 12px;font-size:12px;letter-spacing:2px;font-weight:bold">RESUMEN DEL PEDIDO</td></tr>'
            f'<tr><td colspan="4" style="padding:12px 12px 4px;font-size:14px;color:#374151">Pedido <b>{_html.escape(codigo)}</b><br><span style="color:#6b7280">{dia}</span></td></tr>'
            f'<tr style="background:#f9fafb"><th align="left" style="padding:8px;font-size:12px;color:#6b7280">FIGURA</th><th align="left" style="padding:8px;font-size:12px;color:#6b7280">NOMBRE</th>'
            f'<th style="padding:8px;font-size:12px;color:#6b7280">CANT.</th><th align="right" style="padding:8px;font-size:12px;color:#6b7280">IMPORTE</th></tr>'
            + "".join(filas_h) +
            f'<tr><td colspan="3" style="padding:12px 8px;text-align:right;font-weight:bold;font-size:15px">Total</td>'
            f'<td style="padding:12px 8px;text-align:right;font-weight:bold;font-size:15px;color:{c["enlace"]};white-space:nowrap">{euro(total)}</td></tr></table>' + nota_h)
    texto = f"RESUMEN DEL PEDIDO {codigo} ({dia})\n" + "\n".join(filas_t) + f"\nTotal: {euro(total)}" + (f"\nTu nota: {nota}" if nota else "")
    return html, texto


def _correo_pedido_recibido(cliente, pedido: dict, detalles: list, user_id: str) -> None:
    """Manda al cliente el resumen de su pedido. Si algo falla, se anota y el pedido sigue valido."""
    try:
        if not _config_correo():
            return
        u = cliente.table("usuarios").select("nombre, email").eq("id", user_id).execute().data
        if not u or not u[0].get("email"):
            return
        nombre = (u[0].get("nombre") or "").strip()
        fecha = datetime.fromisoformat(str(pedido.get("created_at")).replace("Z", "+00:00")) if pedido.get("created_at") else datetime.now(timezone.utc)
        codigo = _etiqueta_pedido(cliente, {**pedido, "user_id": user_id})
        tema = obtener_tema().get("tema", "navidad")
        html, texto = _factura(tema, codigo, fecha, detalles, float(pedido.get("total") or 0), str(pedido.get("nota") or ""))
        saludo = f"Hola {nombre.split(' ')[0]}:" if nombre else "Hola:"
        _enviar_correo(u[0]["email"], f"Hemos recibido tu pedido {codigo}",
                       f"{saludo}\n\nHemos recibido tu pedido de {(_FIRMAS_CORREO.get(tema) or _FIRMAS_CORREO['navidad'])['adornos']}. Aquí tienes el resumen.\n\nSi hay algún error en alguna bola, respóndenos a este correo y lo arreglamos.",
                       tema, None, html, texto)
    except Exception:
        logging.exception("No se pudo enviar el resumen del pedido")


@app.get("/api/admin/correo/estado")
def estado_correo_admin(authorization: Optional[str] = Header(None)):
    _exigir_admin(authorization)
    cfg = _config_correo()
    return {"configurado": bool(cfg), "remitente": cfg["remitente"] if cfg else None}


@app.post("/api/admin/usuarios/{usuario_id}/correo")
def enviar_correo_usuario(usuario_id: str, datos: CorreoUsuario, authorization: Optional[str] = Header(None)):
    """El admin escribe a una persona. El destinatario sale siempre de la base de datos, nunca de lo que mande la web."""
    try:
        cliente = _exigir_admin(authorization)
        u = cliente.table("usuarios").select("email, nombre").eq("id", usuario_id).execute().data
        if not u or not u[0].get("email"):
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        _enviar_correo(u[0]["email"], datos.asunto.strip(), datos.mensaje, obtener_tema().get("tema", "navidad"), datos.responde_a)
        logging.info("Correo enviado a un usuario desde el panel")
        return {"mensaje": "Correo enviado", "para": u[0]["email"]}
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Ha ocurrido un error en el servidor. Inténtalo de nuevo.")


def _perfil_usuario(cliente, usuario_id: str):
    """Datos de una persona y todos sus pedidos con el codigo visible, el estado, si estan pagados y sus lineas."""
    u = cliente.table("usuarios").select("id, nombre, email, curso, profesor, administrador").eq("id", usuario_id).execute().data
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    u = u[0]
    peds = cliente.table("pedidos").select("id, estado, total, pagado, nota, created_at, detalles_pedido(id, producto_id, modelo, color, personalizacion, cantidad, precio_unitario)") \
        .eq("user_id", usuario_id).order("created_at").execute().data or []
    salida = []
    for n, p in enumerate(peds, start=1):
        salida.append({"id": p["id"], "codigo": _codigo_pedido(u, n), "estado": p.get("estado"), "pagado": bool(p.get("pagado")),
                       "total": p.get("total"), "nota": p.get("nota"), "creado": p.get("created_at"), "lineas": p.get("detalles_pedido") or []})
    return {"usuario": u, "pedidos": salida}


@app.get("/api/admin/usuarios/{usuario_id}/perfil")
def perfil_usuario_admin(usuario_id: str, authorization: Optional[str] = Header(None)):
    try:
        return _perfil_usuario(_exigir_admin(authorization), usuario_id)
    except HTTPException:
        raise
    except Exception:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Ha ocurrido un error en el servidor. Inténtalo de nuevo.")


def _cliente_servicio(cliente_admin):
    """Cliente con la clave de servicio para escribir (las reglas de la base de datos no dejan al admin cambiar lineas ajenas)."""
    clave = os.getenv("SUPABASE_SERVICE_KEY")
    return create_client(SUPABASE_URL, clave) if clave else cliente_admin


def _escribir(consulta, error: str):
    """Ejecuta un update o delete y avisa si no ha tocado ninguna fila, en vez de dar por bueno un cambio que no se hizo."""
    r = consulta.execute()
    if not r.data:
        logging.error("La base de datos no cambio ninguna fila: %s", error)
        raise HTTPException(status_code=500, detail=error)
    return r


def _comprobar_editable(cliente, pedido_id: str):
    """El admin solo puede cambiar pedidos Pendientes y sin pagar."""
    r = cliente.table("pedidos").select("estado, pagado").eq("id", pedido_id).execute().data
    if not r:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    if r[0].get("pagado") and r[0].get("estado") != "Cancelado":
        raise HTTPException(status_code=409, detail="Este pedido ya está pagado y no se puede cambiar.")
    if r[0].get("estado") != "Pendiente":
        raise HTTPException(status_code=409, detail="Solo se pueden cambiar pedidos Pendientes.")


@app.patch("/api/admin/pedidos/{pedido_id}/anular")
def anular_pedido_admin(pedido_id: str, authorization: Optional[str] = Header(None)):
    """El admin anula un pedido Pendiente sin pagar."""
    try:
        cliente = _exigir_admin(authorization)
        _comprobar_anulable(cliente, pedido_id)
        _escribir(_cliente_servicio(cliente).table("pedidos").update({"estado": "Cancelado"}).eq("id", pedido_id), "No se pudo anular el pedido. Inténtalo de nuevo.")
        _estado_en_hoja(str(pedido_id), "Cancelado")
        return {"mensaje": "Pedido anulado", "estado": "Cancelado"}
    except HTTPException:
        raise
    except Exception:
        logging.exception("Error al anular el pedido")
        raise HTTPException(status_code=500, detail="No se pudo anular el pedido. Inténtalo de nuevo.")


@app.patch("/api/admin/pedidos/{pedido_id}/detalles/{detalle_id}")
def editar_bola_admin(pedido_id: str, detalle_id: str, datos: EdicionBola, authorization: Optional[str] = Header(None)):
    """El admin cambia el modelo, el color, el nombre o la cantidad de una linea de un pedido, este pagado o no."""
    try:
        cliente = _exigir_admin(authorization)
        _comprobar_editable(cliente, pedido_id)
        det = cliente.table("detalles_pedido").select("id, producto_id, modelo, color, personalizacion, cantidad").eq("pedido_id", pedido_id).eq("id", detalle_id).execute().data
        if not det:
            raise HTTPException(status_code=404, detail="Esa bola no está en el pedido.")
        det = det[0]
        cambios = {}
        if datos.producto_id or datos.modelo or datos.color:
            producto_id = datos.producto_id or det.get("producto_id")
            prod = cliente.table("productos").select("id, nombre, precio, colores, oculto, deshabilitado, modelos(nombre)").eq("id", producto_id).execute().data
            if not prod:
                raise HTTPException(status_code=400, detail="Ese producto no existe.")
            prod = prod[0]
            modelo = datos.modelo or det.get("modelo")
            color = datos.color or det.get("color")
            if modelo not in [_figura_modelo(prod.get("nombre"), m.get("nombre")) for m in (prod.get("modelos") or [])]:
                raise HTTPException(status_code=400, detail="Ese modelo no es de ese producto.")
            if prod.get("colores") and color not in prod["colores"]:
                raise HTTPException(status_code=400, detail="Ese color no es de ese producto.")
            cambios.update({"producto_id": producto_id, "modelo": modelo, "color": color, "precio_unitario": float(prod.get("precio") or 0)})
        if datos.personalizacion is not None:
            nombre = re.sub(r"\s+", " ", datos.personalizacion.strip())
            error = _error_nombre_bola(nombre, True)
            if error:
                raise HTTPException(status_code=400, detail=error)
            cambios["personalizacion"] = nombre
        if datos.cantidad is not None:
            cambios["cantidad"] = datos.cantidad
        if not cambios:
            raise HTTPException(status_code=400, detail="No hay nada que cambiar.")
        if any(k in cambios for k in ("modelo", "personalizacion", "producto_id")):
            cambios["hechas"] = 0   # la bola cambia, hay que imprimirla de nuevo
        escritor = _cliente_servicio(cliente)
        _escribir(escritor.table("detalles_pedido").update(cambios).eq("id", detalle_id).eq("pedido_id", pedido_id), "No se pudo guardar el cambio. Inténtalo de nuevo.")
        todas = escritor.table("detalles_pedido").select("precio_unitario, cantidad").eq("pedido_id", pedido_id).execute().data or []
        total = round(sum(float(d.get("precio_unitario") or 0) * (d.get("cantidad") or 1) for d in todas), 2)
        escritor.table("pedidos").update({"total": total}).eq("id", pedido_id).execute()
        estado = _tras_cambiar_bolas(escritor, pedido_id, "hechas" in cambios)
        _refrescar_hoja(escritor, pedido_id, estado)
        return {"mensaje": "Bola cambiada", "total": total, "estado": estado}
    except HTTPException:
        raise
    except Exception:
        logging.exception("Error al editar la bola")
        raise HTTPException(status_code=500, detail="No se pudo cambiar la bola. Inténtalo de nuevo.")


@app.patch("/api/admin/pedidos/{pedido_id}/detalles/{detalle_id}/quitar")
def quitar_bola_admin(pedido_id: str, detalle_id: str, authorization: Optional[str] = Header(None)):
    """El admin quita una unidad de una linea de un pedido, este pagado o no. Si era la ultima del pedido, se anula."""
    try:
        cliente = _exigir_admin(authorization)
        _comprobar_editable(cliente, pedido_id)
        det = cliente.table("detalles_pedido").select("id, cantidad").eq("pedido_id", pedido_id).eq("id", detalle_id).execute().data
        if not det:
            raise HTTPException(status_code=404, detail="Esa bola no está en el pedido.")
        escritor = _cliente_servicio(cliente)
        msg_error = "No se pudo quitar la bola. Inténtalo de nuevo."
        if (det[0].get("cantidad") or 1) > 1:
            _escribir(escritor.table("detalles_pedido").update({"cantidad": (det[0].get("cantidad") or 1) - 1}).eq("id", detalle_id), msg_error)
        else:
            _escribir(escritor.table("detalles_pedido").delete().eq("id", detalle_id).eq("pedido_id", pedido_id), msg_error)
        quedan = escritor.table("detalles_pedido").select("precio_unitario, cantidad").eq("pedido_id", pedido_id).execute().data or []
        if not quedan:
            escritor.table("pedidos").update({"estado": "Cancelado"}).eq("id", pedido_id).execute()
            _estado_en_hoja(str(pedido_id), "Cancelado")
            return {"mensaje": "Pedido anulado", "estado": "Cancelado", "total": 0}
        total = round(sum(float(d.get("precio_unitario") or 0) * (d.get("cantidad") or 1) for d in quedan), 2)
        escritor.table("pedidos").update({"total": total}).eq("id", pedido_id).execute()
        estado = _tras_cambiar_bolas(escritor, pedido_id)
        _refrescar_hoja(escritor, pedido_id, estado)
        return {"mensaje": "Bola quitada", "estado": estado, "total": total}
    except HTTPException:
        raise
    except Exception:
        logging.exception("Error al quitar la bola")
        raise HTTPException(status_code=500, detail="No se pudo quitar la bola. Inténtalo de nuevo.")


@app.post("/api/admin/pedidos/{pedido_id}/bolas")
def anadir_bola_admin(pedido_id: str, datos: NuevaBola, authorization: Optional[str] = Header(None)):
    """El admin añade una bola a un pedido, este pagado o no. El total y la hoja se actualizan.
    Si el pedido estaba Completado vuelve a Pendiente, porque la bola nueva hay que imprimirla."""
    try:
        cliente = _exigir_admin(authorization)
        _comprobar_editable(cliente, pedido_id)
        prod = cliente.table("productos").select("id, nombre, precio, colores, personalizable, modelos(nombre)").eq("id", datos.producto_id).execute().data
        if not prod:
            raise HTTPException(status_code=400, detail="Ese producto no existe.")
        prod = prod[0]
        if datos.modelo not in [_figura_modelo(prod.get("nombre"), m.get("nombre")) for m in (prod.get("modelos") or [])]:
            raise HTTPException(status_code=400, detail="Ese modelo no es de ese producto.")
        if prod.get("colores") and datos.color not in prod["colores"]:
            raise HTTPException(status_code=400, detail="Ese color no es de ese producto.")
        nombre = re.sub(r"\s+", " ", (datos.personalizacion or "").strip())
        error = _error_nombre_bola(nombre, bool(prod.get("personalizable")))
        if error:
            raise HTTPException(status_code=400, detail=error)
        escritor = _cliente_servicio(cliente)
        _escribir(escritor.table("detalles_pedido").insert({
            "pedido_id": pedido_id, "producto_id": prod["id"], "modelo": datos.modelo, "color": datos.color,
            "personalizacion": nombre or "Sin texto", "precio_unitario": float(prod.get("precio") or 0), "cantidad": datos.cantidad,
        }), "No se pudo añadir la bola. Inténtalo de nuevo.")
        todas = escritor.table("detalles_pedido").select("precio_unitario, cantidad").eq("pedido_id", pedido_id).execute().data or []
        total = round(sum(float(d.get("precio_unitario") or 0) * (d.get("cantidad") or 1) for d in todas), 2)
        escritor.table("pedidos").update({"total": total}).eq("id", pedido_id).execute()
        estado = _tras_cambiar_bolas(escritor, pedido_id, True)
        _refrescar_hoja(escritor, pedido_id, estado)
        return {"mensaje": "Bola añadida", "total": total, "estado": estado}
    except HTTPException:
        raise
    except Exception:
        logging.exception("Error al añadir la bola")
        raise HTTPException(status_code=500, detail="No se pudo añadir la bola. Inténtalo de nuevo.")


@app.patch("/api/admin/usuarios/{usuario_id}")
def actualizar_rol_usuario(usuario_id: str, payload: dict, authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="No autorizado")
    
    token = authorization.replace("Bearer ", "")
    es_admin = payload.get("administrador")
    
    if es_admin is None:
        raise HTTPException(status_code=400, detail="Faltan datos (se esperaba 'administrador')")
        
    try:
        cliente_admin = create_client(
            SUPABASE_URL, 
            SUPABASE_KEY, 
            options=ClientOptions(headers={"Authorization": f"Bearer {token}"})
        )
        res = cliente_admin.table("usuarios").update({"administrador": es_admin}).eq("id", usuario_id).execute()
        if len(res.data) == 0:
            raise HTTPException(status_code=403, detail="Bloqueado por seguridad: No tienes permisos")

        return {"mensaje": "Privilegios actualizados correctamente"}

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Ha ocurrido un error en el servidor. Inténtalo de nuevo.")
    
@app.patch("/api/pedidos/{pedido_id}/anular")
def anular_mi_pedido(pedido_id: str, authorization: Optional[str] = Header(None)):
    """El alumno anula su propio pedido, solo si sigue Pendiente."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Falta el token de sesión")
    token = authorization.replace("Bearer ", "")
    try:
        cliente = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(headers={"Authorization": f"Bearer {token}"}))
        user_id = cliente.auth.get_user(token).user.id
        res = cliente.table("pedidos").select("estado, user_id, pagado").eq("id", pedido_id).execute()
        if not res.data or res.data[0].get("user_id") != user_id:
            raise HTTPException(status_code=404, detail="Pedido no encontrado")
        estado = res.data[0].get("estado")
        if res.data[0].get("pagado") and estado != "Cancelado":
            raise HTTPException(status_code=409, detail="Este pedido ya está pagado y no se puede anular.")
        if estado != "Pendiente":
            raise HTTPException(status_code=409, detail=_MENSAJE_NO_ANULAR.get(estado, "Este pedido ya no se puede anular."))
        hecho = cliente.rpc("anular_pedido", {"p_id": pedido_id}).execute()
        if not hecho.data:
            raise HTTPException(status_code=409, detail="Este pedido ya no se puede anular.")
        return {"mensaje": "Pedido anulado", "estado": "Cancelado"}
    except HTTPException:
        raise
    except Exception:
        logging.exception("Error al anular el pedido")
        raise HTTPException(status_code=500, detail="No se pudo anular el pedido. Inténtalo de nuevo.")


@app.patch("/api/pedidos/{pedido_id}/detalles/{detalle_id}/quitar")
def quitar_bola_de_mi_pedido(pedido_id: str, detalle_id: str, authorization: Optional[str] = Header(None)):
    """El alumno quita una unidad de una linea de su pedido, solo si sigue Pendiente. Si era la ultima, se anula el pedido."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Falta el token de sesión")
    token = authorization.replace("Bearer ", "")
    try:
        cliente = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(headers={"Authorization": f"Bearer {token}"}))
        user_id = cliente.auth.get_user(token).user.id
        res = cliente.table("pedidos").select("estado, user_id, pagado").eq("id", pedido_id).execute()
        if not res.data or res.data[0].get("user_id") != user_id:
            raise HTTPException(status_code=404, detail="Pedido no encontrado")
        estado = res.data[0].get("estado")
        if res.data[0].get("pagado") and estado != "Cancelado":
            raise HTTPException(status_code=409, detail="Este pedido ya está pagado y no se puede cambiar.")
        if estado != "Pendiente":
            raise HTTPException(status_code=409, detail=_MENSAJE_NO_ANULAR.get(estado, "Este pedido ya no se puede cambiar.").replace("anular", "cambiar"))
        hecho = cliente.rpc("quitar_bola_pedido", {"p_pedido": pedido_id, "p_detalle": detalle_id}).execute()
        if hecho.data not in ("ok", "cancelado"):
            raise HTTPException(status_code=409, detail="No se pudo quitar esa bola.")
        nuevo = cliente.table("pedidos").select("estado, total").eq("id", pedido_id).execute().data or [{}]
        return {"mensaje": "Bola quitada", "estado": nuevo[0].get("estado"), "total": nuevo[0].get("total")}
    except HTTPException:
        raise
    except Exception:
        logging.exception("Error al quitar la bola")
        raise HTTPException(status_code=500, detail="No se pudo quitar la bola. Inténtalo de nuevo.")

@app.get("/api/pedidos/usuario")
def obtener_mis_pedidos(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Falta el token de sesión")
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        cliente_seguro = create_client(
            SUPABASE_URL, 
            SUPABASE_KEY, 
            options=ClientOptions(headers={"Authorization": f"Bearer {token}"})
        )
        respuesta = cliente_seguro.table("pedidos")\
            .select("*, usuarios!user_id(nombre, curso, email), detalles_pedido(id)")\
            .eq("user_id", user_id)\
            .order('created_at', desc=True)\
            .execute()
            
        return respuesta.data
    except Exception as e:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Error al obtener tus pedidos")

class MensajeAdminUpdate(BaseModel):
    mensaje: str


@app.get("/api/mensajes")
def obtener_mensaje_admin():
    try:
        res = supabase.table("mensajes_admin").select("*").eq("id", 1).single().execute()
        return res.data
    except Exception as e:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Ha ocurrido un error en el servidor. Inténtalo de nuevo.")

@app.patch("/api/admin/mensajes")
def actualizar_mensaje_admin(datos: MensajeAdminUpdate, authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="No autorizado")
    token = authorization.replace("Bearer ", "")
    try:
        cliente_seguro = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(headers={"Authorization": f"Bearer {token}"}))
        res = cliente_seguro.table("mensajes_admin").update({"mensaje": datos.mensaje}).eq("id", 1).execute()
        return res.data[0]
    except Exception as e:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Ha ocurrido un error en el servidor. Inténtalo de nuevo.")

@app.get("/api/tema")
def obtener_tema():
    """Publico: tema de la web activo. Si la tabla aun no existe, se queda en navidad."""
    try:
        res = supabase.table("configuracion").select("clave, valor").in_("clave", ["tema", "ofertas"]).execute()
        ajustes = {f["clave"]: f["valor"] for f in (res.data or [])}
        valor = ajustes.get("tema", "navidad")
        return {"tema": valor if valor in TEMAS_WEB else "navidad", "ofertas": ajustes.get("ofertas", "si") != "no"}
    except Exception:
        return {"tema": "navidad", "ofertas": True}


class RecuperarClave(BaseModel):
    email: str
    redirect_to: Optional[str] = None


@app.post("/api/auth/recuperar")
def recuperar_clave(datos: RecuperarClave):
    """Pide el correo de recuperar contrasena. Antes guarda el tema activo en la cuenta
    para que el correo salga con el estilo del tema (navidad, san valentin o normal)."""
    correo = datos.email.strip().lower()
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", correo):
        raise HTTPException(status_code=400, detail="Introduce un correo electrónico válido")
    clave = os.getenv("SUPABASE_SERVICE_KEY")
    if clave:
        try:
            tema = obtener_tema().get("tema", "navidad")
            admin = create_client(SUPABASE_URL, clave)
            u = admin.table("usuarios").select("id").ilike("email", correo).execute().data
            if u:
                admin.auth.admin.update_user_by_id(u[0]["id"], {"user_metadata": {"tema": tema}})
        except Exception:
            logging.exception("No se pudo guardar el tema para el correo")
    try:
        opciones = {"redirect_to": datos.redirect_to} if datos.redirect_to else {}
        supabase.auth.reset_password_for_email(correo, opciones)
    except Exception as e:
        logging.exception("No se pudo enviar el correo de recuperacion")
        raise HTTPException(status_code=400, detail=str(e))
    return {"mensaje": "Si ese correo tiene cuenta, te hemos enviado un enlace"}



# ---------- Avisos emergentes ----------
# Un administrador publica un aviso y a cada persona le sale una sola vez al entrar (la web recuerda cual vio).
# Solo hay uno activo a la vez. Hace falta la tabla avisos (ver documentacion/avisos.sql).
def _cliente_avisos():
    clave = os.getenv("SUPABASE_SERVICE_KEY")
    return create_client(SUPABASE_URL, clave) if clave else supabase


@app.get("/api/avisos/activo")
def aviso_activo():
    """Publico: el aviso activo, o null. Si la tabla aun no existe, no hay aviso."""
    try:
        r = _cliente_avisos().table("avisos").select("id, titulo, texto, creado").eq("activo", True).order("creado", desc=True).limit(1).execute().data
        return {"aviso": r[0] if r else None}
    except Exception:
        return {"aviso": None}


@app.get("/api/admin/avisos")
def listar_avisos():
    try:
        return _cliente_avisos().table("avisos").select("id, titulo, texto, activo, creado").order("creado", desc=True).limit(30).execute().data or []
    except Exception:
        logging.exception("No se pudieron leer los avisos")
        raise HTTPException(status_code=500, detail="No se pudieron leer los avisos. Comprueba que existe la tabla avisos.")


def _desactivar_otros(cliente, excepto: Optional[str] = None):
    q = cliente.table("avisos").update({"activo": False}).eq("activo", True)
    if excepto:
        q = q.neq("id", excepto)
    q.execute()


@app.post("/api/admin/avisos")
def crear_aviso(datos: AvisoNuevo):
    """Crea un aviso y lo deja activo (desactiva el anterior)."""
    try:
        c = _cliente_avisos()
        _desactivar_otros(c)
        r = c.table("avisos").insert({"titulo": datos.titulo.strip(), "texto": datos.texto.strip(), "activo": True}).execute().data
        return r[0]
    except HTTPException:
        raise
    except Exception:
        logging.exception("No se pudo crear el aviso")
        raise HTTPException(status_code=500, detail="No se pudo guardar el aviso. Comprueba que existe la tabla avisos.")


@app.patch("/api/admin/avisos/{aviso_id}")
def activar_aviso(aviso_id: str, datos: AvisoActivo):
    """Activa un aviso (desactiva el resto) o lo desactiva. Al reactivar uno viejo, sale otra vez a todos."""
    try:
        c = _cliente_avisos()
        if datos.activo:
            _desactivar_otros(c, aviso_id)
        r = c.table("avisos").update({"activo": datos.activo}).eq("id", aviso_id).execute().data
        if not r:
            raise HTTPException(status_code=404, detail="Aviso no encontrado")
        return r[0]
    except HTTPException:
        raise
    except Exception:
        logging.exception("No se pudo cambiar el aviso")
        raise HTTPException(status_code=500, detail="No se pudo cambiar el aviso")


@app.delete("/api/admin/avisos/{aviso_id}")
def borrar_aviso(aviso_id: str):
    try:
        _cliente_avisos().table("avisos").delete().eq("id", aviso_id).execute()
        return {"mensaje": "Aviso borrado"}
    except Exception:
        logging.exception("No se pudo borrar el aviso")
        raise HTTPException(status_code=500, detail="No se pudo borrar el aviso")


@app.patch("/api/admin/ofertas")
def cambiar_ofertas(datos: OfertasWeb, authorization: Optional[str] = Header(None)):
    """Solo administradores: activa o quita las ofertas de toda la tienda."""
    try:
        cliente = _exigir_admin(authorization)
        cliente.table("configuracion").upsert({"clave": "ofertas", "valor": "si" if datos.activas else "no"}).execute()
        return {"ofertas": datos.activas}
    except HTTPException:
        raise
    except Exception:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="No se pudo guardar. Comprueba que existe la tabla configuracion.")


@app.patch("/api/admin/tema")
def cambiar_tema(datos: TemaWeb, authorization: Optional[str] = Header(None)):
    """Solo administradores: cambia el tema de la web para todos."""
    if datos.tema not in TEMAS_WEB:
        raise HTTPException(status_code=400, detail="Tema no valido")
    try:
        cliente = _exigir_admin(authorization)
        cliente.table("configuracion").upsert({"clave": "tema", "valor": datos.tema}).execute()
        return {"tema": datos.tema}
    except HTTPException:
        raise
    except Exception:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="No se pudo guardar el tema. Comprueba que existe la tabla configuracion.")


# ---------------------------------------------------------------
# Incidencias de registro: quien no puede registrarse avisa y un admin
# puede permitir ese correo. Hace falta la tabla incidencias_registro
# (ver documentacion/incidencias_registro.sql).
# ---------------------------------------------------------------
_NOMBRE_FIGURA = {"Gingerbread.3mf": "Galleta de jengibre", "ChristmasTree.3mf": "Árbol", "Bear.3mf": "Oso",
                  "Star.3mf": "Estrella", "Reindeer.3mf": "Reno", "Stocking.3mf": "Calcetín"}
_ORDEN_MODELOS = ["Galleta de jengibre", "Reno", "Oso", "Estrella", "Árbol", "Calcetín"]


def _modelo_resumen(modelo):
    """Nombre del modelo del detalle -> una de las columnas del resumen."""
    return _NOMBRE_FIGURA.get(figura_para(modelo or ""), "Otros")


def _codigo_pedido(u: dict, numero: int) -> str:
    """Codigo visible de un pedido: correo-curso-NN, igual que en el panel."""
    import unicodedata
    correo = str(u.get("email") or "").split("@")[0].strip().lower()
    curso = re.sub(r"[^a-z0-9]", "", unicodedata.normalize("NFD", str(u.get("curso") or "")).encode("ascii", "ignore").decode().lower())
    return "-".join([x for x in [correo, curso, str(numero).zfill(2)] if x]) if correo else f"pedido-{numero:02d}"


def _agregar_resumen(usuarios, pagados=None):
    """Una fila por pedido: curso, nombre, correo, codigo del pedido, bolas, total, pagado
    y, por cada modelo, cuantas bolas pidio y en que estado esta cada una.
    Cada usuario trae sus pedidos con el total, el estado y las lineas con modelo y cantidad."""
    filas = []
    usados = set()
    for u in usuarios:
        todos = sorted((u.get("pedidos") or []), key=lambda p: str(p.get("created_at") or ""))
        for n, p in enumerate(todos, start=1):
            # Los pedidos cancelados no cuentan en el resumen
            if (p.get("estado") or "") == "Cancelado":
                continue
            codigo = _codigo_pedido(u, n)
            bolas = sum(int(d.get("cantidad") or 1) for d in (p.get("detalles_pedido") or []))
            total = round(float(p.get("total") or 0), 2)
            pagado = bool(p.get("pagado")) if pagados is None else p.get("id") in pagados
            modelos = {}
            est = p.get("estado") or "Pendiente"
            for d in (p.get("detalles_pedido") or []):
                m = _modelo_resumen(d.get("modelo"))
                usados.add(m)
                cant = int(d.get("cantidad") or 1)
                celda = modelos.setdefault(m, {"cantidad": 0, "estados": {}})
                celda["cantidad"] += cant
                celda["estados"][est] = celda["estados"].get(est, 0) + cant
            filas.append({"id": str(p.get("id")), "usuario_id": u.get("id"), "nombre": u.get("nombre") or "", "email": u.get("email") or "",
                          "curso": u.get("curso") or "", "profesor": bool(u.get("profesor")), "num_pedidos": 1, "ids_pedidos": [codigo],
                          "estado": est, "bolas": bolas, "total": total, "pagado": pagado, "cobrado": total if pagado else 0.0, "modelos": modelos})
    filas.sort(key=lambda f: (f["nombre"].lower(), f["ids_pedidos"][0]))
    columnas = [m for m in _ORDEN_MODELOS if m in usados] + (["Otros"] if "Otros" in usados else [])
    return {
        "filas": filas,
        "modelos": columnas,
        "totales": {"personas": len({f["email"] or f["nombre"] for f in filas}), "pedidos": len(filas),
                    "bolas": sum(f["bolas"] for f in filas),
                    "total": round(sum(f["cobrado"] for f in filas), 2),
                    "pendiente": round(sum(f["total"] - f["cobrado"] for f in filas), 2)},
    }


def _exigir_admin(authorization: Optional[str]):
    """Devuelve un cliente con el token del usuario si es administrador."""
    if not authorization:
        raise HTTPException(status_code=401, detail="No autorizado")
    token = authorization.replace("Bearer ", "")
    cliente = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(headers={"Authorization": f"Bearer {token}"}))
    user_id = cliente.auth.get_user(token).user.id
    perfil = cliente.table("usuarios").select("administrador").eq("id", user_id).single().execute()
    if not perfil.data or not perfil.data.get("administrador"):
        raise HTTPException(status_code=403, detail="Solo administradores")
    return cliente


_COSTES_FIGURA = {"reno": 0.18, "estrella": 0.16, "arbol": 0.14, "galleta": 0.16, "oso": 0.19, "calcet": 0.19}


def _coste_figura(figura: str, estado: str) -> float:
    """Coste de hacer una figura. Solo cuenta si el pedido esta Completado o Entregado."""
    if estado not in _ESTADOS_PARA_HOJA:
        return 0.0
    import unicodedata
    n = unicodedata.normalize("NFD", (figura or "").lower()).encode("ascii", "ignore").decode()
    for clave, valor in _COSTES_FIGURA.items():
        if clave in n:
            return valor
    return 0.0


@app.get("/api/admin/hoja")
def hoja_de_gastos(authorization: Optional[str] = Header(None)):
    """Lo mismo que el Excel: una fila por figura con coste, beneficio, estado y pagado, mas los totales."""
    try:
        cliente = _exigir_admin(authorization)
        from zoneinfo import ZoneInfo
        from datetime import datetime as _dt
        pedidos = cliente.table("pedidos")\
            .select("id, user_id, estado, pagado, created_at, usuarios!user_id(nombre, curso, email), detalles_pedido(modelo, precio_unitario, cantidad)")\
            .order("created_at").execute().data or []
        import re as _re, unicodedata as _ud
        contador_usuario: dict = {}
        letras: dict = {}
        filas = []
        for n, ped in enumerate(pedidos, start=1):
            clave = ped.get("user_id") or ped.get("id")
            contador_usuario[clave] = contador_usuario.get(clave, 0) + 1
            u = ped.get("usuarios") or {}
            correo = str(u.get("email") or "").split("@")[0].strip().lower()
            curso = _re.sub(r"[^a-z0-9]", "", _ud.normalize("NFD", str(u.get("curso") or "")).encode("ascii", "ignore").decode().lower())
            etiqueta = "-".join([x for x in [correo, curso, str(contador_usuario[clave]).zfill(2)] if x]) if correo else "#" + str(ped["id"])[:8].upper()
            f = _dt.fromisoformat(str(ped.get("created_at")).replace("Z", "+00:00")) if ped.get("created_at") else None
            fecha = f.astimezone(ZoneInfo("Europe/Madrid")).strftime("%d/%m/%Y %H:%M") if f else ""
            estado = ped.get("estado") or ""
            pagado = bool(ped.get("pagado"))
            for d in ped.get("detalles_pedido") or []:
                for _ in range(int(d.get("cantidad") or 1)):
                    figura = _figura_corta(d.get("modelo"))
                    letra = figura[:1].upper()
                    letras[letra] = letras.get(letra, 0) + 1
                    precio = float(d.get("precio_unitario") or 0)
                    coste = _coste_figura(figura, estado)
                    filas.append({"id_figura": f"{letra}{letras[letra]:03d}", "id_pedido": f"P{n:03d}", "cliente": u.get("nombre") or "",
                                  "fecha": fecha, "figura": figura, "precio": precio, "coste": coste,
                                  "beneficio": round((precio - coste) if pagado else -coste, 2),
                                  "pedido_web": etiqueta, "estado": estado, "pagado": pagado, "user_id": ped.get("user_id"), "pedido_id": str(ped["id"])})
        validas = [x for x in filas if x["estado"] != "Cancelado"]
        totales = {"figuras": len(filas),
                   "precio": round(sum(x["precio"] for x in validas), 2),
                   "coste": round(sum(x["coste"] for x in filas), 2),
                   "beneficio": round(sum(x["beneficio"] for x in filas), 2),
                   "cobrado": round(sum(x["precio"] for x in filas if x["pagado"]), 2),
                   "por_cobrar": round(sum(x["precio"] for x in validas if not x["pagado"]), 2)}
        return {"filas": filas, "totales": totales}
    except HTTPException:
        raise
    except Exception:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Ha ocurrido un error en el servidor. Inténtalo de nuevo.")


@app.get("/api/admin/resumen")
def resumen_admin(authorization: Optional[str] = Header(None)):
    """Tabla resumen para el admin: que persona ha pedido cuantas bolas y cuanto ha gastado."""
    try:
        cliente = _exigir_admin(authorization)
        usuarios = cliente.table("usuarios").select("id, nombre, email, curso, profesor, pedidos(id, total, estado, pagado, created_at, detalles_pedido(cantidad, modelo))").execute().data
        return _agregar_resumen(usuarios or [])
    except HTTPException:
        raise
    except Exception:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Ha ocurrido un error en el servidor. Inténtalo de nuevo.")


@app.patch("/api/admin/pedidos/{pedido_id}/pagado")
def marcar_pedido_pagado(pedido_id: str, datos: PagadoUsuario, authorization: Optional[str] = Header(None)):
    """El admin marca si un pedido concreto esta pagado. Tambien se marca en el Excel."""
    try:
        cliente = _exigir_admin(authorization)
        existe = cliente.table("pedidos").select("id").eq("id", pedido_id).execute().data
        if not existe:
            raise HTTPException(status_code=404, detail="Pedido no encontrado")
        _escribir(_cliente_servicio(cliente).table("pedidos").update({"pagado": datos.pagado}).eq("id", pedido_id), "No se pudo guardar el pago")
        _llamar_hoja({"accion": "pagado", "pedido_refs": [str(pedido_id)], "pagado": bool(datos.pagado)})
        return {"mensaje": "Pago actualizado", "pagado": datos.pagado}
    except HTTPException:
        raise
    except Exception:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Ha ocurrido un error en el servidor. Inténtalo de nuevo.")


@app.patch("/api/admin/resumen/{usuario_id}/pagado")
def marcar_pagado(usuario_id: str, datos: PagadoUsuario, authorization: Optional[str] = Header(None)):
    """El admin marca si una persona ya ha pagado. Se marcan todos sus pedidos que no estan cancelados."""
    try:
        cliente = _exigir_admin(authorization)
        _escribir(_cliente_servicio(cliente).table("pedidos").update({"pagado": datos.pagado}).eq("user_id", usuario_id).neq("estado", "Cancelado"), "No se pudo guardar el pago")
        _pagado_en_hoja(cliente, usuario_id, datos.pagado)
        return {"mensaje": "Pago actualizado", "pagado": datos.pagado}
    except HTTPException:
        raise
    except Exception:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Ha ocurrido un error en el servidor. Inténtalo de nuevo.")

@app.post("/api/registro/incidencia")
def crear_incidencia_registro(datos: IncidenciaRegistro, request: Request):
    """Publico: lo usa quien no consigue registrarse."""
    _limitar(request, "incidencia", 5, 3600)
    campos = {k: v.strip() for k, v in datos.dict().items()}
    if not all(campos.values()):
        raise HTTPException(status_code=400, detail="Rellena todos los campos")
    if any(len(v) > 120 for k, v in campos.items() if k != "motivo"):
        raise HTTPException(status_code=400, detail="Algun campo es demasiado largo")
    if len(campos["motivo"]) > 300:
        raise HTTPException(status_code=400, detail="El motivo puede tener como maximo 300 letras")
    if "@" not in campos["correo"]:
        raise HTTPException(status_code=400, detail="Correo no valido")
    try:
        cliente = create_client(SUPABASE_URL, SUPABASE_KEY)
        existe = cliente.rpc("incidencia_pendiente", {"p_correo": campos["correo"]}).execute()
        if existe.data:
            return {"mensaje": "Ya tenias una incidencia abierta con ese correo"}
        # Sin devolver la fila: quien no tiene cuenta puede crearla pero no leerla
        cliente.table("incidencias_registro").insert(campos, returning="minimal").execute()
        return {"mensaje": "Incidencia enviada"}
    except Exception:
        logging.exception("Error al crear la incidencia")
        raise HTTPException(status_code=500, detail="No se pudo enviar la incidencia")


@app.get("/api/registro/permitido")
def correo_permitido(correo: str, request: Request):
    """Publico: dice si un admin ha permitido saltar la regla del correo para esta direccion."""
    _limitar(request, "permitido", 60, 600)
    if len(correo) > 200:
        return {"permitido": False}
    try:
        cliente = create_client(SUPABASE_URL, SUPABASE_KEY)
        r = cliente.rpc("correo_permitido", {"p_correo": correo}).execute()
        return {"permitido": bool(r.data)}
    except Exception:
        return {"permitido": False}


@app.get("/api/admin/incidencias")
def listar_incidencias(authorization: Optional[str] = Header(None)):
    try:
        cliente = _exigir_admin(authorization)
        return cliente.table("incidencias_registro").select("*").order("created_at", desc=True).execute().data
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="No se pudieron cargar las incidencias")


@app.patch("/api/admin/incidencias/{incidencia_id}")
def cambiar_estado_incidencia(incidencia_id: str, datos: EstadoIncidencia, authorization: Optional[str] = Header(None)):
    if datos.estado not in ("Pendiente", "Aprobada", "Rechazada"):
        raise HTTPException(status_code=400, detail="Estado no valido")
    try:
        cliente = _exigir_admin(authorization)
        r = cliente.table("incidencias_registro").update({"estado": datos.estado}).eq("id", incidencia_id).execute()
        if not r.data:
            raise HTTPException(status_code=404, detail="La incidencia no existe")
        return r.data[0]
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="No se pudo actualizar la incidencia")


# Sirve la versión web exportada por Expo (solo en el despliegue con Docker/Railway).
# Debe declararse al final para que las rutas /api tengan prioridad.
WEB_DIR = os.getenv("WEB_DIR", os.path.join(os.path.dirname(__file__), "..", "customLayer", "dist"))

if os.path.isdir(WEB_DIR):
    WEB_DIR = os.path.realpath(WEB_DIR)

    @app.get("/{ruta:path}", include_in_schema=False)
    def servir_web(ruta: str):
        if ruta.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
        archivo = os.path.realpath(os.path.join(WEB_DIR, ruta))
        if archivo.startswith(WEB_DIR + os.sep) and os.path.isfile(archivo):
            return FileResponse(archivo)
        return FileResponse(os.path.join(WEB_DIR, "index.html"))
else:
    # Sin web exportada (desarrollo local solo con la API) la raiz da el saludo de la API.
    @app.get("/", include_in_schema=False)
    def raiz_api():
        return {"message": "¡Bienvenido a la API de Custom Layers!"}
