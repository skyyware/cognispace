# CogniSpace

CogniSpace is a fullstack GenAI knowledge-space workbench. It lets teams connect internal source documents, scope them into governed cognitive spaces, ask grounded questions and expose answers through a REST API contract.

This is built as a working product for the requested project context: React/TypeScript frontend, Java Spring Boot backend, REST APIs, automated tests, Docker and Kubernetes deployment readiness.

## Product workflow

1. Select a knowledge space with scoped sources and allowed consuming applications.
2. Connect a new source document with owner, sensitivity and tags.
3. Ask a prompt through the grounded answer workbench.
4. Receive a cited answer with intent, confidence, risk flags, suggested actions and a transparent agent tool run.
5. Use the generated REST contract to integrate the space into another application while preserving governance signals.

## Stack

- Java 21+, Spring Boot 4.0.6, Web MVC, Validation, Actuator
- React 19, TypeScript 6, Vite 8
- REST API with tool-augmented grounding
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
  "riskFlags": ["Restricted or confidential source in scope: enforce the application allowlist."]
}
```

The public stage runtime does not require external model credentials. The backend implements a reproducible, tool-augmented RAG flow: intent classification, query expansion, scoped source retrieval, evidence ranking, governance checks and grounded answer composition.

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
