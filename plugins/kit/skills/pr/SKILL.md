---
name: pr
description: Ship the current branch of a project built on the nestjs-react-monorepo-starter template - the one place a branch becomes a pull request. Checks the branch (not main, named <type>/<kebab-name>, clean tree, ahead of origin/main and not behind it), runs the kit:verify gate, runs kit:review, pushes the branch with git push -u origin HEAD, fills in the project's .github/pull_request_template.md from docs/features/<name>.md or the commit messages plus the verify report and the review verdict, and opens the PR with gh pr create. Stops and reports at the first failure. Never pushes main, never force pushes, never rebases, stashes or commits. Run it as /kit:pr when a branch is ready to merge.
disable-model-invocation: true
allowed-tools: Bash(git branch --show-current), Bash(git status *), Bash(git fetch origin), Bash(git rev-list *), Bash(git merge-base *), Bash(git log *), Bash(gh --version), Bash(gh auth status), PowerShell(git branch --show-current), PowerShell(git status *), PowerShell(git fetch origin), PowerShell(git rev-list *), PowerShell(git merge-base *), PowerShell(git log *), PowerShell(gh --version), PowerShell(gh auth status)
---

# PR

The one place a branch ships. It runs the gate, then the review, then pushes
the branch and opens the pull request. The user runs it as `/kit:pr`.

Running `/kit:pr` is the user telling you to push this branch, as
`kit:git-conventions` rule 14 requires. It covers this branch and this run
only, and nothing else: no other branch, no `main`, no force push.

This skill ships a branch. It does not cover:

- The gate itself. That is `kit:verify`.
- The review itself. That is `kit:review`.
- Commit messages, branch names, rebasing and merging. That is
  `kit:git-conventions`.

## How to use this skill

1. Check the preconditions.
2. Run the gate.
3. Run the review.
4. Push the branch.
5. Write the PR title and body.
6. Open the PR.

Run the steps in order. At the first failure, stop and report it with the
output that shows it. Do not go on to the next step, and do not work around
the failure.

## Output style and scope

No em dashes anywhere you write: the PR title, the PR body, and the report.
Use a hyphen, a comma, or rewrite the sentence.

Ship the branch and stop. Do not fix, stage, commit, stash, rebase, merge or
pull anything, even what verify or the review names. The user fixes it and
runs `/kit:pr` again.

## Rules

**1. Commands work in PowerShell and in bash.**
Run every command from the repo root, one per call. No `&&`, no `||`, no
pipe, no `VAR=value cmd`, no `2>/dev/null`. Every command in this skill
works in both shells.

**2. Never push `main`. Never force push.**
The only push is `git push -u origin HEAD`, from a branch that passed
step 1. No `--force`, no `--force-with-lease`, no other refspec.

**3. The base is `origin/main`.**
Use the project's base branch name wherever this skill says `main` when it
is not `main`.

## Steps

**1. Check the preconditions.**

```
git branch --show-current
```

Empty output means a detached HEAD: stop with
`Cannot open a PR: HEAD is detached. Switch to the branch to ship.`
On `main`, stop with
`Cannot open a PR: on main. Switch to the branch to ship.`

The branch name must be `<type>/<kebab-name>`, `kit:git-conventions` rule 8:
a type from its commit type table (`feat`, `fix`, `refactor`, `docs`, `test`,
`chore`, `style`, `perf`, `ci`, `build`), a slash, then lowercase words
joined by single hyphens. Otherwise stop with
`Cannot open a PR: <branch> is not <type>/<kebab-name>. Rename the branch.`

```
git status --short
```

Any output means the tree is dirty. Stop with
`Cannot open a PR: the working tree has uncommitted changes.` and list every
file from the output. Do not stash, commit or discard them.

```
git fetch origin
git rev-list --count origin/main..HEAD
git rev-list --count HEAD..origin/main
```

If the fetch fails, stop and show its output.

The first count is the commits the branch has that `origin/main` does not.
`0` means there is nothing to ship: stop with
`Cannot open a PR: <branch> has no commits ahead of origin/main.`

The second count is the commits on `origin/main` the branch does not have.
Anything above `0` means the branch is behind: stop with
`Cannot open a PR: <branch> is <n> commits behind origin/main. Rebase it on origin/main first.`
Do not rebase. If the branch is already pushed, rebasing it rewrites pushed
history, and that is the user's call under `kit:git-conventions` rule 15.

