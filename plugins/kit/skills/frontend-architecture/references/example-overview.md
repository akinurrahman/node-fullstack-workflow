# Example: overview

The `academic` example feature as a whole: its folder tree, what was deliberately not built, and the build order.

A multi-entity feature: `academic`, owning class and subject. Four pages, two
entities, one cross-entity read. Paths are relative to `apps/web/src`.

**Structure and imports are exact. Bodies are complete enough to copy.** The
reasoning sits in prose between the code blocks, not inside them. Generated code
follows the code blocks.

Read the class entity end to end first. Subject is the same shape and only its
differences are listed.

```
features/academic/
├── routes.tsx
├── index.ts
├── definitions/
│   ├── class.lookup.ts
│   ├── class.types.ts
│   ├── class.constants.ts
│   ├── class.schema.ts
│   ├── subject.lookup.ts
│   ├── subject.types.ts
│   ├── subject.constants.ts
│   └── subject.schema.ts
├── api/
│   ├── class.api.ts
│   ├── class.queries.ts
│   ├── class.mutations.ts
│   ├── subject.api.ts
│   ├── subject.queries.ts
│   └── subject.mutations.ts
├── components/
│   ├── classes/class-form.tsx
│   └── subjects/subject-form.tsx
└── pages/
    ├── classes/
    │   ├── class-list-page.tsx
    │   └── class-form-page.tsx
    └── subjects/
        ├── subject-list-page.tsx
        └── subject-form-page.tsx
```

No `hooks/`, no table wrappers, no column files, no query option factories, no
detail pages. The last section lists what would make each of those earn a file.

Each layer of the example has its own file:

- `example-definitions.md`: lookups, types, constants and schemas
- `example-api.md`: api objects, queries, options source and mutations
- `example-form.md`: the form component
- `example-pages.md`: the list page, with its columns and filters, and the form page
- `example-routing-react-router.md`: `routes.tsx`, `index.ts` and `app/router.ts`
- `example-shared.md`: the shared pieces the feature leans on

---

## What was deliberately not built

Each of these is a real pattern with a real trigger. Adding it before the
trigger fires is what makes a codebase hard to read.

| Not built                              | Build it when                                                                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `components/classes/class-table.tsx`   | never, if it only forwards props to `DataTable`. A wrapper with no defaults and no logic is a rename                           |
| `components/classes/class-columns.tsx` | the column array outgrows the page, roughly eight columns or a page over 150 lines                                             |
| `hooks/use-class-filters.ts`           | never. `useUrlFilters` covers it, and a per-entity wrapper around a shared hook adds a name and nothing else                   |
| `classQueries` options factory         | you need `prefetchQuery`, `ensureQueryData`, a route loader, or a typed `getQueryData`                                         |
| `pages/classes/class-detail-page.tsx`  | there is something to show that the edit form does not already show                                                            |
| `class-status-badge.tsx`               | never. `LookupBadge` plus the lookup covers every enum in the app                                                              |
| A `sections` entity in this folder     | something in academic imports its types or hooks. With its own routes and cache and no importer, it belongs in its own feature |

## Build order

One entity end to end, then the next. Class lookup, class types, class
constants, class api, class queries, class mutations, class schema, class form,
class pages, wire the routes, check it works in the browser. Then subject.

Not layer by layer. Writing every types file first means finding out the
`ClassFilters` shape is wrong six files later, in four places at once.
