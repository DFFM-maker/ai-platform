# CREATO: 2025-12-07
# - JWT generation e validazione
# - Google OAuth token verification
# - Password hashing utilities
# - Current user dependency per FastAPI

from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import os

from app.db.database import get_db
from app.db.models import User

# Configurazione
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production-min-32-chars")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

# Email whitelist - solo questi utenti possono accedere
ALLOWED_EMAILS_STR = os.getenv("ALLOWED_EMAILS", "giuseppe@defranceschi.pro")
ALLOWED_EMAILS = set(email.strip() for email in ALLOWED_EMAILS_STR.split(",") if email.strip())

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# ==================== PASSWORD HASHING ====================
def hash_password(password: str) -> str:
    """Hash una password con bcrypt"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica password contro hash"""
    return pwd_context.verify(plain_password, hashed_password)

# ==================== JWT ====================
def create_access_token(user_id: str, email: str, role: str = "user") -> str:
    """Genera JWT token per autenticazione"""
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": user_id,  # User ID
        "email": email,
        "role": role,  # User role (admin, user, readonly)
        "exp": expire,
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    """Decodifica e valida JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token non valido o scaduto",
            headers={"WWW-Authenticate": "Bearer"},
        )

# ==================== GOOGLE OAUTH ====================
async def verify_google_token(token: str, invite_token: str = None, db: AsyncSession = None) -> dict:
    """
    Verifica token Google OAuth e ritorna user info.
    Token viene dal frontend dopo login Google.
    Controlla whitelist O validità dell'invite token.
    
    Args:
        token: Google OAuth token
        invite_token: Token di invito (opzionale)
        db: Database session (richiesta se invite_token è fornito)
    """
    try:
        idinfo = id_token.verify_oauth2_token(
            token, 
            google_requests.Request(), 
            GOOGLE_CLIENT_ID
        )
        
        # Verifica che il token sia per la nostra app
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Wrong issuer.')
        
        user_email = idinfo["email"]
        
        # ⚠️ WHITELIST CHECK - con eccezione per invite validi
        if user_email not in ALLOWED_EMAILS:
            # Se c'è un invite token, verifica quello invece della whitelist
            if invite_token and db:
                from app.db.models import InviteToken
                from sqlalchemy.future import select
                
                result = await db.execute(
                    select(InviteToken).where(InviteToken.token == invite_token)
                )
                invite = result.scalar_one_or_none()
                
                # Validazione invite
                if not invite:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Token di invito non valido"
                    )
                
                if invite.used_at:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Questo invito è già stato utilizzato"
                    )
                
                if datetime.now(timezone.utc) > invite.expires_at:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Questo invito è scaduto"
                    )
                
                # Invite valido - l'utente può registrarsi
                # Segna l'invito come usato
                invite.used_at = datetime.utcnow()
                invite.used_by_email = user_email
                await db.commit()
                
                # Aggiungi email alla whitelist in memoria per questa sessione
                # (in produzione, dovresti aggiungerla al database o file config)
                ALLOWED_EMAILS.add(user_email)
            else:
                # Nessun invite valido - blocca accesso
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Accesso negato. L'email {user_email} non è autorizzata ad accedere a questa piattaforma. Contatta l'amministratore per richiedere l'accesso."
                )
        
        return {
            "email": user_email,
            "name": idinfo.get("name", ""),
            "picture": idinfo.get("picture", ""),
            "email_verified": idinfo.get("email_verified", False)
        }
    except HTTPException:
        # Re-raise HTTPException (whitelist block)
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token Google non valido: {str(e)}"
        )

# ==================== CURRENT USER DEPENDENCY ====================
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Dependency per ottenere utente corrente da JWT token.
    Usalo negli endpoint protetti: user: User = Depends(get_current_user)
    """
    token = credentials.credentials
    payload = decode_token(token)
    user_id = payload.get("sub")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token non valido"
        )
    
    # Recupera user dal DB
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utente non trovato o disattivato"
        )
    
    return user

# ==================== OPTIONAL USER (Per endpoint pubblici) ====================
async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """
    Come get_current_user ma ritorna None se non autenticato (no errore).
    Utile per endpoint che funzionano sia con che senza auth.
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None
