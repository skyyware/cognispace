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
}

export interface AgentResponse {
  answer: string;
  sources: GroundingSource[];
  suggestedActions: string[];
  confidence: number;
}

export interface PlatformHealth {
  status: string;
  spaces: number;
  documents: number;
  restrictedDocuments: number;
  apiMode: string;
  generatedAt: string;
}
