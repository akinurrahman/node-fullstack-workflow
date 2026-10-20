---
name: backend-architecture-nestjs
description: Module architecture spec for a NestJS 12 API on Prisma 7 and Postgres - folder layout and file naming per module, controller/service/repository/mapper/dto layering, who may inject and import what, AppError subclasses and the one global exception filter, the global guard chain with @Public, @Roles and @CurrentUser, transactions kept inside the repository, cross-module exports, one Prisma model file per domain, env through ConfigService, and where unit and e2e tests sit and how they are wired. Use this skill whenever creating a module under apps/api/src, adding an endpoint, a service method, a repository query, a DTO, a Prisma model or field, a role check, an env var, or changing anything in src/common, src/config or src/database. Consult it even when the request sounds routine ("add a status field", "add an endpoint for this", "let admins do X") - the conventions here are template-specific and cannot be inferred from surrounding files.
---

# Backend architecture (NestJS)

`@<scope>/shared` below means the project's shared package. Check the root
`package.json` for the actual scope (e.g. `@acme/shared`).

The architecture of `apps/api`: NestJS 12 on Express, ESM, Prisma 7 with
`@prisma/adapter-pg` on Postgres, Zod 4 through nestjs-zod, nestjs-pino,
Vitest. Every path below is relative to `apps/api/src` unless it says
otherwise; `prisma/` and `test/` sit next to `src/` in `apps/api`.

`users/` is the golden module: every new module copies its shape; `health/` is
the smallest real one. The rules below and `references/` are the whole spec;
the worked example starts at `references/example-overview.md`.

This skill is the inside of the api. It does not cover:

- What a client sees on the wire: response and error bodies, status codes,
  error code naming, field errors, pagination meta, JSON naming, how strict a
  request schema is. That is `kit:api-conventions`.
- What to test and which cases are required. That is `kit:testing-standards`.
- Commits, and the gate before reporting done: `kit:git-conventions`,
  `kit:definition-of-done`.
- Prisma CLI commands and the Prisma Client API. Those are tied to the
  installed Prisma version and live in the template's own `prisma-cli` and
  `prisma-client-api` skills under `.claude/skills/`.

## How to use this skill

1. Read the rules below. They are short and every one of them is load-bearing.
2. Open the `references/example-*.md` files matching what you are building.
   Adding a repository query? Read `references/example-repository.md`.
   Building a whole module? Read all of them, starting with
   `references/example-overview.md`.
3. Build only what the request asks for, following the build order at the end.
4. Run the architecture checks, right after the rules, before reporting
   complete.

### Which reference to read

Each file holds the detail for one area. Read it before you start there.

| File                               | Read it when                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| `references/example-overview.md`   | you build a whole module. Folder tree, build order, what was deliberately not built |
| `references/example-shared.md`     | build step 1: schemas, types and error codes in `@<scope>/shared`                   |
| `references/example-prisma.md`     | build step 2: the model file                                                        |
| `references/example-repository.md` | build step 3: the repository, its data interfaces and its transaction               |
| `references/example-service.md`    | build steps 4 and 5: the mapper and the service                                     |
| `references/example-controller.md` | build steps 7 to 9: DTOs, controller, module and `app.module.ts`                    |
| `references/example-tests.md`      | build steps 6 and 10: the unit spec and the e2e spec wiring                         |
| `references/errors.md`             | you throw an error, or change `common/errors` or the exception filter               |
| `references/auth-guards.md`        | you decide who may call an endpoint, or touch a guard or `auth.decorators.ts`       |
| `references/repositories.md`       | you write a repository method, a list query or a transaction                        |
| `references/dtos.md`               | you add a DTO, a request or response schema, or document an endpoint                |
| `references/module-wiring.md`      | you create a module, export a provider, or read config                              |
| `references/prisma-models.md`      | you add a model, a field, an enum or a relation                                     |
| `references/tests.md`              | you write a unit spec or an e2e spec                                                |
| `references/common-map.md`         | you need something that may already exist in `common/`, `config/` or `database/`    |

