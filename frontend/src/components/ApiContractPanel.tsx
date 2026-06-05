import type { KnowledgeSpace } from "../types";

export function ApiContractPanel({ selectedSpace }: { selectedSpace?: KnowledgeSpace }) {
  const path = selectedSpace ? `/api/spaces/${selectedSpace.id}/chat` : "/api/spaces/{spaceId}/chat";

  return (
    <section className="panel api-panel">
      <div className="panel-header">
        <div>
          <h2>REST contract</h2>
          <p>Grounded answer endpoint for downstream applications.</p>
        </div>
      </div>
      <pre>{`curl -X POST https://cognispace.stage.dev${path} \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Which supplier risks need review?",
    "history": []
  }'`}
      </pre>
      <pre>{`POST ${path}
Content-Type: application/json

{
  "prompt": "How should this answer be exposed?",
  "history": []
}`}</pre>
      <div className="contract-grid">
        <article>
          <span>Response</span>
          <strong>answer, sources, actions, confidence</strong>
        </article>
        <article>
          <span>Guardrails</span>
          <strong>space scope + allowed applications</strong>
        </article>
      </div>
    </section>
  );
}
