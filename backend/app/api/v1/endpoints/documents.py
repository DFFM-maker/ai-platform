from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.services.rag_service import rag_service

router = APIRouter()

# Schema per la richiesta di ricerca
class SearchRequest(BaseModel):
    query: str
    limit: int = 3

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Carica un file PDF, estrae il testo, lo divide in chunk 
    e calcola gli embedding salvandoli su Qdrant.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Al momento supportiamo solo file PDF.")
    
    try:
        # Chiama il servizio RAG che hai già configurato
        result = await rag_service.process_pdf(file)
        return result
    except Exception as e:
        print(f"Error processing file: {e}")
        raise HTTPException(status_code=500, detail=f"Errore durante l'indicizzazione: {str(e)}")

@router.get("/")
async def list_documents():
    """
    Restituisce la lista dei documenti indicizzati in Qdrant.
    """
    try:
        return rag_service.list_documents()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/search")
async def search_documents(request: SearchRequest):
    """
    Esegue una ricerca semantica pura (utile per debuggare cosa trova il RAG).
    """
    context = await rag_service.search(request.query, request.limit)
    return {"context": context}
