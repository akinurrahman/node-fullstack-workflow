# Example: DTOs, controller and module

The HTTP side and the wiring of the `projects` example. The folder tree is in
`example-overview.md`. Which status each route answers with is
`kit:api-conventions`; the statuses below are what this example happens to
need.

## `src/projects/projects.dto.ts`

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

## `src/projects/projects.controller.ts`

```ts
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { PublicProject } from '@<scope>/shared';
import { CurrentUser, Roles } from '../auth/auth.decorators.js';
import type { AuthUser } from '../auth/auth.types.js';
import type { PaginatedResult } from '../common/pagination/index.js';
import {
  ApiDataResponse,
  ApiErrorResponses,
  ApiPaginatedResponse,
} from '../common/swagger/index.js';
import {
  CreateProjectDto,
  ListProjectsQueryDto,
  ProjectIdParamDto,
  PublicProjectDto,
  UpdateProjectDto,
} from './projects.dto.js';
import { ProjectsService } from './projects.service.js';

// Any signed-in user reads and creates; renaming and archiving are admin
// only, per route.
@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @ApiPaginatedResponse(PublicProjectDto)
  @ApiErrorResponses(400, 401, 429)
  list(
    @Query() query: ListProjectsQueryDto,
  ): Promise<PaginatedResult<PublicProject>> {
    return this.projects.list(query);
  }

  @Get(':id')
  @ApiDataResponse(PublicProjectDto)
  @ApiErrorResponses(400, 401, 404, 429)
  findOne(@Param() { id }: ProjectIdParamDto): Promise<PublicProject> {
    return this.projects.findOne(id);
  }

  @Post()
  @ApiDataResponse(PublicProjectDto, { status: HttpStatus.CREATED })
  // 403 is the CSRF check, which rejects cross-site writes.
  @ApiErrorResponses(400, 401, 403, 409, 429)
  create(
    @CurrentUser() actor: AuthUser,
    @Body() body: CreateProjectDto,
  ): Promise<PublicProject> {
    return this.projects.create(actor, body);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiDataResponse(PublicProjectDto)
  @ApiErrorResponses(400, 401, 403, 404, 409, 429)
  update(
    @Param() { id }: ProjectIdParamDto,
    @Body() body: UpdateProjectDto,
  ): Promise<PublicProject> {
    return this.projects.update(id, body);
  }

  @Post(':id/archive')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiDataResponse(PublicProjectDto)
  @ApiErrorResponses(400, 401, 403, 404, 429)
  archive(@Param() { id }: ProjectIdParamDto): Promise<PublicProject> {
    return this.projects.archive(id);
  }
}
```

Every handler is one line: the service call. No `if`, no mapping, no
`{ data }`. The DTO classes type the parameters; the service receives them as
the shared input types they structurally are.

No `@Roles()` on the class, because access differs per route. When a whole
controller is admin-only, the decorator goes on the class with a comment
(`UsersController`), so a route added later is admin too.

Every route has a success decorator and `@ApiErrorResponses`, per
`dtos.md`. `ApiTags` groups the routes in the docs.

## `src/projects/projects.module.ts`

```ts
import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller.js';
import { ProjectsRepository } from './projects.repository.js';
import { ProjectsService } from './projects.service.js';

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsRepository, ProjectsService],
})
export class ProjectsModule {}
```

No `imports`: `PrismaService` is global and the module injects nothing from
another one. No `exports`: no other module uses projects yet. When one does,
it gets `exports: [ProjectsService]` with a comment naming the caller.

## `src/app.module.ts`

```ts
import { ProjectsModule } from './projects/projects.module.js';

@Module({
  imports: [
    // ...config, logger, throttler
    PrismaModule,
    HealthModule,
    UsersModule,
    AuthModule,
    ProjectsModule,
  ],
  // ...global guards, pipe, filter, interceptor unchanged
})
export class AppModule {}
```

One import and one entry. Routes land under `/api/projects` through the
global prefix; nothing else in `app.module.ts` or `main.ts` changes.
