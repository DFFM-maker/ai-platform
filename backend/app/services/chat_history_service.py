from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.models import ChatSession, ChatMessage, ChatResponseVersion
import uuid

class ChatHistoryService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_session(self, title: str, user_id: uuid.UUID = None):
        new_session = ChatSession(title=title, user_id=user_id)
        self.db.add(new_session)
        await self.db.flush()
        return new_session

    async def list_sessions(self, user_id: uuid.UUID = None):
        query = select(ChatSession).order_by(ChatSession.updated_at.desc())
        if user_id:
            query = query.where(ChatSession.user_id == user_id)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def add_message(self, session_id: str, role: str, content: str, user_id: uuid.UUID = None):
        # 1. Crea il messaggio principale
        msg = ChatMessage(session_id=uuid.UUID(session_id), role=role, content=content)
        self.db.add(msg)
        await self.db.flush() # Ottieni l'ID del messaggio
        
        # 2. Se è un messaggio dell'assistente (o modificabile), crea la Versione 1
        # (Opzionale: puoi versionare anche i messaggi user se vuoi permettere l'edit del prompt)

        # Ensure any existing versions for this message are marked as not current
        # This is a safeguard, as add_message typically creates the *first* version.
        existing_versions_query = select(ChatResponseVersion).where(ChatResponseVersion.chat_message_id == msg.id)
        existing_versions = (await self.db.execute(existing_versions_query)).scalars().all()
        for v in existing_versions:
            v.is_current = False
        
        version = ChatResponseVersion(
            chat_message_id=msg.id,
            content=content,
            user_id=user_id, # Chi ha creato questa versione (None se AI)
            version_number=1, # Always 1 for the first version created with the message
            is_current=True # This is the current version
        )
        self.db.add(version)
        
        await self.db.commit()
        return msg

    async def get_session_history(self, session_id: str):
        query = select(ChatMessage).where(ChatMessage.session_id == uuid.UUID(session_id)).order_by(ChatMessage.created_at.asc())
        result = await self.db.execute(query)
        messages = result.scalars().all()
        
        history_data = []
        for m in messages:
            message_data = {
                "id": str(m.id),
                "role": m.role,
                "content": m.content, # This will be the content of the currently active version
            }
            
            # Fetch the current version details for this message
            current_version_query = select(ChatResponseVersion).where(
                ChatResponseVersion.chat_message_id == m.id,
                ChatResponseVersion.is_current == True
            )
            current_version_result = await self.db.execute(current_version_query)
            current_version = current_version_result.scalar_one_or_none()
            
            if current_version:
                message_data["current_version_number"] = current_version.version_number
                message_data["has_versions"] = True
            else:
                message_data["current_version_number"] = 1 # Default if no versions found (shouldn't happen with current logic)
                message_data["has_versions"] = False

            history_data.append(message_data)
        
        return history_data
        
    # --- NUOVI METODI PER IL VERSIONING (Fase 2) ---
    
    async def get_message_versions(self, message_id: str):
        """Recupera tutte le versioni di un messaggio specifico"""
        query = select(ChatResponseVersion).where(
            ChatResponseVersion.chat_message_id == uuid.UUID(message_id)
        ).order_by(ChatResponseVersion.created_at.asc())
        
        result = await self.db.execute(query)
        return result.scalars().all()

    async def create_version(self, message_id: str, content: str, user_id: uuid.UUID = None):
        """Crea una nuova versione manuale (es. dopo un edit dell'utente)"""
        
        # 1. Trova tutte le versioni esistenti per questo messaggio e marca is_current=False
        existing_versions_query = select(ChatResponseVersion).where(ChatResponseVersion.chat_message_id == uuid.UUID(message_id))
        existing_versions = (await self.db.execute(existing_versions_query)).scalars().all()
        
        max_version_number = 0
        for v in existing_versions:
            v.is_current = False
            if v.version_number > max_version_number:
                max_version_number = v.version_number
        
        # 2. Crea la nuova versione con il numero incrementato e is_current=True
        new_version = ChatResponseVersion(
            chat_message_id=uuid.UUID(message_id),
            content=content,
            user_id=user_id,
            version_number=max_version_number + 1,
            is_current=True
        )
        self.db.add(new_version)
        
        # 3. Aggiorna il messaggio principale per riflettere l'ultima versione (il "current")
        msg_query = select(ChatMessage).where(ChatMessage.id == uuid.UUID(message_id))
        result = await self.db.execute(msg_query)
        msg = result.scalar_one()
        msg.content = content
        
        await self.db.commit()
        return new_version
    
    async def restore_version(self, version_id: str):
        """Ripristina una versione precedente come attuale"""
        # 1. Trova la versione target
        query_ver = select(ChatResponseVersion).where(ChatResponseVersion.id == uuid.UUID(version_id))
        res_ver = await self.db.execute(query_ver)
        target_version = res_ver.scalar_one()
        
        # 2. Trova tutte le versioni esistenti per questo messaggio e marca is_current=False
        existing_versions_query = select(ChatResponseVersion).where(ChatResponseVersion.chat_message_id == target_version.chat_message_id)
        existing_versions = (await self.db.execute(existing_versions_query)).scalars().all()
        for v in existing_versions:
            v.is_current = False
            
        # 3. Imposta is_current=True sulla versione target
        target_version.is_current = True
        
        # 4. Aggiorna il messaggio principale
        query_msg = select(ChatMessage).where(ChatMessage.id == target_version.chat_message_id)
        res_msg = await self.db.execute(query_msg)
        msg = res_msg.scalar_one()
        msg.content = target_version.content
        
        await self.db.commit()
        return target_version # Return the restored version