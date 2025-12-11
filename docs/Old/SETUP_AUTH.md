# 🔐 Setup Autenticazione Google OAuth

## 1️⃣ Crea Progetto Google Cloud (5 min)

1. Vai su https://console.cloud.google.com
2. Crea nuovo progetto: **"AI-Platform-Auth"**
3. Abilita **Google+ API** (o People API)

## 2️⃣ Configura OAuth Consent Screen

1. Menu → **APIs & Services** → **OAuth consent screen**
2. Scegli **Internal** (solo Google Workspace) o **External**
3. Compila:
   - App name: `AI Enterprise Platform`
   - User support email: tua email
   - Developer contact: tua email
4. **Salva e continua**

## 3️⃣ Crea Credenziali OAuth

1. Menu → **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
2. Application type: **Web application**
3. Name: `AI Platform Web Client`
4. **Authorized redirect URIs**:
   ```
   http://localhost:3000
   https://ai-platform.dffm.it
   https://ai-platform.dffm.it/api/auth/google/callback
   ```
   **Note**: Per sviluppo locale aggiungi anche:
   - `http://192.168.1.244:3000` (testing LAN)
5. **CREATE** → Copia **Client ID**

## 4️⃣ Configura Variabili Ambiente

### Backend (.env o docker-compose.yml)
```bash
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
JWT_SECRET_KEY=change-this-to-random-32-char-min
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
NEXT_PUBLIC_API_URL=http://192.168.1.244:8000/api/v1
```

## 5️⃣ Rebuild Container

```bash
cd /home/giuseppe/ai-platform

# Installa nuove dipendenze backend
docker compose exec backend pip install google-auth google-auth-oauthlib

# Rebuild frontend (per @react-oauth/google)
docker compose restart frontend

# Oppure rebuild completo
docker compose build --no-cache
docker compose up -d
```

## 6️⃣ Test Login

1. Apri http://192.168.1.244:3000/login
2. Click su **"Sign in with Google"**
3. Seleziona account Google
4. Redirect automatico a `/chat`

## ✅ Verifica Funzionamento

**Backend logs:**
```bash
docker compose logs backend --tail=20
# Cerca: "POST /api/v1/auth/google/login HTTP/1.1" 200
```

**Frontend:**
- Controlla che nome utente appaia in sidebar
- Storico chat salvato con user_id

## 🛠️ Troubleshooting

### Errore: "Token Google non valido"
- Verifica che GOOGLE_CLIENT_ID sia identico su backend e frontend
- Controlla redirect URI in Google Console

### Errore: "CORS policy"
- Verifica che frontend URL sia in `allow_origins` (backend/main.py)

### Storico chat non appare
- Controlla che JWT token sia in localStorage
- Verifica endpoint `/chat/sessions` con Authorization header

## 🔒 Sicurezza Produzione

**OBBLIGATORIO prima del deploy pubblico:**

1. Cambia `JWT_SECRET_KEY`:
   ```bash
   openssl rand -base64 32
   ```

2. Limita CORS:
   ```python
   allow_origins=["http://192.168.1.244:3000"]
   ```

3. Abilita HTTPS con certificato SSL
4. Configura Google OAuth come **Internal** (solo workspace)
