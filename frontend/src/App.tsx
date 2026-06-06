import { useEffect, useMemo, useState } from "react";
import { ApiContractPanel } from "./components/ApiContractPanel";
import { AgentReadinessPanel } from "./components/AgentReadinessPanel";
import { BrainLifecyclePanel } from "./components/BrainLifecyclePanel";
import { ChatWorkbench } from "./components/ChatWorkbench";
import { DocumentPanel } from "./components/DocumentPanel";
import { EvaluationPanel } from "./components/EvaluationPanel";
import { MetricStrip } from "./components/MetricStrip";
import { SpacePanel } from "./components/SpacePanel";
import { SystemPanel } from "./components/SystemPanel";
import { fallbackDocuments, fallbackHealth, fallbackResponse, fallbackSpaces } from "./data/fallback";
import { askSpaceStream, createDocumentForSpace, loadDocuments, loadHealth, loadSpaces } from "./lib/api";
import type {
  AgentResponse,
  AgentToolCall,
  ApiState,
  CreateDocumentPayload,
  KnowledgeSpace,
  PlatformHealth,
  ResponseMode,
  SourceDocument
} from "./types";

const defaultPrompt = "Which supplier risks need review before connecting the procurement assistant to external applications?";
const minimumRunMs = 1200;

function timestamp() {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function mergeToolTrace(current: AgentToolCall[], next: AgentToolCall) {
  const existingIndex = current.findIndex((tool) => tool.name === next.name);
  if (existingIndex === -1) {
    return [...current, next];
  }
  return current.map((tool, index) => (index === existingIndex ? next : tool));
}

export function App() {
  const [documents, setDocuments] = useState<SourceDocument[]>(fallbackDocuments);
  const [spaces, setSpaces] = useState<KnowledgeSpace[]>(fallbackSpaces);
  const [health, setHealth] = useState<PlatformHealth>(fallbackHealth);
  const [selectedSpaceId, setSelectedSpaceId] = useState(fallbackSpaces[0].id);
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [response, setResponse] = useState<AgentResponse | undefined>();
  const [responseMode, setResponseMode] = useState<ResponseMode>("idle");
  const [lastUpdated, setLastUpdated] = useState<string | undefined>();
  const [streamedAnswer, setStreamedAnswer] = useState("");
  const [streamTools, setStreamTools] = useState<AgentToolCall[]>([]);
  const [streamMessage, setStreamMessage] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [creatingSource, setCreatingSource] = useState(false);
  const [apiState, setApiState] = useState<ApiState>("connecting");
  const localLlmMode = health.apiMode.includes("local-open-source-llm");

  useEffect(() => {
    async function boot() {
      try {
        const [nextDocuments, nextSpaces, nextHealth] = await Promise.all([loadDocuments(), loadSpaces(), loadHealth()]);
        const preferredSpace = nextSpaces.find((space) => space.name === "Supplier Risk Brain") ?? nextSpaces[0];
        setDocuments(nextDocuments);
        setSpaces(nextSpaces);
        setHealth(nextHealth);
        setSelectedSpaceId(preferredSpace?.id ?? fallbackSpaces[0].id);
        setResponse(undefined);
        setResponseMode("idle");
        setApiState("online");
      } catch {
        setApiState("offline");
        setResponse(undefined);
        setResponseMode("idle");
      }
    }

    void boot();
  }, []);

  const selectedSpace = useMemo(
    () => spaces.find((space) => space.id === selectedSpaceId),
    [selectedSpaceId, spaces]
  );

  const selectedDocuments = useMemo(
    () => selectedSpace?.documentIds
      .map((id) => documents.find((document) => document.id === id))
      .filter((document): document is SourceDocument => Boolean(document)) ?? [],
    [documents, selectedSpace]
  );

  async function submitPrompt() {
    if (!selectedSpace || prompt.trim().length === 0) {
      return;
    }

    setLoading(true);
    setResponse(undefined);
    setResponseMode("running");
    setLastUpdated(undefined);
    setStreamedAnswer("");
    setStreamTools([]);
    setStreamMessage(undefined);
    const minimumVisibleRun = wait(minimumRunMs);
    try {
      const answer = await askSpaceStream(selectedSpace.id, prompt, (event) => {
        if (event.type === "run_started" && event.message) {
          setStreamMessage(event.message);
        }
        if (event.type === "step" && event.tool) {
          setStreamTools((current) => mergeToolTrace(current, event.tool as AgentToolCall));
        }
        if (event.type === "answer_delta" && event.delta) {
          setStreamedAnswer((current) => current + event.delta);
        }
      });
      await minimumVisibleRun;
      setResponse(answer);
      setResponseMode("live");
      setLastUpdated(timestamp());
      setApiState("online");
    } catch {
      await minimumVisibleRun;
      setResponse(fallbackResponse);
      setResponseMode("error");
      setLastUpdated(timestamp());
      setApiState("offline");
      setStreamedAnswer("");
      setStreamTools([]);
      setStreamMessage(undefined);
    } finally {
      setLoading(false);
    }
  }

  function selectSpace(spaceId: string) {
    setSelectedSpaceId(spaceId);
    setResponse(undefined);
    setResponseMode("idle");
    setLastUpdated(undefined);
    setStreamedAnswer("");
    setStreamTools([]);
    setStreamMessage(undefined);
  }

  async function createSource(payload: CreateDocumentPayload) {
    if (!selectedSpace) {
      return;
    }

    setCreatingSource(true);
    try {
      const document = await createDocumentForSpace(selectedSpace.id, payload);
      setDocuments((current) => [document, ...current]);
      const nextSpaces = await loadSpaces();
      const nextHealth = await loadHealth();
      setSpaces(nextSpaces);
      setHealth(nextHealth);
      setApiState("online");
    } finally {
      setCreatingSource(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <strong className="brand">CogniSpace</strong>
          <span className="product-context">AI Brain Operations Console</span>
        </div>
        <nav aria-label="Primary">
          <a href="#spaces">Brains</a>
          <a href="#sources">Sources</a>
          <a href="#policies">Policies</a>
          <a href="#api">REST API</a>
          <a href="#evaluation">Evaluation</a>
        </nav>
        <span className={`api-state ${apiState}`}>
          {apiState === "online" ? (localLlmMode ? "Self-hosted LLM connected" : "Live API connected") : apiState === "connecting" ? "Connecting to live API..." : "Static preview mode"}
        </span>
      </header>

      <section className="command-strip">
        <div>
          <p>Selected space</p>
          <h1>{selectedSpace?.name ?? "No space selected"}</h1>
        </div>
          <MetricStrip health={health} selectedDocuments={selectedDocuments} selectedSpace={selectedSpace} spaces={spaces} />
      </section>

      <section className="workspace">
        <aside className="left-column" id="spaces">
          <BrainLifecyclePanel
            apiState={apiState}
            documents={selectedDocuments}
            response={response}
            selectedSpace={selectedSpace}
          />
          <SpacePanel spaces={spaces} documents={documents} selectedSpaceId={selectedSpaceId} onSelect={selectSpace} />
        </aside>

        <section className="center-column">
          <ChatWorkbench
            selectedSpace={selectedSpace}
            prompt={prompt}
            response={response}
            responseMode={responseMode}
            loading={loading}
            apiState={apiState}
            lastUpdated={lastUpdated}
            streamedAnswer={streamedAnswer}
            streamTools={streamTools}
            streamMessage={streamMessage}
            onPromptChange={setPrompt}
            onSubmit={submitPrompt}
          />
          <DocumentPanel documents={selectedDocuments} loading={creatingSource} onCreate={createSource} />
          <EvaluationPanel documents={selectedDocuments} response={response} selectedSpace={selectedSpace} />
        </section>

        <aside className="right-column" id="api">
          <AgentReadinessPanel health={health} response={response} selectedSpace={selectedSpace} />
          <ApiContractPanel selectedSpace={selectedSpace} />
          <SystemPanel apiState={apiState} health={health} selectedDocuments={selectedDocuments} />
        </aside>
      </section>
    </main>
  );
}
