---
name: verify
description: The definition of done for a project built on the nestjs-react-monorepo-starter template - the gate to run before reporting any work complete. Covers the commands to run from the repo root and their order (format:check, lint, typecheck, test, test:e2e when the api or the shared package changed, test:browser when testing-standards asks for a browser test), reading the root package.json for renamed scripts, Postgres for the e2e and browser runs, Turbo's cache and --force, the area checks to add from backend-architecture-nestjs, api-conventions, testing-standards and frontend-architecture, which failures to fix and which only to report, never skipping or weakening a test, a lint rule or a check to get green, and the report format. Use this skill whenever you are about to say a task is done, fixed, ready or complete, before a commit or a PR, after a refactor, and when the user runs /kit:verify. Consult it even when the change sounds too small to check ("just a rename", "only a comment", "a one-line fix") - the gate here is project-specific and cannot be inferred from the scripts alone.
---

# Verify

`@<scope>/shared` below means the project's shared package. Check the root
`package.json` for the actual scope (e.g. `@acme/shared`).

The gate before reporting any work complete. Nothing is done until this skill
has run and its report says so. A user can also run it on demand as
`/kit:verify`.

This skill is the gate. It does not cover:

- The rules each area must follow. Those are `kit:backend-architecture-nestjs`,
  `kit:api-conventions`, `kit:testing-standards` and
  `kit:frontend-architecture`. This skill runs their checks; it does not
  repeat them.
- Which test cases a change needs. That is `kit:testing-standards`.
- Commits. That is `kit:git-conventions`.
- Reviewing a change before it merges. That is `kit:review`.

## How to use this skill

1. Find what changed (below).
2. Run the steps, in order, from the repo root.
3. Run the area checks for every area the change touched.
4. Write the report in the format at the end.

## Output style and scope

No em dashes anywhere you write: the report, fix descriptions, commit
messages. Use a hyphen, a comma, or rewrite the sentence.

Fix what your change broke and stop. Do not fix, reformat or refactor
anything else to get a clean run. Report it instead.

## Find what changed

The change is everything not yet on the remote base branch: uncommitted work
and every local commit not pushed, including commits made on `main` itself.
List it with:

```
git status --short
git diff --name-only origin/main...HEAD
```

Use the project's base branch if it is not `main`. Compare against the
remote, not the local branch: `main...HEAD` on `main` is empty even when it
holds unpushed commits. If there is no remote, fall back to
`git diff --name-only main...HEAD`. The file list decides which conditional
steps and which area checks run.

If `git status` is clean and the diff is empty, the change cannot be found.
Run every step and every area check, and say in the report that the change
could not be found. Never treat "nothing found" as "nothing to check".

## The steps

Read the `scripts` in the root `package.json` first. The template names are
below. If a project renamed one, run the project's name and say so in the
report. If a step has no script at all, report it as not run and why.

| Step | Command             | Runs                                                         |
| ---- | ------------------- | ------------------------------------------------------------ |
| 1    | `pnpm format:check` | always                                                       |
| 2    | `pnpm lint`         | always                                                       |
| 3    | `pnpm typecheck`    | always                                                       |
| 4    | `pnpm test`         | always                                                       |
| 5    | `pnpm test:e2e`     | anything under `apps/api` or `packages/shared` changed       |
| 6    | `pnpm test:browser` | `kit:testing-standards` says the change needs a browser test |

Steps 5 and 6 need Postgres running. Check with `docker compose ps`: the
`postgres` service must be listed as running, or healthy.

Run the steps one at a time. When a step fails because of the current
change, fix it and rerun that step until it passes, then move on. When you
fixed anything, run the list once more from step 1 before reporting: a fix
for a test can break lint or formatting.

A formatting failure in a file you changed is fixed with
`pnpm exec prettier --write <file>...`, naming only your files. `pnpm format`
rewrites the whole repo, including files that are not yours.

