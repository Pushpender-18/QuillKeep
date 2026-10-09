import { db } from '@/prisma/db';

type TransactionContext = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Executes a database transaction with Supabase RLS user claims set for the given userId.
 * Runs fn inside transaction after executing:
 * select set_config('request.jwt.claims', '{"sub":"<userId>","role":"authenticated"}', true)
 */
export async function withUser<T>(
  userId: string,
  fn: (tx: TransactionContext) => Promise<T>
) {
  return db.transaction(async (tx) => {
    const plan = db.raw
      .sql`select set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: 'authenticated' })}, true)`
      .affectedCount()
      .build();
    await tx.execute(plan);
    return fn(tx);
  });
}
