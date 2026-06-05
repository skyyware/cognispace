package com.skyyware.cognispace;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record CreateSpaceRequest(
    @NotBlank String name,
    @NotBlank String purpose,
    @NotEmpty List<String> documentIds,
    List<String> allowedApplications
) {
}
