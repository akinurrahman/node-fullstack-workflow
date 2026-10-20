# Example: tests

Where the `projects` tests sit and how they are wired. The folder tree is in
`example-overview.md`. Which cases to write is `kit:testing-standards`: the
`it` blocks below show the wiring, not a required list.

## `src/projects/projects.service.spec.ts`

```ts
import type { AuthUser } from '../auth/auth.types.js';
import type { Project } from '../generated/prisma/client.js';
import type { ProjectsRepository } from './projects.repository.js';
import { ProjectsService } from './projects.service.js';

const PROJECT: Project = {
  id: '019a0000-0000-7000-8000-0000000000a1',
  name: 'Apollo',
  description: null,
  status: 'ACTIVE',
  ownerId: '019a0000-0000-7000-8000-00000000000a',
  createdAt: new Date('2026-10-12T10:00:00.000Z'),
  updatedAt: new Date('2026-10-12T10:00:00.000Z'),
};

const ACTOR: AuthUser = {
  id: PROJECT.ownerId,
  sessionId: 'session',
  role: 'USER',
};

function setup(projects: Project[]) {
  const repository = {
    findById: vi.fn((id: string) =>
      Promise.resolve(projects.find((p) => p.id === id) ?? null),
    ),
    findByName: vi.fn((name: string) =>
      Promise.resolve(projects.find((p) => p.name === name) ?? null),
    ),
    create: vi.fn((data: Partial<Project>) =>
      Promise.resolve({ ...PROJECT, ...data }),
    ),
    update: vi.fn((id: string, data: Partial<Project>) =>
      Promise.resolve({ ...projects.find((p) => p.id === id)!, ...data }),
    ),
  };
  const service = new ProjectsService(
    repository as unknown as ProjectsRepository,
  );
  return { service, repository };
}

describe('ProjectsService.create', () => {
  it('answers a taken name with a conflict', async () => {
    const { service, repository } = setup([PROJECT]);

    await expect(
      service.create(ACTOR, { name: PROJECT.name }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'PROJECT_NAME_TAKEN' });
    expect(repository.create).not.toHaveBeenCalled();
  });
});
```

The service is built with `new`, its repository a plain object of `vi.fn`s
cast to the class. No `Test.createTestingModule`, no `PrismaService`, no
database: the spec runs in milliseconds and cannot leak state.

Fixtures are typed with the Prisma model, through `import type`, so a column
added to the model breaks the fixture at compile time instead of at runtime.
Errors are asserted on `statusCode` and `code`, the fields the filter reads.

When the repository has a transaction, the stub's `transaction` runs the
callback with the same stubs, typed with `satisfies <Entities>Transaction`
(`users/users.service.spec.ts`).

## `test/projects.e2e-spec.ts`

```ts
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import type { PrismaService } from './../src/database/prisma.service.js';
import { createApp, createUser, loginCookie } from './auth-helpers.js';
import { readTestDatabaseUrl, truncateAppTables } from './test-db.js';

let app: NestExpressApplication;
let prisma: PrismaService;

beforeEach(async () => {
  await truncateAppTables(readTestDatabaseUrl());
  ({ app, prisma } = await createApp());
});

afterEach(async () => {
  await app.close();
  vi.unstubAllEnvs();
});

const api = () => request(app.getHttpServer());

async function signIn(role: 'USER' | 'ADMIN') {
  const user = await createUser(prisma, { role });
  const { accessToken } = await loginCookie(app, user.email);
  return { user, headers: { Authorization: `Bearer ${accessToken}` } };
}

describe('POST /api/projects', () => {
  it('sets the caller as owner', async () => {
    const { user, headers } = await signIn('USER');

    await api()
      .post('/api/projects')
      .set(headers)
      .send({ name: 'Apollo' })
      .expect(201);

    const row = await prisma.project.findUniqueOrThrow({
      where: { name: 'Apollo' },
    });
    expect(row.ownerId).toBe(user.id);
  });
});
```

`createApp()` boots the real `AppModule` through `configureApp`, so the
request passes the same prefix, guards, pipe, filter and interceptor as in
production. Tables are truncated before each test, and the spec closes the
app after each. `prisma` from `createApp()` is for arranging and checking
rows in the spec; module code never gets it.

Users are created straight through `createUser(prisma, ...)`, then signed in
through the real login route, so `@Roles()` routes see a live session.
