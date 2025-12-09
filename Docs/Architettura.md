1. Architettura di Sistema

1.1 Diagramma Architetturale Logico

graph TD
    User((Utente Internet)) -->|HTTPS 443| FW[pfSense Firewall\nIP Pubblico / NAT]
    FW -->|Port Fwd 443| NGINX[Nginx Reverse Proxy\nTerminazione SSL]
    
    subgraph "Proxmox VM: Ubuntu 24.04 (192.168.1.244)"
        NGINX -->|/api| API[FastAPI Backend\nPort: 8000]
        NGINX -->|/*| UI[Next.js Frontend\nPort: 3000]
        
        API -->|SQL| PG[(PostgreSQL\nDati Utenti/Config)]
        API -->|gRPC/HTTP| QD[(Qdrant\nVector DB)]
        API -->|Filesystem| VOL[Volume Dati Locali]
    end

    subgraph "LAN Interna (192.168.1.243)"
        API -->|HTTP :11434| OLLAMA[Server Ollama AI\nRTX A1000 8GB]
    end


1.2 Flusso Dati & Sicurezza Attuale (Fase 1)

Ingress: Nginx gestisce SSL offloading e routing su IP 192.168.1.244.

Auth (Custom + 2FA):

Login Primario: Email/Password (gestiti su PostgreSQL con hashing bcrypt).

2FA (Sicurezza): Integrazione Google Authenticator (TOTP standard). Il backend genera il QR code, l'utente scansiona, e il token 6 cifre è richiesto per validare il JWT.

Streaming: SSE (Server-Sent Events) da FastAPI verso Next.js.

RAG: Pipeline di indicizzazione su Qdrant locale.

1.3 Roadmap Evolutiva (Post-Production / Fase 2)

Una volta stabilizzata la piattaforma, l'autenticazione verrà migrata verso soluzioni Enterprise Identity Management (IAM) per supportare SSO e gestione centralizzata utenti.

Target Tecnologico:

Keycloak (Preferred Self-Hosted): Container Docker aggiuntivo per gestione identità on-premise completa.

Clerk (Cloud Alternative): Opzione SaaS se l'infrastruttura avrà accesso stabile a internet.

Obiettivi Migrazione:

Centralizzazione utenti (Directory unica aziendale).

Single Sign-On (SSO) con Azure AD / Google Workspace.

Audit log avanzati sugli accessi.

2. Database Design

2.1 Schema PostgreSQL (Relazionale)

-- Utenti e Ruoli
CREATE TYPE user_role AS ENUM ('admin', 'user', 'readonly');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Supporto 2FA (Google Authenticator)
    totp_secret VARCHAR(255),  -- Chiave segreta per 2FA
    is_2fa_enabled BOOLEAN DEFAULT FALSE,

    role user_role DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurazioni Modelli (Preset Admin)
CREATE TABLE model_presets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL, 
    model_name VARCHAR(100) NOT NULL, 
    temperature FLOAT DEFAULT 0.7,
    top_p FLOAT DEFAULT 0.9,
    max_tokens INT DEFAULT 2048,
    system_prompt TEXT,
    category VARCHAR(50)
);

-- Preferenze Utente
CREATE TABLE user_model_preferences (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    preset_id INT REFERENCES model_presets(id),
    custom_system_prompt TEXT,
    PRIMARY KEY (user_id, preset_id)
);

-- Sessioni Chat & Messaggi
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    title VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    tokens_used INT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Documenti
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    filename VARCHAR(255),
    file_path VARCHAR(512),
    mime_type VARCHAR(100),
    qdrant_collection_name VARCHAR(100),
    is_indexed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);


2.2 Schema Qdrant (Vettoriale)

Collection: documents_vectors

Payload: document_id, chunk_index, text_content, page_number.

Collection: code_vectors

Payload: repository_id, file_path, language, code_snippet.

3. Specifica API (OpenAPI Style)

Auth (Aggiornata con 2FA)

POST /auth/login: Verifica user/pass. Se 2FA attivo -> Ritorna 2fa_required_token. Altrimenti -> Ritorna JWT.

POST /auth/2fa/verify: Input code (da Google Auth) + 2fa_required_token. Ritorna JWT finale.

POST /auth/2fa/setup: Genera QR Code (secret) per configurare Google Authenticator.

Models (Gestione Ollama)

GET /models: Ritorna lista combinata (Ollama live + Presets DB).

POST /models/pull (Admin): Trigger ollama pull.

Chat & Streaming

POST /chat/sessions: Nuova sessione.

POST /chat/stream: Endpoint SSE principale.

Documents (RAG)

POST /documents/upload: Upload file e indicizzazione asincrona.