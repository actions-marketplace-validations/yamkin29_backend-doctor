# Real Prisma compatibility proof (spec 026)

These private installations do not change backend-doctor's runtime dependencies.
All versions are pinned in each package and lockfile. Databases/generated output
are disposable and ignored. Queries stay on local SQLite.

## Prisma 6.14.0

From `tests/compat/prisma6`:

```sh
npm ci --no-audit --no-fund
node -e 'require("node:fs").closeSync(require("node:fs").openSync("proof.db", "a"))'
./node_modules/.bin/prisma db push --schema schema.prisma
node proof.cjs
```

The proof checks a public query extension: raw/model queries, lazy batch transactions,
interactive transaction ALS, CJS/ESM import, subclass methods/lifecycle, application
extension, rejection and disconnect. This is a design experiment, not yet evidence
that the production hook implements modern interception.

## Prisma 7.0.0

From `tests/compat/prisma7`:

```sh
npm ci --no-audit --no-fund
node -e 'require("node:fs").closeSync(require("node:fs").openSync("proof.db", "a"))'
./node_modules/.bin/prisma db push
./node_modules/.bin/prisma generate
```

From the repository root, compile the generated standard client's CJS configuration
with existing tooling (no new transpiler dependency):

```sh
node -e 'require("tsup").build({entry:["tests/compat/prisma7/generated/client/client.ts"],format:["cjs"],outDir:"tests/compat/prisma7/generated/built",config:false,external:["@prisma/client/runtime/client"],outExtension:()=>({js:".cjs"})})'
```

Then run `node proof.cjs` from the prisma7 directory so the SQLite adapter's
relative URL uses the disposable database in that directory.

Observed: real model queries succeed, but the generated client class does not pass
through the existing `@prisma/client` / `.prisma/client` interception targets. An
additional loader surface requires the user decision specified in spec 026.
