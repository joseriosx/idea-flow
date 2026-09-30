-- 0001_boards.sql — the minimum board table.
--
-- The api serves the seeded demo board from memory and never requires this
-- table to answer a read (see src/routes/boards.ts), so a fresh database without
-- this migration is a working, if empty, state. It exists so a stored board has
-- somewhere to live once persistence is in scope.
--
-- Applied by:  docker compose -f compose.yaml -f compose.dev.yaml run --rm api npm run migrate
-- Never from the container entrypoint (infra/README.md).

CREATE TABLE IF NOT EXISTS boards (
  id          text        PRIMARY KEY,
  name        text        NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Read path sorts by recency on every request, so index it.
CREATE INDEX IF NOT EXISTS boards_updated_at_idx ON boards (updated_at DESC);