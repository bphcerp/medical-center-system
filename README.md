# medical-center-system

A management system for the Medical Center in BITS Hyderabad.

## Database migrations

This project uses Drizzle Kit for migration generation and Bun for running scripts.

### Migration scripts

- `bun run db:generate`: Generate SQL migrations from schema changes in `src/db`.
- `bun run db:migrate`: Apply migrations from the `drizzle` folder to the configured database.
- `bun run db:studio`: Open Drizzle Studio.

### Docker profile helpers

- `bun run db:migrate:dev`: Start only the database using Docker Compose `dev` profile and run migrations from the host (`DB_HOST=localhost`).
- `bun run db:migrate:prod`: Start only the database using Docker Compose `prod` profile and run migrations from the host (`DB_HOST=localhost`).

You can also start the DB explicitly:

- `bun run docker:db:up:dev`
- `bun run docker:db:up:prod`

Typical flow after schema changes:

1. `bun run db:generate`
2. `bun run db:migrate:dev` (or `bun run db:migrate:prod`)
