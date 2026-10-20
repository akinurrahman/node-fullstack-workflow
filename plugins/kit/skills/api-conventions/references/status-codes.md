# Status codes

Detail for rules 2 and 3 in `SKILL.md`. The body that goes with each error
status is in `errors.md`; whole request and response pairs are in the
`example-*.md` files.

## Success

| Status | When                                                                  | Body                    |
| ------ | --------------------------------------------------------------------- | ----------------------- |
| 200    | a read, a list, an update, an action that returns the resource        | `{ data }` or paginated |
| 200    | a `POST` that creates no resource: login, refresh, a calculation      | `{ data }`              |
| 201    | a `POST` that creates a resource                                      | `{ data: resource }`    |
| 204    | a delete, or an action whose result the client already knows or needs | empty                   |

A create answers 201 with the full resource as a read of it would return it,
so the client needs no second request. It sends no `Location` header; the
id is in the body.

An update answers 200 with the full updated resource, never just the fields
that changed.

An action answers 200 with the resource when the action changes it
(`archive`, `disable`), because the client shows the new state. It answers
204 when there is nothing useful to show: setting another user's password,
logging out.

A delete answers 204. Deleting an id that does not exist is a 404 with the
domain's not-found code, not a 204: a client that deletes the wrong id
should hear about it.

## Idempotent actions

An action that finds its target already in the requested state answers
exactly as if it had done the work: 200 with the resource, unchanged.
`POST /api/projects/:id/archive` on an archived project is 200, not 409. A
409 is for a conflict the client can act on, not for a retry.

## Errors

| Status | Code                     | When                                                                       |
| ------ | ------------------------ | -------------------------------------------------------------------------- |
| 400    | `VALIDATION_FAILED`      | a body, query or path param fails its schema; carries `errors`             |
| 400    | `BAD_REQUEST`            | the body is not parseable JSON, or holds a character the store refuses     |
| 400    | a domain code            | a rule about one input that is not a conflict (`INVALID_CURRENT_PASSWORD`) |
| 401    | `UNAUTHORIZED`           | the access token is missing, invalid, expired, or its session is gone      |
| 401    | `INVALID_CREDENTIALS`    | login failed, for any reason                                               |
| 401    | `INVALID_SESSION`        | refresh failed: the cookie is missing, bad, revoked or reused              |
| 403    | `FORBIDDEN`              | signed in, but the role does not allow it                                  |
| 403    | `CSRF_REJECTED`          | a cross-site state-changing request                                        |
| 403    | a domain code            | a rule about who may do this to what (`CANNOT_DISABLE_SELF`)               |
| 404    | `<ENTITY>_NOT_FOUND`     | the id in the path does not exist, or the caller may not see it            |
| 404    | `NOT_FOUND`              | no route matches the path, or not with this method                         |
| 409    | a domain code            | a uniqueness or state conflict (`PROJECT_NAME_TAKEN`, `LAST_ADMIN`)        |
| 409    | `CONFLICT`               | a uniqueness conflict the domain check did not catch (a race)              |
| 413    | `PAYLOAD_TOO_LARGE`      | the body is over the size limit                                            |
| 415    | `UNSUPPORTED_MEDIA_TYPE` | the JSON body's charset cannot be decoded                                  |
| 429    | `TOO_MANY_REQUESTS`      | a rate limit was hit; `Retry-After` says when to try again                 |
| 500    | `INTERNAL_ERROR`         | anything unexpected                                                        |
| 503    | `SERVICE_UNAVAILABLE`    | a dependency (the database) is down                                        |

There is no 405. A known path with a method it does not serve is the same
404 `NOT_FOUND` as an unknown path, so a client cannot probe which paths
exist.

There is no 422. Every input the schema or a rule rejects is a 400 or, for a
conflict with stored data, a 409.

## Choosing between 400, 403 and 409

- The input is wrong on its own, whatever is stored: 400.
- The input is fine, but the caller may not do this: 403.
- The input is fine and allowed, but clashes with what is stored now: 409.

Wrong current password is a 400 with a field error, not a 401: the caller is
signed in, and a 401 would make the web try to refresh the token.

## Order of checks

A client sees the first failure only, in this order:

1. The body cannot be read: 400 `BAD_REQUEST`, 413, 415.
2. CSRF: 403 `CSRF_REJECTED`.
3. No route: 404 `NOT_FOUND`.
4. Rate limit: 429.
5. Token: 401. Role: 403 `FORBIDDEN`.
6. Path, query and body schemas: 400 `VALIDATION_FAILED`.
7. Domain rules: 404, 403, 409 with domain codes.

So an unauthenticated request to a real route with an invalid body is a 401,
never a 400, and validation never tells an anonymous caller what a route
expects.
