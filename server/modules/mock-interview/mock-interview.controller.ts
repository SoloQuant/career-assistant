import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import type {
  MockInterviewSession,
  MockInterviewMessage,
  CreateMockInterviewRequest,
  InterviewSessionListResponse,
} from '@shared/api.interface';
import { MockInterviewService } from './mock-interview.service';

interface SubmitAnswerBody {
  answer: string;
}

interface StartInterviewResult {
  session: MockInterviewSession;
  firstQuestion: string;
}

interface SubmitAnswerResult {
  nextQuestion?: string;
  isFinished: boolean;
  score?: number;
  feedback?: string;
}

@Controller('api/mock-interview')
export class MockInterviewController {
  constructor(private readonly mockInterviewService: MockInterviewService) {}

  @NeedLogin()
  @Get()
  async getSessionList(
    @Req() req: Request,
    @Query('page') pageParam?: string,
    @Query('pageSize') pageSizeParam?: string,
    @Query('status') status?: string,
    @Query('interviewType') interviewType?: string,
  ): Promise<InterviewSessionListResponse> {
    const { userId } = req.userContext;
    const page: number = pageParam ? parseInt(pageParam, 10) : 1;
    const pageSize: number = pageSizeParam ? parseInt(pageSizeParam, 10) : 10;
    return this.mockInterviewService.getSessionList(
      userId,
      isNaN(page) ? 1 : page,
      isNaN(pageSize) ? 10 : pageSize,
      status,
      interviewType,
    );
  }

  @NeedLogin()
  @Post()
  async createSession(
    @Req() req: Request,
    @Body() dto: CreateMockInterviewRequest,
  ): Promise<MockInterviewSession> {
    const { userId } = req.userContext;
    return this.mockInterviewService.createSession(userId, dto);
  }

  @NeedLogin()
  @Get(':id')
  async getSession(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<MockInterviewSession> {
    const { userId } = req.userContext;
    return this.mockInterviewService.getSessionById(userId, id);
  }

  @NeedLogin()
  @Get(':id/messages')
  async getMessages(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<MockInterviewMessage[]> {
    const { userId } = req.userContext;
    return this.mockInterviewService.getMessages(userId, id);
  }

  @NeedLogin()
  @Post(':id/start')
  async startInterview(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<StartInterviewResult> {
    const { userId } = req.userContext;
    return this.mockInterviewService.startInterview(userId, id);
  }

  @NeedLogin()
  @Post(':id/answer')
  async submitAnswer(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: SubmitAnswerBody,
  ): Promise<SubmitAnswerResult> {
    const { userId } = req.userContext;
    return this.mockInterviewService.submitAnswer(userId, id, body.answer);
  }

  @NeedLogin()
  @Delete(':id')
  async deleteSession(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    const { userId } = req.userContext;
    await this.mockInterviewService.deleteSession(userId, id);
    return { success: true };
  }
}
