package com.skyyware.cognispace;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

@Repository
public class KnowledgeSpaceStore {
    private static final Set<String> STOP_WORDS = Set.of(
        "the", "and", "for", "with", "from", "into", "how", "what", "when", "where", "which",
        "should", "would", "could", "this", "that", "about", "before", "after", "through",
        "need", "needs", "does", "will", "them", "they", "have", "has", "do",
        "are", "our", "their", "eine", "einer", "eines", "und", "oder", "wie", "was", "vor",
        "nach", "mit", "aus", "fuer", "für", "der", "die", "das"
    );

    private static final Map<String, List<String>> QUERY_EXPANSIONS = Map.of(
        "agent", List.of("assistant", "applications", "api"),
        "agents", List.of("assistant", "applications", "api"),
        "ai", List.of("assistant", "generated", "knowledge"),
        "rest", List.of("endpoint", "api", "response"),
        "api", List.of("endpoint", "integration", "applications"),
        "risk", List.of("supplier-risk", "quality", "review"),
        "supplier", List.of("procurement", "quality", "review"),
        "figma", List.of("react", "mockups", "frontend"),
        "frontend", List.of("react", "figma", "mockups")
    );

    private final Map<String, SourceDocument> documents = new ConcurrentHashMap<>();
    private final Map<String, KnowledgeSpace> spaces = new ConcurrentHashMap<>();
    private final LocalLlmClient localLlmClient;

    @Autowired
    public KnowledgeSpaceStore(LocalLlmClient localLlmClient) {
        this.localLlmClient = localLlmClient;
        SourceDocument supplierRisk = addDocument(new CreateDocumentRequest(
            "Supplier risk intake policy",
            "Procurement Excellence",
            "restricted",
            List.of("supplier-risk", "procurement", "owner"),
            "Supplier data can be connected to an AI assistant only when business owner, data sensitivity, supplier segment and allowed consuming applications are declared. High-risk suppliers require quality review before answers are exposed externally."
        ));
        SourceDocument dataPolicy = addDocument(new CreateDocumentRequest(
            "Enterprise data handling guardrails",
            "AI Governance",
            "confidential",
            List.of("governance", "privacy", "allowlist"),
            "Enterprise knowledge spaces must never leak source content outside the selected scope. Confidential sources require explicit application allowlists, audit-friendly citations and confidence indicators in every generated response."
        ));
        SourceDocument qualityRunbook = addDocument(new CreateDocumentRequest(
            "Quality escalation runbook",
            "Quality Management",
            "internal",
            List.of("quality", "escalation", "supplier-risk"),
            "When supplier risk, quality incidents or delivery constraints appear in a generated answer, the system should suggest a human review action and include the cited source snippets used for the decision."
        ));
        SourceDocument apiDesign = addDocument(new CreateDocumentRequest(
            "Agent API integration contract",
            "Platform Engineering",
            "internal",
            List.of("api", "spring-boot", "integration"),
            "Applications call the knowledge-space REST endpoint with prompt and optional history. The response contains answer, sources, suggested actions and confidence so downstream tools can render grounded agent output safely."
        ));
        SourceDocument deliveryOps = addDocument(new CreateDocumentRequest(
            "Fullstack delivery operating model",
            "Digital Product Team",
            "internal",
            List.of("react", "figma", "delivery", "testing"),
            "Functional React mockups are connected to backend systems via REST APIs. Java Spring Boot services ship with automated tests, code review, CI/CD readiness and Docker/Kubernetes deployment artifacts."
        ));

        createSpace(new CreateSpaceRequest(
            "Delivery Architecture Brain",
            "Support product teams with implementation, API and deployment decisions.",
            List.of(apiDesign.id(), deliveryOps.id(), dataPolicy.id()),
            List.of("engineering-chat", "figma-handoff", "platform-api")
        ));
        createSpace(new CreateSpaceRequest(
            "Supplier Risk Brain",
            "Answer supplier-risk questions with governed procurement, quality and API context.",
            List.of(supplierRisk.id(), dataPolicy.id(), qualityRunbook.id(), apiDesign.id()),
            List.of("procurement-assistant", "risk-dashboard", "supplier-portal", "contract-insights", "compliance-monitor", "integration-gateway")
        ));
    }

    KnowledgeSpaceStore() {
        this(LocalLlmClient.disabled());
    }

