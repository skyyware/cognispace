import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleDashed, Loader2, Send } from "lucide-react";
import type { AgentResponse, ApiState, KnowledgeSpace, ResponseMode } from "../types";

interface ChatWorkbenchProps {
  selectedSpace?: KnowledgeSpace;
  prompt: string;
  submittedPrompt?: string;
  response?: AgentResponse;
  responseMode: ResponseMode;
  loading: boolean;
  apiState: ApiState;
  lastUpdated?: string;
  streamedAnswer: string;
  streamTools: AgentResponse["toolTrace"];
  streamMessage?: string;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
}

const progressSteps = [
  {
    keys: ["classify_intent"],
    label: "Analyze request",
    running: "Classifying intent and constraints",
    complete: "Intent classified"
  },
  {
    keys: ["retrieve_sources"],
    label: "Retrieve evidence",
    running: "Selecting scoped documents",
    complete: "Evidence grounded"
  },
  {
    keys: ["rank_evidence"],
    label: "Rank evidence",
    running: "Scoring citations and source density",
    complete: "Evidence ranked"
  },
  {
    keys: ["check_governance"],
    label: "Check governance",
    running: "Evaluating risk and allowlists",
    complete: "Guardrails checked"
  },
  {
    keys: ["compose_local_llm_answer", "compose_grounded_answer"],
    label: "Compose answer",
    running: "Composing with bounded model context",
    complete: "Answer composed"
  },
  {
    keys: ["evaluate_answer_quality"],
    label: "Evaluate quality",
    running: "Checking citations and policy flags",
    complete: "Quality evaluated"
  }
];

const revealChunkSize = 9;
const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function modeCopy(responseMode: ResponseMode, apiState: ApiState) {
  if (responseMode === "running") {
    return {
      title: "Answer is being generated",
      detail: "The API is streaming pipeline events and answer chunks from the live run."
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
      title: "Preview runtime available",
      detail: "Submit a question to see the same pipeline against bundled review data."
    };
  }
  return {
    title: "Ready to answer",
    detail: "No answer is preloaded. Run the question to watch the knowledge space assemble a grounded response."
  };
}

function runtimeCopy(
  response: AgentResponse | undefined,
  streamMessage: string | undefined,
  hasLocalLlmTool: boolean,
  fallbackCopy: string
) {
  if (response?.runtime) {
    const runtimeType = response.runtime.selfHosted ? "Self-hosted" : "In-process";
    const outcome = response.runtime.fallbackUsed
      ? "fallback composer used"
      : `${response.runtime.latencyMs} ms model latency`;
    return `${runtimeType} ${response.runtime.provider} runtime · ${response.runtime.model} · ${outcome}.`;
  }
  if (streamMessage) {
    return streamMessage;
  }
  if (hasLocalLlmTool) {
    return "This response is grounded by the Spring Boot API and composed by a self-hosted open-source LLM.";
  }
  return fallbackCopy;
}

