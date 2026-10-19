---
name: frontend-architecture-react
description: Feature-based architecture spec for a React 19 SPA on Vite with React Router 8 (data mode) - folder layout, one file set per entity, definitions/api/components/pages layering, createLookup for enums, apiCall and the response envelope, React Query keys and invalidation, URL filter specs, async select sources, systems/table, route handles and NAV_GROUPS, modals, semantic tokens, and the rules for when an abstraction earns a file. Use this skill whenever creating a new feature under apps/web/src/features/, adding an entity, page, query, mutation, form, table, or filter to an existing feature, wiring a domain into the router, changing src/systems, src/lib or src/app, or refactoring anything that touches data fetching or folder structure. Consult it even when the request sounds routine ("add a status filter", "make an edit page", "hook this up to the API") - the conventions here are template-specific and cannot be inferred from surrounding files.
---

# Frontend architecture (React)

`@<scope>/shared` below means the project's shared package. Check the root
`package.json` for the actual scope (e.g. `@acme/shared`).

The architecture of `apps/web`: a React 19 SPA on Vite, React Router 8 in data
mode, TanStack Query 5 and Table 9, Tailwind 4 with shadcn on Base UI,
react-hook-form with Zod 4, zustand, sonner, Vitest with msw, Oxlint. Every
path below is relative to `apps/web/src` unless it says otherwise.

The rules below and the files in `references/` are the whole spec. The
reference implementation lives in `references/reference-implementation.md`.

## How to use this skill

1. Read the rules below. They are short and every one of them is load-bearing.
2. Open `references/reference-implementation.md` and read the sections matching
   what you are building. Adding a query? Read the API layer section. Building a
   full entity? Read all of it.
3. Build only what the request asks for, following the build order at the end.
4. Run the definition-of-done list before reporting complete.

### Which reference to read

Each file below holds the detail for one area. The rules stay in this file.
Read the file before you start work in its area, not after.

| File                                     | Read it when                                                                                               |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `references/reference-implementation.md` | you build an entity, a page, a query, a mutation or a form. Read the sections that match                   |
| `references/routing-react-router.md`     | you add or change a route, a handle, a nav entry, route access, `app/router.ts` or `app/routes.tsx`        |
| `references/api-layer.md`                | you write an `*.api.ts`, a query or a mutation, or handle an `ApiError`                                    |
| `references/lookups.md`                  | you add or change an enum                                                                                  |
| `references/forms.md`                    | you build a form, add a field, or write an async options source                                            |
| `references/filters.md`                  | you add a filter or build a filter bar                                                                     |
| `references/tables.md`                   | you build a list page, its columns or anything around a `DataTable`                                        |
| `references/control-sizes.md`            | you size a control or place a button beside an input                                                       |
| `references/shared-code.md`              | you write a helper, a hook or a component that may already exist in `lib/`, `components/ui/` or `systems/` |

**If something you need is not covered here**, copy the nearest existing
feature or system in the repo rather than inventing new structure, and say in
your summary which one you copied and why. Do not add a new top-level folder.
When the code and this skill disagree, follow the code and flag the mismatch so
the skill gets fixed in the kit repo.

## Two kinds of rule

Everything in this file falls into one of two buckets. Confusing them is the
single most common way this architecture goes wrong.

**Structural. Always, from the first line of code.** These exist for
correctness, not tidiness. Skipping one produces a bug, not just an untidy
file:

- One query key and one query function per endpoint: the key in
  `definitions/*.constants.ts`, the function in `api/*.queries.ts`
- Every enum is a `createLookup`, union derived from it
- All HTTP through `apiCall` / `apiCallPaginated` with an explicit generic, from
  `*.api.ts` only
- Mutations own cache and the success toast; pages own navigation
- Pages know about routes; components do not
- Filter state through a `defineUrlFilters` spec
- The routing rules marked structural in `references/routing-react-router.md`
- Colors from semantic tokens only

**Earn it. Needs a trigger before the file exists.** These are good patterns
that cost more than they return when applied too early. Build the thing inline
first. Extract when the trigger fires:

