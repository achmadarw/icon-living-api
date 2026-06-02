import type { Prisma, TransactionType } from '@prisma/client';

const LEDGER_LOCK_KEY = 92026001;

function toSignedAmount(type: TransactionType, amount: Prisma.Decimal): number {
  const value = amount.toNumber();
  return type === 'INCOME' ? value : -value;
}

export async function acquireLedgerLock(tx: Prisma.TransactionClient) {
  // Serialize ledger writers in a DB transaction to avoid race conditions.
  await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${LEDGER_LOCK_KEY})`);
}

export async function getLastLedgerState(tx: Prisma.TransactionClient) {
  const lastTx = await tx.transaction.findFirst({
    orderBy: { ledgerOrder: 'desc' },
    select: {
      id: true,
      ledgerOrder: true,
      createdAt: true,
      balanceAfter: true,
    },
  });

  return {
    lastLedgerOrder: lastTx?.ledgerOrder ?? null,
    lastCreatedAt: lastTx?.createdAt ?? null,
    balance: lastTx ? lastTx.balanceAfter.toNumber() : 0,
  };
}

export async function rebuildLedgerTailFromOrder(
  tx: Prisma.TransactionClient,
  startOrder: bigint,
) {
  const previous = await tx.transaction.findFirst({
    where: { ledgerOrder: { lt: startOrder } },
    orderBy: { ledgerOrder: 'desc' },
    select: { balanceAfter: true },
  });
  let runningBalance = previous ? previous.balanceAfter.toNumber() : 0;

  const rows = await tx.transaction.findMany({
    where: { ledgerOrder: { gte: startOrder } },
    orderBy: { ledgerOrder: 'asc' },
    select: {
      id: true,
      type: true,
      amount: true,
      balanceBefore: true,
      balanceAfter: true,
    },
  });

  for (const row of rows) {
    const before = runningBalance;
    const after = before + toSignedAmount(row.type, row.amount);
    const currentBefore = row.balanceBefore.toNumber();
    const currentAfter = row.balanceAfter.toNumber();
    const shouldUpdate =
      Math.abs(currentBefore - before) > 0.0001 ||
      Math.abs(currentAfter - after) > 0.0001;

    if (shouldUpdate) {
      await tx.transaction.update({
        where: { id: row.id },
        data: {
          balanceBefore: before,
          balanceAfter: after,
        },
      });
    }

    runningBalance = after;
  }
}
