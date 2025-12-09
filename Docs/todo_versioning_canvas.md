# TODO-list: Versioning Canvas per Chat (Stile Copilot)

## 1. UI/UX Design
- Definire il layout del canvas a destra nella chat.
- Mockup con flusso di versionamento, confronto e restore.
- Pulsanti: "Visualizza versioni", "Confronta", "Ripristina".
- Evidenziare la versione attiva e le differenze tra versioni.

## 2. Backend: Modello Dati
- Tabella/collezione per versioni delle risposte chat (es: ChatResponseVersion).
  - id, chat_id, user_id, response_text, created_at, model_name, parent_version_id, diff, ecc.
- Endpoint API:
  - GET /chat/{chat_id}/versions
  - POST /chat/{chat_id}/version (salva nuova versione)
  - GET /chat/version/{version_id} (dettaglio)
  - POST /chat/version/{version_id}/restore

## 3. API & Logica Versionamento
- Logica per salvare ogni modifica/variazione di risposta come nuova versione.
- Calcolo differenze (diff) tra versioni (testuale, evidenziato in UI).
- Gestione restore: ripristina una versione precedente come attiva.
- Audit trail: chi ha creato/modificato ogni versione.

## 4. Frontend: Componenti React
- Canvas laterale con lista versioni (timeline o elenco).
- Componente per visualizzare/confrontare due versioni (side-by-side o inline diff).
- Pulsante per ripristino versione.
- Integrazione con API backend.

## 5. Integrazione & Test
- Collegare salvataggio versioni a ogni invio/modifica risposta.
- Test end-to-end: creazione, visualizzazione, confronto, restore versioni.
- UX review: feedback su usabilità e chiarezza.

---

### Note
- Ispirazione: GitHub Copilot, Google Docs version history.
- Focus su trasparenza, reversibilità e collaborazione.
- Possibile estensione: commenti su singole versioni, tagging, filtri avanzati.
