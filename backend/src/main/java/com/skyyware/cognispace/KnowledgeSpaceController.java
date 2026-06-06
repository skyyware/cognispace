package com.skyyware.cognispace;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api")
public class KnowledgeSpaceController {
    private final KnowledgeSpaceStore store;

    public KnowledgeSpaceController(KnowledgeSpaceStore store) {
        this.store = store;
    }

    @GetMapping("/health")
    PlatformHealth health() {
        return store.health();
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

}
