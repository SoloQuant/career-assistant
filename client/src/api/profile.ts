import type { Profile, ProfileUpdateDto } from '@shared/api.interface';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';

const BASE_URL = '/api/profile';

export async function getProfile(): Promise<Profile> {
  try {
    const { data } = await axiosForBackend.get<Profile>(BASE_URL);
    return data;
  } catch (error: unknown) {
    logger.error('获取个人资料失败', error as Error);
    throw error;
  }
}

export async function updateProfile(dto: ProfileUpdateDto): Promise<Profile> {
  try {
    const { data } = await axiosForBackend.patch<Profile>(BASE_URL, dto);
    return data;
  } catch (error: unknown) {
    logger.error('更新个人资料失败', error as Error);
    throw error;
  }
}
