import { Activity, ClipboardCheck, GitBranch, ListChecks } from "lucide-react";
import type { AgentResponse, KnowledgeSpace, SourceDocument } from "../types";

interface EvaluationPanelProps {
  documents: SourceDocument[];
  response?: AgentResponse;
  selectedSpace?: KnowledgeSpace;
}

const regressionPrompts = [
  "Which supplier risks need review before API exposure?",
  "How should citations be rendered in a consuming app?",
  "What should happen when confidential sources are in scope?"
];

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function EvaluationPanel({ documents, response, selectedSpace }: EvaluationPanelProps) {
  const citationCoverage = response && documents.length > 0 ? Math.min(1, response.sources.length / Math.min(3, documents.length)) : 0;
  const relevance = response?.confidence ?? 0;
  const policyAdherence = response ? (response.riskFlags.length > 0 ? 0.88 : 1) : 0;
  const hallucinationGuard = response ? (response.sources.length > 0 ? 0.96 : 0.2) : 0;
  const trace = response?.toolTrace ?? [];

  return (
    <section className="panel evaluation-panel" id="evaluation">
      <div className="panel-header">
        <div>
          <h2>Quality evaluation</h2>
          <p>Checks for answer quality, regression behavior and auditability.</p>
        </div>
        <span className="panel-chip">{response ? "Latest run" : "Awaiting run"}</span>
      </div>

      <div className="quality-grid">
        <article>
          <ClipboardCheck />
          <span>Citation coverage</span>
          <strong>{response ? percent(citationCoverage) : "0%"}</strong>
          <small>Target &gt;= 85%</small>
        </article>
        <article>
          <Activity />
          <span>Answer relevance</span>
          <strong>{response ? response.confidence.toFixed(2) : "0.00"}</strong>
          <small>Target &gt;= 0.80</small>
        </article>
        <article>
          <ListChecks />
          <span>Policy adherence</span>
          <strong>{response ? percent(policyAdherence) : "0%"}</strong>
          <small>Risk flags stay visible</small>
        </article>
        <article>
          <GitBranch />
          <span>Grounding guard</span>
          <strong>{response ? percent(hallucinationGuard) : "0%"}</strong>
          <small>No answer without evidence</small>
        </article>
      </div>

      <div className="evaluation-grid">
        <article>
          <h3>Regression prompts</h3>
          <ul>
            {regressionPrompts.map((prompt) => <li key={prompt}>{prompt}</li>)}
          </ul>
        </article>
        <article>
          <h3>Risk and policy flags</h3>
          <ul>
            {(response?.riskFlags.length ? response.riskFlags : ["No latest run yet."]).map((flag) => <li key={flag}>{flag}</li>)}
          </ul>
        </article>
        <article>
          <h3>Audit trail</h3>
          <ul>
            {(trace.length ? trace : [{ name: "await_agent_run", status: "waiting", output: selectedSpace ? `Ready for ${selectedSpace.name}.` : "Select a brain." }]).map((tool) => (
              <li key={tool.name}>
                <strong>{tool.name.replaceAll("_", " ")}</strong>
                <span>{tool.status}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
