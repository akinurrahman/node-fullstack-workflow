# JSON values

Detail for rules 6 and 9 in `SKILL.md`.

## Bodies

Requests and responses with a body are `application/json` in UTF-8. A
request body sent as another content type is not read as JSON, so it fails
validation as if it were empty; a JSON body in a charset the backend cannot
decode is `415 UNSUPPORTED_MEDIA_TYPE`; unparseable JSON is
`400 BAD_REQUEST`. A body has a size limit; over it is
`413 PAYLOAD_TOO_LARGE`. Files and streams are the only raw responses.

## Keys

camelCase, in requests, responses, query params and field error paths:
`ownerId`, `createdAt`, `isActive`. A boolean is named as a statement:
`isActive`, `hasChildren`. Never snake_case on the wire, even when the
database column is.

## Enums

UPPER_SNAKE strings, the same in a body, a filter and a response:
`"ADMIN"`, `"ARCHIVED"`. The allowed values are a `z.enum` in
`@<scope>/shared`, and the web's lookups are built from the same list.

## Ids

UUID strings (v7, so they sort by creation time). Lowercase in every
response. A path param or filter accepts any case and is read as the
lowercase id, so `/api/projects/019A...` and `/api/projects/019a...` are the
same project. Anything that is not a UUID is
`400 VALIDATION_FAILED` with path `id`, never a 404. A foreign key is
`<entity>Id` (`ownerId`). Ids are never numbers.

## Dates and times

- An instant (`createdAt`, `archivedAt`) is ISO 8601 in UTC with
  milliseconds and `Z`: `"2026-03-04T09:15:00.000Z"`. Never an offset, never
  a Unix number. Its field name ends in `At`.
- A calendar date with no time (a birthday, a due date) is `"2026-03-04"`.
  It is not converted between time zones on either side.

The shared schemas are `z.iso.datetime()` for an instant and `z.iso.date()`
for a date, in requests and responses alike.

## Nulls and missing keys

In a response, every field of the schema is present. A field with no value
is `null`, never left out and never an empty string standing in for one.
The response schema says `.nullable()`, not `.optional()`.

In a request:

- `POST`: an optional field may be left out; it is stored as no value.
- `PATCH`: a missing key leaves the field as it is; `null` clears it. Only a
  field the schema marks `.nullable()` can be cleared. A `PATCH` with no
  known keys at all is a 400 ("Provide at least one field to update").

Strings are trimmed by the shared schema where whitespace has no meaning
(names, emails, search), and never where it does (passwords).

## Strictness

A request body schema is `z.strictObject`: an unknown key is
`400 VALIDATION_FAILED` with `code: "unrecognized_keys"`, path of the object
holding it (`""` for the body), and the key named in the message. Never
stripped silently: a client that sends a field the endpoint does not take
must find out.

A query schema is a plain `z.object`: unknown params are ignored.

A response schema is a plain `z.object` too. The backend sends exactly the
fields of the schema and nothing more: a column added to the table does not
appear in a response until the schema lists it.
