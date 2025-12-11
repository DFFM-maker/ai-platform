# Riepilogo Modifiche e Problemi di Versioning

## 1. Problema: Icona 'Orologio' non visibile nel Frontend

**Data:** 2025-12-11

**Descrizione:** L'icona 'Orologio' per la cronologia delle versioni, come descritto nella `docs/ToDo_versioning_canvas_Update.md` (sezione 'Fix Critico ID'), non era inizialmente visibile o non si attivava correttamente nel frontend della chat (`frontend/app/(protected)/chat/page.tsx`). Si era ipotizzato un problema nel backend (`backend/app/services/chat_history_service.py`) che non inviava l'ID del messaggio.

**Analisi:**
*   **Backend (`chat_history_service.py`):** È stato verificato che la funzione `get_session_history` invia correttamente l'ID del messaggio (`m.id`).
*   **Frontend (`ChatInterface.tsx`):** L'analisi del componente `ChatInterface.tsx` ha rivelato che l'icona 'Orologio' (`History` button) era condizionata dalla presenza di `msg.id` e `msg.has_versions`. La mancata visibilità o attivazione era dovuta alla mancanza di `has_versions: true` sui messaggi appropriati. La precedente nota sulle classi CSS `opacity-0 group-hover:opacity-100` era un'osservazione parziale e non la causa principale.

**Modifica Applicata:**
*   **File:** `/home/giuseppe/ai-platform/frontend/components/workspace/ChatInterface.tsx`
*   **Dettaglio:** L'interfaccia `Message` è stata aggiornata per includere il campo `has_versions`. La logica di invio messaggi (`handleSend`) è stata modificata per impostare `has_versions: true` sui messaggi assistant che contengono codeblock e per i quali le versioni sono state salvate con successo nel backend.

**Stato Attuale:** Risolto. L'icona 'Orologio' (`History`) appare correttamente quando un messaggio assistant ha versioni del codice persistite.

## 2. Problema: Codeblock non si aggiorna e 'Nessuna modifica registrata' nella cronologia

**Data:** 2025-12-11

**Descrizione:** Dopo il refresh della pagina (`F5`), i codeblock nella chat non si aggiornavano per riflettere lo stato attuale (problema risolto dal punto 5). Inoltre, cliccando sull'icona 'Orologio', il pannello della cronologia versioni mostrava il messaggio 'Nessuna modifica registrata.' anche se l'icona era ora visibile.

**Analisi Iniziale:**
*   **Cronologia Versioni:** Questo suggeriva che il backend non stesse salvando correttamente le versioni dei messaggi o che il frontend non le stesse recuperando/visualizzando in modo appropriato.

**Modifiche Applicate (per la cronologia versioni - backend data model):**
*   **File:** `/home/giuseppe/ai-platform/backend/app/db/models.py`
*   **Dettaglio:** Aggiunti i campi `version_number` (Integer, default 1) e `is_current` (Boolean, default True) alla classe `ChatResponseVersion`.

## 3. Problema: Alembic non trova il file di configurazione nel container (e problemi di permessi/server_default)

**Data:** 2025-12-11

**Descrizione:** Inizialmente, Alembic non trovava il file di configurazione nel container. Successivamente, dopo aver spostato i file e modificato il `Dockerfile`, ci sono stati problemi di permessi e la necessità di specificare `server_default` nella migrazione.

**Analisi:**
*   **Configurazione:** Il `Dockerfile` del backend non copiava `alembic.ini` e la directory `alembic/` nella `WORKDIR /app` del container. Ciò è stato corretto con le istruzioni `COPY ../alembic.ini .` e `COPY ../alembic ./alembic` (anche se successivamente i file sono stati spostati manualmente).
*   **Spostamento Manuale:** L'utente ha spostato `alembic.ini` e la directory `alembic` all'interno di `/backend` e ha modificato `backend/alembic/env.py` di conseguenza per riflettere i nuovi percorsi.
*   **Permessi:** È stato necessario correggere i permessi della directory `backend/alembic/versions` con `sudo chown -R $USER:$USER backend/alembic/versions` per permettere ad Alembic di scrivere le nuove revisioni.
*   **`server_default`:** Durante la migrazione, è stato aggiunto `server_default='1'` e `server_default='true'` per le nuove colonne `version_number` e `is_current` rispettivamente. Questo è cruciale per gestire correttamente i valori predefiniti delle colonne esistenti durante l'aggiunta di nuove colonne non nullable.

**Modifiche Applicate:**
*   **File:** `/home/giuseppe/ai-platform/backend/Dockerfile` (modifica iniziale per copiare alembic, poi non più necessaria a causa dello spostamento manuale).
*   **Files:** `alembic.ini` e la directory `alembic` spostati in `/backend`.
*   **File:** `/home/giuseppe/ai-platform/backend/alembic/env.py` (modificato per i nuovi percorsi).
*   **Comando:** `sudo chown -R $USER:$USER backend/alembic/versions` eseguito per i permessi.
*   **Migrazione generata:** Aggiunti `server_default='1'` e `server_default='true'` alle definizioni delle colonne `version_number` e `is_current` nella migrazione Alembic.

**Stato Attuale:** Migrazione Alembic completata con successo.

