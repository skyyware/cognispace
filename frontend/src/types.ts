export interface SourceDocument {
  id: string;
  title: string;
  owner: string;
  sensitivity: string;
  tags: string[];
  content: string;
  ingestedAt: string;
}

export type CreateDocumentPayload = Pick<SourceDocument, "title" | "owner" | "sensitivity" | "tags" | "content">;

export interface KnowledgeSpace {
  id: string;
  name: string;
  purpose: string;
  documentIds: string[];
  allowedApplications: string[];
  updatedAt: string;
}

export interface GroundingSource {
  documentId: string;
  title: string;
  score: number;
  excerpts: string[];
  vectorRelevance: number;
  matchedTerms: string[];
}

export interface AgentToolCall {
  name: string;
  status: string;
  output: string;
}

export interface AgentResponse {
  answer: string;
  sources: GroundingSource[];
  suggestedActions: string[];
  confidence: number;
  intent: string;
  toolTrace: AgentToolCall[];
  riskFlags: string[];
  evaluation: AnswerEvaluation;
  runtime: ModelRuntime;
  apiVersion: string;
}

export interface AnswerEvaluation {
  citationCoverage: number;
  answerRelevance: number;
  policyAdherence: number;
  groundingGuard: number;
  decision: string;
  checks: string[];
}

export interface ModelRuntime {
  provider: string;
  model: string;
  selfHosted: boolean;
  fallbackUsed: boolean;
  latencyMs: number;
  contextSources: number;
  serverBinding: string;
}

export interface ChatStreamEvent {
  type: "run_started" | "step" | "answer_delta" | "final";
  tool?: AgentToolCall | null;
  delta?: string | null;
  response?: AgentResponse | null;
  message?: string | null;
}

export interface PlatformHealth {
  status: string;
  spaces: number;
  documents: number;
  restrictedDocuments: number;
  apiMode: string;
  generatedAt: string;
}

export type ApiState = "connecting" | "offline" | "online";

export type ResponseMode = "idle" | "preview" | "running" | "live" | "error";
