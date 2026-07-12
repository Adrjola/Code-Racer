# Working Agreements

This document defines the Code Racer team's repository workflow, branch naming,
commit conventions, pull request rules, testing expectations, and collaboration
agreements.

## Team Roles

- Erika - UI/UX Designer
- Adrijus - Product Owner, Developer, Tester
- Damian - Developer, Tester
- Kasparas - Developer, Tester
- Ervinas - Developer, Tester

Development work is not permanently assigned to individual developers. Team
members pull the highest-priority unblocked task they can complete from the
Sprint Backlog.

## Branching Strategy

The repository uses a simple GitHub flow with protected shared branches and
task-based working branches.

### Main Branches

- `main` - stable, release-ready code
- `develop` - integration branch for active Sprint work

All feature, fix, documentation, test, build, and maintenance branches are
created from an up-to-date `develop` branch. Regular pull requests target
`develop`. A release pull request from `develop` to `main` is created when a
Sprint increment is ready.

### Branch Naming Convention

Use the following pattern:

```text
<type>/<short-description>
```

Branch names must be lowercase, concise, and separated with hyphens. Do not add
GitHub Issue numbers to branch names.

Examples:

- `docs/repository-foundation`
- `build/spring-boot-setup`
- `build/react-app-setup`
- `ci/quality-checks`
- `feat/user-registration`
- `feat/solo-typing-race`
- `feat/private-lobby`
- `fix/countdown-synchronization`
- `test/lobby-integration`
- `refactor/race-state-management`
- `chore/dependency-update`

### Allowed Prefixes

- `feat` - new functionality
- `fix` - bug fix
- `docs` - documentation-only change
- `test` - test-only change or cross-feature test infrastructure
- `build` - project setup, build tools, or dependency configuration
- `ci` - continuous integration configuration
- `refactor` - code restructuring without a behaviour change
- `chore` - maintenance work

One branch should represent one focused GitHub Task or Bug. If the scope grows
beyond the original Task, create a separate Issue and branch.

## Commit Message Convention

Use concise Conventional Commit-style messages:

```text
type: short description
```

Examples:

- `docs: add repository working agreements`
- `build: initialize spring boot backend`
- `feat: implement user registration`
- `feat: add private lobby ready state`
- `test: cover race state transitions`
- `fix: reject duplicate finish events`

Commit messages must describe the actual change and must not end with a period.

## GitHub Project Workflow

The GitHub Project is the source of truth for planned and active work.

```text
Product Backlog -> Sprint Backlog -> In Progress -> In Review -> Done
```

### Project Views

- `Backlog` - board grouped by Status with parent Feature swimlanes
- `Priority table` - open items grouped and sorted by Priority
- `Team items` - open items grouped by Assignee
- `My items` - open items assigned to the current viewer

The project does not use a Roadmap view.

### Work Item Structure

- Features describe broad product areas.
- Tasks are detailed implementation units attached to a parent Feature through
  GitHub sub-issues.
- Bugs describe verified defects and their expected behaviour.
- Priority, Sprint, Estimate, Parent Issue, Assignee, and dependency
  relationships are stored as GitHub Project metadata rather than duplicated in
  Issue descriptions.

### Priority Rules

- `P0` - critical must-have work that blocks the MVP or several other Tasks
- `P1` - required MVP work that is not on the immediate critical path
- `P2` - stretch work from the nice-to-have backlog

P2 work must not begin until every P0 and P1 Task is Done.

### Pull Policy

- The Product Owner maintains backlog order, Priority, and Sprint scope.
- Developers pull the highest-priority unblocked Task they can complete.
- Each developer should have no more than one Task in `In progress`.
- A Task moves to `In progress` only when active implementation starts.
- A blocked Task receives the `blocked` label and its dependency is recorded in
  GitHub.
- When blocked, a developer may pull another unblocked Task.

## Issue Requirements

### Feature Issues

Feature Issues contain:

- Description
- Goal
- Acceptance Criteria
- Native GitHub sub-issues for all related Tasks

Feature Issues do not contain a Business Value section.

### Task Issues

Task Issues contain:

- Description
- Implementation Notes
- Testing
- Acceptance Criteria

Task descriptions must be detailed enough that the implementer does not need to
make an unrecorded product or architecture decision.

### Bug Issues

Bug Issues contain:

- Description
- Steps to reproduce
- Expected behaviour
- Actual behaviour
- Environment
- Testing and regression requirements
- Acceptance Criteria

## Pull Request Rules

All changes must be merged through pull requests.

The one-time repository bootstrap may be committed directly to `main` before
branch protections and CI checks exist. After that bootstrap, this exception no
longer applies and `develop` must be synchronized with `main` before Sprint work
begins.

- Do not commit directly to `main` or `develop`.
- Create a dedicated branch for every Task or Bug.
- Regular pull requests target `develop`.
- Only release pull requests target `main`.
- Keep pull requests focused and reasonably small.
- Use the same `type: short description` format for pull request titles.
- Link the related Issue and use `Closes #<issue>` in the pull request body.
- Update the branch from its target branch before requesting review.
- Confirm that all currently configured CI checks pass.
- Receive at least one approval from another developer.
- Resolve all review conversations before merging.
- Update documentation when setup, behaviour, or a public interface changes.

The pull request author must not approve their own pull request.

## Testing Agreement

Testing is part of implementation rather than a later project phase.

- The initial Foundation validates build, formatting, linting, application
  startup, and the Spring application context.
- A separate Testing and Coverage Gates Task must be completed before
  functional feature pull requests are merged.
- After those gates are enabled, every implementation Task includes its
  relevant tests and new or changed functional code reaches at least 80%
  coverage.
- JaCoCo and Vitest coverage enforcement will be configured by that Task.
- Bug fixes include a regression test whenever the defect can be reproduced
  automatically.
- Manual testing complements automated tests but does not replace the coverage
  requirement.
- After the testing foundation is enabled, a Task cannot move to Done until its
  tests and coverage checks pass.

Detailed testing rules are documented in
[`testing.md`](./testing.md).

## Communication and Collaboration

- Hold a short daily stand-up.
- Report blockers as soon as they are discovered.
- Record technical or product decisions in the relevant Issue or pull request.
- Use GitHub Project status as the authoritative work status.
- Request review promptly when a Task moves to `In review`.
- Reviewers focus on behaviour, maintainability, security, tests, and acceptance
  criteria.
- All team members participate in integration and final regression testing.

## General Agreements

1. Code, documentation, Issues, and pull requests are written in English.
2. Secrets, access tokens, private keys, and real environment values must never
   be committed.
3. Use `.env.example` files to document required environment variables.
4. Avoid mixing unrelated changes in one branch or pull request.
5. Do not silently expand a Task beyond its Acceptance Criteria.
6. Prefer small, reviewable changes over large pull requests.
7. Keep local branches up to date and delete merged working branches.
8. Update documentation whenever the repository workflow or application setup
   changes.
