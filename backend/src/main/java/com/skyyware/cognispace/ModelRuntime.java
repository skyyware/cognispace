package com.skyyware.cognispace;

public record ModelRuntime(
    String provider,
    String model,
    boolean selfHosted,
    boolean fallbackUsed,
    long latencyMs,
    int contextSources,
    String serverBinding
) {
}
