import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { WrongQuestionService } from './wrong-question.service';
import type {
  WrongQuestionItem,
  WrongQuestionListResponse,
  AddWrongQuestionRequest,
  UpdateWrongQuestionRequest,
} from '@shared/api.interface';

interface WrongQuestionStats {
  totalWrong: number;
  mastered: number;
  byCategory: { category: string; count: number }[];
  bySourceType: { type: string; count: number }[];
}

const SOURCE_TYPES = ['interview', 'exam'] as const;

@Controller('api/wrong-question')
export class WrongQuestionController {
  constructor(private readonly wrongQuestionService: WrongQuestionService) {}

  @NeedLogin()
  @Get()
  async getList(
    @Req() req: Request,
    @Query('page') pageStr?: string,
    @Query('pageSize') pageSizeStr?: string,
    @Query('sourceType') sourceType?: string,
    @Query('category') category?: string,
    @Query('isMastered') isMasteredStr?: string,
  ): Promise<WrongQuestionListResponse> {
    const { userId } = req.userContext;
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const pageSize = pageSizeStr ? parseInt(pageSizeStr, 10) : 10;
    if (Number.isNaN(page) || page < 1) {
      throw new BadRequestException('page 无效');
    }
    if (Number.isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new BadRequestException('pageSize 无效');
    }
    if (sourceType && !SOURCE_TYPES.includes(sourceType as typeof SOURCE_TYPES[number])) {
      throw new BadRequestException('sourceType 无效');
    }
    const isMastered: boolean | undefined = isMasteredStr === 'true'
      ? true
      : isMasteredStr === 'false'
      ? false
      : undefined;
    return this.wrongQuestionService.getList(userId, {
      page,
      pageSize,
      sourceType: sourceType as typeof SOURCE_TYPES[number] | undefined,
      category,
      isMastered,
    });
  }

  @NeedLogin()
  @Get('stats/summary')
  async getStats(@Req() req: Request): Promise<WrongQuestionStats> {
    const { userId } = req.userContext;
    return this.wrongQuestionService.getStats(userId);
  }

  @NeedLogin()
  @Get(':id')
  async getDetail(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<WrongQuestionItem> {
    const { userId } = req.userContext;
    return this.wrongQuestionService.getDetail(userId, id);
  }

  @NeedLogin()
  @Post()
  async addWrongQuestion(
    @Req() req: Request,
    @Body() dto: AddWrongQuestionRequest,
  ): Promise<WrongQuestionItem> {
    const { userId } = req.userContext;
    if (!dto.sourceType || !SOURCE_TYPES.includes(dto.sourceType)) {
      throw new BadRequestException('sourceType 无效');
    }
    if (!dto.sourceId) {
      throw new BadRequestException('sourceId 不能为空');
    }
    if (!dto.questionTitle) {
      throw new BadRequestException('questionTitle 不能为空');
    }
    return this.wrongQuestionService.addWrongQuestion(userId, dto);
  }

  @NeedLogin()
  @Patch(':id')
  async updateWrongQuestion(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateWrongQuestionRequest,
  ): Promise<WrongQuestionItem> {
    const { userId } = req.userContext;
    if (dto.isMastered === undefined && dto.wrongCount === undefined) {
      throw new BadRequestException('未提供可更新字段');
    }
    return this.wrongQuestionService.updateWrongQuestion(userId, id, dto);
  }

  @NeedLogin()
  @Delete(':id')
  async deleteWrongQuestion(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<void> {
    const { userId } = req.userContext;
    await this.wrongQuestionService.deleteWrongQuestion(userId, id);
  }
}
