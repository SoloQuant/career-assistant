import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  InterviewQuestionWithRecord,
  InterviewListResponse,
  InterviewListParams,
  UpdateInterviewRecordRequest,
  InterviewRecord,
  InterviewStats,
} from '@shared/api.interface';

const BASE = '/api/interview';

export async function getQuestionList(
  params: InterviewListParams,
): Promise<InterviewListResponse> {
  logger.info('获取面试题列表', params);
  const { data } = await axiosForBackend.get(`${BASE}/questions`, { params });
  return data as InterviewListResponse;
}

export async function getQuestionDetail(
  id: string,
): Promise<InterviewQuestionWithRecord> {
  logger.info('获取面试题详情', id);
  const { data } = await axiosForBackend.get(`${BASE}/questions/${id}`);
  return data as InterviewQuestionWithRecord;
}

export async function getInterviewStats(): Promise<InterviewStats> {
  logger.info('获取面试统计');
  const { data } = await axiosForBackend.get(`${BASE}/stats`);
  return data as InterviewStats;
}

export async function updateRecord(
  id: string,
  data: UpdateInterviewRecordRequest,
): Promise<InterviewRecord> {
  logger.info('更新答题记录', id, data);
  const res = await axiosForBackend.patch(`${BASE}/records/${id}`, data);
  return res.data as InterviewRecord;
}

export async function getCategories(): Promise<{
  categories: string[];
  jobTypes: string[];
  difficulties: string[];
}> {
  logger.info('获取筛选选项');
  const { data } = await axiosForBackend.get(`${BASE}/categories`);
  return data as { categories: string[]; jobTypes: string[]; difficulties: string[] };
}
