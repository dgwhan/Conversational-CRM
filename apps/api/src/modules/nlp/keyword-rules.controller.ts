import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Headers,
  NotFoundException,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import { getRequestIdentity, requireWorkspaceId } from '../../common/auth/request-identity.js';
import { WorkspaceRole } from '../../contracts/roles.js';
import { KeywordRulesService } from './keyword-rules.service.js';
import { ConversationClassificationService } from './application/conversation-classification.service.js';
import type { KeywordRuleItem } from './keyword-scoring.js';
import type { CatalogProductItem } from './entity-extractor.js';
import type { ScoringThresholdConfig } from './domain/conversation-scoring.js';

@Controller('keyword-rules')
export class KeywordRulesController {
  constructor(
    private readonly service: KeywordRulesService,
    private readonly classificationService?: ConversationClassificationService,
  ) {}

  @Get()
  async getRules(
    @Query('workspaceId') queryWsId?: string,
    @Headers('x-workspace-id') headerWsId?: string,
    @Req() req?: any
  ): Promise<KeywordRuleItem[]> {
    // Workspace đã được WorkspaceContextGuard xác minh tư cách thành viên
    const wsId = requireWorkspaceId(req);
    return this.service.getRules(wsId);
  }

  @Post()
  async createRule(
    @Body() body: Omit<KeywordRuleItem, 'id'>,
    @Headers('x-workspace-id') headerWsId?: string,
    @Req() req?: any
  ): Promise<KeywordRuleItem> {
    const workspaceId = requireWorkspaceId(req);
    this.assertWorkspaceOwner(req);
    const created = await this.service.createRule({
      ...body,
      workspaceId,
    });
    this.classificationService?.invalidateCache(workspaceId);
    return created;
  }

  @Patch(':id')
  async updateRule(
    @Param('id') id: string,
    @Body() patch: Partial<KeywordRuleItem>,
    @Req() req?: any
  ): Promise<KeywordRuleItem | null> {
    const workspaceId = requireWorkspaceId(req);
    this.assertWorkspaceOwner(req);
    const updated = await this.service.updateRule(id, patch, workspaceId);
    if (!updated) throw new NotFoundException('Luật từ khóa không tồn tại.');
    this.classificationService?.invalidateCache(workspaceId);
    return updated;
  }

  @Delete(':id')
  async deleteRule(@Param('id') id: string, @Req() req?: any): Promise<{ success: boolean }> {
    const workspaceId = requireWorkspaceId(req);
    this.assertWorkspaceOwner(req);
    const success = await this.service.deleteRule(id, workspaceId);
    if (!success) throw new NotFoundException('Luật từ khóa không tồn tại.');
    this.classificationService?.invalidateCache(workspaceId);
    return { success };
  }

  @Post('evaluate')
  async evaluateMessage(
    @Body() body: { text: string; catalog?: CatalogProductItem[]; workspaceId?: string },
    @Headers('x-workspace-id') headerWsId?: string,
    @Req() req?: any
  ) {
    const wsId = requireWorkspaceId(req);
    return this.service.evaluateMessage(body.text || '', wsId, body.catalog || []);
  }

  @Post('classify-conversation')
  async classifyConversation(
    @Body()
    body: {
      conversationId: string;
      messages: Array<string | { content?: string | null; senderRole?: string }>;
      customerId?: string;
      workspaceId?: string;
      catalog?: CatalogProductItem[];
    },
    @Headers('x-workspace-id') headerWsId?: string,
    @Req() req?: any
  ) {
    if (!this.classificationService) {
      throw new Error('ConversationClassificationService not available');
    }
    const wsId = requireWorkspaceId(req);
    return this.classificationService.classifyConversation({
      conversationId: body.conversationId,
      messages: body.messages || [],
      customerId: body.customerId,
      workspaceId: wsId,
      catalog: body.catalog,
    });
  }

  @Get('thresholds')
  async getThresholds(
    @Query('workspaceId') queryWsId?: string,
    @Headers('x-workspace-id') headerWsId?: string,
    @Req() req?: any
  ) {
    if (!this.classificationService) {
      throw new Error('ConversationClassificationService not available');
    }
    const wsId = requireWorkspaceId(req);
    return this.classificationService.getThresholdConfig(wsId);
  }

  @Patch('thresholds')
  async updateThresholds(
    @Body() body: Partial<ScoringThresholdConfig> & { workspaceId?: string },
    @Headers('x-workspace-id') headerWsId?: string,
    @Req() req?: any
  ) {
    if (!this.classificationService) {
      throw new Error('ConversationClassificationService not available');
    }
    const wsId = requireWorkspaceId(req);
    this.assertWorkspaceOwner(req);
    const config = { ...body };
    delete config.workspaceId;
    return this.classificationService.setThresholdConfig(wsId, config);
  }

  private assertWorkspaceOwner(req?: any): void {
    if (getRequestIdentity(req).role !== WorkspaceRole.OWNER) {
      throw new ForbiddenException('Chỉ chủ sở hữu workspace mới được chỉnh sửa tiêu chí chấm điểm Lead.');
    }
  }
}

