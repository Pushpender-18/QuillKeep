import { db } from '@/prisma/db';

const globalForPrisma = globalThis as unknown as {
  prisma: typeof db & { $transaction: typeof db.transaction };
};

export const prisma =
  globalForPrisma.prisma ||
  Object.assign(db, {
    $transaction: db.transaction.bind(db),
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
