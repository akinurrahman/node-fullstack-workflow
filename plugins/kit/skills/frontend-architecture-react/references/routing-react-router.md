# Routing (React Router)

Router-specific rules for `apps/web`. Read the rules in `SKILL.md` first. Every
path is relative to `apps/web/src` unless it says otherwise.

## Structural

- Route metadata in the `handle` on the route config object, never in a lazy
  module

## Routes

React Router 8, data mode. Import from `react-router` (`RouterProvider` from
`react-router/dom`), never `react-router-dom`.

Each feature exports a typed route array from `routes.tsx`:

```tsx
export const academicRoutes: AppRouteObject[] = [
  {
    path: 'academic/classes',
    handle: {
      title: 'Classes',
      icon: School,
      nav: { group: 'Academic', order: 0 },
      roles: ['ADMIN'],
      keywords: ['grades', 'sections'],
    },
    lazy: async () => ({
      Component: (await import('./pages/classes/class-list-page')).default,
    }),
  },
];
```

- `handle` lives on the config object. The document title, breadcrumbs, the
  sidebar, the command palette and the access check all read it before the
  route's chunk loads, and `AppRouteObject` refuses a `handle` returned from
  `lazy`.
- `lazy` is always the function form returning `{ Component }`. The object form
  swallows a failed chunk in 8.4 and the route renders blank. Never
  `React.lazy`.
- Access is denied by default. A route without `public: true` needs a
  signed-in user. `public` is only for pages that work with no user: login,
  the 404. It is read from the deepest matched route that
  has a handle, so it covers that route's handle-less children (an index
  route), and a child with its own handle has to say `public` itself. A
  public route takes no `roles`, which the type rejects, and never sits under
  a parent with roles: there it counts as not public, and dev warns.
- `roles` lists who may open the route, using `Role` from `@<scope>/shared`.
  Absent means any signed-in user. It binds every child, and
  `RouteAccessGate` shows `AccessDeniedState` when a signed-in user fails a
  check, and sends a signed-out one to `/login?redirect=<path and query>`.
  The sidebar and the palette run the same `canAccessRoute` check, so a route
  the user cannot open is not listed.
- `nav` makes the route a sidebar and palette entry. `nav.group` must be one of
  `NAV_GROUPS` in `app/config.ts`; any other group warns in dev and sorts last.
  A path with params cannot have `nav`.
- `app/router.ts` lists every feature's routes once, in `pages`, or in
  `barePages` for a screen outside the shell (login), and adds
  `devRoutes` from `app/dev` behind `import.meta.env.DEV`. Adding a feature is
  one import and one spread there. `app/routes.tsx` (`buildRoutes`) wraps the
  pages in the root, layout and page levels: progress bar, shell, access gate,
  error boundary, 404. Bare pages get the same gate and boundary, without the
  shell.
- Dev-only routes and pages live in `app/dev`, never in `features/`, and are
  added only behind `import.meta.env.DEV` so the production build drops them.

## App shell

Ctrl/Cmd+K opens the command palette and Ctrl/Cmd+B toggles the sidebar. Never
bind either.

## Toasts and confirms have no router context

`ConfirmationHost` and the `Toaster` render beside the router, not inside it,
so they survive any route error. Their content has no router context: no
`Link` and no router hooks in a toast or a confirm description. Navigate from
the callback, with a `navigate` the page already holds or `router.navigate`.
Deferred callbacks (toast actions, timeouts) use absolute paths, since a
relative path resolves against wherever the user is by then.

## Wiring a feature in

These are steps 10 to 12 of the build order in `SKILL.md`.

10. Route entries in `routes.tsx`, with handles and lazy pages.
11. `index.ts` exporting the route array, plus anything another feature needs.
12. Spread the routes into `pages` (or `barePages`) in `app/router.ts`, add a
    new nav group to `NAV_GROUPS`, then check it works in the browser and run
    the definition-of-done list.

## Done check

This is item 14 of the definition of done in `SKILL.md`.

14. The route array is spread into `pages` or `barePages` in `app/router.ts`,
    and every `nav.group` is in `NAV_GROUPS`
