---
name: fix
description: Fix a bug test-first on a fix/<kebab-name> branch in a project built on the nestjs-react-monorepo-starter template - checks a clean tree on an up-to-date main, restates the bug and its likely cause and waits for the user to confirm it, branches, writes the smallest failing test and waits for the user to confirm it, makes the smallest fix that turns it green, and makes one fix(<scope>) commit holding the test and the fix. Stops and recommends /kit:feature when the fix needs a migration, more than 5 non-test files, or real changes in both api and web. Never pushes and never opens a PR. Run it as /kit:fix.
disable-model-invocation: true
allowed-tools: Bash(git branch --show-current), Bash(git status *), Bash(git fetch origin), Bash(git rev-list *), Bash(git log *), PowerShell(git branch --show-current), PowerShell(git status *), PowerShell(git fetch origin), PowerShell(git rev-list *), PowerShell(git log *)
---

# Fix

One bug, fixed test-first, on its own branch, in one commit. The user runs
it as `/kit:fix`, with the bug described in the same message or the next.

Running `/kit:fix` and approving the test in step 4 is the user telling you
to make the one commit in step 6, as `kit:git-conventions` rule 14
requires. It covers that commit only: no other commit, no push, no PR.

This skill orders the work. It does not cover:

- Which test, at which level, and how it is named. That is
  `kit:testing-standards`.
- How the fixed code is shaped. That is `kit:backend-architecture-nestjs`,
  `kit:api-conventions` and `kit:frontend-architecture`.
- Branch names and the commit message. That is `kit:git-conventions`.
- The gate. That is `kit:verify`.
- Shipping the branch. That is `kit:pr`, which the user runs.

Each step loads the skill it needs at that step. This skill does not repeat
their rules.

## How to use this skill

1. Check the preconditions.
2. Describe the bug. Stop for the user's reply.
3. Create the branch.
4. Write the failing test. Stop for the user's reply.
5. Fix the bug.
6. Commit.
7. Report.

Run the steps in order. At a stop, end the turn and wait. At a failure,
stop and report it with the output that shows it.

## Output style and scope

No em dashes anywhere you write: the bug description, test names, the
commit message, and the report. Use a hyphen, a comma, or rewrite the
sentence.

Fix the one bug and stop. A second bug, a cleanup or a gap you notice on
the way goes in the report, not in the branch.

## Rules

**1. Commands work in PowerShell and in bash.**
Run every command from the repo root, one per call. No `&&`, no `||`, no
pipe, no `VAR=value cmd`, no `2>/dev/null`.

**2. The base is `origin/main`.**
Use the project's base branch name wherever this skill says `main` when it
is not `main`.

**3. The escalation rules.**
A fix that needs any of these is not a fix. Stop and recommend
`/kit:feature`:

- a Prisma schema change or a migration
- more than 5 non-test files changed
- real changes in both `apps/api` and `apps/web`

They are checked in step 2, against the planned fix, and again in step 5,
against the real one.

## Steps

**1. Check the preconditions.**

```
git status --short
```

Any output means the tree is dirty. Stop with
`Cannot start a fix: the working tree has uncommitted changes.` and list
every file from the output. Do not stash, commit or discard them.

```
git branch --show-current
```

- `main`: go on.
- `fix/<kebab-name>`: ask
  `On <branch>. Resume this fix, or switch to main and start a new one?`
  and stop. On resume, read the branch's commits with
  `git log --oneline origin/main..HEAD` and pick up at the first step not
  done. A step that needs the user's reply still needs it.
- Anything else, or empty output (a detached HEAD): stop with
  `Cannot start a fix: on <branch>, not main. Switch to main first.`

```
git fetch origin
git rev-list --count main..origin/main
git rev-list --count origin/main..main
```

If the fetch fails, stop and show its output.

The first count is the commits on `origin/main` that `main` does not have.
Anything above `0` means `main` is behind: stop with
`Cannot start a fix: main is <n> commits behind origin/main. Pull main first.`
Do not pull.

