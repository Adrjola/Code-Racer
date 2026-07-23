# Code Racer

Code Racer is a Java syntax practice platform where players race to retype real
code snippets as fast and as accurately as they can.

## Features

- **Solo races** - pick a category and difficulty, preview a snippet, then race
  it against a server-timed clock with live cpm and progress.
- **Results and ranking** - every finished race is scored by the server and
  placed against your own best and everyone else's.
- **Statistics** - a global leaderboard per difficulty, plus personal bests,
  averages, and per-snippet history.
- **Admin catalog** - administrators create and retire the snippets players
  race, and manage user accounts.
- **AI code explanations** - administrators generate an explanation for a
  snippet once; players read the stored result from the race screen.

Multiplayer races are not implemented yet.

## Applications

- `src/` - Spring Boot backend source and tests
- `frontend/` - React and TypeScript web application
- `docs/` - team workflow and testing documentation
- `compose.yaml` - local PostgreSQL, Mailpit, backend, and frontend orchestration
- `compose.prod.yaml` - production app and PostgreSQL orchestration

The backend is built from the repository root with Gradle. The frontend is a
separate npm application under `frontend/`.

## Team

- Adrijus - Product Owner / Developer / Tester
- Erika - UI/UX Designer
- Damian - Developer / Tester
- Kasparas - Developer / Tester
- Ervinas - Developer / Tester

## Repository Structure

```text
.
|-- .github/
|   `-- workflows/
|       |-- ci.yml
|       |-- deploy.yml
|       `-- diagnose-deployment.yml
|-- docs/
|   |-- api-conventions.md
|   |-- testing.md
|   `-- working_agreements.md
|-- frontend/
|   |-- src/
|   `-- package.json
|-- gradle/
|   `-- wrapper/
|-- src/
|   |-- main/
|   `-- test/
|-- .env.example
|-- build.gradle
|-- compose.yaml
|-- compose.prod.yaml
|-- Dockerfile
|-- gradlew
|-- gradlew.bat
|-- settings.gradle
`-- README.md
```

## Technology Stack

### Backend

- Java 21
- Spring Boot
- Spring Web MVC
- Spring Boot Actuator
- Spring Data JPA and Hibernate
- Flyway
- Spring Security with JWT resource-server authentication
- springdoc-openapi (Swagger UI)
- Lombok
- Gradle, Spotless, JaCoCo
- Testcontainers for integration tests

WebSocket support will be added by the feature Task that first requires it.

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- three.js (the Benji mascot on the landing page)
- Vitest
- React Testing Library
- MSW

### Local Infrastructure

- PostgreSQL
- Mailpit
- Docker Compose

The database container backs local development. Mailpit captures local outbound
emails so registration and verification flows can be tested without sending real
messages. The backend connects to PostgreSQL with Spring Data JPA, and Flyway
manages the schema.

### Quality and Collaboration

- Spotless
- ESLint and Prettier
- GitHub Actions
- GitHub Projects
- Figma

## Local Development

### Prerequisites

- Git
- Java Development Kit 21
- Node.js 22 and npm
- Docker Desktop with Docker Compose

### Clone the Repository

```bash
git clone git@github.com:Adrjola/code-racer.git
cd code-racer
```

### Run the Development Environment

1. Create the local environment file.

On Linux or macOS:

```bash
cp .env.example .env
```

On PowerShell:

```powershell
Copy-Item .env.example .env
```

2. Fill in every required value in `.env`. Secrets such as
   `POSTGRES_PASSWORD`, `APP_JWT_SECRET`, SMTP credentials, and admin bootstrap
   credentials must stay in `.env` only; `.env.example` documents the structure
   without real secret values. Local verification emails are sent to Mailpit by
   default through the SMTP settings in `.env.example`. To test real email
   delivery locally, replace the Mailpit SMTP values with real SMTP credentials
   in `.env`. To bootstrap an
   initial administrator on an empty environment, set
   `APP_ADMIN_BOOTSTRAP_ENABLED=true` and provide `APP_ADMIN_EMAIL`,
   `APP_ADMIN_USERNAME`, and `APP_ADMIN_PASSWORD`. Leave bootstrap disabled
   after the initial account exists.

3. Ensure Docker Desktop is running, then build and start PostgreSQL, Mailpit,
   the backend, and the frontend from the repository root.

```bash
docker compose up --build -d
```

Docker Compose runs the Vite development server in the `frontend` container.
Vite watches the frontend source files and updates the browser while the
frontend is being developed.

Open:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:8080/actuator/health`
- API documentation: `http://localhost:8080/swagger-ui.html`
- PostgreSQL: `localhost:5432`
- Mailpit inbox: `http://localhost:8025`

