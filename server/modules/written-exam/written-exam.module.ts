import { Module } from '@nestjs/common';
import { WrittenExamController } from './written-exam.controller';
import { WrittenExamService } from './written-exam.service';

@Module({
  controllers: [WrittenExamController],
  providers: [WrittenExamService],
})
export class WrittenExamModule {}
