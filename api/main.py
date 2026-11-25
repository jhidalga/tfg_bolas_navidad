import os
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

class CheckoutPedido(BaseModel):
    total: float
    nota: str = Field("", max_length=200)

TEMAS_WEB = ("normal", "navidad", "sanvalentin")
CAMPOS_OFERTA = ("en_oferta", "precio_anterior")

class TemaWeb(BaseModel):
    tema: str

class OfertasWeb(BaseModel):
    activas: bool

class EstadoPedido(BaseModel):
    estado: str

ESTADOS_PEDIDO = ("Pendiente", "Completado", "Entregado", "Cancelado")

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


def _cola_impresion(pedidos: list):
    """Agrupa por color las bolas con nombre de los pedidos dados. Sirve para imprimir varias a la vez."""
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
            k = clave(d.get("color"))
            g = grupos.setdefault(k, {"color": d.get("color") or "Sin color", "bolas": 0, "lineas": []})
            cant = d.get("cantidad") or 1
            g["bolas"] += cant
            u = p.get("usuarios") or {}
            g["lineas"].append({"id": d.get("id"), "color": d.get("color") or "Sin color", "pedido_id": p["id"], "pedido": str(p["id"])[:8].upper(),
                                "modelo": d.get("modelo"), "personalizacion": nombre, "cantidad": cant,
                                "estado": p.get("estado"), "cliente": u.get("nombre"), "curso": u.get("curso"),
                                "creado": p.get("created_at") or ""})
    for g in grupos.values():
        g["packs"] = _packs_de_grupo(g["lineas"])
    return sorted(grupos.values(), key=lambda g: g["color"].lower())


TAM_PACK = 5


