# Lookups

Detail for rule 3 in `SKILL.md`.

## The default form

```ts
import { createLookup } from '@/lib/lookup/create-lookup';

export const classStatusLookup = createLookup(
  { active: { label: 'Active', badgeVariant: 'success' }, archived: { ... } },
  'ClassStatus',
);
export type ClassStatus = (typeof classStatusLookup.values)[number];
```

The config is a `Record<T, ...>`, so naming `T` pins it to a union you wrote
elsewhere and kills the inference, leaving the same values maintained in two
places.

## A union that is not yours

The one exception: when the union is not yours (`Role` from `@<scope>/shared`,
generated types), import it and DO pass it as the generic. The
`Record<T, ...>` constraint then fails to compile when the backend adds a value
you have not handled, which is the whole point:

```ts
export const userRoleLookup = createLookup<Role>(
  {
    ADMIN: { label: 'Admin', badgeVariant: 'info' },
    USER: { label: 'User', badgeVariant: 'secondary' },
  },
  'UserRole',
);
```

## Badge variants

`badgeVariant` is one of `BadgeVariant` (`default`, `secondary`, `outline`,
`success`, `warning`, `info`, `destructive`), so a lookup cannot name a badge
that does not render.