**If something you need is not covered here**, copy the nearest existing
module in the repo (`users/` first, `health/` for the minimal shape) rather
than inventing new structure, and say in your summary which one you copied
and why. Do not add a new top-level folder under `src/`. When the code and
this skill disagree, follow the skill for new code, flag the mismatch, and do
not fix the old code unless asked.

## Output style and scope

No em dashes anywhere you write: code comments, error messages, Swagger
descriptions, commit messages, or the summary you report back. Use a hyphen,
a comma, or rewrite the sentence. Code follows the repo's root Prettier
config (`pnpm format` from the root).

Build what was asked and stop. Do not refactor neighbouring code, do not
rename things you were not asked about, do not create files for work that has
not been requested yet. If you spot something worth changing outside the
request, mention it in your summary instead of doing it.

A request to add one field touches the model file, its migration, the shared
schema, the repository data interface, the mapper and the service method that
writes it. Nothing else.

## Two kinds of rule

**Structural. Always, from the first line of code.** Skipping one produces a
bug, not just an untidy file: the numbered rules below.

**Earn it. Needs a trigger before it exists.** Build the simple form first.

| Thing                                        | Trigger                                                                                  |
| -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `repository.transaction()` and its interface | a rule reads then writes, must hold when two requests race, and no unique index holds it |
| A lock method (`SELECT ... FOR UPDATE`)      | a rule counts rows that a concurrent request could change                                |
| `<module>-me.controller.ts`                  | the caller gets routes on their own record                                               |
| A module-level error factory                 | the same error is thrown from a second place                                             |
| An `exports` entry                           | another module injects the provider (rule 9)                                             |

An abstraction with one caller and no second caller in sight is not an
abstraction. It is indirection.

## The rules that actually matter

**1. Only repositories inject `PrismaService`.**
Services, controllers, guards and helpers never take `PrismaService` and never
call the Prisma client. `PrismaModule` is `@Global()`, so nothing stops the
injection at compile time: hold it by hand. A query in a service cannot be
stubbed in a unit test, and the next caller that needs the same filter copies
it.

A service may `import type` a Prisma model
(`import type { Project } from '../generated/prisma/client.js'`) to type a
row it holds. A type import is not a dependency on the client. The row still
never leaves through a controller (rule 4).

**2. Rules in the service, plumbing in the repository, nothing in the controller.**

- The controller declares the route and its decorators, pulls params, body,
  query and `@CurrentUser()`, makes one service call and returns its result.
  No `if`, no `try`, no mapping.
- The service owns every rule: existence, conflicts, what the caller may not
  do to themselves, state transitions, which writes happen together. It is
  the only layer that throws domain errors.
- The repository reads and writes, typed in and typed out. It may normalize
  what it stores so every caller writes the same spelling (users lower-cases
  email), escape `LIKE` input, and turn page and limit into `skip` and
  `take`. It never decides whether a write is allowed and never throws an
  `AppError`.

The service hands the repository a data object built field by field, never
the request input as is:
`this.projects.create({ name: input.name, ownerId: actor.id })`. Input passed
whole lets a field added to the shared schema reach the database unreviewed.
Update follows create: `{ ...(input.name !== undefined && { name: input.name }) }`.

**3. Services throw `AppError` subclasses. Only the filter maps them.**
`throw new NotFoundError(PROJECT_ERROR_CODES.PROJECT_NOT_FOUND, 'Project not found')`.
The subclasses live in `common/errors`. Never throw `HttpException` or a Nest
built-in like `NotFoundException`: the filter treats those as framework
errors and replaces their message. Never catch an error in a controller to
translate it, and never touch `res`.

Codes come from a `<DOMAIN>_ERROR_CODES` object in `@<scope>/shared`, so the
web can branch on them. An error thrown from two places becomes a
module-level factory at the top of the service (`const projectNotFound = () => ...`).
Thrown once, it stays inline.

