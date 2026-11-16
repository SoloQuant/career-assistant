import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { Task, CreateTaskDto, UpdateTaskDto } from '@shared/api.interface';

export async function getTasks(): Promise<Task[]> {
  try {
    const response = await axiosForBackend({
      url: '/api/tasks',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取任务列表失败', error);
    throw error;
  }
}

export async function createTask(dto: CreateTaskDto): Promise<Task> {
  try {
    const response = await axiosForBackend({
      url: '/api/tasks',
      method: 'POST',
      data: dto,
    });
    return response.data;
  } catch (error) {
    logger.error('创建任务失败', error);
    throw error;
  }
}

export async function updateTask(id: string, dto: UpdateTaskDto): Promise<Task> {
  try {
    const response = await axiosForBackend({
      url: `/api/tasks/${id}`,
      method: 'PATCH',
      data: dto,
    });
    return response.data;
  } catch (error) {
    logger.error('更新任务失败', error);
    throw error;
  }
}

export async function deleteTask(id: string): Promise<void> {
  try {
    await axiosForBackend({
      url: `/api/tasks/${id}`,
      method: 'DELETE',
    });
  } catch (error) {
    logger.error('删除任务失败', error);
    throw error;
  }
}