    public List<SourceDocument> documents() {
        return documents.values().stream()
            .sorted(Comparator.comparing(SourceDocument::ingestedAt).reversed())
            .toList();
    }

    public SourceDocument addDocument(CreateDocumentRequest request) {
        SourceDocument document = new SourceDocument(
            UUID.randomUUID().toString(),
            request.title(),
            request.owner(),
            request.sensitivity(),
            List.copyOf(request.tags()),
            request.content(),
            Instant.now()
        );
        documents.put(document.id(), document);
        return document;
    }

    public List<KnowledgeSpace> spaces() {
        return spaces.values().stream()
            .sorted(Comparator.comparing(KnowledgeSpace::updatedAt).reversed())
            .toList();
    }

    public Optional<KnowledgeSpace> findSpace(String id) {
        return Optional.ofNullable(spaces.get(id));
    }

    public KnowledgeSpace createSpace(CreateSpaceRequest request) {
        List<String> knownDocumentIds = safeList(request.documentIds()).stream()
            .filter(documents::containsKey)
            .toList();
        KnowledgeSpace space = new KnowledgeSpace(
            UUID.randomUUID().toString(),
            request.name(),
            request.purpose(),
            knownDocumentIds,
            request.allowedApplications() == null ? List.of() : List.copyOf(request.allowedApplications()),
            Instant.now()
        );
        spaces.put(space.id(), space);
        return space;
    }

    public SourceDocument addDocumentToSpace(String spaceId, CreateDocumentRequest request) {
        KnowledgeSpace current = findSpace(spaceId).orElseThrow(() -> new KnowledgeSpaceNotFoundException(spaceId));
        SourceDocument document = addDocument(request);
        List<String> documentIds = new ArrayList<>(current.documentIds());
        documentIds.add(document.id());
        spaces.put(spaceId, new KnowledgeSpace(
            current.id(),
            current.name(),
            current.purpose(),
            List.copyOf(documentIds),
            current.allowedApplications(),
            Instant.now()
        ));
        return document;
    }

    public PlatformHealth health() {
        int restricted = (int) documents.values().stream()
            .filter(document -> Set.of("restricted", "confidential").contains(document.sensitivity()))
            .count();
        return new PlatformHealth("ready", spaces.size(), documents.size(), restricted, localLlmClient.runtimeMode(), Instant.now());
    }

    public AgentResponse answer(String spaceId, ChatRequest request) {
        KnowledgeSpace space = findSpace(spaceId).orElseThrow(() -> new KnowledgeSpaceNotFoundException(spaceId));
        String prompt = request.prompt();
        String intent = detectIntent(prompt);
        List<String> queryTerms = expandTerms(normalize(prompt));
        List<GroundingSource> sources = space.documentIds().stream()
            .map(documents::get)
            .filter(document -> document != null)
            .map(document -> score(document, queryTerms))
            .filter(source -> source.score() > 0)
            .sorted(Comparator.comparing(GroundingSource::score).reversed())
            .limit(3)
            .toList();

        if (sources.isEmpty()) {
            return new AgentResponse(
                "I could not ground this question in the selected knowledge space. Add a matching source, narrow the scope or rephrase the prompt before exposing an answer to another application.",
                List.of(),
                List.of("Add a source document", "Review knowledge-space scope", "Keep the response out of external applications until evidence is available"),
                0.22,
                intent,
                List.of(
                    new AgentToolCall("retrieve_sources", "completed", "No scoped source matched the prompt terms."),
                    new AgentToolCall("check_governance", "completed", "Answer blocked because no grounded evidence was available.")
                ),
                List.of("No grounded source found")
            );
        }

        double confidence = Math.min(0.94, 0.5 + sources.stream().mapToDouble(GroundingSource::score).sum() / 24.0);
        confidence = Math.round(confidence * 100.0) / 100.0;
        List<String> riskFlags = riskFlags(prompt, space, sources, confidence);
        List<String> suggestedActions = suggestedActions(intent, riskFlags);
        String deterministicAnswer = composeAnswer(prompt, intent, space, sources, riskFlags);
        Optional<LocalLlmResult> localLlmResult = localLlmClient.generate(
            prompt,
            intent,
            space,
            sources,
            riskFlags,
            suggestedActions
        );
        String answer = localLlmResult.map(LocalLlmResult::answer).orElse(deterministicAnswer);
        return new AgentResponse(
            answer,
            sources,
            suggestedActions,
            confidence,
            intent,
            toolTrace(intent, space, sources, confidence, riskFlags, localLlmResult),
            riskFlags
        );
    }

