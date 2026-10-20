# Example: overview

The `projects` example module as a whole: what it does, its files, what was
deliberately not built, and the build order.

A project has a name (unique), a status (`ACTIVE` or `ARCHIVED`) and an
owner, the user who created it. Any signed-in user lists and reads projects
and creates one. Only an admin renames or archives. Paths are relative to
`apps/api` unless they start with `packages/`.

**Structure and imports are exact. Bodies are complete enough to copy.** The
reasoning sits in prose between the code blocks, not inside them. It is
adapted from `users/`, the golden module: when this example and `users/`
differ on something not covered here, `users/` wins.

```
packages/shared/src/
└── projects.ts                     schemas, types, PROJECT_ERROR_CODES
apps/api/
├── prisma/models/
│   ├── project.prisma              Project, ProjectStatus
│   └── user.prisma                 + the back-relation
├── src/
│   ├── app.module.ts               + ProjectsModule
│   └── projects/
│       ├── projects.module.ts
│       ├── projects.controller.ts
│       ├── projects.service.ts
│       ├── projects.service.spec.ts
│       ├── projects.repository.ts
│       ├── projects.mapper.ts
│       └── projects.dto.ts
└── test/
    └── projects.e2e-spec.ts
```

Each layer has its own file:

- `example-shared.md`: the shared schemas, types and error codes
- `example-prisma.md`: the model file
- `example-repository.md`: the repository and its transaction
- `example-service.md`: the mapper and the service
- `example-controller.md`: DTOs, controller, module, `app.module.ts`
- `example-tests.md`: the unit spec and the e2e spec wiring

---

## What was deliberately not built

| Not built                                    | Build it when                                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `projects-me.controller.ts`                  | the caller gets routes on their own record ("my projects")                                             |
| `exports` in `ProjectsModule`                | another module injects `ProjectsService`. The repository only for data the service hides               |
| `transaction()` and `ProjectsTransaction`    | a rule only a lock can hold (users: the last active admin). The name check is held by the unique index |
| A lock method in the repository              | a rule counts rows a concurrent request could change                                                   |
| A `delete` route                             | it is asked for. Archive is the only removal the example needs                                         |
| A `ProjectsService` method per filter        | never. Filters are fields of one list query                                                            |
| A helper for the `findById` + not-found pair | a third copy. Two is a factory for the error, not a helper                                             |

## Build order

1. `packages/shared/src/projects.ts`, exported from `src/index.ts`
2. `prisma/models/project.prisma`, the back-relation on `User`, the migration
3. `projects.repository.ts`
4. `projects.mapper.ts`
5. `projects.service.ts`
6. `projects.service.spec.ts`
7. `projects.dto.ts`
8. `projects.controller.ts`
9. `projects.module.ts`, then `app.module.ts`
10. `test/projects.e2e-spec.ts`, then the architecture checks in `SKILL.md`
