package org.coderacer.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import org.coderacer.backend.config.properties.AiProviderProperties;
import org.coderacer.backend.dto.ExplanationResponse;
import org.coderacer.backend.exception.AiProviderException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.ObjectMapper;

class GroqAiAdapterTest {

  private MockWebServer server;
  private GroqAiAdapter adapter;
  private AiProviderProperties enabledProperties;

  private static final String VALID_AI_RESPONSE =
      """
      {
        "choices": [{
          "message": {
            "content": "{\\"summary\\":\\"Prints hello\\",\\"stepByStep\\":[\\"Calls println\\"],\\"concepts\\":[\\"System.out\\"],\\"bestPractices\\":[\\"Use logging\\"]}"
          }
        }]
      }
      """;

  @BeforeEach
  void setUp() throws Exception {
    server = new MockWebServer();
    server.start();

    String baseUrl = server.url("/").toString();
    enabledProperties = new AiProviderProperties(true, "test-key", baseUrl, "test-model");

    ObjectMapper objectMapper = new ObjectMapper();
    RestClient restClient =
        RestClient.builder()
            .baseUrl(baseUrl)
            .defaultHeader("Authorization", "Bearer test-key")
            .build();

    adapter = new GroqAiAdapter(enabledProperties, objectMapper, restClient);
  }

  @AfterEach
  void tearDown() throws Exception {
    server.shutdown();
  }

  @Test
  void explain_successfulResponse_returnsExplanation() throws Exception {
    server.enqueue(
        new MockResponse()
            .addHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .setBody(VALID_AI_RESPONSE));

    ExplanationResponse response = adapter.explain("System.out.println(\"Hello\");");

    assertThat(response.summary()).isEqualTo("Prints hello");
    assertThat(response.stepByStep()).containsExactly("Calls println");
    assertThat(response.concepts()).containsExactly("System.out");
    assertThat(response.bestPractices()).containsExactly("Use logging");
  }

  @Test
  void explain_nullSnippet_throwsInvalidResponse() {
    assertThatThrownBy(() -> adapter.explain(null))
        .isInstanceOf(AiProviderException.class)
        .hasMessageContaining("size limit");
  }

  @Test
  void explain_oversizedSnippet_throwsInvalidResponse() {
    String oversized = "x".repeat(10_001);
    assertThatThrownBy(() -> adapter.explain(oversized))
        .isInstanceOf(AiProviderException.class)
        .hasMessageContaining("size limit");
  }

  @Test
  void explain_emptyStringSnippet_throwsInvalidResponse() {
    assertThatThrownBy(() -> adapter.explain("   "))
        .isInstanceOf(AiProviderException.class)
        .hasMessageContaining("size limit");
  }

  @Test
  void explain_malformedJson_throwsInvalidResponse() throws Exception {
    server.enqueue(
        new MockResponse()
            .addHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .setBody("not json at all"));

    assertThatThrownBy(() -> adapter.explain("code"))
        .isInstanceOf(AiProviderException.class)
        .extracting(e -> ((AiProviderException) e).getStatus())
        .isEqualTo(HttpStatus.BAD_GATEWAY);
  }

  @Test
  void explain_emptyChoices_throwsInvalidResponse() throws Exception {
    server.enqueue(
        new MockResponse()
            .addHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .setBody("{\"choices\":[]}"));

    assertThatThrownBy(() -> adapter.explain("code"))
        .isInstanceOf(AiProviderException.class)
        .hasMessageContaining("no choices");
  }

  @Test
  void explain_emptyContent_throwsInvalidResponse() throws Exception {
    server.enqueue(
        new MockResponse()
            .addHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .setBody("{\"choices\":[{\"message\":{\"content\":\"\"}}]}"));

    assertThatThrownBy(() -> adapter.explain("code"))
        .isInstanceOf(AiProviderException.class)
        .hasMessageContaining("empty content");
  }

  @Test
  void explain_rateLimited429_throwsUnavailable() throws Exception {
    server.enqueue(new MockResponse().setResponseCode(429));

    assertThatThrownBy(() -> adapter.explain("code"))
        .isInstanceOf(AiProviderException.class)
        .extracting(e -> ((AiProviderException) e).getStatus())
        .isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
  }