```
gh --version
gh auth status
```

When either fails, gh is missing or not logged in, and step 6 cannot open
the PR. Stop with
`Cannot open a PR: gh is missing or not logged in. Install gh or run gh auth login, then run /kit:pr again.`

Then find the base, for step 5:

```
git merge-base HEAD origin/main
```

**2. Run the gate.**

Run `kit:verify` with the Skill tool and follow it to the end, including its
report.

Stop with the full verify report, and open no PR, when:

- any step or area check in the report is `fail`, or
- the report ends with a `Not verified:` line.

Verify may fix a failure the change caused. A fix is an uncommitted change,
so it is not in the branch the PR ships. After verify, run:

```
git status --short
```

Any output means verify changed files. Stop with the verify report and
`Verify changed files that are not committed. Commit them, then run /kit:pr again.`
and list the files. Do not commit them.

**3. Run the review.**

Run `kit:review` with the Skill tool, with no argument, and follow it to the
end, including its report.

The report starts with its verdict line, in the format `kit:reviewer`
defines:

- `Verdict: approve` means go on.
- `Verdict: changes requested` blocks. Stop and print the report as it came
  back. No push, no PR.

A report with no verdict line also blocks: stop and print it.

Inside a pr run, ignore review's closing `Next: /kit:pr` line and go on to step 4.

Keep the report as it came back, unshortened. Step 5 pastes it into the body.

**4. Push the branch.**

```
git push -u origin HEAD
```

If the push is rejected or fails, stop. Show its output and ask the user
what to do. Do not pull, rebase, merge or force push to get past it.

**5. Write the PR title and body.**

The title follows `kit:git-conventions` rules 3 and 11:
`<type>(<scope>): <subject>`.

- The type is the branch prefix: `feat/project-archive` gives `feat`.
- The scope is the package or area the change is in, by rule 2: `api`,
  `web`, `shared`, `browser`, `deps`, `ci`, `kit`. Leave it out when the
  change spans the whole repo or has no single area.
- The subject says the one change the branch carries, imperative,
  lowercase first word, no period, the whole title at most 72 characters.
- No `"`, `$` or backtick in the title: step 6 passes it in double quotes,
  and both shells read those characters there.

The body is the project's PR template, filled in. Read
`.github/pull_request_template.md` from the repo root.

- Keep every heading exactly as written, in the template's order. Do not
  add, remove, rename or reorder one.
- Replace the template's placeholder text and HTML comments under a heading
  with the content for it.
- A section with nothing to say gets `None`. Never delete it.
- Leave every checkbox unchecked, `- [ ]`. The merge checklist is for the
  human who merges.

The content comes from one source. `<name>` is the branch name without its
type prefix: `feat/project-archive` gives `project-archive`.

- When `docs/features/<name>.md` exists, take what changed and why, the
  testing, and the migration notes from it.
- Otherwise take them from the commit messages since the base:

  ```
  git log --format="%h %s%n%n%b" <base>..HEAD
  ```

Paste in, each in its own fenced code block:

- the verify report from step 2, as written, in the template's testing or
  verification section
- the review report from step 3, as it came back, in the template's
  review section, or after the verify report when the template has none

When the project has no `.github/pull_request_template.md`, the body follows
`kit:git-conventions` rule 11 instead: what changed, why, and how it was
verified, with the verify report and the review report.

**6. Open the PR.**

Write the body to a temp file with the Write tool, not with a shell command:
the two shells quote and encode text differently. Put it in the session's
scratchpad directory when there is one, otherwise in the system temp
directory. Never put it inside the repo.

```
gh pr create --base main --title "<title>" --body-file <path>
```

If gh fails, stop and show its output. When it says a PR for the branch
already exists, show that PR's URL from the output. Do not edit the
existing PR.

## Report format

```
Branch: feat/project-archive (3 commits ahead of origin/main)
Verify: pass
Review: approve
Pushed: origin/feat/project-archive
PR: https://github.com/acme/app/pull/42
```

The last line is always the PR URL that `gh pr create` printed. When a step
stopped the run, the report ends at that step's line, followed by what
stopped it: the message from the step, then the verify report, the
review report, or the command output that shows the failure.
