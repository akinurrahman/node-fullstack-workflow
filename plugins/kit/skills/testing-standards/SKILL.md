---
name: testing-standards
description: What must be tested and how much, at every level of the monorepo - shared schema specs, api unit specs, api e2e specs written in HTTP terms (method, path, status, code), web unit and component specs, and browser tests. Covers the required cases per kind of endpoint (list, read, create, update, action, delete) and per web piece (page, form, table, filters, row action), the access, bad-id and ownership matrices, race tests and what they can prove, mutation checks, test data and fixtures, naming, what not to test, and flaky tests. Use this skill whenever writing or reviewing a test, adding an endpoint, a shared schema, a page, a form, a table or a filter, fixing a bug, or deciding whether a change needs a unit, e2e or browser test. Consult it even when the request sounds routine ("add a test for this", "cover the new endpoint") - the required case lists here are project-specific and cannot be inferred from the existing specs.
---

# Testing standards

`@<scope>/shared` below means the project's shared package. Check the root
`package.json` for the actual scope (e.g. `@acme/shared`).

What must be tested, at which level, and how much. The api cases are written
in HTTP terms only: method, path, status, code and body. Any backend that
follows `kit:api-conventions`, NestJS today or Express later, is held to the
same lists unchanged.

This skill is the "what". It does not cover:

- What each status and error code means, and when a route sends it. That is
  `kit:api-conventions`.
- How api tests are set up in NestJS: the runners, `createApp`, the test
  database, service stubs. That is `kit:backend-architecture-nestjs`,
  `references/tests.md`.
- How web tests are set up: jsdom, the msw server, `renderApp`, fixture
  files. That is `kit:frontend-architecture`, its Tests section.

## How to use this skill

1. Read the rules below. Each one is something a past change got wrong.
2. Open the reference for what you are adding and turn its case table into
   `it` titles before writing any test body.
3. Run the test checks, right after the rules, before reporting complete.

### Which reference to read

| File                                 | Read it when                                                             |
| ------------------------------------ | ------------------------------------------------------------------------ |
| `references/api-access.md`           | any route: the access and id matrices, and the checks made once per app  |
| `references/api-reads.md`            | you add or change a list or a read                                       |
| `references/api-writes.md`           | you add or change a create, an update, an action or a delete             |
| `references/races.md`                | a rule depends on a lock, a unique field, or a retried action            |
| `references/units-and-schemas.md`    | you write a service rule, a pure helper, or a shared schema              |
| `references/web-pages-forms.md`      | you add a page or a form                                                 |
| `references/web-tables-filters.md`   | you add a table, a filter, or a row action                               |
| `references/browser-tests.md`        | the change touches auth, the session, navigation, layout, or adds a page |
| `references/data-and-naming.md`      | you create test data, name a test, or pick how exact an assertion is     |
| `references/mutation-checks.md`      | you are about to report a test as done                                   |
| `references/example-api-cases.md`    | you want the full api case list of one resource (`projects`)             |
| `references/example-web-cases.md`    | you want the full web case list of one feature (`projects`)              |
| `references/example-schema-cases.md` | you want the case list of one shared schema file                         |

**If a case you need is not covered here**, copy the nearest existing spec
in the repo (the users specs first) and say in your summary which one and
why. When an existing spec and this skill disagree, follow the skill for new
tests, flag the old spec in your summary, and do not rewrite it unless asked.

## Output style and scope

No em dashes anywhere you write: test names, comments, commit messages, or
the summary you report back. Use a hyphen, a comma, or rewrite the sentence.

Test what the request changes. Tests go in the same commit as the code they
cover. A gap you notice in an existing spec goes in your summary, not in the
same change.

## The levels

| Level          | Where                           | Proves                                                           | Never                         |
| -------------- | ------------------------------- | ---------------------------------------------------------------- | ----------------------------- |
| Shared schema  | `*.spec.ts` next to the schema  | what the schema accepts, rejects and transforms, and its message | HTTP, storage                 |
| Api unit       | `*.spec.ts` next to the code    | every branch of a rule, every pure helper                        | a real database, HTTP         |
| Api e2e        | the api's e2e folder            | the wire: status, code, body and stored state, through the app   | every branch of every rule    |
| Web unit, page | `*.spec.ts(x)` next to the code | what a user sees and which request the web sends                 | the real api, a real browser  |
| Browser        | the browser tests package       | what only a real browser decides                                 | validation, copy, error codes |

