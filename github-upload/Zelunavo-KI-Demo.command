#!/bin/bash
cd "$(dirname "$0")" || exit 1
echo "Zelunavo KI-Demo startet lokal mit Ollama und qwen3.5:9b."
if curl -fsS --max-time 2 http://127.0.0.1:8766/api/ki/status >/dev/null 2>&1; then
  open http://127.0.0.1:8766/
  exit 0
fi
(sleep 2; open http://127.0.0.1:8766/) &
python3 zelunavo_local_ai.py
