import { Module } from '@nestjs/common';
import { MockInterviewController } from './mock-interview.controller';
import { MockInterviewService } from './mock-interview.service';

@Module({
  controllers: [MockInterviewController],
  providers: [MockInterviewService],
})
export class MockInterviewModule {}
