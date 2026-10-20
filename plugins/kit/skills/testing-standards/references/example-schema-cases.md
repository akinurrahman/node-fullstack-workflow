# Example: schema cases for `projects`

The spec next to the `projects` schemas in `@<scope>/shared`. The schemas
are in `kit:api-conventions`, `references/example-overview.md`. Every
rejection asserts the path and the message (rule 7).

## `projectIdParamSchema`

| `it`                          | Input                      | Expect           |
| ----------------------------- | -------------------------- | ---------------- |
| accepts a uuid                | a lowercase UUID           | the same         |
| lower-cases an uppercase uuid | the UUID uppercased        | lowercase        |
| rejects %j                    | `'website'`, `'123'`, `''` | an issue on `id` |

## `listProjectsQuerySchema`

| `it`                                         | Input                                   | Expect                               |
| -------------------------------------------- | --------------------------------------- | ------------------------------------ |
| applies the pagination defaults              | `{}`                                    | `{ page: 1, limit: 20 }`, no filters |
| parses every filter from query strings       | strings for page, limit, search, status | numbers, trimmed search, an array    |
| wraps a single status                        | `{ status: 'ACTIVE' }`                  | `['ACTIVE']`                         |
| accepts a search of exactly the max          | 100 characters                          | passes                               |
| rejects %s                                   | an unknown status, a search of 101      | an issue on `status.0`, `search`     |
| says one plain thing for a NUL in the search | `'a\0b'`                                | one issue on `search`, its message   |

## `createProjectSchema`

| `it`                              | Input                                                      | Expect                            |
| --------------------------------- | ---------------------------------------------------------- | --------------------------------- |
| trims the name                    | `'  Website redesign '`                                    | `'Website redesign'`              |
| accepts a name of exactly the max | the max length                                             | passes                            |
| says one plain thing for %s       | empty name, blank name, name over the max, NUL in the name | one issue on `name`, each message |
| rejects an unknown key            | `{ name, ownerId }`                                        | one issue on `""`                 |
| rejects a status in the body      | `{ name, status: 'ARCHIVED' }`                             | one issue on `""`                 |

## `updateProjectSchema`

| `it`                                      | Input                         | Expect                                         |
| ----------------------------------------- | ----------------------------- | ---------------------------------------------- |
| accepts any one field                     | `{ name }`, `{ description }` | the same                                       |
| accepts null for the description          | `{ description: null }`       | the same                                       |
| rejects null for the name                 | `{ name: null }`              | one issue on `name`                            |
| says to provide a field for an empty body | `{}`                          | "Provide at least one field to update" on `""` |
| rejects an unknown key                    | `{ name, ownerId }`           | one issue on `""`                              |

## No spec

`publicProjectSchema` has no rule of its own; the e2e public-shape test
covers the response. `PROJECT_ERROR_CODES` gets one test only if the
project keeps a "keys equal values" invariant for its code maps.

## Mutation checks to report

| Break                             | Fails                                     |
| --------------------------------- | ----------------------------------------- |
| remove `.trim()` from the name    | trims the name                            |
| change `strictObject` to `object` | rejects an unknown key                    |
| drop the at-least-one refinement  | says to provide a field for an empty body |
| raise the search max by one       | rejects %s                                |
