package org.coderacer.backend.security;

import static org.springframework.security.config.http.SessionCreationPolicy.STATELESS;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.nio.charset.StandardCharsets;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.coderacer.backend.config.properties.JwtProperties;
import org.coderacer.backend.enums.UserRole;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

  @Bean
  SecurityFilterChain securityFilterChain(
      HttpSecurity http, SecurityExceptionHandler exceptionHandler, JwtDecoder jwtDecoder)
      throws Exception {
    return http.csrf(AbstractHttpConfigurer::disable)
        .cors(Customizer.withDefaults())
        .sessionManagement(session -> session.sessionCreationPolicy(STATELESS))
        .exceptionHandling(
            exceptions ->
                exceptions
                    .authenticationEntryPoint(exceptionHandler)
                    .accessDeniedHandler(exceptionHandler))
        .authorizeHttpRequests(
            authorize ->
                authorize
                    .requestMatchers(HttpMethod.OPTIONS, "/**")
                    .permitAll()
                    .requestMatchers("/actuator/health", "/actuator/info")
                    .permitAll()
                    .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html")
                    .permitAll()
                    .requestMatchers(
                        HttpMethod.POST,
                        "/api/auth/register",
                        "/api/auth/login",
                        "/api/auth/email-verification/confirm",
                        "/api/auth/email-verification/resend",
                        "/api/auth/forgot-password",
                        "/api/auth/reset-password")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/categories/**")
                    .permitAll()
                    .requestMatchers("/api/admin/**")
                    .hasRole(UserRole.ADMIN.name())
                    .requestMatchers("/api/**")
                    .hasAnyRole(UserRole.USER.name(), UserRole.ADMIN.name())
                    .anyRequest()
                    .denyAll())
        .oauth2ResourceServer(
            oauth2 ->
                oauth2
                    .authenticationEntryPoint(exceptionHandler)
                    .accessDeniedHandler(exceptionHandler)
                    .jwt(
                        jwt ->
                            jwt.decoder(jwtDecoder)
                                .jwtAuthenticationConverter(jwtAuthenticationConverter())))
        .build();
  }

  @Bean
  SecretKey jwtSecretKey(JwtProperties properties) {
    return new SecretKeySpec(properties.secret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
  }

  @Bean
  JwtEncoder jwtEncoder(SecretKey jwtSecretKey) {
    return new NimbusJwtEncoder(new ImmutableSecret<>(jwtSecretKey));
  }

  @Bean
  JwtDecoder jwtDecoder(SecretKey jwtSecretKey, JwtUserStatusValidator validator) {
    NimbusJwtDecoder decoder =
        NimbusJwtDecoder.withSecretKey(jwtSecretKey).macAlgorithm(MacAlgorithm.HS256).build();
    decoder.setJwtValidator(
        new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefault(), validator));
    return decoder;
  }

  @Bean
  Converter<Jwt, AbstractAuthenticationToken> jwtAuthenticationConverter() {
    JwtGrantedAuthoritiesConverter authoritiesConverter = new JwtGrantedAuthoritiesConverter();
    authoritiesConverter.setAuthoritiesClaimName(JwtTokenService.ROLES_CLAIM);
    authoritiesConverter.setAuthorityPrefix("ROLE_");

    JwtAuthenticationConverter authenticationConverter = new JwtAuthenticationConverter();
    authenticationConverter.setJwtGrantedAuthoritiesConverter(authoritiesConverter);
    return authenticationConverter;
  }
}