Check conflicts yourself, before the write. The filter answers a Prisma
P2002 with a generic 409 and P2025 with a generic 404, but that is a safety
net for races, not a substitute for the check. Wrap a lower-level failure
with `{ cause }`; the cause is logged for a 5xx and never sent.
`common/errors` imports nothing from Nest. What the filter does with each kind
of error is in `references/errors.md`.

**4. A Prisma row never leaves the service. A mapper lists the fields.**
Each module that returns its entity has `<module>.mapper.ts` with a
`toPublic<Entity>(row)` function that copies the public fields one by one and
turns each `Date` into an ISO string. Never spread the row: a column added
later, or a password hash, reaches a response by accident. Repositories
return rows, services call the mapper, controllers return what the service
returns, typed with the shared response type.

**5. Controllers return plain values. The interceptor wraps them.**
Return the mapped object, an array, nothing for an empty response, or the
`PaginatedResult` from `paginate()`. `ResponseInterceptor` builds the body:
never write `{ data }` by hand. What the body looks like is
`kit:api-conventions`.

A list: the repository returns `{ items, total }` from one
`$transaction([findMany, count])`, the service maps the items and returns
`paginate(items, total, query)`. `paginate` is the only place pagination math
happens.

**6. A DTO is a shared schema plus one line.**
Request and response schemas live in `@<scope>/shared`, where the web uses
them too. The api's `<module>.dto.ts` holds only lines like
`export class CreateProjectDto extends createZodDto(createProjectSchema) {}`.
The global `ZodValidationPipe` validates every `@Body()`, `@Query()` and
`@Param()` typed with a DTO: no validation code in the api, no
class-validator, no pipe per route.

A list query schema extends `paginationQuerySchema` with its filters. Service
methods take the shared inferred types (`CreateProjectInput`), never the DTO
classes.

Every endpoint carries its Swagger response decorators. Which ones, and how,
is in `references/dtos.md`.

**7. Every route needs a token unless it says otherwise.**
Three global guards run in order: `ThrottlerGuard`, `AuthGuard` (deny by
default), `RolesGuard`. Only the health probes skip the throttler, with
`@SkipThrottle()`; ordinary endpoints never do. Who may call an endpoint is
said with decorators only:

- Nothing: any signed-in user, checked from the token alone.
- `@Public()`: no token. Probes and login.
- `@Roles('ADMIN')`: a signed-in user who, per the database right now, is
  active, holds the role and has a live session.

Put `@Roles()` on the controller class when every route shares it, so a route
added later inherits it. Put it on the method when access differs per route.
Never `@UseGuards()` for authentication, and never an `if` on `actor.role` in
a service to gate an endpoint.

The caller is `@CurrentUser() actor: AuthUser`. Never `@Req()` and
`req.user`. Pass `actor` into the service only when a rule depends on who
acts.

Routes on the caller's own record (`/users/me`) live in
`<module>-me.controller.ts` and are listed first in the module's
`controllers`: Express matches in registration order, so `/:id` would
otherwise take `me`. Detail in `references/auth-guards.md`.

**8. Transactions stay inside the repository.**
When a rule reads, then writes, and must hold when two requests race, the
service calls `this.users.transaction(async (tx) => { ... })`. The
repository declares a `<Entities>Transaction` interface listing only what a
service may run inside it, backed by module-level functions that take a
`Prisma.TransactionClient` and are shared with the repository's plain
methods. The service never sees `$transaction` or a Prisma client. A single
write needs no transaction, and neither does a check a unique index already
holds. Detail in `references/repositories.md`.

**9. Other modules use your exported service.**
By default a module exports its service, and a module that needs it imports
the module and injects the service. Export the repository only when the
caller needs data the service hides on purpose: auth needs `passwordHash`,
which `toPublicUser` drops. Every `exports` entry carries a comment saying
who uses it and why. A module nobody else uses exports nothing.

Two modules that would import each other: move the provider they share into
its own small module (`PasswordModule`), rather than `forwardRef`. Type-only
imports across modules (`AuthUser`) need no export.

**10. ESM, relative paths, `.js` on every relative import.**
`import { ProjectsService } from './projects.service.js'`, type imports
included. There is no path alias in the api. The Prisma client comes from
`../generated/prisma/client.js`, generated, gitignored and never edited.
`@<scope>/shared` is imported from the package root only, never a deep path.

