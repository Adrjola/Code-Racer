FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /workspace

COPY gradle ./gradle
COPY gradlew build.gradle settings.gradle ./
RUN chmod +x gradlew && ./gradlew dependencies --no-daemon

COPY src ./src
RUN ./gradlew bootJar --no-daemon

FROM eclipse-temurin:21-jre-alpine AS runtime

RUN apk add --no-cache curl \
    && addgroup -S coderacer \
    && adduser -S coderacer -G coderacer

WORKDIR /app

COPY --from=builder --chown=coderacer:coderacer /workspace/build/libs/*.jar app.jar

USER coderacer
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
