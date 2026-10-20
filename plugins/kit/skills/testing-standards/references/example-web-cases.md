# Example: web cases for `projects`

The web side of the `projects` resource in `example-api-cases.md`: a list
page with search, a status filter and paging, a create and edit form, and an
archive row action. Admins edit and archive; every signed-in user lists,
reads and creates. How the pages, the fake and `renderApp` are built is
`kit:frontend-architecture`. The fake is a stateful `/api/projects` that
parses requests with the shared schemas (rule 10).

## Routes

| `it`                                                  | Arrange                             |
| ----------------------------------------------------- | ----------------------------------- |
| lists Projects in the sidebar                         | a USER                              |
| denies a USER %s                                      | `/projects/:id/edit`; access denied |
| sends a signed-out visitor to login with the redirect | `/projects`, no session             |

## List page: table

| `it`                                                 | Arrange                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| renders a row per project with its status            | default fixtures; name, owner, status label                  |
| links each name to its edit page                     | the `href`                                                   |
| shows the loading rows on the first load             | the list request held                                        |
| shows the error state and retries                    | the fake answers 500, then 200 on retry                      |
| shows the empty state with no projects               | no rows                                                      |
| shows the filtered empty state and clears it         | a filter matching nothing; clear empties the URL             |
| pages through the api                                | 25 rows; next page shows row 25, `page=2` in URL and request |
| keeps an open row menu open while the list refetches | open a menu, invalidate                                      |

## List page: filters

| `it`                                                    | Arrange                                                        |
| ------------------------------------------------------- | -------------------------------------------------------------- |
| writes the search to the URL and refetches              | type `web`; `search=web` in URL and request                    |
| sends one request for a whole typed term                | type five letters; one new list request                        |
| caps the search at the shared max length                | a longer URL value; cut in the request, `maxlength` on the box |
| sends the status filter from the URL as repeated params | `?status=ACTIVE&status=ARCHIVED&status=DONE`; `DONE` dropped   |
| writes a status choice to the URL and refetches         | pick Archived                                                  |
| resets the page when a filter changes                   | on page 2, change status; no `page`                            |

## List page: archive

| `it`                                                      | Arrange                                                    |
| --------------------------------------------------------- | ---------------------------------------------------------- |
| archives a project after confirmation and updates the row | confirm; `POST .../archive` sent, row says Archived, toast |
| names the project in the dialog                           | "Archive Website redesign?"                                |
| sends nothing when the dialog is cancelled                | cancel                                                     |
| disables both buttons while the archive is pending        | the request held                                           |
| offers no archive on an archived project                  | the menu item absent                                       |
| offers no archive to a USER                               | signed in as USER                                          |

## Form page: create

| `it`                                                          | Arrange                                        |
| ------------------------------------------------------------- | ---------------------------------------------- |
| creates from the list, lands back on it and shows the new row | exact body `{ name, description }`, toast      |
| sends no description when it is left empty                    | the body has no `description` key              |
| shows plain messages for an empty form without a request      | submit empty; "Enter a name", no request       |
| puts PROJECT_NAME_TAKEN under the name field and stays        | fake answers 409; focus on name, message once  |
| shows safe copy for a server error                            | fake answers 500                               |
| disables submit while saving                                  | the request held; a second click sends nothing |

## Form page: edit

| `it`                                                | Arrange                                   |
| --------------------------------------------------- | ----------------------------------------- |
| prefills from the detail query                      | name and description shown                |
| saves, lands on the list and shows the change there | exact `PATCH` body                        |
| clears the description by sending null              | empty the field; `description: null` sent |
| announces that the project is loading               | the detail request held                   |
| shows not found for an unknown project              | an unknown id                             |

## Shared pieces

None. The table, filters, confirm dialog and form are system pieces with
their own specs; these cases prove only that the page wires them to the
api.

## Browser

The `/projects` list is in the nav, so the render check covers it. The edit
page is reached through a list link in the same check. One flow test:

| `it`                                                | Steps                                                  |
| --------------------------------------------------- | ------------------------------------------------------ |
| a user creates a project, then an admin archives it | create, search for it, archive, reload, still Archived |

## Mutation checks to report

| Break                                            | Fails                                        |
| ------------------------------------------------ | -------------------------------------------- |
| drop `status` from the list request              | sends the status filter from the URL         |
| stop invalidating the list after archive         | archives a project after confirmation        |
| stop mapping field errors                        | puts PROJECT_NAME_TAKEN under the name field |
| send `description: ''` instead of leaving it out | sends no description when it is left empty   |
