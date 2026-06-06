package com.skyyware.cognispace;

public record ChatStreamEvent(
    String type,
    AgentToolCall tool,
    String delta,
    AgentResponse response,
    String message
) {
}
