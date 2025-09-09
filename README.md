# Sync Bridge

This is a Node.js exporter service built with TypeScript and Express.js. It provides a RESTful API for exporting data from one source (DB, ERP) to another (Destination DB).

## Table of Contents

- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Usage](#usage)
  - [Development](#development)
  - [Production](#production)
- [Database](#database)
- [Testing](#testing)
- [API Documentation](#api-documentation)
- [Linting and Formatting](#linting-and-formatting)
- [Docker](#docker)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20.18.1 or higher)
- [npm](https://www.npmjs.com/)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/gedeoni/sync-bridge.git
   ```
2. Navigate to the project directory:
   ```bash
   cd sync-bridge
   ```
3. Install the dependencies:
   ```bash
   npm install
   ```
4. Create a `.env` file in the root of the project and add the necessary environment variables. You can use `.env.example` as a template.

## Usage

### Development

To run the application in development mode with hot-reloading, use the following command:

```bash
npm run dev
```

The server will be available at `http://localhost:3000` (or the port specified in your `.env` file).

### Production

To build and run the application in production mode, use the following commands:

```bash
npm run build
npm start
```

## Sync History

This service keeps a history of all sync requests. You can view the sync history and retry failed syncs using the following API endpoints:

-   `GET /api/sync-history`: Get a list of all sync history records.
    -   Query parameters:
        -   `page`: The page number for pagination.
        -   `size`: The number of items per page.
        -   `status`: Filter by sync status (`successful`, `failed`, `invalid`, `pending_retry`).
-   `GET /api/sync-history/:id`: Get the details of a specific sync history record.
-   `POST /api/sync-history/retry/:id`: Retry a failed sync request.
-   `DELETE /api/sync-history/:id`: Delete a sync history record.

## Statistics

To get statistics about the sync requests, you can use the following endpoint:

-   `GET /api/sync/stats`: Get a summary of sync requests, including the total number of requests and the number of successful, failed, and invalid requests.

## Database

This project uses Sequelize as an ORM. The database configuration is located in `src/databases/config/config.json`.

### Migrations

The following commands are available for running database migrations:

- `npm run db:migrate`: Run all pending migrations.
- `npm run db:migrate:undo`: Revert the last migration.
- `npm run db:migrate:undo:all`: Revert all migrations.
- `npm run db:migrate:status`: Check the status of all migrations.

### Sync

To synchronize the database with the models, use the following command:

```bash
npm run db:sync
```

To drop all tables, use the following command:

```bash
npm run db:drop
```

## Testing

To run the tests, use the following command:

```bash
npm run test
```

## API Documentation

This project uses Swagger for API documentation. When the server is running in development mode, the documentation is available at `http://localhost:3000/api-docs`.

## Linting and Formatting

This project uses ESLint and Prettier for code linting and formatting. The following commands are available:

- `npm run lint`: Run the linter.
- `npm run lint:fix`: Run the linter and automatically fix issues.
- `npm run format`: Format the code with Prettier.

A pre-commit hook is set up with Husky and lint-staged to automatically lint and format the code before each commit.

## Docker

To build and run the application with Docker, use the following commands:

1. Build the Docker image:
   ```bash
   docker build -t sync-bridge .
   ```
2. Run the Docker container:
   ```bash
   docker run -p 3000:3000 sync-bridge
   ```
