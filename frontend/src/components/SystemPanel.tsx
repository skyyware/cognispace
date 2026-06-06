import { CheckCircle2, CircleDashed, Server, ShieldCheck } from "lucide-react";
import type { ApiState, PlatformHealth, SourceDocument } from "../types";

interface SystemPanelProps {
  apiState: ApiState;
  health: PlatformHealth;
  selectedDocuments: SourceDocument[];
}

export function SystemPanel({ apiState, health, selectedDocuments }: SystemPanelProps) {
  const restrictedInScope = selectedDocuments.filter((document) =>
    ["restricted", "confidential"].includes(document.sensitivity)
  ).length;
  const localLlmMode = health.apiMode.includes("local-open-source-llm");

  return (
    <section className="panel system-panel" id="policies">
      <div className="panel-header">
        <div>
          <h2>Governance</h2>
          <p>Runtime and source-scope controls.</p>
        </div>
        <ShieldCheck />
      </div>

      <div className="status-list">
        <article>
          {apiState === "online" ? <CheckCircle2 /> : <CircleDashed />}
          <div>
            <strong>{apiState === "online" ? (localLlmMode ? "Self-hosted LLM" : "Live REST API") : apiState === "connecting" ? "Connecting to REST API" : "Static preview"}</strong>
            <span>{apiState === "connecting" ? "Loading health, spaces and source scope." : health.apiMode}</span>
          </div>
        </article>
        <article>
          <CheckCircle2 />
          <div>
            <strong>Citations required</strong>
            <span>Every answer returns source snippets.</span>
          </div>
        </article>
        <article>
          <CheckCircle2 />
          <div>
            <strong>Restricted data in scope</strong>
            <span>{restrictedInScope} selected source{restrictedInScope === 1 ? "" : "s"}.</span>
          </div>
        </article>
        <article>
          <Server />
          <div>
            <strong>Deployment-ready</strong>
            <span>Spring Boot, Docker and Kubernetes manifests.</span>
          </div>
        </article>
        <article>
          <CheckCircle2 />
          <div>
            <strong>OpenAPI contract</strong>
            <span>Machine-readable API definition at /api/openapi.</span>
          </div>
        </article>
      </div>
    </section>
  );
}
