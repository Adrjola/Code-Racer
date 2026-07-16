# Testing Strategy

This document defines the current testing baseline and the quality rules that
apply as Code Racer functionality is implemented.
## Current Baseline

The repository foundation validates build, formatting, linting, application
startup, and the initial automated test suites:

- the backend has unit, web-slice, repository, integration, and Spring Boot
  context smoke tests;
- the backend is compiled, tested, formatted, and coverage-checked by Gradle;
- the frontend is type-checked, linted, formatted, built, and tested with
  Vitest;
- the frontend enforces V8 coverage thresholds for functional source code;
- the Docker Compose services have operational health checks.

Backend coverage enforcement is enabled through JaCoCo, with basic infrastructure tests in place:

- `GlobalExceptionHandlerTest`: Verifies simplified API error responses and exception mapping.
- `CorrelationIdFilterTest`: Verifies request correlation ID propagation and MDC cleanup.
- `CorsConfigTest`: Verifies CORS policy enforcement for allowed and rejected origins.
- `CorsPropertiesTest`: Verifies fail-fast CORS configuration validation.
- `BackendApplicationTests`: Spring Boot context smoke test.

## Frontend Testing Stack

Frontend tests use:

- Vitest for the test runner;
- React Testing Library for component tests;
- `@testing-library/user-event` for realistic interactions;
- `@testing-library/jest-dom` for DOM assertions;
- jsdom for the browser-like test environment;
- MSW for network-boundary mocking;
- the V8 coverage provider for coverage collection.

Shared frontend test setup lives in `frontend/src/test/`.

- `frontend/src/test/setup.ts` starts and stops shared test infrastructure.
- `frontend/src/test/server.ts` exports the shared MSW server.

Tests must mock HTTP boundaries with MSW handlers instead of ad-hoc global
`fetch` mocks. Handlers should use realistic request and response contracts so
service and component tests exercise the same API shapes used by production
code.

## Coverage Gates

Frontend coverage is enforced at 80% for all global metrics:

- lines;
- statements;
- functions;
- branches.

Coverage includes functional files under `frontend/src/**/*.{ts,tsx}`.

The only configured frontend exclusions are:

- `frontend/src/main.tsx`, because it is entry-point bootstrapping;
- `frontend/src/test/**`, because it is test infrastructure;
- colocated `.test.ts`, `.test.tsx`, `.spec.ts`, and `.spec.tsx` files;
- generated declaration files.

Future exclusions must be limited to generated declarations, build
configuration, and true entry-point boilerplate. Any new exclusion must be
documented here.

The shared setup resets DOM state, MSW handlers, timers, storage, and mocks
between tests. Suites should remain isolated and order-independent.

## Backend Testing and Coverage Gates

This section covers the backend testing and coverage gates only. Frontend
testing tooling and coverage gates are configured and documented separately,
outside this Task's scope.

The backend testing foundation is implemented and provides:

- JUnit 5, Mockito, and AssertJ for unit tests;
- MockMvc, Spring Boot Test, and Spring Security Test for web-layer slice tests;
- Testcontainers with PostgreSQL for repository and full integration tests;
- JaCoCo backend coverage reporting and enforcement, wired into
  `./gradlew check`.

New or changed functional backend code must reach at least 80% line and
branch coverage; the same threshold applies to total backend coverage once
enough product code exists for the metric to be meaningful.

## Test Location Conventions

Backend tests use the standard Gradle layout:

```text
src/
`-- test/
    `-- java/
        `-- org/
            `-- coderacer/
                `-- backend/
                    |-- BackendApplicationTests.java             - Spring Boot context smoke test
                    |-- common/
                    |   |-- exception/
                    |   |   `-- GlobalExceptionHandlerTest.java  - Exception handling verification
                    |   `-- logging/
                    |       `-- CorrelationIdFilterTest.java     - Correlation ID verification
                    `-- config/
                        |-- CorsConfigTest.java                  - CORS policy verification
                        `-- CorsPropertiesTest.java              - CORS property validation
```

Test packages under `src/test/java/` mirror the packages under
`src/main/java/`. They may look adjacent in a compact IDE tree, but Gradle
treats them as separate production and test source sets.

Frontend tests are colocated with the source they verify using `.test.ts` or
`.test.tsx` suffixes. Shared frontend test configuration lives under
`frontend/src/test/`.

Current frontend test layout:

