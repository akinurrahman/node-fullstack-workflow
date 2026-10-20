# Pagination and queries

Detail for rule 8 in `SKILL.md`. Full pairs are in `example-reads.md`.

## Paging

| Param   | Type    | Default | Rule                       |
| ------- | ------- | ------- | -------------------------- |
| `page`  | integer | 1       | at least 1                 |
| `limit` | integer | 20      | between 1 and 100 included |

Out of range or not an integer is `400 VALIDATION_FAILED` with the param as
the path. Both come from `paginationQuerySchema` in `@<scope>/shared`; a
list's own query schema extends it, so every list pages the same way.

The response:

```json
{
  "data": [],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 57,
    "totalPages": 3,
    "hasPrevious": true,
    "hasNext": true
  }
}
```

- `total` counts every row matching the filters, not just this page.
- `totalPages` is 0 when `total` is 0.
- `hasNext` is `page < totalPages`. `hasPrevious` is `page > 1`, and false
  when there are no rows at all.
- A page past the last is a 200 with `"data": []` and the real totals, so
  a client that deleted the last row of the last page can step back.

A list may add `"summary"` next to `pagination` for figures about the whole
filtered set (counts per status). It is left out entirely when the list has
none, never `null`.

Every list of stored records is paginated, even one that is short today.

## Filters

A filter is a query param named after the response field it filters:
`status`, `ownerId`, `isActive`.

- **Many values:** the key repeats, `status=ACTIVE&status=ARCHIVED`. A lone
  `status=ACTIVE` means one value. Never `status[]=`, never
  `status=ACTIVE,ARCHIVED`. A bad item's error path is `status.1`.
- **Booleans:** exactly `true` or `false`. Anything else is a 400, never
  read as truthy.
- **Enums:** the same UPPER_SNAKE values the responses carry.
- **Ids:** UUIDs, any case.
- **Dates:** in the formats of `json-values.md`.
- **Absent and empty:** a missing param is no filter. An empty `search=` is
  no filter.

## Search

`search` is the free-text filter: trimmed, case-insensitive, matched as
plain text against the fields the list documents. `%` and `_` are literal
characters, not wildcards. It has a maximum length; longer is a 400.

## Sorting

`sort` names a field to order by. Ascending is the field name, descending
is the name with a leading minus:

```
GET /api/projects?sort=name
GET /api/projects?sort=-createdAt
GET /api/projects?sort=status&sort=-updatedAt
```

- The key repeats for a tie-breaker; the first one wins, then the next.
- Field names are the response's camelCase keys, never column names.
- Each list allows its own set of sort fields, declared as an enum in its
  shared query schema. A field outside it is `400 VALIDATION_FAILED` with
  the path `sort.<index>`.
- With no `sort`, a list uses its documented default, newest first
  (`-createdAt`). The backend always adds the id as a last tie-breaker, so
  pages never repeat or skip a row.

No list in the template takes `sort` yet. The first one adds the shared
helper for it next to `queryArray`, and every later list reuses it.

## Unknown params

An unknown query param is ignored, not rejected. A known one with a bad
value is a 400. This keeps cache-busters and tracking params from breaking a
list while still catching a typo'd value.
