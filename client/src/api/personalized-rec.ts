import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { PersonalizedRecommendations, PersonalizedItem } from '@shared/api.interface';

export async function getDashboardRecommendations(limit = 5): Promise<PersonalizedRecommendations> {
  try {
    const res = await axiosForBackend.get('/api/personalized-rec/dashboard', { params: { limit } });
    return res.data;
  } catch (error) {
    logger.error('获取仪表盘推荐失败', error);
    throw error;
  }
}

export async function getJobRecommendations(limit = 10): Promise<PersonalizedItem[]> {
  try {
    const res = await axiosForBackend.get('/api/personalized-rec/jobs', { params: { limit } });
    return res.data;
  } catch (error) {
    logger.error('获取岗位推荐失败', error);
    throw error;
  }
}

export async function getCourseRecommendations(limit = 10): Promise<PersonalizedItem[]> {
  try {
    const res = await axiosForBackend.get('/api/personalized-rec/courses', { params: { limit } });
    return res.data;
  } catch (error) {
    logger.error('获取课程推荐失败', error);
    throw error;
  }
}

export async function getNewsRecommendations(limit = 10): Promise<PersonalizedItem[]> {
  try {
    const res = await axiosForBackend.get('/api/personalized-rec/news', { params: { limit } });
    return res.data;
  } catch (error) {
    logger.error('获取新闻推荐失败', error);
    throw error;
  }
}

export async function refreshRecommendations(): Promise<{ updated: boolean }> {
  try {
    const res = await axiosForBackend.post('/api/personalized-rec/refresh');
    return res.data;
  } catch (error) {
    logger.error('刷新推荐失败', error);
    throw error;
  }
}
