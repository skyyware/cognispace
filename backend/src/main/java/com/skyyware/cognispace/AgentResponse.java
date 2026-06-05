package com.skyyware.cognispace;

import java.util.List;

public record AgentResponse(
    String answer,
    List<GroundingSource> sources,
    List<String> suggestedActions,
    double confidence
) {
}
