---
name: api-conventions
description: The HTTP contract between the web app and the api, independent of the backend framework - URL and route naming, HTTP methods and action routes (POST /:id/archive), the status code for each kind of endpoint, the success envelope ({ data } and { data, pagination }), the error body (statusCode, code, message, field errors and their path), error code naming, pagination and filter query params, sorting, JSON naming, ids, dates, nulls, unknown body keys, auth, ownership (404 for a resource the caller cannot see, 403 for one they cannot change), CSRF and rate limit responses, the /api prefix and the health probes. Use this skill whenever adding or changing an endpoint, a request or response schema in the shared package, an error code, a list query, a status code, or anything a client sees on the wire, on either side of it, and whenever a client call or a backend disagrees about a response. Consult it even when the request sounds routine ("add a delete endpoint", "return the updated record", "add a sort to this list") - the contract here is project-specific and cannot be inferred from one side alone.
---

# API conventions

`@<scope>/shared` below means the project's shared package. Check the root
`package.json` for the actual scope (e.g. `@acme/shared`).

The HTTP contract between `apps/web` and `apps/api`. It is written in HTTP
terms only: methods, paths, status codes, headers and JSON. Any backend that
follows it, NestJS today or Express later, serves the same web code
unchanged. Nothing here depends on how the backend produces a response.

The request and response schemas in `@<scope>/shared` are part of this
contract. Both sides import them: the api to validate, the web to type its
calls and its forms. A wire change is a shared schema change first.

This skill is the wire. It does not cover:

- How the NestJS api produces it: the interceptor, the exception filter,
  `AppError` classes, DTOs and guards. That is
  `kit:backend-architecture-nestjs`.
- How the web calls it: `apiCall`, `ApiError`, the refresh retry, forms
  mapping field errors. That is `kit:frontend-architecture`.
- What to test and which cases are required. That is `kit:testing-standards`.

## How to use this skill

1. Read the rules below. Every one of them is something a client depends on.
2. Open the `references/example-*.md` file for the kind of endpoint you are
   adding or changing. Each holds the exact request and response pairs.
3. Run the contract checks, right after the rules, before reporting complete.

### Which reference to read

| File                                   | Read it when                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------ |
| `references/example-overview.md`       | you need the example resource, its shared schemas and its route table          |
| `references/example-reads.md`          | you add a list or a read: filters, empty pages, a bad or unknown id            |
| `references/example-writes.md`         | you add a create, an update, a delete or an action                             |
| `references/example-errors.md`         | you need the exact body of an error a client will see                          |
| `references/status-codes.md`           | you pick the status for a success or an error                                  |
| `references/errors.md`                 | you add an error code, a field error, or touch how errors are shaped           |
| `references/urls-and-methods.md`       | you name a route, add an action, or nest a resource                            |
| `references/pagination-and-queries.md` | you add a list, a filter, a search or a sort                                   |
| `references/json-values.md`            | you add a field: naming, ids, dates, nulls, enums, how strict the schema is    |
| `references/auth-csrf-rate-limit.md`   | you touch tokens or ownership, the refresh cookie, CSRF, throttling or headers |

**If something you need is not covered here**, copy the nearest existing
endpoint in the repo (the users routes first) and say in your summary which
one and why. When the code and this skill disagree, follow the skill for new
endpoints, flag the mismatch, and do not change old endpoints unless asked: a
changed status or body breaks a client that already depends on it.

## Output style and scope

No em dashes anywhere you write: error messages, schema messages, comments,
commit messages, or the summary you report back. Use a hyphen, a comma, or
rewrite the sentence.

Change the contract only as far as the request needs. A new endpoint adds
routes; it does not rename, re-status or reshape existing ones. If an
existing endpoint breaks a rule here, mention it in your summary instead of
fixing it.

## The rules that actually matter

**1. Every success body is an envelope. No content is a 204.**
A single resource, or any other value, is `{ "data": ... }`. A paginated list
is `{ "data": [...], "pagination": {...} }`, plus `"summary"` when the list
carries one. A response with nothing to say is `204 No Content` with an empty
body. Never a bare array or object at the top, never a 200 with an empty
body, never a hand-built variation like `{ "items": [...] }` or
`{ "user": {...} }`. A value that is legitimately absent is `{ "data": null }`.