def _packs_de_grupo(lineas: list):
    """Reparte las bolas de un color en packs de 5 (la ultima lleva las que sobran). Dos ordenes: antiguos y persona."""
    unidades = []
    for l in lineas:
        for _ in range(l.get("cantidad") or 1):
            unidades.append({"cliente": l.get("cliente"), "curso": l.get("curso"), "pedido": l["pedido"], "pedido_id": l["pedido_id"],
                             "modelo": l["modelo"], "personalizacion": l["personalizacion"], "creado": l.get("creado") or ""})
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
    Con color y pack devuelve el zip de ese pack de 5."""
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
        "Estrella": "Star", "Arbol de Navidad": "ChristmasTree",
    }

    def _productos_prueba(base: str):
        def mod(i, nombre):
            return {"id": f"m{i}-{_MODELOS[nombre]}", "nombre": nombre, "imagen": f"{base}api/prueba/img/{_MODELOS[nombre]}.png"}
        def prod(pid, nombre, desc, modelos, colores):
            return {"id": pid, "nombre": nombre, "descripcion": desc, "precio": 1.0, "precio_personalizacion": 0.0,
                    "deshabilitado": False, "oculto": False, "personalizable": True, "colores": colores,
                    "modelos": [mod(i, n) for i, n in enumerate(modelos)]}
        return [
            prod("p1", "Bolas de Navidad (Color marr\u00f3n)", "Bola de navidad con distintos modelos y nombre personalizado",
                 ["Galleta de Jengibre", "Oso de navidad", "Reno de Navidad"], ["Marr\u00f3n"]),
            prod("p2", "Bola de Navidad Estrella", "Bola de navidad con forma de estrella y nombre personalizado", ["Estrella"], ["Dorado"]),
            prod("p3", "Bola de Navidad \u00c1rbol", "Bola de navidad con forma de \u00e1rbol y nombre personalizado", ["Arbol de Navidad"], ["Verde"]),
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
                {"id": "11111111-aaaa", "total": 3.0, "estado": "Pendiente", "created_at": "2026-11-17T09:30:00",
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
        return {"mensaje": "Pedido procesado correctamente", "pedido_id": pedido["id"]}

    @app.get("/api/admin/impresion")
    def cola_prueba(request: Request, estado: str = "Pendiente"):
        return _cola_impresion([p for p in _pedidos(str(request.base_url)) if p["estado"] == estado])

    @app.get("/api/admin/impresion/3mf")
    def cola_3mf_prueba(request: Request, color: Optional[str] = None, cliente: Optional[str] = None, pack: Optional[int] = None, orden: str = "antiguos", formato: str = "3mf", estado: str = "Pendiente"):
        if color is None and cliente is None:
            raise HTTPException(status_code=400, detail="Indica color o cliente")
        return _respuesta_cola(_cola_impresion([p for p in _pedidos(str(request.base_url)) if p["estado"] == estado]), color, cliente, pack, orden, formato)

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

    def _editable_prueba(request: Request, pedido_id: str):
        for p in _pedidos(str(request.base_url)):
            if p["id"] == pedido_id:
                if p.get("pagado") and p["estado"] != "Cancelado":
                    raise HTTPException(status_code=409, detail="Este pedido ya está pagado y no se puede cambiar.")
                if p["estado"] != "Pendiente":
                    raise HTTPException(status_code=409, detail="Solo se pueden cambiar pedidos Pendientes.")
                return p
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    @app.patch("/api/admin/pedidos/{pedido_id}/anular")
    def anular_admin_prueba(pedido_id: str, request: Request):
        _editable_prueba(request, pedido_id)["estado"] = "Cancelado"
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
            if modelo not in [m["nombre"] for m in prod["modelos"]]:
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
        d.update(cambios)
        p["total"] = sum(x["precio_unitario"] * (x.get("cantidad") or 1) for x in p["detalles_pedido"])
        return {"mensaje": "Bola cambiada", "total": p["total"]}

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
        return {"mensaje": "Bola quitada", "estado": "Pendiente", "total": p["total"]}

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

def _pedidos_para_cola(authorization: Optional[str], estado: str):
    if not authorization:
        raise HTTPException(status_code=401, detail="No autorizado")
    token = authorization.replace("Bearer ", "")
    cliente = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(headers={"Authorization": f"Bearer {token}"}))
    user_id = cliente.auth.get_user(token).user.id
    perfil = cliente.table("usuarios").select("administrador").eq("id", user_id).single().execute()
    if not perfil.data or not perfil.data.get("administrador"):
        raise HTTPException(status_code=403, detail="Solo administradores")
    return cliente.table("pedidos").select("id, estado, created_at, usuarios!user_id(nombre, curso), detalles_pedido(id, modelo, color, personalizacion, cantidad)") \
        .eq("estado", estado).execute().data


@app.get("/api/admin/impresion")
def cola_impresion(estado: str = "Pendiente", authorization: Optional[str] = Header(None)):
    """Bolas con nombre de los pedidos en ese estado, agrupadas por color."""
    try:
        return _cola_impresion(_pedidos_para_cola(authorization, estado))
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("Error interno")
        raise HTTPException(status_code=500, detail="Ha ocurrido un error en el servidor. Inténtalo de nuevo.")


@app.get("/api/admin/impresion/3mf")
def cola_impresion_3mf(color: Optional[str] = None, cliente: Optional[str] = None, pack: Optional[int] = None, orden: str = "antiguos", formato: str = "3mf", estado: str = "Pendiente", authorization: Optional[str] = Header(None)):
    """Zip con los 3MF de las bolas de un color (para imprimirlas juntas) o de una persona."""
    if color is None and cliente is None:
        raise HTTPException(status_code=400, detail="Indica color o cliente")
    try:
        return _respuesta_cola(_cola_impresion(_pedidos_para_cola(authorization, estado)), color, cliente, pack, orden, formato)
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


def _perfil_usuario(cliente, usuario_id: str):
    """Datos de una persona y todos sus pedidos con el codigo visible, el estado, si estan pagados y sus lineas."""
    u = cliente.table("usuarios").select("id, nombre, email, curso, profesor, administrador").eq("id", usuario_id).execute().data
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    u = u[0]
    peds = cliente.table("pedidos").select("id, estado, total, pagado, nota, created_at, detalles_pedido(id, modelo, color, personalizacion, cantidad, precio_unitario)") \
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
        _comprobar_editable(cliente, pedido_id)
        cliente.table("pedidos").update({"estado": "Cancelado"}).eq("id", pedido_id).execute()
        return {"mensaje": "Pedido anulado", "estado": "Cancelado"}
    except HTTPException:
        raise
    except Exception:
        logging.exception("Error al anular el pedido")
        raise HTTPException(status_code=500, detail="No se pudo anular el pedido. Inténtalo de nuevo.")


@app.patch("/api/admin/pedidos/{pedido_id}/detalles/{detalle_id}")
def editar_bola_admin(pedido_id: str, detalle_id: str, datos: EdicionBola, authorization: Optional[str] = Header(None)):
    """El admin cambia el modelo, el color, el nombre o la cantidad de una linea de un pedido Pendiente sin pagar."""
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
            prod = cliente.table("productos").select("id, precio, colores, oculto, deshabilitado, modelos(nombre)").eq("id", producto_id).execute().data
            if not prod:
                raise HTTPException(status_code=400, detail="Ese producto no existe.")
            prod = prod[0]
            modelo = datos.modelo or det.get("modelo")
            color = datos.color or det.get("color")
            if modelo not in [m.get("nombre") for m in (prod.get("modelos") or [])]:
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
        cliente.table("detalles_pedido").update(cambios).eq("id", detalle_id).eq("pedido_id", pedido_id).execute()
        todas = cliente.table("detalles_pedido").select("precio_unitario, cantidad").eq("pedido_id", pedido_id).execute().data or []
        total = round(sum(float(d.get("precio_unitario") or 0) * (d.get("cantidad") or 1) for d in todas), 2)
        cliente.table("pedidos").update({"total": total}).eq("id", pedido_id).execute()
        return {"mensaje": "Bola cambiada", "total": total}
    except HTTPException:
        raise
    except Exception:
        logging.exception("Error al editar la bola")
        raise HTTPException(status_code=500, detail="No se pudo cambiar la bola. Inténtalo de nuevo.")


@app.patch("/api/admin/pedidos/{pedido_id}/detalles/{detalle_id}/quitar")
def quitar_bola_admin(pedido_id: str, detalle_id: str, authorization: Optional[str] = Header(None)):
    """El admin quita una unidad de una linea de un pedido Pendiente sin pagar. Si era la ultima del pedido, se anula."""
    try:
        cliente = _exigir_admin(authorization)
        _comprobar_editable(cliente, pedido_id)
        det = cliente.table("detalles_pedido").select("id, cantidad").eq("pedido_id", pedido_id).eq("id", detalle_id).execute().data
        if not det:
            raise HTTPException(status_code=404, detail="Esa bola no está en el pedido.")
        if (det[0].get("cantidad") or 1) > 1:
            cliente.table("detalles_pedido").update({"cantidad": (det[0].get("cantidad") or 1) - 1}).eq("id", detalle_id).execute()
        else:
            cliente.table("detalles_pedido").delete().eq("id", detalle_id).eq("pedido_id", pedido_id).execute()
        quedan = cliente.table("detalles_pedido").select("precio_unitario, cantidad").eq("pedido_id", pedido_id).execute().data or []
        if not quedan:
            cliente.table("pedidos").update({"estado": "Cancelado"}).eq("id", pedido_id).execute()
            return {"mensaje": "Pedido anulado", "estado": "Cancelado", "total": 0}
        total = round(sum(float(d.get("precio_unitario") or 0) * (d.get("cantidad") or 1) for d in quedan), 2)
        cliente.table("pedidos").update({"total": total}).eq("id", pedido_id).execute()
        return {"mensaje": "Bola quitada", "estado": "Pendiente", "total": total}
    except HTTPException:
        raise
    except Exception:
        logging.exception("Error al quitar la bola")
        raise HTTPException(status_code=500, detail="No se pudo quitar la bola. Inténtalo de nuevo.")


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
                  "Star.3mf": "Estrella", "Reindeer.3mf": "Reno"}
_ORDEN_MODELOS = ["Galleta de jengibre", "Reno", "Oso", "Estrella", "Árbol"]


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


_COSTES_FIGURA = {"reno": 0.18, "estrella": 0.16, "arbol": 0.14, "galleta": 0.16, "oso": 0.19}


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
        hecho = cliente.table("pedidos").update({"pagado": datos.pagado}).eq("id", pedido_id).execute().data
        if not hecho:
            raise HTTPException(status_code=404, detail="Pedido no encontrado")
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
        cliente.table("pedidos").update({"pagado": datos.pagado}).eq("user_id", usuario_id).neq("estado", "Cancelado").execute()
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
