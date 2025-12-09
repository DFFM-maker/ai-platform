import httpx
import json
from typing import AsyncGenerator, Dict, Any, List
from app.core.config import settings

class OllamaService:
    def __init__(self, base_url: str):
        self.base_url = base_url

    async def list_models(self) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(f"{self.base_url}/api/tags", timeout=5.0)
                resp.raise_for_status()
                return resp.json()
            except Exception as e:
                print(f"Error connecting to Ollama at {self.base_url}: {e}")
                return {"models": []}

    async def get_embeddings(self, prompt: str, model: str = "nomic-embed-text:latest") -> List[float]:
        """
        Genera embeddings vettoriali per una stringa di testo.
        """
        payload = {
            "model": model,
            "prompt": prompt
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(f"{self.base_url}/api/embeddings", json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["embedding"]

    async def chat_stream(self, model: str, messages: list, options: dict = None) -> AsyncGenerator[str, None]:
        payload = {
            "model": model,
            "messages": messages,
            "stream": True,
            "options": options or {} 
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                async with client.stream("POST", f"{self.base_url}/api/chat", json=payload) as response:
                    async for chunk in response.aiter_lines():
                        if chunk:
                            try:
                                data = json.loads(chunk)
                                if "message" in data and "content" in data["message"]:
                                    yield data["message"]["content"]
                                if data.get("done", False):
                                    break
                            except json.JSONDecodeError:
                                continue
            except Exception as e:
                yield f"\n[System Error]: {str(e)}"

# --- QUESTA E' LA RIGA CHE MANCAVA ---
ollama_service = OllamaService(base_url=settings.OLLAMA_BASE_URL)
