# Example: shared

The `@<scope>/shared` side of the `projects` example. The folder tree is in
`example-overview.md`. How strict each schema is and what the error codes
mean on the wire is `kit:api-conventions`; this file is where they live.

## `packages/shared/src/projects.ts`

```ts
import { z } from 'zod';
import { paginationQuerySchema } from './pagination.js';
import { queryArray } from './query-array.js';
import { hasNoNullChar } from './text.js';

export const PROJECT_ERROR_CODES = {
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  // Sent with a field error on `name`.
  PROJECT_NAME_TAKEN: 'PROJECT_NAME_TAKEN',
} as const;

export const PROJECT_NAME_MAX_LENGTH = 100;
export const PROJECT_DESCRIPTION_MAX_LENGTH = 500;
export const PROJECT_SEARCH_MAX_LENGTH = 100;

export const PROJECT_STATUSES = ['ACTIVE', 'ARCHIVED'] as const;

export const projectStatusSchema = z.enum(PROJECT_STATUSES);

const projectNameSchema = z
  .string({ error: 'Enter a name' })
  .trim()
  .min(1, 'Enter a name')
  .max(
    PROJECT_NAME_MAX_LENGTH,
    `Name must be at most ${PROJECT_NAME_MAX_LENGTH} characters`,
  )
  .refine(hasNoNullChar, 'Name contains a character that is not allowed');

const projectDescriptionSchema = z
  .string()
  .trim()
  .max(
    PROJECT_DESCRIPTION_MAX_LENGTH,
    `Description must be at most ${PROJECT_DESCRIPTION_MAX_LENGTH} characters`,
  )
  .refine(
    hasNoNullChar,
    'Description contains a character that is not allowed',
  );

export const projectIdParamSchema = z.object({ id: z.uuid().toLowerCase() });

export const listProjectsQuerySchema = paginationQuerySchema.extend({
  search: z
    .string()
    .trim()
    .max(PROJECT_SEARCH_MAX_LENGTH)
    .refine(hasNoNullChar, 'Search contains a character that is not allowed')
    .optional(),
  status: queryArray(projectStatusSchema).optional(),
});

export const createProjectSchema = z.strictObject({
  name: projectNameSchema,
  description: projectDescriptionSchema.optional(),
});

// `description: null` clears it.
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
  status: projectStatusSchema,
  ownerId: z.uuid(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type ProjectStatus = z.infer<typeof projectStatusSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
export type CreateProjectInput = z.input<typeof createProjectSchema>;
export type UpdateProjectInput = z.input<typeof updateProjectSchema>;
export type PublicProject = z.infer<typeof publicProjectSchema>;
```

The list query extends `paginationQuerySchema`, so `page` and `limit` come
with their defaults and caps, and the parsed query fits the repository's
`ListProjectsFilter` as is.

The error codes live here, not in the api, so the web branches on the same
constants the service throws.

## `packages/shared/src/index.ts`

```ts
export * from './projects.js';
```

One line added, in alphabetical order with the others. The api and the web
import `@<scope>/shared`, never `@<scope>/shared/projects`.

The shared package is consumed as its built `dist`. When the api cannot see a
new export, build the shared package first.
