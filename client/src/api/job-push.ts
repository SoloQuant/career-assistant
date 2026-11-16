import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { JobPushListResponse } from '@shared/api.interface';

export async function getJobPushList(status?: string, page = 1, pageSize = 20): Promise<JobPushListResponse> {
  try {
    const params: Record<string, string | number> = { page, pageSize };
    if (status) params.status = status;
    const res = await axiosForBackend.get('/api/job-push', { params });
    return res.data;
  } catch (error) {
    logger.error('获取岗位推送列表失败', error);
    throw error;
  }
}

export async function markJobViewed(id: string): Promise<void> {
  try {
    await axiosForBackend.post(`/api/job-push/${id}/view`);
  } catch (error) {
    logger.error('标记已查看失败', error);
    throw error;
  }
}

export async function markJobApplied(id: string): Promise<void> {
  try {
    await axiosForBackend.post(`/api/job-push/${id}/apply`);
  } catch (error) {
    logger.error('标记已投递失败', error);
    throw error;
  }
}

export async function markJobIgnored(id: string): Promise<void> {
  try {
    await axiosForBackend.post(`/api/job-push/${id}/ignore`);
  } catch (error) {
    logger.error('标记忽略失败', error);
    throw error;
  }
}

export async function refreshJobPush(): Promise<{ newCount: number }> {
  try {
    const res = await axiosForBackend.post('/api/job-push/refresh');
    return res.data;
  } catch (error) {
    logger.error('刷新岗位推送失败', error);
    throw error;
  }
}

export async function getNewJobCount(): Promise<{ count: number }> {
  try {
    const res = await axiosForBackend.get('/api/job-push/stats/new-count');
    return res.data;
  } catch (error) {
    logger.error('获取新岗位数量失败', error);
    throw error;
  }
}
