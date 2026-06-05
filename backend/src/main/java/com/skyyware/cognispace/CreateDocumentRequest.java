package com.skyyware.cognispace;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record CreateDocumentRequest(
    @NotBlank String title,
    @NotBlank String owner,
    @NotBlank String sensitivity,
    @NotEmpty List<String> tags,
    @NotBlank String content
) {
}