| Thing                                     | Trigger                                                                                |
| ----------------------------------------- | -------------------------------------------------------------------------------------- |
| A component file                          | the JSX has a second caller, or the parent passes ~150 lines                           |
| A `<entity>-columns.tsx` file             | the column array outgrows the page, roughly 8 columns or a page over 150 lines         |
| A hook in `hooks/`                        | the logic has a second caller, or the page passes ~150 lines                           |
| A `queryOptions` factory next to the hook | you need `prefetchQuery`, `ensureQueryData`, a route loader, or a typed `getQueryData` |
| A `systems/` extraction                   | a second feature needs it. Not the first                                               |
| An `index.ts` export                      | another feature or `app/router.ts` imports it                                          |
| A detail page                             | there is something to show that the edit form does not already show                    |
| A separate feature folder                 | see "When a sub-entity becomes its own feature"                                        |

**Never, at any size:** a wrapper component that only forwards props. If it
adds no defaults, no derived values and no logic, it is a rename. Import the
underlying component directly.

An abstraction with one caller and no second caller in sight is not an
abstraction. It is indirection.

## Scope discipline

Build what was asked and stop. Do not refactor neighbouring code, do not
rename things you were not asked about, do not create files for work that has
not been requested yet. If you spot something worth changing outside the
request, mention it in your summary instead of doing it.

A request to add one filter touches the filter spec, the filter bar and
nothing else.

## Source tree

```
src/
├── app/            router, route tree, shell (sidebar, header, palette), providers,
│                   route errors, access gate, dev-only routes in app/dev
├── components/ui/  shadcn primitives on Base UI. The only home of modals
├── features/       one folder per domain
├── lib/            framework-agnostic, no React
├── systems/        React-aware, shared, no domain knowledge
├── styles/         theme.css, the semantic tokens
└── test/           renderApp, renderWithRouter, renderWithQuery, msw server
```

## Folder contract

The unit is the **entity**, not the feature. A feature folder owns a group of
related entities, and each entity gets its own file per layer with the same
suffixes.

```
features/<feature>/
├── index.ts                        public API. Only file other features may import
├── routes.tsx                      AppRouteObject[] for this feature, lazy pages
├── definitions/
│   ├── <entity>.lookup.ts          createLookup per enum + the derived unions
│   ├── <entity>.types.ts           API shapes. No react, no logic
│   ├── <entity>.schema.ts          zod schemas + inferred form types
│   └── <entity>.constants.ts       query keys, filter spec, defaults
├── api/
│   ├── <entity>.api.ts             endpoint definitions via apiCall. No react
│   ├── <entity>.queries.ts         useQuery hooks, async select sources
│   └── <entity>.mutations.ts       useMutation hooks + invalidation + success toast
├── hooks/                          feature logic that is not fetching
├── components/                     feature UI
└── pages/                          route screens
```

With one entity, the files sit flat. The prefix is always the entity name,
singular, never the feature's: `features/users` holds `user.api.ts`,
`USER_KEYS` and `useUser`, and `features/home` holds `health.*`. With two or
more, the prefix is what makes the folder navigable, and
`components/` and `pages/` gain a subfolder per entity as soon as the second
entity arrives:

```
components/classes/class-form.tsx
pages/classes/class-list-page.tsx
pages/subjects/subject-list-page.tsx
```

Filenames keep the entity prefix inside the subfolder. `class-list-page.tsx`,
not `list-page.tsx`, or your editor tabs are six files called `list-page`.

Not every entity needs every file. No enums means no `lookup.ts`, no form
means no `schema.ts`. Never create an empty file or an empty folder.
`features/home` is the smallest real example: one `health` entity
(`health.api.ts`, `health.queries.ts`, `health.constants.ts`,
`health.lookup.ts`, `health.types.ts`), one page with its spec, `routes.tsx`
and `index.ts`. It has no form, so no `schema.ts`, and no writes, so no
`mutations.ts`.

### Query keys are per entity

```ts
export const CLASS_KEYS = { all: ['academic', 'classes'] as const, ... };
export const SUBJECT_KEYS = { all: ['academic', 'subjects'] as const, ... };
```

Never one feature-wide key object with entities nested inside it. Invalidating
a class would refetch every subject.

