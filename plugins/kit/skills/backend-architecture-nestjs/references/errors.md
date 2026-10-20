# Errors

Detail for rule 3 in `SKILL.md`. Paths are relative to `apps/api/src`. What
the error body looks like on the wire is `kit:api-conventions`.

## The classes

`common/errors/app-error.ts` holds `AppError(statusCode, code, message, errors?, options?)`.
`common/errors/http-errors.ts` holds one subclass per status the api throws
on purpose:

| Class                     | Status |
| ------------------------- | ------ |
| `BadRequestError`         | 400    |
| `UnauthorizedError`       | 401    |
| `ForbiddenError`          | 403    |
| `NotFoundError`           | 404    |
| `ConflictError`           | 409    |
| `TooManyRequestsError`    | 429    |
| `ServiceUnavailableError` | 503    |

Every subclass takes `(code?, message?, { errors?, cause? }?)`, with a
generic code from `ERROR_CODES` and a generic message as defaults. Module code
passes its own code and message, and keeps the defaults only when the generic
answer is the right one (health's 503). `errors` are field errors and are
sent; `cause` is standard `ErrorOptions`, logged for a 5xx and never sent.
Import them from `common/errors/index.js`.

Missing a status? Add a subclass in `http-errors.ts` and an entry in the
filter's `DEFAULT_ERRORS`. Never `new AppError(...)` from module code.

## Where they get mapped

`AllExceptionsFilter` (`common/filters/all-exceptions.filter.ts`) is the only
`APP_FILTER`, registered in `app.module.ts`. `toErrorResponse` decides the
body, in this order:

1. `AppError`: its status, code, message and `errors`, as thrown.
2. `ZodValidationException` from the global pipe: a 400 with one field error
   per issue. Checked before `HttpException`, which it extends.
3. `Prisma.PrismaClientKnownRequestError`: a NUL byte (SQLSTATE 22021) is a
   400, P2002 a generic 409, P2025 a generic 404, anything else a 500.
4. Any other `HttpException`, from Nest or a library: its status with a
   generic code and message. The library's own message is never passed
   through, which is why module code never throws one.
5. An Express middleware error with `expose: true` and a 4xx `status`: that
   status, generic body.
6. Anything else: 500.

A status of 500 or more is logged through the request's pino logger, with
the error under `err`, and passed to `reportError` in
`common/reporting/report-error.ts`, the one hook for error monitoring. The
filter does not log a 4xx.

## Where to throw

Services. A guard or a param decorator may throw `UnauthorizedError` or
`ForbiddenError` (`auth.guard.ts`, `roles.guard.ts`, `CurrentUser`).
Repositories, mappers and controllers do not throw.

Code that runs outside Nest's request pipeline (a plain Express handler
mounted in `config/`) cannot reach the filter: it builds its body with
`toErrorResponse(new NotFoundError())`, as `config/app.config.ts` does.

## Wrapping a failure

```ts
try {
  await withTimeout(this.repository.ping(), DATABASE_PING_TIMEOUT_MS);
} catch (cause) {
  throw new ServiceUnavailableError(undefined, undefined, { cause });
}
```

`health.service.ts`. The client gets the generic 503; the log gets the cause.
