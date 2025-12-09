import uuid
from datetime import datetime
from fastapi import UploadFile
from qdrant_client import QdrantClient, models
from pypdf import PdfReader
from io import BytesIO
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.core.config import settings
from app.services.ollama_service import OllamaService

class RagService:
    def __init__(self):
        self.qdrant = QdrantClient(url=settings.QDRANT_URL)
        self.ollama = OllamaService(base_url=settings.OLLAMA_BASE_URL)
        self.collection_name = "documents_vectors"
        self._init_collection()

    def _init_collection(self):
        collections = self.qdrant.get_collections()
        exists = any(c.name == self.collection_name for c in collections.collections)
        if not exists:
            self.qdrant.create_collection(
                collection_name=self.collection_name,
                vectors_config=models.VectorParams(size=768, distance=models.Distance.COSINE)
            )

    async def process_pdf(self, file: UploadFile):
        content = await file.read()
        pdf = PdfReader(BytesIO(content))
        text = ""
        for page in pdf.pages:
            text += page.extract_text() + "\n"

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        chunks = text_splitter.split_text(text)

        points = []
        doc_id = str(uuid.uuid4())
        
        # Batch embedding sarebbe meglio, ma per ora loop semplice
        for idx, chunk in enumerate(chunks):
            vector = await self.ollama.get_embeddings(chunk)
            points.append(models.PointStruct(
                id=str(uuid.uuid4()),
                vector=vector,
                payload={
                    "document_id": doc_id,
                    "filename": file.filename,
                    "content": chunk,
                    "chunk_index": idx,
                    "timestamp": datetime.now().isoformat()
                }
            ))

        self.qdrant.upsert(collection_name=self.collection_name, points=points)
        return {"filename": file.filename, "chunks_processed": len(chunks), "status": "indexed"}

    def list_documents(self):
        result = self.qdrant.scroll(collection_name=self.collection_name, limit=100, with_payload=True, with_vectors=False)[0]
        seen = set()
        docs = []
        for point in result:
            fname = point.payload.get("filename")
            if fname and fname not in seen:
                seen.add(fname)
                docs.append({"filename": fname, "id": point.payload.get("document_id")})
        return docs

    # --- NUOVA FUNZIONE SEARCH ---
    async def search(self, query: str, limit: int = 3) -> str:
        """
        1. Calcola embedding della domanda.
        2. Cerca in Qdrant i chunk più simili.
        3. Restituisce una stringa di contesto formattata.
        """
        try:
            vector = await self.ollama.get_embeddings(query)
            
            hits = self.qdrant.search(
                collection_name=self.collection_name,
                query_vector=vector,
                limit=limit
            )
            
            context_parts = []
            for hit in hits:
                # Filtra risultati poco rilevanti (score basso)
                if hit.score > 0.4: 
                    payload = hit.payload
                    context_parts.append(f"--- FONTE: {payload.get('filename')} ---\n{payload.get('content')}\n")
            
            if not context_parts:
                return ""
                
            return "\n".join(context_parts)
        except Exception as e:
            print(f"RAG Search Error: {e}")
            return ""

rag_service = RagService()
