# Example: definitions

The lookups, types, constants and schemas of the `academic` example. The folder tree is in `example-overview.md`.

## Class: definitions

### `definitions/class.lookup.ts`

```ts
import { createLookup } from '@/lib/lookup/create-lookup';

export const classStatusLookup = createLookup(
  {
    active: { label: 'Active', badgeVariant: 'success' },
    archived: { label: 'Archived', badgeVariant: 'secondary' },
  },
  'ClassStatus',
);

export type ClassStatus = (typeof classStatusLookup.values)[number];
```

The second argument names the lookup in the dev warning `resolve()` prints for
a value the API sent but the lookup does not know yet.

### `definitions/class.types.ts`

```ts
import type { ClassStatus } from './class.lookup';

export type { ClassStatus };

export type ClassListItem = {
  id: string;
  name: string;
  numericLevel: number;
  status: ClassStatus;
  sectionCount: number;
  studentCount: number;
  // Minor units, as the API sends money.
  monthlyFee: number;
};

export type ClassDetail = ClassListItem & {
  subjectIds: string[];
  subjects: { id: string; name: string }[];
  remarks: string | null;
};

export type ClassFilters = {
  search?: string;
  status?: ClassStatus;
  page: number;
  limit: number;
};
```

### `definitions/class.constants.ts`

Two things live here: the query keys and the filter spec.

`defineUrlFilters` needs an entry for every key of `ClassFilters`, so adding a
filter to the type fails to compile until it says how it is read. `values` takes
the lookup's `.values`, which is what stops a hand-edited `?status=BANANA` from
reaching the API wearing the type of a real enum member. `pagingSpec` covers
`page` and `limit`, clamped to the API's `MAX_PAGE_LIMIT`.

```ts
import { defineUrlFilters, pagingSpec } from '@/systems/filters';
import { classStatusLookup } from './class.lookup';
import type { ClassFilters } from './class.types';

export const CLASS_KEYS = {
  all: ['academic', 'classes'] as const,
  lists: () => [...CLASS_KEYS.all, 'list'] as const,
  list: (filters: ClassFilters) => [...CLASS_KEYS.lists(), filters] as const,
  details: () => [...CLASS_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...CLASS_KEYS.details(), id] as const,
};

export const CLASS_FILTER_SPEC = defineUrlFilters<ClassFilters>({
  search: {},
  status: { values: classStatusLookup.values },
  ...pagingSpec(20),
});
```

The spec is a module-level constant. Declaring it inline in the page would
build a new object every render, and it flows into the query key.

Subjects get their own `SUBJECT_KEYS`. One shared `ACADEMIC_KEYS` object with
entities nested under it means invalidating a class refetches every subject.

### `definitions/class.schema.ts`

```ts
import { z } from 'zod';
import { classStatusLookup } from './class.lookup';

export const classFormSchema = z.object({
  name: z.string().min(1, 'Enter a class name'),
  numericLevel: z.number({ error: 'Enter a level' }).int().min(1).max(20),
  status: classStatusLookup.toZodEnum('Pick a status'),
  subjectIds: z.array(z.string()).min(1, 'Pick at least one subject'),
  remarks: z.string(),
});

export type ClassFormInput = z.input<typeof classFormSchema>;
export type ClassFormValues = z.output<typeof classFormSchema>;
```

`Field.Input type="number"` hands the form a number, or `undefined` when empty,
so the schema takes `z.number()` and the required message fires instead of a
coerced 0. `Form` seeds strings, enums and arrays with their empty value, so
`remarks` needs no `.optional()` to start blank.

---

## Subject: the second entity

Same shape. Only the parts that differ from class are worth reading.

### `definitions/subject.types.ts`

```ts
import type { SubjectType } from './subject.lookup';

export type { SubjectType };

export type SubjectListItem = {
  id: string;
  name: string;
  code: string;
  type: SubjectType;
};

export type SubjectDetail = SubjectListItem & {
  description: string | null;
};

export type SubjectFilters = {
  search?: string;
  type?: SubjectType;
  page: number;
  limit: number;
};

export type SubjectOptionsQuery = {
  search?: string;
  page: number;
  limit: number;
};
```

### `definitions/subject.constants.ts`

```ts
import { defineUrlFilters, pagingSpec } from '@/systems/filters';
import { subjectTypeLookup } from './subject.lookup';
import type { SubjectFilters } from './subject.types';

export const SUBJECT_KEYS = {
  all: ['academic', 'subjects'] as const,
  lists: () => [...SUBJECT_KEYS.all, 'list'] as const,
  list: (filters: SubjectFilters) =>
    [...SUBJECT_KEYS.lists(), filters] as const,
  details: () => [...SUBJECT_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...SUBJECT_KEYS.details(), id] as const,
  options: () => [...SUBJECT_KEYS.all, 'options'] as const,
};

export const SUBJECT_FILTER_SPEC = defineUrlFilters<SubjectFilters>({
  search: {},
  type: { values: subjectTypeLookup.values },
  ...pagingSpec(20),
});
```
