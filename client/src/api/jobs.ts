import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { JobItem, JobFilterParams } from '@shared/api.interface';

export async function getRecommendedJobs(filters?: {
  source?: string;
}): Promise<JobItem[]> {
  try {
    const response = await axiosForBackend({
      url: '/api/jobs/recommended',
      method: 'GET',
      params: filters,
    });
    return response.data;
  } catch (error) {
    logger.error('获取推荐岗位失败', error);
    throw error;
  }
}

export async function getJobs(params: JobFilterParams): Promise<JobItem[]> {
  try {
    const response = await axiosForBackend({
      url: '/api/jobs',
      method: 'GET',
      params,
    });
    return response.data;
  } catch (error) {
    logger.error('获取岗位列表失败', error);
    throw error;
  }
}
