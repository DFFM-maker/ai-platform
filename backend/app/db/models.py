from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, Text, Float, Enum as SQLEnum
from sqlalchemy.orm import relationship  # <--- QUESTO MANCAVA!
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from .database import Base

# --- UTENTI E AUTH ---
class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(SQLEnum('admin', 'user', 'readonly', name='user_role', create_type=False), default="user")
    is_active = Column(Boolean, default=True)
    current_model = Column(String, nullable=True)
        
    # Campi per 2FA
    totp_secret = Column(String, nullable=True)
    is_2fa_enabled = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# --- INVITI ---
class InviteToken(Base):
    __tablename__ = "invite_tokens"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token = Column(String, unique=True, index=True)
    email = Column(String, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))
    used_at = Column(DateTime(timezone=True), nullable=True)
    used_by_email = Column(String, nullable=True)

# --- CONFIGURAZIONE MODELLI (PRESETS) ---
class ModelPreset(Base):
    __tablename__ = "model_presets"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    model_name = Column(String)
    display_name = Column(String)
    temperature = Column(Float, default=0.7)
    system_prompt = Column(Text)
    category = Column(String)

# --- CHAT STORAGE ---
class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    title = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relazione per accedere facilmente ai messaggi
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("chat_sessions.id"))
    role = Column(String)
    content = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Back-reference alla sessione
    session = relationship("ChatSession", back_populates="messages")
    
    # Relazione per il versionamento (La parte che ti dava errore)
    versions = relationship("ChatResponseVersion", back_populates="chat_message", cascade="all, delete-orphan")

# --- NUOVA TABELLA: VERSIONING ---
class ChatResponseVersion(Base):
    __tablename__ = "chat_response_versions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chat_message_id = Column(UUID(as_uuid=True), ForeignKey("chat_messages.id"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True) # Chi ha fatto la modifica (o null se AI)
    version_number = Column(Integer, default=1, nullable=False) # Numero progressivo della versione
    is_current = Column(Boolean, default=True, nullable=False) # Flag per la versione attiva
    content = Column(Text) # Il contenuto completo di QUESTA versione
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    parent_version_id = Column(UUID(as_uuid=True), ForeignKey("chat_response_versions.id"), nullable=True)
    
    chat_message = relationship("ChatMessage", back_populates="versions")

# --- DOCUMENTI (RAG) ---
class Document(Base):
    __tablename__ = "documents"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    filename = Column(String)
    file_path = Column(String)
    qdrant_collection_name = Column(String)
    is_indexed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())