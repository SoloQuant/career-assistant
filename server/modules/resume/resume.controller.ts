import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import type {
  ResumeTemplate,
  UserResume,
  CreateResumeRequest,
  UpdateResumeRequest,
  ResumeListResponse,
} from '@shared/api.interface';
import { ResumeService } from './resume.service';

@Controller('api/resume')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @NeedLogin()
  @Get('templates')
  async getTemplates(@Req() req: Request): Promise<{ items: ResumeTemplate[] }> {
    void req;
    return this.resumeService.getTemplates();
  }

  @NeedLogin()
  @Get()
  async getMyResumes(@Req() req: Request): Promise<ResumeListResponse> {
    const { userId } = req.userContext;
    return this.resumeService.listByUserId(userId);
  }

  @NeedLogin()
  @Post()
  async createResume(
    @Req() req: Request,
    @Body() dto: CreateResumeRequest,
  ): Promise<UserResume> {
    const { userId } = req.userContext;
    return this.resumeService.create(userId, dto);
  }

  @NeedLogin()
  @Get(':id')
  async getResume(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<UserResume> {
    const { userId } = req.userContext;
    return this.resumeService.findById(id, userId);
  }

  @NeedLogin()
  @Patch(':id')
  async updateResume(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateResumeRequest,
  ): Promise<UserResume> {
    const { userId } = req.userContext;
    return this.resumeService.update(id, userId, dto);
  }

  @NeedLogin()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteResume(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<void> {
    const { userId } = req.userContext;
    await this.resumeService.delete(id, userId);
  }

  @NeedLogin()
  @Post(':id/set-default')
  async setDefaultResume(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<UserResume> {
    const { userId } = req.userContext;
    return this.resumeService.setDefault(id, userId);
  }

  @NeedLogin()
  @Get(':id/export')
  async exportResume(
    @Req() req: Request,
    @Param('id') id: string,
    @Query('format') format: string,
  ): Promise<{ format: string; content: string; filename: string }> {
    const { userId } = req.userContext;
    const exportFormat = format || 'markdown';
    return this.resumeService.exportResume(id, userId, exportFormat);
  }
}
