import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { NewsItem } from '@shared/api.interface';

export async function fetchNewsList(category?: string): Promise<NewsItem[]> {
  try {
    const params: Record<string, string> = {};
    if (category && category !== 'all') {
      params.category = category;
    }
    const response = await axiosForBackend({
      url: '/api/news',
      method: 'GET',
      params,
    });
    return response.data;
  } catch (error) {
    logger.error('获取资讯列表失败', error);
    throw error;
  }
}

export async function fetchNewsDetail(id: string): Promise<NewsItem> {
  try {
    const response = await axiosForBackend({
      url: `/api/news/${id}`,
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error(`获取资讯详情失败: ${id}`, error);
    throw error;
  }
}
