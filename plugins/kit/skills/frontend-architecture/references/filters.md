# Filters

Detail for the filter rules in `SKILL.md`.

## The spec and the hook

```ts
export const CLASS_FILTER_SPEC = defineUrlFilters<ClassFilters>({
  search: {},
  status: { values: classStatusLookup.values },
  ...pagingSpec(20),
});
```

```tsx
const { filters, setFilter, isFiltered, resetFilters } =
  useUrlFilters(CLASS_FILTER_SPEC);
```

A narrowing write clears the page cursor inside the hook.

## History

| Write                                                 | History | So                                           |
| ----------------------------------------------------- | ------- | -------------------------------------------- |
| Typed search (`SearchInput`)                          | replace | no entry per keystroke or per debounced term |
| Paging and page size                                  | push    | Back returns to the previous page            |
| A discrete filter (status, role, a select, a switch)  | push    | Back and Forward restore it, rows and all    |
| `setFilters`, a popover apply, `resetFilters` (clear) | push    | one entry for the whole change               |

The choice lives in `systems/filters`, not in each page. A discrete write
that also clears the page is one push, not two.

## Controls

The controls: `FilterBar` (row layout, "Clear filters", page actions),
`SearchInput` (debounced), `FilterSelect`, `FilterAsyncSelect`, and
`FilterPopover` for the filters that do not earn a place in the bar, edited as
a draft and applied in one URL write. Popover fields are typed by the filter
type: a list filter takes `multiSelect`, a string filter takes `select`,
`asyncSelect`, `date`, `switch` or `radio`, and `dependsOn` makes a cascade.
