import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  Application,
  CreateApplicationDto,
  UpdateApplicationDto,
  ApplicationStats,
} from '@shared/api.interface';

export async function getApplications(): Promise<Application[]> {
  try {
    const response = await axiosForBackend({
      url: '/api/applications',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取投递记录失败', error);
    throw error;
  }
}

export async function createApplication(
  dto: CreateApplicationDto,
): Promise<Application> {
  try {
    const response = await axiosForBackend({
      url: '/api/applications',
      method: 'POST',
      data: dto,
    });
    return response.data;
  } catch (error) {
    logger.error('创建投递记录失败', error);
    throw error;
  }
}

export async function updateApplication(
  id: string,
  dto: UpdateApplicationDto,
): Promise<Application> {
  try {
    const response = await axiosForBackend({
      url: `/api/applications/${id}`,
      method: 'PATCH',
      data: dto,
    });
    return response.data;
  } catch (error) {
    logger.error('更新投递记录失败', error);
    throw error;
  }
}

export async function deleteApplication(id: string): Promise<void> {
  try {
    await axiosForBackend({
      url: `/api/applications/${id}`,
      method: 'DELETE',
    });
  } catch (error) {
    logger.error('删除投递记录失败', error);
    throw error;
  }
}

export async function getApplicationStats(): Promise<ApplicationStats> {
  try {
    const response = await axiosForBackend({
      url: '/api/applications/stats',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取投递统计失败', error);
    throw error;
  }
}