The second count is the commits on `main` that `origin/main` does not have.
Anything above `0` means `main` is ahead: stop with
`Cannot start a fix: main is <n> commits ahead of origin/main. They would end up in the fix PR.`
Do not push, reset or move them.

**2. Describe the bug.**

Restate the bug in these five lines:

```
Symptom:    what the user sees go wrong
Expected:   what should happen
Actual:     what happens instead
Reproduce:  the steps, the request or the input that shows it
App:        api, web or both
```

If any line is missing or unclear from what the user said, ask for it and
stop.

Then read the code, read-only, to find the likely cause. Change nothing,
run nothing that writes. Report:

- the files involved, with `path:line`
- the suspected cause, in a sentence or two
- the planned fix, in a sentence

Check the planned fix against the escalation rules (rule 3). When one
applies, stop with the rule it breaks and recommend `/kit:feature`.

Otherwise stop with
`Confirm this is the bug, or correct it.` Wait for the user's reply. Never
go on in the same turn.

**3. Create the branch.**

Load `kit:git-conventions`. The name follows its rule 8,
`fix/<kebab-name>`, the name saying the bug in a few words.

```
git switch -c fix/<kebab-name>
```

**4. Write the failing test.**

Load `kit:testing-standards`. Write the smallest test that reproduces the
bug, at the level it names for this behaviour, named after the outcome the
user expects.

Run only that test. It must fail on the assertion that shows the bug. A
failure from a compile error, an import, a missing fixture or the setup is
the wrong reason: fix the test and run it again until it fails on the
assertion.

When the bug cannot be caught by an automated test (pure visual or CSS,
browser timing, anything only a person can see), stop and say so with the
reason. Do not write a test that passes or fails for some other reason.

Show the test and the failure output. Then stop with
`Confirm this test captures the bug.` Wait for the user's reply. Never go
on in the same turn.

**5. Fix the bug.**

Load the skills for the files the fix changes:

| The fix changes                                          | Load                              |
| -------------------------------------------------------- | --------------------------------- |
| `apps/api`                                               | `kit:backend-architecture-nestjs` |
| an endpoint, a request or response schema, a status code | `kit:api-conventions`             |
| `apps/web`                                               | `kit:frontend-architecture`       |

Make the smallest change that turns the test green.

The approved test is locked. Do not edit, loosen or skip it. If it now
looks wrong, stop and ask.

Run the new test, then the tests of every package the fix changed. All must
pass.

When the fix grows past an escalation rule (rule 3), stop. Keep the branch
as it is, explain what grew, and recommend `/kit:feature`.

After 3 approaches that did not turn the test green, or broke another
test, stop. Report each approach and why it failed.

**6. Commit.**

Run `kit:verify` with the Skill tool and follow it to the end, as
`kit:git-conventions` rule 6 requires. When its report has a `fail` or a
`Not verified:` line, stop with the report. Do not commit.

Load `kit:git-conventions`. Stage the test and the fix by path, and make one
commit:

```
fix(<scope>): <summary>
```

The body says the bug (its symptom and its cause) and how the fix addresses
it. `/kit:fix` has no feature file, so `kit:pr` builds the PR from this
body. Write it for that reader.

**7. Report.**

```
Branch:  fix/<kebab-name>
Cause:   the cause, in a sentence
Fix:     the change, in a sentence
Files:   every file changed, test files included
Test:    the test file and the it title
Commit:  <hash> fix(<scope>): <summary>
Run /kit:pr
```

The last line is exactly `Run /kit:pr`. Do not run it yourself.

## Hard rules

- Two stops need the user's reply: the bug description (step 2) and the
  failing test (step 4). Never approve either yourself, and never go on in
  the same turn.
- No feature file. `/kit:fix` never writes `docs/features/<name>.md`.
- Never push. Never run `/kit:pr` or open a PR.
- Never force push, and never commit on `main`.
