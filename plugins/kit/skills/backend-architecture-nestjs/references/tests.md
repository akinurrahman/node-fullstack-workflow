# Test wiring

Detail for rule 13 in `SKILL.md`. Paths are relative to `apps/api`. Which
cases to write is `kit:testing-standards`; this file is where tests sit and
how they are wired.

## Two runners

| Config                 | Picks up           | Run with   |
| ---------------------- | ------------------ | ---------- |
| `vitest.config.ts`     | `**/*.spec.ts`     | `test`     |
| `vitest.config.e2e.ts` | `**/*.e2e-spec.ts` | `test:e2e` |

Both use Vitest globals (`describe`, `it`, `expect`, `vi` without imports)
and set `LOG_LEVEL=silent`.

## Unit specs

`src/<module>/<module>.service.spec.ts`, next to the service. No database, no
Nest testing module. Construct the service directly with stubs:

```ts
function setup(users: User[], activeAdminIds: string[]) {
  const tx = {
    findById: vi.fn((id: string) =>
      Promise.resolve(users.find((u) => u.id === id) ?? null),
    ),
    // ...one vi.fn per method of the interface
    lockActiveAdminIds: vi.fn(() => Promise.resolve(activeAdminIds)),
  } satisfies UsersTransaction;
  const repository = {
    ...tx,
    transaction: <T>(run: (t: UsersTransaction) => Promise<T>) => run(tx),
  };
  const passwords = { hash: () => Promise.resolve('NEW-HASH') };
  const service = new UsersService(
    repository as unknown as UsersRepository,
    passwords as unknown as PasswordService,
  );
  return { service, tx };
}
```

Every constructor dependency gets a stub with only the methods the service
calls. `satisfies` the transaction interface keeps the stub honest when the
interface changes; a repository without a transaction is a plain object of
`vi.fn`s. Fixture rows are typed with the Prisma model type, imported
with `import type`. Assert on the thrown error's `statusCode` and `code` with
`rejects.toMatchObject`. Something that needs a real database (a lock, a
unique index) is covered by the e2e spec instead, and the unit spec says so
in one comment.

## E2E specs

`test/<module>.e2e-spec.ts`. One file per module, plus cross-cutting files
(`guards`, `errors`, `response`).

- `test/global-setup.ts` reads `apps/api/.env.test`, creates the test
  database if needed and runs the migrations, once per run.
- `test/setup-file.ts` puts that env in `process.env` and truncates every app
  table before each file. Files share one database, so the config sets
  `fileParallelism: false`.
- `test/test-db.ts` refuses any database whose name does not end in `_test`.

In the spec:

```ts
beforeEach(async () => {
  await truncateAppTables(readTestDatabaseUrl());
  ({ app, prisma } = await createApp());
});

afterEach(async () => {
  await app.close();
  vi.unstubAllEnvs();
});
```

`createApp()` from `test/auth-helpers.ts` resets modules, applies any `env`
overrides, compiles the real `AppModule` and runs `configureApp`, so the
spec sees production's middleware and guards. It returns the app and its
`PrismaService`. `createApp({ controllers: [TestController] })` mounts a
test-only controller for a route the app does not have yet
(`test/guards.e2e-spec.ts`).

Arrange data with `createUser(prisma, { role })` and sign in with
`loginCookie(app, email)` from the same helper file. The spec uses `prisma`
directly to arrange and inspect rows; module code never does.
