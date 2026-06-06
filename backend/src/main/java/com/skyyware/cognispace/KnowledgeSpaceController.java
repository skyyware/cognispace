package com.skyyware.cognispace;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import java.io.IOException;
import java.io.OutputStream;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.MediaType;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api")
public class KnowledgeSpaceController {
    private final KnowledgeSpaceStore store;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public KnowledgeSpaceController(KnowledgeSpaceStore store) {
        this.store = store;
    }

    @GetMapping("/health")
    PlatformHealth health() {
        return store.health();
    }

    @GetMapping(value = "/openapi", produces = MediaType.APPLICATION_JSON_VALUE)
    Map<String, Object> openApi() {
        return OpenApiCatalog.document();
    }

    @GetMapping("/documents")
    List<SourceDocument> documents() {
        return store.documents();
    }

    @PostMapping("/documents")
    SourceDocument addDocument(@Valid @RequestBody CreateDocumentRequest request) {
        return store.addDocument(request);
    }

    @GetMapping("/spaces")
    List<KnowledgeSpace> spaces() {
        return store.spaces();
    }

    @GetMapping("/spaces/{spaceId}")
    KnowledgeSpace space(@PathVariable String spaceId) {
        return store.findSpace(spaceId).orElseThrow(() -> new KnowledgeSpaceNotFoundException(spaceId));
    }

    @PostMapping("/spaces")
    KnowledgeSpace createSpace(@Valid @RequestBody CreateSpaceRequest request) {
        return store.createSpace(request);
    }

    @PostMapping("/spaces/{spaceId}/documents")
    SourceDocument addDocumentToSpace(@PathVariable String spaceId, @Valid @RequestBody CreateDocumentRequest request) {
        return store.addDocumentToSpace(spaceId, request);
    }

    @PostMapping("/spaces/{spaceId}/chat")
    AgentResponse chat(@PathVariable String spaceId, @Valid @RequestBody ChatRequest request) {
        return store.answer(spaceId, request);
    }

    @PostMapping(value = "/spaces/{spaceId}/chat/stream", produces = "application/x-ndjson")
    StreamingResponseBody chatStream(@PathVariable String spaceId, @Valid @RequestBody ChatRequest request) {
        return outputStream -> {
            writeEvent(outputStream, new ChatStreamEvent(
                "run_started",
                null,
                null,
                null,
                "Live run started. Pipeline events and answer chunks are streamed from the API."
            ));
            emitRunningStep(outputStream, "classify_intent", "Classifying intent and constraints.");
            emitRunningStep(outputStream, "retrieve_sources", "Preparing scoped hybrid retrieval.");
            emitRunningStep(outputStream, "check_governance", "Preparing allowlist and sensitivity checks.");
            emitRunningStep(outputStream, "compose_local_llm_answer", "Engaging bounded local model context.");

            AgentResponse response = store.answer(spaceId, request);
            for (AgentToolCall tool : response.toolTrace()) {
                writeEvent(outputStream, new ChatStreamEvent("step", tool, null, null, null));
            }

            for (String chunk : chunks(response.answer())) {
                writeEvent(outputStream, new ChatStreamEvent("answer_delta", null, chunk, null, null));
                sleep(28);
            }

            writeEvent(outputStream, new ChatStreamEvent("final", null, null, response, "Run completed."));
        };
    }

    private void emitRunningStep(OutputStream outputStream, String name, String output) throws IOException {
        writeEvent(outputStream, new ChatStreamEvent(
            "step",
            new AgentToolCall(name, "running", output),
            null,
            null,
            null
        ));
        sleep(140);
    }

    private void writeEvent(OutputStream outputStream, ChatStreamEvent event) throws IOException {
        outputStream.write(objectMapper.writeValueAsBytes(event));
        outputStream.write('\n');
        outputStream.flush();
    }

    private List<String> chunks(String answer) {
        List<String> chunks = new java.util.ArrayList<>();
        int cursor = 0;
        int chunkSize = 18;
        while (cursor < answer.length()) {
            int next = Math.min(answer.length(), cursor + chunkSize);
            if (next < answer.length()) {
                int wordBoundary = answer.lastIndexOf(' ', next);
                if (wordBoundary > cursor + 6) {
                    next = wordBoundary + 1;
                }
            }
            chunks.add(answer.substring(cursor, next));
            cursor = next;
        }
        return chunks;
    }

    private void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
        }
    }
}
