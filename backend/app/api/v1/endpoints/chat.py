# MODIFICATO: 2025-12-08
# - Integrato IndustrialModelRouter per auto-routing intelligente
# - Supporto 3-way routing: PLC (Qwen 14B), Industrial (Mistral), General (Mistral)
# - System prompt selection automatica basata su query

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
import uuid

from app.services.ollama_service import ollama_service
from app.db.database import get_db
from app.db.models import ModelPreset, ChatSession, ChatMessage
from app.services.chat_history_service import ChatHistoryService
from app.services.model_router import IndustrialModelRouter
from app.core.security import get_current_user_optional, get_current_user
from app.db.models import User

router = APIRouter()
model_router = IndustrialModelRouter()

# Schema Input Aggiornato (Match col Frontend)
class ChatRequest(BaseModel):
    preset_name: Optional[str] = "chat_ita_default"
    messages: List[dict]
    session_id: Optional[str] = None
    temperature: Optional[float] = 0.7
    use_rag: Optional[bool] = False

@router.post("/stream")
async def stream_chat(
    request: ChatRequest, 
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    history_service = ChatHistoryService(db)

    # 1. Auto-routing: determina modello ottimale basato su query
    last_user_msg = next((m["content"] for m in reversed(request.messages) if m["role"] == "user"), "")
    
    # Se preset specificato, usa quello; altrimenti auto-route
    if request.preset_name and request.preset_name != "chat_ita_default":
        # Usa preset esplicito dal DB
        stmt = select(ModelPreset).where(ModelPreset.name == request.preset_name)
        result = await db.execute(stmt)
        preset = result.scalars().first()
        if preset:
            actual_model = preset.model_name
            system_prompt = preset.system_prompt
        else:
            # Fallback se preset non trovato
            actual_model = model_router.route(last_user_msg, preset_override=request.preset_name)
            system_prompt = model_router.get_system_prompt(actual_model, request.preset_name, last_user_msg)
    else:
        # Auto-routing intelligente
        actual_model = model_router.route(last_user_msg)
        system_prompt = model_router.get_system_prompt(actual_model, query=last_user_msg)
        
        # Log routing decision per debug
        routing_explanation = model_router.explain_routing_decision(last_user_msg, actual_model)
        print(f"🤖 Auto-routing: {routing_explanation}")
    
    # 2. Inietta System Prompt se non già presente
    messages_to_send = list(request.messages)
    if system_prompt:
        has_system = any(m['role'] == 'system' for m in messages_to_send)
        if not has_system:
            messages_to_send.insert(0, {"role": "system", "content": system_prompt})
    
    # 3. RAG Logic (usa router per decidere se serve RAG)
    if request.use_rag or model_router.should_use_rag(last_user_msg, actual_model):
        try:
            from app.services.rag_service import rag_service
            if last_user_msg:
                print(f"🔍 RAG Search: {last_user_msg}")
                context = await rag_service.search(last_user_msg)
                if context:
                    messages_to_send.insert(-1, {
                        "role": "system",
                        "content": f"Usa queste informazioni per rispondere:\n{context}"
                    })
        except Exception as e:
            print(f"⚠️ RAG Error: {e}")

    # 4. Auto-crea sessione se autenticato e non specificata
    session_id_to_use = request.session_id
    if current_user and not session_id_to_use:
        # Estrai titolo dal primo messaggio utente
        first_user_msg = next((m["content"] for m in request.messages if m["role"] == "user"), "Nuova Chat")
        title = first_user_msg[:50] if len(first_user_msg) > 50 else first_user_msg
        
        new_session = ChatSession(
            id=uuid.uuid4(),
            user_id=current_user.id,
            title=title
        )
        db.add(new_session)
        await db.commit()
        await db.refresh(new_session)
        session_id_to_use = str(new_session.id)
    
    # 5. Streaming con model settings ottimizzati
    model_settings = model_router.get_model_settings(actual_model)
    # Override con temperatura da request se specificata
    if request.temperature:
        model_settings["temperature"] = request.temperature
    
    async def event_generator():
        full_response = ""
        try:
            async for token in ollama_service.chat_stream(
                model=actual_model, 
                messages=messages_to_send,
                options=model_settings
            ):
                full_response += token
                yield f"data: {token}\n\n"
            
            # Salva messaggi utente + assistant se session_id presente
            if session_id_to_use:
                # Salva ultimo messaggio utente
                last_user_msg = next((m["content"] for m in reversed(request.messages) if m["role"] == "user"), None)
                if last_user_msg:
                    await history_service.add_message(session_id_to_use, "user", last_user_msg)
                
                # Salva risposta assistant
                await history_service.add_message(session_id_to_use, "assistant", full_response)
                
                # Invia session_id al client
                yield f"data: {{\"session_id\": \"{session_id_to_use}\"}}\n\n"
            
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: Error: {str(e)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# ==================== STORICO CHAT ====================

class CreateSessionRequest(BaseModel):
    title: Optional[str] = "Nuova Chat"

class SessionResponse(BaseModel):
    id: str
    title: str
    created_at: str
    message_count: int = 0

@router.get("/sessions", tags=["Chat History"])
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lista tutte le sessioni dell'utente corrente"""
    stmt = select(ChatSession).where(
        ChatSession.user_id == current_user.id
    ).order_by(desc(ChatSession.updated_at)).limit(50)
    
    result = await db.execute(stmt)
    sessions = result.scalars().all()
    
    # Conta messaggi per sessione
    response = []
    for session in sessions:
        msg_count_stmt = select(ChatMessage).where(ChatMessage.session_id == session.id)
        msg_result = await db.execute(msg_count_stmt)
        msg_count = len(msg_result.scalars().all())
        
        response.append({
            "id": str(session.id),
            "title": session.title,
            "created_at": session.created_at.isoformat(),
            "message_count": msg_count
        })
    
    return response

@router.post("/sessions", tags=["Chat History"])
async def create_session(
    request: CreateSessionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Crea nuova sessione chat"""
    session = ChatSession(
        id=uuid.uuid4(),
        user_id=current_user.id,
        title=request.title
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    
    return {
        "id": str(session.id),
        "title": session.title,
        "created_at": session.created_at.isoformat()
    }

@router.get("/sessions/{session_id}", tags=["Chat History"])
async def get_session_messages(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Recupera tutti i messaggi di una sessione"""
    # Verifica ownership
    stmt = select(ChatSession).where(
        ChatSession.id == uuid.UUID(session_id),
        ChatSession.user_id == current_user.id
    )
    result = await db.execute(stmt)
    session = result.scalars().first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Sessione non trovata")
    
    # Recupera messaggi
    history_service = ChatHistoryService(db)
    messages = await history_service.get_session_history(session_id)
    
    return {
        "session_id": session_id,
        "title": session.title,
        "messages": messages
    }

@router.delete("/sessions/{session_id}", tags=["Chat History"])
async def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Elimina sessione e relativi messaggi"""
    stmt = select(ChatSession).where(
        ChatSession.id == uuid.UUID(session_id),
        ChatSession.user_id == current_user.id
    )
    result = await db.execute(stmt)
    session = result.scalars().first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Sessione non trovata")
    
    await db.delete(session)
    await db.commit()
    
    return {"message": "Sessione eliminata"}