### When a sub-entity becomes its own feature

Split it into `features/<name>/` when both are true:

- Nothing else in the current folder imports its types or hooks
- It has its own routes and its own cache lifecycle

Entities that only share a sidebar heading are two features sitting next to
each other in the nav. Related on a whiteboard is not the same as coupled in
code.

Entities that do reference each other stay together. That is the payoff: the
class form imports `subjectOptionsSource` with a relative path, no `index.ts`,
no cross-feature rule to satisfy, same cache.

## Shared code: `lib/`, `components/ui/`, `systems/`

Three shared tiers. Neither `lib/` nor `systems/` may import from `features/`.
No lint rule enforces that yet, so hold it by hand.

The file-by-file map of `lib/`, `components/ui/` and `systems/` is in
`references/shared-code.md`. Read it before you write a helper, a hook or a
component that may already exist.

If it imports react, it goes in `systems/`. If it does not, `lib/`. Anything a
second feature would otherwise redeclare belongs in one of them. Never write an
inline `toLocaleString()` or `Intl` call in a component; use `lib/format` and
`lib/date`, or two screens will disagree within a week.

Every new piece in `components/ui` or `systems` gets a section, or a specimen
in an existing section, on the theme preview page
(`app/dev/theme-preview`) in the same change. That page is what reviews them.

### Styling

Colors come from the semantic tokens in `styles/theme.css`, mapped into
Tailwind in `index.css`: `bg-background`, `text-muted-foreground`,
`bg-destructive`, `border-border` and so on. Never a raw color: no hex, `rgb()`,
`oklch()` or palette classes like `bg-red-500` outside `theme.css`. A tint is
opacity on a token (`bg-success/15 text-success`), never a new token. Dark mode
is the `.dark` class on `<html>`, and the tokens switch with it.

Touch targets are 40px below `sm` and 32 to 36px from `sm` up. All of them
carry this already, so pick a `size` and add no height of your own. A control
that has to look smaller than 32px, like a chip's remove mark, keeps its look
and grows its hit area with an `after:` box (`components/ui/combobox.tsx`,
`systems/form/fields/tags-field.tsx`). Which control has which height is in
`references/control-sizes.md`.

### Forms

Forms come from `@/systems/form`: `Form`, `FormError`, `FormActions`,
`FormSheet` and `formFields`. Fields come only from `formFields(schema)`,
called once at module level next to the schema, so `name` and `dependsOn` are
checked against the schema's keys:

```tsx
const Field = formFields(classFormSchema);
// <Field.Input name="name" label="Class name" required />
```

`Form` seeds empty defaults from the schema, so pass only real values in
`defaultValues`. `onSubmit` awaits whatever it returns: return or await
`mutation.mutateAsync(values)` and let a rejection throw. Never
`mutation.mutate(values)` inside a form, or a server error becomes a toast
instead of a field message.

Missing a field? Add it to `systems/form`. Do not build a one-off field
component inside a feature.

The field list and how `Form` maps server errors are in `references/forms.md`.

### Async selects

A picker over a list too long to ship to the browser is a `Field.AsyncSelect`
in a form, or a `FilterAsyncSelect` / popover `asyncSelect` in a filter bar. All
of them take one `AsyncOptionsSource`, owned by the entity it lists, in its
`api/<entity>.queries.ts`.

Pass `initialOptions` with the labels of values an edit form or a shared URL
starts with, so the trigger shows names before the first fetch.

An example source and how it caches are in `references/forms.md`.

### Filters

List filter state lives in the URL, through `@/systems/filters`. Declare a spec
in the entity's `constants.ts`, consume it in the page.

The spec needs an entry for every key of the filter type, so adding a filter
fails to compile until it says how it is read. Never hand-roll `useSearchParams`
parsing in a page, and never cast a param to an enum union. Pass the lookup's
`.values` and let the spec reject anything else.

Define the spec at module scope. An inline object is a new identity every
render, and it flows into the query key.

A search the api caps takes the cap from `@<scope>/shared` twice: as
`maxLength` on the spec field, which cuts a longer value from a hand-edited
URL, and as `maxLength` on `SearchInput`, which stops typing and pasting
there. Either way the request is never a 400
(`search: { maxLength: USER_SEARCH_MAX_LENGTH }` in `features/users`).

