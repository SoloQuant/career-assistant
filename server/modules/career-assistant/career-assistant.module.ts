import { Module } from '@nestjs/common';
import { CareerAssistantController } from './career-assistant.controller';
import { CareerAssistantService } from './career-assistant.service';

@Module({
  controllers: [CareerAssistantController],
  providers: [CareerAssistantService],
})
export class CareerAssistantModule {}
