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