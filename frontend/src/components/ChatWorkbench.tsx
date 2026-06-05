import { BrainCircuit, Send } from "lucide-react";
import type { AgentResponse, KnowledgeSpace } from "../types";

interface ChatWorkbenchProps {
  selectedSpace?: KnowledgeSpace;
  prompt: string;
  response?: AgentResponse;
  loading: boolean;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
}

export function ChatWorkbench({ selectedSpace, prompt, response, loading, onPromptChange, onSubmit }: ChatWorkbenchProps) {
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
        <Send size={16} />
        {loading ? "Retrieving..." : "Ask selected space"}
      </button>
      {response ? (
        <div className="answer-card">
          <div className="confidence">
            <span>Confidence</span>
            <strong>{Math.round(response.confidence * 100)}%</strong>
          </div>
          <p>{response.answer}</p>
          <h3>Grounding sources</h3>
          {response.sources.map((source) => (
            <article key={source.documentId}>
              <strong>{source.title}</strong>
              {source.excerpts.map((excerpt) => <blockquote key={excerpt}>{excerpt}</blockquote>)}
            </article>
          ))}
          <h3>Suggested actions</h3>
          <ul>
            {response.suggestedActions.map((action) => <li key={action}>{action}</li>)}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
