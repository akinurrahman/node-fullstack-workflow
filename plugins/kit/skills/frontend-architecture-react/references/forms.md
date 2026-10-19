# Forms and async selects

Detail for the form and async select rules in `SKILL.md`. Paths are relative to
`apps/web/src`.

## Fields

Fields come only from `formFields(schema)`, called once at module level next to
the schema, so `name` and `dependsOn` are checked against the schema's keys.

It returns `Input` (text, email, url, tel, password, number), `Textarea`,
`Select` (`multi` for many), `AsyncSelect` (`multi` for many), `Choice`,
`Switch`, `Tags`, `Time` and `Date`. The raw field components are not
exported, so an unchecked field name cannot be written. Every field takes
`name`, `label`, `description`, `placeholder`, `required`, `disabled`, and
`dependsOn` / `alwaysVisible` for a cascade.

## Server errors

`Form` puts field errors from an `ApiError` on their fields, focuses the first,
sends the rest to `<FormError />`, and marks the error handled so the global
toast does not repeat it.

## Async options source

An example source, for the class entity:

```ts
export const classOptionsSource: AsyncOptionsSource = {
  queryKey: CLASS_KEYS.options(),
  fetch: async ({ search, page, limit, parentValues, signal }) =>
    fromPaginated(
      await classApi.getOptions(
        { search, page, limit, ...parentValues },
        signal,
      ),
      (item) => ({ value: item.id, label: item.name }),
    ),
};
```

The source runs on React Query (`useInfiniteQuery` inside
`systems/form/hooks/use-async-options`), keyed by `queryKey` plus the search and
parent values, so invalidating `CLASS_KEYS.options()` refetches every open
picker.
