# Example: mapper and service

The mapper and the service of the `projects` example. The folder tree is in
`example-overview.md`.

## `src/projects/projects.mapper.ts`

```ts
import type { PublicProject } from '@<scope>/shared';
import type { Project } from '../generated/prisma/client.js';

// Lists the public fields one by one, so a column added to the model never
// reaches a response by accident.
export function toPublicProject(project: Project): PublicProject {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    ownerId: project.ownerId,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}
```

The return type is the shared `PublicProject`, so a field the shared schema
gains and the mapper misses is a type error, and a field the mapper adds
that the schema lacks is one too.

## `src/projects/projects.service.ts`

```ts
import { Injectable } from '@nestjs/common';
import {
  type CreateProjectInput,
  type ListProjectsQuery,
  PROJECT_ERROR_CODES,
  type PublicProject,
  type UpdateProjectInput,
} from '@<scope>/shared';
import type { AuthUser } from '../auth/auth.types.js';
import { ConflictError, NotFoundError } from '../common/errors/index.js';
import { paginate, type PaginatedResult } from '../common/pagination/index.js';
import { toPublicProject } from './projects.mapper.js';
import { ProjectsRepository } from './projects.repository.js';

const projectNotFound = () =>
  new NotFoundError(PROJECT_ERROR_CODES.PROJECT_NOT_FOUND, 'Project not found');

const nameTaken = () =>
  new ConflictError(
    PROJECT_ERROR_CODES.PROJECT_NAME_TAKEN,
    'Name is already in use',
    {
      errors: [
        {
          path: 'name',
          message: 'Name is already in use',
          code: PROJECT_ERROR_CODES.PROJECT_NAME_TAKEN,
        },
      ],
    },
  );

@Injectable()
export class ProjectsService {
  constructor(private readonly projects: ProjectsRepository) {}

  async list(
    query: ListProjectsQuery,
  ): Promise<PaginatedResult<PublicProject>> {
    const { items, total } = await this.projects.list(query);
    return paginate(items.map(toPublicProject), total, query);
  }

  async findOne(id: string): Promise<PublicProject> {
    const project = await this.projects.findById(id);
    if (!project) throw projectNotFound();
    return toPublicProject(project);
  }

  // The unique index still backs the name check: a concurrent create with
  // the same name ends in P2002, which the global filter answers with 409.
  async create(
    actor: AuthUser,
    input: CreateProjectInput,
  ): Promise<PublicProject> {
    if (await this.projects.findByName(input.name)) throw nameTaken();
    const project = await this.projects.create({
      name: input.name,
      description: input.description,
      ownerId: actor.id,
    });
    return toPublicProject(project);
  }

  async update(id: string, input: UpdateProjectInput): Promise<PublicProject> {
    const project = await this.projects.findById(id);
    if (!project) throw projectNotFound();
    if (input.name !== undefined && input.name !== project.name) {
      if (await this.projects.findByName(input.name)) throw nameTaken();
    }
    const updated = await this.projects.update(id, {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && {
        description: input.description,
      }),
    });
    return toPublicProject(updated);
  }

  async archive(id: string): Promise<PublicProject> {
    const project = await this.projects.findById(id);
    if (!project) throw projectNotFound();
    if (project.status === 'ARCHIVED') return toPublicProject(project);
    return toPublicProject(
      await this.projects.update(id, { status: 'ARCHIVED' }),
    );
  }
}
```

Every method ends in `toPublicProject`. The repository hands back rows, the
controller gets public shapes, and nothing in between spreads a row.

`create` and `update` build the repository's data field by field. `update`
copies only the fields the caller sent, so an omitted field is left alone and
`description: null` clears it. Passing `input` itself would compile today and
leak tomorrow, the day the shared schema gains a field.

`projectNotFound` and `nameTaken` are module-level factories because each is
thrown from more than one method. A factory, not a constant: an `Error`
carries the stack of where it was made.

`create` takes `actor` because the owner comes from who is calling. `update`
and `archive` do not: they are admin-only by the controller's decorator, and
no rule here depends on which admin acts. Access is never checked in this
file.

Archiving an archived project returns it unchanged, so a retried request is
not an error.
