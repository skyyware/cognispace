import { BrainCircuit, CheckCircle2, CircleDashed, Loader2, Send } from "lucide-react";
import type { AgentResponse, ApiState, KnowledgeSpace, ResponseMode } from "../types";

interface ChatWorkbenchProps {
  selectedSpace?: KnowledgeSpace;
  prompt: string;
  response?: AgentResponse;
  responseMode: ResponseMode;
  loading: boolean;
  apiState: ApiState;
  lastUpdated?: string;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
}

const progressSteps = [
  { key: "classify_intent", label: "Intent", hint: "Classify request" },
  { key: "retrieve_sources", label: "Sources", hint: "Retrieve scoped evidence" },
  { key: "check_governance", label: "Governance", hint: "Evaluate risk flags" },
  { key: "compose_grounded_answer", label: "Answer", hint: "Compose cited output" }
];

function modeCopy(responseMode: ResponseMode, apiState: ApiState) {
  if (responseMode === "running") {
    return {
      title: "Agent run in progress",
      detail: "Classifying intent, retrieving sources and checking governance before composing an answer."
    };
  }
  if (responseMode === "live") {
    return {
      title: "Live answer generated",
      detail: "This response came from the Spring Boot API and was grounded against the selected knowledge space."
    };
  }
  if (responseMode === "error") {
    return {
      title: "Live API unavailable",
      detail: "Showing the bundled preview response so the workflow remains reviewable."
    };
  }
  if (responseMode === "preview" || apiState !== "online") {
    return {
      title: "Preview data visible",
      detail: "Reference data is visible while CogniSpace connects to the live API."
    };
  }
  return {
    title: "Ready for a live run",
    detail: "Ask the selected knowledge space to generate a fresh grounded response."
  };
}

export function ChatWorkbench({
  selectedSpace,
  prompt,
  response,
  responseMode,
  loading,
  apiState,
  lastUpdated,
  onPromptChange,
  onSubmit
}: ChatWorkbenchProps) {
  const completedTools = new Set(response?.toolTrace.map((tool) => tool.name) ?? []);
  const copy = modeCopy(responseMode, apiState);
  const answerStatus = responseMode === "live" ? "live" : responseMode === "error" ? "error" : responseMode === "running" ? "running" : "preview";

  return (
    <section className="panel workbench">
      <div className="panel-header">
        <div>
          <h2>Grounded answer</h2>
          <p>{selectedSpace?.name ?? "No space selected"}</p>
        </div>
        <BrainCircuit />
      </div>
      <label htmlFor="prompt">Prompt</label>
      <textarea
        id="prompt"
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        placeholder="Ask a question that must stay inside the selected knowledge space..."
      />
      <button type="button" onClick={onSubmit} disabled={!selectedSpace || loading || prompt.trim().length === 0}>
        {loading ? <Loader2 className="spin" size={16} /> : <Send size={16} />}
        {loading ? "Running agent..." : "Ask selected space"}
      </button>

      <div className={`run-status ${answerStatus}`}>
        <div className="status-copy">
          <span>{apiState === "online" ? "Live runtime" : apiState === "connecting" ? "Connecting" : "Preview runtime"}</span>
          <strong>{copy.title}</strong>
          <p>{copy.detail}</p>
        </div>
        <small>{lastUpdated ? `Updated ${lastUpdated}` : responseMode === "running" ? "Working now" : "Awaiting run"}</small>
      </div>

      <div className="run-steps" aria-label="Agent progress">
        {progressSteps.map((step, index) => {
          const state = responseMode === "running"
            ? index === 0 ? "active" : "queued"
            : completedTools.has(step.key) ? "complete" : "queued";
          return (
            <article className={state} key={step.key}>
              {state === "complete" ? <CheckCircle2 /> : state === "active" ? <Loader2 className="spin" /> : <CircleDashed />}
              <div>
                <strong>{step.label}</strong>
                <span>{step.hint}</span>
              </div>
            </article>
          );
        })}
      </div>

      {response ? (
        <div className="answer-card">
          <div className="confidence">
            <span>{responseMode === "live" ? "Live" : responseMode === "error" ? "Fallback" : "Preview"} · Intent: {response.intent}</span>
            <strong>{Math.round(response.confidence * 100)}%</strong>
          </div>
          <div className="answer-meta" aria-label="Answer metadata">
            <span>{response.sources.length} sources selected</span>
            <span>{response.riskFlags.length} risk flags</span>
            <span>{response.toolTrace.length} tools completed</span>
          </div>
          <p>{response.answer}</p>
          {response.riskFlags.length > 0 ? (
            <>
              <h3>Risk flags</h3>
              <ul className="risk-list">
                {response.riskFlags.map((flag) => <li key={flag}>{flag}</li>)}
              </ul>
            </>
          ) : null}
          <h3>Grounding sources</h3>
          {response.sources.map((source) => (
            <article key={source.documentId}>
              <strong>{source.title}</strong>
              {source.excerpts.map((excerpt) => <blockquote key={excerpt}>{excerpt}</blockquote>)}
            </article>
          ))}
          <h3>Agent tool run</h3>
          <div className="tool-trace">
            {response.toolTrace.map((tool) => (
              <article key={tool.name}>
                <span>{tool.status}</span>
                <strong>{tool.name.replaceAll("_", " ")}</strong>
                <p>{tool.output}</p>
              </article>
            ))}
          </div>
          <h3>Suggested actions</h3>
          <ul>
            {response.suggestedActions.map((action) => <li key={action}>{action}</li>)}
          </ul>
        </div>
      ) : responseMode !== "running" ? (
        <div className="empty-response">
          <strong>No answer for this space yet.</strong>
          <p>Run the selected space to generate a live grounded answer with sources, governance flags and a tool trace.</p>
        </div>
      ) : null}
    </section>
  );
}
