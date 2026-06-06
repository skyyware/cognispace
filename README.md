# CogniSpace

CogniSpace is a fullstack GenAI brain-operations console. It lets teams connect internal source documents, scope them into governed cognitive spaces, run grounded agent answers, evaluate answer quality and expose results through a REST API contract.

This is built as a working product for the requested project context: React/TypeScript frontend, Java Spring Boot backend, REST APIs, automated tests, Docker and Kubernetes deployment readiness.

## Product workflow

1. Select a knowledge space with scoped sources and allowed consuming applications.
2. Connect a new source document with owner, sensitivity and tags.
3. Review the brain lifecycle from source scope to agent policy, API release and evaluation.
4. Ask a prompt through the grounded answer workbench.
5. Watch the live API stream pipeline events and answer chunks.
6. Receive a cited answer with intent, confidence, risk flags, suggested actions, local LLM composition, runtime metadata and a transparent agent tool run.
7. Review backend-generated quality evaluation, regression prompts and audit events.
8. Use the REST or streaming contract to integrate the brain into another application while preserving governance signals.

## Stack

- Java 21+, Spring Boot 4.0.6, Web MVC, Validation, Actuator
- React 19, TypeScript 6, Vite 8
- REST API with hybrid lexical/vector retrieval, tool-augmented grounding and optional self-hosted LLM composition
- Vitest and Spring Boot tests
- Docker, Docker Compose, Kubernetes manifests
- GitHub Actions CI

## Local setup

Install dependencies:

```bash
brew install maven node
npm run install:all
```

Run backend and frontend in two terminals for development:

```bash
npm run backend:dev
npm run frontend:dev
```

Open:

```text
http://localhost:5173
```

Run all checks:

```bash
npm run check
```

Build the production artifact:

```bash
npm run build
java -jar backend/target/cognispace-api-1.0.0.jar
```

The production JAR serves both the Spring Boot REST API and the compiled React application.

## API

```http
POST /api/spaces/{spaceId}/chat
Content-Type: application/json

{
  "prompt": "How do we expose REST APIs for agent applications?",
  "history": []
}
```

Response shape:

```json
{
  "answer": "...",
  "sources": [{ "documentId": "...", "title": "...", "score": 4, "excerpts": ["..."] }],
  "suggestedActions": ["..."],
  "confidence": 0.84,
  "intent": "agent-api-integration",
  "toolTrace": [
    { "name": "classify_intent", "status": "completed", "output": "Detected agent-api-integration." }
  ],
  "riskFlags": ["Restricted or confidential source in scope: enforce the application allowlist."],
  "evaluation": {
    "citationCoverage": 1,
    "answerRelevance": 0.84,
    "policyAdherence": 0.88,
    "groundingGuard": 0.96,
    "decision": "review_required",
    "checks": ["citation_coverage:100%", "answer_relevance:84%", "policy_flags_visible:true", "grounded_sources:3"]
  },
  "runtime": {
    "provider": "ollama",
    "model": "qwen2.5:3b",
    "selfHosted": true,
    "fallbackUsed": false,
    "latencyMs": 1380,
    "contextSources": 3,
    "serverBinding": "server-local Ollama endpoint"
  },
  "apiVersion": "v1"
}
```

Streaming endpoint:

```http
POST /api/spaces/{spaceId}/chat/stream
Content-Type: application/json
Accept: application/x-ndjson
```

The stream emits `run_started`, `step`, `answer_delta` and `final` events. The final event contains the same `AgentResponse` contract as the non-streaming endpoint.

OpenAPI contract:

```http
GET /api/openapi
```

The backend implements a reproducible, tool-augmented RAG flow: intent classification, query expansion, hybrid lexical/vector retrieval, evidence ranking, governance checks, grounded answer composition and explicit backend quality evaluation.

By default this runs without external model credentials. For a self-hosted GenAI runtime, set:

```bash
COGNISPACE_LLM_PROVIDER=ollama
COGNISPACE_LLM_OLLAMA_URL=http://127.0.0.1:11434
COGNISPACE_LLM_MODEL=qwen2.5:3b
COGNISPACE_LLM_TIMEOUT_MS=45000
COGNISPACE_LLM_MAX_OUTPUT_TOKENS=240
COGNISPACE_LLM_TEMPERATURE=0.18
```

In Ollama mode the REST endpoint still performs deterministic retrieval, ranking, confidence scoring and governance checks. The local open-source model only composes the final answer from the selected evidence. If the local model is unavailable or times out, the endpoint falls back to the deterministic composer and records that in `toolTrace`. Stage currently uses `qwen2.5:3b` for responsive CPU inference; `mistral` is also installed as a larger alternative.

## Deployment

Stage:

```text
https://cognispace.stage.dev
```

Deploy the fullstack JAR to stage:

```bash
npm run deploy:stage
```

See `docs/architecture.md` for implementation details.
