package org.coderacer.backend.model;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.List;

@Converter
public class StringListConverter implements AttributeConverter<List<String>, String> {

  private static final ObjectMapper MAPPER = new ObjectMapper();

  @Override
  public String convertToDatabaseColumn(List<String> attribute) {
    try {
      return MAPPER.writeValueAsString(attribute);
    } catch (JsonProcessingException e) {
      throw new IllegalArgumentException(e);
    }
  }

  @Override
  public List<String> convertToEntityAttribute(String dbData) {
    try {
      return MAPPER.readValue(dbData, new TypeReference<>() {});
    } catch (JsonProcessingException e) {
      throw new IllegalArgumentException(e);
    }
  }
}
