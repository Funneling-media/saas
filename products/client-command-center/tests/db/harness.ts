import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const ROOT = join(import.meta.dirname, "..", "..");
const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");
const SHIM = join(ROOT, "supabase", "tests", "supabase-shim.sql");

export type TestDb = {
  /** Superuser pool for setup and for inspecting state outside RLS. */
  admin: pg.Pool;
  /** Opens a fresh connection, like a page reload or a new server request. */
  connect: () => Promise<pg.PoolClient>;
  drop: () => Promise<void>;
};

function serverUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error("TEST_DATABASE_URL is not set. Run `npm run test:db`.");
  }
  return url;
}

/** Creates a brand-new database, applies the Supabase shim and every migration in order. */
export async function createTestDb(): Promise<TestDb> {
  const base = new URL(serverUrl());
  const name = `cc_test_${randomUUID().replaceAll("-", "")}`;

  const bootstrap = new pg.Client({ connectionString: base.toString() });
  await bootstrap.connect();
  await bootstrap.query(`create database ${name}`);
  await bootstrap.end();

  const dbUrl = new URL(base.toString());
  dbUrl.pathname = `/${name}`;
  const admin = new pg.Pool({ connectionString: dbUrl.toString(), max: 4 });

  await admin.query(readFileSync(SHIM, "utf8"));
  const migrations = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of migrations) {
    try {
      await admin.query(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
    } catch (error) {
      throw new Error(`migration ${file} failed: ${(error as Error).message}`);
    }
  }

  return {
    admin,
    connect: () => admin.connect(),
    drop: async () => {
      await admin.end();
      const c = new pg.Client({ connectionString: base.toString() });
      await c.connect();
      await c.query(`drop database if exists ${name} with (force)`);
      await c.end();
    },
  };
}

/**
 * Runs `fn` inside a transaction as the `authenticated` role with the given user's JWT
 * claims, the same way PostgREST executes a Supabase request. Commits on success.
 */
export async function asUser<T>(
  db: TestDb,
  userId: string | null,
  fn: (c: pg.PoolClient) => Promise<T>,
  role: "authenticated" | "anon" = "authenticated",
): Promise<T> {
  const client = await db.connect();
  try {
    await client.query("begin");
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify(userId ? { sub: userId, role } : { role }),
    ]);
    await client.query(`set local role ${role}`);
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

/** Convenience: call a public function as a user and return the first column of the first row. */
export async function rpc<T = unknown>(
  db: TestDb,
  userId: string | null,
  fn: string,
  args: unknown[],
): Promise<T> {
  const placeholders = args.map((_, i) => `$${i + 1}`).join(", ");
  return asUser(db, userId, async (c) => {
    const { rows } = await c.query(`select public.${fn}(${placeholders}) as result`, args);
    return rows[0]?.result as T;
  });
}

export type Actors = {
  orgA: string;
  orgB: string;
  ownerA: string;
  adminA: string;
  csmA: string;
  viewerA: string;
  ownerB: string;
  outsider: string;
};

/** Fictional organizations and users. No real client or team data. */
export async function seedActors(db: TestDb): Promise<Actors> {
  const a: Actors = {
    orgA: randomUUID(),
    orgB: randomUUID(),
    ownerA: randomUUID(),
    adminA: randomUUID(),
    csmA: randomUUID(),
    viewerA: randomUUID(),
    ownerB: randomUUID(),
    outsider: randomUUID(),
  };
  const users = [a.ownerA, a.adminA, a.csmA, a.viewerA, a.ownerB, a.outsider];
  for (const [i, id] of users.entries()) {
    await db.admin.query("insert into auth.users (id, email) values ($1, $2)", [id, `user${i}@example.test`]);
  }
  await db.admin.query("insert into public.organizations (id, name) values ($1, 'Fixture Org A'), ($2, 'Fixture Org B')", [
    a.orgA,
    a.orgB,
  ]);
  const memberships: [string, string, string][] = [
    [a.orgA, a.ownerA, "owner"],
    [a.orgA, a.adminA, "admin"],
    [a.orgA, a.csmA, "csm"],
    [a.orgA, a.viewerA, "viewer"],
    [a.orgB, a.ownerB, "owner"],
  ];
  for (const [org, user, role] of memberships) {
    await db.admin.query("insert into public.memberships (org_id, user_id, role) values ($1, $2, $3)", [org, user, role]);
  }
  return a;
}

export const SHA_V1 = "a".repeat(64);
export const SHA_V2 = "b".repeat(64);
