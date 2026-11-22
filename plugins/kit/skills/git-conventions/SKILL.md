---
name: git-conventions
description: Git conventions for a project built on the nestjs-react-monorepo-starter template, and for the kit repo itself - conventional commit messages (type, scope, subject, body, BREAKING CHANGE footer), which type and scope fit a change, one reason per commit, what must land in the same commit (a model with its migration, an endpoint with its tests), every commit passing the kit:verify gate on its own, short-lived branches named <type>/<kebab-name> off origin/main and kept current by rebase, one feature or fix per pull request, rebase merges, tags for releases, and the strict agent rules - never commit until told "commit", never push unless told, never rewrite pushed history, never skip hooks, stage only the files for this commit. Use this skill whenever writing a commit message, staging files, proposing or making a commit, creating or naming a branch, rebasing, opening or titling a pull request, merging, tagging, or splitting work into commits or PRs. Consult it even when the change sounds routine ("commit this", "push it", "open a PR", "fix the typo and commit") - the conventions here are project-specific and cannot be inferred from git defaults or from the log alone.
---

# Git conventions

`@<scope>/shared` below means the project's shared package. Check the root
`package.json` for the actual scope (e.g. `@acme/shared`).

How changes become commits, branches, pull requests and releases, in a
project built on the template and in the kit repo itself. The agent rules
near the end are the strict ones: they guard the user's history and the
shared remote.

This skill is the history. It does not cover:

- The gate a commit must pass: the commands, their order and the report.
  That is `kit:verify`.
- Reviewing a change before it merges. That is `kit:review`.

## How to use this skill

1. Read the rules below before staging anything.
2. Split the work into one reason per commit.
3. For each commit: run `kit:verify`, stage only its files, write the
   message, run the git checks at the end, then show the message and the
   file list and wait for "commit".

## Output style and scope

No em dashes anywhere you write: commit subjects, bodies, footers, branch
names, PR titles and descriptions, or the summary you report back. Use a
hyphen, a comma, or rewrite the sentence.

Commit what was asked and stop. Do not fold a fix you noticed on the way
into the same commit. Mention it in your summary instead.

## Commits

**1. Every message is `type(scope): subject`.**
The type says what kind of change it is:

| Type       | When                                                                    | Example                                                         |
| ---------- | ----------------------------------------------------------------------- | --------------------------------------------------------------- |
| `feat`     | a new behaviour a user or a client can see                              | `feat(web): add one reportError hook for unexpected errors`     |
| `fix`      | a behaviour that was wrong is now right                                 | `fix(api): build user update data field by field`               |
| `refactor` | the code changes shape and no behaviour changes                         | `refactor(api): take the shared Values types in services`       |
| `docs`     | only documentation, comments or `CLAUDE.md` change                      | `docs: point test rules at kit:testing-standards`               |
| `test`     | only tests change: a new case, a fixture, a flaky test fixed            | `test(api): race two updates to one email`                      |
| `chore`    | tooling, config or dependencies, with no effect on the shipped code     | `chore(deps): remove temporary minimumReleaseAgeExclude list`   |
| `style`    | formatting only, no change in meaning                                   | `style(kit): format check-skill-coverage script`                |
| `perf`     | the same behaviour, measurably faster or lighter                        | none in the logs yet, e.g. `perf(api): index projects by owner` |
| `ci`       | only the CI workflows change                                            | `ci: run the gate on Node 24 too`                               |
| `build`    | how the project builds or runs: Node and engine versions, build scripts | `build: allow Node 26`                                          |

A fix that also adds its test is a `fix`, not a `test`. A `feat` that
needs a new dependency is a `feat`: the dependency lands with the code that
uses it.

**2. The scope is the package or area the change is in.**

| Scope     | Covers                                                |
| --------- | ----------------------------------------------------- |
| `api`     | `apps/api`                                            |
| `web`     | `apps/web`                                            |
| `shared`  | `packages/shared`, the `@<scope>/shared` package      |
| `browser` | `apps/browser-tests`                                  |
| `deps`    | dependency versions and the lockfile, across packages |
| `ci`      | CI config, when the type is not `ci` itself           |
| `kit`     | the kit plugin, in the kit repo only                  |

Leave the scope out when a change spans the whole repo: `docs: ...` for the
README and `CLAUDE.md`, `chore: ...` for a root config, `build: ...` for the
engines. A change in two packages for one reason takes the scope where the
reason lives, or no scope when there is no single one.

**3. The subject says what changed, in plain words.**
Imperative mood, lowercase first word, no period at the end, and the whole
line at most 72 characters. Code names and proper nouns keep their case
(`Node 26`, `USER_SEARCH_MAX_LENGTH`). A reader of `git log --oneline`
should know what changed without opening the diff: "fix(web): cap the users
search at USER_SEARCH_MAX_LENGTH", never "fix(web): update search" or
"fix: bug".

