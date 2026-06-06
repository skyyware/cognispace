package com.skyyware.cognispace;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
public class LocalLlmClient {
    private static final String DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
    private static final String DEFAULT_MODEL = "qwen2.5:3b";

    private final String provider;
    private final String ollamaUrl;
    private final String model;
    private final Duration timeout;
    private final int maxOutputTokens;
    private final double temperature;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Autowired
    public LocalLlmClient(Environment environment) {
        this(
            environment.getProperty("cognispace.llm.provider", "deterministic"),
            environment.getProperty("cognispace.llm.ollama-url", DEFAULT_OLLAMA_URL),
            environment.getProperty("cognispace.llm.model", DEFAULT_MODEL),
            Duration.ofMillis(environment.getProperty("cognispace.llm.timeout-ms", Long.class, 45000L)),
            environment.getProperty("cognispace.llm.max-output-tokens", Integer.class, 240),
            environment.getProperty("cognispace.llm.temperature", Double.class, 0.18),
            new ObjectMapper()
        );
    }

    private LocalLlmClient(
        String provider,
        String ollamaUrl,
        String model,
        Duration timeout,
        int maxOutputTokens,
        double temperature,
        ObjectMapper objectMapper
    ) {
        this.provider = provider == null ? "deterministic" : provider.toLowerCase(Locale.ROOT);
        this.ollamaUrl = trimTrailingSlash(ollamaUrl == null ? DEFAULT_OLLAMA_URL : ollamaUrl);
        this.model = model == null || model.isBlank() ? DEFAULT_MODEL : model;
        this.timeout = timeout;
        this.maxOutputTokens = maxOutputTokens;
        this.temperature = temperature;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(4))
            .build();
    }

    static LocalLlmClient disabled() {
        return new LocalLlmClient(
            "deterministic",
            DEFAULT_OLLAMA_URL,
            DEFAULT_MODEL,
            Duration.ofMillis(1),
            1,
            0,
            new ObjectMapper()
        );
    }

    public String runtimeMode() {
        if (isOllamaEnabled()) {
            return "tool-augmented-rag + local-open-source-llm (" + model + ")";
        }
        return "tool-augmented-rag";
    }

    public String model() {
        return model;
    }

    public boolean isOllamaEnabled() {
        return "ollama".equals(provider);
    }

    public Optional<LocalLlmResult> generate(
        String prompt,
        String intent,
        KnowledgeSpace space,
        List<GroundingSource> sources,
        List<String> riskFlags,
        List<String> suggestedActions
    ) {
        if (!isOllamaEnabled()) {
            return Optional.empty();
        }

        try {
            Instant startedAt = Instant.now();
            String body = objectMapper.writeValueAsString(Map.of(
                "model", model,
                "stream", false,
                "messages", List.of(
                    Map.of("role", "system", "content", systemPrompt()),
                    Map.of("role", "user", "content", userPrompt(prompt, intent, space, sources, riskFlags, suggestedActions))
                ),
                "options", Map.of(
                    "temperature", temperature,
                    "num_predict", maxOutputTokens
                )
            ));

            HttpRequest request = HttpRequest.newBuilder(URI.create(ollamaUrl + "/api/chat"))
                .timeout(timeout)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return Optional.empty();
            }

            JsonNode root = objectMapper.readTree(response.body());
            String answer = root.path("message").path("content").asText("").trim();
            if (answer.isBlank()) {
                return Optional.empty();
            }

            long durationMs = Duration.between(startedAt, Instant.now()).toMillis();
            return Optional.of(new LocalLlmResult(answer, model, durationMs));
        } catch (IOException exception) {
            return Optional.empty();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        } catch (IllegalArgumentException exception) {
            return Optional.empty();
        }
    }

    private String systemPrompt() {
        return """
            You are CogniSpace, a source-grounded enterprise knowledge assistant.
            Answer only from the supplied knowledge-space evidence.
            Keep the response concise, operational and suitable for a technical product team.
            Preserve governance: mention manual review when risk flags are present.
            Do not invent missing facts, systems, policies or source content.
            Answer in the same language as the user question.
            """;
    }

    private String userPrompt(
        String prompt,
        String intent,
        KnowledgeSpace space,
        List<GroundingSource> sources,
        List<String> riskFlags,
        List<String> suggestedActions
    ) {
        String evidence = sources.stream()
            .map(source -> "- " + source.title() + ": " + String.join(" ", source.excerpts()))
            .collect(Collectors.joining("\n"));
        String risks = riskFlags.isEmpty() ? "None" : String.join("; ", riskFlags);
        String actions = suggestedActions.isEmpty() ? "None" : String.join("; ", suggestedActions);
        String allowedApps = space.allowedApplications().isEmpty()
            ? "None configured"
            : String.join(", ", space.allowedApplications());

        return """
            Question:
            %s

            Knowledge space:
            %s

            Purpose:
            %s

            Detected intent:
            %s

            Allowed consuming applications:
            %s

            Evidence:
            %s

            Risk flags:
            %s

            Suggested actions:
            %s

            Compose the final answer. Keep it under 140 words.
            """.formatted(prompt, space.name(), space.purpose(), intent, allowedApps, evidence, risks, actions);
    }

    private static String trimTrailingSlash(String value) {
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