    private GroundingSource score(SourceDocument document, List<String> queryTerms) {
        String title = document.title().toLowerCase(Locale.ROOT);
        String tags = String.join(" ", document.tags()).toLowerCase(Locale.ROOT);
        String content = document.content().toLowerCase(Locale.ROOT);
        double score = 0;
        for (String term : queryTerms) {
            if (title.contains(term)) {
                score += 4;
            }
            if (tags.contains(term)) {
                score += 3;
            }
            if (content.contains(term)) {
                score += 1 + occurrences(content, term) * 0.45;
            }
        }
        List<String> excerpts = excerpts(document.content(), queryTerms);
        return new GroundingSource(document.id(), document.title(), score, excerpts);
    }

    private int occurrences(String value, String term) {
        int count = 0;
        int index = value.indexOf(term);
        while (index >= 0) {
            count++;
            index = value.indexOf(term, index + term.length());
        }
        return count;
    }

    private List<String> excerpts(String content, List<String> queryTerms) {
        String[] sentences = content.split("(?<=[.!?])\\s+");
        List<String> matches = new ArrayList<>();
        for (String sentence : sentences) {
            String lower = sentence.toLowerCase(Locale.ROOT);
            if (queryTerms.stream().anyMatch(lower::contains)) {
                matches.add(sentence);
            }
        }
        return matches.isEmpty() ? List.of(sentences[0]) : matches.stream().limit(2).toList();
    }

    private List<String> normalize(String value) {
        return List.of(value.toLowerCase(Locale.ROOT).split("[^\\p{L}\\p{N}-]+")).stream()
            .filter(term -> term.length() > 2)
            .filter(term -> !STOP_WORDS.contains(term))
            .distinct()
            .toList();
    }

    private List<String> expandTerms(List<String> terms) {
        LinkedHashSet<String> expanded = new LinkedHashSet<>(terms);
        for (String term : terms) {
            expanded.addAll(QUERY_EXPANSIONS.getOrDefault(term, List.of()));
        }
        return List.copyOf(expanded);
    }

    private String detectIntent(String prompt) {
        String normalized = prompt.toLowerCase(Locale.ROOT);
        if (containsAny(normalized, "rest", "api", "endpoint", "connect", "integration", "external applications")) {
            return "agent-api-integration";
        }
        if (containsAny(normalized, "supplier", "risk", "quality", "review", "procurement")) {
            return "supplier-risk-review";
        }
        if (containsAny(normalized, "figma", "frontend", "react", "mockup")) {
            return "frontend-delivery";
        }
        return "knowledge-answer";
    }

    private boolean containsAny(String value, String... needles) {
        for (String needle : needles) {
            if (value.contains(needle)) {
                return true;
            }
        }
        return false;
    }

    private List<String> riskFlags(String prompt, KnowledgeSpace space, List<GroundingSource> sources, double confidence) {
        List<String> flags = new ArrayList<>();
        boolean restrictedSource = sources.stream()
            .map(source -> documents.get(source.documentId()))
            .filter(document -> document != null)
            .anyMatch(document -> Set.of("restricted", "confidential").contains(document.sensitivity()));
        String normalized = prompt.toLowerCase(Locale.ROOT);

        if (restrictedSource) {
            flags.add("Restricted or confidential source in scope: enforce the application allowlist.");
        }
        if (containsAny(normalized, "external", "portal", "customer", "publish", "public")) {
            flags.add("External exposure requested: keep citations and confidence visible in the consuming application.");
        }
        if (containsAny(normalized, "supplier", "risk", "quality", "critical")) {
            flags.add("Supplier-critical context: route high-risk findings to human review.");
        }
        if (space.allowedApplications().isEmpty()) {
            flags.add("No consuming application allowlist configured.");
        }
        if (confidence < 0.65) {
            flags.add("Low evidence density: add or attach a more specific source.");
        }
        return flags;
    }

