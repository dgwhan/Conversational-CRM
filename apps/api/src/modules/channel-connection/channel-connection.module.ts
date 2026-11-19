import { Module, forwardRef } from '@nestjs/common';
import { AppConfigModule } from '../../platform/config/config.module.js';
import { PrismaModule } from '../../platform/database/prisma.module.js';
import { MessagingModule } from '../messaging/messaging.module.js';
import { LeadRoutingModule } from '../lead-routing/lead-routing.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { NotificationModule } from '../notification/notification.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { TokenEncryptionService } from './infrastructure/token-encryption.service.js';
import { OAuthService } from './application/oauth/oauth.service.js';
import { ChannelManagerService } from './application/channels/channel-manager.service.js';
import { MessageDispatcherService } from './application/dispatch/message-dispatcher.service.js';
import { ChannelSyncService } from './application/channels/channel-sync.service.js';
import { ZcaPersonalService } from './application/zca-personal/zca-personal.service.js';
import { ZaloTokenMonitorService } from './application/oauth/zalo-token-monitor.service.js';
import { ChannelConnectorController } from './presentation/channel-connector.controller.js';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    forwardRef(() => MessagingModule),
    forwardRef(() => LeadRoutingModule),
    RealtimeModule,
    NotificationModule,
    AuthModule,
  ],
  controllers: [ChannelConnectorController],
  providers: [
    TokenEncryptionService,
    OAuthService,
    ChannelManagerService,
    MessageDispatcherService,
    ChannelSyncService,
    ZcaPersonalService,
    ZaloTokenMonitorService,
  ],
  exports: [
    TokenEncryptionService,
    OAuthService,
    ChannelManagerService,
    MessageDispatcherService,
    ChannelSyncService,
    ZcaPersonalService,
    ZaloTokenMonitorService,
  ],
})
export class ChannelConnectionModule {}
