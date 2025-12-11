# Shopping Research Implementation Guide
**AI Platform - General Assistant Feature**

Data: 8 Dicembre 2025  
Obiettivo: Implementare ricerca prodotti real-time per `general_assistant` preset

---

## 🎯 Overview

Aggiungere capacità di ricerca prodotti in tempo reale al preset `general_assistant`, simile alla funzione "Shopping Research" di ChatGPT.

**Funzionalità**:
- Ricerca prodotti online (Amazon, eBay, altri e-commerce)
- Confronto prezzi tra più fonti
- Analisi recensioni e rating
- Suggerimenti personalizzati basati su budget e necessità

---

## 📋 Architecture

```
User Query → AI Detection → Function Call → Search API → Results → AI Response
                ↓
          "find laptop"
                ↓
       search_products()
                ↓
          SerpAPI/Scraping
                ↓
       Formatted Results
```

---

## 🚀 Implementation Steps

### Step 1: Update Model Preset System Prompt

```sql
-- File: migrations/update_general_assistant_shopping.sql

UPDATE model_presets SET 
    system_prompt = 'Sei un assistente personale versatile con capacità di ricerca prodotti in tempo reale.

**Funzionalità principali**:
- Ricerca e confronto prodotti online (elettronica, casa, tecnologia)
- Analisi prezzi e recensioni da più fonti
- Consigli acquisti personalizzati basati su budget
- Supporto tecnologia consumer e smart home
- Assistenza per vita quotidiana e famiglia

**Quando usare ricerca prodotti**:
- Keywords: "trova", "cerca", "confronta", "migliore", "consiglia" + nome prodotto
- Richieste di prezzi o disponibilità
- Comparazioni tra modelli/brand
- Budget constraints (es: "sotto 500 euro")

**Processo ricerca**:
1. Identifica keywords e criteri (prodotto, budget, caratteristiche)
2. Chiama function search_products(query, max_results)
3. Analizza risultati ricevuti
4. Presenta top 3-5 opzioni con:
   - Nome prodotto e brand
   - Prezzo attuale
   - Link diretto
   - Pro e contro
   - Rating e numero recensioni
5. Aggiungi consiglio personale basato su use case

**Formato risposta**:
```
🔍 Ho trovato [N] opzioni per [prodotto]:

1. **[Brand Model]** - €[prezzo]
   - [Specifiche chiave]
   - ⭐ [rating]/5 ([N] recensioni)
   - 🔗 [Link]
   
2. [...]

💡 Consiglio: [Raccomandazione personalizzata]
```

**Linee guida**:
- Sii onesto: segnala se prodotto fuori budget
- Confronta specifiche tecniche rilevanti
- Considera rapporto qualità/prezzo
- Avvisa su disponibilità limitata o sconti temporanei
- Tono amichevole e pratico

Per richieste NON shopping: fornisci assistenza generale come sempre.'
WHERE name = 'general_assistant';
```

**Applicare migration**:
```bash
cd /home/giuseppe/ai-platform
docker compose exec -T postgres psql -U postgres -d aidb < migrations/update_general_assistant_shopping.sql
```

---

### Step 2: Create Shopping Search Service

**File**: `backend/app/services/shopping_search.py`

