import { db } from './index.ts';
import { users } from './schema.ts';

/**
 * Safely fetches or creates a user record in the Cloud SQL Postgres database.
 * Uses an ON CONFLICT upsert statement to prevent concurrent insertion race conditions.
 */
export async function getOrCreateUser(uid: string, email: string) {
  try {
    const result = await db.insert(users)
      .values({
        uid,
        email,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error(`getOrCreateUser failure for UID: ${uid}`, error);
    // Fallback: query user
    try {
      const existing = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.uid, uid)
      });
      if (existing) return existing;
    } catch (innerErr) {
      console.error('Failed fallback query for user:', innerErr);
    }
    throw new Error('Database user registration failed.', { cause: error });
  }
}
