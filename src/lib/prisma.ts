import { db } from '@/prisma/db';

function parseSqlTemplate(strings: TemplateStringsArray, values: any[]) {
  let sql = '';
  const params: any[] = [];
  for (let i = 0; i < strings.length; i++) {
    sql += strings[i];
    if (i < values.length) {
      params.push(values[i]);
      sql += '$' + params.length;
    }
  }
  return { sql, params };
}

async function queryRaw(strings: TemplateStringsArray, ...values: any[]): Promise<any[]> {
  const runtime = (db as any).runtime();
  const { sql, params } = parseSqlTemplate(strings, values);
  const gen = await runtime.driver.query({ sql, params });
  const rows: any[] = [];
  for await (const row of gen) {
    rows.push(row);
  }
  return rows;
}

async function executeRaw(strings: TemplateStringsArray, ...values: any[]): Promise<number> {
  const runtime = (db as any).runtime();
  const { sql, params } = parseSqlTemplate(strings, values);
  const res = await runtime.driver.execute({ sql, params });
  return typeof res?.affectedRows === 'number' ? res.affectedRows : 0;
}

const globalForPrisma = globalThis as unknown as {
  prisma: typeof db & {
    $transaction: typeof db.transaction;
    $queryRaw: typeof queryRaw;
    $executeRaw: typeof executeRaw;
  };
};

const client = (globalForPrisma.prisma || db) as typeof db & {
  $transaction: typeof db.transaction;
  $queryRaw: typeof queryRaw;
  $executeRaw: typeof executeRaw;
};


client.$transaction = db.transaction.bind(db);
client.$queryRaw = queryRaw;
client.$executeRaw = executeRaw;

export const prisma = client;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;


