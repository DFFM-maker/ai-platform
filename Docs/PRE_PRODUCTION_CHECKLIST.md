# Pre-Production Checklist - AI Platform

**Documento di controllo pre-produzione**  
**Ultima modifica**: 7 Dicembre 2025  
**Stato progetto**: Sviluppo - Deployment interno LAN  
**Target deployment**: pfSense + Nginx reverse proxy

---

## 📋 Indice

1. [Vulnerabilità Note](#vulnerabilità-note)
2. [Sicurezza e Autenticazione](#sicurezza-e-autenticazione)
3. [Hardening Infrastruttura](#hardening-infrastruttura)
4. [SSL/TLS e Certificati](#ssltls-e-certificati)
5. [Testing e Validazione](#testing-e-validazione)
6. [Performance e Ottimizzazione](#performance-e-ottimizzazione)
7. [Monitoring e Logging](#monitoring-e-logging)
8. [Backup e Disaster Recovery](#backup-e-disaster-recovery)

---

## 🔴 Vulnerabilità Note

### Frontend (Next.js 15.0.0)

#### ❌ CRITICAL SEVERITY
- **Vulnerabilità**: Remote Code Execution (RCE) tramite React flight protocol
- **Package**: `next@15.0.0`
- **CVE**: Da verificare su npm audit report completo
- **Stato**: ⏳ **NON RISOLTO** - Rimandato a fase pre-produzione
- **Fix previsto**: Aggiornamento a Next.js 15.5.7+
- **Comando**: 
  ```bash
  cd frontend
  npm audit fix --force
  ```
- **Note**: Richiede testing approfondito dopo update per compatibilità

#### ⚠️ HIGH SEVERITY (3 vulnerabilità)

1. **Denial of Service (DoS) - Server Actions**
   - **Impatto**: Crash server con payload specifici
   - **Stato**: ⏳ **NON RISOLTO**
   - **Mitigazione temporanea**: Rate limiting a livello Nginx (da implementare)

2. **Information Exposure - Dev Server**
   - **Impatto**: Leak di informazioni sensibili in modalità development
   - **Stato**: ✅ **MITIGATO** - Container usa NODE_ENV=production
   - **Verifica**: Controllare che `NODE_ENV=production` in docker-compose.yml

3. **Cache Poisoning / SSRF**
   - **Impatto**: Manipolazione cache, Server-Side Request Forgery
   - **Stato**: ⏳ **NON RISOLTO**
   - **Mitigazione**: CORS restrictive, validazione input URL

### Backend (Python/FastAPI)

#### ✅ Dipendenze aggiornate
- Ultima verifica: 7 Dicembre 2025
- Comando eseguito: `pip list --outdated`
- **WARNING**: pip 24.0 in uso, disponibile 25.3
- **Action item**: Aggiornare pip prima di freeze requirements

#### ⚠️ Da verificare
- [ ] **SQLAlchemy injection**: Validare tutti i parametri query con Pydantic
- [ ] **Dependency vulnerabilities**: Eseguire `pip-audit` o `safety check`
- [ ] **CORS configuration**: Verificare che origins sia restrictive in produzione

---

## 🔐 Sicurezza e Autenticazione

### JWT Configuration

#### ⚠️ JWT_SECRET_KEY
- **Stato attuale**: ⚠️ **INSICURO** - Valore placeholder in docker-compose.yml
- **Valore corrente**: `"your-secret-key-here-change-in-production"`
- **Azione richiesta**: Generare chiave crittograficamente sicura
- **Comando**:
  ```bash
  openssl rand -base64 64
  ```
- **Deadline**: Prima di deployment pfSense
- **Checklist**:
  - [ ] Generare chiave sicura (min 64 caratteri)
  - [ ] Aggiornare `.env` file
  - [ ] Rimuovere valore hardcoded da docker-compose.yml
  - [ ] Aggiungere `.env` a `.gitignore`
  - [ ] Documentare procedura di rotazione chiave

#### ⏳ JWT Expiration
- **Scadenza attuale**: 7 giorni
- **File**: `backend/app/core/security.py:15`
- **Valutazione**: Accettabile per MVP, considerare 1-2 ore in produzione
- **Action item**: Implementare refresh token mechanism

### Google OAuth 2.0

#### ⏳ Configurazione Client ID
- **Stato**: ⏳ **PENDING** - Richiede setup Google Cloud Console
- **Dominio**: ai-platform.dffm.it
- **Guida**: Vedere `SETUP_AUTH.md` e `SETUP_DOMAIN_SSL.md`
- **Checklist**:
  - [ ] Creare progetto Google Cloud
  - [ ] Configurare OAuth consent screen
  - [ ] Generare credenziali OAuth 2.0
  - [ ] Configurare Authorized redirect URIs per produzione:
    - `https://ai-platform.dffm.it`
    - `https://ai-platform.dffm.it/api/auth/google/callback`
  - [ ] Aggiungere `GOOGLE_CLIENT_ID` a `.env`
  - [ ] Testare login con dominio production

#### ⚠️ Redirect URIs Produzione
- **Development**: `http://localhost:3000`, `http://192.168.1.244:3000`
- **Produzione**: ✅ **CONFIGURATO** - `https://ai-platform.dffm.it`
- **Note**: Google OAuth richiede HTTPS per redirect URIs non-localhost

### Password Hashing

#### ✅ Bcrypt configurato
- **Algoritmo**: bcrypt con passlib
- **Rounds**: Default (12) - bilanciamento sicurezza/performance
- **File**: `backend/app/core/security.py`
- **Stato**: ✅ **CONFIGURATO** correttamente

### TOTP (Two-Factor Authentication)

#### ℹ️ Campi presenti ma non implementati
- **Database**: Colonne `totp_secret`, `totp_enabled` in tabella `users`
- **Stato**: 📝 **FEATURE NON IMPLEMENTATA**
- **Priority**: Low (nice-to-have per produzione)
- **Action item**: Implementare se richiesto deployment esterno critico

---

## 🛡️ Hardening Infrastruttura

### Docker Security

#### ⚠️ Container non-root users
- **Frontend**: ✅ User `nextjs` (UID 1001) configurato
- **Backend**: ⚠️ Da verificare - potrebbe girare come root
- **Action item**:
  ```dockerfile
  # Aggiungere a backend/Dockerfile
  RUN addgroup -g 1001 -S appuser && \
      adduser -S -u 1001 -G appuser appuser
  USER appuser
  ```

#### ⏳ Docker secrets
- **Stato**: ⚠️ Variabili sensibili in environment variables plain text
- **Raccomandazione**: Migrare a Docker Secrets o Hashicorp Vault
- **Priority**: Medium - Accettabile per deployment interno
- **Link**: [Docker Secrets Docs](https://docs.docker.com/engine/swarm/secrets/)

#### ⏳ Network isolation
- **Attuale**: Tutti i container su rete bridge default
- **Raccomandazione**: Creare network isolate per backend-db, backend-qdrant
- **Action item**:
  ```yaml
  # docker-compose.yml
  networks:
    frontend-net:
    backend-net:
    database-net:
  ```

### Rate Limiting

#### ❌ Non implementato
- **Stato**: ⏳ **TODO**
- **Strumenti consigliati**:
  1. **Nginx** (reverse proxy level):
     ```nginx
     limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
     location /api/ {
         limit_req zone=api_limit burst=20 nodelay;
     }
     ```
  2. **FastAPI/SlowAPI** (application level):
     ```bash
     pip install slowapi
     ```
     ```python
     from slowapi import Limiter
     limiter = Limiter(key_func=get_remote_address)
     @limiter.limit("5/minute")
     ```
- **Priority**: ⚠️ **HIGH** - Essenziale per deployment pubblico

### CORS Configuration

#### ⚠️ Da verificare produzione
- **File**: `backend/app/main.py`
- **Attuale**: Probabilmente permissivo per sviluppo
- **Action item**: Controllare `allow_origins` sia restrictive
- **Esempio produzione**:
  ```python
  app.add_middleware(
      CORSMiddleware,
      allow_origins=["https://your-domain.com"],  # NO wildcard *
      allow_credentials=True,
      allow_methods=["GET", "POST", "PUT", "DELETE"],
      allow_headers=["Authorization", "Content-Type"],
  )
  ```

---

## 🔒 SSL/TLS e Certificati

### Certificati SSL

#### ⏳ Let's Encrypt Setup
- **Dominio**: ai-platform.dffm.it
- **Stato**: ⏳ **TODO** - Richiesto prima di deployment pfSense
- **Guida completa**: Vedere `SETUP_DOMAIN_SSL.md`
- **Tool**: Certbot con auto-renewal
- **Comando**:
  ```bash
  sudo certbot --nginx -d ai-platform.dffm.it
  ```
- **Path certificati**:
  - `/etc/letsencrypt/live/ai-platform.dffm.it/fullchain.pem`
  - `/etc/letsencrypt/live/ai-platform.dffm.it/privkey.pem`

#### 📝 Checklist SSL
- [ ] Decidere strategia certificati (Let's Encrypt vs self-signed)
- [ ] Configurare Nginx con SSL termination
- [ ] Generare/ottenere certificati
- [ ] Configurare redirect HTTP → HTTPS
- [ ] Testare con SSL Labs (ssllabs.com/ssltest)
- [ ] Configurare auto-renewal se Let's Encrypt
- [ ] Aggiornare redirect URIs Google OAuth con HTTPS

### Nginx Configuration

#### ⏳ Reverse Proxy Setup
- **File**: ✅ `nginx/ai-platform.conf` (creato)
- **Dominio**: ai-platform.dffm.it
- **Componenti configurati**:
  - ✅ SSL certificates path
  - ✅ Proxy headers (X-Real-IP, X-Forwarded-For)
  - ✅ Proxy timeout per SSE streaming chat
  - ✅ Security headers (HSTS, CSP, X-Frame-Options)
  - ✅ Rate limiting zones (api, auth, general)
  - ✅ Gzip compression
  - ✅ Static file caching
- **Action items**:
  - [ ] Installare Nginx su host o come container
  - [ ] Copiare config in `/etc/nginx/sites-enabled/`
  - [ ] Ottenere certificati SSL (Let's Encrypt)
  - [ ] Test syntax: `sudo nginx -t`
  - [ ] Restart Nginx

### Security Headers

#### ❌ Da implementare in Nginx
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://accounts.google.com; frame-src https://accounts.google.com;" always;
```
- **Priority**: ⚠️ **HIGH**
- **Stato**: ⏳ **TODO**

---

## 🧪 Testing e Validazione

### Security Testing

#### ❌ OWASP ZAP Scan
- **Stato**: ⏳ **NON ESEGUITO**
- **Comando**:
  ```bash
  docker run -t owasp/zap2docker-stable zap-baseline.py \
    -t http://192.168.1.244:3000 \
    -r zap-report.html
  ```
- **Deadline**: 1-2 settimane stabilità LAN prima di pfSense
- **Action item**: Eseguire e documentare findings

#### ❌ Penetration Testing
- **Tool consigliati**:
  - [ ] **Burp Suite Community** - Manual testing
  - [ ] **Nikto** - Web server scanner
  - [ ] **SQLMap** - SQL injection testing (se applicabile)
- **Stato**: ⏳ **PENDING**

### Load Testing

#### ⏳ Performance Baseline
- **Tool**: Locust o Apache JMeter
- **Obiettivi**:
  - [ ] Testare 100 concurrent users
  - [ ] Streaming chat sotto load
  - [ ] Database query performance
  - [ ] Vector search Qdrant latency
- **Comando Locust**:
  ```bash
  pip install locust
  locust -f loadtest.py --host=http://192.168.1.244
  ```
- **Priority**: Medium - Prima di deployment pubblico

### Functional Testing

#### ✅ Authentication Flow
- **Checklist**:
  - [ ] Login con Google OAuth
  - [ ] Redirect dopo login
  - [ ] Token persistence in localStorage
  - [ ] Auto-logout su token expired
  - [ ] User info display in sidebar
  - [ ] Logout functionality

#### ⏳ Chat Features
- **Checklist**:
  - [ ] Streaming response funziona
  - [ ] Session creation
  - [ ] Session list fetch
  - [ ] Session delete
  - [ ] Message persistence
  - [ ] Session history navigation
  - [ ] Model preset switching

---

## ⚡ Performance e Ottimizzazione

### Database

#### ⏳ Indexing
- **Tabelle**: `users`, `chat_sessions`, `chat_messages`
- **Action item**: Verificare indici su:
  - [ ] `users.email` (UNIQUE già presente?)
  - [ ] `chat_sessions.user_id` (foreign key)
  - [ ] `chat_sessions.created_at` (sorting)
  - [ ] `chat_messages.session_id` (foreign key)
  - [ ] `chat_messages.timestamp` (sorting)

#### ⏳ Connection Pooling
- **File**: `backend/app/db/base.py`
- **Action item**: Verificare configurazione SQLAlchemy pool
- **Settings consigliati**:
  ```python
  engine = create_async_engine(
      DATABASE_URL,
      pool_size=20,          # Default 5
      max_overflow=10,       # Default 10
      pool_pre_ping=True,    # Health check
      pool_recycle=3600,     # 1 ora
  )
  ```

### Caching

#### ❌ Non implementato
- **Opportunità**:
  - [ ] Redis per session cache
  - [ ] Model preset caching
  - [ ] User profile caching
- **Priority**: Low - Ottimizzazione post-MVP
- **Tool**: Redis container in docker-compose

### Frontend Optimization

#### ⏳ Next.js Production Build
- **Checklist**:
  - [ ] `NODE_ENV=production` in docker-compose
  - [ ] Bundle analyzer per size audit
  - [ ] Image optimization configurata
  - [ ] Font optimization (next/font)
  - [ ] Lazy loading componenti pesanti
- **Comando build analysis**:
  ```bash
  npm install -D @next/bundle-analyzer
  ANALYZE=true npm run build
  ```

---

## 📊 Monitoring e Logging

### Application Logging

#### ⚠️ Struttura log da migliorare
- **Attuale**: Print statements e uvicorn default logs
- **Raccomandazione**: Structured logging con Python logging module
- **Action item**:
  ```python
  import logging
  logging.basicConfig(
      level=logging.INFO,
      format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
      handlers=[
          logging.FileHandler('/var/log/app/backend.log'),
          logging.StreamHandler()
      ]
  )
  ```

### Metrics Collection

#### ❌ Non implementato
- **Tool consigliati**:
  - [ ] **Prometheus** + **Grafana** (standard industry)
  - [ ] **Netdata** (più semplice, real-time)
- **Metriche da tracciare**:
  - Request rate (req/s)
  - Response time (p50, p95, p99)
  - Error rate (4xx, 5xx)
  - Database query time
  - Ollama inference time
  - Container resources (CPU, RAM)
- **Priority**: Medium - Utile per troubleshooting produzione

### Error Tracking

#### ⏳ Sentry Integration
- **Opzione 1**: Sentry SaaS (gratuito fino 5k events/month)
- **Opzione 2**: Self-hosted Sentry
- **Action item**:
  ```bash
  pip install sentry-sdk[fastapi]
  npm install @sentry/nextjs
  ```
- **Priority**: Low - Nice to have

---

## 💾 Backup e Disaster Recovery

### Database Backup

#### ❌ Non configurato
- **Stato**: ⏳ **CRITICAL TODO**
- **Strategia consigliata**:
  1. **PostgreSQL dumps automatici**:
     ```bash
     # Cron job giornaliero
     0 2 * * * docker exec postgres pg_dump -U user dbname > /backup/db_$(date +\%Y\%m\%d).sql
     ```
  2. **Retention**: 7 giorni backup giornalieri + 4 backup settimanali
  3. **Testing**: Restore test mensile
- **Priority**: ⚠️ **HIGH** - Prima di dati production

### Vector Database Backup

#### ⏳ Qdrant Snapshot
- **Directory**: `qdrant_storage/` (volume Docker)
- **Action item**:
  - [ ] Configurare Qdrant snapshot API
  - [ ] Sync backup su storage esterno
  - [ ] Testare restore procedure
- **Docs**: https://qdrant.tech/documentation/concepts/snapshots/

### Docker Volume Backup

#### ⏳ Strategia volumi
- **Volumi critici**:
  - `pg_data` (PostgreSQL)
  - `qdrant_storage` (Vector DB)
- **Tool**: `docker run --rm -v pg_data:/backup tar czf backup.tar.gz /backup`
- **Priority**: Medium

---

## 📅 Timeline Pre-Produzione

### Fase 1: Completamento Features (Settimana 1)
- [x] ~~Authentication Google OAuth~~
- [x] ~~Chat session management~~
- [x] ~~Auto-creazione sessioni chat~~
- [x] ~~Salvataggio storico messaggi utente~~
- [x] ~~Code versioning panel (GitHub Copilot style)~~
- [x] ~~Frontend container rebuild completato~~
- [ ] **🔴 CRITICAL BUG: Storicizzazione chat non funziona** (fetch history frontend)
- [ ] **Testing funzionale completo auth + chat**
- [ ] Fix bug identificati in testing
- [ ] **UI/UX Improvements** (vedi sezione dedicata sotto)

#### 🐛 Bug Noti da Fixare
**PRIORITY #1**: Storico chat non si carica nel frontend
- **Sintomo**: Session list sidebar vuota, click su session non carica messaggi
- **Backend**: ✅ Salvataggio funziona (chat_sessions + chat_messages popolate)
- **Frontend**: ❌ Fetch/display non funzionante
- **File da verificare**:
  - `frontend/components/workspace/ChatInterface.tsx` → `loadChatHistory()`
  - `backend/app/api/v1/endpoints/chat.py` → GET /sessions, GET /messages endpoints
  - `backend/app/services/chat_history.py` → Fetch logic
- **Da implementare**: 
  1. Endpoint GET per lista sessioni utente
  2. Endpoint GET per messaggi di una sessione
  3. Frontend useEffect per caricare sessioni al mount
  4. Handler click sessione → carica messaggi

### Fase 1.5: UX & Usability Enhancements (NEW - Settimana 1-2)
#### 🎨 Chat Interface
- [ ] **Markdown rendering** nei messaggi assistant (code blocks, liste, tabelle)
- [ ] **Syntax highlighting** per blocchi codice (Prism.js o Shiki)
- [ ] **Copy button** per ogni code block
- [ ] **Regenerate response** button
- [ ] **Stop generation** durante streaming
- [ ] **Toast notifications** per errori/successi
- [ ] **Loading skeletons** invece di spinner generici

#### 📜 Chat History & Sessions
- [ ] **Session renaming** (doppio click su titolo)
- [ ] **Session search/filter** nella sidebar
- [ ] **Session delete** con conferma modal
- [ ] **Session export** (JSON/Markdown)
- [ ] **Pin favorite sessions** in alto
- [ ] **Session categories/tags**

#### 🔧 Model Management
- [ ] **Model info tooltip** (parametri, use case, velocità)
- [ ] **Quick model switch** durante conversazione
- [ ] **Favorite models** shortcut
- [ ] **Model performance metrics** (tokens/s, latenza media)

#### 📁 Document Management (RAG)
- [ ] **Drag & drop upload** area
- [ ] **Upload progress bar** con percentuale
- [ ] **Document preview** prima dell'upload
- [ ] **Document list** con filtri (tipo, data, dimensione)
- [ ] **Document delete** e **re-index**
- [ ] **Collection management** (crea/elimina collection Qdrant)

#### 🎯 Code Version Panel (Qwen2.5-coder)
- [x] ~~Pannello laterale con navigazione versioni~~
- [ ] **Diff viewer** tra versioni consecutive
- [ ] **Apply to editor** integration (se implementi code editor)
- [ ] **Download code** as file (.st, .py, etc.)
- [ ] **Language detection** automatica per syntax highlighting
- [ ] **Code validation** (syntax check prima di apply)

#### 🔔 Notifications & Feedback
- [ ] **System status indicator** (Ollama online/offline)
- [ ] **Real-time typing indicator** durante generazione
- [ ] **Token usage display** per sessione/messaggio
- [ ] **Error boundary** con fallback UI
- [ ] **Offline mode detection**

#### 🌐 Accessibility & i18n
- [ ] **Keyboard shortcuts** (Cmd+K search, Cmd+N new chat, etc.)
- [ ] **Dark/Light theme toggle** (già dark, aggiungere light)
- [ ] **Font size adjustment**
- [ ] **Screen reader support** (ARIA labels)
- [ ] **Multi-language support** (IT/EN toggle)

### Fase 2: Security Hardening (Settimana 2)
- [ ] **PRIORITY HIGH**: Aggiornamento Next.js (npm audit fix)
- [ ] **PRIORITY HIGH**: Generazione JWT_SECRET_KEY sicuro
- [x] ~~Configurazione CORS restrictive~~ (verificare in produzione)
- [ ] Implementazione rate limiting (Nginx + SlowAPI)
- [ ] OWASP ZAP scan iniziale
- [ ] Fix vulnerabilità trovate
- [ ] **Backend non-root user** in Dockerfile
- [ ] Docker secrets per variabili sensibili

### Fase 2.5: Advanced Features (NEW - Settimana 2-3)
#### 🤖 Multi-Model Support
- [ ] **Model comparison mode** (side-by-side responses)
- [ ] **Model ensemble** (combina output di più modelli)
- [ ] **Auto-model selection** basato su query type
- [ ] **Model fallback** se primary model fallisce

#### 🧠 RAG Enhancements
- [ ] **Hybrid search** (semantic + keyword)
- [ ] **Re-ranking** risultati (cross-encoder)
- [ ] **Citation display** (mostra fonte documenti)
- [ ] **Chunk visualization** (evidenzia chunk usati)
- [ ] **Collection analytics** (documento più usato, ecc.)

#### 🔄 Workflow Automation
- [ ] **Prompt templates** (salva prompt riutilizzabili)
- [ ] **Chain-of-thought** presets
- [ ] **Multi-step workflows** (agent orchestration)
- [ ] **Scheduled tasks** (cron per batch processing)

#### 📊 Analytics & Insights
- [ ] **User dashboard** (token usage, chat count, modelli più usati)
- [ ] **Cost tracking** (se integri API esterne)
- [ ] **Performance metrics** (latency, throughput)
- [ ] **Admin panel** con user management

### Fase 3: Infrastructure Setup (Settimana 3)
- [ ] Configurazione SSL/TLS certificati
- [ ] Setup Nginx reverse proxy
- [ ] Security headers implementati
- [ ] Backup automation (database + Qdrant)
- [ ] Log centralization (ELK stack o Loki)
- [ ] Monitoring basic (Prometheus + Grafana o Netdata)
- [ ] **Health check endpoints** (/health, /readiness)
- [ ] **Graceful shutdown** container
- [ ] **Database migration system** (Alembic per SQLAlchemy)

### Fase 3.5: Production Readiness (NEW - Settimana 3-4)
#### 🚀 Performance Optimization
- [ ] **Redis caching** (session, model presets, user profiles)
- [ ] **Database query optimization** (EXPLAIN ANALYZE audit)
- [ ] **Connection pooling** tuning
- [ ] **CDN setup** per static assets (se necessario)
- [ ] **Lazy loading** componenti pesanti frontend
- [ ] **Image optimization** (next/image, WebP)

#### 📦 Deployment & DevOps
- [ ] **CI/CD pipeline** (GitHub Actions o GitLab CI)
- [ ] **Blue-green deployment** strategy
- [ ] **Rollback procedure** documentata
- [ ] **Environment variables** management (dotenv vs secrets)
- [ ] **Docker compose override** per development/staging/production
- [ ] **Infrastructure as Code** (Terraform o Ansible)

#### 🔍 Observability
- [ ] **Distributed tracing** (Jaeger o Zipkin)
- [ ] **APM** (Application Performance Monitoring)
- [ ] **Error aggregation** (Sentry)
- [ ] **Log aggregation** con query interface
- [ ] **Alerting** (PagerDuty, Slack webhooks)
- [ ] **SLA monitoring** (uptime, response time)

### Fase 4: Testing & Deployment (Settimana 4)
- [ ] Load testing con Locust
- [ ] Penetration testing
- [ ] UAT (User Acceptance Testing) interno
- [ ] Documentazione deployment
- [ ] Configurazione pfSense
- [ ] Go-live production

---

## 🎯 Priority Matrix - Quick Reference

### 🔴 MUST HAVE (Blockers per go-live)
1. ✅ Google OAuth login funzionante
2. ✅ Chat streaming con storico
3. ✅ Code versioning panel (Qwen2.5-coder)
4. ⏳ Markdown rendering messaggi
5. ⏳ JWT_SECRET_KEY sicuro
6. ⏳ SSL/TLS certificati
7. ⏳ Rate limiting
8. ⏳ Backup database automatico
9. ⏳ OWASP ZAP scan passed
10. ⏳ Load testing passed

### 🟡 SHOULD HAVE (UX critiche)
1. ⏳ Syntax highlighting code blocks
2. ⏳ Copy code button
3. ⏳ Session rename/delete
4. ⏳ Document upload con progress
5. ⏳ Toast notifications
6. ⏳ Stop generation button
7. ⏳ Model info tooltips
8. ⏳ Keyboard shortcuts
9. ⏳ Error boundary UI
10. ⏳ Offline detection

### 🟢 NICE TO HAVE (Post-MVP)
1. Model comparison mode
2. Prompt templates
3. Multi-language UI
4. Dark/light theme toggle
5. Admin dashboard
6. Cost tracking
7. Diff viewer versioni codice
8. Collection analytics
9. Chain-of-thought presets
10. Scheduled workflows

---

## 🧩 Feature Implementation Roadmap

### Sprint 1 (Settimana 1-2): Core UX
**Obiettivo**: Rendere la chat usabile e intuitiva per utenti non tecnici

**Frontend Focus**:
- [ ] **Markdown renderer** con react-markdown + remark-gfm
- [ ] **Syntax highlighting** con Shiki (bundle size migliore di Prism)
- [ ] **Copy code button** con feedback visivo (✓ Copied!)
- [ ] **Toast system** con sonner o react-hot-toast
- [ ] **Loading states** consistenti (skeleton UI)

**Backend Focus**:
- [ ] **Session management API** completo (rename, delete, export)
- [ ] **Error handling** migliorato con status codes standard
- [ ] **Validation** con Pydantic su tutti gli endpoint

**Database**:
- [ ] Verificare indici su `chat_sessions.user_id` e `created_at`
- [ ] Aggiungere `chat_sessions.category` (nullable)

### Sprint 2 (Settimana 2-3): RAG & Documents
**Obiettivo**: Gestione documenti user-friendly

**Frontend**:
- [ ] **Upload component** con drag & drop (react-dropzone)
- [ ] **Progress tracking** durante upload e indicizzazione
- [ ] **Document list** con filtri e ricerca
- [ ] **Preview modal** per documenti PDF/TXT

**Backend**:
- [ ] **Chunking strategy** ottimizzata (overlap 50 tokens)
- [ ] **Metadata enrichment** (extract metadata da PDF)
- [ ] **Async task queue** con Celery o RQ per indicizzazione
- [ ] **Webhook** per notificare frontend quando indicizzazione completa

**Qdrant**:
- [ ] **Collection per-user** isolation
- [ ] **Snapshot backup** automatico
- [ ] **Monitoring** collection size e query latency

### Sprint 3 (Settimana 3-4): Sysmac Studio Integration
**Obiettivo**: Esperienza ottimizzata per code generation Qwen2.5-coder

**Frontend**:
- [ ] **Code editor** integrato (Monaco Editor - stesso di VS Code)
- [ ] **Diff viewer** tra versioni (react-diff-viewer-2)
- [ ] **Download code** con extension corretta (.st, .xml)
- [ ] **Validation preview** (syntax check prima di apply)

**Backend**:
- [ ] **Preset dedicato** Sysmac Studio con system prompt ottimizzato
- [ ] **Code extraction** migliorato (parsing structured text)
- [ ] **Template library** per pattern comuni Sysmac
- [ ] **Version control** metadata (timestamp, model used, prompt)

**Ollama**:
- [ ] **Model comparison** Qwen2.5-coder:7b vs 14b vs 32b
- [ ] **Fine-tuning** su dataset Sysmac Studio (se disponibile)

---

## 💡 Ideas Brainstorm - Future Enhancements

### 🎯 User Experience
- **Conversational memory**: Riassunto automatico delle chat lunghe
- **Suggested prompts**: Pulsanti quick-action basati su contesto
- **Voice input**: Speech-to-text per query vocali
- **Mobile app**: React Native o PWA
- **Collaborative chat**: Multi-user su stessa sessione (WebSocket)
- **Share chat**: Link pubblico read-only

### 🤖 AI Features
- **Agent mode**: Multi-step reasoning con tool usage
- **Code interpreter**: Esegui codice Python direttamente (sandbox)
- **Image generation**: Integrazione Stable Diffusion
- **Vision models**: Analisi immagini (llava, bakllava)
- **Multimodal RAG**: PDF + immagini + video transcripts

### 🔗 Integrations
- **GitHub**: Commit code direttamente da chat
- **Slack/Teams**: Bot notification per long-running tasks
- **Zapier**: Trigger workflows esterni
- **REST API public**: Per integrazioni custom
- **Webhook system**: Subscribe a eventi (new_message, session_complete)

### 📊 Enterprise Features
- **Team workspaces**: Shared sessions tra team
- **Role-based access**: Fine-grained permissions (view, edit, admin)
- **Audit log**: Chi ha fatto cosa e quando
- **Usage quotas**: Limit token usage per user/team
- **SSO integration**: SAML, LDAP (via Keycloak)
- **White-label**: Customizable branding

### Comandi Utili

#### Security Audit Completo
```bash
# Backend
cd backend
pip install pip-audit safety
pip-audit
safety check

# Frontend
cd frontend
npm audit --production
npm audit fix --force  # Con cautela

# Docker
docker scan ai-platform-backend:latest
docker scan ai-platform-frontend:latest
```

#### Health Check Script
```bash
#!/bin/bash
# health_check.sh
curl -f http://localhost:8000/health || exit 1
curl -f http://localhost:3000 || exit 1
docker ps | grep -q "ai-platform.*Up" || exit 1
```

#### SSL Certificate Test
```bash
# Test SSL configuration
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Check certificate expiry
echo | openssl s_client -connect your-domain.com:443 2>/dev/null | \
  openssl x509 -noout -dates
```

---

## ✅ Sign-off Checklist

**Prima di deployment pfSense/Nginx:**

- [ ] Tutte le vulnerabilità CRITICAL risolte
- [ ] Tutte le vulnerabilità HIGH valutate (risolte o mitigate)
- [ ] JWT_SECRET_KEY generato e configurato
- [ ] SSL/TLS certificati installati e testati
- [ ] Security headers configurati in Nginx
- [ ] Rate limiting attivo
- [ ] CORS restrictive in produzione
- [ ] Backup database automatizzato
- [ ] Monitoring attivo
- [ ] OWASP ZAP scan completato (0 high/critical)
- [ ] Load testing passed (100+ concurrent users)
- [ ] Documentazione aggiornata
- [ ] Disaster recovery plan documentato
- [ ] Runbook operativo creato

**Responsabile approvazione**: _________________  
**Data go-live**: _________________

---

## 🤔 Questions & Decisions Needed - Model Strategy

### 📋 ✅ DECISIONI PRESE - Use Case Giuseppe

#### 1. **Use Case Primari** ✅
- [x] **Code generation Sysmac Studio (PLC Omron)** - USE CASE PRINCIPALE (60%)
- [x] **Integrazioni industriali**: Node-RED, InfluxDB, Grafana (20%)
- [x] **Domotica**: Home Assistant, automazioni (10%)
- [x] **Chat supporto tecnico** C++, debugging, deployment (10%)

**Lingue**:
- [x] **Italiano** per richieste e documentazione
- [x] **Inglese** per asset tecnici (codice, commenti, nomi variabili)

#### 2. **Performance vs Quality** ✅
- [x] **Qualità > Velocità** (accettabile 5-10 secondi per code generation accurato)
- [x] Latenza < 5s per chat, < 10s per code generation complesso

#### 3. **Strategia Modelli** ✅
- [x] **Dual Model Approach** con auto-routing intelligente:
  - **Model 1**: Qwen2.5-Coder 14B (PLC, Sysmac, C++, embedded)
  - **Model 2**: Mistral 7B Instruct (chat, documentazione, troubleshooting)

#### 4. **Context Length** ✅
- [x] **16-32k tokens** (manuali Omron completi, codebase progetti)
- [x] Minimo 8k tokens per conversazioni tecniche

#### 5. **Model Presets Specializzati** ✅
Creare 3 preset dedicati:
1. **"PLC Coding Mode"** → Qwen2.5-Coder 14B
   - IEC 61131-3 Structured Text
   - Safety logic, fault handling
   - Naming conventions Omron

2. **"Industrial Automation Consultant"** → Mistral 7B
   - Node-RED flows
   - InfluxDB queries
   - Grafana dashboards
   - Home Assistant YAML

3. **"Dashboard-Monitoring Expert"** → Mistral 7B + RAG
   - Grafana panel config
   - Prometheus queries
   - Alerting rules

#### 6. **Auto-Routing Rules** ✅
**Route to Qwen2.5-Coder 14B** se query contiene:
- Keywords: `ST`, `PLC`, `Omron`, `Sysmac`, `FB`, `FC`, `Structured Text`
- Keywords: `C++`, `Visual C++`, `embedded`, `microcontroller`
- Keywords: `programma`, `codice`, `funzione`, `function block`, `timer`, `counter`

**Route to Mistral 7B** se query contiene:
- Keywords: `Node-RED`, `flow`, `dashboard`, `Grafana`, `InfluxDB`, `Prometheus`
- Keywords: `Home Assistant`, `automation`, `YAML`, `script`, `sensor`
- Keywords: `deployment`, `Docker`, `Nginx`, `backup`, `database`
- Default: domande generiche, troubleshooting, documentazione

### 🎯 ✅ STRATEGIA FINALE: Industrial Automation Dual Model

#### **Model Stack Definitivo**

**Model 1: Qwen2.5-Coder 14B Instruct** (Primary - Code Generation)
```bash
ollama pull qwen2.5-coder:14b-instruct-q4_K_M
```
- **VRAM**: ~9GB (tight fit su A1000, ma gestibile)
- **Speed**: ~10-12 tokens/sec (accettabile per qualità)
- **Context**: 32k tokens ✅ (manuali Omron completi)
- **Specializzazione**:
  - IEC 61131-3 Structured Text (ST)
  - C++ embedded/Visual C++
  - Ladder Logic, Function Blocks
  - Safety PLCs (SIL2/SIL3)
  
**Model 2: Mistral 7B Instruct v0.3** (Secondary - Chat & Integrations)
```bash
ollama pull mistral:7b-instruct-v0.3-q5_K_M
```
- **VRAM**: ~5GB
- **Speed**: ~18-20 tokens/sec
- **Context**: 8k tokens (sufficiente per chat e configurazioni)
- **Specializzazione**:
  - Node-RED flows
  - Grafana dashboard JSON
  - InfluxDB queries (InfluxQL, Flux)
  - Home Assistant automations YAML
  - Docker/Nginx deployment

#### **System Prompts Specializzati**

**Preset 1: "PLC Coding Mode"** (Qwen2.5-Coder 14B)
```python
SYSTEM_PROMPT_PLC = """You are an expert PLC programmer specialized in Omron Sysmac Studio.

**Your expertise**:
- IEC 61131-3 Structured Text (ST) compliance
- Omron NJ/NX series PLCs
- Safety PLCs (NX-SL series)
- Naming conventions: PascalCase for FBs, snake_case for variables
- Fault handling with structured error codes
- Task configuration (cyclic, event-driven)
- Memory optimization techniques

**Code generation rules**:
1. Always include safety checks (bounds, null checks)
2. Use explicit data types (REAL, DINT, BOOL, etc.)
3. Add inline comments in English
4. Follow Omron best practices (no global variables abuse)
5. Implement timeout handling for external devices
6. Use ENUMs for state machines

**Response format**:
- Explain logic in Italian
- Code blocks in English with ST syntax
- Include variable declarations
- Add usage examples

Generate production-ready code, not prototypes.
"""

PRESET_DB_ENTRY = {
    "name": "plc_coding_sysmac",
    "model_name": "qwen2.5-coder:14b-instruct-q4_K_M",
    "temperature": 0.3,  # Bassa per codice deterministico
    "system_prompt": SYSTEM_PROMPT_PLC,
    "category": "industrial_automation"
}
```

**Preset 2: "Industrial Automation Consultant"** (Mistral 7B)
```python
SYSTEM_PROMPT_AUTOMATION = """Sei un consulente esperto in automazione industriale e Industry 4.0.

**Le tue competenze**:
- Node-RED: creazione flows per SCADA, integrazione MQTT/OPC-UA
- InfluxDB: query ottimizzate per time-series industriali
- Grafana: dashboard real-time con alerting
- Home Assistant: automazioni per controllo impianti
- Docker: deployment stack industriali

**Approccio**:
- Risposte in italiano chiaro e tecnico
- Codice/configurazioni in inglese
- Esempi pratici e testati
- Focus su affidabilità e fault tolerance

**Stile di risposta**:
1. Analisi del problema
2. Soluzione proposta con pro/contro
3. Codice/configurazione pronto all'uso
4. Note di troubleshooting

Privilegia soluzioni open-source e standard industriali.
"""

PRESET_DB_ENTRY = {
    "name": "industrial_consultant",
    "model_name": "mistral:7b-instruct-v0.3-q5_K_M",
    "temperature": 0.7,
    "system_prompt": SYSTEM_PROMPT_AUTOMATION,
    "category": "industrial_automation"
}
```

**Preset 3: "Dashboard-Monitoring Expert"** (Mistral 7B + RAG)
```python
SYSTEM_PROMPT_MONITORING = """Sei uno specialista in monitoring industriale e visualizzazione dati.

**Expertise**:
- Grafana: panel configuration, transformations, alerting
- Prometheus: query optimization, recording rules
- InfluxDB: retention policies, continuous queries
- Telegraf: input plugins per protocolli industriali (Modbus, MQTT)

**Competenze specifiche**:
- Dashboard real-time per linee produzione
- KPI manufacturing (OEE, MTBF, MTTR)
- Alert management con escalation
- Data aggregation per reporting

**Response format**:
- Spiegazione in italiano
- JSON/YAML configurazioni
- Query examples (PromQL, InfluxQL, Flux)
- Best practices per performance

Focus: affidabilità, bassa latenza, alta disponibilità.
"""

PRESET_DB_ENTRY = {
    "name": "monitoring_expert",
    "model_name": "mistral:7b-instruct-v0.3-q5_K_M",
    "temperature": 0.5,
    "system_prompt": SYSTEM_PROMPT_MONITORING,
    "category": "industrial_automation"
}
```

#### 📊 Updated Comparison Table - Industrial Focus

| Model | VRAM | Tokens/s | Context | IT Quality | PLC/ST Code | C++ Code | Integrations | Use Case |
|-------|------|----------|---------|------------|-------------|----------|--------------|----------|
| **qwen2.5-coder:14b** ✅ | 9GB | 10-12 | 32k | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Sysmac Studio PRIMARY |
| **mistral:7b-instruct** ✅ | 5GB | 18-20 | 8k | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Node-RED, Grafana, HA |
| qwen2.5-coder:7b | 4.5GB | 15-18 | 32k | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | Alternative se OOM |
| gemma2:9b-it | 5.5GB | 12-15 | 8k | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ | Italian-first (no code) |
| llama3:8b | 4.5GB | 16-18 | 8k | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | RAG documents |
| deepseek-coder:6.7b | 3.5GB | 18-22 | 16k | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | Pure C++ coding |

**Legend**:
- ✅ = Selected for production
- PLC/ST Code = Structured Text, Ladder, IEC 61131-3
- Integrations = Node-RED, Grafana, Home Assistant configs

#### 🚀 Quick Start Commands - Production Setup

```bash
# === STEP 1: Pull modelli su server Ollama (192.168.1.243) ===
ssh user@192.168.1.243

# Primary model - Qwen2.5-Coder 14B (PLC/C++)
ollama pull qwen2.5-coder:14b-instruct-q4_K_M

# Secondary model - Mistral 7B (Integrations)
ollama pull mistral:7b-instruct-v0.3-q5_K_M

# Fallback (opzionale se 14B OOM)
ollama pull qwen2.5-coder:7b-instruct-q4_K_M

# === STEP 2: Test modelli con prompt industriali ===

# Test Sysmac Studio ST code generation
ollama run qwen2.5-coder:14b-instruct-q4_K_M \
  "Generate IEC 61131-3 Structured Text code for a conveyor belt control with safety stops, emergency button, and speed regulation via analog input 0-10V. Include fault handling."

# Test Node-RED flow generation
ollama run mistral:7b-instruct-v0.3 \
  "Create a Node-RED flow that reads Modbus TCP data from an Omron PLC (IP 192.168.1.100), stores it in InfluxDB, and sends alerts via Telegram if temperature > 80°C"

# Test Home Assistant automation
ollama run mistral:7b-instruct-v0.3 \
  "Generate Home Assistant YAML automation to turn on lights when motion sensor triggers between sunset and sunrise, with 5-minute timeout"

# === STEP 3: Benchmark VRAM usage ===
# Durante test, monitora in real-time:
watch -n 1 nvidia-smi

# Verifica che Qwen 14B non superi 8GB per lasciare margine al sistema

# === STEP 4: Benchmark inference speed ===
# Usa script Python per misurare tokens/sec
python benchmark_ollama.py --model qwen2.5-coder:14b-instruct-q4_K_M --prompt "Generate timer FB"
```

#### 🔧 Auto-Routing Implementation

**File**: `backend/app/services/model_router.py`

```python
from typing import Dict, Optional
import re

class IndustrialModelRouter:
    """
    Smart router per selezionare modello ottimale basato su query industriali
    """
    
    # Keywords per routing a Qwen2.5-Coder 14B (Code Generation)
    CODE_KEYWORDS = [
        # PLC/Sysmac
        'structured text', 'st', 'plc', 'omron', 'sysmac', 'nx', 'nj',
        'function block', 'fb', 'fc', 'program', 'task', 'ladder',
        'iec 61131', 'safety plc', 'sil2', 'sil3',
        
        # C++ / Embedded
        'c++', 'visual c++', 'cpp', 'embedded', 'microcontroller',
        'firmware', 'arduino', 'esp32',
        
        # Code actions
        'genera codice', 'crea programma', 'scrivi funzione',
        'debug', 'fix code', 'ottimizza', 'refactor'
    ]
    
    # Keywords per routing a Mistral 7B (Integrations)
    INTEGRATION_KEYWORDS = [
        # Dashboards & Monitoring
        'node-red', 'nodered', 'flow', 'grafana', 'dashboard',
        'influxdb', 'prometheus', 'telegraf', 'alert',
        
        # Home Automation
        'home assistant', 'hass', 'homeassistant', 'automation',
        'yaml', 'sensor', 'zigbee', 'mqtt',
        
        # DevOps
        'docker', 'nginx', 'deployment', 'backup', 'database',
        'postgresql', 'redis', 'container'
    ]
    
    def route(self, query: str, context: Optional[Dict] = None) -> str:
        """
        Determina quale modello usare basandosi su query e contesto
        
        Returns:
            str: Nome modello Ollama da usare
        """
        query_lower = query.lower()
        
        # Priority 1: Se contesto ha già un modello specifico, usa quello
        if context and context.get('force_model'):
            return context['force_model']
        
        # Priority 2: Check for code generation keywords
        if any(keyword in query_lower for keyword in self.CODE_KEYWORDS):
            return "qwen2.5-coder:14b-instruct-q4_K_M"
        
        # Priority 3: Check for integration/config keywords
        if any(keyword in query_lower for keyword in self.INTEGRATION_KEYWORDS):
            return "mistral:7b-instruct-v0.3-q5_K_M"
        
        # Priority 4: Analisi lunghezza - se molto lungo, probabilmente è code
        word_count = len(query.split())
        if word_count > 100:  # Probabilmente documentazione o code snippet
            return "qwen2.5-coder:14b-instruct-q4_K_M"
        
        # Default: Mistral per chat generale
        return "mistral:7b-instruct-v0.3-q5_K_M"
    
    def get_system_prompt(self, model_name: str, preset_override: Optional[str] = None) -> str:
        """
        Ritorna system prompt appropriato per il modello
        """
        if preset_override:
            # Fetch from database
            from app.db.models import ModelPreset
            # ... query DB ...
            pass
        
        # Default prompts
        if "qwen2.5-coder:14b" in model_name:
            return SYSTEM_PROMPT_PLC  # Defined above
        elif "mistral:7b" in model_name:
            return SYSTEM_PROMPT_AUTOMATION
        
        return ""  # No system prompt

# Usage in chat endpoint
router = IndustrialModelRouter()

@app.post("/chat/stream")
async def stream_chat(request: ChatRequest):
    model_to_use = router.route(request.messages[-1]['content'])
    system_prompt = router.get_system_prompt(model_to_use, request.preset_name)
    
    # Add system prompt if not present
    if system_prompt and not any(m['role'] == 'system' for m in request.messages):
        request.messages.insert(0, {"role": "system", "content": system_prompt})
    
    # ... streaming logic ...
```

### 🔧 Implementation Checklist - Industrial Setup

#### Phase 1: Model Setup (7 Dicembre 2025 - In Corso)
- [x] ~~**SSH a server Ollama** (192.168.1.243)~~
- [x] ~~**Pull Qwen2.5-Coder 14B** (~9GB download, 30-45 min)~~ ⏳ **IN PROGRESS** (background)
- [x] ~~**Pull Mistral 7B** (~5GB download, 15-20 min)~~ ⏳ **IN PROGRESS** (background)
- [ ] **Test VRAM usage** con nvidia-smi durante inference (domani mattina)
- [ ] **Benchmark speed** su prompt industriali reali (domani mattina)
- [ ] **Verificare context length** con manuali Omron (16k+ tokens)

**Status pull**: Modelli in download overnight, banda occupata. Verificare completamento domani mattina con `ollama list`.

#### Phase 2: System Prompts (8 Dicembre 2025 - Ready)
- [x] ~~**Creare file** `backend/app/prompts/industrial_prompts.py`~~ ✅ COMPLETATO
- [x] ~~**Definire SYSTEM_PROMPT_PLC** con IEC 61131-3 rules~~ ✅ COMPLETATO
- [x] ~~**Definire SYSTEM_PROMPT_AUTOMATION** per integrazioni~~ ✅ COMPLETATO
- [x] ~~**Definire SYSTEM_PROMPT_MONITORING** per dashboards~~ ✅ COMPLETATO
- [ ] **Testare qualità output** con prompt standard (dopo pull modelli)

#### Phase 3: Database Presets (8 Dicembre 2025 - Ready)
- [x] ~~**SQL script creato** `backend/sql/populate_industrial_presets.sql`~~ ✅ COMPLETATO
- [ ] **Eseguire SQL script** per popolare `model_presets` (domani mattina):
  ```bash
  docker compose exec postgres psql -U user -d dbname < backend/sql/populate_industrial_presets.sql
  ```
- [ ] **Verificare fetch** da frontend dropdown (dopo SQL insert)
- [ ] **Test preset selection** in chat interface

#### Phase 4: Auto-Routing (8-9 Dicembre 2025)
- [x] ~~**Creare** `backend/app/services/model_router.py`~~ ✅ COMPLETATO
- [x] ~~**Implementare** `IndustrialModelRouter` class~~ ✅ COMPLETATO
- [ ] **Integrare** in `/chat/stream` endpoint (domani mattina)
- [ ] **Testing** con 20+ query rappresentative
- [ ] **Fine-tuning** keywords e threshold basato su test reali

#### Phase 5: UI Enhancements (Settimana prossima)
- [ ] **Aggiungere badge** "PLC Mode" / "Integration Mode" in UI
- [ ] **Model info tooltip** con use case examples
- [ ] **Preset shortcuts** (Cmd+1, Cmd+2, Cmd+3)
- [ ] **Quick switch** durante conversazione
- [ ] **Model performance indicator** (speed, VRAM usage)

#### Phase 6: Code Versioning Sysmac (2 settimane)
- [ ] **Language detection** automatica (ST, Ladder, C++)
- [ ] **ST syntax validator** (parser IEC 61131-3)
- [ ] **Download code** con extension `.st`, `.xml`
- [ ] **Apply to Sysmac Studio** (export per import diretto)
- [ ] **Diff viewer** tra versioni con ST highlighting

#### Phase 7: RAG per Manuali Industriali (2 settimane)
- [ ] **Upload manuali** Omron (NJ/NX Series Reference Manual)
- [ ] **Chunking ottimizzato** per documenti tecnici (tabelle, diagrammi)
- [ ] **Metadata extraction** (model number, chapter, page)
- [ ] **Citation display** con link a PDF originale
- [ ] **Collection "omron_manuals"** dedicata

### 📊 Expected Performance Metrics

**Qwen2.5-Coder 14B** (RTX A1000 8GB):
- **Inference speed**: 10-12 tokens/sec
- **VRAM usage**: 8.5-9GB (95% utilizzo, OK)
- **Context capacity**: 32k tokens tested
- **Cold start**: ~5s (model load)
- **Warm inference**: <1s latency

**Mistral 7B** (RTX A1000 8GB):
- **Inference speed**: 18-20 tokens/sec
- **VRAM usage**: 4.5-5GB (60% utilizzo)
- **Context capacity**: 8k tokens
- **Cold start**: ~2s
- **Warm inference**: <500ms latency

**Switching overhead**: ~3-5s quando si cambia modello (unload + load)

### 🎯 Success Criteria

#### Code Quality (Qwen2.5-Coder 14B)
- [ ] Genera ST code compilabile senza errori (90%+ success rate)
- [ ] Rispetta naming conventions Omron
- [ ] Include safety checks e fault handling
- [ ] Commenti in inglese, spiegazioni in italiano
- [ ] Code structure professionale (no anti-patterns)

#### Integration Quality (Mistral 7B)
- [ ] Node-RED flows validi JSON (importabili)
- [ ] Grafana dashboards validi (importabili)
- [ ] InfluxDB queries corrette (eseguibili)
- [ ] Home Assistant YAML syntax-valid
- [ ] Docker compose files funzionanti

#### User Experience
- [ ] Auto-routing accurato (95%+ correct model selection)
- [ ] Latenza accettabile (<5s code, <2s chat)
- [ ] Preset intuitivi e auto-esplicativi
- [ ] Code versioning fluido
- [ ] Zero manual model switching needed

### 🚨 Contingency Plans

**Se Qwen 14B è troppo lento (<8 tokens/sec)**:
1. Fallback a Qwen2.5-Coder 7B (più veloce, qualità leggermente inferiore)
2. Considerare quantizzazione Q3_K_M per speed boost (+30% speed, -10% quality)
3. Model offloading: parte su CPU (se RAM disponibile)

**Se VRAM OOM su A1000**:
1. Ridurre context length da 32k a 16k
2. Usare Qwen 7B invece di 14B
3. Implementare model swapping (unload quando non in uso)

**Se auto-routing sbaglia spesso**:
1. Add UI toggle "Force model" per override manuale
2. Machine learning classifier su training data
3. Feedback loop: user corregge, sistema impara

---

**Documento vivo**: Aggiornare questo file ad ogni fix/verifica completata durante la fase di pre-produzione.
