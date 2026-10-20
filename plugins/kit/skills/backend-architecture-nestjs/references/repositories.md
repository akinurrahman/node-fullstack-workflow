# Repositories

Detail for rules 1, 2 and 8 in `SKILL.md`. Paths are relative to
`apps/api/src`. How to write a Prisma query is the template's
`prisma-client-api` skill; this file is only the shape around it.

## Shape

A repository is an `@Injectable()` class with `PrismaService` as its only
constructor dependency. It exports its own input types next to it:

- `Create<Entity>Data`, `Update<Entity>Data`: what a write accepts. Plain
  TypeScript interfaces, not Prisma input types, so the service cannot pass
  a nested write or a relation the repository did not plan for.
- `List<Entities>Filter`: `page`, `limit` and the list's filters. The shared
  list query type fits it structurally, so the service passes the parsed
  query through.
- `<Entities>Transaction`: the operations a service may run in a
  transaction, when one exists.

Methods return Prisma rows (`Promise<Project | null>` for a lookup), or
`{ items, total }` for a list. Never public shapes: mapping is the service's.

## Module-level functions

Each query that a transaction also needs is a function above the class taking
`db: Prisma.TransactionClient` as its first argument
(`type Db = Prisma.TransactionClient`). The class method calls it with
`this.prisma`; the transaction calls it with the transaction client. One
query, two callers, no copy.

Small helpers that keep stored data canonical live here too, as plain
functions: `normalizeEmail` in users, `escapeLike` for a `contains` search
(Prisma passes it to `ILIKE` as is, so `%` and `_` would act as wildcards).

## Lists

```ts
const where = listWhere(filter);
const [items, total] = await this.prisma.$transaction([
  this.prisma.project.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    skip: (filter.page - 1) * filter.limit,
    take: filter.limit,
  }),
  this.prisma.project.count({ where }),
]);
return { items, total };
```

The `where` is built once by a `listWhere(filter)` function, so items and
count can never disagree. `id` breaks ties in the order, so two pages never
share a row.

## Transactions

```ts
transaction<T>(run: (tx: ProjectsTransaction) => Promise<T>): Promise<T> {
  return this.prisma.$transaction((db) =>
    run({
      findById: (id) => findById(db, id),
      update: (id, data) => update(db, id, data),
    }),
  );
}
```

The interface lists only what the service's rules need inside the
transaction. A lock that holds rows until commit (`SELECT ... FOR UPDATE`
through `$queryRaw`) is a transaction method with a comment saying what it
locks and why a concurrent request waits (`lockActiveAdminIds` in users).

A side effect on another table that must happen in the same statement goes in
the write's options (`revokeSessions` on the users update), not in a second
call from the service.
