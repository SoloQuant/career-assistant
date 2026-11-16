import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import type {
  AiChatSession,
  AiChatMessage,
  CreateSessionRequest,
  SendMessageRequest,
  ChatSessionListResponse,
  ChatMessageListResponse,
} from '@shared/api.interface';
import { AiChatService } from './ai-chat.service';

@NeedLogin()
@Controller('api/ai-chat')
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Get('sessions')
  async getSessions(@Req() req: Request): Promise<ChatSessionListResponse> {
    const { userId } = req.userContext;
    return this.aiChatService.getSessions(userId);
  }

  @Post('sessions')
  async createSession(
    @Req() req: Request,
    @Body() dto: CreateSessionRequest,
  ): Promise<AiChatSession> {
    const { userId } = req.userContext;
    return this.aiChatService.createSession(userId, dto);
  }

  @Get('sessions/:id')
  async getSession(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<AiChatSession> {
    const { userId } = req.userContext;
    const session: AiChatSession | null = await this.aiChatService.getSession(
      userId,
      id,
    );
    if (!session) {
      throw new NotFoundException('会话不存在');
    }
    return session;
  }

  @Delete('sessions/:id')
  async deleteSession(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    const { userId } = req.userContext;
    const deleted = await this.aiChatService.deleteSession(userId, id);
    if (!deleted) {
      throw new NotFoundException('会话不存在');
    }
    return { success: true };
  }

  @Get('sessions/:id/messages')
  async getMessages(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ChatMessageListResponse> {
    const { userId } = req.userContext;
    // 校验会话归属
    const session: AiChatSession | null = await this.aiChatService.getSession(
      userId,
      id,
    );
    if (!session) {
      throw new NotFoundException('会话不存在');
    }
    return this.aiChatService.getMessages(id);
  }

  @Post('send')
  async sendMessage(
    @Req() req: Request,
    @Body() dto: SendMessageRequest,
  ): Promise<AiChatMessage> {
    const { userId } = req.userContext;
    if (!dto.sessionId || !dto.content?.trim()) {
      throw new BadRequestException('sessionId 和 content 不能为空');
    }
    return this.aiChatService.sendMessage(userId, dto);
  }

  @Post('sessions/:id/messages')
  async sendMessageToSession(
    @Req() req: Request,
    @Param('id') sessionId: string,
    @Body() body: { content: string },
  ): Promise<AiChatMessage> {
    const { userId } = req.userContext;
    if (!body.content?.trim()) {
      throw new BadRequestException('content 不能为空');
    }
    const dto: SendMessageRequest = { sessionId, content: body.content };
    return this.aiChatService.sendMessage(userId, dto);
  }
}