## The rules that actually matter

**1. Every route gets the access and bad-id rows.**

| Case       | Request                                        | Expect                                   |
| ---------- | ---------------------------------------------- | ---------------------------------------- |
| No token   | the route, no `Authorization`                  | 401 `UNAUTHORIZED`                       |
| Wrong role | a signed-in caller below the route's role      | 403 `FORBIDDEN`                          |
| Bad id     | every `:id` route, id `not-a-uuid`, right role | 400 `VALIDATION_FAILED`, error path `id` |
| Unknown id | every `:id` route, an unused UUID, right role  | 404 `<ENTITY>_NOT_FOUND`                 |

Send a valid body on the id rows, so the id is the only thing wrong. One
table-driven block per module covers every route, so a new route is one
row. A public route instead gets a test that it answers without a token.
A domain that hides rows from some callers adds the ownership rows: a
hidden row answers every route with the unknown-id 404, exactly, and a row
the caller can see but not change answers a write with 403
(`kit:api-conventions`, rule 12). Detail in `references/api-access.md`.

**2. Every error code a route can return has a test.**
Each domain code, each 409, and `VALIDATION_FAILED` for each input with a
rule gets a test on status and code. The first test of a code in a module
asserts the whole body exactly: `statusCode`, `code`, `message` and
`errors`. A domain error tied to one input also asserts its field error
path and code. What each code means is `kit:api-conventions`, rules 3 to 5.

**3. Check a write where it lands. Check a refused write changed nothing.**
A successful write is checked in storage, or through a read that follows
it, not only in its response. A refused write (400, 403, 404, 409) is
checked to leave the stored row as it was and to have no side effect: no
row created, no session revoked, no email sent. The error response alone
does not show that nothing happened.

**4. Mutation-check every test that guards a rule.**
Break the code the test guards, run the test, see it fail for the reason
it names, restore. Required for access, validation, domain codes, field
errors, races, cache invalidation and URL state; optional for a render or
smoke test. Report what you broke and which test failed in the PR summary
or your final report, never in a commit message. Detail in
`references/mutation-checks.md`.

**5. Each kind of endpoint has a required case list.**
On top of rules 1 to 3:

| Kind   | Required                                                                                          |
| ------ | ------------------------------------------------------------------------------------------------- |
| List   | order, page fields, each filter alone and with many values, empty, past the last page, bad params |
| Read   | the exact public shape once, an uppercase id, no secret field                                     |
| Create | 201 with the resource as a read returns it, normalized input, the stored row, each field rule     |
| Update | a missing key keeps the field, `null` clears, empty body, uniqueness against another row          |
| Action | the new state, a repeat answers 200 unchanged, a refused state changes nothing                    |
| Delete | 204 with an empty body, the read is then 404, a second delete is 404                              |

Full tables in `references/api-reads.md` and `references/api-writes.md`.

**6. Rule branches go in unit specs; the wire goes in e2e.**
A service rule has every branch in its unit spec: each allowed path, each
refusal, each side effect. The e2e spec covers each route's success once and
each error code once (rule 2), to prove the status, code and body reach the
wire. It does not repeat every branch over HTTP. What only a real store can
decide (a lock, a unique index, a transaction, a cascade) is e2e only, and
the unit spec says so in one comment.

**7. Shared schema specs assert the path and the message.**
Every refinement, transform, default, custom message, length boundary and
strict object gets a case. A rejection asserts the issue path and message,
never only `success === false`: a schema that rejects for the wrong reason
must fail its spec. A boundary is tested on both sides. A schema of plain
fields with no rule gets no spec. Detail in `references/units-and-schemas.md`.

**8. Web tests act as the user and assert what the user and the api see.**
Find elements by role, label and text, and act through user events. Assert
on the screen, the URL, and the request the web sent: method, path, query
and body. Never on hook return values, component state, the query cache, or
a class name, unless the piece under test exists to set that class.

**9. Each web piece has a required case list.**

