import asyncio
import os
from app.services.rag_service import rag_service

# Imposta variabili d'ambiente fittizie se eseguito fuori dal container
# (Nota: Funzionerà meglio se eseguito DENTRO il container come spiegato sotto)
if not os.getenv("QDRANT_URL"):
    os.environ["QDRANT_URL"] = "http://localhost:6333"

async def test_search():
    # Domanda di test
    query = "Momento torcente" 
    
    print(f"🔍 Cerco nel database vettoriale: '{query}'...")
    
    # Chiama il servizio RAG
    # Nota: Assicurati che Qdrant sia raggiungibile
    try:
        result = await rag_service.search(query, limit=3)
        
        if result:
            print("\n✅ TROVATO CONTESTO:")
            print("="*40)
            print(result)
            print("="*40)
        else:
            print("\n❌ NESSUN RISULTATO TROVATO.")
            print("Il DB potrebbe essere vuoto o l'embedding non sta funzionando.")
    except Exception as e:
        print(f"\n❌ ERRORE DI CONNESSIONE: {e}")
        print("Suggerimento: Esegui questo script DENTRO il container Docker.")

if __name__ == "__main__":
    asyncio.run(test_search())
