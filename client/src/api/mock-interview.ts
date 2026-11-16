import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  MockInterviewSession,
  MockInterviewMessage,
  InterviewSessionListResponse,
  CreateMockInterviewRequest,
} from '@shared/api.interface';

export async function getSessions(
  params: { page?: number; pageSize?: number; jobType?: string } = {},
): Promise<InterviewSessionListResponse> {
  const { data } = await axiosForBackend.get('/api/mock-interview', { params });
  return data;
}

export async function getSessionDetail(id: string): Promise<{
  session: MockInterviewSession;
  messages: MockInterviewMessage[];
}> {
  const { data } = await axiosForBackend.get(`/api/mock-interview/${id}`);
  return data;
}

export async function startInterview(
  payload: CreateMockInterviewRequest,
): Promise<MockInterviewSession> {
  const { data } = await axiosForBackend.post('/api/mock-interview/start', payload);
  return data;
}

export async function sendAnswer(
  id: string,
  payload: { answer: string },
): Promise<MockInterviewMessage> {
  const { data } = await axiosForBackend.post(`/api/mock-interview/${id}/answer`, payload);
  return data;
}

export async function endInterview(id: string): Promise<MockInterviewSession> {
  const { data } = await axiosForBackend.post(`/api/mock-interview/${id}/end`);
  return data;
}

export async function getFeedback(id: string): Promise<MockInterviewSession> {
  const { data } = await axiosForBackend.get(`/api/mock-interview/${id}/feedback`);
  return data;
}

export async function deleteSession(id: string): Promise<void> {
  await axiosForBackend.delete(`/api/mock-interview/${id}`);
}
