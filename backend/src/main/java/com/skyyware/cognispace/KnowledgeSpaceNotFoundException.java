package com.skyyware.cognispace;

public class KnowledgeSpaceNotFoundException extends RuntimeException {
    public KnowledgeSpaceNotFoundException(String id) {
        super("Knowledge space not found: " + id);
    }
}
