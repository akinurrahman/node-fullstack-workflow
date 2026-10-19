# Tables

Detail for the table rules in `SKILL.md`.

## Columns

```tsx
const helper = createColumnHelper<ClassListItem>();

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
  helper.accessor('fee', {
    header: 'Fee',
    meta: { align: 'right' },
    cell: (info) => formatMoney(info.getValue()),
  }),
  helper.accessor('remarks', { header: 'Remarks', meta: { hideBelow: 'md' } }),
]);
```

`DataTable` calls `cell` and `header` renderers as functions inside a stable
component, so columns rebuilt on every render keep their cells mounted, and a
renderer may call hooks.

## `DataTable` on a list page

`DataTable` wiring on a list page:

```tsx
<DataTable
  label="Classes"
  columns={columns}
  data={data?.data ?? []}
  isLoading={isLoading}
  isFetching={isFetching}
  pagination={data?.pagination}
  onPageChange={(page) => setFilter('page', page)}
  onLimitChange={(limit) => setFilter('limit', limit)}
  emptyState={<EmptyState icon={School} title="No classes" description="..." />}
/>
```

`label` is the table's accessible name.

## Height

The table sizes itself to the viewport through `--table-offset`. The shell's
default fits the standard list page: a `PageHeader` with a description, a
`FilterBar` and the pagination row. A page with different chrome above or below
the table sets its own value on a wrapper, e.g.
`[--table-offset:calc(var(--header-height)+2*var(--page-padding)+16rem)]`.