**11. One Prisma file per domain.**
A new model goes in `prisma/models/<domain>.prisma`; `prisma/schema.prisma`
holds only the generator and the datasource. Fields are camelCase mapped to
snake_case with `@map`, the model is mapped to a plural snake_case table with
`@@map`. Ids are `@id @default(uuid(7)) @db.Uuid`, foreign keys are
`@db.Uuid` with an `@@index`, dates are `@db.Timestamptz(3)`. A model change
lands with its migration in the same change. Detail in
`references/prisma-models.md`.

**12. Config through `ConfigService`, validated at startup.**
Read env with `ConfigService<Env, true>` and `config.get('KEY', { infer: true })`,
never `process.env`. A new variable goes in `config/env.schema.ts` and
`apps/api/.env.example` in the same change. Invalid env stops the app at boot.

**13. Unit specs sit next to the code, e2e specs in `test/`.**
`<module>.service.spec.ts` next to the service, with the repository stubbed by
a plain object: no Nest testing module, no database. E2E specs are
`test/<module>.e2e-spec.ts`, booting the real `AppModule` through
`createApp()` from `test/auth-helpers.ts`, which runs the same
`configureApp` as `main.ts`. A route that does not exist yet goes in through
`createApp({ controllers: [...] })`. Wiring in `references/tests.md`; what to
test is `kit:testing-standards`.

## Architecture checks

Run these before reporting complete. The general gate (typecheck, lint,
tests, format) is `kit:definition-of-done`.

1. No `PrismaService` outside a `*.repository.ts` (and `database/`)
2. Outside repositories, `database/`, `common/filters` and `config/`, imports
   from `generated/prisma` are `import type` only
3. Every repository write gets a data object built field by field, not the
   request input
4. No `HttpException` or Nest built-in exception thrown from module code
5. Every response goes through a mapper: no row spread, no `{ data }` by hand
6. Every DTO is one `createZodDto` line over a shared schema
7. Every endpoint has its response and error decorators
8. Access said by `@Public()`, `@Roles()` or nothing; no role `if` in a service
9. Every `exports` entry has a comment saying who and why
10. `.js` on every relative import
11. A new model in its own `prisma/models/<domain>.prisma` with its migration;
    new env vars in `env.schema.ts` and `.env.example`
12. No file created that the request did not need

## Import direction

Arrows point at what a file may import:

```
controller -> service -> repository -> database/prisma.service
    |            |   \-> mapper
    v            v
   dto      common/errors, common/pagination, another module's exported service
```

- A controller imports its DTOs, its service, `auth/auth.decorators.js`,
  `common/swagger` and shared types. Never a repository.
- A service imports its repository, its mapper, `common/errors`,
  `common/pagination`, exported providers of other modules, shared types.
- A repository imports `PrismaService`, `generated/prisma` types and shared
  types. Never a service, never `common/errors`.
- `common/`, `config/` and `database/` import nothing from a domain module.
- Nothing imports a controller.

## Comments

Default is zero comments. The template's code comments the why, never the
what: a comment earns its line when a line looks wrong and is not, when a
value comes from outside the file, or when an ordering or concurrency
constraint is not visible in the code.

- `// Order matters: /users/me before /users/:id.` earns its place.
  `// get the user` above `findById` does not.
- A comment above an `exports` entry saying who uses it is required (rule 9).
- A class-level comment on a service states the rules it owns when they are
  not obvious from the method names.
- No file banners, no section dividers, no commented-out code, no TODO
  placeholders, no `@param` lists restating types.

## Folder contract

The unit is the **module**: one folder per domain, flat, no subfolders.

```
src/<module>/
├── <module>.module.ts            controllers, providers, exports
├── <module>.controller.ts        routes, decorators, one service call each
├── <module>-me.controller.ts     only when the caller has routes on their own record
├── <module>.service.ts           rules and errors
├── <module>.service.spec.ts      unit spec, repository stubbed
├── <module>.repository.ts        Prisma reads and writes, data interfaces
├── <module>.mapper.ts            row to public shape
└── <module>.dto.ts               createZodDto classes
```

