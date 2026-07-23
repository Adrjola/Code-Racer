package org.coderacer.backend.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.coderacer.backend.config.FrontendRoutes;
import org.coderacer.backend.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * The app and the API share a host, so refreshing on a client-side route reaches Spring. Every
 * route has to come back as the page rather than an API error, signed in or not.
 */
@IntegrationTest
class FrontendRoutingIntegrationTest {

  private static final Path APP_ROUTER = Path.of("frontend", "src", "app", "App.tsx");
  private static final Pattern ROUTER_CASE = Pattern.compile("case '(/[^']*)':");

  @Autowired private TestRestTemplate restTemplate;

  @Test
  void everyFrontendRouteServesTheAppWithoutAuthentication() {
    for (String route : FrontendRoutes.ROUTES) {
      ResponseEntity<String> response = restTemplate.getForEntity(route, String.class);

      assertThat(response.getStatusCode())
          .as("refreshing on %s must serve the app, not an API error", route)
          .isEqualTo(HttpStatus.OK);
      assertThat(response.getBody())
          .as("%s should return the app shell", route)
          .contains("data-test-app-shell");
    }
  }

  /**
   * Guards the drift that broke /statistics in production: a route was added to the router and
   * nobody added it here, so refreshing on it answered with an authentication error.
   */
  @Test
  void everyRouteTheRouterHandlesIsServedByTheBackend() throws IOException {
    List<String> routerPaths = routesDeclaredInTheApp();

    assertThat(routerPaths)
        .as("sanity check that the router was actually parsed")
        .contains("/login", "/statistics");
    assertThat(FrontendRoutes.ROUTES)
        .as("the router handles these routes, so a refresh on them has to work too")
        .contains(routerPaths.toArray(String[]::new));
  }

  @Test
  void unknownPathsAreStillRejected() {
    ResponseEntity<String> response =
        restTemplate.getForEntity("/definitely-not-a-route", String.class);

    assertThat(response.getStatusCode()).isNotEqualTo(HttpStatus.OK);
  }

  private static List<String> routesDeclaredInTheApp() throws IOException {
    Path router = APP_ROUTER.toAbsolutePath();
    assertThat(router).as("the router should be readable from the repository root").exists();

    Matcher matcher = ROUTER_CASE.matcher(Files.readString(router));
    return matcher
        .results()
        .map(result -> result.group(1))
        // "/" is served as the static index rather than a forwarded route.
        .filter(path -> !path.equals("/"))
        .distinct()
        .toList();
  }
}
