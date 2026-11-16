import { Module } from '@nestjs/common';
import { PersonalizedRecController } from './personalized-rec.controller';
import { PersonalizedRecService } from './personalized-rec.service';

@Module({
  controllers: [PersonalizedRecController],
  providers: [PersonalizedRecService],
})
export class PersonalizedRecModule {}
