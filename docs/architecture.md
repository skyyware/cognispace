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

This keeps the runtime useful without external model credentials while preserving the product mechanics required for a GenAI platform: scoping, source retrieval, citations, confidence, governance and downstream API integration.

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
