package com.skyyware.cognispace;

import java.time.Instant;

public record RegistrationResponse(String status, boolean emailSent, Instant receivedAt) {
}
