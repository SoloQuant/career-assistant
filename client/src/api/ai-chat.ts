import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  AiChatSession,
  AiChatMessage,
  CreateSessionRequest,
  ChatSessionListResponse,
  ChatMessageListResponse,
} from '@shared/api.interface';

const BASE = '/api/ai-chat';

export async function getSessions(): Promise<ChatSessionListResponse> {
  try {
    const response = await axiosForBackend({
      url: `${BASE}/sessions`,
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取会话列表失败', error);
    throw error;
  }
}

export async function createSession(
  data?: CreateSessionRequest,
): Promise<AiChatSession> {
  try {
    const response = await axiosForBackend({
      url: `${BASE}/sessions`,
      method: 'POST',
      data: data ?? {},
    });
    return response.data;
  } catch (error) {
    logger.error('创建会话失败', error);
    throw error;
  }
}

export async function deleteSession(id: string): Promise<void> {
  try {
    await axiosForBackend({
      url: `${BASE}/sessions/${id}`,
      method: 'DELETE',
    });
  } catch (error) {
    logger.error(`删除会话失败: ${id}`, error);
    throw error;
  }
}

export async function getMessages(
  sessionId: string,
): Promise<ChatMessageListResponse> {
  try {
    const response = await axiosForBackend({
      url: `${BASE}/sessions/${sessionId}/messages`,
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error(`获取消息列表失败: ${sessionId}`, error);
    throw error;
  }
}

export async function sendMessage(
  sessionId: string,
  content: string,
): Promise<AiChatMessage> {
  try {
    const response = await axiosForBackend({
      url: `${BASE}/sessions/${sessionId}/messages`,
      method: 'POST',
      data: { content },
    });
    return response.data;
  } catch (error) {
    logger.error(`发送消息失败: ${sessionId}`, error);
    throw error;
  }
}
