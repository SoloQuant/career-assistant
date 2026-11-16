import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import type {
  ExamQuestion,
  ExamQuestionListResponse,
  ExamRecord,
  ExamRecordListResponse,
  StartExamRequest,
  SubmitExamRequest,
} from '@shared/api.interface';
import { WrittenExamService } from './written-exam.service';

@Controller('api/written-exam')
export class WrittenExamController {
  constructor(private readonly writtenExamService: WrittenExamService) {}

  @Get('questions')
  async getQuestions(
    @Query() query: Record<string, string | undefined>,
  ): Promise<ExamQuestionListResponse> {
    const pageRaw = query.page ? parseInt(query.page, 10) : 1;
    const pageSizeRaw = query.pageSize ? parseInt(query.pageSize, 10) : 10;
    const page = isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;
    const pageSize = isNaN(pageSizeRaw) || pageSizeRaw < 1 ? 10 : pageSizeRaw;

    return this.writtenExamService.getQuestionList({
      page,
      pageSize,
      category: query.category,
      subCategory: query.subCategory,
      difficulty: query.difficulty,
    });
  }

  @Get('questions/:id')
  async getQuestionDetail(@Param('id') id: string): Promise<ExamQuestion> {
    const question = await this.writtenExamService.getQuestionById(id);
    if (!question) {
      throw new NotFoundException('题目不存在');
    }
    return question;
  }

  @NeedLogin()
  @Post('questions')
  async createQuestion(
    @Req() req: Request,
    @Body() body: Omit<ExamQuestion, 'id'>,
  ): Promise<ExamQuestion> {
    const { userId } = req.userContext;
    if (!body.title || !body.correctAnswer || !body.category) {
      throw new BadRequestException('缺少必填字段');
    }
    return this.writtenExamService.createQuestion(userId, body);
  }

  @NeedLogin()
  @Get('records')
  async getRecords(
    @Req() req: Request,
    @Query() query: Record<string, string | undefined>,
  ): Promise<ExamRecordListResponse> {
    const { userId } = req.userContext;
    const pageRaw = query.page ? parseInt(query.page, 10) : 1;
    const pageSizeRaw = query.pageSize ? parseInt(query.pageSize, 10) : 10;
    const page = isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;
    const pageSize = isNaN(pageSizeRaw) || pageSizeRaw < 1 ? 10 : pageSizeRaw;
    return this.writtenExamService.getRecordList(userId, page, pageSize);
  }

  @NeedLogin()
  @Get('records/:id')
  async getRecordDetail(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ExamRecord & { questions: ExamQuestion[] }> {
    const { userId } = req.userContext;
    return this.writtenExamService.getRecordDetail(userId, id);
  }

  @NeedLogin()
  @Post('records/start')
  async startExam(
    @Req() req: Request,
    @Body() dto: StartExamRequest,
  ): Promise<{ recordId: string; questions: ExamQuestion[] }> {
    const { userId } = req.userContext;
    if (!dto.category || !dto.title) {
      throw new BadRequestException('category 和 title 为必填项');
    }
    return this.writtenExamService.startExam(userId, dto);
  }

  @NeedLogin()
  @Post('records/submit')
  async submitExam(
    @Req() req: Request,
    @Body() dto: SubmitExamRequest,
  ): Promise<ExamRecord> {
    const { userId } = req.userContext;
    if (!dto.recordId || !dto.answers) {
      throw new BadRequestException('recordId 和 answers 为必填项');
    }
    return this.writtenExamService.submitExam(userId, dto);
  }
}
