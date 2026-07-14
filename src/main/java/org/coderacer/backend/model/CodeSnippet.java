package org.coderacer.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.UUID;

@Entity
@Table(name = "code_snippets")
@Data
public class CodeSnippet {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private UUID id;
    @NotBlank
    private String code;
    @NotBlank
    private String totalCharacters;
}
