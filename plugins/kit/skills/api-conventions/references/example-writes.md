# Example: writes

Creates, updates, deletes and actions. The resource and its schemas are in
`example-overview.md`. Every request here carries
`Content-Type: application/json` when it has a body.

## Create

```http
POST /api/projects
{ "name": "  Website redesign ", "description": "Q3 refresh" }

201 Created
{
  "data": {
    "id": "019a3f2e-7c41-7b8e-9d2a-4f6c1e0b5a77",
    "name": "Website redesign",
    "description": "Q3 refresh",
    "status": "ACTIVE",
    "ownerId": "019a3f1d-0b2c-7e11-8a90-2c3d4e5f6a7b",
    "createdAt": "2026-03-04T09:15:00.000Z",
    "updatedAt": "2026-03-04T09:15:00.000Z"
  }
}
```

201 with the whole resource, as a read returns it. `name` comes back trimmed
by the shared schema. `ownerId` comes from the token, not the body: sending
it would be an unknown key.

## Create, optional field left out

```http
POST /api/projects
{ "name": "Internal tools" }

201 Created
{ "data": { ..., "name": "Internal tools", "description": null, ... } }
```

## Update

```http
PATCH /api/projects/019a3f2e-7c41-7b8e-9d2a-4f6c1e0b5a77
{ "name": "Website relaunch" }

200 OK
{ "data": { ..., "name": "Website relaunch", "description": "Q3 refresh", ... } }
```

Only `name` changes; the missing `description` is left as it was. The
response is the whole updated resource.

## Update, clearing a field

```http
PATCH /api/projects/019a3f2e-7c41-7b8e-9d2a-4f6c1e0b5a77
{ "description": null }

200 OK
{ "data": { ..., "description": null, ... } }
```

`null` clears. Only a field the schema marks `.nullable()` accepts it;
`{ "name": null }` is a 400 on `name`.

## Update, nothing to change

```http
PATCH /api/projects/019a3f2e-7c41-7b8e-9d2a-4f6c1e0b5a77
{}

400 Bad Request
{
  "statusCode": 400,
  "code": "VALIDATION_FAILED",
  "message": "Validation failed",
  "errors": [{ "path": "", "message": "Provide at least one field to update", "code": "custom" }]
}
```

## Delete

```http
DELETE /api/projects/019a3f2e-7c41-7b8e-9d2a-4f6c1e0b5a77

204 No Content
```

Empty body. The same request again is a `404 PROJECT_NOT_FOUND`.

## Action that returns the resource

```http
POST /api/projects/019a3f2e-7c41-7b8e-9d2a-4f6c1e0b5a77/archive

200 OK
{ "data": { ..., "status": "ARCHIVED", "updatedAt": "2026-03-05T10:00:00.000Z" } }
```

No body on the request: the action needs no input. 200, not 201: nothing
was created.

## Same action, already done

```http
POST /api/projects/019a3f2e-7c41-7b8e-9d2a-4f6c1e0b5a77/archive

200 OK
{ "data": { ..., "status": "ARCHIVED", "updatedAt": "2026-03-05T10:00:00.000Z" } }
```

Unchanged, `updatedAt` included. A retry is never an error.

## Action with nothing to return

From the template's users routes:

```http
POST /api/users/019a3f1d-0b2c-7e11-8a90-2c3d4e5f6a7b/password
{ "password": "a brand new password" }

204 No Content
```

The action takes input, so it has a body; the result is nothing the client
needs to show, so the response has none.

## Login, a POST that creates no resource

```http
POST /api/auth/login
{ "email": "ada@example.com", "password": "correct horse" }

200 OK
Set-Cookie: <refresh cookie>; Path=/api/auth; HttpOnly; Secure; SameSite=Strict
{ "data": { "accessToken": "eyJ...", "user": { "id": "...", "email": "ada@example.com", ... } } }
```
