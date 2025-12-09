-- 1. Pulizia
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS chat_sessions;
DROP TABLE IF EXISTS user_model_preferences;
DROP TABLE IF EXISTS model_presets;
DROP TABLE IF EXISTS users;
DROP TYPE IF EXISTS user_role;

-- 2. Tabelle Core
CREATE TYPE user_role AS ENUM ('admin', 'user', 'readonly');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Inserimento Preset (Ottimizzati per RTX A1000 8GB)
INSERT INTO model_presets (name, model_name, temperature, top_p, max_tokens, category, system_prompt)
VALUES 
(
    'chat_ita_default', 'fara7b:latest', 0.7, 0.9, 2048, 'chat',
    'Sei un assistente AI avanzato. Rispondi in italiano. Sii conciso se non richiesto diversamente.'
),
(
    'dev_iot_automation', 'qwen2.5-coder:7b', 0.1, 0.95, 4096, 'code',
    'Sei un Senior Automation Engineer ed esperto Embedded C++. Conosci C++17/20, Node-RED, InfluxDB Flux e Sysmac Studio ST. Commenta sempre il codice.'
),
(
    'rag_analyst', 'llama3:8b-q4_K_M', 0.3, 0.95, 2048, 'rag',
    'Sei un analista tecnico. Rispondi basandoti ESCLUSIVAMENTE sul contesto fornito.'
);
