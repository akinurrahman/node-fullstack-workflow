# Example: api cases for `projects`

The `projects` routes of `kit:api-conventions` (`references/example-overview.md`
there), as the `it` titles their specs need. The request and response pairs
are in that skill; the wiring is in `kit:backend-architecture-nestjs`. This
file is only the list.

| Method   | Path                        | Access    | Success        |
| -------- | --------------------------- | --------- | -------------- |
| `GET`    | `/api/projects`             | signed in | 200 paginated  |
| `GET`    | `/api/projects/:id`         | signed in | 200 `{ data }` |
| `POST`   | `/api/projects`             | signed in | 201 `{ data }` |
| `PATCH`  | `/api/projects/:id`         | admin     | 200 `{ data }` |
| `POST`   | `/api/projects/:id/archive` | admin     | 200 `{ data }` |
| `DELETE` | `/api/projects/:id`         | admin     | 204            |

## Matrices

One `describe.each` per block. The id blocks sign in as an admin and send a
valid body, so the id is the only thing wrong.

| Route                            | No token | USER token  | `not-a-uuid` | Unknown UUID            |
| -------------------------------- | -------- | ----------- | ------------ | ----------------------- |
| `GET /api/projects`              | 401      | (signed in) | -            | -                       |
| `GET /api/projects/:id`          | 401      | (signed in) | 400 on `id`  | 404 `PROJECT_NOT_FOUND` |
| `POST /api/projects`             | 401      | (signed in) | -            | -                       |
| `PATCH /api/projects/:id`        | 401      | 403         | 400 on `id`  | 404 `PROJECT_NOT_FOUND` |
| `POST /api/projects/:id/archive` | 401      | 403         | 400 on `id`  | 404 `PROJECT_NOT_FOUND` |
| `DELETE /api/projects/:id`       | 401      | 403         | 400 on `id`  | 404 `PROJECT_NOT_FOUND` |

The first 401, 403 and 404 assert the whole body.

Every signed-in user sees every project, so there are no hidden rows; a
comment above the block says so, and the USER 403 column is the "visible,
not changeable" row. If projects became owner-scoped, the ownership block
in `api-access.md` would add: another owner's project answers all five `:id`
routes with a 404 equal to the unknown-id body, and the list leaves it out
of `data` and `total`.

## `GET /api/projects`

| `it`                                              | Request                                                                                 |
| ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| pages newest first with the pagination fields     | 3 rows, `?page=1&limit=2`, `?page=2`                                                    |
| returns the public shape of each project          | one row, exact object                                                                   |
| answers an empty page past the last one           | `?page=9`                                                                               |
| answers an empty list with zero totals            | no rows                                                                                 |
| searches the name, ignoring case                  | `?search=WEB`                                                                           |
| treats LIKE wildcards in the search as plain text | `?search=%25`, `?search=_`                                                              |
| treats an empty search as no filter               | `?search=`                                                                              |
| filters by one status and by two                  | `?status=ACTIVE`, then both                                                             |
| sorts by name both ways                           | `?sort=name`, `?sort=-name`                                                             |
| breaks a name tie by the second sort key          | `?sort=name&sort=-createdAt`                                                            |
| answers 400 for %s                                | `limit=0`, `page=abc`, `status=DONE` (path `status.0`), `sort=owner`, a search over 100 |
| ignores an unknown query param                    | `?_=1712345678`                                                                         |

## `GET /api/projects/:id`

| `it`                        | Request           |
| --------------------------- | ----------------- |
| returns the project         | an existing id    |
| accepts the id in uppercase | the id uppercased |

## `POST /api/projects`

| `it`                                              | Request                                                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| creates the project and sets the caller as owner  | `{ name: '  Website redesign ' }`; trimmed name, `ownerId`, `ACTIVE`, stored row                        |
| sets a left-out description to null               | no `description`                                                                                        |
| answers 409 PROJECT_NAME_TAKEN with a field error | a taken name in another case; exact body, no second row                                                 |
| answers 400 for %s                                | blank name, name over the cap, NUL in the name, `ownerId` in the body (path `""`), `status` in the body |

## `PATCH /api/projects/:id`

| `it`                                                      | Request                                     |
| --------------------------------------------------------- | ------------------------------------------- |
| renames the project, keeping the description              | `{ name }`; stored                          |
| clears the description with null                          | `{ description: null }`                     |
| answers 400 for a null name, changing nothing             | `{ name: null }`                            |
| answers 400 for %s, changing nothing                      | `{}` (path `""`), an unknown key, `ownerId` |
| answers 409 PROJECT_NAME_TAKEN for another project's name | stored row unchanged                        |
| keeps its own name without a conflict                     | `{ name: <its own name> }`                  |

## `POST /api/projects/:id/archive`

| `it`                                  | Request                                    |
| ------------------------------------- | ------------------------------------------ |
| archives the project                  | an active project; 200, `ARCHIVED`, stored |
| answers an archived project unchanged | archived; 200, same `updatedAt`, no write  |

## `DELETE /api/projects/:id`

| `it`                                             | Request                            |
| ------------------------------------------------ | ---------------------------------- |
| deletes the project with an empty 204            | then `GET` is 404                  |
| drops it from the list                           | then the list `total` is one lower |
| answers 404 PROJECT_NOT_FOUND to a second delete | the same id again                  |

## Races

| `it`                                                         | Comment says                                  |
| ------------------------------------------------------------ | --------------------------------------------- |
| answers one of two creates with one name with 409, never 500 | the unique index is the guard; no hold needed |
| answers two archives at once with the same archived project  | both 200, one write                           |

## `ProjectsService` unit spec

| `describe`                | `it`                                                      |
| ------------------------- | --------------------------------------------------------- |
| `ProjectsService.create`  | answers a taken name with a conflict, writing nothing     |
| `ProjectsService.create`  | hands the store the caller as owner and only known fields |
| `ProjectsService.update`  | answers a taken name with a field error, writing nothing  |
| `ProjectsService.update`  | does not look up a name the project already has           |
| `ProjectsService.update`  | answers an unknown id with PROJECT_NOT_FOUND              |
| `ProjectsService.archive` | leaves an archived project as is, writing nothing         |

Top comment: "The unique index needs a real database: the e2e race test in
`test/projects.e2e-spec.ts` guards it."