    private String composeAnswer(String prompt, String intent, KnowledgeSpace space, List<GroundingSource> sources, List<String> riskFlags) {
        String sourceTitles = sources.stream().map(GroundingSource::title).collect(Collectors.joining(", "));
        String allowedApps = space.allowedApplications().isEmpty()
            ? "no configured consuming applications"
            : String.join(", ", space.allowedApplications());

        if ("agent-api-integration".equals(intent)) {
            return "Use \"" + space.name() + "\" as a bounded agent context. Call POST /api/spaces/" + space.id()
                + "/chat with the prompt and conversation history, then render the answer together with sources, confidence and suggested actions. The strongest evidence is "
                + sourceTitles + ". Before connecting an external app, keep the allowlist explicit (" + allowedApps
                + "), preserve citations in the UI and block automation whenever risk flags are present.";
        }
        if ("supplier-risk-review".equals(intent)) {
            return "Before publishing a supplier-risk answer, verify owner, sensitivity, supplier segment and allowed consuming application. The selected space grounds that decision in "
                + sourceTitles + ". High-risk supplier or quality findings should remain a decision-support signal, not an autonomous action: show the cited snippets, confidence and manual-review action together.";
        }
        if ("frontend-delivery".equals(intent)) {
            return "Treat the Figma or product mockup as the interaction contract: build the React surface, wire it to the REST response shape and keep answer, sources, confidence and actions visible as first-class UI state. The selected evidence points to "
                + sourceTitles + ", so the implementation should include tests around API shape, grounding visibility and deployment readiness.";
        }
        return "For \"" + prompt + "\", the selected space grounds the answer in " + sourceTitles
            + ". Use the space as bounded context, keep citations attached, show confidence and route sensitive findings through the configured governance path.";
    }

    private List<String> suggestedActions(String intent, List<String> riskFlags) {
        List<String> actions = new ArrayList<>();
        actions.add("Review cited snippets");
        if ("agent-api-integration".equals(intent)) {
            actions.add("Expose answer, sources, actions and confidence in one API response");
            actions.add("Validate the consuming application against the allowlist");
        } else if ("supplier-risk-review".equals(intent)) {
            actions.add("Confirm supplier owner and sensitivity before external exposure");
            actions.add("Route high-risk findings to Procurement or Quality review");
        } else {
            actions.add("Confirm knowledge-space scope");
            actions.add("Keep citations visible in the consuming workflow");
        }
        if (!riskFlags.isEmpty()) {
            actions.add("Resolve risk flags before automation");
        }
        return actions.stream().distinct().toList();
    }

    private List<AgentToolCall> toolTrace(
        String intent,
        KnowledgeSpace space,
        List<GroundingSource> sources,
        double confidence,
        List<String> riskFlags,
        Optional<LocalLlmResult> localLlmResult
    ) {
        List<AgentToolCall> trace = new ArrayList<>();
        trace.add(new AgentToolCall("classify_intent", "completed", "Detected " + intent + "."));
        trace.add(new AgentToolCall("retrieve_sources", "completed", "Searched " + space.documentIds().size() + " scoped sources and selected " + sources.size() + "."));
        trace.add(new AgentToolCall("rank_evidence", "completed", "Top source: " + sources.get(0).title() + " with confidence " + Math.round(confidence * 100) + "%."));
        trace.add(new AgentToolCall("check_governance", "completed", riskFlags.isEmpty() ? "No blocking risk flags." : riskFlags.size() + " risk flag(s) require review."));
        localLlmResult.ifPresentOrElse(
            result -> trace.add(new AgentToolCall(
                "compose_local_llm_answer",
                "completed",
                "Answer composed by self-hosted open-source model " + result.model() + " in " + result.durationMs() + " ms."
            )),
            () -> trace.add(new AgentToolCall(
                "compose_grounded_answer",
                "completed",
                localLlmClient.isOllamaEnabled()
                    ? "Local LLM unavailable or timed out; deterministic grounded composer used."
                    : "Deterministic grounded composer used."
            ))
        );
        trace.add(new AgentToolCall(
            "evaluate_answer_quality",
            "completed",
            "Checked citation coverage, confidence " + Math.round(confidence * 100) + "% and " + riskFlags.size() + " visible risk flag(s)."
        ));
        return List.copyOf(trace);
    }

    private List<String> safeList(List<String> values) {
        return values == null ? List.of() : List.copyOf(new LinkedHashSet<>(values));
    }
}
