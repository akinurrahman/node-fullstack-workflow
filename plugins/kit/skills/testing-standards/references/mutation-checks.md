# Mutation checks

Detail for rule 4 in `SKILL.md`. A test that has never failed has not
shown it can. Before a new test counts as done, break the code it guards and
watch it fail.

## The steps

1. Start from a clean tree, or save a copy of the file you will break.
2. Run the new test green.
3. Make the smallest change to the code under test that the test should
   catch (the table below).
4. Run the test. It must fail, and its message must point at the rule, not
   at a crash somewhere else.
5. Undo the break from the saved copy, or by reverting your one edit by
   hand, never with git (below). Check that `git status` shows only what was
   there before step 3. Run the test green again.
6. Write down what you broke and which test failed, for the report.

Break the code, never the test. A test that still passes is rewritten, then
checked again.

## Runs that do not count

| Trap                               | Why                                           | Do                                     |
| ---------------------------------- | --------------------------------------------- | -------------------------------------- |
| `git restore` or `git checkout --` | it wipes every uncommitted change in the file | restore from the saved copy            |
| A run that reports 0 tests         | an empty `-t` pattern ran nothing, "0 failed" | count a run only if its test count > 0 |

Check the test count in every run, the broken one and the restored one. A
run with 0 tests proves nothing either way.

## What to break

| Test guards                | Break                                                      |
| -------------------------- | ---------------------------------------------------------- |
| An access row              | remove the role marker, or mark the route public           |
| A bad-id row               | drop the id schema from the route                          |
| An unknown-id row          | answer a missing row with 200 and `null`, or a plain error |
| A field rule               | loosen the schema (remove the limit, the format)           |
| A strict body              | make the object non-strict                                 |
| A domain code              | remove the check that throws it                            |
| A field error              | throw the domain error without its field error             |
| "Nothing changed"          | move the write before the check                            |
| A side effect              | remove it, then make it run on every path                  |
| A race                     | remove the lock or the transaction; run it several times   |
| A unique-field race        | remove the mapping of the unique violation to 409          |
| Stored state               | skip the write but keep the response                       |
| Cache invalidation (web)   | remove the invalidation                                    |
| A URL filter (web)         | drop the param from the request, or from the URL           |
| A form body (web)          | add or rename a key in the submitted values                |
| A server field error (web) | stop mapping field errors onto fields                      |
| A shared schema message    | change the message or move it to another path              |

A race test is run several times, on the real code and with the guard
removed. Which counts to record, and where, is `races.md`.

## When it is required

| Test                                               | Required               |
| -------------------------------------------------- | ---------------------- |
| Access, id rows, validation, domain codes          | yes                    |
| Stored state, nothing changed, side effects        | yes                    |
| Races                                              | yes, with both counts  |
| Web: request sent, field errors, invalidation, URL | yes                    |
| Render, smoke, "the heading shows"                 | no                     |
| A matrix block                                     | one row of each column |

## Reporting

In the PR summary or the final report, never in a commit message:

```
Mutation checks
- users.e2e: removed the admin role check from PATCH /users/:id -> "answers 403 for a USER token" failed
- users.service.spec: dropped the last-admin check -> "refuses to demote the last active admin" failed
- user-form-page.spec: stopped mapping field errors -> "puts EMAIL_TAKEN under the email field" failed
- race: removed the transaction -> "lets exactly one demotion through" failed 0 of 20 with it, 20 of 20 without
```

One line per rule, not per test run. A check you skipped is listed with the
reason.