Whether step 6 runs is decided by the browser tests rule in
`kit:testing-standards`. In short: the change touches auth, the session or
the token refresh, a redirect around login, navigation, measured layout, or
adds a page. When it does not, step 6 is "not run, not needed" with the
reason.

## The area checks

The steps prove the code builds and the tests pass. The area checks prove it
follows the kit. For each area the change touched, run that skill's checks
section and answer each item:

| The change touched                                                      | Run                                                      |
| ----------------------------------------------------------------------- | -------------------------------------------------------- |
| `apps/api`                                                              | `kit:backend-architecture-nestjs`, "Architecture checks" |
| an endpoint, a request or response schema, an error code, a status code | `kit:api-conventions`, "Contract checks"                 |
| any test, or any behaviour that needs one                               | `kit:testing-standards`, "Test checks"                   |
| `apps/web`                                                              | `kit:frontend-architecture`, "Architecture checks"       |

A change to `@<scope>/shared` is a change to the wire, so it runs the
contract checks. A new or changed schema in it runs the test checks too.

Cite a failed item by its text, not its number: the numbers move when a
skill changes.

## Rules

**1. Postgres down means not run, never passed.**
If Postgres is not running, report steps 5 and 6 as "not run, DB down". Do
not start a container, a database or Docker without asking: starting one
changes the user's machine. A step that fails because it cannot reach the
database is "not run, DB down" too, not a test failure.

**2. Fix only what your change caused. Report the rest.**
A failure is yours when it is in a file you changed, or in code that depends
on a file you changed. A failure in code you did not touch and that does not
depend on your change is pre-existing: report it with its file and leave it.
If you cannot tell which it is, say so in the report rather than guessing.

**3. Never get to green by weakening the gate.**
No `.skip`, `.only` or deleted test. No loosened assertion, no lint disable
comment, no `@ts-expect-error`, no `as any` or cast that hides a type error.
No change to a lint rule, a tsconfig, a Prettier setting or a test config to
make a failure go away. No `--no-verify`. If the only way to pass is to
weaken something, stop and report it.

**4. Turbo may replay a cached result. Force it when in doubt.**
lint, typecheck and test are cached; a cached run prints
`cache hit, replaying logs`. A result looks stale when it does not match the
code: a pass on code you know is broken, a failure in a line that no longer
exists, or a run after switching Node versions. Rerun that step with
`--force` (`pnpm test --force`) and say in the report that you did.

**5. Commands work in PowerShell and in bash.**
The dev shell may be PowerShell on Windows. Run one command per call, or
separate them with `;`. No `&&`, no `||`, no `VAR=value cmd`, no
`2>/dev/null`, no `rm -rf`. Every command in this skill works in both.

## Report format

One line per step and per area check, in order. Each says `pass`, `fail`,
or `not run` with why. A step you fixed says what it was before:
`fail, fixed`.

```
format:check   pass
lint           fail, fixed
typecheck      pass
test           pass (--force, the first run replayed a stale cache)
test:api:e2e   not run, DB down
test:browser   not run, not needed (no auth, session, navigation, layout or new page)
Architecture checks (backend)   pass
Contract checks                 pass
Test checks                     fail
```

Then the failures, each with its file and the fix made or still needed:

```
Failures
- apps/api/src/projects/projects.service.ts: lint, floating promise. Fixed, awaited it.
- Test checks, "Every write checks stored state": the archive e2e spec checks only the response. Needed.

Pre-existing, not fixed
- apps/web/src/features/users/pages/user-list-page.spec.tsx: test fails on main too.

Renamed scripts
- test:e2e is test:api:e2e in this project.

Not verified: test:api:e2e (DB down), Test checks (archive e2e spec).
```

Leave out a section that has nothing in it.

No "all good", "everything passes" or "done" line when any step or check
failed or did not run. In that case the report ends with what is left:
`Not verified: test:e2e (DB down).` A report may say the work is done only
when every step and every area check passed, or did not need to run.
