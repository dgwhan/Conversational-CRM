import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Headers,
  Req,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { MessageStorageService } from '../application/message-storage.service.js';
import { RetentionSchedulerService } from '../application/retention-scheduler.service.js';
import {
  EstimatePurgeRequestSchema,
  PurgeMessagesRequestSchema,
  UpdateRetentionPolicyRequestSchema,
  type MessageStorageMetrics,
  type EstimatePurgeResponse,
  type PurgeMessagesResponse,
  type StorageRetentionPolicy,
} from '../../../contracts/message-storage.js';
import { getRequestIdentity, requireWorkspaceId } from '../../../common/auth/request-identity.js';

@Controller('messaging/storage')
export class MessageStorageController {
  private readonly logger = new Logger(MessageStorageController.name);

  constructor(
    private readonly storageService: MessageStorageService,
    private readonly schedulerService: RetentionSchedulerService,
  ) {}

  /**
   * Helper kiểm tra quyền OWNER cho các thao tác tác động dữ liệu lưu trữ
   */
  private checkOwnerPermission(role: string, actionDescription: string): void {
    if (role !== 'OWNER' && role !== 'ADMIN') {
      throw new ForbiddenException(
        `Chỉ Quản trị viên (OWNER) mới có quyền ${actionDescription}. Quyền hiện tại: ${role}`,
      );
    }
  }

  /**
   * Lấy số liệu đo lường dung lượng lưu trữ tin nhắn (Physical, Logical, Kênh, Tuổi dữ liệu)
   */
  @Get('metrics')
  async getMetrics(
    @Query('workspaceId') queryWsId?: string,
    @Headers('x-workspace-id') headerWsId?: string,
    @Req() req?: any,
  ): Promise<MessageStorageMetrics> {
    // Workspace đã được WorkspaceContextGuard xác minh tư cách thành viên
    const workspaceId = requireWorkspaceId(req);
    return this.storageService.getMetrics(workspaceId);
  }

  /**
   * Lấy chính sách lưu trữ (Retention Policy) của Workspace
   */
  @Get('policy')
  async getPolicy(
    @Query('workspaceId') queryWsId?: string,
    @Headers('x-workspace-id') headerWsId?: string,
    @Req() req?: any,
  ): Promise<StorageRetentionPolicy> {
    const workspaceId = requireWorkspaceId(req);
    return this.storageService.getRetentionPolicy(workspaceId);
  }

  /**
   * Cập nhật chính sách lưu trữ của Workspace (Thời gian lưu, bật/tắt tự động dọn dẹp)
   */
  @Patch('policy')
  async updatePolicy(
    @Body() body: unknown,
    @Query('workspaceId') queryWsId?: string,
    @Headers('x-workspace-id') headerWsId?: string,
    @Headers('x-user-role') headerUserRole?: string,
    @Headers('x-staff-id') headerStaffId?: string,
    @Req() req?: any,
  ): Promise<StorageRetentionPolicy> {
    const { role, userId: actorId } = getRequestIdentity(req);
    const workspaceId = requireWorkspaceId(req);

    this.checkOwnerPermission(role, 'thay đổi chính sách lưu trữ tin nhắn');

    const validated = UpdateRetentionPolicyRequestSchema.parse(body);
    return this.storageService.updateRetentionPolicy(workspaceId, validated, actorId);
  }

  /**
   * Xem trước số lượng tin và dung lượng ước tính giải phóng (Dry Run)
   */
  @Post('estimate-purge')
  @HttpCode(HttpStatus.OK)
  async estimatePurge(
    @Body() body: unknown,
    @Query('workspaceId') queryWsId?: string,
    @Headers('x-workspace-id') headerWsId?: string,
    @Req() req?: any,
  ): Promise<EstimatePurgeResponse> {
    const rawInput = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
    // Luôn ép về workspace đã xác minh (không tin workspaceId trong body)
    const workspaceId = requireWorkspaceId(req);

    const validated = EstimatePurgeRequestSchema.parse({
      ...rawInput,
      workspaceId,
    });

    return this.storageService.estimatePurge(validated);
  }

  /**
   * Thực hiện dọn dẹp tin nhắn thủ công (Chunked deletion)
   */
  @Post('purge')
  @HttpCode(HttpStatus.OK)
  async purgeMessages(
    @Body() body: unknown,
    @Query('workspaceId') queryWsId?: string,
    @Headers('x-workspace-id') headerWsId?: string,
    @Headers('x-user-role') headerUserRole?: string,
    @Headers('x-staff-id') headerStaffId?: string,
    @Req() req?: any,
  ): Promise<PurgeMessagesResponse> {
    const { role, userId: actorId } = getRequestIdentity(req);
    this.checkOwnerPermission(role, 'xóa dữ liệu tin nhắn');

    const rawInput = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
    // Luôn ép về workspace đã xác minh: không thể purge dữ liệu của tenant khác (hoặc toàn hệ thống)
    const workspaceId = requireWorkspaceId(req);

    const validated = PurgeMessagesRequestSchema.parse({
      ...rawInput,
      workspaceId,
    });

    return this.storageService.purgeMessages(validated, 'MANUAL', actorId);
  }

  /**
   * Kích hoạt chạy ngay quy trình tự động dọn dẹp tin nhắn quá hạn 12 tháng (Admin On-demand trigger)
   */
  @Post('retention/trigger-now')
  @HttpCode(HttpStatus.OK)
  async triggerRetentionNow(
    @Query('workspaceId') queryWsId?: string,
    @Headers('x-workspace-id') headerWsId?: string,
    @Headers('x-user-role') headerUserRole?: string,
    @Headers('x-staff-id') headerStaffId?: string,
    @Req() req?: any,
  ): Promise<PurgeMessagesResponse> {
    const { role, userId: actorId } = getRequestIdentity(req);
    this.checkOwnerPermission(role, 'kích hoạt dọn dẹp tin nhắn định kỳ');

    const workspaceId = requireWorkspaceId(req);
    return this.schedulerService.triggerRetentionNow(workspaceId, actorId);
  }
}
