# Prisma runtime compatibility

Status: verified for the exact Prisma 6.14 configurations below under spec 026.

The probe observes client operations, not SQL statements. Model/raw operations,
including rejected operations, produce model/action/timing metadata; transaction
control statements and nested SQL are not separate observed client operations.
SQL, arguments, results and credentials are never recorded by this collector.

| Version / generator / loading | Verified evidence | Coverage |
| --- | --- | --- |
| Prisma 6.14.0 / `prisma-client-js` / CJS `require("@prisma/client")` | Real SQLite regression with native baseline: 11 operations, 9 in one request; native `$on` delivery, subclass private fields/lifecycle, app extensions, lazy batch/interactive transactions, rejection, rollback and cleanup | Verified |
| Prisma 6.14.0 / `prisma-client-js` / ESM named import from `@prisma/client` | Same real runtime regression and native baseline on Node 22.13.1 | Verified |
| Legacy clients exposing `$use` | Existing synthetic middleware/unsupported/inert tests | Legacy fallback retained; no universal Prisma 5/6 version claim |
| Prisma 7.0.0 / standard `prisma-client` / generated CJS configuration compiled with tsup / SQLite adapter 7.0.0 | Real model queries succeeded; exported class loaded outside existing interception targets | Unsupported; separate draft spec 027 |
| Prisma 7 native ESM, other generator/output/bundler/version combinations | No production-hook compatibility proof | Unverified; do not infer support |

The active collector prints its loading boundary on stderr. A client without a
supported API also produces a collector notice; HTTP and other collectors continue.
`dbQueries: 0` on an unsupported loading route does not prove no database operations
occurred. Custom generated output paths are outside the current interception surface.

Reproduce the evidence using [the isolated compatibility harness](../tests/compat/README.md).
Real-client regression is `pnpm test:prisma` after pinned installation/generation;
CI runs it explicitly. It fails if tooling is missing instead of silently skipping.
The recorded local evidence uses Node 22.13.1 on macOS arm64. The Linux CI job has
been configured but has not been run remotely as part of this local change.

The live CLI command `backend-doctor probe --out <temporary-directory> -- node
tests/compat/prisma6/app.cjs` also passed with a disposable database and an N+1
threshold of 4: 11 query events, 9 attributed to `GET /proof`, HTTP 200, and one
possible-N+1 warning. This proves the command/session path as well as the hook.
The fixture requires `PRISMA_PROOF_DB=file:<temporary-db>` and the warning test
uses `BACKEND_DOCTOR_PROBE_N1_THRESHOLD=4`; it creates its own table in a fresh DB.
