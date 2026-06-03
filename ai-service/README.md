# AI Service

FastAPI service for embeddings and streaming chat. Rails calls `/internal/*` with `AI_SERVICE_SECRET`.

## Providers

Set `AI_PROVIDER` in the project root `.env` (or leave empty for auto-detect from API keys).

| Provider | Env | Notes |
|----------|-----|--------|
| `openai` | `OPENAI_API_KEY` | Default |
| `gemini` | `GEMINI_API_KEY` | Google Generative AI SDK |
| `nvidia` | `NVIDIA_API_KEY` | OpenAI-compatible NIM at `integrate.api.nvidia.com` |
| `ollama` | `OLLAMA_BASE_URL` | Local OpenAI-compatible API (default `host.docker.internal:11434`) |
| `mock` | `USE_MOCK_EMBEDDINGS=true` | Deterministic vectors for local dev |

After changing provider or embedding model, **re-upload documents** so chunk vectors and query embeddings use the same model and dimensions.

## Health

```bash
curl http://localhost:8000/health
```

Returns active `provider`, models, and whether a key is configured.

## Ollama with Docker

```bash
docker compose --profile ollama up -d ollama
docker exec -it monlith-ollama-1 ollama pull llama3.2
docker exec -it monlith-ollama-1 ollama pull nomic-embed-text
```

In `.env`:

```
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://ollama:11434/v1
```

Recreate ai-service: `docker compose up -d --force-recreate ai-service`
