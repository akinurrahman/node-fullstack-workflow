# Example: reads

Lists and single reads of `projects`. The resource and its schemas are in
`example-overview.md`.

## List, defaults

```http
GET /api/projects

200 OK
{
  "data": [
    {
      "id": "019a3f2e-7c41-7b8e-9d2a-4f6c1e0b5a77",
      "name": "Website redesign",
      "description": null,
      "status": "ACTIVE",
      "ownerId": "019a3f1d-0b2c-7e11-8a90-2c3d4e5f6a7b",
      "createdAt": "2026-03-04T09:15:00.000Z",
      "updatedAt": "2026-03-04T09:15:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1,
    "hasPrevious": false,
    "hasNext": false
  }
}
```

`description` is present as `null`, not left out. Newest first by default.

## List, filtered and paged

```http
GET /api/projects?search=web&status=ACTIVE&status=ARCHIVED&page=2&limit=10

200 OK
{
  "data": [ ...10 projects... ],
  "pagination": { "page": 2, "limit": 10, "total": 34, "totalPages": 4,
                  "hasPrevious": true, "hasNext": true }
}
```

`status` repeats its key for two values. `search` is case-insensitive plain
text.

## List, sorted

For a list whose query schema declares `sort` with `name` and `createdAt`:

```http
GET /api/projects?sort=name&sort=-createdAt

200 OK
{ "data": [ ...by name, then newest first... ], "pagination": { ... } }
```

## List, nothing matches

```http
GET /api/projects?search=zzz

200 OK
{
  "data": [],
  "pagination": { "page": 1, "limit": 20, "total": 0, "totalPages": 0,
                  "hasPrevious": false, "hasNext": false }
}
```

## List, past the last page

```http
GET /api/projects?page=9

200 OK
{
  "data": [],
  "pagination": { "page": 9, "limit": 20, "total": 34, "totalPages": 2,
                  "hasPrevious": true, "hasNext": false }
}
```

A 200 with the real totals, not a 404, so the client can step back.

## List, bad query

```http
GET /api/projects?limit=500&status=DONE&sort=owner

400 Bad Request
{
  "statusCode": 400,
  "code": "VALIDATION_FAILED",
  "message": "Validation failed",
  "errors": [
    { "path": "limit", "message": "Too big: expected number to be <=100", "code": "too_big" },
    { "path": "status.0", "message": "Invalid option: expected one of \"ACTIVE\"|\"ARCHIVED\"", "code": "invalid_value" },
    { "path": "sort.0", "message": "Invalid option: expected one of \"name\"|\"-name\"|\"createdAt\"|\"-createdAt\"", "code": "invalid_value" }
  ]
}
```

An unknown param (`?_=1712345678`) would be ignored, not listed here.

## Read

```http
GET /api/projects/019A3F2E-7C41-7B8E-9D2A-4F6C1E0B5A77

200 OK
{
  "data": {
    "id": "019a3f2e-7c41-7b8e-9d2a-4f6c1e0b5a77",
    "name": "Website redesign",
    ...
  }
}
```

The id in the path may be any case; the response always has it lowercase.

## Read, not a UUID

```http
GET /api/projects/website-redesign

400 Bad Request
{
  "statusCode": 400,
  "code": "VALIDATION_FAILED",
  "message": "Validation failed",
  "errors": [{ "path": "id", "message": "Invalid UUID", "code": "invalid_format" }]
}
```

## Read, unknown id

```http
GET /api/projects/019a0000-0000-7000-8000-000000000000

404 Not Found
{ "statusCode": 404, "code": "PROJECT_NOT_FOUND", "message": "Project not found" }
```

The domain code, not the generic `NOT_FOUND`, which means no such route.
