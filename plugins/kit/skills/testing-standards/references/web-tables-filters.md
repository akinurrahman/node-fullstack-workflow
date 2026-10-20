# Web tables, filters and row actions

Detail for rule 9 in `SKILL.md`. How tables, URL filters and confirm
dialogs are built is `kit:frontend-architecture`. These cases are written
against a list page; a system component in isolation has its own spec.

## Table on a list page

| Case                | Arrange                          | Expect                                                     |
| ------------------- | -------------------------------- | ---------------------------------------------------------- |
| Rows                | the default fixture set          | a row per item, each with its key values and lookup labels |
| Row link            | the same                         | the link's `href` goes to the record                       |
| Empty               | the fake returns no rows         | the empty state with its heading                           |
| Filtered empty      | a filter that matches nothing    | the filtered empty state, and its clear resets the URL     |
| Loading             | the first request held           | the loading rows                                           |
| Error               | the fake answers 500             | the error state with retry                                 |
| Next page           | more rows than one page          | the next rows, `page=2` in the URL and in the request      |
| Last page           | on the last page                 | next disabled                                              |
| Kept during refetch | an open row menu, then a refetch | the menu stays open                                        |

Find a row by its text and walk up to the row, not by the row's accessible
name: computing every row's name is slow enough to time out a full run.

## Filters

One row per filter, unless noted.

| Case                       | Act                                    | Expect                                                       |
| -------------------------- | -------------------------------------- | ------------------------------------------------------------ |
| Control to URL and request | use the control                        | the URL param set, the next list request carries it          |
| URL to control and request | load the page with the param           | the control shows it, the first request carries it           |
| Mapped value               | a URL value the api spells differently | the api's param in the request, the URL's absent             |
| Many values                | several values from the URL            | the request repeats the key                                  |
| Bad URL value              | an unknown value in the URL            | dropped from the request and the control                     |
| Cap                        | a value past the shared max            | cut to the max in the request; the input has the `maxlength` |
| Search debounce            | type a term                            | one request with the whole term, not one per key             |
| Page reset                 | change a filter on page 2              | the page param gone                                          |
| Clear                      | clear filters                          | the URL empty and an unfiltered request                      |
| Back and forward           | change a filter, then go back          | the old filter, control and rows                             |

Take the cap from the shared constant, never a typed number, so the test
moves with the schema.

## Row actions

| Case                | Act                                     | Expect                                                      |
| ------------------- | --------------------------------------- | ----------------------------------------------------------- |
| Confirmed           | open the menu, pick the action, confirm | the request sent, the row updated, the success toast        |
| Dialog text         | the same                                | the dialog names the record                                 |
| Cancelled           | cancel the dialog                       | no request sent                                             |
| Refused             | the fake answers 409 with a domain code | its message shown, the dialog still open, the row unchanged |
| Pending             | the fake holds the response             | both dialog buttons disabled, the pending label shown       |
| Not offered         | a row the action does not apply to      | the menu item absent (disable on a disabled row)            |
| Not offered to you  | your own row, for a self rule           | the menu item absent                                        |
| Pair                | the opposite action                     | offered instead, and works                                  |
| Action with a form  | an action that takes input              | the form rows in `web-pages-forms.md`, in the dialog        |
| Sends you elsewhere | an action that is a link for you        | lands on the target page                                    |

## What a list page test does not cover

- Column alignment, sticky columns, sizes: the table system's own spec.
- Every bad value a param can take: the shared schema spec.
- Real cookies and tabs: browser tests.
