# Testing Strategy

This document defines the current testing baseline and the quality rules that
apply as Code Racer functionality is implemented.

## Current Baseline

The repository foundation validates build, formatting, linting, application
startup, and the initial automated test suites:

- the backend has one Spring Boot context smoke test;
- the backend is compiled, tested, and formatted by Gradle;
- the frontend is type-checked, linted, formatted, built, and tested with
  Vitest;
- the frontend enforces V8 coverage thresholds for functional source code;
- the Docker Compose services have operational health checks.

Backend coverage enforcement is not enabled yet. A separate backend testing
Task should add JUnit, Mockito, MockMvc, Testcontainers with PostgreSQL, and
JaCoCo enforcement before backend feature work depends on those layers.

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

The shared setup resets DOM state, MSW handlers, timers, storage, and mocks
between tests. Suites should remain isolated and order-independent.

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

## Test Location Conventions

Backend tests use the standard Gradle layout:

```text
src/
`-- test/
    `-- java/
        `-- org/
            `-- coderacer/
                `-- backend/
                    `-- BackendApplicationTests.java  - Spring Boot context smoke test
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
