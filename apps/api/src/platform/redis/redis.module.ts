import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service.js';
import { DistributedLockService } from './distributed-lock.service.js';

@Global()
@Module({
  providers: [RedisService, DistributedLockService],
  exports: [RedisService, DistributedLockService],
})
export class RedisModule {}
