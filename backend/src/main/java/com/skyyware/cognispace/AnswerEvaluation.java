package com.skyyware.cognispace;

import java.util.List;

public record AnswerEvaluation(
    double citationCoverage,
    double answerRelevance,
    double policyAdherence,
    double groundingGuard,
    String decision,
    List<String> checks
) {
}
