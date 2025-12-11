# Ollama Model Setup Guide - Industrial Automation AI Platform

**Server**: 192.168.1.243 (ai-server)  
**Data**: 7 Dicembre 2025  
**Obiettivo**: Setup dual model strategy per Sysmac Studio PLC + Industrial Integrations

---

## 🖥️ Hardware Specs

- **CPU**: Intel Core Ultra 7 265 (20 cores @ 6.5GHz max)
- **GPU**: NVIDIA RTX A1000 8GB VRAM
- **RAM**: 28GB disponibili
- **Disco**: 11GB liberi su 98GB (⚠️ 90% pieno)

**Status attuale VRAM**: 1MB usato, 7.8GB liberi ✅

---

## 📦 Modelli Attualmente Installati

```bash
ollama list
```

| Model | Size | Status | Action |
|-------|------|--------|--------|
| qwen2.5-coder:7b | 4.7 GB | ✅ KEEP | Fallback se 14B troppo lento |
| fara7b:latest | 6.0 GB | ❌ REMOVE | Non serve per industrial use case |
| maternion/fara:7b | 6.0 GB | ❌ REMOVE | Duplicato |
| llama3:8b-q4_K_M | 4.9 GB | ❌ REMOVE | Duplicato |
| hf.co/psuplj/Meta-Llama-3-8B-Q4_K_M-GGUF:Q4_K_M | 4.9 GB | ❌ REMOVE | Duplicato |
| llama3:8b | 4.7 GB | ✅ KEEP | Uno solo |
| nomic-embed-text:latest | 274 MB | ✅ KEEP | RAG embeddings |

**Spazio da liberare**: ~20GB (fara + llama3 duplicati)

---

## 🎯 Target Model Stack

### Primary Model: Qwen2.5-Coder 14B Instruct
```bash
ollama pull qwen2.5-coder:14b-instruct-q4_K_M
```
- **Size**: ~9GB
- **VRAM**: ~5-6GB (con CPU offloading automatico)
- **Speed**: 10-12 tokens/sec (stimato)
- **Context**: 32k tokens
- **Use Case**: 
  - Sysmac Studio Structured Text (IEC 61131-3)
  - C++ embedded/Visual C++
  - Safety PLC programming
  - Function blocks, timers, counters

### Secondary Model: Mistral 7B Instruct v0.3
```bash
ollama pull mistral:7b-instruct-v0.3-q5_K_M
```
- **Size**: ~5GB
- **VRAM**: ~4-5GB
- **Speed**: 18-20 tokens/sec (stimato)
- **Context**: 8k tokens
- **Use Case**:
  - Node-RED flows
  - Grafana dashboards
  - InfluxDB queries
  - Home Assistant YAML
  - Docker/Nginx configs

---

## 🚀 Setup Commands (Esegui in ordine)

### Step 1: Cleanup modelli inutili
```bash
# Rimuovi FARA (reasoning model non necessario)
ollama rm fara7b:latest
ollama rm maternion/fara:7b

# Rimuovi duplicati llama3
ollama rm llama3:8b-q4_K_M
ollama rm hf.co/psuplj/Meta-Llama-3-8B-Q4_K_M-GGUF:Q4_K_M

# Verifica spazio liberato
df -h | grep ubuntu-lv
```

**Expected**: ~30GB liberi dopo cleanup

---

### Step 2: Pull Qwen2.5-Coder 14B
```bash
# Pull principale (30-45 min stimati)
ollama pull qwen2.5-coder:14b-instruct-q4_K_M

# Monitor progress in altra finestra
watch -n 5 'df -h | grep ubuntu-lv'
```

⏱️ **Tempo stimato**: 30-45 minuti (~9GB download)

---

### Step 3: Test Qwen 14B Inference
```bash
# Test veloce
ollama run qwen2.5-coder:14b-instruct-q4_K_M "Generate IEC 61131-3 Structured Text code for a TON timer with 10 second preset"

# Monitor VRAM durante inference
watch -n 1 nvidia-smi
```

**Check**:
- ✅ VRAM usage < 8GB
- ✅ Speed > 8 tokens/sec
- ✅ Code quality IEC 61131-3 compliant

---

### Step 4: Pull Mistral 7B
```bash
# Pull secondary model (15-20 min stimati)
ollama pull mistral:7b-instruct-v0.3-q5_K_M

# Test Node-RED generation
ollama run mistral:7b-instruct-v0.3 "Create a Node-RED flow that reads Modbus TCP and stores in InfluxDB"
```

⏱️ **Tempo stimato**: 15-20 minuti (~5GB download)

---

### Step 5: Test Concurrent Inference (Parallelismo)
```bash
# Lancia 2 richieste parallele per testare CPU offloading
(time ollama run qwen2.5-coder:14b-instruct-q4_K_M "Write C++ Modbus RTU function" &)
(time ollama run mistral:7b-instruct-v0.3 "Explain Grafana alerting" &)
wait

# Verifica VRAM finale
nvidia-smi
```

**Expected**:
- Qwen 14B: ~5-6GB VRAM + CPU threads
- Mistral 7B: ~2-3GB VRAM
- Total: <8GB VRAM (fits in A1000)

---

## 🔧 Ollama Configuration per Parallelismo

File già creato: `/home/giuseppe/ai-platform/backend/ollama_config.sh`