```python
"""
Shopping Research Service
Supporta multiple search backends (SerpAPI, web scraping)
"""

import aiohttp
import asyncio
from typing import List, Dict, Optional
from app.core.config import settings

class ShoppingSearchService:
    """Service per ricerca prodotti online"""
    
    def __init__(self):
        self.serpapi_key = settings.SERPAPI_KEY  # Opzionale
        self.user_agent = "Mozilla/5.0 (compatible; AIBot/1.0)"
    
    async def search_products(
        self, 
        query: str, 
        max_results: int = 5,
        country: str = "it",
        language: str = "it"
    ) -> List[Dict]:
        """
        Cerca prodotti usando backend disponibile
        
        Args:
            query: Search query (es: "laptop gaming RTX 4060")
            max_results: Numero massimo risultati
            country: Codice paese (it, us, uk, ...)
            language: Lingua risultati
            
        Returns:
            Lista di dict con: title, price, source, link, rating, reviews
        """
        
        # Prova prima SerpAPI se configurato
        if self.serpapi_key:
            try:
                return await self._search_serpapi(query, max_results, country, language)
            except Exception as e:
                print(f"SerpAPI failed: {e}, falling back to scraping")
        
        # Fallback: web scraping
        return await self._search_by_scraping(query, max_results, country)
    
    async def _search_serpapi(
        self, 
        query: str, 
        max_results: int,
        country: str,
        language: str
    ) -> List[Dict]:
        """Ricerca via SerpAPI (Google Shopping)"""
        
        params = {
            "engine": "google_shopping",
            "q": query,
            "api_key": self.serpapi_key,
            "num": max_results * 2,  # Request more to filter
            "gl": country,
            "hl": language
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(
                "https://serpapi.com/search",
                params=params,
                timeout=aiohttp.ClientTimeout(total=10)
            ) as resp:
                if resp.status != 200:
                    raise Exception(f"SerpAPI error: {resp.status}")
                
                data = await resp.json()
        
        results = []
        for item in data.get("shopping_results", [])[:max_results]:
            # Extract price (handle different formats)
            price_str = item.get("price", "N/A")
            price_clean = self._parse_price(price_str)
            
            results.append({
                "title": item.get("title", "Unknown Product"),
                "price": price_clean,
                "price_raw": price_str,
                "source": item.get("source", "Unknown"),
                "link": item.get("link", "#"),
                "rating": item.get("rating"),
                "reviews": item.get("reviews", 0),
                "thumbnail": item.get("thumbnail"),
                "position": item.get("position", 0)
            })
        
        return results
    
    async def _search_by_scraping(
        self, 
        query: str, 
        max_results: int,
        country: str
    ) -> List[Dict]:
        """
        Fallback: scraping diretto da Amazon/eBay
        Nota: richiede playwright installato
        """
        
        # Per ora placeholder - implementare con playwright se necessario
        # Opzione alternativa: usare API ufficiali Amazon Product Advertising
        
        return [
            {
                "title": f"Search '{query}' - Web scraping not configured",
                "price": "N/A",
                "source": "Manual search required",
                "link": f"https://www.amazon.{country}/s?k={query.replace(' ', '+')}",
                "rating": None,
                "reviews": 0
            }
        ]
    
    def _parse_price(self, price_str: str) -> float:
        """Estrae prezzo numerico da stringa"""
        import re
        
        # Remove currency symbols and extract number
        # Supports: €100, $100, 100.50€, 100,50 €
        clean = re.sub(r'[€$£]', '', price_str)
        clean = clean.replace(',', '.').strip()
        
        try:
            # Extract first number found
            match = re.search(r'\d+\.?\d*', clean)
            if match:
                return float(match.group())
        except:
            pass
        
        return 0.0

# Singleton instance
shopping_search = ShoppingSearchService()
```

---

### Step 3: Add Function Calling Definition

**File**: `backend/app/routers/chat.py`

```python
# Aggiungi alle function definitions esistenti

SHOPPING_FUNCTIONS = [
    {
        "name": "search_products",
        "description": "Cerca prodotti online con prezzi, recensioni e link di acquisto aggiornati in tempo reale",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Query di ricerca prodotto. Include keywords specifiche, caratteristiche desiderate e budget se disponibile. Esempi: 'laptop gaming RTX 4060 sotto 1500 euro', 'frigorifero combinato classe A++', 'smartphone fotocamera 108MP'"
                },
                "max_results": {
                    "type": "integer",
                    "description": "Numero massimo di risultati da restituire (default: 5, range: 3-10)",
                    "default": 5
                },
                "country": {
                    "type": "string",
                    "description": "Codice paese per ricerca localizzata (it=Italia, us=USA, uk=UK, de=Germania)",
                    "default": "it"
                }
            },
            "required": ["query"]
        }
    }
]

# Merge con funzioni esistenti
AVAILABLE_FUNCTIONS = {
    **EXISTING_FUNCTIONS,  # RAG, web_search, etc
    "search_products": shopping_search.search_products
}
```

---

### Step 4: Integrate in Chat Stream Handler

**File**: `backend/app/routers/chat.py` (update `/chat/stream` endpoint)

