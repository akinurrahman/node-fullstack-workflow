# Shared code map

The file-by-file map of `lib/`, `components/ui/` and `systems/`. The rules for
these tiers are in `SKILL.md`. Paths are relative to `apps/web/src`.

```
lib/                          no react
├── api/api.ts                the axios instance: base URL + /api, bearer token,
│                             401 refresh and retry, ApiError interceptor
├── api/api-call.ts           apiCall, apiCallPaginated. The HTTP entry point
├── api/api-error.ts          ApiError, isApiError, getErrorMessage
├── api/access-token.ts       the access token, held in memory only
├── api/auth-refresh.ts       single-flight refresh, handlers registered by auth
├── lookup/create-lookup.ts   createLookup, BadgeVariant
├── reporting/report-error.ts reportError, isUnexpectedError. The one hook for
│                             error monitoring; the route error boundaries and
│                             the query and mutation caches call it
├── format.ts                 formatMoney (minor units), formatNumber, getInitials
├── date.ts                   formatDate, formatDateTime, calendar-date helpers
├── env.ts                    the Zod-checked VITE_* env
├── safe-redirect.ts          safeRedirect for an untrusted ?redirect= path
├── is-empty-value.ts         what a cleared control holds
├── chunk-error.ts            isChunkLoadError, a stale chunk after a deploy
├── platform.ts               isMacPlatform, pageLocation
├── locale.ts                 APP_LOCALE, APP_CURRENCY
└── utils.ts                  cn
components/ui/                shadcn primitives. Dialog, Sheet, AlertDialog,
                              modal-registry, sidebar, table, select, combobox...
systems/                      react-aware, shared, zero domain knowledge
├── api/                      createQueryClient, global mutation error toast
├── confirmation/             confirm() through useConfirm, ConfirmationHost
├── filters/                  defineUrlFilters, useUrlFilters, FilterBar and controls
├── form/                     Form, fields, FormSheet, FormActions, async options
├── router/                   AppRouteObject, RouteHandle, canAccessRoute
├── session/                  useSession: status, user, endedBy. Never the token
├── table/                    DataTable, createColumnHelper, ColumnDef, RowLink
├── theme/                    theme store, ThemeToggle, themeLookup
└── ui/                       PageHeader, LookupBadge, Empty/Error/NotFound/
                              AccessDenied states, PanelSection, RowActions(Menu)
```
