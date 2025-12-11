Markdown

# Guida Completa a Gemini CLI

Questa guida esplora l'uso avanzato del client da terminale per Google Gemini, con un focus sulla gestione di progetti multipli (come AI-Platform), gestione della memoria e configurazione dell'ambiente.

---

## 1. Inizializzazione e Configurazione (`init`)

Il comando `init` è il punto di partenza. Serve a creare il file di configurazione base che il tool userà per autenticarsi con Google.

### Primo Avvio
```bash
gemini init
Cosa succede:

Ti verrà richiesta la API Key (quella che inizia con AIza...).

Il tool creerà un file di configurazione globale, solitamente situato in:

Linux: ~/.config/gemini/config.yaml (o .json)

Mac: ~/Library/Application Support/gemini/

Gestione Multi-Progetto (Environment Isolation)
Una delle tue domande principali riguarda come gestire più progetti sullo stesso server senza confondere i contesti.

Livello Globale (~/.config/...): Qui risiede la tua API Key e le impostazioni di default (es. "Rispondi sempre in italiano"). Queste valgono per tutti i progetti.

Livello Cartella (Locale): La CLI rispetta il contesto della cartella corrente.

Variabili d'ambiente (.env): Se nella cartella del progetto (es. /ai-platform) esiste un file .env con una chiave diversa o parametri specifici, questi spesso sovrascrivono la configurazione globale (dipende dalla specifica implementazione della CLI installata, ma è lo standard).

Consiglio: Usa init per la configurazione globale. Per i singoli progetti, affidati al passaggio dei file contestuali via pipe (vedi sezione Workflow).

2. Comandi Principali e Opzioni
Usa gemini --help per la lista esatta, ma ecco le logiche universali:

Modalità "One-Shot" (Pipe)
È la modalità più potente per lo sviluppo. Non mantiene memoria tra una chiamata e l'altra, il che è perfetto per evitare allucinazioni basate su vecchie domande.

Bash

# Sintassi base
cat file_input.txt | gemini "Tua richiesta"
Vantaggio: Il contesto è pulito. L'AI vede SOLO quello che gli passi ora.

Uso: Code review, bug fixing, generazione di documentazione.

Modalità Chat (Interattiva)
Bash

gemini chat
Vantaggio: Mantiene la Memory (cronologia) della conversazione corrente.

Uso: Brainstorming, quando devi fare domande a catena ("Spiegami questo", "Ok, ora fanne un riassunto").

Reset: Usa comandi come /reset o clear per pulire la memoria della sessione.

Opzioni Comuni (Flag)
--system "prompt": Imposta il "System Prompt" (es. "Sei un esperto DevOps"). Fondamentale per dare un ruolo all'AI.

--model "gemini-pro": Se vuoi cambiare modello (es. usare la versione Vision se supportata).

--temperature 0: Rende l'output deterministico (ottimo per il codice).

3. Il Concetto di "Memory" e Contesto
Capire la memoria è fondamentale per non avere risposte sbagliate.

1. Memoria di Sessione (Chat)
Quando sei in modalità interattiva, la CLI tiene un buffer degli ultimi scambi.

Pro: Conversazione naturale.

Contro: Se cambi argomento drasticamente (es. passi dal database al frontend), l'AI potrebbe confondersi.

Best Practice: Chiudi e riapri la chat quando cambi task.

2. Memoria del File System (Il vero "Cervello")
La CLI non "ricorda" i file del tuo progetto a meno che tu non glieli legga. Non esiste una "memoria globale del progetto" automatica. Devi nutrire l'AI con il contesto rilevante ogni volta.

Esempio corretto: Non chiedere: "Perché il mio login non va?" (L'AI non sa nulla). Chiedi:

Bash

cat backend/auth.py backend/main.py | gemini "Perché il login non va?"
(In questo modo, la "memoria" è costruita dinamicamente al momento della richiesta).

4. Workflow per Sviluppatori (The "Power Moves")
Ecco come massimizzare la produttività sul tuo server Ubuntu.

A. L'Alias "Esperto"
Non scrivere ogni volta il system prompt. Aggiungi questo al tuo ~/.bashrc:

Bash

alias aidev='gemini --system "Sei un Senior Full Stack Developer. Rispondi in Italiano tecnico. Sii conciso. Usa Markdown."'
Ora puoi fare:

Bash

cat models.py | aidev "Spiegami questo modello"
B. Output su File
Fatti scrivere il codice direttamente su file.

Bash

# Chiedi di generare un README e salvalo
cat backend/main.py | gemini "Scrivi un README.md per questo codice" > README.md
C. Debugging con Log
Quando hai un errore, passa sia il codice che l'errore:

Bash

(cat backend/app/main.py; echo "ERRORE:"; cat error.log) | gemini "Fixa questo crash"
5. Risoluzione Problemi Comuni
Error: API Key not found:

Controlla di aver fatto gemini init.

Controlla se hai settato export GEMINI_API_KEY=... nella sessione corrente.

Risposte tagliate: Alcune CLI hanno un limite di token in output. Chiedi "Continua".

Allucinazioni sul codice: Succede se non passi tutto il contesto. Se modifichi una funzione che ne chiama un'altra in un file diverso, passa entrambi i file con cat file1.py file2.py | gemini ....