The spec and hook in use, and the filter controls, are in
`references/filters.md`.

### Tables

Everything table comes from `@/systems/table`: `DataTable`,
`createColumnHelper`, `ColumnDef`, `RowLink`. Never import `ColumnDef` or
`createColumnHelper` from `@tanstack/react-table`: the local ones carry the
typed column meta.

Column meta: `align` (header, cells and skeleton together), `size` in px,
`hideBelow: 'sm' | 'md' | 'lg'`, `sticky: 'left'` (leading columns only, and
every sticky column but the last needs a `size`; dev warns otherwise).

Keep a column's renderer the same for a given column id: swapping in one with
different hooks breaks the hook order.

`isLoading` shows skeleton rows, `isFetching` dims the rows already there,
which needs `placeholderData: keepPreviousData` on the list query.
`onRowClick` is mouse only; `RowLink` in the column that names the record is
the keyboard path. Row buttons use `RowActions` or `RowActionsMenu` from
`@/systems/ui`.

The column helper, `DataTable` wiring on a list page and the table height
(`--table-offset`) are in `references/tables.md`.

### Modals, confirm and toasts

Dialogs, sheets and alert dialogs come from `components/ui` (`Dialog`, `Sheet`,
`AlertDialog`), whose roots report to `components/ui/modal-registry`. The
command palette reads that registry to stay out of the way. The registry is
internal bookkeeping: a feature never calls it, it only has to use those
primitives. A modal built straight on `@base-ui/react` is not tracked; do not
build one.

A form in a side panel is `FormSheet` from `@/systems/form`. There is no
`FormDialog`: a form in a dialog is a `Dialog` with a `Form` inside it, in the
feature (`features/users/components/user-password-dialog.tsx`), until a
second feature needs one and it moves to `systems/form`.

Confirmations go through `useConfirm()` from `@/systems/confirmation`:
`confirm({ title, description, variant, onConfirm })`, with `variant`
`default`, `destructive` or `warning`. Return the mutation promise from
`onConfirm`: the dialog shows pending, stays open on a rejection and lets the
global toast report it.

Toasts and confirms render outside the router. What that means for links and
navigation is in `references/routing-react-router.md`.

## Routing

Routing lives in `references/routing-react-router.md`: routes,
`AppRouteObject`, handles, access, `NAV_GROUPS`, `app/router.ts`, dev routes
and the app shell. Read it before you add or change a route, a handle, a nav
entry or route access, or anything in `app/router.ts` or `app/routes.tsx`.

## Import style

- **Inside a feature**: relative. `../definitions/class.types`
- **Across features, and into `lib/`, `systems/` or `components/ui/`**: the
  `@/` alias. `@/features/students`, `@/lib/api/api-call`
- Never `@/features/academic/...` from inside `features/academic`.
- `@<scope>/shared` for anything the API also uses: `PaginatedResponse`,
  `PaginationMeta`, `ErrorResponse`, `ERROR_CODES`, `ROLES`, `Role`, page limits.

Oxlint's `no-restricted-imports` blocks `@/features/*/**` everywhere, so a
feature is reachable only through its `index.ts`.

## Import direction

A dependency graph, not a single chain. Arrows point at what a file may import:

```
pages -> components -> hooks -> api -> definitions -> lib
  |          |                                        systems -> components/ui -> lib
  +----------+--------> systems (ui, table, form, filters, confirmation)
```

Inside `definitions/`:

```
lookup  <- types  <- constants
   ^                     ^
   +------- schema ------+
```

`lookup.ts` imports nothing from its own feature. `types.ts` imports the union
from `lookup.ts` and re-exports it. `constants.ts` imports types, and the
lookup when a filter spec needs `.values`. `schema.ts` imports the lookup to
build its enum fields with `toZodEnum`.

Nothing imports upward. A component importing from a page, or `systems/`
importing from a feature, means the thing is in the wrong folder.

## What goes in which file

