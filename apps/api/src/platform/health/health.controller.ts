import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { Public } from "../../common/decorators/public.decorator.js";
import { SkipRateLimit } from "../../common/decorators/rate-limit.decorator.js";
import { PrismaService } from "../database/prisma.service.js";
import { RedisService } from "../redis/redis.service.js";

/** Trả 503 khi Postgres hoặc Redis (nếu được cấu hình) không phản hồi, để load balancer / Docker loại instance này. */
@Public()
@SkipRateLimit()
@Controller('health')
export class HealthController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService,
    ) {}

    @Get()
    async checkHealth() {
        const [db, redis] = await Promise.all([
            this.prisma.$queryRaw`SELECT 1`.then(() => 'ok', () => 'down'),
            this.redis.client ? this.redis.client.ping().then(() => 'ok', () => 'down') : Promise.resolve('disabled'),
        ]);

        const status = { status: db === 'ok' && redis !== 'down' ? 'ok' : 'error', db, redis };
        if (status.status !== 'ok') throw new ServiceUnavailableException(status);
        return status;
    }
}
