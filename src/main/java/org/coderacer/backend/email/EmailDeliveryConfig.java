package org.coderacer.backend.email;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(EmailDeliveryProperties.class)
public class EmailDeliveryConfig {}
