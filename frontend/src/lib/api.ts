import type { AgentResponse, CreateDocumentPayload, KnowledgeSpace, PlatformHealth, SourceDocument } from "../types";

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers
    }
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function loadDocuments() {
  return request<SourceDocument[]>("/api/documents");
}

export function loadHealth() {
  return request<PlatformHealth>("/api/health");
}

export function loadSpaces() {
  return request<KnowledgeSpace[]>("/api/spaces");
}

export function askSpace(spaceId: string, prompt: string) {
  return request<AgentResponse>(`/api/spaces/${spaceId}/chat`, {
    method: "POST",
    body: JSON.stringify({ prompt, history: [] })
  });
}

export function createDocument(payload: CreateDocumentPayload) {
  return request<SourceDocument>("/api/documents", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function createDocumentForSpace(spaceId: string, payload: CreateDocumentPayload) {
  return request<SourceDocument>(`/api/spaces/${spaceId}/documents`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
