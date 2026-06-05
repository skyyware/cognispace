package com.skyyware.cognispace;

import java.util.Map;
import org.springframework.validation.FieldError;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(KnowledgeSpaceNotFoundException.class)
    ResponseEntity<Map<String, String>> missingSpace(KnowledgeSpaceNotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", exception.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String, String>> validation(MethodArgumentNotValidException exception) {
        FieldError fieldError = exception.getFieldError();
        String field = fieldError == null ? "request" : fieldError.getField();
        return ResponseEntity.badRequest().body(Map.of("error", "Invalid request", "field", field));
    }
}
