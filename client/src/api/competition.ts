import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  CompetitionInfo,
  CompetitionEntry,
  CompetitionPrepTaskListResponse,
  CompetitionReminderItem,
  TaskGroup,
  ProjectDocResponse,
} from '@shared/api.interface';

export async function getCompetitionInfo(): Promise<CompetitionInfo> {
  try {
    const response = await axiosForBackend({
      url: '/api/competition/info',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取比赛信息失败', error);
    throw error;
  }
}

export async function getCompetitionWork(): Promise<CompetitionEntry> {
  try {
    const response = await axiosForBackend({
      url: '/api/competition/work',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取参赛作品信息失败', error);
    throw error;
  }
}

export async function getCompetitionReminders(): Promise<
  CompetitionReminderItem[]
> {
  try {
    const response = await axiosForBackend({
      url: '/api/competition/reminders',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取比赛提醒失败', error);
    throw error;
  }
}

export async function generatePrepPlan(): Promise<TaskGroup> {
  try {
    const response = await axiosForBackend({
      url: '/api/competition/generate-prep-plan',
      method: 'POST',
    });
    return response.data;
  } catch (error) {
    logger.error('生成备赛计划失败', error);
    throw error;
  }
}

export async function getProjectDoc(): Promise<ProjectDocResponse> {
  try {
    const response = await axiosForBackend({
      url: '/api/competition/project-doc',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取项目文档失败', error);
    throw error;
  }
}

export interface DashboardRemindersResponse {
  reminders: CompetitionReminderItem[];
  nextDeadline: {
    title: string;
    date: string;
    daysLeft: number;
  } | null;
}

export async function getDashboardReminders(): Promise<DashboardRemindersResponse> {
  try {
    const response = await axiosForBackend({
      url: '/api/competition/dashboard-reminders',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取仪表盘提醒失败', error);
    throw error;
  }
}
