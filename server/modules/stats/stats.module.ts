import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { JobModule } from '../job/job.module';

@Module({
  imports: [JobModule],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
