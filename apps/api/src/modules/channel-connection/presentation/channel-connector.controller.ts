import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Headers,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  HttpCode,
  HttpStatus,
  UseGuards,
  Optional,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard.js';
import { OAuthService } from '../application/oauth.service.js';
import { ChannelManagerService } from '../application/channel-manager.service.js';
import { ZcaPersonalService } from '../application/zca-personal.service.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { WorkspacePermission, WorkspacePermissions } from '../../../common/decorators/workspace-permissions.decorator.js';
import { WorkspaceRolesGuard } from '../../../common/guards/workspace-roles.guard.js';
import { WorkspaceRole } from '../../../contracts/roles.js';
import {
  ChannelTypeSchema,
  AuthorizeUrlQuerySchema,
  ExchangeTokenBodySchema,
  ActivateChannelsBodySchema,
  type ChannelType,
  type AuthorizeUrlResult,
  type ExchangeTokenResult,
  type ActivateChannelsResult,
  type ChannelAccountDto,
} from '../../../contracts/channel-connection.js';

@Controller()
@UseGuards(WorkspaceRolesGuard)
export class ChannelConnectorController {
  constructor(
    private readonly oauthService: OAuthService,
    private readonly channelManager: ChannelManagerService,
    @Optional() private readonly zcaService?: ZcaPersonalService,
  ) {}