  @Test
  void explain_serverError500_throwsUnavailable() throws Exception {
    server.enqueue(new MockResponse().setResponseCode(500));

    assertThatThrownBy(() -> adapter.explain("code"))
        .isInstanceOf(AiProviderException.class)
        .extracting(e -> ((AiProviderException) e).getStatus())
        .isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
  }

  @Test
  void explain_clientError400_throwsInvalidResponse() throws Exception {
    server.enqueue(new MockResponse().setResponseCode(400));

    assertThatThrownBy(() -> adapter.explain("code"))
        .isInstanceOf(AiProviderException.class)
        .hasMessageContaining("rejected the request")
        .extracting(e -> ((AiProviderException) e).getStatus())
        .isEqualTo(HttpStatus.BAD_GATEWAY);
  }

  @Test
  void explain_responseWithCodeFence_parsesCorrectly() throws Exception {
    String wrappedContent =
        """
        {
          "choices": [{
            "message": {
              "content": "```json\\n{\\"summary\\":\\"Hello\\",\\"stepByStep\\":[\\"Step 1\\"],\\"concepts\\":[\\"Concept\\"],\\"bestPractices\\":[\\"Practice\\"]}\\n```"
            }
          }]
        }
        """;
    server.enqueue(
        new MockResponse()
            .addHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .setBody(wrappedContent));

    ExplanationResponse response = adapter.explain("code");
    assertThat(response.summary()).isEqualTo("Hello");
  }

  @Test
  void explain_invalidExplanationStructure_throwsInvalidResponse() throws Exception {
    String invalidStructure =
        """
        {
          "choices": [{
            "message": {
              "content": "{\\"summary\\":\\"\\",\\"stepByStep\\":[],\\"concepts\\":[],\\"bestPractices\\":[]}"
            }
          }]
        }
        """;
    server.enqueue(
        new MockResponse()
            .addHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .setBody(invalidStructure));

    assertThatThrownBy(() -> adapter.explain("code"))
        .isInstanceOf(AiProviderException.class)
        .hasMessageContaining("validation");
  }

  @Test
  void explain_sendsCorrectRequestToProvider() throws Exception {
    server.enqueue(
        new MockResponse()
            .addHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .setBody(VALID_AI_RESPONSE));

    adapter.explain("int x = 1;");

    var request = server.takeRequest();
    assertThat(request.getPath()).isEqualTo("/v1/chat/completions");
    assertThat(request.getHeader("Authorization")).isEqualTo("Bearer test-key");
    assertThat(request.getHeader("Content-Type")).contains("application/json");
    String body = request.getBody().readUtf8();
    assertThat(body).contains("test-model");
    assertThat(body).contains("int x = 1;");
    assertThat(body).contains("<<<SNIPPET-");
  }

  @Test
  void explain_snippetWithBackticks_usesUnguessableDelimiter() throws Exception {
    server.enqueue(
        new MockResponse()
            .addHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .setBody(VALID_AI_RESPONSE));

    adapter.explain("String s = \"```\"; // close fence");

    var request = server.takeRequest();
    String body = request.getBody().readUtf8();
    assertThat(body).contains("<<<SNIPPET-");
    assertThat(body).contains(">>>");
  }

  @Test
  void explain_clientError401_throwsGenericMessage() throws Exception {
    server.enqueue(new MockResponse().setResponseCode(401));

    assertThatThrownBy(() -> adapter.explain("code"))
        .isInstanceOf(AiProviderException.class)
        .hasMessageContaining("rejected the request")
        .satisfies(e -> assertThat(e.getMessage()).doesNotContain("401"));
  }

  @Test
  void explain_emptyResponseBody_throwsInvalidResponse() throws Exception {
    server.enqueue(
        new MockResponse()
            .addHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .setBody(""));

    assertThatThrownBy(() -> adapter.explain("code")).isInstanceOf(AiProviderException.class);
  }

  @Test
  void explain_noChoicesField_throwsInvalidResponse() throws Exception {
    server.enqueue(
        new MockResponse()
            .addHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .setBody("{\"result\":\"ok\"}"));

    assertThatThrownBy(() -> adapter.explain("code"))
        .isInstanceOf(AiProviderException.class)
        .hasMessageContaining("no choices");
  }
}
