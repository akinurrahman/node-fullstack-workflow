# Example: Prisma model

The model file of the `projects` example. The folder tree is in
`example-overview.md`. Creating and applying the migration is the template's
`prisma-cli` skill and the migration procedure in its `CLAUDE.md`.

## `prisma/models/project.prisma`

```prisma
enum ProjectStatus {
  ACTIVE
  ARCHIVED

  @@map("project_status")
}

model Project {
  id          String        @id @default(uuid(7)) @db.Uuid
  name        String        @unique
  description String?
  status      ProjectStatus @default(ACTIVE)
  ownerId     String        @map("owner_id") @db.Uuid
  createdAt   DateTime      @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt   DateTime      @updatedAt @map("updated_at") @db.Timestamptz(3)

  owner User @relation(fields: [ownerId], references: [id])

  @@index([ownerId])
  @@map("projects")
}
```

A new file, because projects are a new domain. Nothing goes in
`schema.prisma`.

The enum values match `PROJECT_STATUSES` in the shared package one to one.
`@unique` on `name` backs the service's conflict check: two concurrent
creates with one name end with one P2002, which the filter answers with a
generic 409.

No `onDelete` on the relation: deleting a user who owns projects should fail,
not take the projects with it. Pick it per relation; users' sessions cascade
because a session means nothing without its user.

## `prisma/models/user.prisma`

```prisma
model User {
  // ...existing fields
  sessions     Session[]
  projects     Project[]

  @@map("users")
}
```

The back-relation is the only change to another domain's file. It adds no
column.

## Then

Create the migration, review its SQL, apply it, and regenerate the client
(the template's `db:migrate` script does both). The repository imports the
new `Project` type and `Prisma` namespace from
`../generated/prisma/client.js` only after that.
