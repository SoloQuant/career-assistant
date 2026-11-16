import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { CareerAssistantService } from './career-assistant.service';
import type {
  CareerAssistantSessionListResponse,
  CareerAssistantMessageListResponse,
  CareerAssistantSendRequest,
  CareerAssistantAdviceSummary,
} from '@shared/api.interface';
import type { Request } from 'express';

@Controller('api/career-assistant')
export class CareerAssistantController {
  constructor(private readonly service: CareerAssistantService) {}

  @Get('sessions')
  getSessions(
    @Req() req: Request,
  ): Promise<CareerAssistantSessionListResponse> {
    const { userId } = req.userContext;
    return this.service.getSessions(userId);
  }

  @Get('sessions/:id/messages')
  getMessages(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<CareerAssistantMessageListResponse> {
    const { userId } = req.userContext;
    return this.service.getMessages(id, userId);
  }

  @Post('send')
  sendMessage(
    @Body() dto: CareerAssistantSendRequest,
    @Req() req: Request,
  ): Promise<{ sessionId: string; reply: string }> {
    const { userId } = req.userContext;
    return this.service.sendMessage(dto, userId);
  }

  @Get('advice/summary')
  getAdviceSummary(
    @Req() req: Request,
  ): Promise<CareerAssistantAdviceSummary[]> {
    const { userId } = req.userContext;
    return this.service.getAdviceSummary(userId);
  }

  @Post('sessions/:id/read')
  markAsRead(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<void> {
    const { userId } = req.userContext;
    return this.service.markAsRead(id, userId);
  }
}
