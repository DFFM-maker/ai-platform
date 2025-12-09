from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.models import ChatSession, ChatMessage
import uuid

class ChatHistoryService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_session(self, title: str, user_id: uuid.UUID = None):
        # Nota: user_id opzionale per ora finché non implementiamo auth
        new_session = ChatSession(title=title, user_id=user_id)
        self.db.add(new_session)
        await self.db.flush()
        return new_session

    async def list_sessions(self, user_id: uuid.UUID = None):
        # Se user_id è None prende tutto (per debug), altrimenti filtra
        query = select(ChatSession).order_by(ChatSession.updated_at.desc())
        if user_id:
            query = query.where(ChatSession.user_id == user_id)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def add_message(self, session_id: str, role: str, content: str):
        msg = ChatMessage(session_id=uuid.UUID(session_id), role=role, content=content)
        self.db.add(msg)
        await self.db.commit()
        return msg

    async def get_session_history(self, session_id: str):
        # Ritorna formato compatibile con Ollama: [{"role": "user", "content": "..."}]
        query = select(ChatMessage).where(ChatMessage.session_id == uuid.UUID(session_id)).order_by(ChatMessage.created_at.asc())
        result = await self.db.execute(query)
        messages = result.scalars().all()
        return [{"role": m.role, "content": m.content} for m in messages]