```bash
export OLLAMA_NUM_PARALLEL=3           # 3 richieste concorrenti
export OLLAMA_MAX_LOADED_MODELS=2      # Max 2 modelli in VRAM
export OLLAMA_NUM_GPU_LAYERS=35        # 35 layers GPU, resto CPU
export OLLAMA_NUM_THREAD=10            # 10 CPU threads (50% dei 20 core)
export OLLAMA_FLASH_ATTENTION=1        # Speed boost
```

**Apply**:
```bash
source /home/giuseppe/ai-platform/backend/ollama_config.sh
sudo systemctl restart ollama
```

---

## 📊 Performance Benchmarks (da eseguire)

### Benchmark Script
File: `/home/giuseppe/ai-platform/backend/test_parallel_inference.sh`

```bash
chmod +x /home/giuseppe/ai-platform/backend/test_parallel_inference.sh
./test_parallel_inference.sh
```

**Metriche attese**:
- Qwen 14B inference: 10-12 tokens/sec
- Mistral 7B inference: 18-20 tokens/sec
- VRAM peak: <7.5GB
- CPU usage: 50-60% (10 core attivi)

---

## 🎨 System Prompts Industriali

### Preset 1: PLC Coding Mode (Qwen 14B)
- IEC 61131-3 Structured Text
- Omron Sysmac Studio conventions
- Safety checks obbligatori
- Commenti in inglese, spiegazioni in italiano

### Preset 2: Industrial Consultant (Mistral 7B)
- Node-RED flows
- InfluxDB queries
- Grafana dashboards
- Home Assistant automations

### Preset 3: Monitoring Expert (Mistral 7B + RAG)
- Prometheus queries
- Telegraf configs
- Alerting rules
- Performance optimization

**File da creare**: `/home/giuseppe/ai-platform/backend/app/prompts/industrial_prompts.py`

---

## ✅ Checklist Setup

### Phase 1: Cleanup & Pull (Oggi)
- [ ] SSH a server 192.168.1.243
- [ ] Verifica `ollama ps` (nessun modello caricato)
- [ ] Rimuovi fara7b (2 versioni)
- [ ] Rimuovi llama3 duplicati (2 versioni)
- [ ] Verifica spazio disco `df -h`
- [ ] Pull qwen2.5-coder:14b-instruct-q4_K_M
- [ ] Pull mistral:7b-instruct-v0.3-q5_K_M

### Phase 2: Testing (Oggi/Domani)
- [ ] Test Qwen 14B su prompt Sysmac Studio
- [ ] Monitor VRAM con nvidia-smi
- [ ] Test Mistral 7B su Node-RED flow
- [ ] Test inferenza concorrente
- [ ] Benchmark speed (tokens/sec)

### Phase 3: Integration (Domani)
- [ ] Creare `industrial_prompts.py` con system prompts
- [ ] Popolare `model_presets` database table
- [ ] Implementare `IndustrialModelRouter` in backend
- [ ] Modificare `/chat/stream` endpoint con auto-routing
- [ ] Aggiungere UI badge "PLC Mode" / "Integration Mode"

---

## 🚨 Troubleshooting

### Se Qwen 14B è Out Of Memory (OOM)
```bash
# Opzione 1: Riduci GPU layers (più CPU offload)
export OLLAMA_NUM_GPU_LAYERS=25  # Default era 35

# Opzione 2: Fallback a Qwen 7B
ollama run qwen2.5-coder:7b

# Opzione 3: Unload altri modelli prima
curl -X POST http://localhost:11434/api/generate -d '{"model": "llama3:8b", "keep_alive": 0}'
```

### Se Speed < 8 tokens/sec
```bash
# Aumenta CPU threads
export OLLAMA_NUM_THREAD=15  # Da 10 a 15

# Abilita ottimizzazioni
export OLLAMA_FLASH_ATTENTION=1
export OLLAMA_USE_MMAP=1
```

### Se disco pieno durante pull
```bash
# Pulisci cache Docker (se presente)
docker system prune -a

# Rimuovi altri modelli temporaneamente
ollama rm llama3:8b  # Reinstalla dopo se necessario
```

---

## 📝 Note per Backend Integration

### Auto-Routing Keywords
**Route to Qwen 14B**:
- `structured text`, `st`, `plc`, `omron`, `sysmac`
- `function block`, `fb`, `timer`, `counter`, `ladder`
- `c++`, `embedded`, `firmware`

**Route to Mistral 7B**:
- `node-red`, `grafana`, `influxdb`, `prometheus`
- `home assistant`, `yaml`, `automation`
- `docker`, `nginx`, `deployment`

### Database Schema
```sql
-- model_presets table entries
INSERT INTO model_presets (name, model_name, temperature, system_prompt, category) VALUES
('plc_coding_sysmac', 'qwen2.5-coder:14b-instruct-q4_K_M', 0.3, '...', 'industrial_automation'),
('industrial_consultant', 'mistral:7b-instruct-v0.3-q5_K_M', 0.7, '...', 'industrial_automation'),
('monitoring_expert', 'mistral:7b-instruct-v0.3-q5_K_M', 0.5, '...', 'industrial_automation');
```

---

## 🔗 References

- **Ollama Docs**: https://ollama.com/docs
- **Qwen2.5-Coder**: https://ollama.com/library/qwen2.5-coder
- **Mistral**: https://ollama.com/library/mistral
- **PRE_PRODUCTION_CHECKLIST.md**: `/home/giuseppe/ai-platform/PRE_PRODUCTION_CHECKLIST.md`

---

**Ultima modifica**: 7 Dicembre 2025  
**Status**: ⏳ In fase di setup - Esegui Step 1-5 in ordine