  /**
   * GET /api/oauth/:channel/authorize-url
   * Sinh URL đăng nhập OAuth kèm state token chống CSRF (OWNER/MANAGER toàn quyền, STAFF chỉ áp dụng cho Zalo)
   */
  @Get('oauth/:channel/authorize-url')
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.MANAGER, WorkspaceRole.STAFF)
  getAuthorizeUrl(
    @Param('channel') rawChannel: string,
    @Query() rawQuery: Record<string, unknown>,
    @Req() req?: any,
  ): AuthorizeUrlResult {
    const channelResult = ChannelTypeSchema.safeParse(rawChannel.toUpperCase());
    if (!channelResult.success) {
      throw new BadRequestException(
        `Invalid channel '${rawChannel}'. Must be one of: FACEBOOK, ZALO, TIKTOK, INSTAGRAM`,
      );
    }

    // Ngoại lệ Zalo: STAFF chỉ được sinh authorize URL cho kênh Zalo
    const userRole = req?.workspace?.role;
    if (userRole === WorkspaceRole.STAFF && channelResult.data !== 'ZALO') {
      throw new ForbiddenException(
        'Nhân viên chỉ có quyền xác thực kết nối cho kênh Zalo (403 Forbidden).',
      );
    }

    const queryResult = AuthorizeUrlQuerySchema.safeParse(rawQuery);
    if (!queryResult.success) {
      throw new BadRequestException(queryResult.error.message);
    }

    return this.oauthService.generateAuthorizeUrl(
      channelResult.data as ChannelType,
      queryResult.data.redirectUri,
      queryResult.data.state,
    );
  }

  /**
   * POST /api/oauth/:channel/exchange-token
   * Trao đổi Authorization Code lấy token và danh sách Fanpage / OA (OWNER/MANAGER toàn quyền, STAFF chỉ áp dụng cho Zalo)
   */
  @Post('oauth/:channel/exchange-token')
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.MANAGER, WorkspaceRole.STAFF)
  @HttpCode(HttpStatus.OK)
  async exchangeToken(
    @Param('channel') rawChannel: string,
    @Body() rawBody: unknown,
    @Req() req?: any,
  ): Promise<ExchangeTokenResult> {
    const channelResult = ChannelTypeSchema.safeParse(rawChannel.toUpperCase());
    if (!channelResult.success) {
      throw new BadRequestException(
        `Invalid channel '${rawChannel}'. Must be one of: FACEBOOK, ZALO, TIKTOK, INSTAGRAM`,
      );
    }

    // Ngoại lệ Zalo: STAFF chỉ được trao đổi token cho kênh Zalo
    const userRole = req?.workspace?.role;
    if (userRole === WorkspaceRole.STAFF && channelResult.data !== 'ZALO') {
      throw new ForbiddenException(
        'Nhân viên chỉ có quyền xác thực kết nối cho kênh Zalo (403 Forbidden).',
      );
    }

    const bodyResult = ExchangeTokenBodySchema.safeParse(rawBody);
    if (!bodyResult.success) {
      throw new BadRequestException(bodyResult.error.message);
    }

    return this.oauthService.exchangeToken(
      channelResult.data as ChannelType,
      bodyResult.data.code,
      bodyResult.data.state,
      bodyResult.data.redirectUri,
      {
        pageId: bodyResult.data.pageId,
        pageName: bodyResult.data.pageName,
        accessToken: bodyResult.data.accessToken,
      },
    );
  }

  /**
   * POST /api/channels/activate
   * Kích hoạt danh sách Fanpage vào Workspace & Mã hóa AES-256 Token (OWNER/MANAGER toàn quyền, STAFF chỉ được kích hoạt/xác thực lại Zalo)
   */
  @Post('channels/activate')
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.MANAGER, WorkspaceRole.STAFF)
  @HttpCode(HttpStatus.OK)
  async activateChannels(
    @Body() rawBody: unknown,
    @Headers('x-workspace-id') headerWorkspaceId?: string,
    @Headers('x-owner-id') headerOwnerId?: string,
    @Req() req?: any,
  ): Promise<ActivateChannelsResult> {
    const bodyResult = ActivateChannelsBodySchema.safeParse(rawBody);
    if (!bodyResult.success) {
      throw new BadRequestException(bodyResult.error.message);
    }

    const payload = bodyResult.data;
    const authorizedWorkspaceId = req?.workspace?.id || headerWorkspaceId;
    if (payload.workspaceId && authorizedWorkspaceId && payload.workspaceId !== authorizedWorkspaceId) {
      throw new ForbiddenException('Access denied: Không thể kết nối kênh vào workspace khác với workspace đã xác thực.');
    }
    if (authorizedWorkspaceId) payload.workspaceId = authorizedWorkspaceId;
    if (!payload.workspaceId && headerWorkspaceId) {
      payload.workspaceId = headerWorkspaceId;
    }

    // Ngoại lệ Zalo: STAFF chỉ được kích hoạt hoặc xác thực lại kênh Zalo
    const userRole = req?.workspace?.role;
    if (userRole === WorkspaceRole.STAFF) {
      const hasNonZalo = payload.pages.some(
        (p) => p.channel !== 'ZALO' && (p.channel as string) !== 'ZALO_PERSONAL',
      );
      if (hasNonZalo) {
        throw new ForbiddenException(
          'Nhân viên chỉ có quyền kích hoạt hoặc xác thực lại kết nối kênh Zalo (403 Forbidden).',
        );
      }
    }

    return this.channelManager.activateChannels(payload, headerOwnerId);
  }

  /**
   * GET /api/channels
   * Danh sách các kênh đã liên kết trong Workspace (Bảo vệ cô lập dữ liệu theo Workspace)
   */
  @Get('channels')
  async getChannels(
    @Query('workspaceId') queryWorkspaceId?: string,
    @Headers('x-workspace-id') headerWorkspaceId?: string,
    @Headers('x-owner-id') headerOwnerId?: string,
    @Req() req?: any,
  ): Promise<ChannelAccountDto[]> {
    const effectiveWorkspaceId = this.requireAuthorizedWorkspace(req, queryWorkspaceId || headerWorkspaceId);
    return this.channelManager.getChannels(effectiveWorkspaceId, req?.user?.id || headerOwnerId);
  }

  /**
   * PATCH /api/channels/:id/toggle
   * Bật / Tắt hoạt động của kênh (Chỉ OWNER / ADMIN)
   */
  @Patch('channels/:id/toggle')
  @WorkspacePermissions(WorkspacePermission.MANAGE_CHANNELS)
  async toggleChannel(
    @Param('id') id: string,
    @Body('isActive') isActive?: boolean,
    @Headers('x-workspace-id') headerWorkspaceId?: string,
    @Query('workspaceId') queryWorkspaceId?: string,
    @Req() req?: any,
  ): Promise<ChannelAccountDto> {
    const effectiveWorkspaceId = this.requireAuthorizedWorkspace(req, queryWorkspaceId || headerWorkspaceId);
    return this.channelManager.toggleChannel(id, effectiveWorkspaceId, isActive);
  }

  /**
   * POST /api/channels/:id/sync
   * Đồng bộ tin nhắn từ kênh về CRM (Cho phép tất cả thành viên OWNER, MANAGER, STAFF trong workspace đều được sử dụng)
   */
  @Post('channels/:id/sync')
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.MANAGER, WorkspaceRole.STAFF)
  @HttpCode(HttpStatus.OK)
  async syncChannel(
    @Param('id') id: string,
    @Headers('x-workspace-id') headerWorkspaceId?: string,
    @Query('workspaceId') queryWorkspaceId?: string,
    @Req() req?: any,
  ) {
    const effectiveWorkspaceId = this.requireAuthorizedWorkspace(req, queryWorkspaceId || headerWorkspaceId);

    // STAFF may use the temporary Zalo sync exception, but cannot use it to sync
    // a Facebook channel by supplying another channel account ID.
    if (req?.workspace?.role === WorkspaceRole.STAFF) {
      const channelAccount = await this.channelManager.getChannelById(id, effectiveWorkspaceId);
      if (!channelAccount) {
        throw new NotFoundException('Không tìm thấy kênh trong workspace hiện tại.');
      }
      if (channelAccount.channel !== 'ZALO') {
        throw new ForbiddenException(
          'Nhân viên chỉ có quyền đồng bộ kênh Zalo (403 Forbidden).',
        );
      }
    }

    return this.channelManager.syncChannel(id, effectiveWorkspaceId);
  }

  /**
   * POST /api/channels/send-message
   * Gửi tin nhắn Outbound đến khách hàng qua Zalo OA hoặc Facebook Fanpage
   */
  @Post('channels/send-message')
  @HttpCode(HttpStatus.OK)
  async sendMessage(
    @Body()
    body: {
      channel: ChannelType;
      recipientId: string;
      content: string;
      channelAccountId?: string;
      conversationId?: string;
      workspaceId?: string;
      /** Tệp đã tải lên (POST /messaging/outbound-media) hoặc tài liệu thư viện */
      attachments?: Array<{ assetId: string }>;
    },
    @Headers('x-workspace-id') headerWorkspaceId?: string,
    @Req() req?: any,
  ) {
    if (!body.recipientId?.trim()) {
      throw new BadRequestException('recipientId (ID người nhận trên kênh) không được để trống');
    }
    const attachments = Array.isArray(body.attachments)
      ? body.attachments
          .map((a) => ({ assetId: String(a?.assetId ?? '').trim() }))
          .filter((a) => /^[0-9a-f-]{36}$/i.test(a.assetId))
      : [];
    if (!body.content?.trim() && attachments.length === 0) {
      throw new BadRequestException('Nội dung tin nhắn không được để trống');
    }
    if (attachments.length > 10) {
      throw new BadRequestException('Mỗi lần gửi tối đa 10 tệp.');
    }

    const authorizedWorkspaceId = req?.workspace?.id || headerWorkspaceId;
    if (!authorizedWorkspaceId) throw new BadRequestException('workspaceId là bắt buộc.');
    if (body.workspaceId && body.workspaceId !== authorizedWorkspaceId) {
      throw new ForbiddenException('Không thể gửi tin nhắn ngoài workspace đã xác thực.');
    }
    const staffId = req?.user?.id;
    // Lấy tên người gửi tin từ DB qua verifyStaffCanReply (assignedMember.user.fullName tại thời điểm gửi)
    // Không dùng req.user.fullName vì AuthUser chỉ chứa {id, role}, không có fullName
    const assignment = await this.channelManager.verifyStaffCanReply(
      {
        conversationId: body.conversationId,
        channelAccountId: body.channelAccountId,
        recipientId: body.recipientId.trim(),
        workspaceId: authorizedWorkspaceId,
      },
      staffId,
    );
    // assignment.staffName = tên người được gán LÚC GỬI TIN (lấy từ DB), chính xác hơn req.user
    const resolvedStaffName = assignment.staffName || 'Tư vấn viên';
    return this.channelManager.sendMessage({
      channel: body.channel || 'ZALO',
      recipientId: assignment.recipientId,
      content: (body.content ?? '').trim(),
      channelAccountId: assignment.channelAccountId,
      conversationId: body.conversationId,
      workspaceId: authorizedWorkspaceId,
      senderStaffId: staffId,
      senderStaffName: resolvedStaffName,
      ...(attachments.length > 0 ? { attachments } : {}),
    });
  }

  @Post('channels/test-send')
  @WorkspacePermissions(WorkspacePermission.MANAGE_CHANNELS)
  @HttpCode(HttpStatus.OK)
  async sendChannelTestMessage(
    @Body() body: { channel: ChannelType; recipientId?: string; content?: string; channelAccountId?: string; workspaceId?: string },
    @Headers('x-workspace-id') headerWorkspaceId?: string,
    @Req() req?: any,
  ) {
    if (!body.recipientId?.trim() || !body.content?.trim()) {
      throw new BadRequestException('ID người nhận và nội dung tin nhắn thử nghiệm là bắt buộc.');
    }
    const workspaceId = this.requireAuthorizedWorkspace(req, body.workspaceId || headerWorkspaceId);
    return this.channelManager.sendMessage({
      channel: body.channel || 'ZALO',
      recipientId: body.recipientId.trim(),
      content: (body.content ?? '').trim(),
      channelAccountId: body.channelAccountId,
      workspaceId,
    });
  }

  @Post('channels/mark-seen')
  @UseGuards(JwtAuthGuard)
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.MANAGER, WorkspaceRole.STAFF)
  @HttpCode(HttpStatus.OK)
  async markConversationSeen(
    @Body() body: { conversationId?: string },
    @Headers('x-workspace-id') workspaceId?: string,
  ) {
    if (!body.conversationId?.trim()) {
      throw new BadRequestException('conversationId không được để trống');
    }

    await this.channelManager.markFacebookConversationSeen(body.conversationId.trim(), workspaceId);
    return { success: true };
  }

  private getZcaService(): ZcaPersonalService {
    if (!this.zcaService) {
      throw new BadRequestException('ZCA Personal service is not available');
    }
    return this.zcaService;
  }

  /**
   * POST /api/channels/zalo-personal/qr-init
   * Khởi tạo phiên quét mã QR Đăng nhập Zalo Cá nhân (zca-js Engine) - Hỗ trợ STAFF duy trì phiên
   */
  @Post('channels/zalo-personal/qr-init')
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.MANAGER, WorkspaceRole.STAFF)
  @HttpCode(HttpStatus.OK)
  async initZaloPersonalQr() {
    return this.getZcaService().createQrSession();
  }

  /**
   * GET /api/channels/zalo-personal/qr-status
   * Kiểm tra trạng thái phiên quét mã QR
   */
  @Get('channels/zalo-personal/qr-status')
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.MANAGER, WorkspaceRole.STAFF)
  async getZaloPersonalQrStatus(@Query('sessionId') sessionId: string) {
    if (!sessionId) {
      throw new BadRequestException('sessionId is required');
    }
    return this.getZcaService().getQrSessionStatus(sessionId);
  }

  /**
   * POST /api/channels/zalo-personal/qr-confirm
   * Xác nhận / Mô phỏng đăng nhập thành công sau khi quét mã
   */
  @Post('channels/zalo-personal/qr-confirm')
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.MANAGER, WorkspaceRole.STAFF)
  @HttpCode(HttpStatus.OK)
  async confirmZaloPersonalQr(
    @Body()
    body: {
      sessionId: string;
      displayName?: string;
      phone?: string;
      avatarUrl?: string;
      externalAccountId?: string;
    },
  ) {
    if (!body?.sessionId) {
      throw new BadRequestException('sessionId is required');
    }
    return this.getZcaService().simulateOrConfirmQrLogin(body.sessionId, body);
  }

  /**
   * GET /api/channels/zalo-personal/safety-config
   * Lấy cấu hình giới hạn tần suất & an toàn chống khóa nick
   */
  @Get('channels/zalo-personal/safety-config')
  @WorkspacePermissions(WorkspacePermission.MANAGE_CHANNELS)
  getSafetyConfig() {
    return this.getZcaService().getSafetyConfig();
  }

  /**
   * PATCH /api/channels/zalo-personal/safety-config
   * Cập nhật cấu hình bảo vệ tần suất
   */
  @Patch('channels/zalo-personal/safety-config')
  @WorkspacePermissions(WorkspacePermission.MANAGE_CHANNELS)
  updateSafetyConfig(@Body() body: Record<string, unknown>) {
    return this.getZcaService().updateSafetyConfig(body as any);
  }

  /**
   * DELETE /api/channels/:id
   * Ngắt kết nối kênh (Chỉ OWNER / ADMIN)
   */
  @Delete('channels/:id')
  @Roles(WorkspaceRole.OWNER)
  async disconnectChannel(
    @Param('id') id: string,
    @Headers('x-workspace-id') headerWorkspaceId?: string,
    @Query('workspaceId') queryWorkspaceId?: string,
    @Req() req?: any,
  ): Promise<{ success: boolean; id: string }> {
    const effectiveWorkspaceId = this.requireAuthorizedWorkspace(req, queryWorkspaceId || headerWorkspaceId);
    return this.channelManager.disconnectChannel(id, effectiveWorkspaceId);
  }

  private requireAuthorizedWorkspace(req: any, requestedWorkspaceId?: string): string {
    const authorizedWorkspaceId = req?.workspace?.id || requestedWorkspaceId;
    if (!authorizedWorkspaceId) {
      throw new ForbiddenException('Không thể xác định workspace đã được xác thực.');
    }
    if (req?.workspace?.id && requestedWorkspaceId && requestedWorkspaceId !== req.workspace.id) {
      throw new ForbiddenException('Access denied: Không thể thao tác ngoài workspace đã xác thực.');
    }
    return authorizedWorkspaceId;
  }
}
