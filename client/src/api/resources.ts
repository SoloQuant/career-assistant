import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { LearningResource } from '@shared/api.interface';

export async function fetchResources(
  category?: string,
): Promise<LearningResource[]> {
  try {
    const params: Record<string, string> = {};
    if (category && category !== 'all') {
      params.category = category;
    }
    const response = await axiosForBackend({
      url: '/api/resources',
      method: 'GET',
      params,
    });
    return response.data;
  } catch (error) {
    logger.error('获取学习资源列表失败', error);
    throw error;
  }
}