export function ChatWorkbench({
  selectedSpace,
  prompt,
  submittedPrompt,
  response,
  responseMode,
  loading,
  apiState,
  lastUpdated,
  streamedAnswer,
  streamTools,
  streamMessage,
  onPromptChange,
  onSubmit
}: ChatWorkbenchProps) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [visibleAnswer, setVisibleAnswer] = useState("");
  const toolState = response?.toolTrace ?? streamTools;
  const completedTools = useMemo(
    () => new Set(toolState.filter((tool) => tool.status === "completed").map((tool) => tool.name)),
    [toolState]
  );
  const localLlmTool = useMemo(
    () => toolState.find((tool) => tool.name === "compose_local_llm_answer"),
    [toolState]
  );
  const copy = modeCopy(responseMode, apiState);
  const runtimeDetail = runtimeCopy(response, streamMessage, Boolean(localLlmTool), copy.detail);
  const answerStatus = responseMode === "live" ? "live" : responseMode === "error" ? "error" : responseMode === "running" ? "running" : "preview";
  const activeStep = progressSteps[activeStepIndex];
  const progressTrail = (
    <div className="run-steps" aria-label="Agent progress">
      {progressSteps.map((step, index) => {
        const matchingTools = toolState.filter((tool) => step.keys.includes(tool.name));
        const hasCompleted = matchingTools.some((tool) => tool.status === "completed") || (response && response.toolTrace.length > 0);
        const hasRunning = matchingTools.some((tool) => tool.status === "running");
        const state = responseMode === "running"
          ? hasCompleted ? "complete" : hasRunning || index === activeStepIndex ? "active" : "queued"
          : response ? (step.keys.some((key) => completedTools.has(key)) || response.toolTrace.length > 0 ? "complete" : "queued") : "queued";
        return (
          <article className={state} key={step.label}>
            <span className="step-index"><span className="step-index-value">{index + 1}</span></span>
            {state === "complete" ? <CheckCircle2 /> : state === "active" ? <Loader2 className="spin" /> : <CircleDashed />}
            <div>
              <strong>{step.label}</strong>
              <span>{state === "complete" ? step.complete : state === "active" ? step.running : "Waiting"}</span>
            </div>
          </article>
        );
      })}
    </div>
  );

  useEffect(() => {
    if (responseMode === "running" && streamTools.length > 0) {
      let runningToolName = "";
      for (let index = streamTools.length - 1; index >= 0; index--) {
        if (streamTools[index].status === "running") {
          runningToolName = streamTools[index].name;
          break;
        }
      }
      const runningIndex = progressSteps.findIndex((step) => step.keys.includes(runningToolName));
      if (runningIndex >= 0) {
        setActiveStepIndex(runningIndex);
        return undefined;
      }
      const completedCount = progressSteps.filter((step) =>
        step.keys.some((key) => streamTools.some((tool) => tool.name === key && tool.status === "completed"))
      ).length;
      setActiveStepIndex(Math.min(completedCount, progressSteps.length - 1));
      return undefined;
    }

    if (responseMode !== "running") {
      setActiveStepIndex(response ? progressSteps.length - 1 : 0);
      return undefined;
    }

    setActiveStepIndex(0);
    const interval = window.setInterval(() => {
      setActiveStepIndex((current) => Math.min(current + 1, progressSteps.length - 1));
    }, 760);

    return () => window.clearInterval(interval);
  }, [response, responseMode, streamTools]);

  useEffect(() => {
    if (!response || responseMode === "running") {
      setVisibleAnswer("");
      return undefined;
    }

    if (streamedAnswer && streamedAnswer.trim() === response.answer.trim()) {
      setVisibleAnswer(response.answer);
      return undefined;
    }

    if (window.matchMedia(reducedMotionQuery).matches) {
      setVisibleAnswer(response.answer);
      return undefined;
    }

    setVisibleAnswer("");
    let cursor = 0;
    const interval = window.setInterval(() => {
      cursor = Math.min(cursor + revealChunkSize, response.answer.length);
      setVisibleAnswer(response.answer.slice(0, cursor));
      if (cursor >= response.answer.length) {
        window.clearInterval(interval);
      }
    }, 24);

    return () => window.clearInterval(interval);
  }, [response, responseMode, streamedAnswer]);

  return (
    <section className="panel workbench">
      <div className="panel-header">
        <div>
          <h2>AI Workbench</h2>
          <p>{selectedSpace?.name ?? "No space selected"}</p>
        </div>
        <span className="panel-chip">On-demand</span>
      </div>
      <label htmlFor="prompt">Question</label>
      <textarea
        id="prompt"
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        placeholder="Ask a question that must stay inside the selected knowledge space..."
      />
      <button type="button" onClick={onSubmit} disabled={!selectedSpace || loading || prompt.trim().length === 0}>
        {loading ? <Loader2 className="spin" size={16} /> : <Send size={16} />}
        {loading ? "Generating answer..." : "Run governed answer"}
      </button>

      <div className={`run-status ${answerStatus}`}>
        <div className="status-copy">
          <span>{apiState === "online" ? "Live runtime" : apiState === "connecting" ? "Connecting" : "Preview runtime"}</span>
          <strong>{copy.title}</strong>
          <p>{runtimeDetail}</p>
        </div>
        <small>{lastUpdated ? `Updated ${lastUpdated}` : responseMode === "running" ? "Working now" : "Awaiting run"}</small>
      </div>

      {submittedPrompt ? (
        <div className="submitted-question">
          <span>Submitted question</span>
          <p>{submittedPrompt}</p>
        </div>
      ) : null}

      {response ? null : progressTrail}

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
            <span>API {response.apiVersion}</span>
            {response.runtime.selfHosted ? <span>{response.runtime.model}</span> : null}
            {response.runtime.fallbackUsed ? <span>fallback used</span> : <span>{response.runtime.latencyMs} ms latency</span>}
          </div>
          <p className="answer-text">
            {visibleAnswer}
            {visibleAnswer.length < response.answer.length ? <span className="answer-cursor" aria-hidden="true" /> : null}
          </p>
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
      ) : responseMode === "running" ? (
        <div className="answer-draft" aria-live="polite">
          <div className="generation-mark">
            <span />
            <span />
            <span />
          </div>
          <strong>{activeStep.label}</strong>
          <p>{streamTools.find((tool) => progressSteps[activeStepIndex].keys.includes(tool.name))?.output ?? activeStep.running}</p>
          {streamedAnswer ? (
            <p className="answer-text streaming-answer">
              {streamedAnswer}
              <span className="answer-cursor" aria-hidden="true" />
            </p>
          ) : (
            <div className="draft-lines" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          )}
        </div>
      ) : (
        <div className="empty-response">
          <strong>Ready for live run.</strong>
          <p>Submit the question to generate a fresh response with visible pipeline steps, sources, governance flags and tool trace.</p>
        </div>
      )}
      {response ? progressTrail : null}
    </section>
  );
}
