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

## Testing and Coverage Gates Task

A separate early Task must establish the complete automated testing foundation
before functional feature pull requests are merged. That Task will add:

- JUnit, Mockito, MockMvc, and Spring Boot Test conventions;
- Testcontainers with PostgreSQL for persistence integration tests;
- JaCoCo backend coverage reporting and enforcement;
- Vitest, React Testing Library, and user-event for the frontend;
- frontend coverage reporting and enforcement;
- CI test and coverage checks for both applications.

The Task must enforce at least 80% coverage for new or changed functional code
and at least 80% total coverage once enough product code exists for the metric
to be meaningful.

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
PostgreSQL container for the test run. They extend
`AbstractPostgresIntegrationTest`, so they never depend on a developer's local
database. Docker must be running to execute them.

## Current Commands

### Backend

From the repository root on Linux or macOS:

```bash
./gradlew clean check
```

From the repository root on Windows:

```powershell
.\gradlew.bat clean check
```

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
