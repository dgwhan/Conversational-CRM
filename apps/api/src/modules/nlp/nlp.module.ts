import { Module } from '@nestjs/common';
import { KeywordRulesService } from './keyword-rules.service.js';
import { KeywordRulesController } from './keyword-rules.controller.js';
import { ConversationClassificationService } from './application/conversation-classification.service.js';
import { LlmAmbiguityGatewayService } from './application/llm-ambiguity-gateway.service.js';

@Module({
  controllers: [KeywordRulesController],
  providers: [
    KeywordRulesService,
    ConversationClassificationService,
    LlmAmbiguityGatewayService,
  ],
  exports: [
    KeywordRulesService,
    ConversationClassificationService,
    LlmAmbiguityGatewayService,
  ],
})
export class NlpModule { }

