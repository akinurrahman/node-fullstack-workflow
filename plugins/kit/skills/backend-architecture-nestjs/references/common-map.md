# Shared api code map

The file-by-file map of `common/`, `config/`, `database/` and the parts of
`auth/` other modules use. Paths are relative to `apps/api/src`. Read it before
writing a helper that may already exist.

```
common/
├── errors/                  AppError and the per-status subclasses. No Nest imports
├── filters/
│   └── all-exceptions.filter.ts  the one APP_FILTER; toErrorResponse for code outside Nest
├── interceptors/
│   └── response.interceptor.ts   the one APP_INTERCEPTOR; wraps successful returns
├── pagination/              paginate(), PaginatedResult, PaginationQueryDto (lists with no filters)
├── swagger/                 ApiDataResponse, ApiPaginatedResponse, ApiErrorResponses,
│                            docs-only DTOs for the pagination meta and the error body
├── middleware/              basicAuth for the Swagger docs, a plain Express middleware
└── reporting/report-error.ts reportError, the one hook for error monitoring (a no-op)
config/
├── env.schema.ts            envSchema, Env, validateEnv
├── app.config.ts            configureApp: everything before listen, shared with e2e
├── http.config.ts           logger, trust proxy, /api prefix, helmet, CORS, CSRF
├── swagger.config.ts        the docs document and route
├── logger.config.ts         pino options, request id, redaction
├── error-serializer.ts      how errors are written to the log
├── pretty-transport.ts      dev log formatting
└── throttler.config.ts      RATE_LIMIT
database/
├── prisma.module.ts         @Global(), provides and exports PrismaService
└── prisma.service.ts        PrismaClient on the pg adapter; connects and pings at init
auth/
├── auth.decorators.ts       Public, Roles, CurrentUser
├── auth.types.ts            AuthUser, AuthenticatedRequest
├── auth.guard.ts            AuthGuard (global)
├── roles.guard.ts           RolesGuard (global)
├── password.module.ts       PasswordModule, exports PasswordService
└── keyed-throttler.guard.ts a route's own rate limit keyed on something other than
                             the IP, added with @UseGuards on top of the global one
```

A module imports from `common/` and `auth/` through these files. `common/`,
`config/` and `database/` never import a domain module.