```python
@router.post("/chat/stream")
async def chat_stream(request: ChatRequest, user: User = Depends(get_current_user)):
    # ... existing code ...
    
    # Se preset è general_assistant, abilita shopping functions
    functions_to_use = None
    if preset and preset.name == "general_assistant":
        functions_to_use = SHOPPING_FUNCTIONS
    
    # Nel loop streaming
    async for chunk in ollama_client.chat_stream(
        model=model_name,
        messages=messages,
        functions=functions_to_use  # Enable for general_assistant
    ):
        # Check for function call
        if "function_call" in chunk:
            func_name = chunk["function_call"]["name"]
            func_args = chunk["function_call"]["arguments"]
            
            if func_name == "search_products":
                # Execute search
                results = await AVAILABLE_FUNCTIONS[func_name](**func_args)
                
                # Format results for AI context
                results_text = format_shopping_results(results)
                
                # Re-inject into conversation
                messages.append({
                    "role": "function",
                    "name": func_name,
                    "content": results_text
                })
                
                # Continue generation with results
                async for response_chunk in ollama_client.chat_stream(
                    model=model_name,
                    messages=messages
                ):
                    yield format_sse(response_chunk)
```

**Helper function**:
```python
def format_shopping_results(results: List[Dict]) -> str:
    """Format search results for AI consumption"""
    
    if not results:
        return "Nessun prodotto trovato per questa ricerca."
    
    formatted = f"Ho trovato {len(results)} prodotti:\n\n"
    
    for i, item in enumerate(results, 1):
        formatted += f"{i}. {item['title']}\n"
        formatted += f"   Prezzo: {item['price_raw']}\n"
        formatted += f"   Venditore: {item['source']}\n"
        
        if item.get('rating'):
            formatted += f"   Rating: {item['rating']}/5"
            if item.get('reviews'):
                formatted += f" ({item['reviews']} recensioni)"
            formatted += "\n"
        
        formatted += f"   Link: {item['link']}\n\n"
    
    return formatted
```

---

### Step 5: Configuration

**File**: `backend/app/core/config.py`

```python
class Settings(BaseSettings):
    # ... existing settings ...
    
    # Shopping Research API Keys
    SERPAPI_KEY: Optional[str] = None  # Get free key at serpapi.com
    
    # Alternative: Amazon Product Advertising API
    AMAZON_ACCESS_KEY: Optional[str] = None
    AMAZON_SECRET_KEY: Optional[str] = None
    AMAZON_ASSOCIATE_TAG: Optional[str] = None
    
    class Config:
        env_file = ".env"
```

**File**: `.env` (aggiungi)

```bash
# Shopping Research APIs (optional)
SERPAPI_KEY=your_serpapi_key_here  # Get at https://serpapi.com (free tier: 100 searches/month)
```

---

## 🧪 Testing

### Test 1: Basic Product Search

```bash
curl -X POST http://localhost:8000/api/chat/stream \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Trova un laptop per programmazione sotto 1000 euro",
    "model_preset": "general_assistant"
  }'
```

**Expected output**:
```
🔍 Ho trovato 5 laptop per programmazione sotto 1000€:

1. **Lenovo ThinkPad E15 Gen 5** - €899
   - AMD Ryzen 7 7730U, 16GB RAM, 512GB SSD
   - Display 15.6" FHD IPS
   - ⭐ 4.5/5 (234 recensioni)
   - 🔗 https://amazon.it/...
   
[...]

💡 Consiglio: Il ThinkPad ha la migliore tastiera per coding lungo.
```

### Test 2: Comparison Request

```bash
curl -X POST http://localhost:8000/api/chat/stream \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Confronta iPhone 15 Pro e Samsung S24 Ultra",
    "model_preset": "general_assistant"
  }'
```

### Test 3: Budget Constraint

```bash
curl -X POST http://localhost:8000/api/chat/stream \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Migliori cuffie wireless noise cancelling sotto 200 euro",
    "model_preset": "general_assistant"
  }'
```

---

## 🔧 Alternative Implementations

### Option A: SerpAPI (Raccomandato)

**Pro**:
- ✅ API ufficiale, stabile
- ✅ Google Shopping results
- ✅ Rate limiting gestito
- ✅ 100 ricerche/mese gratis

**Contro**:
- ❌ Richiede API key
- ❌ Costo oltre free tier ($50/month per 5000 ricerche)

**Setup**:
1. Registrati su https://serpapi.com
2. Ottieni API key
3. Aggiungi a `.env`: `SERPAPI_KEY=xxx`

---

### Option B: Web Scraping con Playwright

**Pro**:
- ✅ Completamente gratis
- ✅ Controllo completo
- ✅ Nessun rate limit esterno

**Contro**:
- ❌ Più complesso da mantenere
- ❌ Può rompersi con cambi HTML
- ❌ Rischio ban IP

**Setup**:
```bash
# Install playwright
pip install playwright
playwright install chromium

# Usa _search_by_scraping() implementation
```

