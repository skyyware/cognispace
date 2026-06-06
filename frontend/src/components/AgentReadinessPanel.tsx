import { KeyRound, ServerCog } from "lucide-react";
import type { AgentResponse, KnowledgeSpace, PlatformHealth } from "../types";

interface AgentReadinessPanelProps {
  health: PlatformHealth;
  response?: AgentResponse;
  selectedSpace?: KnowledgeSpace;
}

const applicationPurpose: Record<string, string> = {
  "procurement-assistant": "Primary UI",
  "risk-dashboard": "Analytics",
  "supplier-portal": "External workflow",
  "contract-insights": "Reporting",
  "compliance-monitor": "Monitoring",
  "integration-gateway": "System sync",
  "engineering-chat": "Team assistant",
  "figma-handoff": "Delivery handoff",
  "platform-api": "API consumer"
};

const toolPermissions = [
  ["doc.search", "Semantic retrieval", "allowed"],
  ["doc.fetch", "Scoped excerpts", "allowed"],
  ["policy.check", "Allowlist and sensitivity", "allowed"],
  ["llm.compose", "Local answer composition", "server-bound"],
  ["api.respond", "Structured REST response", "allowed"]
] as const;

function modelName(apiMode: string) {
  const match = apiMode.match(/\(([^)]+)\)/);
  return match?.[1] ?? "deterministic composer";
}

export function AgentReadinessPanel({ health, response, selectedSpace }: AgentReadinessPanelProps) {
  const localLlmMode = health.apiMode.includes("local-open-source-llm");
  const apiPath = selectedSpace ? `/api/spaces/${selectedSpace.id}/chat` : "/api/spaces/{spaceId}/chat";
  const localTool = response?.toolTrace.find((tool) => tool.name === "compose_local_llm_answer");
  const latency = localTool?.output.match(/in ([0-9]+) ms/)?.[1];

  return (
    <section className="panel readiness-panel">
      <div className="panel-header">
        <div>
          <h2>Agent / API readiness</h2>
          <p>Consumer allowlist, tool policy and runtime contract.</p>
        </div>
        <span className="ready-dot">Ready</span>
      </div>

      <div className="readiness-block">
        <div className="block-heading">
          <strong>Allowed consuming applications</strong>
          <span>{selectedSpace?.allowedApplications.length ?? 0}</span>
        </div>
        <div className="compact-table">
          {(selectedSpace?.allowedApplications ?? []).map((application) => (
            <div key={application}>
              <span>{application}</span>
              <span>{applicationPurpose[application] ?? "Application"}</span>
              <strong>Allowed</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="readiness-block">
        <div className="block-heading">
          <strong>Tool permissions</strong>
          <span>{toolPermissions.length}</span>
        </div>
        <div className="compact-table">
          {toolPermissions.map(([tool, purpose, status]) => (
            <div key={tool}>
              <span>{tool}</span>
              <span>{purpose}</span>
              <strong>{status}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="endpoint-card">
        <KeyRound />
        <div>
          <span>API endpoint</span>
          <strong>POST https://cognispace.stage.dev{apiPath}</strong>
        </div>
      </div>

      <div className="runtime-grid">
        <article>
          <ServerCog />
          <span>Runtime</span>
          <strong>{localLlmMode ? "Ollama local" : "Grounded composer"}</strong>
        </article>
        <article>
          <span>Model</span>
          <strong>{modelName(health.apiMode)}</strong>
        </article>
        <article>
          <span>Latency</span>
          <strong>{latency ? `${latency} ms` : "measured per run"}</strong>
        </article>
        <article>
          <span>Fallback</span>
          <strong>Enabled</strong>
        </article>
      </div>
    </section>
  );
}
