import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  RadarChartData,
  SkillGrowthDataPoint,
  ApplicationStats,
  TaskStats,
  Skill,
} from '@shared/api.interface';

export interface OverviewStats {
  totalSkills: number;
  taskCompletionRate: number;
  totalApplications: number;
  offerCount: number;
  taskStats: TaskStats;
  applicationStats: ApplicationStats;
}

export interface SkillDistributionItem {
  name: string;
  category: string;
  masteryLevel: number;
}

export interface JobMatchItem {
  status: string;
  label: string;
  count: number;
}

export async function getOverviewStats(): Promise<OverviewStats> {
  try {
    const response = await axiosForBackend({
      url: '/api/stats/overview',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取总览统计失败', error);
    throw error;
  }
}

export async function getRadarData(): Promise<RadarChartData[]> {
  try {
    const response = await axiosForBackend({
      url: '/api/stats/radar',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取雷达图数据失败', error);
    throw error;
  }
}

export async function getSkillDistribution(): Promise<SkillDistributionItem[]> {
  try {
    const response = await axiosForBackend({
      url: '/api/stats/skill-distribution',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取技能分布数据失败', error);
    throw error;
  }
}

export async function getGrowthData(): Promise<SkillGrowthDataPoint[]> {
  try {
    const response = await axiosForBackend({
      url: '/api/stats/growth',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取增长曲线数据失败', error);
    throw error;
  }
}

export async function getJobMatchData(): Promise<JobMatchItem[]> {
  try {
    const response = await axiosForBackend({
      url: '/api/stats/job-match',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取岗位匹配分布失败', error);
    throw error;
  }
}