## 4. Fix Problema: Persistenza e Visualizzazione Cronologia Versioni (Backend & Frontend)

**Data:** 2025-12-11

**Descrizione:** Questo problema era collegato alla gestione errata delle versioni dei messaggi sia nel backend che nel frontend. I codeblock non si aggiornavano correttamente dopo un refresh e la cronologia mostrava "Nessuna modifica registrata" a causa di una gestione incompleta dei flag `is_current` e `version_number` e della mancata persistenza delle versioni dal frontend.

**Analisi:**
*   Il backend non gestiva in modo robusto il flag `is_current` e l'incremento di `version_number` nelle operazioni di `add_message`, `create_version` e `restore_version`.
*   Il frontend non inviava le versioni del codice al backend per la persistenza e non era completamente attrezzato per interpretare correttamente lo stato di versioning dal backend.

**Modifiche Applicate:**

**Backend (`backend/app/services/chat_history_service.py`):**
*   **`add_message`**: Modificato per impostare esplicitamente `version_number=1` e `is_current=True` per la versione iniziale e per marcare eventuali versioni preesistenti come `is_current=False`.
*   **`create_version`**: Aggiornato per incrementare correttamente `version_number`, impostare la nuova versione come `is_current=True` e tutte le altre versioni per lo stesso messaggio come `is_current=False`.
*   **`restore_version`**: Modificato per impostare la versione di destinazione (`target_version`) come `is_current=True`, tutte le altre versioni come `is_current=False`, e per aggiornare il contenuto del `ChatMessage` padre.
*   **`get_session_history`**: Esteso per includere i campi `current_version_number` e `has_versions` nei dati del messaggio restituiti, fornendo al frontend lo stato di versioning diretto.

**Frontend:**
*   **`frontend/components/workspace/ChatInterface.tsx`**:
    *   L'interfaccia `Message` è stata aggiornata per includere i campi `current_version_number` e `has_versions`.
    *   L'interfaccia `CodeVersion` è stata modificata da `code: string` a `content: string` per coerenza con il backend.
    *   La logica `handleSend` è stata estesa per:
        *   Catturare l'ID del messaggio assistant (`currentAssistantMessageIdRef` con `useRef`).
        *   Dopo lo stream completo, inviare i `codeVersions` estratti al backend tramite una richiesta `POST` a `/api/v1/chat/messages/{messageId}/versions` per la persistenza.
        *   Aggiornare lo stato locale del messaggio (`setMessages`) impostando `has_versions: true` dopo il salvataggio.
        *   Pulire lo stato `codeVersions` temporaneo.
    *   Corretti errori di compilazione relativi a `currentAssistantMessageIdRef` (gestito tramite `useRef`) e all'uso di `version.content`.
*   **`frontend/components/workspace/VersionHistoryPanel.tsx`**:
    *   L'interfaccia `Version` è stata aggiornata per includere `version_number` e `is_current`.
    *   La logica di rendering è stata modificata per usare `ver.is_current` per indicare lo stato "Attuale" e visualizzare il `version_number`.
    *   Il pulsante "Ripristina" è mostrato solo se la versione non è quella `is_current`.
    *   Dopo un'operazione di `handleRestore`, `fetchVersions` viene richiamato per aggiornare lo stato nel pannello.
*   **`frontend/components/CodeVersionPanel.tsx`**:
    *   L'interfaccia `CodeVersion` è stata modificata da `code: string` a `content: string` per coerenza con `ChatInterface.tsx`.
    *   L'utilizzo di `version.code` è stato aggiornato a `version.content`.

**Stato Attuale:** Risolto. Tutte le modifiche backend e frontend relative al versioning e alla sua persistenza sono state implementate.

## 5. Problema: Codeblock visualizzato su una singola riga durante lo streaming

**Data:** 2025-12-11

**Descrizione:** Durante lo streaming delle risposte AI contenenti codice, il codeblock veniva inizialmente renderizzato su una singola riga, perdendo la formattazione con le nuove righe (es. `FUNCTION_BLOCK ... END_FUNCTION_BLOCK` appariva tutto su una riga). La visualizzazione corretta avveniva solo dopo un refresh (F5) della pagina.

**Analisi:**
*   Il problema era legato al rendering progressivo del componente `MessageContent` nel frontend. Sebbene i dati finali fossero corretti, il browser non applicava correttamente il wrapping del testo per gli spazi bianchi durante lo streaming.

**Modifica Applicata:**
*   **File:** `/home/giuseppe/ai-platform/frontend/components/workspace/ChatInterface.tsx` (nel componente `MessageContent`).
*   **File:** `/home/giuseppe/ai-platform/frontend/components/CodeVersionPanel.tsx` (per consistenza, anche se il problema principale era nel `MessageContent` che riceve lo stream).
*   **Dettaglio:** È stato aggiunto `style={{ whiteSpace: 'pre-wrap' }}` all'elemento `<code>` all'interno dei blocchi di codice renderizzati. Questo forza il browser a mantenere gli spazi bianchi e a fare il wrapping del testo, risolvendo il problema di visualizzazione del codice su una singola riga.

**Stato Attuale:** Risolto. I codeblock mantengono la formattazione corretta anche durante lo streaming.