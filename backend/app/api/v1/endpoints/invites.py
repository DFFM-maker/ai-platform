"""
Endpoints per gestione inviti utenti
"""
from datetime import datetime, timedelta, timezone
from typing import List
import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_

from app.db.database import get_db
from app.db.models import InviteToken, User
from app.core.security import get_current_user
from pydantic import BaseModel, EmailStr

router = APIRouter()

# --- SCHEMAS ---
class InviteCreate(BaseModel):
    email: EmailStr | None = None
    expires_in_days: int = 7

class InviteResponse(BaseModel):
    id: str
    token: str
    email: str | None
    created_at: datetime
    expires_at: datetime
    used_at: datetime | None
    invite_url: str

class InviteInfo(BaseModel):
    valid: bool
    email: str | None
    expires_at: datetime | None
    error: str | None = None

# --- ENDPOINTS ---

@router.post("/", response_model=InviteResponse)
async def create_invite(
    invite_data: InviteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Crea un nuovo token di invito (solo admin)
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo gli admin possono creare inviti"
        )
    
    # Genera token sicuro
    token = secrets.token_urlsafe(32)
    
    # Calcola scadenza
    expires_at = datetime.utcnow() + timedelta(days=invite_data.expires_in_days)
    
    # Crea invito
    invite = InviteToken(
        token=token,
        email=invite_data.email,
        created_by=current_user.id,
        expires_at=expires_at
    )
    
    db.add(invite)
    await db.commit()
    await db.refresh(invite)
    
    # URL completo
    invite_url = f"https://ai-platform.dffm.it/invite/{token}"
    
    return InviteResponse(
        id=str(invite.id),
        token=invite.token,
        email=invite.email,
        created_at=invite.created_at,
        expires_at=invite.expires_at,
        used_at=invite.used_at,
        invite_url=invite_url
    )

@router.get("/", response_model=List[InviteResponse])
async def list_invites(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lista tutti gli inviti (solo admin)
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo gli admin possono vedere gli inviti"
        )
    
    result = await db.execute(
        select(InviteToken).order_by(InviteToken.created_at.desc())
    )
    invites = result.scalars().all()
    
    return [
        InviteResponse(
            id=str(inv.id),
            token=inv.token,
            email=inv.email,
            created_at=inv.created_at,
            expires_at=inv.expires_at,
            used_at=inv.used_at,
            invite_url=f"https://ai-platform.dffm.it/invite/{inv.token}"
        )
        for inv in invites
    ]

@router.get("/{token}", response_model=InviteInfo)
async def verify_invite(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Verifica validità di un token di invito (pubblico)
    """
    result = await db.execute(
        select(InviteToken).where(InviteToken.token == token)
    )
    invite = result.scalar_one_or_none()
    
    if not invite:
        return InviteInfo(
            valid=False,
            email=None,
            expires_at=None,
            error="Token non valido"
        )
    
    if invite.used_at:
        return InviteInfo(
            valid=False,
            email=invite.email,
            expires_at=invite.expires_at,
            error="Invito già utilizzato"
        )
    
    if datetime.now(timezone.utc) > invite.expires_at:
        return InviteInfo(
            valid=False,
            email=invite.email,
            expires_at=invite.expires_at,
            error="Invito scaduto"
        )
    
    return InviteInfo(
        valid=True,
        email=invite.email,
        expires_at=invite.expires_at
    )

@router.delete("/{token}")
async def revoke_invite(
    token: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Revoca un invito (solo admin)
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo gli admin possono revocare inviti"
        )
    
    result = await db.execute(
        select(InviteToken).where(InviteToken.token == token)
    )
    invite = result.scalar_one_or_none()
    
    if not invite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invito non trovato"
        )
    
    await db.delete(invite)
    await db.commit()
    
    return {"message": "Invito revocato"}
