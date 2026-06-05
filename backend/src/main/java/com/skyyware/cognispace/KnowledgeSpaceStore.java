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
import org.springframework.stereotype.Repository;

@Repository
public class KnowledgeSpaceStore {
    private static final Set<String> STOP_WORDS = Set.of(
        "the", "and", "for", "with", "from", "into", "how", "what", "when", "where", "which",
        "should", "would", "could", "this", "that", "about", "before", "after", "through",
        "are", "our", "their", "eine", "einer", "eines", "und", "oder", "wie", "was", "vor",
        "nach", "mit", "aus", "fuer", "für", "der", "die", "das"
    );

    private final Map<String, SourceDocument> documents = new ConcurrentHashMap<>();
    private final Map<String, KnowledgeSpace> spaces = new ConcurrentHashMap<>();

    public KnowledgeSpaceStore() {
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
            List.of("procurement-assistant", "risk-dashboard", "supplier-portal")
        ));
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
        return new PlatformHealth("ready", spaces.size(), documents.size(), restricted, "source-grounded-rest", Instant.now());
    }

    public AgentResponse answer(String spaceId, ChatRequest request) {
        KnowledgeSpace space = findSpace(spaceId).orElseThrow(() -> new KnowledgeSpaceNotFoundException(spaceId));
        List<String> queryTerms = normalize(request.prompt());
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
                "I could not ground this question in the selected knowledge space. Add a matching source or rephrase the prompt.",
                List.of(),
                List.of("Add a source document", "Review knowledge-space scope"),
                0.22
            );
        }

        String sourceTitles = sources.stream().map(GroundingSource::title).collect(Collectors.joining(", "));
        String answer = "For \"" + request.prompt() + "\", the selected space points to " + sourceTitles
            + ". Use the space as a bounded context, keep source citations attached to the answer, confirm sensitivity and allowed applications, and route supplier-critical findings to human review before publishing them through the REST endpoint.";

        double confidence = Math.min(0.94, 0.5 + sources.stream().mapToDouble(GroundingSource::score).sum() / 24.0);
        return new AgentResponse(
            answer,
            sources,
            List.of("Review cited snippets", "Confirm application allowlist", "Route high-risk findings to human review", "Expose answer and citations together via REST"),
            Math.round(confidence * 100.0) / 100.0
        );
    }

    private GroundingSource score(SourceDocument document, List<String> queryTerms) {
        String title = document.title().toLowerCase(Locale.ROOT);
        String tags = String.join(" ", document.tags()).toLowerCase(Locale.ROOT);
        String content = document.content().toLowerCase(Locale.ROOT);
        double score = 0;
        for (String term : queryTerms) {
            if (title.contains(term)) {
                score += 3;
            }
            if (tags.contains(term)) {
                score += 2;
            }
            if (content.contains(term)) {
                score += 1;
            }
        }
        List<String> excerpts = excerpts(document.content(), queryTerms);
        return new GroundingSource(document.id(), document.title(), score, excerpts);
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
        return List.of(value.toLowerCase(Locale.ROOT).split("[^\\p{L}\\p{N}]+")).stream()
            .filter(term -> term.length() > 2)
            .filter(term -> !STOP_WORDS.contains(term))
            .distinct()
            .toList();
    }

    private List<String> safeList(List<String> values) {
        return values == null ? List.of() : List.copyOf(new LinkedHashSet<>(values));
    }
}
