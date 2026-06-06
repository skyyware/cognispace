# Architecture

CogniSpace is built as a fullstack product surface for creating source-grounded knowledge spaces.

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

The chat endpoint runs a reproducible, tool-augmented RAG flow against the selected knowledge space. It classifies intent, expands query terms, retrieves scoped sources, ranks evidence, checks governance constraints and composes a cited answer with confidence, risk flags, suggested actions and a visible tool trace.

The composition step is provider-aware. The default runtime uses a deterministic composer and needs no external credentials. Stage can also run `COGNISPACE_LLM_PROVIDER=ollama`, which sends only the selected prompt, scoped excerpts, risk flags and suggested actions to a local Ollama endpoint bound to `127.0.0.1`. That keeps the open-source model on the server while preserving deterministic retrieval, citations, confidence and governance outside the model.

If the local model is unavailable, slow or returns an empty answer, the endpoint falls back to the deterministic composer and records the fallback in `toolTrace`. This keeps the product operational and audit-friendly instead of coupling availability to a generative model.

## Frontend

The frontend is a React and TypeScript workbench. It loads the REST API when available and uses bundled reference data when the static stage environment is used.

Core views:

- Knowledge-space selector
- Grounded answer workbench
- Source registry with document ingestion
- REST API contract panel
- Governance/runtime inspector

## Deployment

The repository includes Docker, Docker Compose and Kubernetes manifests. The production build compiles the React frontend, copies it into Spring Boot static resources, packages the backend and deploys a single executable JAR. The public stage deployment runs that JAR behind Apache.
