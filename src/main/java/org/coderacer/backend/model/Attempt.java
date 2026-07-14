package org.coderacer.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Entity
@Table(name = "attempts")
@Data
public class Attempt {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private UUID id;
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    User user;

}
