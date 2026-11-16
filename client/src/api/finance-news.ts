import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  FinanceNewsItem,
  FinanceNewsListResponse,
  NewsRefreshStatus,
  NewsRefreshResult,
} from '@shared/api.interface';

interface GetFinanceNewsListParams {
  page: number;
  pageSize: number;
  source?: string;
  category?: string;
  keyword?: string;
  sortBy?: string;
  sortOrder?: string;
}

export async function getFinanceNewsList(
  params: GetFinanceNewsListParams,
): Promise<FinanceNewsListResponse> {
  try {
    const response = await axiosForBackend({
      url: '/api/finance-news/list',
      method: 'GET',
      params,
    });
    return response.data;
  } catch (error) {
    logger.error('获取财经新闻列表失败', error);
    throw error;
  }
}

interface GetImportantNewsParams {
  importantCategory?: string;
  page: number;
  pageSize: number;
  unreadOnly?: boolean;
}

export async function getImportantNews(
  params: GetImportantNewsParams,
): Promise<FinanceNewsListResponse> {
  try {
    const response = await axiosForBackend({
      url: '/api/finance-news/important',
      method: 'GET',
      params,
    });
    return response.data;
  } catch (error) {
    logger.error('获取重要消息失败', error);
    throw error;
  }
}

export async function markAsRead(id: string): Promise<FinanceNewsItem> {
  try {
    const response = await axiosForBackend({
      url: `/api/finance-news/${id}/read`,
      method: 'POST',
    });
    return response.data;
  } catch (error) {
    logger.error(`标记新闻已读失败: ${id}`, error);
    throw error;
  }
}

export async function markAllRead(): Promise<{ success: boolean }> {
  try {
    const response = await axiosForBackend({
      url: '/api/finance-news/mark-all-read',
      method: 'POST',
    });
    return response.data;
  } catch (error) {
    logger.error('标记全部已读失败', error);
    throw error;
  }
}

export async function getNewsStats(): Promise<NewsRefreshStatus> {
  try {
    const response = await axiosForBackend({
      url: '/api/finance-news/stats',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取新闻统计失败', error);
    throw error;
  }
}

export async function refreshNews(): Promise<NewsRefreshResult> {
  try {
    const response = await axiosForBackend({
      url: '/api/finance-news/refresh',
      method: 'POST',
    });
    return response.data;
  } catch (error) {
    logger.error('刷新新闻失败', error);
    throw error;
  }
}
