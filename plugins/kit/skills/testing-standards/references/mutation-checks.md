# Mutation checks

Detail for rule 4 in `SKILL.md`. A test that has never failed has not
shown it can. Before a new test counts as done, break the code it guards and
watch it fail.

## The steps

1. Run the new test green.
2. Make the smallest change to the code under test that the test should
   catch (the table below).
3. Run the test. It must fail, and its message must point at the rule, not
   at a crash somewhere else.
4. Restore the code. Run the test green again.
5. Write down what you broke and which test failed, for the report.

Break the code, never the test. A test that still passes is rewritten, then
checked again.

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

A race test is run several times with the guard removed; the report gives
the count ("failed 20 of 20"), and the test's comment keeps it.

## When it is required

| Test                                               | Required               |
| -------------------------------------------------- | ---------------------- |
| Access, id rows, validation, domain codes          | yes                    |
| Stored state, nothing changed, side effects        | yes                    |
| Races                                              | yes, with a run count  |
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
- race: removed the transaction -> "lets exactly one demotion through" failed 20 of 20
```

One line per rule, not per test run. A check you skipped is listed with the
reason.
