Ecco una scaletta cronologica precisa (Roadmap) per implementare il sistema di Versioning, organizzata per dipendenze logiche.

Si parte dal "basso" (Database) per salire verso la "superficie" (UI), garantendo che ogni step sia testabile prima di passare al successivo.

🟢 FASE 1: Fondamenta Dati (Backend)
Obiettivo: Predisporre il database per ospitare le versioni senza rompere la chat attuale.

Modifica Modelli SQLAlchemy (backend/app/db/models.py)

Aggiungere la classe/tabella ChatResponseVersion.

Definire le relazioni: ChatMessage (1) <-> (N) ChatResponseVersion.

Aggiungere i campi chiave: content, version_number, is_current.

Azione tecnica: Generare la migrazione (Alembic) o aggiornare lo schema.

Aggiornamento Logica Salvataggio (backend/app/services/chat_history_service.py)

Modificare add_message: quando si salva un nuovo messaggio, creare automaticamente anche la Versione 1 nella tabella ChatResponseVersion.

🟡 FASE 2: API Business Logic (Backend)
Obiettivo: Esporre le funzioni per navigare e manipolare la storia.

Endpoint Lettura Versioni (backend/app/api/v1/endpoints/chat.py)

Creare GET /chat/messages/{message_id}/versions: restituisce la lista ordinata delle versioni.

Endpoint Creazione Versione (Edit)

Creare POST /chat/messages/{message_id}/versions: accetta nuovo contenuto, crea una nuova versione (es. v2), incrementa il contatore e la imposta come is_current=True.

Endpoint Restore/Switch

Creare POST /chat/versions/{version_id}/restore:

Imposta is_current=False su tutte le versioni di quel messaggio.

Imposta is_current=True sulla versione target.

