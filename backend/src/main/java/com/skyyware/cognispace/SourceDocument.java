package com.skyyware.cognispace;

import java.time.Instant;
import java.util.List;

public record SourceDocument(
    String id,
    String title,
    String owner,
    String sensitivity,
    List<String> tags,
    String content,
    Instant ingestedAt
) {
}
