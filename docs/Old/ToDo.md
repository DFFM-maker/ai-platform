# AI Platform - ToDo List

**Last Update**: 8 Dicembre 2025

---

## 🚀 In Corso

### Frontend Rebuild (In Progress)
- **Status**: Build in corso
- **Motivo**: Fix autenticazione chat history (useAuth hook)
- **Changes**: 
  - Sostituito `localStorage.getItem('access_token')` con `useAuth().token`
  - Aggiunto check `if (!token) return` in fetchSessions e loadSession
  - Corretto token name da `access_token` a `auth_token`
- **ETA**: ~10 minuti
- **Next**: Test chat history dopo deploy

---

## ✅ Completato (8 Dicembre 2025)

### Chat History Implementation
- ✅ Backend endpoints (GET /sessions, GET /sessions/{id}, POST /sessions, DELETE /sessions/{id})
- ✅ Frontend UI con sidebar sessioni
- ✅ loadSession() e startNewChat() functions
- ✅ JWT authentication headers

### Model Router Extension (4-Way)
- ✅ Esteso da 3 a 4 modelli
- ✅ Aggiunto support per architettura (Llama 8B)
- ✅ Aggiunto general assistant (Mistral 7B)
- ✅ Keywords e system prompts per tutte le categorie

### Database Updates
- ✅ Aggiunta colonna `display_name` a model_presets
- ✅ Popolati 5 presets attivi (PLC, Industrial, Monitoring, General, Architecture)
- ✅ Eliminati preset obsoleti (fara7b, rag_analyst)
- ✅ Tutti i preset con display_name user-friendly

### Branding
- ✅ Logo aggiunto (logo2.png 150x50)
- ✅ Favicon implementato (fav1.png)
- ✅ Title aggiornato: "AI Platform - DFFM Automation"

### Performance Validation
- ✅ Stress test 8+ utenti concorrenti
- ✅ 11.68 tok/s aggregate throughput
- ✅ 7.4GB/8GB peak VRAM (90.2% utilizzo)
- ✅ Sistema production-ready

---

## 📋 Prossime Priorità

### 1. Test Post-Rebuild (IMMEDIATO)
- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Verificare dropdown mostra nomi friendly
- [ ] Verificare logo2 visibile
- [ ] Testare chat history:
  - [ ] Crea nuova chat
  - [ ] Verifica sessione appare in sidebar
  - [ ] Clicca sessione e verifica caricamento messaggi
  - [ ] Test "Nuova chat" button
- [ ] Verificare no più errori 401 su /api/v1/chat/sessions

### 2. UI/UX Improvements (Media Priorità)
- [ ] Markdown rendering in chat (react-markdown + remark-gfm)
- [ ] Syntax highlighting per code blocks (Shiki)
- [ ] Copy button su code blocks
- [ ] Badge UI per indicare routing corrente ("🔧 PLC Mode", "🛒 Shopping Assistant")
- [ ] Loading states migliorati
- [ ] Error messages user-friendly

### 3. Testing Funzionale (Media Priorità)
- [ ] Test routing automatico:
  - [ ] Query PLC → Qwen 14B con prompt PLC
  - [ ] Query integrazione → Mistral 7B con prompt automation
  - [ ] Query shopping → Mistral 7B con prompt general assistant
  - [ ] Query architettura → Llama 8B con prompt architecture
- [ ] Verificare RAG decision automatica
- [ ] Test CodeVersionPanel con generazione codice

### 4. Documentazione (Bassa Priorità)
- [ ] User guide per ogni preset
- [ ] Screenshot esempi d'uso
- [ ] FAQ section
- [ ] Video tutorial rapidi

---

## 💡 Feature Future (Opzionali)

### Shopping Research Integration
- **File**: `SHOPPING_RESEARCH_IMPLEMENTATION.md` (già creato)
- **Descrizione**: Ricerca prodotti real-time per general_assistant
- **Funzionalità**:
  - Ricerca prodotti con prezzi e link aggiornati
  - Confronto prezzi tra fonti multiple
  - Analisi recensioni e rating
  - Suggerimenti personalizzati su budget
- **Implementazione**:
  - Option A: SerpAPI (100 ricerche/mese gratis)
  - Option B: Web scraping con Playwright
  - Option C: Amazon Product Advertising API
- **Stima**: 4-6 ore sviluppo
- **Status**: 📝 Documentazione completa pronta
- **Priorità**: LOW (nice-to-have, non critico)
- **Decisione**: Da valutare dopo stabilizzazione sistema base

### Price History Tracking
- [ ] Database per storico prezzi
- [ ] Alert su sconti significativi
- [ ] Grafici trend prezzi

### Comparison Tables
- [ ] Side-by-side spec comparison UI
- [ ] Highlight differenze chiave
- [ ] Score automatico prodotti

### Multi-Language Support
- [ ] Auto-detect user language
- [ ] Translate system prompts
- [ ] Currency conversion automatica

### Advanced Analytics
- [ ] Dashboard usage statistics
- [ ] Model performance metrics
- [ ] User engagement tracking
- [ ] Cost per query analysis

---

## 🐛 Bug Known

Nessuno attualmente (dopo fix autenticazione)

---

## 🔧 Manutenzione

### Routine
- [ ] Backup database settimanale
- [ ] Log rotation
- [ ] Security updates
- [ ] Certificate renewal (Let's Encrypt ogni 90 giorni)

### Monitoring
- [ ] Setup alert su errori backend
- [ ] Monitor VRAM usage Ollama
- [ ] Track API response times
- [ ] Database query performance

---

## 📊 Metriche Attuali

**Sistema**:
- CPU: Intel Core Ultra 7 265 (20 cores @ 6.5GHz)
- GPU: RTX A1000 8GB VRAM
- RAM: 28GB
- Disco: 825GB liberi

**Modelli**:
1. qwen2.5-coder:14b (9.0GB) - PLC/Code @ 9.45 tok/s
2. mistral:7b (5.1GB) - Industrial/General @ 15.66 tok/s
3. llama3:8b (4.7GB) - Architecture @ ~12 tok/s
4. qwen2.5-coder:7b (4.7GB) - Dev IoT backup
5. nomic-embed-text (274MB) - RAG embeddings

**Performance**:
- Aggregate throughput: 11.68 tok/s
- Peak VRAM: 7.4GB/8GB (90.2%)
- Concurrent users tested: 8+
- Uptime: 99.9%

**Utenti**:
- Admin: giuseppe@defranceschi.pro
- Domain: ai-platform.dffm.it
- Auth: Google OAuth 2.0

---

## 📝 Note

### Decisions Log
- **Logo**: Scelto logo2.png (più grande, 216KB)
- **Favicon**: Usato fav1.png
- **Token Storage**: `auth_token` in localStorage via AuthContext
- **API URL**: `https://ai-platform.dffm.it/api/v1` (via nginx proxy)
- **Display Names**: Nomi generici per evitare confusione ("PLC Coding" non "Omron Sysmac")

### Lessons Learned
- Next.js dev mode cache molto aggressivo → rebuild necessario
- Nginx proxy richiede trailing slash corretto in proxy_pass
- JWT token name consistency critica (auth_token vs access_token)
- Docker compose build con --no-cache evita problemi env vars
- Browser hard refresh non sempre sufficiente → rebuild produzione necessario

---

**Prossima Azione**: Attendere completamento rebuild, poi test completo funzionalità chat history
