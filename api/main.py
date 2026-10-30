import os
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Header
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from supabase import ClientOptions, create_client, Client
from dotenv import load_dotenv
from pydantic import BaseModel
import jwt

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
app = FastAPI()

class ItemCarrito(BaseModel):
    producto_id: str
    modelo_id: str
    modelo: str
    color: str
    personalizacion: str
    cantidad: int = 1

class CheckoutPedido(BaseModel):
    total: float

class EstadoPedido(BaseModel):
    estado: str

class ProductoAdminCrear(BaseModel):
    nombre: str
    descripcion: Optional[str] = ""
    precio: float
    precio_personalizacion: float = 0.0
    deshabilitado: bool = False
    oculto: bool = False
    personalizable: bool = False
    colores: List[str] = []

class ProductoAdminUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    precio: Optional[float] = None
    precio_personalizacion: Optional[float] = None
    deshabilitado: Optional[bool] = None
    oculto: Optional[bool] = None
    personalizable: Optional[bool] = None
    colores: Optional[List[str]] = None

class ModeloAdminData(BaseModel):
    nombre: str
    imagen: Optional[str] = ""

class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = None
    curso: Optional[str] = None

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        raise HTTPException(status_code=500, detail=f"Error al obtener productos: {str(e)}")
    
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
        
        if update_data:
            respuesta = cliente_seguro.table("usuarios").update(update_data).eq("id", user_id).execute()
            return {"mensaje": "Perfil actualizado correctamente", "data": respuesta.data[0]}
        return {"mensaje": "No se enviaron datos para actualizar"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar el perfil: {str(e)}")

@app.get("/api/carrito")
def obtener_carrito(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Falta el token de sesión")
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        cliente_seguro = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(headers={"Authorization": f"Bearer {token}"}))
        res = cliente_seguro.table("carrito")\
            .select("*, productos(nombre, precio, precio_personalizacion), modelos(nombre, imagen)")\
            .eq("user_id", user_id)\
            .execute()
            
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/carrito")
def agregar_al_carrito(item: ItemCarrito, authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Falta el token de sesión")
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        cliente_seguro = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(headers={"Authorization": f"Bearer {token}"}))
        datos_insertar = item.dict()
        datos_insertar["user_id"] = user_id
        respuesta = cliente_seguro.table("carrito").insert(datos_insertar).execute()
        return {"mensaje": "Añadido al carrito", "data": respuesta.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al añadir al carrito: {str(e)}")

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
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/pedidos/checkout")
def realizar_pedido(checkout: CheckoutPedido, authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Falta el token de sesión")
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        cliente_seguro = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(headers={"Authorization": f"Bearer {token}"}))
        
        carrito_res = cliente_seguro.table("carrito").select("*, productos(precio, precio_personalizacion)").eq("user_id", user_id).execute()
        items_carrito = carrito_res.data
        if not items_carrito:
            raise HTTPException(status_code=400, detail="El carrito está vacío")
            
        nuevo_pedido = {"user_id": user_id, "total": checkout.total, "estado": "Pendiente"}
        pedido_res = cliente_seguro.table("pedidos").insert(nuevo_pedido).execute()
        pedido_id = pedido_res.data[0]["id"]
        
        detalles = []
        for item in items_carrito:
            extra = float(item["productos"].get("precio_personalizacion") or 0.0) if item.get("personalizacion") and item.get("personalizacion") != "Sin texto" else 0.0
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
        return {"mensaje": "Pedido procesado correctamente", "pedido_id": pedido_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar el pedido: {str(e)}")

@app.get("/api/admin/pedidos")
def obtener_todos_los_pedidos(authorization: Optional[str] = Header(None)):
    token = authorization.replace("Bearer ", "") if authorization else ""
    try:
        cliente_seguro = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(headers={"Authorization": f"Bearer {token}"}))
        respuesta = cliente_seguro.table("pedidos")\
            .select("*, usuarios!user_id(nombre, curso), detalles_pedido(*, productos(nombre))")\
            .order('created_at', desc=True)\
            .execute()
        return respuesta.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/pedidos/{pedido_id}")
def obtener_detalle_pedido_admin(pedido_id: str, authorization: Optional[str] = Header(None)):
    token = authorization.replace("Bearer ", "") if authorization else ""
    try:
        cliente_seguro = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(headers={"Authorization": f"Bearer {token}"}))
        
        pedido_res = cliente_seguro.table("pedidos").select("*").eq("id", pedido_id).execute()
        if not pedido_res.data:
            raise HTTPException(status_code=404, detail="Pedido no encontrado")
        
        detalles_res = cliente_seguro.table("detalles_pedido")\
            .select("*, productos(nombre, modelos(nombre, imagen))")\
            .eq("pedido_id", pedido_id)\
            .execute()
            
        return {"pedido": pedido_res.data[0], "productos": detalles_res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/admin/pedidos/{pedido_id}/estado")
def cambiar_estado_pedido(pedido_id: str, nuevo_estado: EstadoPedido, authorization: Optional[str] = Header(None)):
    token = authorization.replace("Bearer ", "") if authorization else ""
    try:
        cliente_seguro = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(headers={"Authorization": f"Bearer {token}"}))
        respuesta = cliente_seguro.table("pedidos").update({"estado": nuevo_estado.estado}).eq("id", pedido_id).execute()
        return {"mensaje": "Estado actualizado", "data": respuesta.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/admin/pedidos/{pedido_id}")
def eliminar_pedido_admin(pedido_id: str, authorization: Optional[str] = Header(None)):
    token = authorization.replace("Bearer ", "") if authorization else ""
    try:
        cliente_seguro = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(headers={"Authorization": f"Bearer {token}"}))
        cliente_seguro.table("detalles_pedido").delete().eq("pedido_id", pedido_id).execute()
        respuesta = cliente_seguro.table("pedidos").delete().eq("id", pedido_id).execute()
        return {"mensaje": "Pedido eliminado correctamente", "data": respuesta.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/productos")
def crear_producto_admin(datos: ProductoAdminCrear, authorization: Optional[str] = Header(None)):
    token = authorization.replace("Bearer ", "") if authorization else ""
    try:
        cliente_seguro = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(headers={"Authorization": f"Bearer {token}"}))
        res = cliente_seguro.table("productos").insert(datos.dict()).execute()
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/admin/productos/{producto_id}")
def actualizar_producto_admin(producto_id: str, datos: ProductoAdminUpdate, authorization: Optional[str] = Header(None)):
    token = authorization.replace("Bearer ", "") if authorization else ""
    try:
        cliente_seguro = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(headers={"Authorization": f"Bearer {token}"}))
        update_data = {k: v for k, v in datos.dict().items() if v is not None}
        res = cliente_seguro.table("productos").update(update_data).eq("id", producto_id).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/admin/modelos/{modelo_id}")
def actualizar_modelo(modelo_id: str, datos: ModeloAdminData, authorization: Optional[str] = Header(None)):
    token = authorization.replace("Bearer ", "") if authorization else ""
    try:
        cliente_seguro = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(headers={"Authorization": f"Bearer {token}"}))
        res = cliente_seguro.table("modelos").update(datos.dict()).eq("id", modelo_id).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
        raise HTTPException(status_code=500, detail=str(e))

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
        raise HTTPException(status_code=500, detail=str(e))

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
        raise HTTPException(status_code=500, detail=str(e))
    
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
            .select("*, detalles_pedido(id)")\
            .eq("user_id", user_id)\
            .order('created_at', desc=True)\
            .execute()
            
        return respuesta.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener tus pedidos: {str(e)}")

class MensajeAdminUpdate(BaseModel):
    mensaje: str

@app.get("/api/mensajes")
def obtener_mensaje_admin():
    try:
        res = supabase.table("mensajes_admin").select("*").eq("id", 1).single().execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
        raise HTTPException(status_code=500, detail=str(e))

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