| File                         | Owns                                                                         | Never contains                                |
| ---------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------- |
| `definitions/*.lookup.ts`    | `createLookup` configs, unions derived from them                             | anything not enum-related                     |
| `definitions/*.types.ts`     | API shapes, re-export of the lookup unions                                   | enum unions declared by hand, runtime code    |
| `definitions/*.schema.ts`    | zod schemas, `z.infer` types                                                 | fetching, react, re-typed enum values         |
| `definitions/*.constants.ts` | query keys, filter spec, defaults, limits                                    | enums, functions with side effects            |
| `api/*.api.ts`               | endpoint + method + payload, via typed `apiCall<T>`                          | bare axios/fetch, react, react-query, toasts  |
| `api/*.queries.ts`           | `useQuery` hooks, async select sources, a `queryOptions` factory once earned | mutations, JSX                                |
| `api/*.mutations.ts`         | `useMutation`, invalidation, success toast                                   | navigation, error toasts, route-specific copy |
| `hooks/*`                    | derived state, orchestration that a second caller needs                      | JSX, filter parsing                           |
| `components/*`               | UI. Props in, JSX out                                                        | route knowledge (`useNavigate`, `useParams`)  |
| `pages/*`                    | hooks to components, page chrome, navigation, query states                   | business rules, inline fetch config           |
| `routes.tsx`                 | paths, handles, lazy imports                                                 | anything else                                 |
| `index.ts`                   | re-exports                                                                   | implementation                                |

## The rules that actually matter

**1. One endpoint, one definition.**
Every query key is declared once, in `definitions/*.constants.ts`, and every
query function once, in `api/*.queries.ts`. Consumers call the exported hook.
Never write an inline `useQuery({ queryKey: [...], queryFn: ... })` in a
component. Drifting keys are the number one cause of "I updated it but the
other screen still shows the old value".

**2. Reading the same GET in several places is correct, not a bug.**
Identical key means one request and a shared cache. Do not prop-drill a fetched
object across a route boundary to "save" a request.

This depends on a non-zero `staleTime`. `createQueryClient` defaults it to 30
seconds; reference data that feeds dropdowns gets minutes.

Prop-drill only when the component would work with any object of that shape and
is not tied to a persisted record by id. Read the hook for a card bound to an
id, take props for a preview of unsaved form values.

**3. Every enum is a `createLookup`, and its union is derived from it.**

Do NOT pass the generic (`createLookup<ClassStatus>(...)`) and declare the
union by hand.

The one exception: when the union is not yours (`Role` from `@<scope>/shared`,
generated types), import it and DO pass it as the generic.

One lookup feeds every consumer: `.options` for selects and filters,
`.toZodEnum(message?)` for the schema, `.resolve()` via `<LookupBadge>` for
rendering, `.values` for the filter spec whitelist, `.keys` for typo-safe
comparisons and defaults. A `<entity>-status-badge.tsx` file is a mistake, and
so is a hand-written `z.enum([...])` or `CLASS_STATUS_OPTIONS` array.

Both forms of the call, why the generic breaks inference, and the
`BadgeVariant` list are in `references/lookups.md`.

**4. Features talk through `index.ts` only.**
`@/features/students` is legal. `@/features/students/api/student.queries` is
not, and Oxlint fails it.

Entities inside the same feature do not go through `index.ts`. They import each
other relatively.

**5. Shared reference data belongs to the entity that owns it.**
The class picker source lives with the class entity and is imported by whoever
needs it. It is not copied, and it does not go in `systems/` (systems is for
things with zero domain knowledge).

An options endpoint gets its own key, separate from the paginated list. Feeding
a dropdown from the list query gives you a picker that only ever shows page one.

**6. Components do not know about routes.**
`useNavigate` and `useParams` appear in `pages/` only. Components receive
`onSuccess`, `onCancel`, `onEdit` callbacks. This is what lets one form serve
the create page, the edit page, and a `FormSheet`.

**7. Mutations own cache and the success toast. Pages own navigation.**
The toast describes the operation, not the screen: "Class created" is true from
a page, a sheet, or a row action, so it lives in the mutation hook. Navigation
is screen-specific, so it goes in the caller.

Error toasts are global. So feature hooks define `onSuccess` only.

