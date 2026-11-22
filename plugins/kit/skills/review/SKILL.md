---
name: review
description: Review the committed work on the current branch against origin/main (the merge-base with it, or a ref passed as the argument), checked against the kit standards and the project's CLAUDE.md, for a project built on the nestjs-react-monorepo-starter template. Stops on main or when the branch has no commits since the base, notes a dirty tree, and hands the branch to the kit:reviewer agent, which returns a verdict (approve or changes requested) with findings by severity, file and line, and the rule each one breaks. Use it only when asked to review the branch, its commits or its PR before merging, when the user runs /kit:review, or when kit:pr calls it. Not for uncommitted changes, a single file, a pasted diff or someone else's PR. It fixes nothing and does not run the kit:verify gate.
argument-hint: '[base-ref]'
allowed-tools: Bash(git branch --show-current), Bash(git rev-parse *), Bash(git merge-base *), Bash(git log *), Bash(git status *), PowerShell(git branch --show-current), PowerShell(git rev-parse *), PowerShell(git merge-base *), PowerShell(git log *), PowerShell(git status *)
---

# Review

The review a branch gets before it merges. `kit:git-conventions` merges a
branch only when a `/kit:review` pass found nothing left to fix. The user
runs it as `/kit:review`, or `/kit:review <base-ref>` to compare against a
ref other than `main`.

This skill runs the review. It does not cover:

- The gate: format, lint, typecheck, tests. That is `kit:verify`. A review
  does not run it, and an approve does not mean the gate passed.
- The rules a change must follow. Those are `kit:backend-architecture-nestjs`,
  `kit:api-conventions`, `kit:frontend-architecture`,
  `kit:testing-standards` and `kit:git-conventions`. The reviewer loads them;
  this skill does not repeat them.

## How to use this skill

1. Check the branch (below).
2. Find the base.
3. Collect the commits and the tree state.
4. Hand them to the `kit:reviewer` agent.
5. Show its report.

## Output style and scope

No em dashes anywhere you write. Use a hyphen, a comma, or rewrite the
sentence.

Review only. Do not review in this session: the agent does it. Do not fix,
stage, commit or push anything, even what the report names, until the user
asks after reading it.

## Steps

Run every command from the repo root, one per call. They work in
PowerShell and in bash.

**1. Check the branch.**

```
git branch --show-current
```

Empty output means a detached HEAD: stop with
`Nothing to review: HEAD is detached. Switch to the branch to review.`
On `main`, stop with
`Nothing to review: on main. Switch to the branch to review.`
Use the project's base branch name if it is not `main`.

**2. Find the base.**

When the user passed an argument (`$ARGUMENTS`), the base is
`git merge-base HEAD $ARGUMENTS`. If that fails, stop with
`Cannot review: <ref> is not a ref in this repo.`

Without an argument, try in order and take the first that works:

```
git merge-base HEAD origin/main
git merge-base HEAD main
```

Compare against the remote first: a local `main` that is behind or ahead of
`origin/main` pulls merged commits into the review, or hides some.

**3. Collect the commits and the tree state.**

```
git log --oneline <base>..HEAD
git status --short
```

No commits means there is nothing committed to review: stop with
`Nothing to review: no commits on <branch> since <base>.` Add
`The tree has uncommitted changes. Commit them first.` when the status is
not empty.

A non-empty status means the tree is dirty. Do not stop. The review covers
committed work only, and the report says so.

**4. Hand the branch to the agent.**

Start the `kit:reviewer` agent with one message holding:

- the base, as a full commit hash, and the ref it came from
- the branch name
- the commit list from step 3
- `Working tree: dirty` or `Working tree: clean`

Do not add your own reading of the diff. The agent reads it.

**5. Show the report.**

Print the agent's report as it came back. Do not shorten it, reorder it,
soften it or add findings. When the tree is dirty, the report's first lines
say so; if they do not, add above it:

```
Working tree: dirty. This review covers committed work only.
```

When the verdict is `approve`, end with this line below the report:

```
Next: /kit:pr runs verify, reviews the branch again, pushes it and opens the PR.
```

Then stop. Offer nothing else beyond the report. The user asks for fixes if
they want them.
