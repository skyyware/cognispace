package com.skyyware.cognispace;

import java.util.List;

public record AgentResponse(
    String answer,
    List<GroundingSource> sources,
    List<String> suggestedActions,
    double confidence,
    String intent,
    List<AgentToolCall> toolTrace,
    List<String> riskFlags,
    AnswerEvaluation evaluation,
    ModelRuntime runtime,
    String apiVersion
) {
}
