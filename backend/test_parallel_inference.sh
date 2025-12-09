#!/bin/bash
# Test script per parallelismo multi-model

echo "=== Test 1: Unload modello corrente per liberare VRAM ==="
curl -X POST http://localhost:11434/api/generate -d '{
  "model": "qwen2.5-coder:7b",
  "keep_alive": 0
}'
echo ""
sleep 2

echo "=== Test 2: Verifica VRAM disponibile ==="
nvidia-smi --query-gpu=memory.used,memory.free --format=csv,noheader,nounits
echo ""

echo "=== Test 3: Pull Qwen 14B con offloading automatico ==="
echo "Questo comando può richiedere 30-45 minuti (~9GB download)"
read -p "Procedere con il pull? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ollama pull qwen2.5-coder:14b-instruct-q4_K_M
fi

echo ""
echo "=== Test 4: Benchmark inference speed Qwen 14B ==="
echo "Prompt: Generate Sysmac Studio timer function block"
time ollama run qwen2.5-coder:14b-instruct-q4_K_M "Generate IEC 61131-3 Structured Text code for a TON (Timer On Delay) function block with 10 second preset. Include safety checks and English comments." --verbose

echo ""
echo "=== Test 5: Verifica VRAM usage durante inference ==="
watch -n 1 nvidia-smi

echo ""
echo "=== Test 6: Pull Mistral 7B ==="
read -p "Procedere con pull Mistral? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ollama pull mistral:7b-instruct-v0.3-q5_K_M
fi

echo ""
echo "=== Test 7: Concurrent inference (Qwen + Mistral) ==="
echo "Lanciando 2 richieste parallele..."
(time ollama run qwen2.5-coder:14b-instruct-q4_K_M "Write C++ function to read Modbus TCP" &)
(time ollama run mistral:7b-instruct-v0.3 "Explain Node-RED flow structure" &)
wait

echo ""
echo "=== Test completato ==="
echo "Check nvidia-smi per verifica VRAM finale"
nvidia-smi
