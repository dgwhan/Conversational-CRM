import { Prisma } from '@prisma/client';

export async function lockMemberRow(
  tx: Prisma.TransactionClient,
  memberId: string,
): Promise<void> {
  await tx.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`SELECT id FROM workspace_members WHERE id = ${memberId}::uuid FOR UPDATE`,
  );
}

export async function lockMemberRows(
  tx: Prisma.TransactionClient,
  memberIds: string[],
): Promise<void> {
  for (const memberId of [...new Set(memberIds)].sort()) {
    await lockMemberRow(tx, memberId);
  }
}

