#!/usr/bin/env python3
"""
Test rapido per il prompt SYSTEM_PROMPT_ARCHITECTURE
Testa se Llama3 risponde in italiano con Markdown e contenuti specifici
"""

import requests
import json
from app.prompts.industrial_prompts import SYSTEM_PROMPT_ARCHITECTURE

# Configurazione Ollama
OLLAMA_URL = "http://192.168.1.243:11434/api/chat"
MODEL = "llama3:8b"

# Domande di test
TEST_QUESTIONS = [
    "Spiega il sistema costruttivo della Villa Rotonda di Palladio",
    "Quali sono le differenze tra Revit e ArchiCAD per il BIM?",
    "Come funziona una copertura ventilata secondo la normativa italiana?"
]

def test_prompt(question: str):
    """Testa il prompt con una domanda"""
    
    print(f"\n{'='*80}")
    print(f"📝 DOMANDA: {question}")
    print('='*80)
    
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT_ARCHITECTURE},
            {"role": "user", "content": question}
        ],
        "stream": False,
        "options": {
            "temperature": 0.5,
            "num_ctx": 8192
        }
    }
    
    try:
        response = requests.post(OLLAMA_URL, json=payload, timeout=120)
        response.raise_for_status()
        
        result = response.json()
        answer = result.get("message", {}).get("content", "")
        
        print(f"\n🤖 RISPOSTA:\n")
        print(answer)
        
        # Analisi qualità
        print(f"\n{'─'*80}")
        print("📊 ANALISI QUALITÀ:")
        print(f"✓ Lingua italiana: {'SÌ' if not any(word in answer.lower() for word in ['the', 'and', 'or', 'building', 'architecture']) else 'NO (contiene inglese)'}")
        print(f"✓ Usa Markdown (##): {'SÌ' if '##' in answer else 'NO'}")
        print(f"✓ Usa grassetto (**): {'SÌ' if '**' in answer else 'NO'}")
        print(f"✓ Usa elenchi puntati: {'SÌ' if ('- ' in answer or '1.' in answer) else 'NO'}")
        print(f"✓ Cita edifici/architetti: {'SÌ' if any(name in answer for name in ['Palladio', 'Villa', 'Rotonda']) else 'FORSE'}")
        print(f"✓ Lunghezza: {len(answer)} caratteri")
        
    except Exception as e:
        print(f"❌ ERRORE: {e}")

if __name__ == "__main__":
    print("\n🧪 TEST SYSTEM_PROMPT_ARCHITECTURE con Llama3:8b\n")
    print(f"🎯 Modello: {MODEL}")
    print(f"🌐 Ollama: {OLLAMA_URL}")
    
    for i, question in enumerate(TEST_QUESTIONS, 1):
        print(f"\n\n{'#'*80}")
        print(f"TEST {i}/{len(TEST_QUESTIONS)}")
        print('#'*80)
        test_prompt(question)
        
        if i < len(TEST_QUESTIONS):
            input("\n⏸️  Premi INVIO per continuare al test successivo...")
    
    print("\n\n✅ Test completati!")
