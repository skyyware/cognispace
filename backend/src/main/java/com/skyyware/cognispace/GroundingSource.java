package com.skyyware.cognispace;

import java.util.List;

public record GroundingSource(
    String documentId,
    String title,
    double score,
    List<String> excerpts
) {
}
