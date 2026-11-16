import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  CareerAssistantSessionListResponse,
  CareerAssistantMessageListResponse,
  CareerAssistantSendRequest,
  CareerAssistantAdviceSummary,
} from '@shared/api.interface';

export async function getSessions(): Promise<CareerAssistantSessionListResponse> {
  try {
    const res = await axiosForBackend.get('/api/career-assistant/sessions');
    return res.data;
  } catch (error) {
    logger.error('获取助手会话列表失败', error);
    throw error;
  }
}

export async function getSessionMessages(sessionId: string): Promise<CareerAssistantMessageListResponse> {
  try {
    const res = await axiosForBackend.get(`/api/career-assistant/sessions/${sessionId}/messages`);
    return res.data;
  } catch (error) {
    logger.error('获取会话消息失败', error);
    throw error;
  }
}

export async function sendAssistantMessage(data: CareerAssistantSendRequest): Promise<{ sessionId: string; reply: string }> {
  try {
    const res = await axiosForBackend.post('/api/career-assistant/send', data);
    return res.data;
  } catch (error) {
    logger.error('发送助手消息失败', error);
    throw error;
  }
}

export async function getAdviceSummary(): Promise<CareerAssistantAdviceSummary[]> {
  try {
    const res = await axiosForBackend.get('/api/career-assistant/advice/summary');
    return res.data;
  } catch (error) {
    logger.error('获取建议摘要失败', error);
    throw error;
  }
}

export async function markSessionAsRead(sessionId: string): Promise<void> {
  try {
    await axiosForBackend.post(`/api/career-assistant/sessions/${sessionId}/read`);
  } catch (error) {
    logger.error('标记已读失败', error);
    throw error;
  }
}
