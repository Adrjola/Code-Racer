package org.coderacer.backend.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.List;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

@Converter
public class StringListConverter implements AttributeConverter<List<String>, String> {

  private static final ObjectMapper MAPPER = new ObjectMapper();

  @Override
  public String convertToDatabaseColumn(List<String> attribute) {
    return MAPPER.writeValueAsString(attribute);
  }

  @Override
  public List<String> convertToEntityAttribute(String dbData) {
    return MAPPER.readValue(dbData, new TypeReference<>() {});
  }
}
