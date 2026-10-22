# End-to-end tests

These tests drive a running copy of the site (API calls and a real browser) against a throwaway
database. They run automatically on every pull request (`.github/workflows/ci.yml`), and you can run
them on your own computer:

1. A MariaDB/MySQL database built like a deploy builds it: `schema.sql`, `schema-admin.sql`, then every
   `schema-migrations/*.sql` listed in `scripts/hostinger-deploy-remote.sh`, in that order.
2. `npm run build`, then start the site against that database: `npx next start -p 3100`.
3. `npm run test:e2e` (all files) or `node tests/run.js password email` (only files whose name contains a word).

Settings (environment variables, all optional):

| Variable | Meaning | Default |
| --- | --- | --- |
| `TEST_BASE_URL` | the site under test | `http://localhost:3100` |
| `TEST_DB_NAME`, `TEST_DB_USER`, `TEST_DB_PASSWORD`, `TEST_DB_HOST` | the database the site uses (the `mysql` command line must be installed) | `theuniqueexpo_test`, `root`, empty, local socket |
| `TEST_DB_SOCKET` | database socket, for the few tests that connect directly | TCP to `127.0.0.1` |
| `CHROMIUM_PATH` | an installed Chromium, instead of the one Playwright installs (`npx playwright install chromium`) | Playwright's own |
| `SHOTS_DIR` | where screenshots are saved | a folder in the system temp directory |
| `RESTART_CMD` | a command that restarts the site, for the "survives a restart" checks in `rate-limit` | not set: those checks run without a restart |

Every test creates its own accounts (`helpers/common.js`) and does not depend on existing data, so the
tests can be run in any order and more than once. `helpers/fake-smtp.js` is a tiny mail server the e-mail
tests send through.
