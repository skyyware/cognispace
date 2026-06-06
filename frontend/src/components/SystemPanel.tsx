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

  return (
    <section className="panel system-panel">
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
            <strong>{apiState === "online" ? "Live REST API" : apiState === "connecting" ? "Connecting to REST API" : "Static preview"}</strong>
            <span>{apiState === "connecting" ? "Loading health, spaces and first grounded answer." : health.apiMode}</span>
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
      </div>
    </section>
  );
}
