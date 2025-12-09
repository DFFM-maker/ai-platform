import qdrant_client
import inspect
from qdrant_client import QdrantClient

print("--- DIAGNOSTICA QDRANT ---")
print(f"File libreria: {qdrant_client.__file__}")
print(f"Versione: {qdrant_client.__version__}")

client = QdrantClient(url="http://qdrant:6333")
print(f"\nTipo oggetto client: {type(client)}")
print(f"Metodi disponibili (search?): {'search' in dir(client)}")

# Stampa tutti i metodi che iniziano con 's' per vedere se c'è typos
methods = [m for m in dir(client) if m.startswith('s')]
print(f"Metodi con 's': {methods}")

