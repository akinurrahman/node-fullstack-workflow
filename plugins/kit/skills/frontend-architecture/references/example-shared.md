# Example: shared pieces

The shared code the `academic` example leans on. The folder tree is in `example-overview.md`.

## Shared pieces this feature leans on

Read these when something upstream needs changing. Do not reimplement any of
them inside a feature.

### `lib/api/api-call.ts`

The single HTTP entry point, on the axios instance in `lib/api/api.ts`
(`baseURL` is `VITE_API_BASE_URL` plus `/api`; the Vite dev server proxies
`/api` to the API).

```ts
export type ApiCallOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  params?: QueryParams;
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

export async function apiCall<T extends {} | null>(
  endpoint: string,
  options?: ApiCallOptions,
): Promise<T>;
export async function apiCallEmpty(
  endpoint: string,
  options?: ApiCallOptions,
): Promise<void>;
export async function apiCallPaginated<T, S = undefined>(
  endpoint: string,
  options?: ApiCallOptions,
): Promise<PaginatedResponse<T, S>>;
```

`apiCall` unwraps `{ data }`; `T` excludes `undefined`, so an endpoint that
answers 204 uses `apiCallEmpty`. `apiCallPaginated` checks for `data` as an
array and a valid `pagination`. Each throws an `ApiError` with code
`BAD_RESPONSE` for a body that does not match.

### `lib/api/api-error.ts`

`ApiError` (`status`, `code`, `message`, `fieldErrors`, `retryAfter`), `isApiError`, and
`getErrorMessage`, which keeps a 4xx message and gives safe copy for 5xx,
network and malformed responses. `ErrorState` and `Form` both use it.

### `systems/api/query-client.ts`

`createQueryClient()` sets the defaults so features never repeat them (queries:
`staleTime` 30 seconds, up to two retries except on a 4xx, refetch on window
focus; mutations: no retry), plus one global error toast so no mutation fails
silently. That toast skips a mutation with its own `onError` or
`meta: { handledError: true }`, and any error something already showed. A
per-call `mutate(values, { onError })` does not skip it. Its `QueryCache` toasts a refetch that fails while
data is on screen, once per message; a first load that fails is left to the
page's `ErrorState`.

### `systems/ui/lookup-badge.tsx`

The one place a lookup value becomes badge JSX, so features never write a
per-enum badge component.

```tsx
<LookupBadge lookup={classStatusLookup} value={row.status} showIcon={false} />
```

### `systems/filters/`

`defineUrlFilters` builds the spec, `useUrlFilters` reads and writes it. Between
them they own param aliasing, enum whitelisting, number clamping, list params,
page reset on narrowing writes, and `isFiltered`. A page never touches
`useSearchParams` directly.

The hook returns `filters`, `defaults`, `criteria`, `isFiltered`, `setFilter`,
`setFilters`, `applyCriteria`, `resetFilters` and `searchParams`. `criteria` is
the slice a saved preset stores, which is the filters minus anything marked
`transient`.