```text
frontend/
`-- src/
    |-- test/
    |   |-- server.ts       - shared MSW server for API boundary mocks
    |   `-- setup.ts        - shared Vitest, DOM, storage, timer, and MSW setup
    `-- App.test.tsx        - representative colocated component test
```

Feature tests should follow the same colocated pattern: for example,
`RaceLobby.tsx` should be covered by `RaceLobby.test.tsx` next to it. Only
shared test infrastructure belongs under `frontend/src/test/`.

## Functional Frontend Test Expectations

Frontend feature Tasks must include tests for relevant user-observable states:

- loading;
- success;
- validation;
- authorization;
- empty states;
- error states;
- important responsive or interactive behavior.

Tests should prefer accessible queries such as roles, labels, names, and text
that users can perceive. Avoid asserting component internals unless no
user-observable behavior exists.

## Frontend Test Type Patterns

Use the smallest test type that proves the behavior:

- component tests render the UI with React Testing Library and assert
  user-observable output through accessible queries;
- interaction tests use `@testing-library/user-event` instead of lower-level
  event dispatch helpers;
- hook tests exercise the hook API and state transitions without depending on
  component implementation details;
- utility tests verify deterministic inputs, outputs, edge cases, and error
  handling without DOM setup unless the utility actually needs the DOM;
- state-management tests verify public actions, selectors, and resulting UI or
  store state instead of private reducer internals;
- API-service tests use MSW handlers from `frontend/src/test/server.ts` and
  realistic request and response contracts.

## Database Migrations

Flyway owns the database schema. Migrations live in
`src/main/resources/db/migration` and are named `V<n>__description.sql` (for
example `V1__create_race.sql`). They run automatically when the backend starts.

Once a migration is merged to `develop` it is immutable. Never edit an applied
migration; add a new forward migration instead. Hibernate runs in `validate`
mode, so entities must match the schema the migrations create.

To reset the local database to a clean schema, drop the volume and start again
with `docker compose down -v` followed by `docker compose up`. If a migration
fails locally, fix or replace the migration file and reset the volume rather
than editing the database by hand.

## Backend Integration Tests

Tests that need a database use Testcontainers, which starts a throwaway
PostgreSQL container for the test run. Repository tests should use
`@RepositoryTest`, and full application integration tests should use
`@IntegrationTest`. Legacy context smoke tests may extend
`AbstractPostgresIntegrationTest`, but new tests should prefer the
meta-annotations so they do not depend on a developer's local database. Docker
must be running to execute them.

Email delivery tests must use the captured email adapter configured by the
`test` profile. Automated tests must not send real emails or depend on a real
SMTP provider. Local manual testing uses Mailpit from `compose.yaml`, so
verification links can be inspected in the Mailpit web inbox without reaching
external recipients.

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

- `@DataJpaTest` - boots only the JPA slice (EntityManager, Spring Data
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

JaCoCo (80% line and branch) excludes only the Spring Boot entry point and
generated code. Future exclusions require documented justification.

## Current Commands

### Backend

From the repository root (Linux/macOS `./gradlew`, Windows `.\gradlew.bat`):

- `test` — unit and web-slice tests only, no Docker required.
- `integrationTest` — repository and full integration tests (requires Docker).
- `jacocoTestReport` — merged coverage report at
  `build/reports/jacoco/test/html/index.html`.
- `start build/reports/jacoco/test/html/index.html` — opens the generated
  backend coverage report in a browser on Windows.
- `clean check` — everything, including the coverage gate; the command CI
  runs.

### Frontend

From `frontend/`:

```bash
npm ci
npm run lint
npm run test
npm run test:watch
npm run test:coverage
npm run format:check
npm run build
```

Use `npm run test` for deterministic non-watch execution. Use
`npm run test:watch` during local development. Use `npm run test:coverage` to
verify the 80% coverage gates locally before opening a pull request.

## Continuous Integration

GitHub Actions runs frontend lint, `test:coverage`, formatting check, and the
production build for pull requests and pushes targeting `develop` or `main`.
The `test:coverage` command runs the non-watch test suite and enforces coverage
gates in a single Vitest execution.

The frontend CI job writes a JUnit test report to `frontend/reports/` and
coverage output to `frontend/coverage/`. When the job fails, those reports are
uploaded as a short-retention artifact for debugging.

## Pull Request Evidence

Pull requests must report the relevant build, formatting, lint, test, coverage,
and manual verification commands that were run.

Implementation pull requests must include relevant automated tests, coverage
evidence, and manual verification notes where needed. A Task cannot move to
Done while its required tests or quality checks fail.
