import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../platform/database/prisma.service.js';
import { AuditService } from './audit.service.js';

describe('AuditService.getWorkspaceAuditLogs', () => {
  const findMany = vi.fn().mockResolvedValue([]);
  const service = new AuditService({
    auditLog: { findMany },
  } as unknown as PrismaService);

  beforeEach(() => findMany.mockClear());

  it('scopes audit entries to a shift and an exclusive time range', async () => {
    await service.getWorkspaceAuditLogs(
      'workspace-1',
      20,
      undefined,
      'shift-1',
      '2025-03-11T17:00:00.000Z',
      '2025-03-12T17:00:00.000Z',
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          workspaceId: 'workspace-1',
          OR: [
            { metadata: { path: ['shiftId'], equals: 'shift-1' } },
            { metadata: { path: ['after', 'id'], equals: 'shift-1' } },
            { metadata: { path: ['before', 'id'], equals: 'shift-1' } },
          ],
          createdAt: {
            gte: new Date('2025-03-11T17:00:00.000Z'),
            lt: new Date('2025-03-12T17:00:00.000Z'),
          },
        },
        take: 21,
      }),
    );
  });

  it('rejects incomplete or inverted time ranges', async () => {
    await expect(
      service.getWorkspaceAuditLogs(
        'workspace-1',
        20,
        undefined,
        'shift-1',
        '2025-03-12T17:00:00.000Z',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.getWorkspaceAuditLogs(
        'workspace-1',
        20,
        undefined,
        'shift-1',
        '2025-03-13T17:00:00.000Z',
        '2025-03-12T17:00:00.000Z',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
