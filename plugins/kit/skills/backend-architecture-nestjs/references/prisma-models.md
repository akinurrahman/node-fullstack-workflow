# Prisma models

Detail for rule 11 in `SKILL.md`. Paths are relative to `apps/api`. The
commands that turn a model into a migration and a client are the template's
`prisma-cli` skill and the migration procedure in its `CLAUDE.md`.

## Where models live

```
prisma/
├── schema.prisma        generator and datasource only, never a model
├── models/
│   ├── user.prisma      User, Role
│   └── auth.prisma      Session
└── migrations/
```

The Prisma config (`prisma7.config.ts`) points `schema` at the `prisma`
folder, so every `.prisma` file under it is one schema. A new domain gets a new
file, named for the domain, singular. Models that only exist for one domain
sit in that domain's file, even when they relate to a model elsewhere
(`Session` in `auth.prisma` relates to `User` in `user.prisma`).

## A model

```prisma
model User {
  id           String    @id @default(uuid(7)) @db.Uuid
  email        String    @unique
  name         String
  passwordHash String    @map("password_hash")
  role         Role      @default(USER)
  isActive     Boolean   @default(true) @map("is_active")
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamptz(3)
  sessions     Session[]

  @@map("users")
}
```

- Field names camelCase in Prisma; a field of more than one word gets
  `@map("snake_case")`. The table gets `@@map("<plural_snake_case>")`.
- Ids: `String @id @default(uuid(7)) @db.Uuid`.
- Every `DateTime` is `@db.Timestamptz(3)`. `createdAt` and `updatedAt` on
  every table that is edited.
- A comment above a field says what is stored when the type does not
  ("Stored trimmed and lower-cased").

## Enums

```prisma
enum Role {
  USER
  ADMIN

  @@map("role")
}
```

Mapped to a snake_case type name. Values match the shared Zod enum exactly;
the shared side is the one the web and the request schemas read.

## Relations

```prisma
userId String @map("user_id") @db.Uuid
user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

@@index([userId])
```

The foreign key carries `@db.Uuid` like the id it points at, and gets an
`@@index`. The back-relation (`sessions Session[]`) goes on the other model,
in its own file.

## After a change

The client is generated to `src/generated/prisma` and imported as
`../generated/prisma/client.js`. A model change lands with its migration in
the same change: `test/migrations.e2e-spec.ts` fails the e2e run when the
schema and the migrations differ. Never edit a migration that has run outside
your machine.
