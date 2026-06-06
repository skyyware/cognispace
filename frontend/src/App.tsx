import { useEffect, useMemo, useState } from "react";
import { ApiContractPanel } from "./components/ApiContractPanel";
import { ChatWorkbench } from "./components/ChatWorkbench";
import { DocumentPanel } from "./components/DocumentPanel";
import { MetricStrip } from "./components/MetricStrip";
import { SpacePanel } from "./components/SpacePanel";
import { SystemPanel } from "./components/SystemPanel";
import { fallbackDocuments, fallbackHealth, fallbackResponse, fallbackSpaces } from "./data/fallback";
import { askSpace, createDocumentForSpace, loadDocuments, loadHealth, loadSpaces } from "./lib/api";
import type { AgentResponse, CreateDocumentPayload, KnowledgeSpace, PlatformHealth, SourceDocument } from "./types";

const defaultPrompt = "Which supplier risks need review before connecting the procurement assistant to external applications?";

export function App() {
  const [documents, setDocuments] = useState<SourceDocument[]>(fallbackDocuments);
  const [spaces, setSpaces] = useState<KnowledgeSpace[]>(fallbackSpaces);
  const [health, setHealth] = useState<PlatformHealth>(fallbackHealth);
  const [selectedSpaceId, setSelectedSpaceId] = useState(fallbackSpaces[0].id);
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [response, setResponse] = useState<AgentResponse | undefined>(fallbackResponse);
  const [loading, setLoading] = useState(false);
  const [creatingSource, setCreatingSource] = useState(false);
  const [apiState, setApiState] = useState<"offline" | "online">("offline");

  useEffect(() => {
    async function boot() {
      try {
        const [nextDocuments, nextSpaces, nextHealth] = await Promise.all([loadDocuments(), loadSpaces(), loadHealth()]);
        const preferredSpace = nextSpaces.find((space) => space.name === "Supplier Risk Brain") ?? nextSpaces[0];
        setDocuments(nextDocuments);
        setSpaces(nextSpaces);
        setHealth(nextHealth);
        setSelectedSpaceId(preferredSpace?.id ?? fallbackSpaces[0].id);
        if (preferredSpace) {
          setResponse(await askSpace(preferredSpace.id, defaultPrompt));
        }
        setApiState("online");
      } catch {
        setApiState("offline");
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
    try {
      const answer = await askSpace(selectedSpace.id, prompt);
      setResponse(answer);
      setApiState("online");
    } catch {
      setResponse(fallbackResponse);
      setApiState("offline");
    } finally {
      setLoading(false);
    }
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
          <span className="product-context">Cognitive knowledge workspace</span>
        </div>
        <nav aria-label="Primary">
          <a href="#spaces">Spaces</a>
          <a href="#sources">Sources</a>
          <a href="#api">REST API</a>
        </nav>
        <span className={`api-state ${apiState}`}>{apiState === "online" ? "Spring Boot API online" : "Fallback mode"}</span>
      </header>

      <section className="command-strip">
        <div>
          <p>Selected space</p>
          <h1>{selectedSpace?.name ?? "No space selected"}</h1>
        </div>
        <MetricStrip health={health} selectedDocuments={selectedDocuments} spaces={spaces} />
      </section>

      <section className="workspace">
        <aside className="left-column" id="spaces">
          <SpacePanel spaces={spaces} documents={documents} selectedSpaceId={selectedSpaceId} onSelect={setSelectedSpaceId} />
        </aside>

        <section className="center-column">
          <ChatWorkbench
            selectedSpace={selectedSpace}
            prompt={prompt}
            response={response}
            loading={loading}
            onPromptChange={setPrompt}
            onSubmit={submitPrompt}
          />
          <DocumentPanel documents={selectedDocuments} loading={creatingSource} onCreate={createSource} />
        </section>

        <aside className="right-column" id="api">
          <ApiContractPanel selectedSpace={selectedSpace} />
          <SystemPanel apiState={apiState} health={health} selectedDocuments={selectedDocuments} />
        </aside>
      </section>
    </main>
  );
}
