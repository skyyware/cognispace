# Architecture

CogniSpace is built as a fullstack product surface for operating source-grounded AI brains. The application deliberately separates brain lifecycle, retrieval, policy checks, model composition, API release and quality evaluation so a consuming enterprise application can trust more than the final generated text.

## Backend

The backend is a Java Spring Boot REST API with an in-memory repository. It exposes:

- `GET /api/health`
- `GET /api/documents`
- `POST /api/documents`
- `GET /api/spaces`
- `GET /api/spaces/{spaceId}`
- `POST /api/spaces`
- `POST /api/spaces/{spaceId}/documents`
- `POST /api/spaces/{spaceId}/chat`
- `POST /api/spaces/{spaceId}/chat/stream`
- `GET /api/openapi`

The chat endpoint runs a reproducible, tool-augmented RAG flow against the selected knowledge space. It classifies intent, expands query terms, retrieves scoped sources with hybrid lexical/vector scoring, ranks evidence, checks governance constraints, composes a cited answer with confidence and runs an explicit quality-evaluation step. The response returns risk flags, suggested actions, runtime metadata, backend evaluation metrics and a visible tool trace.

The streaming endpoint emits NDJSON events for a live consumer experience:

- `run_started` when the server accepts the run
- `step` events for pipeline state
- `answer_delta` chunks while the final answer is rendered
- `final` with the full `AgentResponse`

This keeps the UI from relying on preloaded answer text and gives downstream applications the same progressive-response contract.

The composition step is provider-aware. The default runtime uses a deterministic composer and needs no external credentials. Stage can also run `COGNISPACE_LLM_PROVIDER=ollama`, which sends only the selected prompt, scoped excerpts, risk flags and suggested actions to a local Ollama endpoint bound to `127.0.0.1`. The current stage model is `qwen2.5:3b` for responsive CPU inference; `mistral` is installed as a larger alternative. That keeps the open-source model on the server while preserving deterministic retrieval, citations, confidence and governance outside the model.

If the local model is unavailable, slow or returns an empty answer, the endpoint falls back to the deterministic composer and records the fallback in `toolTrace`. This keeps the product operational and audit-friendly instead of coupling availability to a generative model.

The retrieval layer is intentionally deterministic for the proof. It combines lexical evidence weights with a local hashed vector representation, so source ranking remains reproducible without external embedding credentials. A production deployment could swap the vector implementation for a dedicated embedding model or vector database without changing the public answer contract.

## Frontend

The frontend is a React and TypeScript workbench. It loads the REST API when available and uses bundled reference data when the static stage environment is used.

Core views:

- Brain lifecycle from sources to scope, agent policy, API release and evaluation
- Knowledge-space selector
- Grounded answer workbench
- Source registry with document ingestion
- Agent/API readiness with consuming applications, tool permissions and model runtime
- REST API contract panel
- Governance/runtime inspector
- Quality evaluation with backend-provided citation coverage, regression prompts, policy flags, checks and audit trail

## Deployment

The repository includes Docker, Docker Compose and Kubernetes manifests. The production build compiles the React frontend, copies it into Spring Boot static resources, packages the backend and deploys a single executable JAR. The public stage deployment runs that JAR behind Apache.
