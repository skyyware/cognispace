FROM node:22-alpine AS frontend-build
WORKDIR /workspace/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

FROM maven:3.9.11-eclipse-temurin-21 AS backend-build
WORKDIR /workspace
COPY pom.xml pom.xml
COPY backend backend
COPY --from=frontend-build /workspace/frontend/dist backend/src/main/resources/static
RUN --mount=type=cache,target=/root/.m2 mvn -pl backend package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --create-home --shell /usr/sbin/nologin appuser
COPY --from=backend-build /workspace/backend/target/cognispace-api-1.0.0.jar /app/app.jar
RUN chown -R appuser:appuser /app
USER appuser
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