| Piece      | Required                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------- |
| Page       | loading, error with retry, data; not found for an unknown id; access denied for the wrong role |
| Form       | the exact body sent, empty submit sends nothing, server field error on its field, 5xx, pending |
| Table      | a row per item with its key values and link, empty, filtered empty with clear, paging          |
| Filters    | control to URL and query, URL back to control and query, bad URL values dropped, caps          |
| Row action | confirm then request then row updated, cancel sends nothing, refusal keeps the dialog, hidden  |

Full tables in `references/web-pages-forms.md` and
`references/web-tables-filters.md`.

**10. The fake api is as strict as the real one.**
Web tests talk to an msw fake, and a fake that accepts anything hides a
client bug. The fake parses request bodies and queries with the same shared
schemas the api uses and answers a bad one with the 400 the api would send.
Every `:id` route answers an unknown id with 404 and the domain code. Its
response bodies `satisfies` the shared response types. How the fake is
built is `kit:frontend-architecture`.

**11. A race test proves the outcome and says its limit.**
Required for every rule a lock guards, every unique field (two concurrent
writes of one value answer one success and one 409, never a 500), and every
action that can arrive twice at once. Assert exactly one winner, the loser's
status and code, and the final stored state. Such a test cannot prove the
lock exists, only that the outcome held this run; its comment says so. A
unit spec never claims to cover a race. Detail in `references/races.md`.

**12. Browser tests only for what a real browser decides.**
Cookies and the token refresh, a reload keeping the session, several tabs,
redirects around login, measured layout, and real chunk loading. Every page
is in the render check. A feature gets at most one flow test, for its main
create or act path. Validation, copy and error mapping stay in web tests.
Run the browser tests locally before changing auth, the session or the token
refresh, in the api or the web. Detail in `references/browser-tests.md`.

**13. Test data is unique, built per test, and never shared.**
Each test creates what it needs through a factory with defaults and
overrides. Values with a unique index or a rate limit key (emails, names)
are unique per test. No test depends on another test's data or on run
order. An order assertion needs data that cannot tie. Detail in
`references/data-and-naming.md`.

**14. Names say the behaviour.**
E2e specs group by route, `describe('POST /api/projects')`; web specs by
page or component. An `it` says the outcome:
`answers 409 PROJECT_NAME_TAKEN for a taken name`,
`puts PROJECT_NAME_TAKEN under the name field`. Never "works",
"handles errors" or "test 1".

**15. Do not test what is not yours.**
No test of framework or library behaviour, of a private helper through its
internals, of a constant against itself, or of a mock returning what it was
told. No snapshots, file or inline: assert the exact body or the visible
text. No coverage target: coverage may be run locally to find a missed
branch, never as a gate.

**16. A flaky test is a bug, fixed or deleted in the same change.**
The unit, e2e and web runners never retry. The browser runner retries once
on CI, and a test that passes only on its retry still fails the run. Wait
for a condition, never a fixed time. The one exception is a real clock the
server checks (a token's expiry, a timestamp with one-second resolution),
with a comment saying why. Never commit `.only` or `.skip`.

## Test checks

Run these before reporting complete. The general gate (typecheck, lint,
tests, format) is `kit:definition-of-done`.

1. Every new route has its access rows, every `:id` route its id rows, and
   an owner-scoped resource its ownership rows
2. Every error code a new route returns has a test; the first asserts the body
3. Every write checks stored state; every refused write checks nothing changed
4. The case list for the endpoint kind or web piece is covered, or the gap is
   named in the summary
5. Shared schema rejections assert path and message
6. Every rule-guarding test was mutation-checked, and the summary says how
7. The msw fake validates with the shared schemas and 404s an unknown id
8. No snapshot, no fixed wait outside a commented real clock, no `.only` or
   `.skip`, no retry added
9. Unique data per test, no dependence on order
10. Every new page is in the browser render check
11. Tests are in the same commit as the code

## Who wires what

- A NestJS api: runners, `createApp`, the test database, service stubs and
  test-only controllers. `kit:backend-architecture-nestjs`,
  `references/tests.md` and `references/example-tests.md`.
- An Express api: the same case lists, through its own wiring. The request
  and response pairs in `kit:api-conventions` are its oracle.
- The web: jsdom, the msw server, `renderApp`, fixture files.
  `kit:frontend-architecture`, its Tests section.
- Browser tests: the browser tests package and the commands in the
  project's `CLAUDE.md`.
