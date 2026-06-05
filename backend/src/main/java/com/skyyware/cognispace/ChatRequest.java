package com.skyyware.cognispace;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record ChatRequest(
    @NotBlank String prompt,
    List<ChatMessage> history
) {
}
