import { Module } from '@nestjs/common';
import { JobPushController } from './job-push.controller';
import { JobPushService } from './job-push.service';

@Module({
  controllers: [JobPushController],
  providers: [JobPushService],
})
export class JobPushModule {}
