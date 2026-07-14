# Testing Strategy

This document defines the current testing baseline and the quality rules that
will apply as Code Racer functionality is implemented.

## Foundation Baseline

The repository foundation intentionally contains only the checks needed to
prove that both applications can be built and started:

- the backend has one Spring Boot context smoke test;
- the backend is compiled, tested, and formatted by Gradle;
- the frontend is type-checked, linted, formatted, and built;
- the Docker Compose services have operational health checks.

The frontend testing stack and coverage gates are not enabled yet. Enforcing an
80% threshold against an almost empty scaffold would create configuration and
placeholder tests without validating product behaviour.

## Backend Testing and Coverage Gates

This section covers the backend testing and coverage gates only. Frontend
testing tooling and coverage gates are configured and documented separately,
outside this Task's scope.

The backend testing foundation is implemented and provides:

- JUnit 5, Mockito, and AssertJ for unit tests;
- MockMvc and Spring Boot Test for web-layer slice tests (Spring Security
  Test will be added when security is introduced);
- Testcontainers with PostgreSQL for repository and full integration tests;
- JaCoCo backend coverage reporting and enforcement, wired into
  `./gradlew check`.

New or changed functional backend code must reach at least 80% line and
branch coverage; the same threshold applies to total backend coverage once
enough product code exists for the metric to be meaningful.

## Test Location Conventions

Backend tests use the standard Gradle layout:

```text
src/main/java/  - production backend code
src/test/java/  - backend test code
```

Test packages under `src/test/java/` mirror the packages under
`src/main/java/`. They may look adjacent in a compact IDE tree, but Gradle
treats them as separate production and test source sets.

Frontend tests will be colocated with the source they verify using `.test.ts`
or `.test.tsx` suffixes. Shared frontend test configuration will live under
`frontend/src/test/` when the testing stack is introduced.

## Test Tier Conventions

Backend tests fall into four tiers, from cheapest to most expensive. Default to
the cheapest tier that can prove the behaviour; only reach for a Spring slice
when plain JUnit cannot exercise what you need to verify.

| Tier | Style | Starts Spring context? | Starts PostgreSQL? | Naming |
|---|---|---|---|---|
| Unit | Plain JUnit 5 + `@ExtendWith(MockitoExtension.class)` + Mockito + AssertJ | No | No | `*Test` |
| Web/MVC slice | `@WebMvcTest` + `MockMvc` + `@MockitoBean` for collaborators | Web layer only | No | `*Test` (e.g. `*ControllerTest`) |
| Repository slice | `@DataJpaTest` + Testcontainers PostgreSQL | JPA layer only | Yes | `*RepositoryTest`, tagged `integration` |
| Full integration | `@SpringBootTest(webEnvironment = RANDOM_PORT)` + Testcontainers PostgreSQL | Full | Yes | `*IT` / `*IntegrationTest`, tagged `integration` |

Repository and full-integration tests use the `@RepositoryTest` and
`@IntegrationTest` meta-annotations in
`src/test/java/org/coderacer/backend/support/`, so the correct Spring slice,
real PostgreSQL wiring, and `integration` tag are applied consistently instead
of being re-assembled by hand on every test class.

`@RepositoryTest` composes:

- `@DataJpaTest` — boots only the JPA slice (EntityManager, Spring Data
  repositories, DataSource), not the whole application. Its default
  per-test transactional rollback is also what gives repository tests
  isolation without manual cleanup.
- `@AutoConfigureTestDatabase(replace = Replace.NONE)` — `@DataJpaTest`
  normally swaps the configured DataSource for an embedded H2 database; this
  cancels that so tests run against the real PostgreSQL semantics provided by
  the Testcontainers container instead of an emulation that doesn't share
  Postgres's dialect, constraints, or types.
- `@Import(PostgresTestcontainersConfiguration.class)` — registers the
  `PostgreSQLContainer` bean (annotated `@ServiceConnection`) into the slice's
  context. `@DataJpaTest` does not auto-discover arbitrary
  `@TestConfiguration` classes, so this import is required. It also means
  every test class importing the same configuration shares one cached
  context and one already-running container, instead of starting a new
  container per class.
- `@Tag("integration")` — a plain JUnit 5 tag, unrelated to Spring. It is what
  lets Gradle's `test` task exclude these tests and the `integrationTest` task
  include them, so the fast and Docker-dependent suites stay separate and
  predictable.

`@IntegrationTest` follows the same pattern, substituting
`@SpringBootTest(webEnvironment = RANDOM_PORT)` for `@DataJpaTest` +
`@AutoConfigureTestDatabase` to boot the full application instead of just the
JPA slice, while keeping the same `@Import` and `@Tag`.

## Test Isolation and Coverage

Repository and integration tests use Testcontainers-provisioned PostgreSQL
via `@ServiceConnection` (see `support/PostgresTestContainersConfiguration`),
never local `.env` values, and must not depend on execution order.
`integrationTest`/`check` require a local Docker daemon.

JaCoCo (80% line and branch) excludes only the Spring Boot entry point,
configuration-only boilerplate, and generated code.

## Current Commands

### Backend

From the repository root (Linux/macOS `./gradlew`, Windows `.\gradlew.bat`):

- `test` — unit and web-slice tests only, no Docker required.
- `integrationTest` — repository and full integration tests (requires Docker).
- `jacocoTestReport` — merged coverage report at
  `build/reports/jacoco/test/html/index.html`.
- `clean check` — everything, including the coverage gate; the command CI
  runs.

### Frontend

From `frontend/`:

```bash
npm ci
npm run lint
npm run format:check
npm run build
```

## Rules After the Testing Foundation Is Enabled

- Testing is delivered together with functionality.
- Every implementation Task contains a detailed `Testing` section.
- Tests verify acceptance criteria, observable behaviour, validation, error
  states, and authorization where applicable.
- New or changed functional code reaches at least 80% coverage.
- A Task cannot move to Done while its required tests or quality checks fail.
- Automatically reproducible bug fixes include a regression test.
- Manual testing complements automated tests but does not replace them.

Cross-component integration tests may be separate Tasks when their scope spans
multiple features. Those relationships must be recorded in GitHub Projects so
testing work cannot silently fall behind implementation.

## Pull Request Evidence

Before the full testing foundation exists, pull requests must report the
relevant build, formatting, and lint commands that were run. After it is
enabled, implementation pull requests must additionally include relevant tests,
coverage evidence, and manual verification notes where needed.
