# Unit specs and shared schemas

Detail for rules 6 and 7 in `SKILL.md`. How a service is built with stubs
is `kit:backend-architecture-nestjs`, `references/tests.md`.

## Service rules

A unit spec runs the service over a stubbed store. One `describe` per
method that has a rule.

| Case                       | Assert                                                              |
| -------------------------- | ------------------------------------------------------------------- |
| Each allowed path          | the result, and the exact data handed to the store                  |
| Each refusal               | status and code of the thrown error, and the store write not called |
| A field error on a refusal | its path and code                                                   |
| Each side effect           | asked for on the path that causes it, and not on the others         |
| Only known fields written  | an input with an extra key writes only the fields the method takes  |
| Unknown id                 | the not-found code                                                  |
| A no-op                    | the target already in the end state: no write, the row returned     |
| Expensive step skipped     | a lock or lookup is not taken when the rule does not need it        |
| Unchanged value allowed    | resending a value the caller may not change is not refused          |

Assert the error by `statusCode` and `code`, the fields every backend sends
on the wire, never by message text or class name.

What the store decides (a lock, a unique index, a transaction, a cascade)
is not in the unit spec. One comment at the top names the e2e test that
covers it.

## Rules the wire cannot show

Some rules give the same response either way, so only a unit spec sees
them. These are required in the unit spec, with a comment saying why:

| Rule                                       | Assert                                     |
| ------------------------------------------ | ------------------------------------------ |
| Login with an unknown email still verifies | the dummy verify ran, the real one did not |
| A lost race inside the service             | the branch taken when the store reports it |
| A secret is never logged or returned       | the value handed to the logger or mapper   |

## Pure helpers

A function with no I/O (paging maths, parsing, formatting, a URL builder)
gets a table of inputs and outputs: the normal case, each edge (zero, one,
the maximum, empty, past the end), and each input it refuses. Use `it.each`
with the input in the title.

Env and config schemas are pure helpers: every required key missing, every
default, every refused value, and every value that must never reach a log.

## Shared schemas

A spec next to each schema file in `@<scope>/shared`. Cases by what the
schema decides:

| Schema has                    | Case                                                        |
| ----------------------------- | ----------------------------------------------------------- |
| A transform (trim, lowercase) | the output value, exactly                                   |
| A default                     | `parse({})` returns it                                      |
| A length or number limit      | at the limit passes, one past fails with path and message   |
| A custom message              | the message, on the right path, as the only issue           |
| An enum                       | each value passes; a near miss (wrong case, unknown) fails  |
| A strict object               | an unknown key fails with path `""`                         |
| A refinement                  | the case it refuses and the nearest case it allows          |
| A query coercion              | the string forms (`"2"`, `"false"`, one value for an array) |
| A store-refused character     | a NUL byte fails with the plain message, on its field       |
| A form-facing field           | an empty value gives one plain message, not two             |

A rejection asserts the path and message:

```ts
expect(schema.safeParse(value).error?.issues).toEqual([
  expect.objectContaining({ path: ['name'], message: 'Enter a name' }),
]);
```

Never only `success === false`: a schema that rejects for another reason
passes that.

## What gets no schema spec

| Schema                                   | Why                                                      |
| ---------------------------------------- | -------------------------------------------------------- |
| Plain fields with no rule (`{ status }`) | it decides nothing the type does not                     |
| A response type with no transform        | the e2e public-shape test covers it                      |
| A constant map                           | unless its keys must equal its values, one test for that |
