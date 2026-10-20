# Example: overview

The examples use the `projects` resource, the same one
`kit:backend-architecture-nestjs` builds, plus the template's `users` and
`auth` routes where `projects` has no case to show (an action that answers
204, a conflict about state). They are HTTP only: what any backend must send
and what the web may rely on.

Each pair shows the request line, the headers that matter, the body if any,
then the status line and the body. `Authorization: Bearer <token>` is left
out unless the example is about it. Ids, dates and request ids are
illustrative.

## The resource

```ts
// @<scope>/shared
export const PROJECT_ERROR_CODES = {
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  PROJECT_NAME_TAKEN: 'PROJECT_NAME_TAKEN',
} as const;

export const projectIdParamSchema = z.object({ id: z.uuid().toLowerCase() });

export const listProjectsQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(100).optional(),
  status: queryArray(projectStatusSchema).optional(),
});

export const createProjectSchema = z.strictObject({
  name: projectNameSchema,
  description: projectDescriptionSchema.optional(),
});

export const updateProjectSchema = z
  .strictObject({
    name: projectNameSchema.optional(),
    description: projectDescriptionSchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export const publicProjectSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  status: projectStatusSchema, // 'ACTIVE' | 'ARCHIVED'
  ownerId: z.uuid(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
```

Abridged; the full file is `example-shared.md` in
`kit:backend-architecture-nestjs`. These schemas are the contract: the
backend validates with them and the web types its calls with them.

## The routes

| Method   | Path                        | Access    | Success        |
| -------- | --------------------------- | --------- | -------------- |
| `GET`    | `/api/projects`             | signed in | 200 paginated  |
| `GET`    | `/api/projects/:id`         | signed in | 200 `{ data }` |
| `POST`   | `/api/projects`             | signed in | 201 `{ data }` |
| `PATCH`  | `/api/projects/:id`         | admin     | 200 `{ data }` |
| `POST`   | `/api/projects/:id/archive` | admin     | 200 `{ data }` |
| `DELETE` | `/api/projects/:id`         | admin     | 204            |

The Nest example builds no `DELETE`; it is here to show the shape one takes.

## The files

| File                | Holds                                                                       |
| ------------------- | --------------------------------------------------------------------------- |
| `example-reads.md`  | list, filters, sort, empty and past-the-end pages, read, bad and unknown id |
| `example-writes.md` | create, update, clearing a field, delete, an action, an action with 204     |
| `example-errors.md` | every error kind a client can see, in full                                  |
