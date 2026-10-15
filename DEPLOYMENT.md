# Deployment and rollback

1. Deploy the compatible Athena API revision first, after its additive migration and staging checks. See `Athena-Context/docs/api-mcp-contract.md`.
2. Pin this MCP checkout to the reviewed commit. Run `npm ci && npm test`; do not use floating global dependencies.
3. Configure API_URL and a least-privilege ATHENA_API_KEY through the MCP host's private environment. Configure AUTH_TOKEN only if mobile compatibility tools are needed.
4. Configure the host to launch `node /absolute/path/dist/server.js` (optionally `--env-file=/private/path/.env` before the script). Do not daemonize a stdio process or use npm lifecycle output as protocol data.
5. Reload tools. Verify athena_me, a bounded task read, and fixture-only create/update/read-back on staging. Verify write retries and stale-version conflicts before client work.
6. Keep the prior pinned MCP/API revisions. Roll back both sides together if clients cannot yet supply the new write metadata; do not blindly replay uncertain writes. The API migration is additive, so retaining its metadata tables supports rollback.

No production deployment is performed by this repository's test or build commands. A local integration pass is not proof of deployed-schema readiness. No payment, email or other provider side effect is required for the acceptance suite.
