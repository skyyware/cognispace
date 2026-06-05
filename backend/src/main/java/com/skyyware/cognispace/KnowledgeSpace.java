package com.skyyware.cognispace;

import java.time.Instant;
import java.util.List;

public record KnowledgeSpace(
    String id,
    String name,
    String purpose,
    List<String> documentIds,
    List<String> allowedApplications,
    Instant updatedAt
) {
}
