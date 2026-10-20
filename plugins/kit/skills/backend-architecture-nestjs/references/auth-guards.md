# Auth guards and access

Detail for rule 7 in `SKILL.md`. Paths are relative to `apps/api/src`.

## The guard chain

`app.module.ts` registers three `APP_GUARD`s. They run in this order on every
route:

1. `ThrottlerGuard`: the rate limit, per IP per route. First, so rejected
   credentials still count. Only the probes `GET /health` and
   `GET /health/ready` skip it, with `@SkipThrottle()` on the method;
   `GET /api/health/status` in the same controller stays throttled.
2. `AuthGuard` (`auth/auth.guard.ts`): skips a route marked `@Public()`.
   Otherwise reads `Authorization: Bearer <token>`, verifies it with
   `AccessTokenService`, and sets `req.user`. No valid token is a 401. No
   database read: the token alone is trusted.
3. `RolesGuard` (`auth/roles.guard.ts`): does nothing on a route without
   `@Roles()`. With it, loads the token's session and user through
   `SessionsRepository` and checks, in order: the session belongs to the user
   and the user is active (else 401), the user's current role is in the list
   (else 403), the session is not revoked or expired (else 401). It then
   overwrites `req.user.role` with the database role.

Role is checked before the session on purpose: a demotion also revokes the
user's sessions, and the demoted admin should learn they lost the role (403)
rather than be signed out.

## The decorators

All three live in `auth/auth.decorators.ts`.

| Decorator          | Effect                                                                    |
| ------------------ | ------------------------------------------------------------------------- |
| `@Public()`        | `AuthGuard` lets the route through without a token; Swagger shows no lock |
| `@Roles(...roles)` | `RolesGuard` checks the role against the database. Implies a token        |
| `@CurrentUser()`   | the `AuthUser` set by `AuthGuard`: `{ id, sessionId, role }`              |

Both `@Public()` and `@Roles()` are read with `getAllAndOverride` over the
handler and the class, so a method decorator wins over a class one.

`@CurrentUser()` on a `@Public()` route throws `UnauthorizedError`: there is
no user, and that is a wiring mistake.

## Choosing

- Everyone signed in, no fresh role check needed: no decorator.
- An admin action: `@Roles('ADMIN')`. On the class when the whole controller
  is admin-only (`UsersController`), with a comment saying so.
- Some routes open, some admin: no class decorator, `@Roles()` per method.
- Probes, login, refresh: `@Public()`.

Roles are the `Role` union from `@<scope>/shared`. A new role is a change to
the shared `ROLES` list and the Prisma `Role` enum together.

## Routes on the caller's own record

`users-me.controller.ts` is `@Controller('users/me')` with no `@Roles()`, so
any signed-in user reaches it. `users.module.ts` lists it before
`UsersController`, with a comment, because Express matches routes in
registration order and `PATCH /users/:id` would otherwise take
`PATCH /users/me`. The service reads the caller's id from `actor.id`, never
from the URL.
