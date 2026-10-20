# Auth, CSRF and rate limits

Detail for rules 10 and 11 in `SKILL.md`. The bodies in full are in
`example-errors.md`.

## Tokens

| Route                     | Access | Success                                                   |
| ------------------------- | ------ | --------------------------------------------------------- |
| `POST /api/auth/login`    | public | 200 `{ data: { accessToken, user } }`, sets the cookie    |
| `POST /api/auth/refresh`  | public | 200 `{ data: { accessToken, user } }`, rotates the cookie |
| `POST /api/auth/logout`   | public | 204, clears the cookie, even with no cookie               |
| `GET /api/auth/me`        | token  | 200 `{ data: user }`                                      |
| `POST /api/auth/password` | token  | 204, ends every other session                             |

The access token is short-lived and travels only as
`Authorization: Bearer <token>`. It is never in a cookie, a query string or
a log line. The web keeps it in memory.

The refresh token travels only as a cookie: `HttpOnly`, `Secure`,
`SameSite=Strict`, `Path=/api/auth`. It is never in a body, so script on the
page cannot read it, and no route outside `/api/auth` ever receives it. A
browser on another origin sends it only because the web calls with
credentials.

## 401 codes

| Code                  | Means                                             | Client does         |
| --------------------- | ------------------------------------------------- | ------------------- |
| `UNAUTHORIZED`        | no token, a bad or expired one, or a dead session | refresh, retry once |
| `INVALID_CREDENTIALS` | login refused: wrong email, password, or inactive | shows the message   |
| `INVALID_SESSION`     | refresh refused: the session is over              | signs out           |

`UNAUTHORIZED` is the only 401 a client refreshes on, so a new 401 that a
fresh token cannot fix must get its own code. Login answers one code for
every reason it refuses, so the response does not reveal which accounts
exist.

## 403 codes

`FORBIDDEN` with `"Access denied"` when the caller's role does not allow the
route. A domain code (`CANNOT_DISABLE_SELF`) when the role allows the route
but a rule forbids this target. `CSRF_REJECTED` for CSRF, below. The three
have distinct codes on purpose, so a client and a support log can tell a
missing permission from a blocked request.

## Ownership

Some domains hide a resource from callers who do not own it, or are not
members of it. The answer depends on whether the caller may see it:

| Caller                        | Read                     | Write                     | List     |
| ----------------------------- | ------------------------ | ------------------------- | -------- |
| May not see it                | 404 `<ENTITY>_NOT_FOUND` | 404 `<ENTITY>_NOT_FOUND`  | left out |
| May see it, may not change it | 200                      | 403 `FORBIDDEN` or domain | included |
| May change it                 | 200                      | 2xx                       | included |

The 404 for a hidden resource has exactly the body of an id that does not
exist, so the response says nothing about whether it exists. A list's `total` counts only the rows the caller may see. A 403 is
only for a resource the caller can already read: telling them they may not
change it reveals nothing new.

## CSRF

A state-changing request (`POST`, `PUT`, `PATCH`, `DELETE`) is rejected when
the browser says it came from somewhere else:

- `Sec-Fetch-Site` is `cross-site` or `same-site`, or
- with no `Sec-Fetch-Site`, `Origin` does not match the host,

unless the `Origin` is one of the web app origins the api trusts (the CORS
list). The answer is
`403 { "code": "CSRF_REJECTED", "message": "Cross-site request blocked" }`.
A request with neither header (a server, a test client) passes. `GET` is
never checked, which is one more reason a `GET` never changes anything.

## Rate limits

Every route except the two probes is limited. When a limit is hit:

```
HTTP/1.1 429 Too Many Requests
Retry-After: 37
```

with `{ "statusCode": 429, "code": "TOO_MANY_REQUESTS", "message": "Too many requests, try again later" }`.

- `Retry-After` is whole seconds, always present on a 429.
- `X-RateLimit-Limit` and `X-RateLimit-Remaining` are sent on limited routes
  as information; clients do not depend on them.
- Limits are per client and per route. Login is also limited per email,
  and changing your own password per user. The numbers are the backend's
  choice and not part of the contract; the response shape is.

## Headers on every response

- `x-request-id`: a UUID identifying the request, on successes and errors
  alike. A client may send its own valid one, which is echoed back. Logs
  carry it, so a person can quote it to support.
- CORS: only the configured web origins get CORS headers, always with
  credentials allowed. `x-request-id` and `Retry-After` are exposed, so a web
  app on another origin can read them.
