package org.coderacer.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Forwards every client-side route to index.html so the router can take over.
 *
 * <p>Registered from {@link FrontendRoutes} rather than listed in an annotation, so the same array
 * also drives the security rules and the two cannot drift apart.
 */
@Configuration
public class FrontendRoutingConfig implements WebMvcConfigurer {

  @Override
  public void addViewControllers(ViewControllerRegistry registry) {
    for (String route : FrontendRoutes.ROUTES) {
      registry.addViewController(route).setViewName("forward:/index.html");
    }
  }
}
