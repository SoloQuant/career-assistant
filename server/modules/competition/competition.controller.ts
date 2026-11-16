import {
  Controller,
  Get,
  Post,
  NotFoundException,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import type {
  CompetitionInfo,
  CompetitionEntry,
  CompetitionReminderItem,
  ProjectDocResponse,
  TaskGroup,
} from '@shared/api.interface';
import { CompetitionService } from './competition.service';

interface CompetitionDetailResponse {
  competition: CompetitionInfo;
  work: CompetitionEntry | null;
  reminders: CompetitionReminderItem[];
}

interface DashboardRemindersResponse {
  reminders: CompetitionReminderItem[];
  nextDeadline: {
    title: string;
    date: string;
    daysLeft: number;
  } | null;
}

@Controller('api/competition')
export class CompetitionController {
  constructor(private readonly service: CompetitionService) {}

  @Get()
  async getCompetition(): Promise<CompetitionDetailResponse> {
    return this.service.getCompetitionDetail();
  }

  @Get('info')
  async getInfo(): Promise<CompetitionDetailResponse> {
    return this.service.getCompetitionDetail();
  }

  @Get('reminders')
  async getReminders(): Promise<CompetitionReminderItem[]> {
    return this.service.getReminders();
  }

  @Get('dashboard-reminders')
  async getDashboardReminders(): Promise<DashboardRemindersResponse> {
    return this.service.getDashboardReminders();
  }

  @NeedLogin()
  @Post('generate-prep-plan')
  async generatePrepPlan(@Req() req: Request): Promise<TaskGroup> {
    const userId: string = req.userContext?.userId ?? '';
    const result: TaskGroup = await this.service.generatePrepPlan(userId);
    if (!result) {
      throw new NotFoundException('生成备赛计划失败');
    }
    return result;
  }

  @Get('project-doc')
  async getProjectDoc(): Promise<ProjectDocResponse> {
    return this.service.getProjectDoc();
  }

  @Get('work')
  async getWork(): Promise<CompetitionEntry | null> {
    return this.service.getWork();
  }
}
