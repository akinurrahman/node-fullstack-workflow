# Example: routing

The routes, entry point and app router wiring of the `academic` example. The rules are in `routing-react-router.md`.

## Feature entry points

### `routes.tsx`

Grouped by entity, blank line between groups. Split into
`routes/class.routes.tsx` once this passes roughly five entities.

```tsx
import { BookOpen, School } from 'lucide-react';
import type { AppRouteObject } from '@/systems/router';

export const academicRoutes: AppRouteObject[] = [
  {
    path: 'academic/classes',
    handle: {
      title: 'Classes',
      icon: School,
      nav: { group: 'Academic', order: 0 },
      keywords: ['grades', 'sections'],
    },
    children: [
      {
        index: true,
        lazy: async () => ({
          Component: (await import('./pages/classes/class-list-page')).default,
        }),
      },
      {
        path: 'new',
        handle: { title: 'New class', icon: School, roles: ['ADMIN'] },
        lazy: async () => ({
          Component: (await import('./pages/classes/class-form-page')).default,
        }),
      },
      {
        path: ':id/edit',
        handle: { title: 'Edit class', icon: School, roles: ['ADMIN'] },
        lazy: async () => ({
          Component: (await import('./pages/classes/class-form-page')).default,
        }),
      },
    ],
  },

  {
    path: 'academic/subjects',
    handle: {
      title: 'Subjects',
      icon: BookOpen,
      nav: { group: 'Academic', order: 1 },
    },
    children: [
      {
        index: true,
        lazy: async () => ({
          Component: (await import('./pages/subjects/subject-list-page'))
            .default,
        }),
      },
    ],
  },
];
```

The parent route carries the list's handle and nav entry, so the breadcrumb on
the edit page reads "Classes > Edit class" and links back. `roles` on a child
narrows only that child; on a parent it binds every child. `'Academic'` must be
added to `NAV_GROUPS` in `app/config.ts`.

### `index.ts`

Only what actually leaves the feature. Right now that is the route array for
the app router. Add an export when a second feature needs it, not before.

```ts
export { academicRoutes } from './routes';
```

Later, when the students feature needs a class picker:

```ts
export { classOptionsSource } from './api/class.queries';
export type { ClassListItem, ClassStatus } from './definitions/class.types';
```

### `app/router.ts`

Composition only. Every feature contributes an array to `pages`, or to
`barePages` for a screen outside the shell (login); `buildRoutes` wraps them
in the root, layout and page levels.

```ts
import { createBrowserRouter } from 'react-router';
import { academicRoutes } from '@/features/academic';
import { authRoutes } from '@/features/auth';
import { homeRoutes } from '@/features/home';
import type { AppRouteObject } from '@/systems/router';
import { devRoutes } from './dev/dev-routes';
import { buildRoutes } from './routes';

const pages: AppRouteObject[] = [...homeRoutes, ...academicRoutes];
const barePages: AppRouteObject[] = [...authRoutes];

export function createAppRouter() {
  return createBrowserRouter(
    buildRoutes(
      import.meta.env.DEV ? [...pages, ...devRoutes] : pages,
      barePages,
    ),
  );
}
```

Adding a feature is one import and one spread in `pages` or `barePages`.
