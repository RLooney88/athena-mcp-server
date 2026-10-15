# Athena MCP server

A small stdio adapter to Athena's existing HTTP API. It has no database access, workflow engine, business rules, or automatic write retries.

## Install and run

Requires Node 22+ and an Athena backend containing the API contract repair in `docs/api-mcp-contract.md`.

```sh
npm ci
npm run build
cp .env.example .env
# Set API_URL and ATHENA_API_KEY privately in .env.
node --env-file=.env dist/server.js
```

For an MCP host, configure **node** with absolute paths to `--env-file=/private/path/.env` and `/path/athena-mcp-server/dist/server.js`. Do not use `npm start` as the protocol command: npm can print lifecycle output to stdout. The node entry point emits only MCP protocol messages on stdout. Diagnostics use stderr.

The transport is stdio: the host starts one process. No separate public web server, PM2 daemon, Redis, or agent framework is needed. Remote hosts can use Athena's HTTP API directly; this package does not claim remote MCP/OAuth support.

## Credentials

- `API_URL`: backend origin, such as `https://api.example.com` (no `/api` suffix). HTTPS required outside loopback.
- `ATHENA_API_KEY`: a scoped key issued by Athena's existing Settings API-key management. Only a hash is stored there; existing revoke/rotate controls apply.
- `AUTH_TOKEN`: optional existing Athena JWT for six mobile-only compatibility tools, or JWT fallback for v1. API keys are never sent as mobile JWTs.
- `REQUEST_TIMEOUT`: milliseconds, default 30000, range 1..120000.
- Legacy `PROD_API_URL`/`TEST_API_URL` and `PROD_AUTH_TOKEN`/`TEST_AUTH_TOKEN` aliases are supported when NODE_ENV selects that environment. Prefer the single API_URL/ATHENA_API_KEY configuration.

Use the smallest required scopes: `tasks:read`, `tasks:write`, `comments:write`, `projects:read`, `clients:read`, `search:read`. Authentication and authorization are enforced by the API, not guessed by MCP. Keys are never printed by this adapter.

There is **no automatic mock mode**, including NODE_ENV=test. Tests explicitly start fixture HTTP servers or the disposable backend.

## Core v1 tools

- `athena_me`
- `athena_list_tasks`, `athena_get_task`, `athena_create_task`, `athena_update_task`
- `athena_add_comment`, `athena_get_comments`, `athena_create_deliverable`
- `athena_list_projects`, `athena_get_project`, `athena_list_project_stages`
- `athena_list_companies`, `athena_list_contacts`, `athena_search`

Tool discovery publishes the exact validated JSON schemas. Unknown fields are rejected instead of silently discarded.

### Writes and retries

Every core write requires `idempotency_key`: a caller-generated stable ID for **one intended action**. Reuse the same key and payload after a timeout. Do not generate a new key merely because the response was lost. Reusing a key with a changed payload returns 409.

`athena_update_task` also requires `expected_updated_at` copied exactly from `athena_get_task`. A stale version returns `stale_revision` (409). Read and reconcile the latest record before issuing a new intended update. MCP does not auto-fetch a newer version and overwrite it.

Task fields use the v1 contract: `title`, `project_id`, `client_id`, `stage_id`, `assignees` (UUID array), timezone-aware `due_date`, and priority `Low|Normal|High|Critical`. Status names remain backend/project-defined strings. Read project stages before setting stage_id.

Comments retain the MCP `content` argument and translate it to API `body`. Deliverables require a hosted HTTP(S) `url`; local file paths are not uploaded. Use Athena's existing upload flow separately before attaching a hosted file.

List responses retain API `data`/`meta.next_cursor`. Continue until next_cursor is null. Offset pagination is not a snapshot while records are changing.

### Existing mobile compatibility tools

The original `athena_create_subtask`, `athena_list_subtasks`, `athena_search_users`, `athena_get_categories`, `athena_approve_task`, and `athena_reject_task` remain available and explicitly labeled in discovery. They require AUTH_TOKEN because those operations do not have v1 equivalents. Subtask title is correctly translated to mobile `name`. Review actions use backend permissions; they do not invent status transitions.

These six calls **do not acquire the new v1 retry/revision guarantees**. The adapter never retries them automatically. Reconcile an uncertain write before retrying. Removing their existing capabilities or duplicating their business rules in MCP would be a larger, separate migration. Their mappings are tested; full live mobile workflows are not claimed verified by the v1 integration test.

## Compatibility changes from the old prototype

Core task/comment/deliverable tools now use `/api/v1` rather than `/api/mobile`. Replace old `assignee_id` with `assignees`, lowercase priorities with canonical priorities, flat work_for fields with project/client IDs, and task `category_id` with supported API fields only. `include_completed`/`needs_review` are not silently emulated on v1; use supported list filters. Reconnect/reload tool discovery after upgrading. Update calls need expected_updated_at and all core writes need idempotency_key. Fake-data runtime files and obsolete mock tests were removed.

## Verification

```sh
npm test
```

This builds TypeScript and checks validation, configuration, request mapping, HTTP errors and a real SDK stdio handshake/tool call against a fixture HTTP server. The official [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk/tree/v1.x) is pinned in the lockfile; the maintained 1.x API avoids an unrelated protocol migration.

For **MCP → real Athena routes → PostgreSQL** acceptance, follow `Athena-Context/docs/api-mcp-contract.md`. That suite runs discovery, concurrent create/retry, read-back, update/retry, stale rejection, cross-team rejection, pagination, comments and deliverables. It uses a disposable loopback PostgreSQL database and does not call providers.
