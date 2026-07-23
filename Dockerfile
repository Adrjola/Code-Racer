FROM node:22-alpine AS frontend-builder

WORKDIR /workspace/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend ./
RUN npm run build

FROM eclipse-temurin:21-jdk-alpine AS backend-builder

WORKDIR /workspace

COPY gradle ./gradle
COPY gradlew build.gradle settings.gradle ./
RUN chmod +x gradlew && ./gradlew dependencies --no-daemon

COPY src ./src
COPY --from=frontend-builder /workspace/frontend/dist ./src/main/resources/static
RUN ./gradlew bootJar --no-daemon

FROM eclipse-temurin:21-jre-alpine AS runtime

RUN apk add --no-cache curl \
    && addgroup -S coderacer \
    && adduser -S coderacer -G coderacer

WORKDIR /app

COPY --from=backend-builder --chown=coderacer:coderacer /workspace/build/libs/*.jar app.jar

USER coderacer
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
