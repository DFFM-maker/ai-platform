# CREATO: 2025-12-07
# - Google OAuth login endpoint
# - User registration/autologin
# - /me endpoint per info utente corrente

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional
import uuid

from app.db.database import get_db
from app.db.models import User
from app.core.security import (
    verify_google_token,
    create_access_token,
    get_current_user
)

router = APIRouter()

# ==================== SCHEMAS ====================
class GoogleLoginRequest(BaseModel):
    credential: str  # Token Google dal frontend
    invite_token: Optional[str] = None  # Token di invito (opzionale)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class UserResponse(BaseModel):
    id: str
    email: str
    role: str
    is_active: bool

# ==================== ENDPOINTS ====================
@router.post("/google/login", response_model=TokenResponse, tags=["Auth"])
async def google_login(
    request: GoogleLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Login con Google OAuth.
    1. Verifica token Google (con supporto invite)
    2. Trova o crea utente
    3. Ritorna JWT interno
    """
    # Step 1: Verifica token Google (con invite se presente)
    google_user = await verify_google_token(
        request.credential,
        invite_token=request.invite_token,
        db=db
    )
    
    if not google_user.get("email_verified"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email Google non verificata"
        )
    
    # Step 2: Trova o crea utente
    stmt = select(User).where(User.email == google_user["email"])
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    if not user:
        # Auto-registrazione primo accesso
        # giuseppe@defranceschi.pro è admin, gli altri sono user
        user_role = "admin" if google_user["email"] == "giuseppe@defranceschi.pro" else "user"
        
        user = User(
            id=uuid.uuid4(),
            email=google_user["email"],
            password_hash="",  # Non serve per Google OAuth
            role=user_role,
            is_active=True
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    
    # Verifica che utente sia attivo
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account disabilitato"
        )
    
    # Step 3: Genera JWT
    access_token = create_access_token(
        user_id=str(user.id),
        email=user.email,
        role=user.role
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "role": user.role
        }
    }

@router.get("/me", response_model=UserResponse, tags=["Auth"])
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Ritorna info utente corrente da JWT token.
    Usato dal frontend per verificare se autenticato.
    """
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "role": current_user.role,
        "is_active": current_user.is_active
    }

@router.post("/logout", tags=["Auth"])
async def logout():
    """
    Logout (lato client cancella token).
    Endpoint placeholder per consistenza API.
    """
    return {"message": "Logout successful"}
