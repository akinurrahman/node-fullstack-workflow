# Example: pages

The list page and form page of the `academic` example, with the columns and filters inline. The folder tree is in `example-overview.md`.

## Class: pages

### `pages/classes/class-list-page.tsx`

Filter state comes from `useUrlFilters(CLASS_FILTER_SPEC)`. The page never
parses a search param, never casts one to an enum, and never resets paging by
hand: a write that narrows the result set clears the page cursor inside the
hook, so a new search cannot land the user on an empty page 7.

`isFiltered` is false while every field sits on its default, which is what keeps
"Clear filters" hidden on a pristine screen.

Columns are inline. Split them into `components/classes/class-columns.tsx` once
the array outgrows the page, roughly eight columns or a page over 150 lines.

```tsx
import { Plus, School, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/format';
import { useConfirm } from '@/systems/confirmation';
import {
  FilterBar,
  FilterSelect,
  SearchInput,
  useUrlFilters,
} from '@/systems/filters';
import { createColumnHelper, DataTable, RowLink } from '@/systems/table';
import {
  EmptyState,
  ErrorState,
  LookupBadge,
  PageHeader,
  RowActions,
} from '@/systems/ui';
import { useDeleteClass } from '../../api/class.mutations';
import { useClassList } from '../../api/class.queries';
import { CLASS_FILTER_SPEC } from '../../definitions/class.constants';
import { classStatusLookup } from '../../definitions/class.lookup';
import type { ClassListItem } from '../../definitions/class.types';

const helper = createColumnHelper<ClassListItem>();

export default function ClassListPage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { filters, setFilter, isFiltered, resetFilters } =
    useUrlFilters(CLASS_FILTER_SPEC);
  const { data, error, isLoadingError, isLoading, isFetching, refetch } =
    useClassList(filters);
  const deleteClass = useDeleteClass();

  const columns = helper.columns([
    helper.accessor('name', {
      header: 'Class',
      meta: { sticky: 'left', size: 200 },
      cell: (info) => (
        <RowLink to={`/academic/classes/${info.row.original.id}/edit`}>
          {info.getValue()}
        </RowLink>
      ),
    }),
    helper.accessor('status', {
      header: 'Status',
      cell: (info) => (
        <LookupBadge lookup={classStatusLookup} value={info.getValue()} />
      ),
    }),
    helper.accessor('sectionCount', {
      header: 'Sections',
      meta: { align: 'right', hideBelow: 'md' },
    }),
    helper.accessor('monthlyFee', {
      header: 'Monthly fee',
      meta: { align: 'right' },
      cell: (info) => formatMoney(info.getValue()),
    }),
    helper.display({
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <RowActions
          subject={row.original.name}
          onEdit={() =>
            void navigate(`/academic/classes/${row.original.id}/edit`)
          }
          onDelete={() =>
            confirm({
              title: `Delete ${row.original.name}?`,
              description: 'Its sections and timetable go with it.',
              variant: 'destructive',
              onConfirm: () => deleteClass.mutateAsync(row.original.id),
            })
          }
        />
      ),
    }),
  ]);

  if (isLoadingError)
    return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <>
      <PageHeader title="Classes" description="Every class this year." />

      <FilterBar
        isFiltered={isFiltered}
        onReset={resetFilters}
        actions={
          <Button onClick={() => void navigate('/academic/classes/new')}>
            <Plus />
            New class
          </Button>
        }
      >
        <SearchInput
          value={filters.search}
          onChange={(value) => setFilter('search', value)}
          placeholder="Search classes"
        />
        <FilterSelect
          value={filters.status}
          onChange={(value) => setFilter('status', value)}
          options={classStatusLookup.options}
          placeholder="Status"
          allLabel="All statuses"
        />
      </FilterBar>

      <DataTable
        label="Classes"
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        isFetching={isFetching}
        pagination={data?.pagination}
        onPageChange={(page) => setFilter('page', page)}
        onLimitChange={(limit) => setFilter('limit', limit)}
        emptyState={
          isFiltered ? (
            <EmptyState
              icon={School}
              title="No classes match"
              description="Nothing fits these filters."
              action={
                <Button variant="outline" onClick={resetFilters}>
                  <X />
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={School}
              title="No classes yet"
              description="Create the first one."
            />
          )
        }
      />
    </>
  );
}
```

`SearchInput` owns its own debounce, so every list page in the app gets the same
behaviour. Changing several filters at once goes through `setFilters({ ... })`,
which is one navigation rather than three. Every filter write replaces the
current history entry, so filters never add history: Back leaves the list
rather than stepping through earlier searches.

A filtered list that comes back empty offers "Clear filters" right in the
empty state, which calls `resetFilters` and so clears paging too. An empty
list with nothing filtered offers the next step instead, never a clear.

The page owns the error state, and only for a load that never succeeded:
`isLoadingError`, not `isError`, so a failed refetch leaves the rows on screen
and the global query toast reports it. Loading and empty belong to
`DataTable`, so do not render an empty state above a table that already has
one. `onConfirm`
returns the delete's promise, so the confirm dialog shows its pending state and
stays open if the delete fails while the global toast reports why.

### `pages/classes/class-form-page.tsx`

One route file serving `/new` and `/:id/edit`. Splitting into two small
components inside the file keeps the create path free of loading checks and
avoids narrowing gymnastics on a possibly undefined record.

```tsx
import { useNavigate, useParams } from 'react-router';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, NotFoundState, PageHeader } from '@/systems/ui';
import { useClass } from '../../api/class.queries';
import { ClassForm } from '../../components/classes/class-form';

export default function ClassFormPage() {
  const { id } = useParams();
  return id ? <EditClass id={id} /> : <CreateClass />;
}

function CreateClass() {
  const navigate = useNavigate();
  const back = () => void navigate('/academic/classes');

  return (
    <>
      <PageHeader title="New class" />
      <ClassForm onSuccess={back} onCancel={back} />
    </>
  );
}

function EditClass({ id }: { id: string }) {
  const navigate = useNavigate();
  const back = () => void navigate('/academic/classes');
  const {
    data: classItem,
    error,
    isLoadingError,
    isLoading,
    refetch,
  } = useClass(id);

  if (isLoadingError)
    return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (isLoading) {
    return (
      <output aria-label="Loading class" className="block">
        <Skeleton className="h-96 w-full max-w-2xl" />
      </output>
    );
  }
  if (!classItem) return <NotFoundState />;

  return (
    <>
      <PageHeader title={`Edit ${classItem.name}`} />
      <ClassForm initialData={classItem} onSuccess={back} onCancel={back} />
    </>
  );
}
```

A 404 from `getById` arrives as an `ApiError` with `status` 404. Show it as
`NotFoundState` by checking `error.status` before `ErrorState` when the screen
needs that distinction.

---

## Subject: the second entity

Same shape. Only the parts that differ from class are worth reading.

`components/subjects/subject-form.tsx`, `pages/subjects/subject-list-page.tsx`
and `subject-form-page.tsx` follow the class files exactly, swapping the hooks,
lookup, spec, keys and paths. A subject form small enough for a side panel can
open in a `FormSheet` from the list page instead of its own route.
