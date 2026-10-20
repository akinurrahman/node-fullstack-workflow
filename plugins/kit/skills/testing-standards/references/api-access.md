# Api access and id matrices

Detail for rule 1 in `SKILL.md`. Every status and code below is defined in
`kit:api-conventions` (`references/status-codes.md` and
`references/auth-csrf-rate-limit.md`). Cases are HTTP only; how a spec is
wired is the backend skill's.

## The access matrix

One table-driven block per module, one row per route. Each row runs every
column that applies.

| Case                   | Request                                   | Expect                              |
| ---------------------- | ----------------------------------------- | ----------------------------------- |
| No token               | no `Authorization` header                 | 401, exact body, `UNAUTHORIZED`     |
| Garbage token          | `Authorization: Bearer not.a.token`       | 401 `UNAUTHORIZED`                  |
| Wrong role             | a signed-in caller below the route's role | 403, exact body, `FORBIDDEN`        |
| Right role             | covered by the route's success test       | 2xx                                 |
| No token, invalid body | no token and a body that fails the schema | 401, not 400: auth is checked first |
| Wrong role, bad body   | wrong role and a body that fails          | 403, not 400                        |

Token variants (expired, wrong key, no expiry, unsigned, unknown role,
another scheme) are tested once per app against one guarded route, not per
module.

## Stale access

An access token outlives changes to its user. A route that checks the role
must check it against stored state, so these run once per role-limited
module:

| Case                                     | Expect                          |
| ---------------------------------------- | ------------------------------- |
| Caller demoted since the token was made  | 403 `FORBIDDEN`, nothing stored |
| Caller disabled since the token was made | 401 `UNAUTHORIZED`              |
| Caller's session revoked (logged out)    | 401 `UNAUTHORIZED`              |
| Caller signed in again elsewhere         | the old token still works       |

## The id matrix

Every route with `:id` in its path. Send the right role and a valid body,
so the id is the only thing wrong.

| Case         | Request id                                       | Expect                                            |
| ------------ | ------------------------------------------------ | ------------------------------------------------- |
| Not a UUID   | `not-a-uuid`                                     | 400 `VALIDATION_FAILED`, one error with path `id` |
| Unknown      | a well-formed UUID no row has                    | 404 `<ENTITY>_NOT_FOUND`, exact body once         |
| Uppercase    | an existing id in uppercase                      | same answer as the lowercase id                   |
| Self by case | the caller's own id in uppercase, on a self rule | the self rule still fires                         |

The unknown-id row uses the domain code, never `NOT_FOUND`, which means no
such route. The uppercase row runs once per route kind (one read, one
write), the other rows on every route.

## The ownership matrix

Required for every resource whose domain hides rows from some callers
(another owner's, a team the caller is not in). The rule is
`kit:api-conventions`, rule 12. Sign in as a caller who may use the route,
but not on this row.

| Case                     | Request                                    | Expect                                                |
| ------------------------ | ------------------------------------------ | ----------------------------------------------------- |
| Hidden, read             | `GET /:id` on a row the caller may not see | 404 `<ENTITY>_NOT_FOUND`, body equal to an unknown id |
| Hidden, every write      | each write and action route on that row    | 404 `<ENTITY>_NOT_FOUND`, the row unchanged           |
| Hidden, list             | the list, hidden rows existing             | absent from `data`, not counted in `total`            |
| Hidden, filter or search | a filter or search that matches only them  | 200, empty                                            |
| Visible, not changeable  | each write on a row the caller can read    | 403 `FORBIDDEN` or the domain code, row unchanged     |
| Changeable               | the owner, or a role that may change it    | covered by the route's success test                   |

Assert the hidden-row 404 against the unknown-id 404 with exact equality:
any difference tells a caller the row exists. A domain with no hidden rows
says so in one comment above the access block instead.

## Public routes

A route meant to be public gets one test that it answers without a token.
A route with no access marker is denied by default; one test per app proves
that with a test-only route.

## Checked once per app

These are properties of the whole api, not of a module. They live in the
cross-cutting e2e files and are not repeated per resource.

| Area       | Case                                                    | Expect                                              |
| ---------- | ------------------------------------------------------- | --------------------------------------------------- |
| Envelope   | a single value, an array, a page, a page with a summary | `{ data }` and `{ data, pagination }`               |
| Envelope   | a handler with nothing to return                        | 204, empty body                                     |
| Envelope   | a file                                                  | raw bytes, its own `Content-Type`                   |
| Paging     | defaults, `limit` over 100, `limit=0`, past the end     | 1 and 20, 400, 400, 200 with real totals            |
| Routing    | unknown path, known path with a wrong method            | 404 `NOT_FOUND` as JSON                             |
| Routing    | a route without the `/api` prefix, the probes with it   | 404                                                 |
| Body       | malformed JSON                                          | 400 `BAD_REQUEST`                                   |
| Body       | over the size limit, bad charset                        | 413 `PAYLOAD_TOO_LARGE`, 415                        |
| Body       | an unknown key on a strict body                         | 400, error path `""`                                |
| Store      | a character the store refuses, past every schema        | 400 `BAD_REQUEST`, not 500                          |
| 5xx        | an unexpected throw                                     | 500 `INTERNAL_ERROR`, cause not in the body         |
| 5xx        | the database down on a readiness check                  | 503 `SERVICE_UNAVAILABLE`, cause hidden             |
| CSRF       | cross-site and same-site state change                   | 403 `CSRF_REJECTED`                                 |
| CSRF       | same-origin, no browser headers, a trusted origin       | passes                                              |
| Rate limit | over the limit                                          | 429 `TOO_MANY_REQUESTS`, whole-second `Retry-After` |
| Rate limit | the probes                                              | never 429                                           |
| Headers    | any response, error included                            | `x-request-id`, security headers                    |
| CORS       | a configured origin, another origin, a preflight        | headers only for the configured one                 |

A rule with its own limit key (per email, per user) gets a test in its own
module that one key hitting the limit leaves another key alone.
