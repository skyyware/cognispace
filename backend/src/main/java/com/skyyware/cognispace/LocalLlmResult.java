package com.skyyware.cognispace;

public record LocalLlmResult(
    String answer,
    String model,
    long durationMs
) {
}
