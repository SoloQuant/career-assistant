import { Module } from '@nestjs/common';
import { CourseRecController } from './course-rec.controller';
import { CourseRecService } from './course-rec.service';

@Module({
  controllers: [CourseRecController],
  providers: [CourseRecService],
})
export class CourseRecModule {}
