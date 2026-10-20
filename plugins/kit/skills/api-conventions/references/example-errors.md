# Example: errors

Every kind of error a client can see, in full. Which status goes with which
code is in `status-codes.md`; the rules for the body are in `errors.md`.
Every one of these also carries an `x-request-id` header.

## Validation

```http
POST /api/projects
{ "name": "", "description": 42 }

400 Bad Request
{
  "statusCode": 400,
  "code": "VALIDATION_FAILED",
  "message": "Validation failed",
  "errors": [
    { "path": "name", "message": "Enter a name", "code": "too_small" },
    { "path": "description", "message": "Invalid input: expected string, received number", "code": "invalid_type" }
  ]
}
```

## Unknown key in the body

```http
POST /api/projects
{ "name": "Website redesign", "ownerId": "019a3f1d-0b2c-7e11-8a90-2c3d4e5f6a7b" }

400 Bad Request
{
  "statusCode": 400,
  "code": "VALIDATION_FAILED",
  "message": "Validation failed",
  "errors": [{ "path": "", "message": "Unrecognized key: \"ownerId\"", "code": "unrecognized_keys" }]
}
```

## Body that is not JSON

```http
POST /api/projects
Content-Type: application/json
{"name":

400 Bad Request
{ "statusCode": 400, "code": "BAD_REQUEST", "message": "Bad request" }
```

## No token, or an expired one

```http
GET /api/projects

401 Unauthorized
{ "statusCode": 401, "code": "UNAUTHORIZED", "message": "Authentication required" }
```

The web refreshes once and retries on this code only.

## Login refused, refresh refused

```http
POST /api/auth/login
{ "email": "ada@example.com", "password": "wrong" }

401 Unauthorized
{ "statusCode": 401, "code": "INVALID_CREDENTIALS", "message": "Invalid email or password" }
```

```http
POST /api/auth/refresh

401 Unauthorized
{ "statusCode": 401, "code": "INVALID_SESSION", "message": "Session expired, log in again" }
```

## Role does not allow it

```http
PATCH /api/projects/019a3f2e-7c41-7b8e-9d2a-4f6c1e0b5a77
{ "name": "Mine now" }

403 Forbidden
{ "statusCode": 403, "code": "FORBIDDEN", "message": "Access denied" }
```

## A rule forbids it for this target

```http
POST /api/users/<the caller's own id>/disable

403 Forbidden
{ "statusCode": 403, "code": "CANNOT_DISABLE_SELF", "message": "You cannot disable your own account" }
```

## CSRF

```http
POST /api/projects
Sec-Fetch-Site: cross-site
Origin: https://evil.example
{ "name": "Sneaky" }

403 Forbidden
{ "statusCode": 403, "code": "CSRF_REJECTED", "message": "Cross-site request blocked" }
```

## Unknown route, or a method the route does not serve

```http
DELETE /api/health/status

404 Not Found
Content-Type: application/json
{ "statusCode": 404, "code": "NOT_FOUND", "message": "Resource not found" }
```

## Conflict on a field

```http
POST /api/projects
{ "name": "Website redesign" }

409 Conflict
{
  "statusCode": 409,
  "code": "PROJECT_NAME_TAKEN",
  "message": "Name is already in use",
  "errors": [
    { "path": "name", "message": "Name is already in use", "code": "PROJECT_NAME_TAKEN" }
  ]
}
```

## Conflict about state

```http
POST /api/users/<the last active admin's id>/disable

409 Conflict
{ "statusCode": 409, "code": "LAST_ADMIN", "message": "The last active admin cannot be disabled or demoted" }
```

No `errors`: no input is wrong.

## Body too large

```http
POST /api/projects
{ "name": "...", "description": "<200 KB of text>" }

413 Payload Too Large
{ "statusCode": 413, "code": "PAYLOAD_TOO_LARGE", "message": "Payload too large" }
```

## Rate limit

```http
POST /api/auth/login

429 Too Many Requests
Retry-After: 37
{ "statusCode": 429, "code": "TOO_MANY_REQUESTS", "message": "Too many requests, try again later" }
```

## Anything unexpected

```http
GET /api/projects

500 Internal Server Error
{ "statusCode": 500, "code": "INTERNAL_ERROR", "message": "Internal server error" }
```

Whatever failed. The cause is in the log under this request's `x-request-id`.

## Database down

```http
GET /health/ready

503 Service Unavailable
{ "statusCode": 503, "code": "SERVICE_UNAVAILABLE", "message": "Service unavailable" }
```

`GET /health` still answers `200 { "data": { "status": "ok" } }`: the
process is alive, so it must not be restarted.
