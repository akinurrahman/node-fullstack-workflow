# Api reads

Detail for rule 5 in `SKILL.md`: lists and single reads. Rules 1 and 2 apply
on top (`api-access.md`). What each answer must look like is
`kit:api-conventions`, `references/pagination-and-queries.md` and
`references/example-reads.md`.

## List

`GET /api/<things>`. Every row is one `it`, unless noted.

| Case                     | Request                                      | Expect                                                |
| ------------------------ | -------------------------------------------- | ----------------------------------------------------- |
| Default order and paging | 3 rows, `?page=1&limit=2`, then `?page=2`    | the declared order, exact `pagination` on both pages  |
| Public shape             | one row                                      | `data[0]` equals the public object exactly            |
| No secret field          | any list                                     | the text has no secret column name or value           |
| Empty                    | no rows                                      | 200, `data: []`, `total: 0`, `totalPages: 0`          |
| Past the last page       | `?page=<last + 1>`                           | 200, `data: []`, the real `total` and `totalPages`    |
| Each filter, one value   | `?<filter>=<value>`                          | only matching rows, by id                             |
| Each array filter, many  | `?<filter>=A&<filter>=B`                     | rows matching either                                  |
| Each boolean filter      | `=true`, then `=false`                       | the right rows for each                               |
| Search                   | mixed case term, matching any searched field | every row matching any field, case ignored            |
| Search, wildcards        | `%` and `_` as the term                      | treated as plain text                                 |
| Search, empty            | `?search=`                                   | same rows as no search                                |
| Search, over the cap     | one character past the max length            | 400 on `search`                                       |
| Filters combined         | two filters at once                          | rows matching both                                    |
| Each sort field          | `?sort=<field>`, then `?sort=-<field>`       | ascending, then descending                            |
| Sort tie-breaker         | two keys, rows equal on the first            | the second key decides                                |
| Bad param value          | one `it.each` row per param                  | 400 `VALIDATION_FAILED` with that param's path        |
| Bad array item           | `?<filter>=A&<filter>=NOPE`                  | 400 with path `<filter>.1`                            |
| Unknown sort field       | `?sort=nope`                                 | 400 on `sort.0`                                       |
| Unknown param            | `?_=123`                                     | 200, ignored                                          |
| Hidden rows, when any    | rows the caller may not see exist            | absent from `data`, not counted in `total`            |
| Summary, when declared   | the list carries a summary                   | the counts match the whole filtered set, not the page |

Order rows need data that cannot tie on the sort key: create the rows in
sequence and assert ids, not names, when the order is by creation time.

A filter that maps a URL value to another query value (a `status` of
`disabled` sent as `isActive=false`) is a web case, not an api one.

## Read

`GET /api/<things>/:id`.

| Case            | Request                      | Expect                                                     |
| --------------- | ---------------------------- | ---------------------------------------------------------- |
| Found           | an existing id               | 200 `{ data }` with that resource                          |
| Public shape    | the same, once per resource  | exact object: `null` fields present, lowercase id, ISO UTC |
| No secret field | the same                     | no secret column name or value in the text                 |
| Uppercase id    | the existing id in uppercase | 200, the id lowercase in the body                          |
| Bad id          | `not-a-uuid`                 | 400 on `id` (the id matrix)                                |
| Unknown id      | an unused UUID               | 404 `<ENTITY>_NOT_FOUND` (the id matrix)                   |
| Hidden          | a row the caller may not see | 404, the same body as an unknown id (ownership matrix)     |

`/me` and other self routes are reads too: the caller's own record, and 401
without a token.

## Docs

When the api publishes an OpenAPI document, a list route gets one test that
its query params are documented with the right names and, for an array
filter, as an array of the item type. Once per list, not per param.

## What a read test does not cover

- The paging maths on a fixed set: once per app (`api-access.md`).
- Every way a param can be malformed: the shared schema spec does that; the
  e2e row per param proves only that the schema is wired.
