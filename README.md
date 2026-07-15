# Code Racer

Code Racer is a real-time Java syntax practice platform where users can train
individually or compete with friends in private code-typing races.

## Applications

- `src/` - Spring Boot backend source and tests
- `frontend/` - React and TypeScript web application
- `docs/` - team workflow and testing documentation
- `compose.yaml` - local PostgreSQL and backend orchestration

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
|       `-- ci.yml
|-- docs/
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
- Gradle

Security, WebSocket support, and API documentation will be added by the feature
Tasks that first require them.

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Vitest
- React Testing Library
- MSW

Routing and API clients will be introduced when their first features are
implemented.

### Local Infrastructure

- PostgreSQL
- Docker Compose

The database container backs local development. The backend connects to it with
Spring Data JPA, and Flyway manages the schema.

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

2. Adjust the local PostgreSQL values in `.env` if necessary.

3. Ensure Docker Desktop is running, then build and start PostgreSQL and the
   backend from the repository root.

```bash
docker compose up --build -d
```

4. In a separate terminal, install the frontend dependencies and start the
   Vite development server.

```bash
cd frontend
npm ci
npm run dev
```

Vite watches the frontend source files and updates the browser while the
frontend is being developed. Docker Compose intentionally does not run the
frontend development server.

Open:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:8080/actuator/health`
- PostgreSQL: `localhost:5432`

Stop the stack without deleting database data:

```bash
docker compose down
```

Stop the stack and delete the local database volume:

```bash
docker compose down -v
```

Stop the frontend development server with `Ctrl+C` in its terminal.

Use volume removal only when a clean local database is intended. Never commit
`.env`, access tokens, passwords, or other real secrets.

## Documentation

- [Working Agreements](docs/working_agreements.md)
- [Testing Strategy](docs/testing.md)
- [API Conventions](docs/api-conventions.md)
