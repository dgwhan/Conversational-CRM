import { Module, Provider, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../platform/database/prisma.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { WorkspaceConfigModule } from '../workspace-config/workspace-config.module.js';
import { ChannelConnectionModule } from '../channel-connection/channel-connection.module.js';
import { ActivityModule } from '../activities/activity.module.js';
import { WorkingHoursService } from './application/working-hours.service.js';
import { ChannelAdapterRegistry, CHANNEL_ADAPTERS } from './application/channel-adapter.registry.js';
import { ReceiveInboundMessage } from './application/receive-inbound-message.usecase.js';
import { ProcessMessageReceived } from './application/process-message-received.usecase.js';
import { ImportMessagesUseCase } from './application/import-messages.usecase.js';
import { ContactMergeService } from './application/contact-merge.service.js';
import { CustomerService } from './application/customer.service.js';
import { CustomerTagService } from './application/customer-tag.service.js';
import { MessageRepository } from './infrastructure/message.repository.js';
import { WebhookController } from './presentation/webhook.controller.js';
import { MessageImportController } from './presentation/message-import.controller.js';
import { CustomerController } from './presentation/customer.controller.js';
import { ContactController } from './presentation/contact.controller.js';
import { MediaProxyController } from './presentation/media-proxy.controller.js';
import { MessageStorageController } from './presentation/message-storage.controller.js';
import { MessageStorageRepository } from './infrastructure/message-storage.repository.js';
import { MessageStorageService } from './application/message-storage.service.js';
import { RetentionSchedulerService } from './application/retention-scheduler.service.js';
import { INBOUND_QUEUE, type InboundMessageQueue } from './domain/channel-adapter.port.js';
import { InboundJobHandler } from './application/inbound-job.handler.js';
import { InboundMessageSideEffects } from './application/inbound-message-side-effects.service.js';
import { UnprocessedMessageSweeper } from './application/unprocessed-message-sweeper.service.js';
import { BullMqInboundQueue } from './infrastructure/bullmq-inbound-queue.js';
import { InProcessInboundQueue } from './infrastructure/in-process-inbound-queue.js';
import { RedisService } from '../../platform/redis/redis.service.js';
import { ManualImportAdapter } from './infrastructure/adapters/manual-import.adapter.js';
import { ZaloAdapter } from './infrastructure/adapters/zalo.adapter.js';
import { FacebookAdapter } from './infrastructure/adapters/facebook.adapter.js';
import { CUSTOMER_GATEWAY } from './domain/customer-gateway.port.js';
import { CLASSIFICATION_GATEWAY } from './domain/classification-gateway.port.js';
import { DefaultCustomerGateway } from './infrastructure/gateways/default-customer.gateway.js';
import { DefaultClassificationGateway } from './infrastructure/gateways/default-classification.gateway.js';
/**
 * Hàng đợi inbound:
 * - Có REDIS_URL  -> BullMQ (bền vững, retry, chạy được nhiều instance).
 * - Không có Redis -> hàng đợi trong tiến trình, chạy nền (chỉ cho development/test; production bắt buộc Redis).
 * Trong cả hai trường hợp webhook KHÔNG xử lý tin trong request.
 */
const queueProvider: Provider = {
    provide: INBOUND_QUEUE,
    useFactory: (redis: RedisService, handler: InboundJobHandler, config: ConfigService): InboundMessageQueue => {
        if (redis.enabled) {
            const workerFlag = String(config.get('INBOUND_WORKER_ENABLED') ?? 'true').toLowerCase();
            return new BullMqInboundQueue(redis, handler, {
                workerEnabled: workerFlag !== 'false',
                concurrency: Number(config.get('INBOUND_WORKER_CONCURRENCY') ?? 5) || 5,
            });
        }
        return new InProcessInboundQueue(handler);
    },
    inject: [RedisService, InboundJobHandler, ConfigService],
};

const customerGatewayProvider: Provider = {
    provide: CUSTOMER_GATEWAY,
    useClass: DefaultCustomerGateway,
};

const classificationGatewayProvider: Provider = {
    provide: CLASSIFICATION_GATEWAY,
    useClass: DefaultClassificationGateway,
};

const adaptersProvider: Provider = {
    provide: CHANNEL_ADAPTERS,
    useFactory: (manual: ManualImportAdapter, zalo: ZaloAdapter, fb: FacebookAdapter) => {
        return [manual, zalo, fb];
    },
    inject: [ManualImportAdapter, ZaloAdapter, FacebookAdapter],
};

@Module({
    imports: [
        PrismaModule,
        RealtimeModule,
        AuditModule,
        WorkspaceConfigModule,
        forwardRef(() => ChannelConnectionModule),
        forwardRef(() => ActivityModule),
    ],
    controllers: [
        WebhookController,
        MessageImportController,
        CustomerController,
        ContactController,
        MediaProxyController,
        MessageStorageController,
    ],
    providers: [
        MessageRepository,
        MessageStorageRepository,
        MessageStorageService,
        RetentionSchedulerService,
        ChannelAdapterRegistry,
        ReceiveInboundMessage,
        ProcessMessageReceived,
        InboundMessageSideEffects,
        InboundJobHandler,
        UnprocessedMessageSweeper,
        ImportMessagesUseCase,
        ContactMergeService,
        CustomerService,
        CustomerTagService,
        WorkingHoursService,
        DefaultCustomerGateway,
        DefaultClassificationGateway,
        ManualImportAdapter,
        ZaloAdapter,
        FacebookAdapter,
        queueProvider,
        adaptersProvider,
        customerGatewayProvider,
        classificationGatewayProvider,
    ],
    exports: [
        MessageRepository,
        ChannelAdapterRegistry,
        ReceiveInboundMessage,
        ProcessMessageReceived,
        ImportMessagesUseCase,
        ContactMergeService,
        CustomerService,
        CustomerTagService,
        WorkingHoursService,
        MessageStorageService,
        RetentionSchedulerService,
        INBOUND_QUEUE,
        CHANNEL_ADAPTERS,
        CUSTOMER_GATEWAY,
        CLASSIFICATION_GATEWAY,
    ],
})
export class MessagingModule {}
