import { BrainCircuit, CheckCircle2, CircleDashed, Database, FileCheck2, PlugZap, ShieldCheck } from "lucide-react";
import type { AgentResponse, ApiState, KnowledgeSpace, SourceDocument } from "../types";

interface BrainLifecyclePanelProps {
  apiState: ApiState;
  documents: SourceDocument[];
  response?: AgentResponse;
  selectedSpace?: KnowledgeSpace;
}

function restrictedCount(documents: SourceDocument[]) {
  return documents.filter((document) => ["restricted", "confidential"].includes(document.sensitivity)).length;
}

export function BrainLifecyclePanel({ apiState, documents, response, selectedSpace }: BrainLifecyclePanelProps) {
  const hasSources = documents.length > 0;
  const hasAllowlist = Boolean(selectedSpace?.allowedApplications.length);
  const riskFlags = response?.riskFlags.length ?? 0;
  const evaluated = Boolean(response?.toolTrace.some((tool) => tool.name === "evaluate_answer_quality"));
  const lifecycle = [
    {
      icon: Database,
      title: "Sources",
      detail: `${documents.length} scoped source${documents.length === 1 ? "" : "s"} connected`,
      status: hasSources ? "ready" : "waiting"
    },
    {
      icon: BrainCircuit,
      title: "Scope",
      detail: `${restrictedCount(documents)} restricted source${restrictedCount(documents) === 1 ? "" : "s"} in bounded context`,
      status: hasSources ? "ready" : "waiting"
    },
    {
      icon: ShieldCheck,
      title: "Agent policy",
      detail: riskFlags > 0 ? `${riskFlags} review flag${riskFlags === 1 ? "" : "s"} before automation` : "Human review gate configured",
      status: response && riskFlags > 0 ? "review" : hasAllowlist ? "ready" : "waiting"
    },
    {
      icon: PlugZap,
      title: "API release",
      detail: hasAllowlist ? `${selectedSpace?.allowedApplications.length ?? 0} allowed consuming apps` : "Allowlist required",
      status: hasAllowlist && apiState === "online" ? "ready" : "waiting"
    },
    {
      icon: FileCheck2,
      title: "Evaluation",
      detail: evaluated ? "Quality checks attached to latest run" : "Run a question to create an audit event",
      status: evaluated ? "ready" : "waiting"
    }
  ];

  return (
    <section className="panel lifecycle-panel" aria-label="Brain lifecycle">
      <div className="panel-header">
        <div>
          <h2>Brain lifecycle</h2>
          <p>From source scope to governed API release.</p>
        </div>
      </div>
      <div className="lifecycle-list">
        {lifecycle.map((item, index) => {
          const Icon = item.icon;
          return (
            <article className={item.status} key={item.title}>
              <div className="lifecycle-icon">
                <Icon />
                <span>{index + 1}</span>
              </div>
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
              {item.status === "ready" ? <CheckCircle2 /> : <CircleDashed />}
            </article>
          );
        })}
      </div>
    </section>
  );
}
