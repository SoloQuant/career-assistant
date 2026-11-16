import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  StudyCheckin,
  CreateCheckinRequest,
  UpdateCheckinRequest,
  CheckinStats,
  CheckinCalendarResponse,
  CheckinListResponse,
} from '@shared/api.interface';

const BASE_URL = '/api/checkin';

export async function getTodayCheckin(): Promise<StudyCheckin | null> {
  try {
    const response = await axiosForBackend({
      url: `${BASE_URL}/today`,
      method: 'GET',
    });
    return response.data as StudyCheckin | null;
  } catch (error) {
    logger.error('获取今日打卡失败', error);
    throw error;
  }
}

export async function getCheckinStats(): Promise<CheckinStats> {
  try {
    const response = await axiosForBackend({
      url: `${BASE_URL}/stats`,
      method: 'GET',
    });
    return response.data as CheckinStats;
  } catch (error) {
    logger.error('获取打卡统计失败', error);
    throw error;
  }
}

export async function getCheckinCalendar(
  year: number,
  month: number,
): Promise<CheckinCalendarResponse> {
  try {
    const response = await axiosForBackend({
      url: `${BASE_URL}/calendar`,
      method: 'GET',
      params: { year, month },
    });
    return response.data as CheckinCalendarResponse;
  } catch (error) {
    logger.error('获取打卡日历失败', error);
    throw error;
  }
}

export async function getCheckinList(
  page: number,
  pageSize: number,
): Promise<CheckinListResponse> {
  try {
    const response = await axiosForBackend({
      url: `${BASE_URL}`,
      method: 'GET',
      params: { page, pageSize },
    });
    return response.data as CheckinListResponse;
  } catch (error) {
    logger.error('获取打卡列表失败', error);
    throw error;
  }
}

export async function createCheckin(
  data: CreateCheckinRequest,
): Promise<StudyCheckin> {
  try {
    const response = await axiosForBackend({
      url: `${BASE_URL}`,
      method: 'POST',
      data,
    });
    return response.data as StudyCheckin;
  } catch (error) {
    logger.error('创建打卡失败', error);
    throw error;
  }
}

export async function updateCheckin(
  id: string,
  data: UpdateCheckinRequest,
): Promise<StudyCheckin> {
  try {
    const response = await axiosForBackend({
      url: `${BASE_URL}/${id}`,
      method: 'PATCH',
      data,
    });
    return response.data as StudyCheckin;
  } catch (error) {
    logger.error('更新打卡失败', error);
    throw error;
  }
}

export async function deleteCheckin(id: string): Promise<void> {
  try {
    await axiosForBackend({
      url: `${BASE_URL}/${id}`,
      method: 'DELETE',
    });
  } catch (error) {
    logger.error('删除打卡失败', error);
    throw error;
  }
}
