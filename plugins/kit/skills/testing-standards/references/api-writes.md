# Api writes

Detail for rules 3 and 5 in `SKILL.md`: creates, updates, actions and
deletes. Rules 1 and 2 apply on top (`api-access.md`). What each answer must
look like is `kit:api-conventions`, `references/status-codes.md` and
`references/example-writes.md`.

"Stored" below means checked in storage, or by a read that follows. "Nothing
changed" means the row is checked equal to its state before the request, and
the side effects the route can have are checked absent.

## Create

`POST /api/<things>`.

| Case                     | Request                                       | Expect                                                |
| ------------------------ | --------------------------------------------- | ----------------------------------------------------- |
| Created                  | a valid body                                  | 201, `data` exactly as a read returns it, stored      |
| Normalized input         | values the schema trims or lowercases         | the normalized values, in the body and stored         |
| Optional field left out  | the body without it                           | 201, the field present as `null`                      |
| Server-set fields        | the valid body                                | owner, status and dates set by the server, stored     |
| Server field in the body | a key the server sets (`ownerId`, `status`)   | 400, error path `""`, nothing stored                  |
| Unknown key              | a key the schema does not know                | 400, error path `""`, nothing stored                  |
| Each field rule          | one `it.each` row per rule                    | 400 `VALIDATION_FAILED` with that field's path        |
| Store-refused character  | a NUL byte in each text field                 | 400 on that field, not 500                            |
| Taken unique value       | the value another row has, in another case    | 409 with the domain code, field error, nothing stored |
| Usable afterwards        | when the resource enables something (a login) | the follow-up request succeeds                        |
| No secret field          | the response                                  | no secret column name or value                        |

## Update

`PATCH /api/<things>/:id`.

| Case                      | Request                                            | Expect                                    |
| ------------------------- | -------------------------------------------------- | ----------------------------------------- |
| Updated                   | one field                                          | 200, the whole resource, stored           |
| Missing key               | one field only                                     | every other field unchanged               |
| `null` clears             | `null` on a nullable field                         | 200, `null` in the body and stored        |
| `null` refused            | `null` on a field that is not nullable             | 400 on that field, nothing changed        |
| Empty body                | `{}`                                               | 400, error path `""`, nothing changed     |
| Unknown key               | a key the schema does not know                     | 400, error path `""`, nothing changed     |
| Field not editable here   | a field this route does not take                   | 400, nothing changed                      |
| Each field rule           | one `it.each` row per rule                         | 400 with that field's path                |
| Taken by another row      | another row's unique value                         | 409 with a field error, nothing changed   |
| Kept by this row          | the row's own unique value                         | 200: a row never conflicts with itself    |
| Side effect only on cause | a change that triggers one, then one that does not | the effect happens for the first only     |
| Self rule                 | the caller on themselves, by id and uppercase id   | 403 with the domain code, nothing changed |
| Self, unchanged value     | the caller resending a value they may not change   | 200                                       |

## Action

`POST /api/<things>/:id/<verb>`.

| Case                    | Request                                  | Expect                                                         |
| ----------------------- | ---------------------------------------- | -------------------------------------------------------------- |
| Done                    | the resource in the starting state       | 200 with the new state, stored; or 204 with an empty body      |
| Effects                 | the same                                 | each effect the action has (sessions ended, login blocked)     |
| Already done            | the resource already in the target state | 200, the resource unchanged, `updatedAt` included              |
| Refused by state        | a state the rule forbids                 | 409 with the domain code, nothing changed                      |
| Refused for this caller | a rule about who may do this to what     | 403 with the domain code, nothing changed                      |
| Body rules              | for an action that takes input, per rule | 400 with the field path, nothing changed                       |
| Unknown key             | for an action that takes input           | 400, nothing changed                                           |
| Undone by its pair      | `enable` after `disable`                 | the starting state, and its effects reversed where they can be |

An action without input sends no body, and its id rows send none either.

## Delete

`DELETE /api/<things>/:id`.

| Case               | Request                        | Expect                                                     |
| ------------------ | ------------------------------ | ---------------------------------------------------------- |
| Deleted            | an existing id                 | 204, empty body                                            |
| Gone               | a read of it afterwards        | 404 `<ENTITY>_NOT_FOUND`                                   |
| Gone from the list | the list afterwards            | absent, `total` one lower                                  |
| Twice              | the same delete again          | 404 `<ENTITY>_NOT_FOUND`, not 204                          |
| Dependents         | a row other rows point to      | what the domain decides (cascade, or 409 and nothing gone) |
| Refused for caller | a rule about who may delete it | 403 with the domain code, still there                      |

## Rate-limited writes

A write with its own limit (a password change per user) gets two tests: the
limit is hit after the stated number of attempts, with 429 and
`Retry-After`, and another key from the same client is not blocked.
