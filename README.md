# Sync Bridge Monorepo

Welcome to the **Sync Bridge** monorepo! This repository hosts a suite of data synchronization services built with different backend technologies. The services collaborate to enable robust, reliable database transfers, migrations, and live synchronization.

---

## 📂 Sub-Projects

Rather than maintaining setup instructions in a single monolithic document, each service includes its own dedicated documentation. Please refer to the individual service folders and their corresponding readmes below for setup, installation, and usage details:

- **☕ [Java Spring Boot Service](sync-bridge-java/README.md)** (`sync-bridge-java`): <!-- cov:java -->![Coverage](https://img.shields.io/badge/Coverage-pending-lightgrey)<!-- cov:java-end --> Core API built using Spring Boot, Hibernate, and GraphQL, providing logging and database transaction monitoring.
- **📦 [NestJS Service](sync-bridge-nestjs/README.md)** (`sync-bridge-nestjs`): <!-- cov:nestjs -->![Coverage](https://img.shields.io/badge/Coverage-pending-lightgrey)<!-- cov:nestjs-end --> Node.js synchronization engine built on NestJS, TypeORM, and Apollo GraphQL.
- **⚡ [Express Service](sync-bridge-express/README.md)** (`sync-bridge-express`): <!-- cov:express -->![Coverage](https://img.shields.io/badge/Coverage-pending-lightgrey)<!-- cov:express-end --> Backend exporter service built on Express, Sequelize, and Apollo Server.
- **🐍 [Django Service](sync-bridge-django/README.md)** (`sync-bridge-django`): <!-- cov:django -->![Coverage](https://img.shields.io/badge/Coverage-pending-lightgrey)<!-- cov:django-end --> Service built on Django, Rest Framework, Strawberry GraphQL, and Python-UV.
- **🦀 [Rust Axum Service](sync-bridge-rust/README.md)** (`sync-bridge-rust`): <!-- cov:rust -->![Coverage](https://img.shields.io/badge/Coverage-pending-lightgrey)<!-- cov:rust-end --> High-performance synchronization service built using Axum, SQLx (SQLite), and async-graphql.
- **🦙 [Go Fiber Service](sync-bridge-go/README.md)** (`sync-bridge-go`): <!-- cov:go -->![Coverage](https://img.shields.io/badge/Coverage-pending-lightgrey)<!-- cov:go-end --> High-performance synchronization service built using Go, Fiber, GraphQL, and SQLite.
- **🐍 [FastAPI Service](sync-bridge-fastapi/README.md)** (`sync-bridge-fastapi`): <!-- cov:fastapi -->![Coverage](https://img.shields.io/badge/fastapi-78%25-green)<!-- cov:fastapi-end --> High-performance API built using Python's FastAPI, SQLAlchemy (AioSQLite), and Strawberry GraphQL.
- **🎯 [C# Service](sync-bridge-csharp/README.md)** (`sync-bridge-csharp`): <!-- cov:csharp -->![Coverage](https://img.shields.io/badge/Coverage-pending-lightgrey)<!-- cov:csharp-end --> C# .NET Core implementation of the Sync Bridge API.

---

## 🛠️ Global Monorepo Development

To maintain high code quality across all services, this monorepo includes a centralized Git hooks setup and a consolidated CI pipeline.

### 1. Git Pre-Commit Hooks

We use a unified pre-commit hook that dynamically detects staged changes and runs linting, formatting, and unit/integration tests _only_ on the sub-projects affected by those changes.

On your first checkout, run the following setup script to configure your local Git workspace to use the centralized hook:

```bash
./setup-hooks.sh
```

- **Hook Location**: [.githooks/pre-commit](.githooks/pre-commit)
- **Configuration Logic**: The setup script runs `git config core.hooksPath .githooks`, which redirects Git to use our tracked hooks directory and protects your workspace from being overridden by local sub-project plugins.

### 2. Consolidated CI Pipeline

The monorepo features a single, directory-sensitive GitHub Actions workflow:

- **Workflow Location**: [.github/workflows/ci.yml](.github/workflows/ci.yml)
- **Mechanism**: Uses `dorny/paths-filter` to detect which subprojects contain committed changes. Only the jobs corresponding to changed projects will execute, keeping build times fast and keeping feedback loop tight.
