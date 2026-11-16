import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import type {
  InterviewQuestionWithRecord,
  InterviewListResponse,
  InterviewListParams,
  UpdateInterviewRecordRequest,
  InterviewRecord,
  InterviewStats,
} from '@shared/api.interface';
import { InterviewService } from './interview.service';

@Controller('api/interview')
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  @NeedLogin()
  @Get('questions')
  async getQuestions(
    @Req() req: Request,
    @Query() query: Record<string, string | undefined>,
  ): Promise<InterviewListResponse> {
    const { userId } = req.userContext;
    const page = query.page ? parseInt(query.page, 10) : 1;
    const pageSize = query.pageSize ? parseInt(query.pageSize, 10) : 20;
    const params: InterviewListParams & { page: number; pageSize: number } = {
      category: query.category,
      jobType: query.jobType,
      difficulty: query.difficulty,
      isFavorite: query.isFavorite !== undefined ? query.isFavorite === 'true' : undefined,
      isWrong: query.isWrong !== undefined ? query.isWrong === 'true' : undefined,
      keyword: query.keyword,
      page: isNaN(page) ? 1 : page,
      pageSize: isNaN(pageSize) ? 20 : pageSize,
    };
    return this.interviewService.getQuestionList(userId, params);
  }

  @NeedLogin()
  @Get('questions/:id')
  async getQuestionDetail(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<InterviewQuestionWithRecord> {
    const { userId } = req.userContext;
    const question = await this.interviewService.getQuestionById(userId, id);
    if (!question) {
      throw new NotFoundException('题目不存在');
    }
    return question;
  }

  @NeedLogin()
  @Get('stats')
  async getStats(@Req() req: Request): Promise<InterviewStats> {
    const { userId } = req.userContext;
    return this.interviewService.getStats(userId);
  }

  @NeedLogin()
  @Patch('questions/:id/record')
  async updateRecord(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateInterviewRecordRequest,
  ): Promise<InterviewRecord> {
    const { userId } = req.userContext;
    return this.interviewService.upsertRecord(userId, id, dto);
  }

  @NeedLogin()
  @Get('favorites')
  async getFavorites(
    @Req() req: Request,
    @Query('page') pageParam?: string,
    @Query('pageSize') pageSizeParam?: string,
  ): Promise<InterviewListResponse> {
    const { userId } = req.userContext;
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const pageSize = pageSizeParam ? parseInt(pageSizeParam, 10) : 20;
    return this.interviewService.getFavorites(userId, page, pageSize);
  }

  @NeedLogin()
  @Get('wrong-book')
  async getWrongBook(
    @Req() req: Request,
    @Query('page') pageParam?: string,
    @Query('pageSize') pageSizeParam?: string,
  ): Promise<InterviewListResponse> {
    const { userId } = req.userContext;
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const pageSize = pageSizeParam ? parseInt(pageSizeParam, 10) : 20;
    return this.interviewService.getWrongBook(userId, page, pageSize);
  }

  @NeedLogin()
  @Get('categories')
  async getCategories(): Promise<{
    categories: string[];
    jobTypes: string[];
    difficulties: string[];
  }> {
    return this.interviewService.getCategories();
  }
}
