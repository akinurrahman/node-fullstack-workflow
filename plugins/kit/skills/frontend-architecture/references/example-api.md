# Example: api

The api objects, queries and mutations of the `academic` example. The folder tree is in `example-overview.md`.

## Class: API layer

### `api/class.api.ts`

```ts
import type { PaginatedResponse } from '@<scope>/shared';
import { apiCall, apiCallEmpty, apiCallPaginated } from '@/lib/api/api-call';
import type { ClassFormValues } from '../definitions/class.schema';
import type {
  ClassDetail,
  ClassFilters,
  ClassListItem,
} from '../definitions/class.types';

export const classApi = {
  getList: (
    filters: ClassFilters,
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<ClassListItem>> =>
    apiCallPaginated<ClassListItem>('/academic/classes', {
      params: filters,
      signal,
    }),

  getById: (id: string, signal?: AbortSignal) =>
    apiCall<ClassDetail>(`/academic/classes/${id}`, { signal }),

  create: (payload: ClassFormValues) =>
    apiCall<ClassDetail>('/academic/classes', {
      method: 'POST',
      body: payload,
    }),

  update: (id: string, payload: ClassFormValues) =>
    apiCall<ClassDetail>(`/academic/classes/${id}`, {
      method: 'PATCH',
      body: payload,
    }),

  remove: (id: string) =>
    apiCallEmpty(`/academic/classes/${id}`, { method: 'DELETE' }),
};
```

`apiCall` strips the `{ data }` envelope, so `getById` resolves to a
`ClassDetail`, never `{ data: ClassDetail }`. A list keeps its
`{ data, pagination }` shape as a `PaginatedResponse`, which `DataTable` reads
directly. A 204 resolves to `undefined`.

### `api/class.queries.ts`

```ts
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CLASS_KEYS } from '../definitions/class.constants';
import type { ClassFilters } from '../definitions/class.types';
import { classApi } from './class.api';

export function useClassList(filters: ClassFilters) {
  return useQuery({
    queryKey: CLASS_KEYS.list(filters),
    queryFn: ({ signal }) => classApi.getList(filters, signal),
    placeholderData: keepPreviousData,
  });
}

export function useClass(id: string) {
  return useQuery({
    queryKey: CLASS_KEYS.detail(id),
    queryFn: ({ signal }) => classApi.getById(id, signal),
    enabled: Boolean(id),
  });
}
```

`keepPreviousData` keeps the previous page on screen, dimmed by `DataTable`'s
`isFetching`, while the next one loads, so the table does not empty out on every
page change. `staleTime` comes from `createQueryClient` (30 seconds).

The options object sits inside the hook. Lift it into a `classQueries.detail(id)`
factory the day you need `prefetchQuery`, `ensureQueryData`, or a typed
`getQueryData`. Until then the factory is a layer with one caller.

### `api/class.mutations.ts`

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CLASS_KEYS } from '../definitions/class.constants';
import type { ClassFormValues } from '../definitions/class.schema';
import { classApi } from './class.api';

export function useCreateClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: ClassFormValues) => classApi.create(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLASS_KEYS.lists() });
      toast.success('Class created');
    },
  });
}

export function useUpdateClass(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: ClassFormValues) => classApi.update(id, values),
    onSuccess: (updated) => {
      queryClient.setQueryData(CLASS_KEYS.detail(id), updated);
      void queryClient.invalidateQueries({ queryKey: CLASS_KEYS.lists() });
      toast.success('Class updated');
    },
  });
}

export function useDeleteClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => classApi.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: CLASS_KEYS.detail(id) });
      void queryClient.invalidateQueries({ queryKey: CLASS_KEYS.lists() });
      toast.success('Class deleted');
    },
  });
}
```

Update patches the detail cache and marks lists stale, so every component
reading `useClass(id)` updates at once without a refetch. No `onError` anywhere:
the global `MutationCache` toast covers it, and stays quiet for errors a `Form`
already put on screen. `void` marks the invalidation as deliberately not
awaited, which Oxlint's `no-floating-promises` requires.

---

## Subject: the second entity

Same shape. Only the parts that differ from class are worth reading.

### `api/subject.api.ts`

```ts
import { apiCall, apiCallEmpty, apiCallPaginated } from '@/lib/api/api-call';
import type { SubjectFormValues } from '../definitions/subject.schema';
import type {
  SubjectDetail,
  SubjectFilters,
  SubjectListItem,
  SubjectOptionsQuery,
} from '../definitions/subject.types';

export const subjectApi = {
  getList: (filters: SubjectFilters, signal?: AbortSignal) =>
    apiCallPaginated<SubjectListItem>('/academic/subjects', {
      params: filters,
      signal,
    }),

  getOptions: (query: SubjectOptionsQuery, signal?: AbortSignal) =>
    apiCallPaginated<SubjectListItem>('/academic/subjects/options', {
      params: query,
      signal,
    }),

  getById: (id: string, signal?: AbortSignal) =>
    apiCall<SubjectDetail>(`/academic/subjects/${id}`, { signal }),

  create: (payload: SubjectFormValues) =>
    apiCall<SubjectDetail>('/academic/subjects', {
      method: 'POST',
      body: payload,
    }),

  update: (id: string, payload: SubjectFormValues) =>
    apiCall<SubjectDetail>(`/academic/subjects/${id}`, {
      method: 'PATCH',
      body: payload,
    }),

  remove: (id: string) =>
    apiCallEmpty(`/academic/subjects/${id}`, { method: 'DELETE' }),
};
```

### `api/subject.queries.ts`

```ts
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fromPaginated, type AsyncOptionsSource } from '@/systems/form';
import { SUBJECT_KEYS } from '../definitions/subject.constants';
import type { SubjectFilters } from '../definitions/subject.types';
import { subjectApi } from './subject.api';

export function useSubjectList(filters: SubjectFilters) {
  return useQuery({
    queryKey: SUBJECT_KEYS.list(filters),
    queryFn: ({ signal }) => subjectApi.getList(filters, signal),
    placeholderData: keepPreviousData,
  });
}

export function useSubject(id: string) {
  return useQuery({
    queryKey: SUBJECT_KEYS.detail(id),
    queryFn: ({ signal }) => subjectApi.getById(id, signal),
    enabled: Boolean(id),
  });
}

export const subjectOptionsSource: AsyncOptionsSource = {
  queryKey: SUBJECT_KEYS.options(),
  fetch: async ({ search, page, limit, signal }) =>
    fromPaginated(
      await subjectApi.getOptions(
        { search: search || undefined, page, limit },
        signal,
      ),
      (subject) => ({ value: subject.id, label: subject.name }),
    ),
};
```

`getOptions` is its own endpoint and its own key. Do not feed a picker from the
paginated list query or it will only ever show page one. The source is a plain
object, not a hook: `Field.AsyncSelect`, `FilterAsyncSelect` and a popover
`asyncSelect` each run it through `useInfiniteQuery`, searched and paged on the
server, keyed under `SUBJECT_KEYS.options()`. A cascade child reads its parents
from `parentValues` and passes them as params.

`subjectOptionsSource` is consumed by `class-form.tsx` and by any subject
filter. Same key prefix, one cache.

### `api/subject.mutations.ts`

Identical to class, with one addition. Creating or renaming a subject changes
what the class form picker shows, so the options key gets invalidated too.

```ts
export function useCreateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: SubjectFormValues) => subjectApi.create(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SUBJECT_KEYS.lists() });
      void queryClient.invalidateQueries({ queryKey: SUBJECT_KEYS.options() });
      toast.success('Subject created');
    },
  });
}
```