Files and streams are the one exception: they go out raw, with their own
`Content-Type`.

**2. The status code follows the kind of endpoint.**

| Endpoint                                      | Success                   |
| --------------------------------------------- | ------------------------- |
| `GET /things`, `GET /things/:id`              | 200 with the body         |
| `POST /things` (creates a resource)           | 201 with the new resource |
| `PATCH /things/:id`                           | 200 with the updated one  |
| `DELETE /things/:id`                          | 204                       |
| `POST /things/:id/<action>` that changes it   | 200 with the resource     |
| `POST /things/:id/<action>` with nothing back | 204                       |
| `POST` that creates nothing (login, refresh)  | 200 with the body         |

An action that finds the resource already in the target state answers 200
with it, unchanged: archiving an archived project is not an error, so a
retried request is safe. Detail and the error side in
`references/status-codes.md`.

**3. Every error has the same body.**

```json
{
  "statusCode": 404,
  "code": "PROJECT_NOT_FOUND",
  "message": "Project not found"
}
```

`statusCode` repeats the HTTP status. `code` is what clients branch on.
`message` is written for a person and may be shown as is. `errors`, the field
errors, is present only when there are some. No other key, ever: no stack,
no `error`, no `details`.

Every failure uses it: a thrown domain error, validation, malformed JSON, a
body over the size limit, an unknown route, a wrong method, CSRF, the rate
limit, a 5xx. A 5xx always says `INTERNAL_ERROR` and
`"Internal server error"` (or `SERVICE_UNAVAILABLE` for a 503): its real
cause is logged, never sent. The schema is `errorResponseSchema` in
`@<scope>/shared`.

**4. `code` is a stable UPPER_SNAKE constant from the shared package.**
Generic codes live in `ERROR_CODES`; a domain's own codes live in
`<DOMAIN>_ERROR_CODES` next to its schemas (`PROJECT_NOT_FOUND`,
`PROJECT_NAME_TAKEN`). Clients branch on `code`, never on `message` or on the
status alone. A code, once shipped, is never renamed or reused for a
different meaning.

`UNAUTHORIZED` means one thing: the access token is missing, invalid or no
longer accepted. The web answers it with a token refresh and one retry. A
401 that a refresh cannot fix gets its own code (`INVALID_CREDENTIALS`,
`INVALID_SESSION`). Detail in `references/errors.md`.

**5. Field errors name the input that failed by its path.**
Each entry in `errors` is `{ "path", "message", "code" }`. `path` is the
dot-joined path from the root of the body or query: `name`,
`address.city`, `status.1` for the second item of an array. An error about
the object itself (an unknown key, "provide at least one field") has the path
of that object, so `""` for the body.

Validation failures are `400 VALIDATION_FAILED` with one entry per problem.
A domain error tied to one input carries a field error too, with the same
code as the response: a `409 PROJECT_NAME_TAKEN` has
`{ "path": "name", "code": "PROJECT_NAME_TAKEN", ... }`, so a form puts it on
the field. A domain error about state, not about an input (`LAST_ADMIN`),
carries none.

**6. Bodies are strict, queries are lenient.**
A request body with a key the schema does not know is a 400, not silently
dropped: a client sending `role` to a profile endpoint must learn it is not
allowed, not see a 200 that changed nothing. Body schemas are
`z.strictObject`. Query schemas are not: an unknown query param is ignored,
so cache-busters and tracking params do not break a list. A known param
with a bad value is still a 400.

**7. URLs are plural nouns under `/api`; actions are `POST /:id/<verb>`.**
`/api/projects`, `/api/projects/:id`, `/api/projects/:id/archive`. Paths are
lowercase kebab-case plural nouns. A verb appears only as the last segment of
an action, and only when no plain `PATCH` field says the same thing.
`/me` names the caller's own record (`/api/users/me`). Nesting goes one level
at most (`/api/projects/:id/members`). The probes `/health` and
`/health/ready` stay outside `/api`. Detail in `references/urls-and-methods.md`.

**8. Lists page with `page` and `limit`, filter and sort with query params.**
`page` starts at 1, `limit` defaults to 20 and is at most 100. The
`pagination` object is always
`{ page, limit, total, totalPages, hasPrevious, hasNext }`. A page past the
last one is a 200 with empty `data` and the real totals, never a 404.