A caller that shows the error itself opts out on the mutation with
`meta: { handledError: true }`, or calls `markErrorHandled(error)` from
`@/systems/api` on the error it put on screen.

Invalidate `KEYS.lists()`, not `KEYS.all`. `.all` also refetches every open
detail query, which is wasted requests and sometimes a visible flash. Patch the
detail cache with `setQueryData` when the response contains the updated record.
Invalidate the options key too when a write changes what a picker shows.
`invalidateQueries` returns a promise and Oxlint rejects a floating one: prefix
it with `void`, or return it to make the mutation wait for the refetch.

**8. All HTTP goes through `apiCall` or `apiCallPaginated`, from `*.api.ts`.**
No bare `axios` or `fetch` in a feature, ever.

The single-resource envelope never leaves `*.api.ts`: no `.data.data`, and no
hand-written envelope types in a feature.

Always pass the generic: `apiCall<ClassDetail>(...)`. Without it the return is
`unknown`, and a cast to silence it hides a typo'd field.

Void endpoints (delete, actions with no body) use `apiCallEmpty`, never
`apiCall<void>`.

Thread the `signal` React Query gives the `queryFn` into every GET. Leave it
off mutations: aborting a half-sent POST just means you no longer know whether
the server processed it.

**9. Errors are `ApiError`.**
Show one with `getErrorMessage(error)`, which keeps 4xx messages and replaces
5xx and network failures with safe copy. Branch on `code`, never on the
message text. A cancellation is not an `ApiError` and is not a failure.

What the axios instance does, the response envelope, `ApiCallOptions`, the
`ApiError` fields, retries and the global error toast are in
`references/api-layer.md`.

**10. Server state in React Query, client state in zustand.**
Anything the API owns lives in the query cache. UI state that outlives a
component (theme, session, confirm, palette, modal registry) is a small zustand
store in its system, with exported actions. Never copy query data into a store
or a store into a query.

**11. Pages own loading, error and empty states. Components never guess.**

Detail-shaped pages, in this order, before touching the record:

```tsx
if (isLoadingError) return <ErrorState error={error} onRetry={refetch} />;
if (isLoading) {
  return (
    <output aria-label="Loading class" className="block">
      <Skeleton className="h-64 w-full" />
    </output>
  );
}
if (!classItem) return <NotFoundState />;
```

A bare skeleton is silent to a screen reader. The `<output>` is a status
region named for what is loading.

List-shaped pages handle `isLoadingError` at the page level and pass
`isLoading` and `isFetching` down to `DataTable`, which owns the row skeleton
and the empty row. Do not render an empty state above a table that already
has one.

Branch on `isLoadingError`, never `isError`. `isError` is also true when a
refetch fails (a window focus while offline, an expired session) and would
swap a loaded list for an error screen. `isLoadingError` is React Query's
`isError && data === undefined`, which is why it beats a hand-written
`isError && !data`: an endpoint that legitimately loads `null` is still
loaded. A failed refetch keeps the data on screen, and the `QueryCache` in
`createQueryClient` reports it with one error toast.

A component that receives data as props renders it. It does not check
`isLoading` on data it was handed.

## Comments

Default is zero comments. A comment is an exception you justify, not a
courtesy you add.

Do not comment:

- A component, hook, or api method whose name and types already say it.
  Presentational components, query and mutation hooks, api wrappers
- Prop interfaces, lookup values, filter specs, query key factories
- Anything a reader learns by reading the next two lines

Comment only when:

- A line looks wrong and is not. Backend quirk, race, ordering constraint,
  intentional stale value
- A magic value has a source outside the file (spec, backend limit, protocol)
- A function is long or genuinely intricate. Non-obvious algorithm, multi-step
  state machine, math, timing or reconnect logic, a contract callers can get
  wrong

Form:

- Default is one `//` line above the line it explains
- A `/** */` block is for the third case only, and it explains why or how the
  thing is used, not what the name already says. Argument-by-argument `@param`
  restating the types is noise
- No em dashes inside comments either. Use a hyphen, a comma, or rewrite
- No file header banners, no `LEVEL:` markers, no section dividers
- Never restate what the line does. `// fetch the class` above a fetch is noise
- No commented-out code, no TODO placeholders carried in from this guide
- Comment the trap, not the mechanism:
  `// options key too, the class form picker reads it` earns its place.
  `// invalidate queries` does not

