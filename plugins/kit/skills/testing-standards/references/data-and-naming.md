# Test data, naming and assertions

Detail for rules 13 to 16 in `SKILL.md`.

## Test data

| Rule                                                            | Why                                                   |
| --------------------------------------------------------------- | ----------------------------------------------------- |
| One factory per entity, with defaults and overrides             | a test states only what matters to it                 |
| Unique values for unique and rate-limited fields                | tests never collide on an index or a limit bucket     |
| E2e storage emptied before each test                            | a count rule (last admin) sees only this test's rows  |
| Fixed ids and dates in unit and web fixtures                    | a failure reads the same on every run                 |
| Ids that look real (UUIDs) everywhere                           | a schema check on the id never fails the fixture      |
| Fixtures typed with the model or the shared type                | a new field breaks the fixture at compile time        |
| A fixture constant is never mutated; copy and override          | tests in one file cannot leak into each other         |
| Users created directly, then signed in through the real login   | the session is real                                   |
| Fake secrets cheap to compute, in tests only                    | the suite stays fast; the stored format is still real |
| An order assertion uses data that cannot tie                    | rows created in one millisecond can sort either way   |
| A relative date from a fixed clock, never "now" in an assertion | a run near midnight or a second boundary passes       |

The web fake starts from a default set (the signed-in admin, a second
admin, an active user, a disabled one) that most list cases need, and a
test that needs more passes its own rows.

## Naming

| Thing           | Pattern                                      | Example                                               |
| --------------- | -------------------------------------------- | ----------------------------------------------------- |
| E2e describe    | `METHOD /path`, one per route                | `describe('PATCH /api/projects/:id')`                 |
| Matrix describe | `%s %s (access)`, `(bad id)`, `(unknown id)` | `GET /api/projects/:id (unknown id)`                  |
| Unit describe   | `<Class>.<method>`                           | `describe('ProjectsService.archive')`                 |
| Web describe    | the page or piece                            | `describe('project list')`                            |
| Success `it`    | what happens, present tense                  | `creates the project and sets the caller as owner`    |
| Error `it`      | `answers <status> <CODE> for <cause>`        | `answers 409 PROJECT_NAME_TAKEN for a taken name`     |
| Refusal `it`    | add what did not happen                      | `answers 403 CANNOT_ARCHIVE_OTHERS, changing nothing` |
| Web `it`        | what the user sees or what is sent           | `puts PROJECT_NAME_TAKEN under the name field`        |
| `it.each`       | the varying part in the title                | `answers 400 for %s`                                  |

## How exact an assertion is

| Assert                                 | Use                                                 |
| -------------------------------------- | --------------------------------------------------- |
| The first error body of each code      | exact equality on the whole body                    |
| The public shape, once per resource    | exact equality on the object                        |
| A request body the web sent            | exact equality: an extra key is a bug               |
| Later errors of a code already covered | status and `code`, plus the field error path if any |
| A success after the shape is covered   | the fields this test is about                       |
| A list                                 | the ids, in order when order matters                |
| A secret never sent                    | the response text, not a parsed field               |

## What not to test

| Not this                                   | Instead                                       |
| ------------------------------------------ | --------------------------------------------- |
| A library or the framework doing its job   | nothing; test your configuration of it        |
| A private helper reached through internals | the public behaviour that uses it             |
| A mock returning what it was told          | the code that reads the value                 |
| A constant equal to itself                 | nothing, or its one real invariant            |
| A snapshot of markup or a body             | the visible text, or the exact body           |
| A coverage percentage                      | the case lists                                |
| Copy that has no rule behind it            | one check that the message reaches the screen |

## Flaky tests

| Cause                                | Fix                                              |
| ------------------------------------ | ------------------------------------------------ |
| A fixed wait                         | wait for the response, the element, or the state |
| Shared data between tests            | build it per test                                |
| Order from rows that tie             | data that cannot tie, or assert as a set         |
| A first import too slow for a test   | load it once before the tests in that file       |
| A slow query for an accessible name  | find by text, then walk up                       |
| A toast or dialog from the last test | the reset the setup runs before each test        |
| A real clock the server checks       | the one allowed wait, with a comment saying why  |

A flaky test is fixed or deleted in the change that finds it. Never mark it
skipped, never add a retry to the unit, e2e or web runners.