CRUCIALE: Sovrascrive il campo content del ChatMessage padre (per mantenere la coerenza con la memoria dell'LLM).

🔵 FASE 3: UI "Light" - Quick Switcher (Frontend)
Obiettivo: Permettere la navigazione rapida senza aprire pannelli complessi.

Adattamento Interfaccia Dati (frontend/components/workspace/ChatInterface.tsx)

Aggiornare l'interfaccia Message nello stato React per includere versions_count e current_version_index.

Componente Switcher (< 2 / 2 >)

Creare un piccolo componente UI sotto il messaggio.

Collegare le frecce agli endpoint API creati in Fase 2.

Risultato: L'utente può cliccare "<" e vedere il testo del messaggio cambiare istantaneamente.

🟣 FASE 4: UI "Pro" - Canvas & Diff (Frontend)
Obiettivo: L'esperienza "Copilot" completa per editing avanzato.

Refactoring Pannello Laterale (frontend/components/CodeVersionPanel.tsx)

Trasformarlo in VersionHistoryPanel.

Invece di mostrare solo codice statico, deve mostrare la lista delle versioni cliccabili con timestamp e autore.

Integrazione Monaco Diff

Nel pannello, integrare <DiffEditor /> (di @monaco-editor/react, già nel tuo package.json).

Configurarlo per mostrare: Sinistra (Previous) vs Destra (Current).

Editing Manuale (Debounce)

Implementare la logica: quando l'utente clicca "Modifica" (matita), apre il testo in un editor.

Al salvataggio, chiama l'API di Fase 2 (Creazione Versione).

🏁 FASE 5: Testing & Rilascio
Test del Flusso di Contesto

Verifica critica: Modifica un messaggio a metà conversazione -> Rigenera la risposta successiva -> Verifica che l'LLM stia rispondendo alla nuova versione modificata e non a quella vecchia.

# TODO-list: Versioning Canvas per Chat (Stile Copilot) - Aggiornato

## 1. UI/UX Design
- [ ] **Layout Canvas**: Definire layout split view o slide-over per il pannello "Inspector" a destra.
- [ ] **Inspector Unificato**: Evolvere il componente `CodeVersionPanel` esistente in un pannello generico che mostra lo storico modifiche del messaggio selezionato.
- [ ] **Quick Switcher (Navigazione Rapida)**: Implementare controlli minimali (es. `< 2 / 5 >`) direttamente sotto il messaggio nella chat per cambiare versione al volo senza aprire il pannello.
- [ ] **Stato Visivo**: Evidenziare chiaramente la versione "Attiva" rispetto a quelle storiche.

## 2. Backend: Modello Dati (SQLAlchemy)
*File target: `ai-platform/backend/app/db/models.py`*

- [ ] Creare tabella `chat_response_versions`:
  - `id` (UUID, PK)
  - `chat_message_id` (FK su `chat_messages`, **indicizzato** per performance)
  - `version_number` (INT, incrementale per ogni messaggio per ordinamento facile)
  - `is_current` (BOOLEAN, flag per identificare rapidamente la versione visualizzata)
  - `user_id` (FK, per tracciare chi ha fatto la modifica: AI o Utente)
  - `content` (TEXT, il contenuto completo della versione - *No diff parziali*)
  - `created_at` (DateTime)
  - `parent_version_id` (UUID, opzionale, per supportare branching futuro)

- [ ] Aggiornare Endpoint API (`/api/v1/chat`):
  - `GET /versions/{message_id}` -> Ritorna lista versioni ordinate.
  - `POST /versions` -> Crea nuova versione (chiamata da edit utente o rigenerazione).
  - `POST /versions/{id}/restore` -> Logica critica: imposta `is_current=True` su questa versione E **aggiorna il campo `content` nella tabella principale `chat_messages`** (fondamentale per mantenere coerente il contesto per l'LLM).

## 3. API & Logica Versionamento
- [ ] **Logica Diff On-The-Fly**: Calcolo delle differenze a runtime (frontend) per evitare storage inutile.
- [ ] **Gestione Ramificazioni**: Rimuovere la logica attuale di `slice` (cancellazione messaggi futuri). Le modifiche creano nuove versioni; lo storico chat rimane intatto.
- [ ] **Audit**: Garantire che il campo `created_by` (o `role`) distingua sempre se la versione è generata dall'AI o corretta dall'uomo.

## 4. Frontend: Componenti React
*File target: `ai-platform/frontend/components/workspace/ChatInterface.tsx`*

- [ ] **Canvas Laterale (`VersionHistoryPanel`)**:
  - Lista verticale scrollabile delle versioni.
  - Anteprima del contenuto al click.
- [ ] **Diff Viewer Intelligente**:
  - **Per Codice**: Usare `<DiffEditor />` di `@monaco-editor/react` (già presente nel progetto) per confronto side-by-side professionale.
  - **Per Testo**: Usare una visualizzazione diff testuale leggera (verde/rosso) per i messaggi discorsivi.
- [ ] **Logica "Debounce"**:
  - Implementare un hook `useDebounce` (delay 1-2s) per salvare le bozze durante l'editing manuale, evitando spam di versioni nel DB.

## 5. Integrazione & Test
- [ ] **Refactor Edit**: Aggiornare la funzione `handleEdit` nel frontend per usare le nuove API di versioning invece di modificare lo stato locale.
- [ ] **Test Flusso Completo**:
  1. AI genera risposta (v1).
  2. Utente modifica (creazione v2, `is_current=True`).
  3. Utente naviga indietro (v1) e clicca "Ripristina".
  4. Verifica che l'LLM, alla domanda successiva, "legga" la versione v1 ripristinata.
- [ ] **Responsive**: Verificare che il Canvas laterale funzioni come overlay su mobile.

# TODO-list: Versioning Canvas per Chat (Stile Copilot) - STATUS UPDATE

## 🟢 1. Backend: Fondamenta Dati & Logica (Fase Completata)
- [x] **Database**: Creata tabella `chat_response_versions` in `models.py`.
  - [x] Relazione 1-to-N con `chat_messages` configurata.
  - [x] Migrazione automatica verificata (tabella presente in DB).
- [x] **Logica Salvataggio**: Aggiornato `ChatHistoryService.py` per salvare automaticamente la "Versione 1" quando l'AI risponde.
- [x] **Verifica Dati**: Confermato tramite SQL che le risposte vengono salvate correttamente nella tabella versioni.

## 🟡 2. API Endpoint (Parzialmente Completato)
- [x] **Endpoint Lettura**: `GET /messages/{message_id}/versions` implementato.
- [x] **Endpoint Creazione**: `POST /messages/{message_id}/versions` implementato.
- [x] **Endpoint Restore**: `POST /versions/{version_id}/restore` implementato (con logica di aggiornamento messaggio padre).
- [ ] **Fix Critico ID**: Modificare `get_session_history` in `chat_history_service.py` per restituire l'ID del messaggio (`msg.id`) al frontend. **(Bloccante per la UI)**

## 🔵 3. Frontend: Integrazione UI (In Corso)
- [x] **Componente Pannello**: Creato `VersionHistoryPanel.tsx` per visualizzare la lista.
- [x] **Logica ChatInterface**: Aggiunto stato `historyPanelOpen` e integrazione nel JSX.
- [x] **Bottone History**: Inserito il codice per l'icona "Orologio" nel loop dei messaggi.
- [ ] **Debug Visualizzazione**: L'icona Orologio non appare perché `msg.id` arriva come `undefined` dal backend (vedi Fix Critico ID sopra).
- [ ] **Test Restore**: Verificare che cliccando "Ripristina" la UI si aggiorni istantaneamente.

## 🟣 4. UI Avanzata & UX (Prossimi Passi)
- [ ] **Diff Viewer**: Integrare `monaco-editor` in modalità diff nel pannello laterale per confrontare le versioni codice.
- [ ] **Quick Switcher**: Aggiungere frecce `< 1/3 >` sotto il messaggio per navigazione rapida senza aprire il pannello.
- [ ] **Debounce Edit**: Ottimizzare il salvataggio durante l'editing manuale per non creare troppe versioni.

---

### 🚨 AZIONE IMMEDIATA RICHIESTA (Per Gemini CLI)
Il sistema è bloccato al punto **2 - Fix Critico ID**.
Il frontend è pronto a mostrare l'orologio, ma il backend non sta inviando l'ID del messaggio durante il caricamento della sessione (`get_session_history`).

**Task Corrente:** Modificare `backend/app/services/chat_history_service.py` per includere `"id": str(m.id)` nel return di `get_session_history`.