**4. A body only when the reason is not obvious. It says why, not what.**
Leave a blank line after the subject. The diff already says what changed;
the body says what the subject cannot: the cause, the constraint, the
option ruled out. Wrap at 72 characters.

```
fix(web): strip a trailing slash from VITE_API_BASE_URL

lib/api appends /api to the base URL, so https://api.example.com/ gave
https://api.example.com//api. The env schema now drops trailing slashes.
```

When a change breaks existing callers, add a `BREAKING CHANGE:` footer
saying what breaks and what to do: a changed status, body or error code, a
removed or renamed route, a renamed or newly required env var.

```
BREAKING CHANGE: JWT_SECRET is now JWT_ACCESS_SECRET. Rename it in every .env.
```

**5. One reason per commit.**
A commit does one thing, and its subject says it without joining two
changes with "and". A refactor and a behaviour change are two commits, the
refactor first, so the behaviour change reads small. Some things always
land together, in the same commit:

- A Prisma model change and its migration.
- A new endpoint and its tests.
- A new env var, its line in `env.schema.ts` and its line in
  `.env.example`.
- A bug fix and the test that would have caught it.

**6. Every commit passes the gate on its own.**
Run `kit:verify` before each commit, not only before the last one on the
branch. A commit that breaks the build and the next one that fixes it
leave a broken commit on `main` once they are rebased in, and a bisect
lands on it.

## Branches

**7. `main` is the only long-lived branch.**
No `develop`, no release branches. Everything else is short-lived and
deleted once it merges.

**8. A branch is `<type>/<kebab-name>`.**
The type is one of the commit types: `feat/project-archive`,
`fix/refresh-race`, `docs/readme-rewrite`. The name says the one feature or
fix the branch carries, in a few words.

**9. Branch from an up-to-date `origin/main`. Rebase, never merge.**

```
git fetch origin
git switch -c feat/project-archive origin/main
```

Stay current with `git rebase origin/main`. Never merge `main` into the
branch: the merge commit lands in the PR and breaks the rebase merge in
rule 12. Rebasing a branch that is already pushed rewrites pushed history,
so rule 15 applies.

## Pull requests

**10. One feature or one fix per PR.**
When a plan splits the work into slices, each slice is its own PR, merged
in order. A PR whose title joins two changes with "and" is two PRs.

**11. The PR title follows the commit format.**
`feat(api): add project archive`. Fill in the project's PR template when
it has one (`.github/pull_request_template.md`). Without one, the
description says what changed, why, and how it was verified, with the
`kit:verify` report.

**12. Merge with rebase. Only when green and reviewed.**
Rebase and merge, never squash and never a merge commit, so each
one-reason commit lands on `main` as written. Merge only when CI is green
and a `/kit:review` pass found nothing left to fix. Delete the branch,
local and remote, after it merges.

## Releases

**13. Production deploys from a tag on `main`.**
A release is a tag `vX.Y.Z` on a commit on `main`, made by the release
process. Never tag in the middle of feature work, and never tag a branch.

## Agent rules

These are the strict ones. They hold even when a request seems to imply
otherwise.

**14. Never commit until the user says "commit". Never push unless told.**
"Looks good" is not "commit". "Commit" is not "push". Approval for one
commit does not carry to the next.

**15. Never rewrite pushed history.**
Never amend, rebase or force-push commits that are already pushed. The one
exception is your own unmerged branch, and only when the user asks: then
push with `--force-with-lease`, never `--force`.

**16. Never skip hooks.**
No `--no-verify`, no `-n` on commit, no emptied `core.hooksPath`, no env var
that turns a hook off. When a hook fails, fix the cause, or stop and report
it.

**17. Stage only the files for this commit's reason.**
Stage by path: `git add <file>...`. No `git add -A`, `git add .` or
`git commit -a` when the tree holds changes that are not part of this
commit. List the unrelated ones in your report and leave them unstaged.

**18. Show the message and the file list before proposing a commit.**
Show the full message and `git diff --cached --name-only`, then wait. The
user approves what they saw, so a change after that is shown again.

## Git checks

Run these before proposing a commit.

1. The commit has one reason, and the subject does not join two changes
   with "and"
2. The message is `type(scope): subject`, the type fits the table, the
   subject is imperative, lowercase, no period, 72 characters at most
3. The scope names the package or area changed, or is left out for a
   repo-wide change
4. A body, when present, says why; a breaking change has its
   `BREAKING CHANGE:` footer
5. A Prisma model change has its migration in the same commit
6. New behaviour has its tests in the same commit
7. Nothing unrelated is staged, and the unrelated changes are named in the
   report
8. `kit:verify` passed on this commit
9. No em dashes in the subject, body or footer
