# API layer

Detail for rules 7 to 9 in `SKILL.md`. Paths are relative to `apps/web/src`.

## The axios instance

The axios instance in `lib/api/api.ts` owns the base URL (`VITE_API_BASE_URL`
plus `/api`) and turns every failure into an `ApiError`. It also attaches the
access token (held in memory by `lib/api/access-token.ts`) and answers a 401
`UNAUTHORIZED` with one shared refresh and a single retry. A feature that
bypasses `apiCall` opts out of all of it.

## The response envelope

The API wraps every success body: `{ data }`, or `{ data, pagination, summary? }`
for a paginated list. `apiCall<T>` unwraps `{ data }` and returns `T`;
`apiCallPaginated<T, S>` checks the shape and returns `PaginatedResponse<T, S>`
from `@<scope>/shared`. A body with the wrong shape becomes an `ApiError` with
code `BAD_RESPONSE`.

## Request options

`ApiCallOptions` is `method`, `body`, `params`, `signal`, `headers`. `body` and
`params` are independent, so `POST /x?notify=true` works and so does `DELETE`
with a body. Array params go as repeated keys (`a=1&a=2`), which the API reads
as an array.

## Why every GET threads `signal`

Thread the `signal` React Query gives the `queryFn` into every GET. Without it
a fast-typing user leaves a trail of in-flight requests and the last response to
land wins, which is not always the last one sent.

## Errors and retries

Every rejected request reaches callers as an `ApiError` from
`lib/api/api-error.ts`: `status`, `code`, `message`, `fieldErrors`, and
`retryAfter` (seconds, from the `Retry-After` header of a 429). `code` is
what the api sent: a generic `ERROR_CODES` value, a domain code from a
`<DOMAIN>_ERROR_CODES` object (`USER_NOT_FOUND`), or an HTTP status name for
an error the api did not raise on purpose (`PAYLOAD_TOO_LARGE`). The client
adds `NETWORK_ERROR` and `BAD_RESPONSE`. A code you do not know is handled
by its `status`. The full list of what the api sends is `kit:api-conventions`.

Queries retry up to twice on anything but a 4xx.

## The global error toast

The `MutationCache` in `systems/api/query-client.ts` fires one for every
rejected mutation, unless something already showed the error (a `Form` marks
the errors it maps) or the mutation defines its own `onError`, which replaces
it.

An `onError` passed per call, `mutate(values, { onError })`, does not
suppress the global toast: it never reaches the cache, so the person sees the
toast and whatever that callback shows.
