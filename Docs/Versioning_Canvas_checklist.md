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