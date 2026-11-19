# Races

Detail for rule 11 in `SKILL.md`. Written in HTTP terms; how a spec holds
or spies on a request is the backend skill's wiring.

## What needs a race test

| Guard                                    | Race to test                                    | Expect                                               |
| ---------------------------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| A lock around a count rule (last admin)  | two requests that each pass alone, not together | one 200, one 409 with the domain code; count holds   |
| A unique field                           | two creates, or two updates, of one value       | one 2xx, one 409 (domain code or `CONFLICT`), no 500 |
| An idempotent action                     | the same action twice at once                   | both 200 with the same final state                   |
| A rotation with a grace window (refresh) | the old secret used right after a rotation      | accepted inside the window, refused after it         |
| A conditional update (optimistic check)  | two writers on one version                      | one wins, the other gets its code, no lost write     |

A rule that holds per request without shared state (a field rule, a role
check) has no race to test.

## What the test asserts

| Assert                      | Why                                                           |
| --------------------------- | ------------------------------------------------------------- |
| The sorted pair of statuses | either request may win; assert `[200, 409]`, not which one    |
| The loser's code            | a 409 from the wrong rule, or a 500, is the bug               |
| The final stored state      | the invariant itself: one admin left, one row with the value  |
| Either order passes         | two callers acting on each other, both directions in one test |

Never assert which request won, or timing.

## It must fail without its guard

A race test that passes with its guard removed proves nothing. Remove the
lock, the transaction or the mapping, run the test several times, and see
it fail (`mutation-checks.md`). If it never fails, the requests are not
overlapping: force them to, then check again.

## Making the requests overlap

Two requests sent at once usually run one after the other.

| The route                                               | Do                                    |
| ------------------------------------------------------- | ------------------------------------- |
| has a slow step before the write (password hashing)     | no hold; the slow step overlaps them  |
| has none: the pre-check and the write follow each other | hold both, so both pass the pre-check |

A hold stops each request after the pre-check the rule reads (the count,
the existing row) and before its write. Release both once both have
arrived, so both have passed the pre-check before either writes. Checks
that come before the rule (auth, role) run before the hold. A request that
never reaches the rule fails the wrong way: a role check turning the loser
into a 403 hides the rule under test.

Getting a request into the window on purpose (the caller disabled between
the role check and the rule) is the same tool. Use it for a branch the
route can only reach in a race, and say so in the comment.

## What a race test cannot prove

It shows the outcome held this run. Whether the requests interleaved inside
the rule is timing, so a missing lock is caught only sometimes. Every race
test carries a comment that says:

- what invariant it guards,
- that it guards the outcome and only sometimes catches a missing lock,
- how the requests are made to overlap: held, or by which slow step,
- both counts from when it was written: how often it failed on the real
  code and with the guard removed, e.g. "failed 0 of 20 with the lock, 20
  of 20 without". The first shows it is not flaky, the second that it can
  catch the bug.

A unit spec cannot test a race: the stubbed store has no lock. Its comment
names the e2e test that does.

## A unique field

The domain check (read, then write) is a race by itself. The unique index
is the real guard, and the api maps its violation to 409. The test sends
both writes at once with no hold: the outcome must be one success and one
409, never a 500, whichever check caught it.

## The web side

The web has its own races, tested in web specs, not here:

| Case                                          | Expect                                 |
| --------------------------------------------- | -------------------------------------- |
| Five requests get 401 at once                 | one refresh, five retries              |
| A retry after a refresh that changed the user | no retry as the other user             |
| A slow response for an old filter             | the newer filter's rows stay on screen |

Several tabs sharing one session are browser cases (`browser-tests.md`).