The reference implementation puts its reasoning in prose between the code
blocks, not inside them. Generated code follows the code blocks, not the prose.

## Output style

No em dashes anywhere you write: code comments, JSX text, labels, toast
strings, commit messages, or the summary you report back. Use a hyphen, a
comma, or rewrite the sentence. The only acceptable dash is one that is part of
syntax.

Code follows the repo's root Prettier config: single quotes, trailing commas,
2-space indent. Run `pnpm format` from the repo root; `pnpm format:check` must
pass.

## Naming

- Files: kebab-case, and the filename matches the primary export.
  `class-filters-bar.tsx` exports `ClassFiltersBar`
- Watch for collisions with type names. `ClassFilters` is a type, so the
  component is `ClassFiltersBar` and its file follows
- Definitions and api files carry the entity prefix: `class.types.ts`
- Lookups: `<entity><Enum>Lookup`, e.g. `classStatusLookup`
- Filter specs: `<ENTITY>_FILTER_SPEC`
- Query keys: `<ENTITY>_KEYS`
- Query hooks: `use<Entity>` (detail), `use<Entity>List` (list)
- Async select sources: `<entity>OptionsSource`
- Mutation hooks: `useCreate<Entity>`, `useUpdate<Entity>`, `useDelete<Entity>`
- Page components: default export, named `<Entity><Screen>Page`
- Route arrays: `<feature>Routes`

## Tests

- `*.spec.ts(x)` next to the code. Vitest globals, jsdom, Testing Library.
- HTTP goes through msw (`test/msw-server.ts`); an unhandled request fails the
  test.
- `test/render-app.tsx` renders the real app root and route tree around test
  pages, signed in as a test ADMIN unless told otherwise (`user`, or `restore`
  to run the real startup refresh). A test about access or roles passes its
  `user` explicitly. `render-with-router` and `render-with-query` cover smaller
  pieces. `test/auth-fixtures.ts` has test users and auth msw handlers.
- Mutation-check new tests: break the code, confirm a test fails, restore.

## Build order

One entity end to end, then the next. Not layer by layer across entities:
writing every types file first means finding out a filter shape is wrong six
files later, in four places at once.

For each entity, skipping anything the request does not need:

1. `<entity>.lookup.ts` if the entity has enums. Everything downstream reads
   the union from here.
2. `<entity>.types.ts`, re-exporting those unions.
3. `<entity>.constants.ts`: keys and the filter spec.
4. `<entity>.api.ts`, one method per endpoint, typed `apiCall<T>`.
5. `<entity>.queries.ts`, one hook per read endpoint, plus the options source
   if something picks this entity.
6. `<entity>.mutations.ts`, invalidation plus a success toast.
7. `<entity>.schema.ts` if there is a form, using `lookup.toZodEnum()`.
8. Components, dumb first, form last.
9. Pages, thin, with the three query states.
10. Routes, `index.ts` and `app/router.ts`: steps 10 to 12 are in
    `references/routing-react-router.md`. Then check it works in the
    browser, and run the definition-of-done list.

## Definition of done

1. `pnpm typecheck` passes
2. `pnpm lint` (Oxlint) and `pnpm format:check` pass, including the feature
   import rule
3. `pnpm test` passes, with tests for the new behaviour
4. Every `apiCall` and `apiCallPaginated` has an explicit generic
5. Every GET threads `signal`; no mutation does
6. No enum values typed by hand outside `*.lookup.ts`, and no param cast to an
   enum union
7. Every filter key has an entry in the spec, and the spec is at module scope
8. No raw colors, only semantic tokens
9. No wrapper component that only forwards props
10. No file created that the request did not need
11. No comment restates what the code does, no doc block sits above a
    self-explanatory export, and no placeholder comments from this guide
    survived
12. No em dashes in code, comments, copy, or your summary
13. `index.ts` exports only what another feature or the router actually needs
14. The done check in `references/routing-react-router.md` passes
15. Any new piece in `components/ui` or `systems` has its section on the theme
    preview page
