import type { AgentResponse, KnowledgeSpace, PlatformHealth, SourceDocument } from "../types";

export const fallbackDocuments: SourceDocument[] = [
  {
    id: "doc-supplier-risk",
    title: "Supplier risk intake policy",
    owner: "Procurement Excellence",
    sensitivity: "restricted",
    tags: ["supplier-risk", "procurement", "owner"],
    content: "Supplier data can be connected to an AI assistant only when business owner, data sensitivity, supplier segment and allowed consuming applications are declared.",
    ingestedAt: new Date().toISOString()
  },
  {
    id: "doc-guardrails",
    title: "Enterprise data handling guardrails",
    owner: "AI Governance",
    sensitivity: "confidential",
    tags: ["governance", "privacy", "allowlist"],
    content: "Confidential sources require explicit application allowlists, audit-friendly citations and confidence indicators in every generated response.",
    ingestedAt: new Date().toISOString()
  },
  {
    id: "doc-api",
    title: "Agent API integration contract",
    owner: "Platform Engineering",
    sensitivity: "internal",
    tags: ["api", "spring-boot", "integration"],
    content: "Applications call the knowledge-space REST endpoint with prompt and optional history. The response contains answer, sources, suggested actions and confidence.",
    ingestedAt: new Date().toISOString()
  }
];

export const fallbackSpaces: KnowledgeSpace[] = [
  {
    id: "space-supplier-risk",
    name: "Supplier Risk Brain",
    purpose: "Answer supplier-risk questions with governed procurement, quality and API context.",
    documentIds: fallbackDocuments.map((document) => document.id),
    allowedApplications: ["procurement-assistant", "risk-dashboard", "supplier-portal", "contract-insights", "compliance-monitor", "integration-gateway"],
    updatedAt: new Date().toISOString()
  }
];

export const fallbackResponse: AgentResponse = {
  answer: "Use the selected space as bounded context, keep source citations attached to the answer, confirm sensitivity and allowed applications, and route supplier-critical findings to human review before publishing them through the REST endpoint.",
  confidence: 0.82,
  intent: "agent-api-integration",
  riskFlags: ["Restricted or confidential source in scope: enforce the application allowlist."],
  toolTrace: [
    {
      name: "classify_intent",
      status: "completed",
      output: "Detected agent-api-integration."
    },
    {
      name: "retrieve_sources",
      status: "completed",
      output: "Selected scoped sources for a grounded answer."
    },
    {
      name: "check_governance",
      status: "completed",
      output: "Risk flags require review before automation."
    },
    {
      name: "evaluate_answer_quality",
      status: "completed",
      output: "Checked citation coverage, confidence and visible risk flags."
    }
  ],
  suggestedActions: ["Review cited snippets", "Confirm application allowlist", "Expose answer and citations together via REST"],
  sources: [
    {
      documentId: "doc-api",
      title: "Agent API integration contract",
      score: 4,
      excerpts: ["The response contains answer, sources, suggested actions and confidence."],
      vectorRelevance: 0.74,
      matchedTerms: ["api", "agent", "applications"]
    }
  ],
  evaluation: {
    citationCoverage: 0.67,
    answerRelevance: 0.82,
    policyAdherence: 0.88,
    groundingGuard: 0.96,
    decision: "review_required",
    checks: ["citation_coverage:67%", "answer_relevance:82%", "policy_flags_visible:true", "grounded_sources:1"]
  },
  runtime: {
    provider: "static-preview",
    model: "deterministic composer",
    selfHosted: false,
    fallbackUsed: true,
    latencyMs: 0,
    contextSources: 1,
    serverBinding: "bundled preview data"
  },
  apiVersion: "v1"
};

export const fallbackHealth: PlatformHealth = {
  status: "fallback",
  spaces: fallbackSpaces.length,
  documents: fallbackDocuments.length,
  restrictedDocuments: 2,
  apiMode: "static-preview",
  generatedAt: new Date().toISOString()
};
