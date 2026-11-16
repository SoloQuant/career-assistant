import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  Skill,
  CreateSkillDto,
  UpdateSkillDto,
} from '@shared/api.interface';

export async function getSkills(): Promise<Skill[]> {
  try {
    const response = await axiosForBackend({
      url: '/api/skills',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取技能列表失败', error);
    throw error;
  }
}

export async function getSkill(id: string): Promise<Skill> {
  try {
    const response = await axiosForBackend({
      url: `/api/skills/${id}`,
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error(`获取技能详情失败: ${id}`, error);
    throw error;
  }
}

export async function createSkill(dto: CreateSkillDto): Promise<Skill> {
  try {
    const response = await axiosForBackend({
      url: '/api/skills',
      method: 'POST',
      data: dto,
    });
    return response.data;
  } catch (error) {
    logger.error('创建技能失败', error);
    throw error;
  }
}

export async function updateSkill(
  id: string,
  dto: UpdateSkillDto,
): Promise<Skill> {
  try {
    const response = await axiosForBackend({
      url: `/api/skills/${id}`,
      method: 'PATCH',
      data: dto,
    });
    return response.data;
  } catch (error) {
    logger.error(`更新技能失败: ${id}`, error);
    throw error;
  }
}

export async function deleteSkill(id: string): Promise<void> {
  try {
    await axiosForBackend({
      url: `/api/skills/${id}`,
      method: 'DELETE',
    });
  } catch (error) {
    logger.error(`删除技能失败: ${id}`, error);
    throw error;
  }
}
