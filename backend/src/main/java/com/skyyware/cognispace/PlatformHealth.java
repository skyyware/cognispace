package com.skyyware.cognispace;

import java.time.Instant;

public record PlatformHealth(
    String status,
    int spaces,
    int documents,
    int restrictedDocuments,
    String apiMode,
    Instant generatedAt
) {
}
