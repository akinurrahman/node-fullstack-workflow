# URLs and methods

Detail for rule 7 in `SKILL.md`.

## The prefix

Every application route is under `/api`: `/api/projects`, `/api/auth/login`.
The web's base URL is the api origin plus `/api`, so a web call names the
path after it (`/projects`).

Two paths stay outside it, because infrastructure polls them at fixed
paths: `GET /health` (liveness) and `GET /health/ready` (readiness). They
are public and never rate limited. `/api/health` and `/api/health/ready` do
not exist. The web checks readiness through `GET /api/health/status`, an
ordinary public route that is rate limited like any other.

API docs, when served, are outside `/api` too.

## Resource paths

| Path                        | Meaning                             |
| --------------------------- | ----------------------------------- |
| `/api/projects`             | the collection                      |
| `/api/projects/:id`         | one project                         |
| `/api/projects/:id/<verb>`  | an action on one project            |
| `/api/projects/:id/members` | a sub-collection owned by a project |
| `/api/users/me`             | the caller's own record             |

- Plural nouns, lowercase, kebab-case for more than one word:
  `/api/time-entries`, never `/api/timeEntries` or `/api/time_entry`.
- `:id` is the resource's UUID. Never a name or a slug in the same position.
- One level of nesting at most. A member of a project is
  `/api/projects/:id/members/:memberId`; anything deeper gets its own
  top-level collection filtered by a query param.
- A fixed segment never shares a position with `:id` unless the router
  matches it first: `/api/users/me` must win over `/api/users/:id`.
- No trailing slash, no file extension, no version segment. A breaking
  change is a new route, not `/v2`.

## Methods

| Method   | On            | Does                                       |
| -------- | ------------- | ------------------------------------------ |
| `GET`    | collection    | list, paginated                            |
| `GET`    | one           | read                                       |
| `POST`   | collection    | create                                     |
| `PATCH`  | one           | change some fields; missing keys untouched |
| `DELETE` | one           | delete                                     |
| `POST`   | `/:id/<verb>` | an action                                  |

`PUT` is not used: no endpoint replaces a whole resource. A `GET` never
changes anything.

## Actions

An action is a state change that is not "set these fields", or that has
rules or side effects a plain field write would hide:
`POST /api/projects/:id/archive`, `POST /api/users/:id/disable`,
`POST /api/users/:id/password`.

- The verb is lowercase, one word where possible, kebab-case otherwise:
  `archive`, `restore`, `resend-invite`.
- An action that has an opposite gets its own route for it
  (`disable` and `enable`), never a toggle.
- An action takes a body only when it needs input (`{ "password": "..." }`).
- When a field can simply be set and nothing else happens, it is a `PATCH`
  field, not an action.

## Read-only views of a collection

A lighter list for a picker or an autocomplete is a sub-path of the
collection: `GET /api/projects/options`. It pages and searches like the
main list. It is listed before `/:id` so `options` is never read as an id.

## Unknown paths

A path no route serves, or a known path with a method it does not serve, is
`404 NOT_FOUND` in the error body, as JSON, under `/api` and outside it.
Never an HTML page, never a 405.