Stop the stack without deleting database data:

```bash
docker compose down
```

Stop the stack and delete the local database volume:

```bash
docker compose down -v
```

Use volume removal only when a clean local database is intended. If
`POSTGRES_DB`, `POSTGRES_USER`, or `POSTGRES_PASSWORD` changes after the
database volume was created, recreate the volume with
`docker compose down -v --remove-orphans`; plain `docker compose down` keeps the
old database data and credentials. Never commit `.env`, access tokens,
passwords, or other real secrets.

## Documentation

- [Working Agreements](docs/working_agreements.md)
- [Testing Strategy](docs/testing.md)
- [API Conventions](docs/api-conventions.md)

## Deployment

Production deployment is handled by `.github/workflows/deploy.yml` and
`compose.prod.yaml`. Pull requests into `main` build the Docker image without
touching the server. Pushes to `main` deploy on the self-hosted runner through
the `production` GitHub Environment. The workflow builds a single Docker image
containing the Spring Boot API and the compiled Vite frontend, then starts the
production Compose stack. `compose.prod.yaml` owns the app/PostgreSQL service
definitions, persistent database volume, health checks, and host port mapping.

Required `production` Environment Secrets:

- `POSTGRES_PASSWORD`
- `MAIL_PASSWORD`
- `APP_JWT_SECRET`
- `APP_AI_API_KEY`

Required `production` Environment Variables:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `MAIL_HOST`
- `MAIL_PORT`
- `MAIL_USERNAME`
- `MAIL_SMTP_AUTH`
- `MAIL_SMTP_STARTTLS_ENABLE`
- `APP_EMAIL_FROM`
- `APP_EMAIL_VERIFICATION_URL`
- `APP_PASSWORD_RESET_URL`
- `APP_JWT_ACCESS_TOKEN_TTL`
- `ALLOWED_ORIGINS`
- `APP_ADMIN_BOOTSTRAP_ENABLED`
- `APP_EMAIL_VERIFICATION_TOKEN_TTL`
- `APP_EMAIL_VERIFICATION_RESEND_COOLDOWN`
- `APP_PASSWORD_RESET_TOKEN_TTL`
- `APP_PASSWORD_RESET_RESEND_COOLDOWN`
- `APP_AI_ENABLED`
- `APP_AI_BASE_URL`
- `APP_AI_MODEL_ID`

Admin bootstrap values are needed only while creating the first production
admin. Email and username are Environment Variables; password is an Environment
Secret:

- `APP_ADMIN_EMAIL`
- `APP_ADMIN_USERNAME`
- `APP_ADMIN_PASSWORD`

For the first production deploy only, set `APP_ADMIN_BOOTSTRAP_ENABLED=true`
and provide the admin email, username, and password. After the first admin user
exists, set `APP_ADMIN_BOOTSTRAP_ENABLED=false` again.

A new database starts with no snippets, so players cannot race until an
administrator adds some through the admin catalog. Bootstrap the admin account
first, then create the initial snippets.

The internship Cloudflare Tunnel maps
`https://team6.acnbootcamp.lv` to port `3600` on the host machine. The container
listens on port `8080` internally; the workflow maps host port `3600` to it.

Production URL values:

- `ALLOWED_ORIGINS=https://team6.acnbootcamp.lv`
- `APP_EMAIL_VERIFICATION_URL=https://team6.acnbootcamp.lv/verify-email`
- `APP_PASSWORD_RESET_URL=https://team6.acnbootcamp.lv/reset-password`
