package com.skyyware.cognispace;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

final class OpenApiCatalog {
    private OpenApiCatalog() {
    }

    static Map<String, Object> document() {
        LinkedHashMap<String, Object> root = new LinkedHashMap<>();
        root.put("openapi", "3.1.0");
        root.put("info", Map.of(
            "title", "CogniSpace AI Brain API",
            "version", "1.0.0",
            "description", "Source-grounded AI brain operations API with local model runtime, governance and answer evaluation."
        ));
        root.put("servers", List.of(Map.of("url", "https://cognispace.stage.dev")));
        root.put("paths", paths());
        root.put("components", Map.of("schemas", schemas()));
        return root;
    }

    private static Map<String, Object> paths() {
        LinkedHashMap<String, Object> paths = new LinkedHashMap<>();
        paths.put("/api/health", Map.of("get", Map.of(
            "summary", "Read platform health and runtime mode",
            "responses", ok("#/components/schemas/PlatformHealth")
        )));
        paths.put("/api/spaces", Map.of("get", Map.of(
            "summary", "List knowledge spaces",
            "responses", okArray("#/components/schemas/KnowledgeSpace")
        )));
        paths.put("/api/documents", Map.of("get", Map.of(
            "summary", "List source documents",
            "responses", okArray("#/components/schemas/SourceDocument")
        )));
        paths.put("/api/spaces/{spaceId}/chat", Map.of("post", Map.of(
            "summary", "Generate a governed, source-grounded answer",
            "parameters", List.of(pathParameter("spaceId")),
            "requestBody", jsonBody("#/components/schemas/ChatRequest"),
            "responses", ok("#/components/schemas/AgentResponse")
        )));
        paths.put("/api/spaces/{spaceId}/chat/stream", Map.of("post", Map.of(
            "summary", "Stream pipeline events and answer chunks as NDJSON",
            "parameters", List.of(pathParameter("spaceId")),
            "requestBody", jsonBody("#/components/schemas/ChatRequest"),
            "responses", Map.of("200", Map.of(
                "description", "NDJSON stream of ChatStreamEvent objects",
                "content", Map.of("application/x-ndjson", Map.of("schema", schemaRef("#/components/schemas/ChatStreamEvent")))
            ))
        )));
        return paths;
    }

    private static Map<String, Object> schemas() {
        LinkedHashMap<String, Object> schemas = new LinkedHashMap<>();
        schemas.put("ChatRequest", objectSchema(Map.of(
            "prompt", Map.of("type", "string"),
            "history", Map.of("type", "array", "items", schemaRef("#/components/schemas/ChatMessage"))
        )));
        schemas.put("ChatMessage", objectSchema(Map.of(
            "role", Map.of("type", "string"),
            "content", Map.of("type", "string")
        )));
        schemas.put("AgentResponse", objectSchema(Map.of(
            "answer", Map.of("type", "string"),
            "sources", arrayOf("#/components/schemas/GroundingSource"),
            "suggestedActions", arrayOfString(),
            "confidence", Map.of("type", "number"),
            "intent", Map.of("type", "string"),
            "toolTrace", arrayOf("#/components/schemas/AgentToolCall"),
            "riskFlags", arrayOfString(),
            "evaluation", schemaRef("#/components/schemas/AnswerEvaluation"),
            "runtime", schemaRef("#/components/schemas/ModelRuntime"),
            "apiVersion", Map.of("type", "string")
        )));
        schemas.put("GroundingSource", objectSchema(Map.of(
            "documentId", Map.of("type", "string"),
            "title", Map.of("type", "string"),
            "score", Map.of("type", "number"),
            "excerpts", arrayOfString(),
            "vectorRelevance", Map.of("type", "number"),
            "matchedTerms", arrayOfString()
        )));
        schemas.put("AgentToolCall", objectSchema(Map.of(
            "name", Map.of("type", "string"),
            "status", Map.of("type", "string"),
            "output", Map.of("type", "string")
        )));
        schemas.put("AnswerEvaluation", objectSchema(Map.of(
            "citationCoverage", Map.of("type", "number"),
            "answerRelevance", Map.of("type", "number"),
            "policyAdherence", Map.of("type", "number"),
            "groundingGuard", Map.of("type", "number"),
            "decision", Map.of("type", "string"),
            "checks", arrayOfString()
        )));
        schemas.put("ModelRuntime", objectSchema(Map.of(
            "provider", Map.of("type", "string"),
            "model", Map.of("type", "string"),
            "selfHosted", Map.of("type", "boolean"),
            "fallbackUsed", Map.of("type", "boolean"),
            "latencyMs", Map.of("type", "integer"),
            "contextSources", Map.of("type", "integer"),
            "serverBinding", Map.of("type", "string")
        )));
        schemas.put("KnowledgeSpace", objectSchema(Map.of(
            "id", Map.of("type", "string"),
            "name", Map.of("type", "string"),
            "purpose", Map.of("type", "string"),
            "documentIds", arrayOfString(),
            "allowedApplications", arrayOfString(),
            "updatedAt", Map.of("type", "string", "format", "date-time")
        )));
        schemas.put("SourceDocument", objectSchema(Map.of(
            "id", Map.of("type", "string"),
            "title", Map.of("type", "string"),
            "owner", Map.of("type", "string"),
            "sensitivity", Map.of("type", "string"),
            "tags", arrayOfString(),
            "content", Map.of("type", "string"),
            "ingestedAt", Map.of("type", "string", "format", "date-time")
        )));
        schemas.put("PlatformHealth", objectSchema(Map.of(
            "status", Map.of("type", "string"),
            "spaces", Map.of("type", "integer"),
            "documents", Map.of("type", "integer"),
            "restrictedDocuments", Map.of("type", "integer"),
            "apiMode", Map.of("type", "string"),
            "generatedAt", Map.of("type", "string", "format", "date-time")
        )));
        schemas.put("ChatStreamEvent", objectSchema(Map.of(
            "type", Map.of("type", "string"),
            "tool", schemaRef("#/components/schemas/AgentToolCall"),
            "delta", Map.of("type", "string"),
            "response", schemaRef("#/components/schemas/AgentResponse"),
            "message", Map.of("type", "string")
        )));
        return schemas;
    }

    private static Map<String, Object> ok(String schemaRef) {
        return Map.of("200", Map.of("description", "OK", "content", jsonContent(schemaRef)));
    }

    private static Map<String, Object> okArray(String schemaRef) {
        return Map.of("200", Map.of("description", "OK", "content", Map.of(
            "application/json",
            Map.of("schema", Map.of("type", "array", "items", schemaRef(schemaRef)))
        )));
    }

    private static Map<String, Object> jsonBody(String schemaRef) {
        return Map.of("required", true, "content", jsonContent(schemaRef));
    }

    private static Map<String, Object> jsonContent(String schemaRef) {
        return Map.of("application/json", Map.of("schema", schemaRef(schemaRef)));
    }

    private static Map<String, Object> objectSchema(Map<String, Object> properties) {
        return Map.of("type", "object", "properties", properties);
    }

    private static Map<String, Object> arrayOf(String schemaRef) {
        return Map.of("type", "array", "items", schemaRef(schemaRef));
    }

    private static Map<String, Object> arrayOfString() {
        return Map.of("type", "array", "items", Map.of("type", "string"));
    }

    private static Map<String, Object> schemaRef(String schemaRef) {
        return Map.of("$ref", schemaRef);
    }

    private static Map<String, Object> pathParameter(String name) {
        return Map.of(
            "name", name,
            "in", "path",
            "required", true,
            "schema", Map.of("type", "string")
        );
    }
}