Filters are query params named after the field. A filter that takes many
values repeats its key (`status=ACTIVE&status=ARCHIVED`), never `status[]=`
or a comma list. A boolean is exactly `true` or `false`. An empty `search` is
no filter. Sorting is `sort=<field>` ascending and `sort=-<field>`
descending, repeated for a tie-breaker; an unknown sort field is a 400.
Detail in `references/pagination-and-queries.md`.

**9. JSON values have one spelling each.**

- Keys are camelCase. Enum values are UPPER_SNAKE strings (`"ARCHIVED"`).
- Ids are UUID strings, lowercase in every response. A path accepts any case
  and treats it as the lowercase id.
- An instant is ISO 8601 in UTC with milliseconds:
  `"2026-03-04T09:15:00.000Z"`. A date with no time is `"2026-03-04"`.
- A response field with no value is present and `null`, never left out.
- In a `PATCH` body, a missing key leaves the field as it is and `null`
  clears it.

Detail in `references/json-values.md`.

**10. Auth is a bearer token plus a refresh cookie.**
Every route needs `Authorization: Bearer <accessToken>` unless it is public
(login, refresh, logout, the probes, the status check). The refresh token is
an `HttpOnly`, `Secure`, `SameSite=Strict` cookie scoped to `/api/auth`, never
readable by the web and never in a body. A missing or bad token is
`401 UNAUTHORIZED`; a signed-in caller without the right is
`403 FORBIDDEN`, or 403 with a domain code when the rule is specific
(`CANNOT_DISABLE_SELF`). Detail in `references/auth-csrf-rate-limit.md`.

**11. CSRF and rate limits answer in the same error body.**
A state-changing request (`POST`, `PATCH`, `PUT`, `DELETE`) that the browser
marks as cross-site or same-site from an untrusted origin is
`403 CSRF_REJECTED`. Too many requests is `429 TOO_MANY_REQUESTS` with a
`Retry-After` header in whole seconds. Both headers a browser client reads,
`Retry-After` and `x-request-id`, are exposed to the web's origins through
CORS.

**12. A resource the caller cannot see is a 404; one they can see but not
change is a 403.**
When a rule hides a resource from the caller (another owner's project in an
owner-scoped domain), every route on its id answers
`404 <ENTITY>_NOT_FOUND` with the same body as an id that does not exist,
so a caller cannot learn that it exists. A list leaves such rows out, and
its `total` counts only what the caller can see. When the caller can see
the resource but may not change it, a write answers 403: `FORBIDDEN`, or a
domain code when the rule is specific. Detail in
`references/auth-csrf-rate-limit.md`.

## Contract checks

Run these before reporting complete. The general gate (typecheck, lint,
tests, format) is `kit:definition-of-done`.

1. Every success body is `{ data }` or `{ data, pagination }`; no-body is 204
2. Status per endpoint kind matches rule 2; an idempotent action answers 200
3. Every error, including the ones the framework raises, has the rule 3 body
4. Every new code is UPPER_SNAKE in `ERROR_CODES` or `<DOMAIN>_ERROR_CODES`
5. A domain error about one input carries a field error with the same code
6. Request bodies are `z.strictObject`; query schemas are not
7. Paths are plural kebab-case nouns, actions `POST /:id/<verb>`, under `/api`
8. Lists extend `paginationQuerySchema`; arrays are repeated keys
9. Response fields: camelCase, lowercase ids, ISO UTC instants, `null` present
10. A resource the caller cannot see answers 404 like an unknown id; one
    they can see but not change answers 403
11. No existing route changed its status, body shape or code

## Who produces what

The contract is the same whichever side you are on; how each side meets it
is not.

- A NestJS api: the envelope, the error body, validation and the guard
  chain come from one interceptor, one exception filter, one global pipe and
  three global guards. `kit:backend-architecture-nestjs`, rules 3, 5, 6, 7.
- An Express api: one response helper, one error middleware registered last
  and one validation middleware over the same shared schemas must produce the
  same bodies byte for byte. The examples in `references/` are the test.
- The web: `apiCall`, `apiCallPaginated` and `apiCallEmpty` unwrap the
  envelope; `ApiError` carries `status`, `code`, `message`, `fieldErrors` and
  `retryAfter`. `kit:frontend-architecture`, rules 8 and 9.
