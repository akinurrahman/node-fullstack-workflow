# Module wiring

Detail for rules 9 and 12 in `SKILL.md`. Paths are relative to
`apps/api/src`.

## The module file

```ts
@Module({
  imports: [PasswordModule],
  // Order matters: /users/me before /users/:id.
  controllers: [UsersMeController, UsersController],
  providers: [UsersRepository, UsersService],
  // AuthService checks the password hash at login, which UsersService
  // never returns. The seed writes the first admin through it.
  exports: [UsersRepository],
})
export class UsersModule {}
```

- `imports`: only modules whose exported providers this one injects.
  `PrismaModule` is `@Global()` and `ConfigModule` is global, so neither is
  ever imported here.
- `providers`: repository, then service.
- `exports`: what another module injects, each with a comment saying who and
  why (rule 9). Left out when nobody does.

Then add the module to `imports` in `app.module.ts`, next to the other domain
modules.

## What `app.module.ts` owns

The global wiring, once: `ConfigModule.forRoot` with `validateEnv`, the pino
logger, `ThrottlerModule`, `PrismaModule`, the domain modules, and the
providers `APP_GUARD` (throttler, auth, roles, in that order), `APP_PIPE`
(`ZodValidationPipe`), `APP_FILTER` (`AllExceptionsFilter`) and
`APP_INTERCEPTOR` (`ResponseInterceptor`). A module never registers its own
global provider, pipe, filter or interceptor.

## `main.ts` and `configureApp`

`main.ts` creates the app, swaps in the pino logger, calls `configureApp`
from `config/app.config.ts` and listens. `configureApp` is the only app setup:
HTTP middleware, the `/api` prefix, CORS, CSRF, Swagger, `app.init()`, then
the JSON 404 for unmatched paths. The e2e helper calls the same function.
Nothing registers routes or middleware after it.

A new route lands under `/api` automatically. Only the probe paths listed in
`UNPREFIXED_PATHS` (`config/http.config.ts`) are outside it.

## Breaking a cycle

`AuthModule` imports `UsersModule`. Users also needs to hash passwords, which
auth owns. Rather than have `UsersModule` import `AuthModule`, the hashing
provider moved into `auth/password.module.ts`, which both import. Do the same
when two modules need each other: extract the shared provider, never
`forwardRef`.

## Config

```ts
constructor(config: ConfigService<Env, true>) {
  const url = config.get('DATABASE_URL', { infer: true });
}
```

`Env` comes from `config/env.schema.ts`, a Zod schema that `validateEnv`
parses at startup: a missing or bad variable stops the boot with one fatal
log line. Defaults that depend on another variable are resolved in the
schema's `transform`. A new variable goes in the schema and in
`apps/api/.env.example`. A required one with no default also goes in
`apps/api/.env.test`, the only env the e2e tests read.
