# Web pages and forms

Detail for rules 8 and 9 in `SKILL.md`. How a page is rendered with the app
around it, and how the msw fake is built, is `kit:frontend-architecture`.
Find elements by role, label and text; assert on the screen, the URL and
the requests sent.

## Page

| Case               | Arrange                                 | Expect                                                  |
| ------------------ | --------------------------------------- | ------------------------------------------------------- |
| Loading            | the query never answers                 | the named loading status (`Loading <thing>`)            |
| Data               | the fake answers                        | the heading and the data                                |
| Error              | the fake answers 500                    | the error state, and its retry sends the request again  |
| Not found          | an unknown id in the URL                | the not-found state                                     |
| Wrong role         | a signed-in caller below the route role | access denied, and its nav item hidden                  |
| Signed out         | no session                              | sent to login with the page as the redirect target      |
| Nav entry          | the right role                          | the nav link, in its group, with its `href`             |
| Read only for self | the caller on their own record          | the controls they may not use disabled, with the reason |

Pass the user explicitly in every access case; never rely on the default.

## Form

One spec covers create and edit when they share the form.

| Case                      | Act                                        | Expect                                                         |
| ------------------------- | ------------------------------------------ | -------------------------------------------------------------- |
| Create                    | fill every field, submit                   | the exact body sent, the success toast, landed where it should |
| Created row shown         | the same                                   | the new row on the page it lands on                            |
| Normalized on send        | type values the schema normalizes          | the normalized values in the body                              |
| Empty submit              | submit with nothing filled                 | each field's plain message, no request sent                    |
| Each client rule          | one value per rule                         | its message under its field, no request sent                   |
| Server field error        | the fake answers 409 with a field error    | the message under that field, focus on it, still on the page   |
| Shown once                | the same                                   | the message appears once: no toast or form message repeats it  |
| Non-field 4xx             | the fake answers a 4xx with no field error | one form-level message                                         |
| 5xx                       | the fake answers 500                       | safe copy, no detail from the response                         |
| 429                       | the fake answers 429 with `Retry-After`    | the wait in words                                              |
| Pending                   | the fake holds the response                | submit disabled; a second click sends nothing                  |
| Edit prefill              | open the edit page                         | each field shows the stored value                              |
| Edit save                 | change one field, save                     | the body sent, landed back, the change shown there             |
| Next submit clears errors | fail, then fix and submit                  | the old message gone                                           |
| Confirm field             | a mismatch                                 | its message, no request sent                                   |
| Editing yourself          | save a change to your own record           | the shell shows the change (the user menu name)                |

Assert the request body with exact equality: an extra key the api rejects is
a bug the form test must catch.

## Account and auth forms

The same form rows, plus:

| Case                   | Expect                                       |
| ---------------------- | -------------------------------------------- |
| Login refused          | one form message, nothing on the fields      |
| Login with a redirect  | lands on the redirect target, never off-site |
| Already signed in      | the login page sends you on                  |
| Wrong current password | the message under the current password field |
| Password changed       | the toast, and the form cleared              |

## Data a page loads for a field

An async select or a cascade gets: the options loaded on open, the search
sent with its term, the empty and error states, and a dependent field
cleared and reloaded when its parent changes.

## What a page or form test does not cover

- Each field rule's wording: the shared schema spec owns it; the form test
  proves one rule per field reaches the screen.
- Cookies, reloads and tabs: browser tests.
- The look of the error state: its system component has its own spec.
