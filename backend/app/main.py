import os
# 1. AGGIUNTO Request AGLI IMPORT QUI SOTTO
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from contextlib import asynccontextmanager
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import engine, Base, get_db
from app.db.models import ModelPreset
from app.core.config import settings
from app.api.v1.endpoints import chat, documents, auth, invites

@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"🚀 Server starting... Target Ollama: {settings.OLLAMA_BASE_URL}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    print("🛑 Server shutting down...")

app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

# --- 1. PROXY HEADERS (FONDAMENTALE PER HTTPS) ---
app.add_middleware(
    ProxyHeadersMiddleware,
    trusted_hosts=["*"] 
)

# --- 2. DEBUG LOGS (INCOLLALO QUI) ---
@app.middleware("http")
async def debug_headers(request: Request, call_next):
    # Questo stamperà nei log esattamente cosa vede FastAPI
    print(f"🔍 DEBUG SCHEME: {request.url.scheme}")
    print(f"🔍 DEBUG HEADERS: {request.headers.get('x-forwarded-proto', 'MISSING')}")
    response = await call_next(request)
    return response
# -------------------------------------

# --- 3. CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# --- ROUTER ---
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["Chat"])
app.include_router(documents.router, prefix="/api/v1/documents", tags=["Documents"])
app.include_router(invites.router, prefix="/api/v1/invites", tags=["Invites"])

# --- ENDPOINT MODELLI (FIX PER 404) ---
@app.get("/api/v1/models", tags=["Models"])
async def get_models(db: AsyncSession = Depends(get_db)):
    """Restituisce la lista dei modelli configurati nel DB"""
    try:
        result = await db.execute(select(ModelPreset))
        presets = result.scalars().all()
        return presets
    except Exception as e:
        print(f"Error fetching models: {e}")
        return []

# --- SYSTEM HEALTH ---
@app.get("/health", tags=["System"])
@app.get("/api/v1/health", tags=["System"]) 
def health_check():
    return {
        "status": "online",
        "system": "AI Enterprise Platform",
        "database": "connected",
        "ollama_target": settings.OLLAMA_BASE_URL
    }

@app.get("/")
def root():
    return {"message": "AI Platform API is running"}