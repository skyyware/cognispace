package com.skyyware.cognispace;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class KnowledgeSpaceControllerTest {
    @Autowired
    private MockMvc mvc;

    @Test
    void exposesSeedKnowledgeSpaces() throws Exception {
        mvc.perform(get("/api/spaces"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].name").value("Supplier Risk Brain"));
    }

    @Test
    void answersPromptsWithGroundingSources() throws Exception {
        String spaceId = mvc.perform(get("/api/spaces"))
            .andReturn()
            .getResponse()
            .getContentAsString()
            .split("\"id\":\"")[1]
            .split("\"")[0];

        mvc.perform(post("/api/spaces/" + spaceId + "/chat")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"prompt\":\"How do we expose REST APIs for agent applications?\",\"history\":[]}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.sources[0].title").exists())
            .andExpect(jsonPath("$.confidence").exists());
    }

    @Test
    void canAttachNewDocumentsToSelectedSpace() throws Exception {
        String spaceId = mvc.perform(get("/api/spaces"))
            .andReturn()
            .getResponse()
            .getContentAsString()
            .split("\"id\":\"")[1]
            .split("\"")[0];

        mvc.perform(post("/api/spaces/" + spaceId + "/documents")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "title": "Service manual delta",
                      "owner": "Service Engineering",
                      "sensitivity": "internal",
                      "tags": ["service", "manual"],
                      "content": "The service assistant should cite manual deltas before exposing generated troubleshooting guidance."
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.title").value("Service manual delta"));

        mvc.perform(get("/api/spaces/" + spaceId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.documentIds.length()").value(5));
    }

    @Test
    void validatesDocumentCreation() throws Exception {
        mvc.perform(post("/api/documents")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"\",\"owner\":\"AI\",\"sensitivity\":\"internal\",\"tags\":[],\"content\":\"\"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void acceptsWorkspaceAccessRequests() throws Exception {
        mvc.perform(post("/api/registrations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "name": "Sascha Dobrochynskyy",
                      "email": "sascha@skyyware.com",
                      "company": "Skyyware",
                      "useCase": "Review CogniSpace for a source-grounded enterprise knowledge workspace."
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("received"))
            .andExpect(jsonPath("$.receivedAt").exists());
    }

    @Test
    void storeCanCreateDocumentsAndSpaces() {
        KnowledgeSpaceStore store = new KnowledgeSpaceStore();
        SourceDocument document = store.addDocument(new CreateDocumentRequest(
            "Figma handoff",
            "Design",
            "internal",
            java.util.List.of("figma", "frontend"),
            "Figma mockups need to become functional React applications connected to REST APIs."
        ));
        KnowledgeSpace space = store.createSpace(new CreateSpaceRequest(
            "Frontend Brain",
            "Answer Figma implementation questions",
            java.util.List.of(document.id()),
            java.util.List.of("frontend")
        ));

        assertThat(space.documentIds()).containsExactly(document.id());
    }
}
