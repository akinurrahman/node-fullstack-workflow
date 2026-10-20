# Browser tests

Detail for rule 12 in `SKILL.md`. Browser tests run in real browsers
against production builds of the api and the web. They are slow and run on
every PR, not on every commit, so each one must prove something no web
spec can.

## Worth a browser test

| Behaviour                                    | Why a web spec cannot prove it                    |
| -------------------------------------------- | ------------------------------------------------- |
| Sign in, sign out                            | the real refresh cookie, set and cleared          |
| A reload keeps you signed in                 | the startup refresh from the cookie               |
| A signed-out deep link returns after login   | a full page load and the redirect                 |
| An expired access token refreshed silently   | real token expiry checked by the api              |
| Several tabs on one session                  | a cookie shared between pages                     |
| A wrong-role user opening a page by URL      | the guard on a full load, not a client navigation |
| A measured size (touch targets, layout)      | jsdom has no layout                               |
| Every page renders without errors            | real chunks, real styles, real console            |
| One main flow per feature, checked by reload | the real api storing it                           |

## Not worth one

| Behaviour                         | Where it goes                                              |
| --------------------------------- | ---------------------------------------------------------- |
| A field rule and its message      | the shared schema spec and the form spec                   |
| How an error code is shown        | the form or page spec                                      |
| Each filter                       | the list page spec                                         |
| A status or code on the wire      | the api e2e spec                                           |
| A second flow in the same feature | its page spec, unless it needs a cookie, a reload or a tab |

## The render check

One test visits every page as an admin and fails on a heading that does not
show, an error state, a page error, or a console error other than the
expected 401s of the auth flow.

- Pages with a nav entry are found from the nav, so a new one is covered.
- Pages without one (forms, account, detail pages) are listed by hand. A
  new page with no nav entry is added to that list in the same change.
- Pages with an id in the path are reached through a link the app renders.
- An unknown path shows the not-found page.

A page only another role can open is visited as that role.

## Writing one

| Do                                                                          | Why                                           |
| --------------------------------------------------------------------------- | --------------------------------------------- |
| Find by role and name, as in web specs                                      | the same contract the user sees               |
| Wait for the response that matters, then assert                             | the screen can change after a late refetch    |
| Create a new record per run, tagged with the project name and a random part | reruns and retries share one database         |
| Give each test its own client address if the api limits by client           | login is rate limited per client and email    |
| Check a stored change by reloading the page                                 | the cache the mutation updated is not the api |
| Wait out a real token lifetime, read from the token                         | the api checks expiry with its own clock      |

Never assert a fixed wait, never depend on another test's record, and
never reuse a server already on the test ports: it would not have the
settings the tests rely on.

## When to run them locally

Before committing any change to auth, the session, the token refresh, the
login page, routing guards or the app shell, in the api or the web. CI runs
them on every PR either way; the local run catches it before review.

## Retries

On CI a failed test is retried once, and a test that passes only on its
retry still fails the run. Locally there is no retry. A flaky browser test
is fixed or deleted in the same change (rule 16), never skipped.
