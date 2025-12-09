#!/bin/bash
# Ollama Multi-Model Configuration
# Hardware: Intel Core Ultra 7 265 (20 cores) + RTX A1000 8GB + 28GB RAM

# Environment variables per ottimizzazione parallelismo
export OLLAMA_NUM_PARALLEL=3           # 3 modelli concorrenti
export OLLAMA_MAX_LOADED_MODELS=2      # Max 2 modelli in VRAM simultanei
export OLLAMA_NUM_GPU_LAYERS=35        # Qwen 14B: 35 layers su GPU, resto su CPU
export OLLAMA_NUM_THREAD=10            # 10 CPU threads per inferenza
export OLLAMA_FLASH_ATTENTION=1        # Flash attention per speed boost

# GPU Memory Management
export CUDA_VISIBLE_DEVICES=0          # Usa solo GPU 0 (RTX A1000)
export OLLAMA_GPU_OVERHEAD=500         # 500MB reserved per overhead

# Model-specific tuning (opzionale - override in API calls)
# Qwen 14B: temperature=0.3, num_ctx=16384
# Mistral 7B: temperature=0.7, num_ctx=8192

echo "Ollama optimized for:"
echo "- CPU: 10 threads (50% dei 20 core disponibili)"
echo "- GPU: 35 layers (~5GB VRAM) + CPU offload"
echo "- Parallel models: 3 concurrent requests"
echo ""
echo "Apply with: source ollama_config.sh && sudo systemctl restart ollama"
