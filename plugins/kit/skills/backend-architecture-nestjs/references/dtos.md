# DTOs and endpoint docs

Detail for rule 6 in `SKILL.md`. Paths are relative to `apps/api/src`. How
strict a request schema is, and what a field error looks like, is
`kit:api-conventions`.

## Where the schema lives

| Lives in `@<scope>/shared`                              | Lives in the api                            |
| ------------------------------------------------------- | ------------------------------------------- |
| request schemas (body, query, params), response schemas | `createZodDto` classes in `<module>.dto.ts` |
| inferred types (`CreateProjectInput`, `PublicProject`)  | `paginate()`, `PaginatedResult`             |
| `<DOMAIN>_ERROR_CODES`, max lengths, enums              | anything touching Nest, Prisma or Express   |

The shared package imports only `zod`. Everything public goes through its
`src/index.ts`. A new schema file there is added to that index.

## The DTO file

```ts
import {
  createProjectSchema,
  listProjectsQuerySchema,
  projectIdParamSchema,
  publicProjectSchema,
  updateProjectSchema,
} from '@<scope>/shared';
import { createZodDto } from 'nestjs-zod';

export class PublicProjectDto extends createZodDto(publicProjectSchema) {}

export class ProjectIdParamDto extends createZodDto(projectIdParamSchema) {}

export class ListProjectsQueryDto extends createZodDto(
  listProjectsQuerySchema,
) {}

export class CreateProjectDto extends createZodDto(createProjectSchema) {}

export class UpdateProjectDto extends createZodDto(updateProjectSchema) {}
```

One line per class, nothing else. The response DTO exists for the docs only.

## How the controller uses them

- Body: `@Body() body: CreateProjectDto`.
- Params: `@Param() { id }: ProjectIdParamDto`, one object schema for all
  route params.
- Query: a list with no filters takes `PaginationQueryDto` from
  `common/pagination`, over `paginationQuerySchema` as is. The first filter
  gets its own `paginationQuerySchema.extend({ ...filters })` and
  `List<Entities>QueryDto` (`ListProjectsQueryDto`). Never an empty
  `extend({})`.

The global `ZodValidationPipe` (`APP_PIPE` in `app.module.ts`) parses each of
them. The handler receives the parsed output, defaults and transforms
applied.

## Every endpoint is documented

Every route carries one success decorator and one error decorator from
`common/swagger`:

| Returns                 | Decorator                                                       |
| ----------------------- | --------------------------------------------------------------- |
| one record or an array  | `@ApiDataResponse(PublicProjectDto)` or `([PublicProjectDto])`  |
| a `paginate()` result   | `@ApiPaginatedResponse(PublicProjectDto)`                       |
| nothing                 | `@ApiNoContentResponse({ description })` from `@nestjs/swagger` |
| any of them, on failure | `@ApiErrorResponses(...statuses)`                               |

Pass `{ status }` for a success status other than 200 and `{ description }`
when the route has a side effect a caller must know about ("Revokes all
sessions of the user."). These decorators describe the body after the
interceptor and the filter have shaped it. Which statuses to list is
`kit:api-conventions`. The controller class also carries
`@ApiTags('<module>')`.
