import { Module } from '@nestjs/common';
import { TaskGroupModule } from '../task-group/task-group.module';
import { CompetitionController } from './competition.controller';
import { CompetitionService } from './competition.service';

@Module({
  imports: [TaskGroupModule],
  controllers: [CompetitionController],
  providers: [CompetitionService],
})
export class CompetitionModule {}