**Implementation**:
```python
async def _search_amazon_it(self, query: str, max_results: int) -> List[Dict]:
    from playwright.async_api import async_playwright
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        search_url = f"https://www.amazon.it/s?k={query.replace(' ', '+')}"
        await page.goto(search_url)
        
        products = await page.query_selector_all('[data-component-type="s-search-result"]')
        
        results = []
        for product in products[:max_results]:
            try:
                title = await product.query_selector("h2 a span")
                price = await product.query_selector(".a-price-whole")
                link = await product.query_selector("h2 a")
                rating = await product.query_selector(".a-icon-star-small")
                reviews = await product.query_selector(".a-size-base.s-underline-text")
                
                if title and price:
                    results.append({
                        "title": await title.inner_text(),
                        "price": await price.inner_text(),
                        "link": "https://amazon.it" + await link.get_attribute("href"),
                        "rating": await rating.inner_text() if rating else None,
                        "reviews": await reviews.inner_text() if reviews else "0",
                        "source": "Amazon.it"
                    })
            except:
                continue
        
        await browser.close()
        return results
```

---

### Option C: Amazon Product Advertising API

**Pro**:
- ✅ API ufficiale Amazon
- ✅ Dati affidabili e aggiornati
- ✅ Include link affiliazione (guadagni commission)

**Contro**:
- ❌ Richiede account Amazon Associates
- ❌ Setup più complesso
- ❌ Rate limits stringenti

**Setup**:
1. Registrati su https://affiliate-program.amazon.it
2. Crea access keys su https://webservices.amazon.com
3. Implementa signature authentication

---

## 📊 Monitoring & Analytics

### Track Shopping Searches

**Database table**:
```sql
CREATE TABLE shopping_searches (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    query TEXT NOT NULL,
    results_count INTEGER,
    clicked_link TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Logging**:
```python
# In search_products()
await db.execute(
    "INSERT INTO shopping_searches (user_id, query, results_count) VALUES ($1, $2, $3)",
    user_id, query, len(results)
)
```

---

## 🚦 Rate Limiting

**Prevent abuse**:
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/chat/stream")
@limiter.limit("10/minute")  # Max 10 ricerche al minuto
async def chat_stream(...):
    # ... implementation ...
```

---

## 🔐 Security Considerations

1. **API Key Protection**
   - Store in `.env`, never commit
   - Use environment-specific keys
   - Rotate periodically

2. **Input Validation**
   ```python
   def validate_search_query(query: str) -> bool:
       # Block SQL injection attempts
       if re.search(r'[;<>{}()]', query):
           return False
       # Max length
       if len(query) > 200:
           return False
       return True
   ```

3. **Rate Limiting**
   - Per-user limits
   - Global limits
   - Cost tracking (if paid API)

4. **Privacy**
   - Log only anonymized queries
   - No PII in search logs
   - GDPR compliance

---

## 📈 Future Enhancements

1. **Price History Tracking**
   - Store prezzi nel tempo
   - Alert su sconti significativi
   - Grafici trend prezzo

2. **Comparison Tables**
   - Side-by-side spec comparison
   - Highlight differenze chiave
   - Score automatico

3. **Local Availability**
   - Cerca negozi fisici vicini
   - Stock real-time
   - Ritiro in store

4. **Wishlist Integration**
   - Salva prodotti interessanti
   - Price drop notifications
   - Share lists

5. **Multi-Language Support**
   - Auto-detect user language
   - Translate results
   - Currency conversion

---

## 📚 Resources

- **SerpAPI Docs**: https://serpapi.com/google-shopping-api
- **Amazon PA API**: https://webservices.amazon.com/paapi5/documentation/
- **Playwright Docs**: https://playwright.dev/python/
- **Function Calling Guide**: https://platform.openai.com/docs/guides/function-calling

---

## ✅ Checklist Implementation

- [ ] Update `general_assistant` system prompt in database
- [ ] Create `shopping_search.py` service
- [ ] Add function definitions to chat router
- [ ] Integrate function calling in stream handler
- [ ] Add SERPAPI_KEY to `.env` (or implement scraping)
- [ ] Test basic product search
- [ ] Test comparison queries
- [ ] Test budget constraints
- [ ] Add rate limiting
- [ ] Add analytics logging
- [ ] Update frontend UI (optional: shopping icon)
- [ ] Documentation for users

---

**Status**: 📝 Implementation guide ready  
**Estimated Dev Time**: 4-6 ore  
**Priority**: Medium (nice-to-have feature for general assistant)
