import type {
  AgentResponse,
  ChatStreamEvent,
  CreateDocumentPayload,
  KnowledgeSpace,
  PlatformHealth,
  SourceDocument
} from "../types";

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

export async function askSpaceStream(
  spaceId: string,
  prompt: string,
  onEvent: (event: ChatStreamEvent) => void
) {
  const response = await fetch(`${baseUrl}/api/spaces/${spaceId}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ prompt, history: [] })
  });

  if (!response.ok || !response.body) {
    throw new Error(`Streaming API request failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResponse: AgentResponse | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const event = parseStreamEvent(line);
      if (!event) {
        continue;
      }
      onEvent(event);
      if (event.type === "final" && event.response) {
        finalResponse = event.response;
      }
    }
  }

  const finalEvent = parseStreamEvent(buffer);
  if (finalEvent) {
    onEvent(finalEvent);
    if (finalEvent.type === "final" && finalEvent.response) {
      finalResponse = finalEvent.response;
    }
  }

  if (!finalResponse) {
    throw new Error("Streaming API did not return a final response.");
  }

  return finalResponse;
}

function parseStreamEvent(line: string) {
  const trimmed = line.trim();
  if (!trimmed) {
    return undefined;
  }
  return JSON.parse(trimmed) as ChatStreamEvent;
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
