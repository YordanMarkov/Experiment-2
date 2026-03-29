# MySQL Setup Notes

## Quick Start

Use these commands from the project root:

```bash
docker compose down -v
docker compose up -d
```

What this does:

- `docker compose down -v`: stops containers and removes volumes, including `my-db-data`.
- `docker compose up -d`: starts containers in detached mode.
- Because the volume is recreated, MySQL runs scripts in `./mysql-init` again, including `init.sql`.

## docker-compose.yml Explained

Main service: `database`

- Uses image `mysql:latest`.
- Container name is `my-db`.
- Restarts automatically (`restart: always`).
- Port mapping `3306:3306` exposes MySQL to your host machine.
- Volume `my-db-data:/var/lib/mysql` persists database data between restarts.
- Bind mount `./mysql-init:/docker-entrypoint-initdb.d` provides SQL files that run on first initialization.
- Environment variables:
	- `MYSQL_ROOT_PASSWORD=admin`
	- `MYSQL_DATABASE=my-db-name`

Defined volume:

- `my-db-data`: named Docker volume used for persistent MySQL storage.

## init.sql Explained

The script starts with:

```sql
USE `my-db-name`;
```

This selects the database created by Docker (`MYSQL_DATABASE`).

### Tables created

1. `pipeline_runs`
	 - Stores each user input submitted to the pipeline.
	 - Columns:
		 - `id`: auto-increment primary key
		 - `input_text`: long text input
		 - `created_at`: timestamp of creation

2. `requirements`
	 - Stores generated requirements as JSON.
	 - Columns:
		 - `id`: auto-increment primary key
		 - `content`: JSON payload
		 - `run_id`: links to the related pipeline run
		 - `created_at`: timestamp of creation

3. `srs_documents`
	 - Stores generated SRS documents.
	 - Columns:
		 - `id`: auto-increment primary key
		 - `content`: full SRS text
		 - `run_id`: links to the related pipeline run
		 - `created_at`: timestamp of creation

4. `c4_diagrams`
	 - Stores generated C4 diagram content.
	 - Columns:
		 - `id`: auto-increment primary key
		 - `diagram_type`: diagram category (for example, context/container)
		 - `content`: diagram content
		 - `run_id`: links to the related pipeline run
		 - `created_at`: timestamp of creation

## Note

`run_id` fields are currently plain integer columns and are not defined as foreign keys in `init.sql`.