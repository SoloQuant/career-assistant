import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  IndustryTrendItem,
  SalaryPredictionResult,
  SalaryPredictionRequest,
  SkillJobHeatmapItem,
  CompetitivenessAnalysis,
  CityCostItem,
  JobCompetitionItem,
  JobCompetitionListResponse,
} from '@shared/api.interface';

const BASE = '/api/industry-trend';

export async function getSalaryTrend(
  jobType?: string,
  city?: string,
): Promise<IndustryTrendItem[]> {
  const params: Record<string, string> = {};
  if (jobType) params.jobType = jobType;
  if (city) params.city = city;
  try {
    const res = await axiosForBackend.get(`${BASE}/salary-trend`, { params });
    return res.data;
  } catch (err) {
    logger.error('getSalaryTrend failed', err);
    throw err;
  }
}

export async function getCityComparison(
  jobType: string,
): Promise<IndustryTrendItem[]> {
  try {
    const res = await axiosForBackend.get(`${BASE}/city-comparison`, {
      params: { jobType },
    });
    return res.data;
  } catch (err) {
    logger.error('getCityComparison failed', err);
    throw err;
  }
}

export interface TopSkillItem {
  skillName: string;
  count: number;
  trend: string;
}

export async function getTopSkills(
  jobType?: string,
): Promise<TopSkillItem[]> {
  const params: Record<string, string> = {};
  if (jobType) params.jobType = jobType;
  try {
    const res = await axiosForBackend.get(`${BASE}/top-skills`, { params });
    return res.data;
  } catch (err) {
    logger.error('getTopSkills failed', err);
    throw err;
  }
}

export interface JobDemandItem {
  jobType: string;
  demandCount: number;
  trendDirection: string;
  trendPercentage: number;
}

export async function getJobDemand(city?: string): Promise<JobDemandItem[]> {
  const params: Record<string, string> = {};
  if (city) params.city = city;
  try {
    const res = await axiosForBackend.get(`${BASE}/job-demand`, { params });
    return res.data;
  } catch (err) {
    logger.error('getJobDemand failed', err);
    throw err;
  }
}

export async function predictSalary(
  data: SalaryPredictionRequest,
): Promise<SalaryPredictionResult> {
  try {
    const res = await axiosForBackend.post(`${BASE}/predict-salary`, data);
    return res.data;
  } catch (err) {
    logger.error('predictSalary failed', err);
    throw err;
  }
}

export async function getPredictionHistory(): Promise<{
  items: SalaryPredictionResult[];
}> {
  try {
    const res = await axiosForBackend.get(`${BASE}/prediction-history`);
    return res.data;
  } catch (err) {
    logger.error('getPredictionHistory failed', err);
    throw err;
  }
}

export async function getSkillJobHeatmap(): Promise<SkillJobHeatmapItem[]> {
  try {
    const res = await axiosForBackend.get(`${BASE}/skill-job-heatmap`);
    return res.data;
  } catch (err) {
    logger.error('getSkillJobHeatmap failed', err);
    throw err;
  }
}

// ========== Competitiveness Analysis ==========

export async function getCompetitivenessAnalysis(
  targetJob: string,
): Promise<CompetitivenessAnalysis> {
  try {
    const res = await axiosForBackend.get(`${BASE}/competitiveness-analysis`, {
      params: { targetJob },
    });
    return res.data;
  } catch (err) {
    logger.error('getCompetitivenessAnalysis failed', err);
    throw err;
  }
}

// ========== City Cost Comparison ==========

export async function getCityCostComparison(
  jobType?: string,
  cities?: string[],
): Promise<CityCostItem[]> {
  const params: Record<string, string> = {};
  if (jobType) params.jobType = jobType;
  if (cities && cities.length > 0) params.cities = cities.join(',');
  try {
    const res = await axiosForBackend.get(`${BASE}/city-cost-comparison`, {
      params,
    });
    return res.data.items || [];
  } catch (err) {
    logger.error('getCityCostComparison failed', err);
    throw err;
  }
}

// ========== Job Competition ==========

export async function getJobCompetition(params: {
  city?: string;
  jobType?: string;
  sortBy?: string;
  page?: number;
  pageSize?: number;
}): Promise<JobCompetitionListResponse> {
  try {
    const res = await axiosForBackend.get(`${BASE}/job-competition`, { params });
    return res.data;
  } catch (err) {
    logger.error('getJobCompetition failed', err);
    throw err;
  }
}

export async function getJobCompetitionDetail(
  id: string,
): Promise<JobCompetitionItem> {
  try {
    const res = await axiosForBackend.get(`${BASE}/job-competition/${id}`);
    return res.data;
  } catch (err) {
    logger.error('getJobCompetitionDetail failed', err);
    throw err;
  }
}
