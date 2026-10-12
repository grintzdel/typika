# syntax=docker/dockerfile:1

FROM gradle:9.8.1-jdk25@sha256:e4f9e3d037cc0c7d8fc42cd97edb976dfd19a5b7314212b88b6de3807d13cd47 AS build
WORKDIR /src
COPY settings.gradle.kts build.gradle.kts ./
COPY src src
RUN --mount=type=cache,target=/home/gradle/.gradle gradle installDist --no-daemon -q

FROM eclipse-temurin:25-jre@sha256:fcd7fd7b387f94bb2ac461478a7436ad8e349924c374ea8313919624dceae636
COPY --from=build /src/build/install/typika-kotlin-compiler/lib /app/lib
COPY --from=build /src/build/web-libs /app/web-libs
ENV KOTLIN_COMPILER_WEB_LIBS=/app/web-libs KOTLIN_COMPILER_AOT_CACHE=/app/worker.aot MALLOC_ARENA_MAX=2 PORT=8080
RUN java -Xmx64m -cp '/app/lib/*' typika.compiler.TrainKt
WORKDIR /tmp
USER 65534:65534
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s \
  CMD ["java", "-Xmx16m", "-XX:TieredStopAtLevel=1", "-XX:-UsePerfData", "-cp", "/app/lib/*", "typika.compiler.HealthcheckKt"]
CMD ["java", "-Xmx96m", "-XX:+UseSerialGC", "-XX:-UsePerfData", "-cp", "/app/lib/*", "typika.compiler.ServerKt"]
