# Errors

Detail for rules 3, 4 and 5 in `SKILL.md`. Which status goes with which code
is in `status-codes.md`; every error body in full is in `example-errors.md`.

## The body

```json
{
  "statusCode": 409,
  "code": "PROJECT_NAME_TAKEN",
  "message": "Name is already in use",
  "errors": [
    {
      "path": "name",
      "message": "Name is already in use",
      "code": "PROJECT_NAME_TAKEN"
    }
  ]
}
```

`errorResponseSchema` and `fieldErrorSchema` in `@<scope>/shared` define it,
and the web parses every error response with them. A body that does not
match reaches the web as a broken response, not as the error that happened.

- `statusCode`: the HTTP status, repeated.
- `code`: the constant a client branches on.
- `message`: one sentence for a person, shown as is for a 4xx. No trailing
  period on short phrases, no internal detail, no ids or SQL.
- `errors`: present only when non-empty.

## Codes

Three sources, one format, UPPER_SNAKE:

- `ERROR_CODES` in `@<scope>/shared`: the generic ones, `VALIDATION_FAILED`,
  `UNAUTHORIZED`, `FORBIDDEN`, `CSRF_REJECTED`, `NOT_FOUND`, `CONFLICT`,
  `TOO_MANY_REQUESTS`, `INTERNAL_ERROR`, `SERVICE_UNAVAILABLE` and the auth
  codes.
- `<DOMAIN>_ERROR_CODES` next to the domain's schemas: `PROJECT_NOT_FOUND`,
  `PROJECT_NAME_TAKEN`. Prefixed with the entity, so codes stay unique
  across domains.
- A status the backend did not throw on purpose (body too large, bad charset)
  gets the standard HTTP status name in UPPER_SNAKE: `PAYLOAD_TOO_LARGE`,
  `UNSUPPORTED_MEDIA_TYPE`. So `code` on the wire is a string, not a closed
  union, and the web must handle a code it does not know by its status.

A domain error uses its domain code whenever a client could act differently
on it. A plain "not allowed" uses `FORBIDDEN`. A message that only a person
reads needs no code of its own.

## Field errors

`{ "path": string, "message": string, "code": string }`.

- `path` is the dot-joined path from the root of what failed: the body, the
  query string or the path params. `name`, `address.city`, `tags.2`, `id` for
  the path param, `limit` for the query param.
- `""` is the root itself: an unknown key (`"Unrecognized key: \"isAdmin\""`),
  or a rule across fields ("Provide at least one field to update"). An
  unknown key inside a nested object has that object's path.
- `message` comes from the shared schema, written for a form: "Enter a name",
  not "String must contain at least 1 character(s)".
- `code` is a schema issue code (`too_small`, `invalid_format`,
  `unrecognized_keys`, `custom`) for validation, and the domain code for a
  domain field error. Clients branch on the top-level `code` and on
  UPPER_SNAKE field codes only, never on a schema issue code.

One entry per problem, in schema order. A form puts each entry whose path
names one of its fields on that field, an array item's error on the array
field (`tags.2` lands on `tags`), and everything else in one form-level
message.

## Domain errors with a field error

A domain error that is about one input carries a field error on that input,
with the same code and message as the response. A uniqueness conflict on
`name` is the usual case; a wrong current password is another. A domain
error about state (the last admin, an archived project being renamed) carries
none: there is no field to mark.

A uniqueness clash that slips past the domain check in a race comes back as a
generic `409 CONFLICT` with no field error. That is a safety net, not a
substitute for the check.

## What never reaches the body

A stack, an exception class name, a library's message, a database error, a
query, the request body echoed back. Any 5xx is `INTERNAL_ERROR` with
`"Internal server error"`, or `SERVICE_UNAVAILABLE` with
`"Service unavailable"`, whatever happened; the cause is logged with the
request's `x-request-id`, which the client can quote.
