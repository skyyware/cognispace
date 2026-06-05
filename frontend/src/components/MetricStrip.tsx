import { Brain, FileText, KeyRound, ShieldCheck } from "lucide-react";
import type { KnowledgeSpace, PlatformHealth, SourceDocument } from "../types";

export function MetricStrip({
  health,
  selectedDocuments,
  spaces
}: {
  health: PlatformHealth;
  selectedDocuments: SourceDocument[];
  spaces: KnowledgeSpace[];
}) {
  const appCount = new Set(spaces.flatMap((space) => space.allowedApplications)).size;

  return (
    <section className="metric-strip" aria-label="Knowledge platform metrics">
      <article>
        <Brain />
        <span>Spaces</span>
        <strong>{spaces.length}</strong>
      </article>
      <article>
        <FileText />
        <span>Scoped sources</span>
        <strong>{selectedDocuments.length}</strong>
      </article>
      <article>
        <ShieldCheck />
        <span>Restricted</span>
        <strong>{health.restrictedDocuments}</strong>
      </article>
      <article>
        <KeyRound />
        <span>Allowed apps</span>
        <strong>{appCount}</strong>
      </article>
    </section>
  );
}
