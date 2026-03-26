import os
from fastapi import FastAPI, HTTPException, Header, Header
from fastapi.middleware.cors import CORSMiddleware
from realtime import Optional
from supabase import ClientOptions, create_client, Client
from dotenv import load_dotenv
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "¡Bienvenido a la API de Custom Layers!"}

@app.get("/api/usuarios")
def obtener_mi_perfil(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Falta el token de sesión")
    
    token = authorization.replace("Bearer ", "")
    
    cliente_seguro = create_client(
        SUPABASE_URL, 
        SUPABASE_KEY, 
        options=ClientOptions(headers={"Authorization": f"Bearer {token}"})
    )
    
    respuesta = cliente_seguro.table("usuarios").select("*").execute()
    return {"data": respuesta.data}

@app.get("/api/usuarios/perfil")
def obtener_mi_perfil(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Falta el token de sesión")
    
    token = authorization.replace("Bearer ", "")
    
    try:
        cliente_seguro = create_client(
            SUPABASE_URL, 
            SUPABASE_KEY, 
            options=ClientOptions(headers={"Authorization": f"Bearer {token}"})
        )
        
        respuesta_auth = cliente_seguro.auth.get_user()
        user_id = respuesta_auth.user.id
        
        respuesta_db = cliente_seguro.table("usuarios").select("*").eq("id", user_id).single().execute()
        
        return respuesta_db.data
        
    except Exception as e:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")