The file prefix is the module name, plural: `users.service.ts`,
`users.repository.ts`. Not every module needs every file: `health/` has no
mapper and no `-me` controller, because it returns no entity and has no
caller-owned record. Never create an empty file.

## What goes in which file

| File                     | Owns                                                              | Never contains                                     |
| ------------------------ | ----------------------------------------------------------------- | -------------------------------------------------- |
| `*.controller.ts`        | routes, access and Swagger decorators, one service call per route | logic, `PrismaService`, mapping, `{ data }`        |
| `*.service.ts`           | rules, errors, transactions through the repository, `paginate()`  | `PrismaService`, Prisma client calls, HTTP objects |
| `*.repository.ts`        | Prisma calls, data and filter interfaces, the transaction wrapper | rules, `AppError`, mapping to public shapes        |
| `*.mapper.ts`            | `toPublic<Entity>(row)`, field by field                           | spreads, queries                                   |
| `*.dto.ts`               | `createZodDto` classes                                            | schemas, validation logic                          |
| `*.module.ts`            | `imports`, `controllers`, `providers`, commented `exports`        | anything else                                      |
| `prisma/models/*.prisma` | one domain's models and enums                                     | the generator or datasource                        |

## Naming

- Files: `<module>.<role>.ts`, module name plural and kebab-case.
- Classes: `ProjectsModule`, `ProjectsController`, `ProjectsService`,
  `ProjectsRepository`. The `-me` controller is `ProjectsMeController`.
- Injected names: the domain, plural. `private readonly projects: ProjectsRepository`
  in the service, `private readonly projects: ProjectsService` in the
  controller.
- Mapper: `toPublic<Entity>`, singular.
- DTOs: `Create<Entity>Dto`, `Update<Entity>Dto`, `<Entity>IdParamDto`,
  `List<Entities>QueryDto`, `Public<Entity>Dto`.
- Repository types: `Create<Entity>Data`, `Update<Entity>Data`,
  `List<Entities>Filter`, `<Entities>Transaction`.
- Error codes: `<DOMAIN>_ERROR_CODES` in `@<scope>/shared`.
- Prisma: model PascalCase singular (`Project`), table snake_case plural
  (`@@map("projects")`), model file singular (`prisma/models/project.prisma`).

## Source tree

```
apps/api/
├── prisma/
│   ├── schema.prisma     generator and datasource only
│   ├── models/           one <domain>.prisma per domain
│   └── migrations/
├── src/
│   ├── main.ts           bootstrap, then configureApp
│   ├── app.module.ts     global guards, pipe, filter, interceptor; module list
│   ├── common/           errors, filter, interceptor, pagination, swagger decorators,
│   │                     middleware, reporting
│   ├── config/           env schema, configureApp, http, swagger, logger, throttler
│   ├── database/         PrismaModule (global), PrismaService
│   ├── auth/             guards, decorators, tokens, sessions, passwords
│   ├── <module>/         one folder per domain
│   └── generated/        Prisma client, gitignored
└── test/                 *.e2e-spec.ts, createApp and test database helpers
```

## Build order

One module end to end. For each, skipping anything the request does not need:

1. Schemas, types and `<DOMAIN>_ERROR_CODES` in `@<scope>/shared`, exported
   from its `index.ts`.
2. `prisma/models/<domain>.prisma`, then the migration through the template's
   migration procedure (`CLAUDE.md` and the `prisma-cli` skill).
3. `<module>.repository.ts`: data interfaces, methods, the transaction only if
   a rule needs it.
4. `<module>.mapper.ts`.
5. `<module>.service.ts`.
6. `<module>.service.spec.ts`.
7. `<module>.dto.ts`.
8. `<module>.controller.ts`.
9. `<module>.module.ts`, then add it to `imports` in `app.module.ts`.
10. `test/<module>.e2e-spec.ts`. Then run the architecture checks.
