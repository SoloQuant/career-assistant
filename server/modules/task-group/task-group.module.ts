import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TaskGroupController } from './task-group.controller';
import { TaskGroupService } from './task-group.service';
import { TaskGroupSkillService } from './task-group-skill.service';

@Module({
  imports: [HttpModule],
  controllers: [TaskGroupController],
  providers: [TaskGroupService, TaskGroupSkillService],
  exports: [TaskGroupService, TaskGroupSkillService],
})
export class TaskGroupModule {}
