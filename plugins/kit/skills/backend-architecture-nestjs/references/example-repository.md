# Example: repository

The repository of the `projects` example. The folder tree is in
`example-overview.md`; the shape and the reasons are in `repositories.md`.

## `src/projects/projects.repository.ts`

```ts
import { Injectable } from '@nestjs/common';
import type { ProjectStatus } from '@<scope>/shared';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma, Project } from '../generated/prisma/client.js';

export interface CreateProjectData {
  name: string;
  description?: string;
  ownerId: string;
}

export interface UpdateProjectData {
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
}

export interface ListProjectsFilter {
  page: number;
  limit: number;
  search?: string;
  status?: ProjectStatus[];
}

// Prisma passes `contains` to ILIKE as is, so % and _ would act as
// wildcards. Backslash is the default LIKE escape character in Postgres.
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

function listWhere({
  search,
  status,
}: ListProjectsFilter): Prisma.ProjectWhereInput {
  const contains = search && escapeLike(search);
  return {
    ...(contains && { name: { contains, mode: 'insensitive' } }),
    ...(status && { status: { in: status } }),
  };
}

@Injectable()
export class ProjectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Project | null> {
    return this.prisma.project.findUnique({ where: { id } });
  }

  findByName(name: string): Promise<Project | null> {
    return this.prisma.project.findUnique({ where: { name } });
  }

  create(data: CreateProjectData): Promise<Project> {
    return this.prisma.project.create({ data });
  }

  update(id: string, data: UpdateProjectData): Promise<Project> {
    return this.prisma.project.update({ where: { id }, data });
  }

  // Newest first; id breaks ties so pages never overlap.
  async list(
    filter: ListProjectsFilter,
  ): Promise<{ items: Project[]; total: number }> {
    const where = listWhere(filter);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.project.count({ where }),
    ]);
    return { items, total };
  }
}
```

`CreateProjectData` and `UpdateProjectData` are the repository's own types,
not the shared input types and not Prisma's. The service fills them field by
field, so a field added to the shared schema does nothing until someone adds
it here and in the service.

`status` is in `UpdateProjectData` but not in the update schema: only the
archive action writes it, and the service decides that.

## What it would take to add a transaction

There is no `transaction()` and no `ProjectsTransaction`. The name check is
a read then a write, but the unique index on `name` already holds under a
race, so a transaction would buy nothing. When a rule appears that only a
lock can hold (users: never leave zero active admins), the queries that run
inside it move out of the class into module-level functions taking
`db: Prisma.TransactionClient`, and the class gains:

```ts
// The reads and writes a service may run inside one transaction.
export interface ProjectsTransaction {
  findById(id: string): Promise<Project | null>;
  update(id: string, data: UpdateProjectData): Promise<Project>;
}

transaction<T>(run: (tx: ProjectsTransaction) => Promise<T>): Promise<T> {
  return this.prisma.$transaction((db) =>
    run({
      findById: (id) => findById(db, id),
      update: (id, data) => update(db, id, data),
    }),
  );
}
```

The plain methods then call the same functions with `this.prisma`. The full
version, with its lock, is `users/users.repository.ts`.
